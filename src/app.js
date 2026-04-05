const dotenv = require("dotenv");
const path = require("path");

// Load env vars from .env file
const result = dotenv.config();
dotenv.config();

// Debug - remove this after confirming it works
console.log("🔍 Environment check:");
console.log("✅ JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("✅ MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("✅ PORT:", process.env.PORT);

if (result.error) {
  console.error("⚠️  Error loading .env file:", result.error.message);
  console.log("Make sure you have a .env file in the root directory");
} else {
  console.log("✅ Environment variables loaded successfully");
}

// Debug: Check if JWT_SECRET is loaded (without exposing the value)
console.log(
  "🔑 JWT_SECRET status:",
  process.env.JWT_SECRET ? "✅ Present" : "❌ MISSING",
);
console.log("🌍 NODE_ENV:", process.env.NODE_ENV || "development");
console.log("🚪 PORT:", process.env.PORT || "5000 (default)");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Route imports
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
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    name: "GamersBD API Server",
    version: "1.0.0",
    description: "Complete e-commerce API for toys and games",
    status: "operational",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    documentation: {
      api: `${baseUrl}/api`,
      health: `${baseUrl}/api/health`,
      auth: `${baseUrl}/api/auth`,
      products: `${baseUrl}/api/products`,
      categories: `${baseUrl}/api/categories`,
      brands: `${baseUrl}/api/brands`,
      cart: `${baseUrl}/api/cart`,
      orders: `${baseUrl}/api/orders`,
      wishlist: `${baseUrl}/api/wishlist`,
      compare: `${baseUrl}/api/compare`,
      users: `${baseUrl}/api/users`,
    },
    endpoints: {
      health: {
        get: "/api/health - System health check with uptime and status",
      },
      auth: {
        post: {
          register: "/api/auth/register - Create new user account",
          login: "/api/auth/login - Authenticate user and get token",
          logout: "/api/auth/logout - Invalidate user session",
          "refresh-token": "/api/auth/refresh-token - Get new access token",
        },
        get: {
          profile: "/api/auth/profile - Get current user profile",
        },
      },
      products: {
        get: {
          "/api/products": "List all products (paginated with filters)",
          "/api/products/:id": "Get single product by ID",
          "/api/products/slug/:slug": "Get product by slug",
          "/api/products/featured": "Get featured products",
          "/api/products/deals": "Get products on sale/deals",
        },
        post: "/api/products - Create new product (admin)",
        put: "/api/products/:id - Update product (admin)",
        delete: "/api/products/:id - Delete product (admin)",
      },
      categories: {
        get: {
          "/api/categories": "Get all categories",
          "/api/categories/:id": "Get single category",
          "/api/categories/:id/products": "Get products by category",
        },
        post: "/api/categories - Create new category (admin)",
        put: "/api/categories/:id - Update category (admin)",
        delete: "/api/categories/:id - Delete category (admin)",
      },
      brands: {
        get: {
          "/api/brands": "Get all brands",
          "/api/brands/:id": "Get single brand",
          "/api/brands/:id/products": "Get products by brand",
        },
        post: "/api/brands - Create new brand (admin)",
        put: "/api/brands/:id - Update brand (admin)",
        delete: "/api/brands/:id - Delete brand (admin)",
      },
      cart: {
        get: {
          "/api/cart": "Get current user's cart",
          "/api/cart/count": "Get total items count in cart",
          "/api/cart/validate": "Validate cart before checkout",
        },
        post: "/api/cart/add - Add item to cart",
        put: "/api/cart/update/:itemId - Update cart item quantity",
        delete: {
          "/api/cart/remove/:itemId": "Remove specific item from cart",
          "/api/cart/clear": "Clear entire cart",
        },
      },
      orders: {
        get: {
          "/api/orders": "Get all orders (admin)",
          "/api/orders/my-orders": "Get current user's orders",
          "/api/orders/:id": "Get single order by ID",
          "/api/orders/:id/payment": "Get payment details",
          "/api/orders/:id/tracking": "Get order tracking history",
          "/api/orders/stats/dashboard": "Get order statistics (admin)",
        },
        post: {
          "/api/orders/checkout": "Create new order from cart",
        },
        put: {
          "/api/orders/:id/status": "Update order status (admin/editor)",
          "/api/orders/:id/payment": "Update payment status (admin/editor)",
          "/api/orders/:id/tracking": "Add tracking information (admin/editor)",
          "/api/orders/:id/cancel": "Cancel order (user)",
          "/api/orders/bulk-status": "Bulk update order status (admin)",
        },
      },
      wishlist: {
        get: {
          "/api/wishlist": "Get user's wishlist",
          "/api/wishlist/check/:productId": "Check if product is in wishlist",
          "/api/wishlist/shared/:shareId": "Get public shared wishlist",
        },
        post: {
          "/api/wishlist/add/:productId": "Add product to wishlist",
          "/api/wishlist/move-to-cart/:itemId": "Move wishlist item to cart",
        },
        put: {
          "/api/wishlist/settings": "Update wishlist settings (name, privacy)",
        },
        delete: {
          "/api/wishlist/remove/:itemId": "Remove item from wishlist",
          "/api/wishlist/clear": "Clear entire wishlist",
        },
      },
      compare: {
        get: {
          "/api/compare": "Get user's compare list",
          "/api/compare/table": "Get comparison table with all specs",
        },
        post: {
          "/api/compare/add/:productId": "Add product to compare",
        },
        delete: {
          "/api/compare/remove/:itemId": "Remove product from compare",
          "/api/compare/clear": "Clear compare list",
        },
        put: {
          "/api/compare/settings": "Update compare settings (admin)",
        },
      },
      users: {
        get: {
          "/api/users/profile": "Get user profile",
          "/api/users/addresses": "Get user addresses",
        },
        put: "/api/users/profile - Update user profile",
        post: "/api/users/addresses - Add new address",
        delete: "/api/users/addresses/:id - Delete address",
      },
    },
    links: {
      self: baseUrl,
      api: `${baseUrl}/api`,
      health: `${baseUrl}/api/health`,
      github: "https://github.com/yourusername/gamersbd-server",
    },
  });
});

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
app.use("/api/cart", cartRoutes);

