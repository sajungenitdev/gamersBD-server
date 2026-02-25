/**
 * Express Application Configuration
 * Main entry point for the REST API server
 * @module app
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Route imports
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const categoryRoutes = require("./routes/category.routes"); // ← ADD THIS
const productRoutes = require("./routes/product.routes");

// Initialize Express application
const app = express();

/**
 * ====================================
 * Security & Utility Middleware
 * ====================================
 */

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",")
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://gamersbd-frontend.vercel.app",
          ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Request parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

/**
 * ====================================
 * Root Endpoint - API Information
 * ====================================
 * Shows API status and available endpoints
 */
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    name: "Express API Server",
    version: "1.0.0",
    description: "RESTful API for authentication and product management",
    status: "operational",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    documentation: {
      api: `${baseUrl}/api`,
      health: `${baseUrl}/api/health`,
      auth: `${baseUrl}/api/auth`,
      products: `${baseUrl}/api/products`,
    },
    endpoints: {
      health: {
        get: "/api/health - System health check with uptime and status",
      },
      auth: {
        post: {
          register: "/api/auth/register - Create new user account",
          login: "/api/auth/login - Authenticate user",
          logout: "/api/auth/logout - Invalidate user session",
          "refresh-token": "/api/auth/refresh-token - Get new access token",
        },
        get: {
          profile: "/api/auth/profile - Get current user profile",
        },
      },
      products: {
        get: {
          "/api/products": "List all products (paginated)",
          "/api/products/:id": "Get single product by ID",
        },
        post: "/api/products - Create new product",
        put: "/api/products/:id - Update product",
        delete: "/api/products/:id - Delete product",
      },
      categories: {
        // ← ADD THIS
        get: "/api/categories - Get all categories",
        post: "/api/categories - Create new category (admin)",
      },
    },
    links: {
      self: baseUrl,
      api: `${baseUrl}/api`,
      health: `${baseUrl}/api/health`,
      github: "https://github.com/yourusername/your-repo",
      documentation: "https://your-docs-site.com",
    },
  });
});

/**
 * ====================================
 * API Routes
 * ====================================
 */

// Health check endpoint - detailed system status
app.use("/api/health", healthRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);

// Product routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes); // This line MUST be here

/**
 * ====================================
 * API Root - List all available API endpoints
 * ====================================
 */
app.get("/api", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    message: "API is running",
    version: "v1",
    baseUrl: baseUrl,
    endpoints: {
      health: {
        url: `${baseUrl}/api/health`,
        methods: ["GET"],
        description: "System health check",
      },
      auth: {
        base: `${baseUrl}/api/auth`,
        endpoints: {
          register: { url: "/register", method: "POST", auth: false },
          login: { url: "/login", method: "POST", auth: false },
          logout: { url: "/logout", method: "POST", auth: true },
          profile: { url: "/profile", method: "GET", auth: true },
          "refresh-token": {
            url: "/refresh-token",
            method: "POST",
            auth: true,
          },
        },
      },
      products: {
        base: `${baseUrl}/api/products`,
        endpoints: {
          list: { url: "/", method: "GET", auth: false, paginated: true },
          get: { url: "/:id", method: "GET", auth: false },
          create: { url: "/", method: "POST", auth: true, role: "admin" },
          update: { url: "/:id", method: "PUT", auth: true, role: "admin" },
          delete: { url: "/:id", method: "DELETE", auth: true, role: "admin" },
        },
      },
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * ====================================
 * 404 Handler - Route Not Found
 * ====================================
 */
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      root: "/",
      api: "/api",
      health: "/api/health",
      auth: "/api/auth",
      products: "/api/products",
    },
    documentation: "Please check the API documentation at / for more details",
  });
});

module.exports = app;
