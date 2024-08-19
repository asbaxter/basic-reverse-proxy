const express = require("express");
require("dotenv").config();
const axios = require("axios");

const app = express();

const PORT = process.env.PORT;
const API_KEY = process.env.API_KEY;
const TARGET_API_URL = process.env.TARGET_API_URL;

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey && apiKey === API_KEY) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.use(express.json());

app.post("/postRequest", authenticateApiKey, async (req, res) => {
  try {
    // Get the request IP
    const requestIP = req.socket.remoteAddress;
    const localIP = req.socket.localAddress;

    console.log(" ");
    console.log(`Request IP: ${requestIP}`);
    console.log(`Local IP: ${localIP}`);
    console.log(`Forwarding URL: ${TARGET_API_URL}`);
    console.log(" ");

    // Forward the request body to the target API
    const response = await axios.post(TARGET_API_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`Server Response: ${JSON.stringify(response.data)}`);

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error forwarding request:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
