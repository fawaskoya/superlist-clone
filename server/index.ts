import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { wsManager } from "./websocket";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Enhanced logging function
function serverLog(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [SERVER]`;
  const logMessage = `${prefix} ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

// Middleware for JSON parsing with error handling
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
  limit: '10mb' // Add size limit to prevent DoS
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging middleware with enhanced error handling
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && res.statusCode >= 400) {
        // Log error responses in full
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      } else if (capturedJsonResponse && logLine.length < 200) {
        // Only log successful responses if they're short
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (res.statusCode >= 500) {
        serverLog(logLine, 'error');
      } else if (res.statusCode >= 400) {
        serverLog(logLine, 'warn');
      } else {
      log(logLine);
    }
    }
  });

  // Handle errors in request processing
  res.on("error", (err) => {
    serverLog(`Response error for ${req.method} ${path}: ${err.message}`, 'error');
  });

  next();
});

(async () => {
  try {
    serverLog('Starting server initialization...');
    
  const server = await registerRoutes(app);
    serverLog('Routes registered successfully');

    // Global error handler - must be after all routes
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
      const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

      serverLog(`Error ${status} on ${req.method} ${req.path}: ${message}`, 'error');
      if (stack) {
        serverLog(`Stack trace: ${stack}`, 'error');
      }

      res.status(status).json({ 
        message,
        ...(process.env.NODE_ENV === 'development' && stack ? { stack } : {})
      });
    });

    // Initialize WebSocket server with error handling
    try {
      wsManager.initialize(server);
      serverLog('WebSocket server initialized successfully');
    } catch (error) {
      serverLog(`Failed to initialize WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      // Continue without WebSocket - app can still work
    }

    // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
      try {
    await setupVite(app, server);
        serverLog('Vite development server setup complete');
      } catch (error) {
        serverLog(`Failed to setup Vite: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        throw error;
      }
  } else {
      try {
    serveStatic(app);
        serverLog('Static file serving configured');
      } catch (error) {
        serverLog(`Failed to setup static file serving: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        throw error;
      }
  }

    // Get port from environment or use default
  const port = parseInt(process.env.PORT || '5000', 10);
    
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}`);
    }

    // Start server
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
      serverLog(`Server started successfully on port ${port}`);
      serverLog(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`serving on port ${port}`);
  });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        serverLog(`Port ${port} is already in use`, 'error');
      } else {
        serverLog(`Server error: ${error.message}`, 'error');
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      serverLog('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        serverLog('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      serverLog('SIGINT received, shutting down gracefully...');
      server.close(() => {
        serverLog('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    serverLog(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    if (error instanceof Error && error.stack) {
      serverLog(`Stack trace: ${error.stack}`, 'error');
    }
    process.exit(1);
  }
})();
