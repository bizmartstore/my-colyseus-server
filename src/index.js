// ============================================================
// src/index.js — Colyseus MMORPG Server Entry (Single Room)
// ============================================================

const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { MMORPGRoom } = require("./rooms");

const app = express();

/* ============================================================
   ✅ Health Check & Debug Endpoints
   ============================================================ */
app.get("/", (req, res) => {
  res.send(`
    <h2>🟢 Colyseus MMORPG Server is Running</h2>
    <p>Health OK ✅</p>
    <p>WebSocket endpoint: <code>wss://${req.headers.host}</code></p>
    <p>Active Room: <strong>mmorpg_room</strong></p>
  `);
});

app.get("/status", (req, res) => {
  const rooms = gameServer?.matchMaker?.rooms || {};
  const roomData = Object.entries(rooms).map(([id, room]) => ({
    id,
    name: room.roomName,
    clients: room.clients?.length || 0,
  }));
  res.json({ ok: true, rooms: roomData });
});

/* ============================================================
   ⚙️ HTTP + WS Server Initialization
   ============================================================ */
const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 4000,
    pingMaxRetries: 5,
  }),
  seatReservationTime: 60,
});

/* ============================================================
   🌍 Define a Single Room ("mmorpg_room")
   ============================================================ */
try {
  gameServer.define("mmorpg_room", MMORPGRoom);
  console.log("🌍 Registered Colyseus room: mmorpg_room");
} catch (err) {
  console.error("❌ Failed to register mmorpg_room:", err);
}

/* ============================================================
   🎮 Start Listening (Render-compatible)
   ============================================================ */
const PORT = process.env.PORT || 2567;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: https://mmorpg-colyseus-server-0u0g.onrender.com/`);
  console.log(`🔗 WebSocket: wss://mmorpg-colyseus-server-0u0g.onrender.com`);
  console.log("-----------------------------------------------------------");
  console.log("💡 Single shared room enabled: mmorpg_room");
  console.log("-----------------------------------------------------------");
});

/* ============================================================
   🧹 Graceful Shutdown
   ============================================================ */
process.on("SIGINT", async () => {
  console.log("🧹 Server shutting down...");
  try {
    await gameServer.gracefullyShutdown();
    console.log("✅ Colyseus shutdown complete.");
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
  }
  process.exit(0);
});

/* ============================================================
   🚨 Catch unexpected server errors
   ============================================================ */
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("💥 Unhandled Rejection:", reason, p);
});
