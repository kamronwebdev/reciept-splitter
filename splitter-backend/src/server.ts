import express from "express";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import authRoutes from "./routes/auth.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import userRoutes from "./routes/user.js";
import { errorHandler } from "./middleware/errorHandler.js";
import friendsRoutes from "./routes/friends.js";
import groupsRoutes from "./routes/groups.js";
import sessionsRoutes from "./routes/sessions.js";
import usersRoutes from "./routes/users.js";
import uploadsRoutes from "./routes/uploads.js";
import { logAuthAttempts } from "./middleware/logAuth.js";
import { prisma } from "./config/prisma.js";
import debugRoutes from "./routes/debug.js";

// Load .env
dotenv.config();

// Fail fast with a clear message instead of a confusing crash later.
const missingEnv = ["DATABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(
    `\n[startup] Missing required environment variables: ${missingEnv.join(", ")}\n` +
      `Copy .env.example to .env and fill them in (see README).\n`
  );
  process.exit(1);
}

const app = express();
// Behind a proxy (Render) the real client IP is needed for rate limiting.
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
// Allow configurable JSON body size (large base64 images for /sessions/scan)
// Default increased from Express ~100kb to 4mb to fit ~3MB binary image (base64 expands ~33%).
const JSON_LIMIT = process.env.JSON_BODY_LIMIT || "4mb";
app.use(express.json({ limit: JSON_LIMIT }));

// Configure CORS with long preflight caching and multiple origins support
const rawCorsOrigins = (process.env.CORS_ORIGINS || "").trim();
const allowAllCors =
  rawCorsOrigins === "*" || process.env.ALLOW_ALL_CORS === "1";
const allowlist = rawCorsOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowAllCors) {
  // Temporary relaxed policy: allow all origins. Note: credentials must be false with '*'.
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      credentials: false,
      maxAge: 86400,
    })
  );
  console.warn(
    "CORS is in permissive mode: allowing all origins (*) without credentials"
  );
} else {
  const corsSettings: cors.CorsOptions = {
    // IMPORTANT: with credentials: true we cannot send Access-Control-Allow-Origin: "*".
    // Use a function that reflects the request origin to work correctly with credentials.
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests without origin (e.g., Postman, curl)
      if (!origin) return callback(null, true);

      // In non-production allow all origins (reflecting origin)
      if (process.env.NODE_ENV !== "production") return callback(null, true);

      // In production – only those in the allowlist
      if (allowlist.includes(origin)) return callback(null, true);

      console.warn(`CORS blocked request from: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400, // 24h preflight caching (OPTIONS)
  };

  app.use(cors(corsSettings));
}

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve local static files (development fallback for avatars and other assets)
app.use("/static", express.static(path.join(process.cwd(), "public")));

// Auth routes with logging
app.use("/auth", logAuthAttempts, authRoutes, passwordResetRoutes);
app.use("/user", userRoutes);
app.use("/friends", friendsRoutes);
app.use("/groups", groupsRoutes);
app.use("/sessions", sessionsRoutes);
app.use("/users", usersRoutes);
app.use("/uploads", uploadsRoutes);
// Debug probes expose provider details; never mount them in production unless explicitly enabled.
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DEBUG_ROUTES === "1") {
  app.use("/debug", debugRoutes);
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Global error handler (must be after routes)
app.use(errorHandler);

// Start server
const PORT = Number(process.env.PORT) || 3001;
// Bind to all interfaces so a phone on the same Wi-Fi can reach the server.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) {
        console.log(`  LAN: http://${a.address}:${PORT}  (open /health from your phone to test)`);
      }
    }
  }
  console.log(
    "CORS allowlist:",
    allowAllCors
      ? "* (permissive)"
      : allowlist.length
      ? allowlist
      : "(none / dev mode)"
  );
});

if (process.env.DEBUG_ENV === "1") {
  console.log("DEBUG ENV:", {
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? "OK" : "MISSING",
    JWT_SECRET: process.env.JWT_SECRET ? "OK" : "MISSING",
    JSON_BODY_LIMIT: JSON_LIMIT,
  });
}

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[startup] Port ${PORT} is already in use. Stop the other process or set PORT in .env.`);
  } else {
    console.error("[startup] Server error:", err);
  }
  process.exit(1);
});

prisma.$connect().then(
  () => console.log("[startup] Database connection OK"),
  (err) =>
    console.error(
      "[startup] Cannot connect to the database. Check DATABASE_URL and that PostgreSQL is running.\n",
      err?.message ?? err
    )
);
