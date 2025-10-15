// src/index.js
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { MMORPGRoom } = require("./rooms");

const app = express();

// ✅ Simple health check
app.get("/", (req, res) =>
  res.send("🟢 Colyseus MMORPG server is running successfully!")
);

// ✅ Create HTTP + WS server
const server = http.createServer(app);

// ✅ Initialize Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 4000,
    pingMaxRetries: 5,
  }),
  seatReservationTime: 60, // ⏱ allow up to 60 seconds for slow clients
});

// ✅ Define room type and filter by mapId
// This ensures all players with the SAME mapId share one instance.
gameServer
  .define("mmorpg_room", MMORPGRoom)
  .filterBy(["mapId"]);

// ✅ Start the server
const PORT = process.env.PORT || 2567;
gameServer.listen(PORT).then(() => {
  console.log(`✅ Colyseus WebSocket listening on ws://localhost:${PORT}`);
  console.log(`🌐 HTTP status check: http://localhost:${PORT}/`);
});

// ✅ Graceful shutdown
process.on("SIGINT", () => {
  console.log("🧹 Server shutting down...");
  gameServer.gracefullyShutdown();
  process.exit();
});
