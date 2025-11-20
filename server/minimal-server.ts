import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { log } from "./vite";

const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register routes
registerRoutes(app);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TaskFlow</title>
      </head>
      <body>
        <h1>TaskFlow Server Running</h1>
        <p>Server is running but frontend is not served in this minimal version.</p>
        <p>Check <a href="/health">/health</a> endpoint.</p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal TaskFlow server running on port ${PORT}`);
  log(`serving on port ${PORT}`);
});





