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
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization, X-Requested-With",
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.listen(PORT, async () => {
  console.log("****************************");
  console.log(
    `*    Starting ${process.env.ENV === "local" ? "HTTP" : "HTTPS"} Server`
  );
  console.log(`*    Port: ${PORT}`);
  console.log(`*    NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`*    Database: MongoDB`);
  console.log(`*    DB Connection: OK\n****************************\n`);
  
  // Generate missing user IDs after MongoDB connection is established
  try {
    console.log('🔄 Running startup tasks...');
    await generateMissingUserIds();
    console.log('✅ Startup tasks completed successfully');
  } catch (error) {
    console.error('❌ Error during startup tasks:', error.message);
  }
});

// All-in-One plan seeding disabled - plans already exist
// Uncomment the following block if you need to seed/update All-in-One plans
// mongoose.connection.once('connected', async () => {
//   try {
//     await seedAllInOnePlans({ useExistingConnection: true, logger: console });
//   } catch (error) {
//     console.error('❌ Failed to seed All-in-One plans:', error.message || error);
//   }
// });

initMongo();
