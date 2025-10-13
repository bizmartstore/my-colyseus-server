// src/rooms.js
const { Room } = require("colyseus");

class WorldRoom extends Room {
  onCreate(options) {
    console.log("🌍 WorldRoom created!", options);
    this.setState({ players: {} });

    // When a player sends movement data
    this.onMessage("move", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (player) {
        player.x = message.x;
        player.y = message.y;
        player.dir = message.dir;
      }

      // Send this move to everyone else
      this.broadcast("move", { sessionId: client.sessionId, ...message });
    });

    // When a player sends an attack
    this.onMessage("attack", (client, message) => {
      // Just broadcast the attack to everyone for now
      this.broadcast("attack", { sessionId: client.sessionId, ...message });
    });
  }

  // When a player joins
  onJoin(client, options) {
    console.log("✨ Player joined:", client.sessionId);
    this.state.players[client.sessionId] = {
      email: options.email || "guest",
      x: 0,
      y: 0,
      dir: "down"
    };

    // Tell everyone a new player joined
    this.broadcast("join", {
      sessionId: client.sessionId,
      email: this.state.players[client.sessionId].email
    });
  }

  // When a player leaves
  onLeave(client) {
    console.log("👋 Player left:", client.sessionId);
    this.broadcast("leave", { sessionId: client.sessionId });
    delete this.state.players[client.sessionId];
  }
}

module.exports = { WorldRoom };
