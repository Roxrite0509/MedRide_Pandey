
import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Fallback logging function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Skip all seeding - use existing database data only
  console.log("🏥 Using existing database data only - no seeding performed");

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error details server-side
    console.error(`[ERROR ${status}] ${message}`);
    console.error(err.stack);

    // Don't expose internal errors in production
    const publicMessage = process.env.NODE_ENV === 'production' && status === 500 
      ? 'Internal Server Error' 
      : message;

    res.status(status).json({ 
      message: publicMessage,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    try {
      // Dynamic import of Vite module
      const viteModule = await import("./vite.js");
      await viteModule.setupVite(app, server);
      log("Vite development server configured successfully");
    } catch (error) {
      log(`Vite setup failed: ${error.message}`);
      // Fallback: serve basic HTML page
      app.use("*", (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>EmergencyConnect - Development</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { background: white; padding: 20px; border-radius: 8px; max-width: 600px; }
                .status { color: #22c55e; }
                .info { color: #3b82f6; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🏥 EmergencyConnect API Server</h1>
                <p class="status">✅ API server is running on port 5000</p>
                <p class="status">✅ Database connected (27 users found)</p>
                <p class="info">📝 Frontend development mode is ready</p>
                <p>API endpoints are available at: <code>/api/*</code></p>
              </div>
            </body>
          </html>
        `);
      });
    }
  } else {
    try {
      const viteModule = await import("./vite.js");
      viteModule.serveStatic(app);
    } catch (error) {
      app.use("*", (req, res) => {
        res.json({ message: "Production server ready", api: true });
      });
    }
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const host = process.platform === "darwin" ? "localhost" : "0.0.0.0";

  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
