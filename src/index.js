// src/index.js
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
  res.send("🟢 Colyseus MMORPG server is running successfully!");
});

/* ============================================================
   ⚙️ Create HTTP + WS server
   ============================================================ */
const server = http.createServer(app);

/* ============================================================
   🚀 Initialize Colyseus Game Server
   ============================================================ */
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 4000,
    pingMaxRetries: 5,
  }),
  seatReservationTime: 60,
});

/* ============================================================
   🌍 Define one global MMORPG room (no filter)
   ============================================================ */
// We remove `.filterBy(["mapId"])` to have a shared world.
gameServer.define("mmorpg_room", MMORPGRoom);

console.log("🌍 Room 'mmorpg_room' defined (all players share one world).");

/* ============================================================
   🎮 Start Listening
   ============================================================ */
const PORT = process.env.PORT || 2567;

gameServer.listen(PORT).then(() => {
  console.log(`✅ WebSocket running on ws://localhost:${PORT}`);
  console.log(`🌐 HTTP check: http://localhost:${PORT}/`);
  console.log("-----------------------------------------------------------");
  console.log("💡 Each player joins one global room.");
  console.log("   But visibility is filtered by mapId (server-side).");
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