// Order routes
app.use("/api/orders", orderRoutes);

// Wishlist routes
app.use("/api/wishlist", wishlistRoutes);

app.use("/api/email", emailRoutes);

// Compare routes
app.use("/api/compare", compareRoutes);

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
          // User endpoints
          myOrders: { url: "/my-orders", method: "GET", auth: true },
          get: { url: "/:id", method: "GET", auth: true },
          payment: { url: "/:id/payment", method: "GET", auth: true },
          tracking: { url: "/:id/tracking", method: "GET", auth: true },
          checkout: { url: "/checkout", method: "POST", auth: true },
          cancel: { url: "/:id/cancel", method: "PUT", auth: true },
          
          // Admin/Editor endpoints
          list: { url: "/", method: "GET", auth: true, role: "admin,editor" },
          stats: { url: "/stats/dashboard", method: "GET", auth: true, role: "admin,editor" },
          updateStatus: { url: "/:id/status", method: "PUT", auth: true, role: "admin,editor" },
          updatePayment: { url: "/:id/payment", method: "PUT", auth: true, role: "admin,editor" },
          addTracking: { url: "/:id/tracking", method: "PUT", auth: true, role: "admin,editor" },
          
          // Admin only
          bulkStatus: { url: "/bulk-status", method: "PUT", auth: true, role: "admin" },
        },
      },
      wishlist: {
        base: `${baseUrl}/api/wishlist`,
        endpoints: {
          get: { url: "/", method: "GET", auth: true },
          check: { url: "/check/:productId", method: "GET", auth: true },
          shared: { url: "/shared/:shareId", method: "GET", auth: false },
          add: { url: "/add/:productId", method: "POST", auth: true },
          moveToCart: { url: "/move-to-cart/:itemId", method: "POST", auth: true },
          settings: { url: "/settings", method: "PUT", auth: true },
          remove: { url: "/remove/:itemId", method: "DELETE", auth: true },
          clear: { url: "/clear", method: "DELETE", auth: true },
        },
      },
      compare: {
        base: `${baseUrl}/api/compare`,
        endpoints: {
          get: { url: "/", method: "GET", auth: true },
          table: { url: "/table", method: "GET", auth: true },
          add: { url: "/add/:productId", method: "POST", auth: true },
          remove: { url: "/remove/:itemId", method: "DELETE", auth: true },
          clear: { url: "/clear", method: "DELETE", auth: true },
          settings: { url: "/settings", method: "PUT", auth: true, role: "admin" },
        },
      },
      users: {
        base: `${baseUrl}/api/users`,
        endpoints: {
          profile: { url: "/profile", method: "GET", auth: true },
          updateProfile: { url: "/profile", method: "PUT", auth: true },
          addresses: { url: "/addresses", method: "GET", auth: true },
          addAddress: { url: "/addresses", method: "POST", auth: true },
          updateAddress: { url: "/addresses/:id", method: "PUT", auth: true },
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
      auth: "/api/auth",
      products: "/api/products",
      categories: "/api/categories",
      brands: "/api/brands",
      cart: "/api/cart",
      orders: "/api/orders",
      wishlist: "/api/wishlist",
      compare: "/api/compare",
      users: "/api/users",
    },
    documentation: "Please check the API documentation at / for more details",
  });
});

module.exports = app;