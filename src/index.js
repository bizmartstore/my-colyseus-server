// src/index.js
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { MMORPGRoom } = require("./rooms");

const app = express();

// Simple homepage
app.get("/", (req, res) => res.send("🟢 Colyseus MMORPG server running successfully!"));

// Create HTTP + WebSocket server
const server = http.createServer(app);

// Initialize Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// ✅ Register room
gameServer.define("mmorpg_room", MMORPGRoom);

const PORT = process.env.PORT || 2567;
gameServer.listen(PORT).then(() => {
  console.log(`✅ Colyseus listening on ws://localhost:${PORT}`);
  console.log(`🌐 HTTP endpoint at http://localhost:${PORT}`);
});
