// ============================================================
// src/index.js — Colyseus MMORPG Server Entry (Dynamic Map Ready)
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
    <p>Dynamic Rooms Enabled: <strong>mmorpg_room_[MapID]</strong></p>
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
   🌍 Dynamic MMORPG Rooms (No Hardcoding Needed)
   ============================================================ */
try {
  // ✅ Modern Colyseus (v0.15+) supports defineMatcher()
  if (typeof gameServer.defineMatcher === "function") {
    gameServer.defineMatcher(/^mmorpg_room_\d+$/, MMORPGRoom);
    console.log("🌍 Dynamic room matcher active: mmorpg_room_<mapId>");
  } else {
    // 🧩 Fallback for older Colyseus versions
    console.log("⚙️ Fallback: defineMatcher not supported — using pre-defined room list.");
    const maxMapId = 2000; // Supports up to 2000 maps dynamically
    for (let id = 1; id <= maxMapId; id++) {
      gameServer.define(`mmorpg_room_${id}`, MMORPGRoom);
    }
    console.log(`🌍 Defined MMORPG rooms for MapIDs 1–${maxMapId}`);
  }
} catch (err) {
  console.error("❌ Failed to setup dynamic rooms:", err);
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
  console.log("💡 Dynamic map rooms enabled: mmorpg_room_<mapId>");
  console.log("   Each map now has its own synchronized Colyseus room.");
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
