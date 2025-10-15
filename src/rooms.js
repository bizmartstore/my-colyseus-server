// src/rooms.js
const { Room } = require("colyseus");

class MMORPGRoom extends Room {
  onCreate(options) {
    console.log("🌍 MMORPGRoom created!", options);
    this.setState({ players: {} });

    // 📦 Handle player movement messages
    this.onMessage("move", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (player) {
        player.x = message.x;
        player.y = message.y;
        player.dir = message.dir;
      }

      // Broadcast to all other clients
      this.broadcast("move", { sessionId: client.sessionId, ...message });
    });

    // ⚔️ Handle attacks
    this.onMessage("attack", (client, message) => {
      this.broadcast("attack", { sessionId: client.sessionId, ...message });
    });

    // 🧠 Optionally handle skill usage, chat, etc.
    // this.onMessage("skill", (client, message) => { ... });
  }

  onJoin(client, options) {
    console.log("✨ Player joined:", client.sessionId);

    // Register new player in state
    this.state.players[client.sessionId] = {
      email: options.email || "guest",
      x: options.x || 0,
      y: options.y || 0,
      dir: options.dir || "down",
      hp: 100,
      mp: 50,
      class: options.class || "novice"
    };

    // Notify everyone
    this.broadcast("join", {
      sessionId: client.sessionId,
      player: this.state.players[client.sessionId]
    });
  }

  onLeave(client) {
    console.log("👋 Player left:", client.sessionId);
    this.broadcast("leave", { sessionId: client.sessionId });
    delete this.state.players[client.sessionId];
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
