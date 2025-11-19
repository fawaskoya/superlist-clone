import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server, port: number) {
  try {
    log('Setting up Vite development server...');

    const serverOptions = {
      middlewareMode: true,
      hmr: {
        server,
      },
      allowedHosts: true as const,
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          log(`Vite error: ${msg}`, 'error');
          viteLogger.error(msg, options);
          // Don't exit process, just log the error
        },
        warn: (msg, options) => {
          log(`Vite warning: ${msg}`, 'warn');
          viteLogger.warn(msg, options);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    log('Vite development server set up successfully');

    // Use Vite middlewares but add them BEFORE the catch-all route
    // and make sure they don't interfere with API routes
    app.use((req, res, next) => {
      // Skip API routes, WebSocket, and health checks for Vite
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws') || req.path.startsWith('/health')) {
        return next();
      }
      // Apply Vite middlewares for frontend routes
      return vite.middlewares(req, res, next);
    });

    // Catch-all for frontend routes only
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      // Skip API routes - let Express handle them
      if (url.startsWith('/api/') || url.startsWith('/health') || url.startsWith('/ws')) {
        return next();
      }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      log(`Vite SSR error: ${e}`, 'error');
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  } catch (error) {
    log(`Failed to setup Vite: ${error}`, 'error');
    throw error;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
