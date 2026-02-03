require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
var fileUpload = require("express-fileupload");
const initMongo = require("./src/config/mongo");
const { generateMissingUserIds } = require("./src/utils/generateMissingUserIds");
const app = express();
const { handleStripeWebhook } = require("./src/controllers/user/webhook")
const mongoose = require("mongoose");
// const seedAllInOnePlans = require("./scripts/seedAllInOnePlans"); // Disabled - plans already seeded

app.post(
  "/user/webhook",
  express.raw({ type: 'application/json' }),
  // trimRequest.all,
  handleStripeWebhook
)

// Middleware
app.use(helmet());

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment or use default
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:3000',
          'http://localhost:3039',
          'http://localhost:5173',
          'http://localhost:5174',
          'https://bsoservices.com',
          'https://www.bsoservices.com',
          'https://admin.bsoservices.com',
          'https://api.bsoservices.com'
        ];
    
    // Allow all origins for local testing (can be restricted in production)
    if (process.env.ENV === 'local' || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  exposedHeaders: "Content-Length, Content-Type"
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

app.use(require("./src/routes/user"));
app.use(require("./src/routes/admin"));

app.use((req, res, next) => {
  const error = {
    message: "Route not found",
    status: 404,
    timestamp: new Date(),
  };
  res.status(404).json({ error });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
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

    app.listen(PORT, async () => {
      // Run startup tasks only after server is listening (DB is already connected)
      try {
        console.log('🔄 Running startup tasks...');
        await generateMissingUserIds();
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
