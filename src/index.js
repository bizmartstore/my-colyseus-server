// src/index.js
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { WorldRoom } = require("./rooms");

const app = express();

// Simple homepage for testing
app.get("/", (req, res) => res.send("🟢 Colyseus server is running successfully!"));

// Create HTTP + WebSocket server
const server = http.createServer(app);

// Initialize Colyseus
const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

// Define the game room
gameServer.define("world", WorldRoom);

// Start the server
const PORT = process.env.PORT || 2567;
gameServer.listen(PORT).then(() => {
  console.log(`✅ Colyseus listening on ws://localhost:${PORT}`);
  console.log(`🌐 HTTP endpoint available at http://localhost:${PORT}`);
});
