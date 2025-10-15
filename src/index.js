// src/index.js
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { MMORPGRoom } = require("./rooms");

const app = express();

/* ============================================================
 🏠 Basic Express route (for quick server check)
 ============================================================ */
app.get("/", (req, res) =>
  res.send("🟢 Colyseus MMORPG server is running successfully!")
);

/* ============================================================
 ⚙️ Create HTTP + WebSocket server
 ============================================================ */
const server = http.createServer(app);

/* ============================================================
 🚀 Initialize Colyseus server
  - Adds WebSocket transport
  - Increases seat reservation time
  - Adds heartbeat (ping) to keep connections stable
 ============================================================ */
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 4000,  // send ping every 4s to detect disconnects
    pingMaxRetries: 5,   // tolerate up to 5 missed pings
  }),
  seatReservationTime: 15, // ⏱️ give clients 15s to establish connection
});

/* ============================================================
 🏰 Define game rooms
 ============================================================ */
gameServer.define("mmorpg_room", MMORPGRoom);

/* ============================================================
 🟢 Start the server
 ============================================================ */
const PORT = process.env.PORT || 2567;
gameServer.listen(PORT).then(() => {
  console.log(`✅ Colyseus WebSocket listening on ws://localhost:${PORT}`);
  console.log(`🌐 HTTP status check: http://localhost:${PORT}/`);
});

/* ============================================================
 🧩 Graceful shutdown (optional, for cloud hosting)
 ============================================================ */
process.on("SIGINT", () => {
  console.log("🧹 Server shutting down...");
  gameServer.gracefullyShutdown();
  process.exit();
});
