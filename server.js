require("dotenv").config();
const http = require("http");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
var fileUpload = require("express-fileupload");
const initMongo = require("./src/config/mongo");
const { generateMissingUserIds } = require("./src/utils/generateMissingUserIds");
const { generateMissingEnquiryIds } = require("./src/utils/generateMissingEnquiryIds");
const { initSocket } = require("./src/config/socket");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const { handleStripeWebhook } = require("./src/controllers/user/webhook");
const mongoose = require("mongoose");
// const seedAllInOnePlans = require("./scripts/seedAllInOnePlans"); // Disabled - plans already seeded

// Normalize origin for comparison (trim, remove trailing slash)
function normalizeOrigin(o) {
  if (!o || typeof o !== 'string') return '';
  return o.trim().replace(/\/+$/, '');
}

// Set to true to allow any origin (bypass CORS). Set to false and use PRODUCTION_ALLOWED_ORIGINS in production.
const ALLOW_ALL_ORIGINS = true;

// Production CORS: frontend (http + https), admin (https only) — used when ALLOW_ALL_ORIGINS is false
const PRODUCTION_ALLOWED_ORIGINS = [
  'http://bsoservices.ai',
  'https://bsoservices.ai',
  'https://dashboard.bsoservices.ai',
].map(normalizeOrigin);

const isLocalOrDev = process.env.ENV === 'local' || process.env.NODE_ENV === 'development';

const io = new Server(server, {
  cors: {
    origin: ALLOW_ALL_ORIGINS || isLocalOrDev ? true : PRODUCTION_ALLOWED_ORIGINS,
    credentials: true,
  },
});
initSocket(io);

app.post(
  "/user/webhook",
  express.raw({ type: 'application/json' }),
  // trimRequest.all,
  handleStripeWebhook
);

// Force CORS: run first — bypass everything, allow any origin so API can be called from anywhere
app.use((req, res, next) => {
  if (ALLOW_ALL_ORIGINS) {
    const origin = req.get('Origin');
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Middleware: allow cross-origin requests from dashboard/frontend (Helmet defaults can block API calls)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow any origin when ALLOW_ALL_ORIGINS is true; otherwise use allowed list
    if (ALLOW_ALL_ORIGINS || isLocalOrDev) return callback(null, true);
    if (!origin) return callback(null, true);

    const normalizedRequestOrigin = normalizeOrigin(origin);
    const isAllowed = PRODUCTION_ALLOWED_ORIGINS.some((allowed) => normalizeOrigin(allowed) === normalizedRequestOrigin);
    callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  exposedHeaders: "Content-Length, Content-Type",
};

app.use(cors(corsOptions));
app.use(compression());
// Increase body parser limit to handle large JWT tokens (Apple IAP tokens can be 5000+ characters)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]")
);

// Serve static files from the public directory
app.use('/public', express.static('public'));

app.use(passport.initialize());
app.use(
  fileUpload({
    createParentPath: true,
  })
);

// Routes
app.get("/", (req, res) => {
  return res.send("Welcome to bso");
});

// Test from local: GET /cors-test — confirms production API is up and sending CORS (e.g. curl -I -H "Origin: https://dashboard.bsoservices.ai" https://api.bsoservices.com/cors-test)
app.get("/cors-test", (req, res) => {
  res.json({ ok: true, message: "CORS bypass active", timestamp: new Date().toISOString() });
});

app.use(require("./src/routes/user"));
app.use(require("./src/routes/admin"));

// Attach CORS headers to response so preflight/errors still get Allow-Origin (avoids PreflightMissingAllowOriginHeader)
function setCorsHeadersIfAllowed(req, res) {
  const origin = req.get && req.get('Origin');
  if (!origin) return;
  const allowed = ALLOW_ALL_ORIGINS || isLocalOrDev || PRODUCTION_ALLOWED_ORIGINS.some((o) => normalizeOrigin(o) === normalizeOrigin(origin));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
}

app.use((req, res, next) => {
  const error = {
    message: "Route not found",
    status: 404,
    timestamp: new Date(),
  };
  setCorsHeadersIfAllowed(req, res);
  res.status(404).json({ error });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
  setCorsHeadersIfAllowed(req, res);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 7012;

// Connect to MongoDB first, then start server and run startup tasks
async function startServer() {
  try {
    await initMongo();
    console.log("****************************");
    console.log(
      `*    Starting ${process.env.ENV === "local" ? "HTTP" : "HTTPS"} Server`
    );
    console.log(`*    Port: ${PORT}`);
    console.log(`*    NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`*    Database: MongoDB`);
    console.log(`*    DB Connection: OK\n****************************\n`);

    server.listen(PORT, async () => {
      // Run startup tasks only after server is listening (DB is already connected)
      try {
        console.log('🔄 Running startup tasks...');
        await generateMissingUserIds();
        await generateMissingEnquiryIds();
        console.log('✅ Startup tasks completed successfully');
      } catch (error) {
        console.error('❌ Error during startup tasks:', error.message);
      }
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB. Server not started:', error.message);
    process.exit(1);
  }
}

startServer();
