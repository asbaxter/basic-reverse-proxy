const express = require("express");
require("dotenv").config();
const rateLimit = require("express-rate-limit");
const winston = require("winston");
require("winston-daily-rotate-file");

// *** CHANGES START HERE ***
// Configure console logging with the same format as file logging
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(), // Use JSON format for consistency
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // Custom printf to format JSON
      return `${timestamp} ${level.toUpperCase()}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ""
      }`;
    })
  ),
});
// *** CHANGES END HERE ***

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "proxy-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxFiles: "60d",
      dirname: process.env.LOGS_PATH,
    }),
    // *** ADDED THIS LINE ***
    consoleTransport, // Add the console transport
  ],
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const requestIP = req.socket.remoteAddress;
    logger.warn(`Rate limit exceeded for IP: ${requestIP}`);
    res.status(options.statusCode).send(options.message);
  },
});

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT;
const API_KEY = process.env.API_KEY;
const TARGET_API_URL = process.env.TARGET_API_URL;

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const requestIP = req.socket.remoteAddress;

  if (apiKey && apiKey === API_KEY) {
    next();
  } else {
    logger.warn(`Unauthorized Request IP: ${requestIP}`);
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.use(express.json());
app.use(limiter);

app.post("/get", authenticateApiKey, async (req, res) => {
  try {
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString(
      "base64"
    )}`;

    const response = await fetch(TARGET_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    const data = await response.json();
    // *** CHANGES START HERE ***
    console.log(`Server Response: ${JSON.stringify(data, null, 2)}`); // Pretty print JSON for console
    logger.info("Server Response:", data); // Log the object, winston will format it as JSON
    // *** CHANGES END HERE ***

    res.status(response.status).json(data);
  } catch (error) {
    // *** CHANGES START HERE ***
    console.error("Error:", error); // Keep the original error for console
    logger.error("Error forwarding request:", error); // Log the error object
    // *** CHANGES END HERE ***
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  // *** CHANGES START HERE ***
  logger.info("Proxy server is running..."); // Use logger for consistent messages
  console.log("Proxy server is running...");
  // *** CHANGES END HERE ***
});
