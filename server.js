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

const io = new Server(server, {
  cors: {
    origin: true,
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

// Force CORS: allow ALL origins, no strict list — every request gets CORS headers
app.use((req, res, next) => {
  const origin = req.get('Origin');
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400');
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

// No origin check — allow every origin
app.use(cors({
  origin: true,
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, Origin",
}));
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
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
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
