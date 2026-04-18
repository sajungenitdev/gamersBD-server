require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");
const os = require("os");
const dns = require("dns");

// =========================
// 🌐 FORCE DNS FIX (CRITICAL)
// =========================
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// =========================
// 📋 CONFIGURATION
// =========================
const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const mongoURI = process.env.MONGO_URI;

// server.js or app.js
const compression = require("compression");
app.use(
  compression({
    level: 6, // Compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

// =========================
// 🔍 VALIDATION
// =========================
if (!mongoURI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

// Display startup info
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🎮 GAMERSBD SERVER                      ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(44)}║
║  Port: ${String(PORT).padEnd(48)}║
║  Node Version: ${process.version.padEnd(40)}║
║  Platform: ${`${os.platform()} (${os.arch()})`.padEnd(40)}║
║  CPU Cores: ${String(os.cpus().length).padEnd(44)}║
╚═══════════════════════════════════════════════════════════╝
`);

// =========================
// 🛡️ GRACEFUL SHUTDOWN
// =========================
let server = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);

  const forceShutdown = setTimeout(() => {
    console.error("❌ Force shutdown - connections did not close in time");
    process.exit(1);
  }, 30000);

  if (server) {
    server.close(async (err) => {
      if (err) console.error("Error closing server:", err);
      else console.log("✅ HTTP server closed");

      try {
        await mongoose.connection.close(false);
        console.log("✅ MongoDB connection closed");
        clearTimeout(forceShutdown);
        console.log("👋 Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error closing database:", error);
        process.exit(1);
      }
    });

    server.setTimeout(0);
  } else {
    clearTimeout(forceShutdown);
    process.exit(0);
  }
};

// =========================
// 🗄️ DATABASE CONNECTION
// =========================
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

const connectDB = async () => {
  try {
    console.log("🔍 Connecting to MongoDB...");
    console.log(
      `   Connection attempt: ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`,
    );

    const options = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      retryReads: true,
      maxPoolSize: isProduction ? 20 : 10,
      minPoolSize: isProduction ? 5 : 2,
    };

    const sanitizedURI = mongoURI.replace(/\/\/.*@/, "//***:***@");
    console.log(`   Database URI: ${sanitizedURI}`);

    await mongoose.connect(mongoURI, options);
    reconnectAttempts = 0;

    const db = mongoose.connection;
    console.log(`
✅ MongoDB Connected Successfully
   Database: ${db.name}
   Host: ${db.host}
   Models: ${Object.keys(mongoose.models).length}
`);

    db.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });

    db.on("disconnected", () => {
      if (!isShuttingDown) {
        console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
      }
    });

    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isShuttingDown) {
      reconnectAttempts++;
      console.log(
        `🔄 Retrying in ${RECONNECT_DELAY / 1000}s... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
      );
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
      return connectDB();
    }

    throw error;
  }
};

// =========================
// 🧪 SIMPLE HEALTH CHECK
// =========================
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? "healthy" : "unhealthy",
    database: {
      connected: isConnected,
      status: ["disconnected", "connected", "connecting", "disconnecting"][
        dbState
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

// =========================
// 🚀 START SERVER
// =========================
const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎮 GAMERSBD SERVER STARTED!                ║
╠══════════════════════════════════════════════════════════════╣
║  Status:        🟢 Online                                    ║
║  Environment:   ${NODE_ENV.padEnd(43)}║
║  Port:          ${String(PORT).padEnd(43)}║
║  Database:      ✅ Connected                                 ║
║  URL:           http://localhost:${PORT}${" ".repeat(30)}║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    server.timeout = 120000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// =========================
// 🛡️ PROCESS EVENT HANDLERS
// =========================
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  gracefulShutdown("unhandledRejection");
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// =========================
// 🚀 START
// =========================
startServer();

module.exports = { app, server, connectDB, gracefulShutdown };
