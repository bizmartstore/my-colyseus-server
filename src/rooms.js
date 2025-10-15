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

      // 🧭 Broadcast movement to everyone (including self)
      this.broadcast("move", {
        sessionId: client.sessionId,
        x: message.x,
        y: message.y,
        dir: message.dir
      });
    });

    // ⚔️ Handle attacks
    this.onMessage("attack", (client, message) => {
      this.broadcast("attack", {
        sessionId: client.sessionId,
        ...message
      });
    });
  }

  onJoin(client, options) {
    console.log("✨ Player joined:", client.sessionId, options);

    // 🧍 Register new player
    this.state.players[client.sessionId] = {
      id: client.sessionId,
      email: options.email || "guest",
      x: options.x || 200,
      y: options.y || 200,
      dir: options.dir || "down",
      hp: 100,
      mp: 50,
      class: options.class || "novice",
      name: options.playerName || "Traveler"
    };

    // 🎯 Send existing players to the joining client
    client.send("current_players", this.state.players);

    // 📢 Notify everyone else that a new player joined
    this.broadcast(
      "player_joined",
      {
        id: client.sessionId,
        player: this.state.players[client.sessionId]
      },
      { except: client }
    );
  }

  onLeave(client, consented) {
    console.log("👋 Player left:", client.sessionId);

    // 🗑️ Remove from state
    delete this.state.players[client.sessionId];

    // 📢 Notify everyone
    this.broadcast("player_left", { id: client.sessionId });
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
