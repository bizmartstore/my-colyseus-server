// ============================================================
// src/index.js — Colyseus MMORPG Server Entry (Multi-map Ready)
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
    <p>Room: <strong>mmorpg_room</strong></p>
  `);
});

// Optional: quick endpoint to check number of connected clients
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
    pingInterval: 4000, // keeps idle sockets alive
    pingMaxRetries: 5,  // after 5 missed pings, disconnect
  }),
  seatReservationTime: 60, // seconds to allow reconnect
});

/* ============================================================
   🌍 Define MMORPG Room
   ============================================================ */
gameServer.define("mmorpg_room", MMORPGRoom);
console.log("🌍 Room 'mmorpg_room' defined — multi-map visibility handled inside MMORPGRoom.");

/* ============================================================
   🎮 Start Listening (Render-compatible)
   ============================================================ */
const PORT = process.env.PORT || 2567;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: https://mmorpg-colyseus-server-0u0g.onrender.com/`);
  console.log(`🔗 WebSocket: wss://mmorpg-colyseus-server-0u0g.onrender.com`);
  console.log("-----------------------------------------------------------");
  console.log("💡 All players share one room.");
  console.log("   Player visibility filtered by mapId in MMORPGRoom.");
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
