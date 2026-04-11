const dotenv = require("dotenv");
const path = require("path");

// Load env vars from .env file
dotenv.config();

// Debug - remove this after confirming it works
console.log("🔍 Environment check:");
console.log("✅ JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("✅ MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("✅ PORT:", process.env.PORT);

// Debug: Check if JWT_SECRET is loaded
console.log(
  "🔑 JWT_SECRET status:",
  process.env.JWT_SECRET ? "✅ Present" : "❌ MISSING"
);
console.log("🌍 NODE_ENV:", process.env.NODE_ENV || "development");
console.log("🚪 PORT:", process.env.PORT || "5000 (default)");
console.log("=================================");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Route imports - Fixed paths (remove ../ since app.js is in src folder)
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const categoryRoutes = require("./routes/category.routes");
const userRoutes = require("./routes/user.routes");
const brandRoutes = require("./routes/brand.routes");
const cartRoutes = require("./routes/cart.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const compareRoutes = require("./routes/compare.routes");
const emailRoutes = require("./routes/email.routes");
const blogRoutes = require("./routes/blog.routes");
const contactRoutes = require("./routes/contact.routes");
const faqRoutes = require("./routes/faq.routes");
const siteSettingRoutes = require("./routes/siteSetting.routes");
const indexRoutes = require('./routes/index');

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
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:5000",
      "https://gamersbd-frontend.vercel.app",
      "https://gamers-bd-admin.vercel.app",
      "https://gamersbd-server.onrender.com",
    ];

    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV === "development"
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options("*", cors(corsOptions));

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
 */

app.use('/', indexRoutes);

/**
 * ====================================
 * API Routes
 * ====================================
 */
// Health check endpoint
app.use("/api/health", healthRoutes);

// Auth routes
app.use("/api/auth", authRoutes);

// Product routes
app.use("/api/products", productRoutes);

// Category routes
app.use("/api/categories", categoryRoutes);

// User routes
app.use("/api/users", userRoutes);

// Brand routes
app.use("/api/brands", brandRoutes);

// Cart routes
console.log("🛒 Initializing cart routes...");
app.use("/api/cart", cartRoutes);
console.log("✅ Cart routes registered successfully");

// Order routes
app.use("/api/orders", orderRoutes);

// Wishlist routes
app.use("/api/wishlist", wishlistRoutes);

// Email routes
app.use("/api/email", emailRoutes);

// Blog routes
app.use("/api/blogs", blogRoutes);

// Contact routes
app.use("/api/contacts", contactRoutes);

// FAQ routes
app.use("/api/faqs", faqRoutes);

// Site settings routes
app.use("/api/settings", siteSettingRoutes);

// Compare routes
app.use("/api/compare", compareRoutes);

// Add this temporary test route
app.get('/test-route', (req, res) => {
  res.json({ success: true, message: 'Test route working' });
});


/**
 * ====================================
 * API Root - List all available API endpoints
 * ====================================
 */
app.get("/api", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    message: "GamersBD API is running",
    version: "v2",
    baseUrl: baseUrl,
    endpoints: {
      health: {
        url: `${baseUrl}/api/health`,
        methods: ["GET"],
        description: "System health check with detailed metrics",
      },
      auth: {
        base: `${baseUrl}/api/auth`,
        endpoints: {
          register: { url: "/register", method: "POST", auth: false },
          login: { url: "/login", method: "POST", auth: false },
          logout: { url: "/logout", method: "POST", auth: true },
          profile: { url: "/profile", method: "GET", auth: true },
          "refresh-token": { url: "/refresh-token", method: "POST", auth: true },
        },
      },
      products: {
        base: `${baseUrl}/api/products`,
        endpoints: {
          list: { url: "/", method: "GET", auth: false, paginated: true },
          get: { url: "/:id", method: "GET", auth: false },
          getBySlug: { url: "/slug/:slug", method: "GET", auth: false },
          featured: { url: "/featured", method: "GET", auth: false },
          deals: { url: "/deals", method: "GET", auth: false },
          create: { url: "/", method: "POST", auth: true, role: "admin" },
          update: { url: "/:id", method: "PUT", auth: true, role: "admin" },
          delete: { url: "/:id", method: "DELETE", auth: true, role: "admin" },
        },
      },
      categories: {
        base: `${baseUrl}/api/categories`,
        endpoints: {
          list: { url: "/", method: "GET", auth: false },
          get: { url: "/:id", method: "GET", auth: false },
          products: { url: "/:id/products", method: "GET", auth: false },
          create: { url: "/", method: "POST", auth: true, role: "admin" },
          update: { url: "/:id", method: "PUT", auth: true, role: "admin" },
          delete: { url: "/:id", method: "DELETE", auth: true, role: "admin" },
        },
      },
      brands: {
        base: `${baseUrl}/api/brands`,
        endpoints: {
          list: { url: "/", method: "GET", auth: false },
          get: { url: "/:id", method: "GET", auth: false },
          products: { url: "/:id/products", method: "GET", auth: false },
          create: { url: "/", method: "POST", auth: true, role: "admin" },
          update: { url: "/:id", method: "PUT", auth: true, role: "admin" },
          delete: { url: "/:id", method: "DELETE", auth: true, role: "admin" },
        },
      },
      cart: {
        base: `${baseUrl}/api/cart`,
        endpoints: {
          get: { url: "/", method: "GET", auth: true },
          count: { url: "/count", method: "GET", auth: true },
          validate: { url: "/validate", method: "GET", auth: true },
          add: { url: "/add", method: "POST", auth: true },
          update: { url: "/update/:itemId", method: "PUT", auth: true },
          remove: { url: "/remove/:itemId", method: "DELETE", auth: true },
          clear: { url: "/clear", method: "DELETE", auth: true },
        },
      },
      orders: {
        base: `${baseUrl}/api/orders`,
        endpoints: {
          myOrders: { url: "/my-orders", method: "GET", auth: true },
          get: { url: "/:id", method: "GET", auth: true },
          checkout: { url: "/checkout", method: "POST", auth: true },
          cancel: { url: "/:id/cancel", method: "PUT", auth: true },
          list: { url: "/", method: "GET", auth: true, role: "admin,editor" },
          updateStatus: { url: "/:id/status", method: "PUT", auth: true, role: "admin,editor" },
        },
      },
      wishlist: {
        base: `${baseUrl}/api/wishlist`,
        endpoints: {
          get: { url: "/", method: "GET", auth: true },
          check: { url: "/check/:productId", method: "GET", auth: true },
          add: { url: "/add/:productId", method: "POST", auth: true },
          remove: { url: "/remove/:itemId", method: "DELETE", auth: true },
          clear: { url: "/clear", method: "DELETE", auth: true },
        },
      },
      compare: {
        base: `${baseUrl}/api/compare`,
        endpoints: {
          get: { url: "/", method: "GET", auth: true },
          add: { url: "/add/:productId", method: "POST", auth: true },
          remove: { url: "/remove/:itemId", method: "DELETE", auth: true },
          clear: { url: "/clear", method: "DELETE", auth: true },
        },
      },
      users: {
        base: `${baseUrl}/api/users`,
        endpoints: {
          profile: { url: "/profile", method: "GET", auth: true },
          updateProfile: { url: "/profile", method: "PUT", auth: true },
          addresses: { url: "/addresses", method: "GET", auth: true },
          addAddress: { url: "/addresses", method: "POST", auth: true },
          deleteAddress: { url: "/addresses/:id", method: "DELETE", auth: true },
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
      documentation: "Please check the API documentation at / for more details",
    },
  });
});

/**
 * ====================================
 * Error Handling Middleware
 * ====================================
 */
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;