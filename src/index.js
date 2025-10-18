// ============================================================
// src/index.js — Colyseus MMORPG Server Entry
// ============================================================

const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { MMORPGRoom } = require("./rooms");

const app = express();

/* ============================================================
   ✅ Health Check Endpoint
   ============================================================ */
app.get("/", (req, res) => {
  res.send("🟢 Colyseus MMORPG server is running successfully on Render!");
});

/* ============================================================
   ⚙️ Create HTTP + WS Server
   ============================================================ */
const server = http.createServer(app);

/* ============================================================
   🚀 Initialize Colyseus Game Server
   ============================================================ */
const gameServer = new Server({
  transport: new WebSocketTransport({
    server, // same HTTP server (Render-compatible)
    pingInterval: 4000,
    pingMaxRetries: 5,
  }),
  seatReservationTime: 60, // global safety window for joining
});

/* ============================================================
   🌍 Define MMORPG Room (shared world, filtered by mapId)
   ============================================================ */
gameServer.define("mmorpg_room", MMORPGRoom);

console.log("🌍 Room 'mmorpg_room' defined (shared room, visibility by mapId).");

/* ============================================================
   🎮 Start Listening (Render-compatible)
   ============================================================ */
const PORT = process.env.PORT || 2567;

// ✅ Use server.listen for Render’s web service
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: https://mmorpg-colyseus-server-0u0g.onrender.com/`);
  console.log(`🔗 WebSocket endpoint: wss://mmorpg-colyseus-server-0u0g.onrender.com`);
  console.log("-----------------------------------------------------------");
  console.log("💡 Each player joins a shared room.");
  console.log("   Map-based visibility handled inside MMORPGRoom.");
  console.log("-----------------------------------------------------------");
});

/* ============================================================
   🧹 Graceful Shutdown
   ============================================================ */
process.on("SIGINT", async () => {
  console.log("🧹 Server shutting down...");
  try {
    await gameServer.gracefullyShutdown();
    console.log("✅ Shutdown complete.");
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
  }
  process.exit();
});
