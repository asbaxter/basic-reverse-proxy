const express = require("express");
require("dotenv").config();
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const winston = require("winston");

// Winston logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: "proxy.log",
    }),
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

const PORT = process.env.PORT;
const API_KEY = process.env.API_KEY;
const TARGET_API_URL = process.env.TARGET_API_URL;

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const requestIP = req.socket.remoteAddress;

  if (apiKey && apiKey === API_KEY) {
    next();
  } else {
    logger.warn(`Unauthorized Request IP: ${requestIP}`); // Log unauthorized attempts
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.use(express.json());
app.use(limiter);

app.post("/post", authenticateApiKey, async (req, res) => {
  try {
    const response = await axios.post(TARGET_API_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    logger.info(`Server Response: ${JSON.stringify(response.data)}`); // Log successful responses

    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error("Error forwarding request:", error); // Log errors with stack trace
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  logger.info(`Proxy server is running...`);
  console.log(`Proxy server is running...`);
});
