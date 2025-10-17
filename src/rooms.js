// src/rooms.js
const { Room } = require("colyseus");

/* ============================================================
 🧩 Character database
 ============================================================ */
const characterDatabase = {
  C001: {
    Name: "Myca",
    Class: "Valkyrie",
    BaseHP: 85,
    BaseMana: 90,
    Attack: 30,
    Defense: 13,
    Speed: 10,
    CritDamage: 140,
    ImageURL_IdleFront: "https://i.ibb.co/rGMF3kCd/Valkyrie-Front.gif",
    ImageURL_IdleBack: "https://i.ibb.co/kg0WkTrt/Valkyrie-Back.gif",
    ImageURL_Walk_Left: "https://i.ibb.co/jkGCZG33/Valkyrie-RUNLEFT.gif",
    ImageURL_Walk_Right: "https://i.ibb.co/XxtZZ46d/Valkyrie-RUNRIGHT.gif",
    ImageURL_Attack_Left: "https://i.ibb.co/QSX6Q6V/Valkyrie-Attack-Left.gif",
    ImageURL_Attack_Right: "https://i.ibb.co/xtLLKJxJ/Valkyrie-Attack-Right.gif",
  },
  C002: {
    Name: "Luna",
    Class: "Dark Oracle",
    BaseHP: 60,
    BaseMana: 100,
    Attack: 40,
    Defense: 5,
    Speed: 8,
    CritDamage: 100,
    ImageURL_IdleFront: "https://i.ibb.co/0p8hBvDX/ezgif-com-animated-gif-maker.gif",
    ImageURL_IdleBack: "https://i.ibb.co/n87HYqwW/ezgif-com-rotate-2.gif",
    ImageURL_Walk_Left: "https://i.ibb.co/LXz5t6pN/ezgif-com-rotate.gif",
    ImageURL_Walk_Right: "https://i.ibb.co/SDpYsNsN/Running-front.gif",
    ImageURL_Attack_Left: "https://i.ibb.co/WWKvhRKP/ezgif-com-rotate.gif",
    ImageURL_Attack_Right: "https://i.ibb.co/GvbYv6qv/Swing-front.gif",
  },
  C003: {
    Name: "Mike",
    Class: "Mino Warrior",
    BaseHP: 80,
    BaseMana: 80,
    Attack: 25,
    Defense: 20,
    Speed: 8,
    CritDamage: 100,
    ImageURL_IdleFront: "https://i.ibb.co/s9rWsbfs/Mino-Idle-Right.gif",
    ImageURL_IdleBack: "https://i.ibb.co/PvgKK96J/Mino-Idle-Left.gif",
    ImageURL_Walk_Left: "https://i.ibb.co/n8jBKBB1/Mino-Run-Left.gif",
    ImageURL_Walk_Right: "https://i.ibb.co/Jj5dH23t/Mino-Run-Right.gif",
    ImageURL_Attack_Left: "https://i.ibb.co/kVZxqB8G/Mino-Slash-Left.gif",
    ImageURL_Attack_Right: "https://i.ibb.co/sdVH803V/Mino-Slash-Right.gif",
  },
  C004: {
    Name: "Mizo",
    Class: "Necromancer",
    BaseHP: 60,
    BaseMana: 100,
    Attack: 35,
    Defense: 15,
    Speed: 8,
    CritDamage: 100,
    ImageURL_IdleFront: "https://i.ibb.co/ynHNt0LQ/IDLE-RIGHT.gif",
    ImageURL_IdleBack: "https://i.ibb.co/qYjYdMG6/IDLE-LEFT.gif",
    ImageURL_Walk_Left: "https://i.ibb.co/YBMvpGzG/RUN-LEFT.gif",
    ImageURL_Walk_Right: "https://i.ibb.co/D3DYmMv/RUN-RIGHT.gif",
    ImageURL_Attack_Left: "https://i.ibb.co/DPDXwnWM/ATTACK-LEFT.gif",
    ImageURL_Attack_Right: "https://i.ibb.co/mrMCxpJM/ATTACK-RIGHT.gif",
  },
};

/* ============================================================
 🏰 MMORPG Room — Global Room, Map-based Visibility
 ============================================================ */
class MMORPGRoom extends Room {
  onCreate(options) {
    console.log("🌍 MMORPGRoom created!");
    this.setState({ players: {} });

    /* 🧭 Handle movement */
    this.onMessage("move", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      // Update server state
      player.x = message.x;
      player.y = message.y;
      player.dir = message.dir;

      // 🔄 Broadcast only to players in the same map
      for (const [sessionId, other] of Object.entries(this.state.players)) {
        if (other.mapId === player.mapId && sessionId !== client.sessionId) {
          const target = this.clients.find(c => c.sessionId === sessionId);
          if (target) {
            target.send("move", {
              sessionId: client.sessionId,
              x: message.x,
              y: message.y,
              dir: message.dir,
            });
          }
        }
      }
    });

    /* ⚔️ Handle attack */
    this.onMessage("attack", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      // Only send attack events to players in the same map
      for (const [sessionId, other] of Object.entries(this.state.players)) {
        if (other.mapId === player.mapId && sessionId !== client.sessionId) {
          const target = this.clients.find(c => c.sessionId === sessionId);
          if (target) {
            target.send("attack", {
              sessionId: client.sessionId,
              ...message,
            });
          }
        }
      }
    });
  }

  /* ============================================================
     🧍 Player joins the room
     ============================================================ */
  onJoin(client, options) {
    console.log("✨ Player joined:", client.sessionId, options);

    const safeEmail =
      options.email ||
      `guest_${Math.random().toString(36).substring(2, 8)}@game.local`;
    const safeName = options.playerName || "Guest";
    const safeCharacterID = options.CharacterID || "C001";
    const charData =
      characterDatabase[safeCharacterID] || characterDatabase["C001"];

    const mapId = Number(options.mapId) || 1;
    const posX = Number(options.x) || 200;
    const posY = Number(options.y) || 200;

    // Store player
    this.state.players[client.sessionId] = {
      id: client.sessionId,
      email: safeEmail,
      playerName: safeName,
      CharacterID: safeCharacterID,
      characterClass: charData.Class,
      mapId,
      x: posX,
      y: posY,
      dir: options.dir || "down",
      hp: charData.BaseHP,
      mp: charData.BaseMana,
      attack: charData.Attack,
      defense: charData.Defense,
      speed: charData.Speed,
      critDamage: charData.CritDamage,

      sprites: {
        idleFront: charData.ImageURL_IdleFront,
        idleBack: charData.ImageURL_IdleBack,
        walkLeft: charData.ImageURL_Walk_Left,
        walkRight: charData.ImageURL_Walk_Right,
        attackLeft: charData.ImageURL_Attack_Left,
        attackRight: charData.ImageURL_Attack_Right,
      },
    };

    console.log(
      `✅ ${safeName} (${safeEmail}) joined Map ${mapId} as ${charData.Class}`
    );

    // 📨 Send all current players (same map only)
    const sameMapPlayers = {};
    for (const [id, other] of Object.entries(this.state.players)) {
      if (other.mapId === mapId) sameMapPlayers[id] = other;
    }
    client.send("current_players", sameMapPlayers);

    // 🔔 Notify others in the same map
    for (const [id, other] of Object.entries(this.state.players)) {
      if (other.mapId === mapId && id !== client.sessionId) {
        const target = this.clients.find(c => c.sessionId === id);
        if (target) {
          target.send("player_joined", {
            id: client.sessionId,
            player: this.state.players[client.sessionId],
          });
        }
      }
    }
  }

  /* ============================================================
     👋 Player leaves
     ============================================================ */
  onLeave(client) {
    const player = this.state.players[client.sessionId];
    if (!player) return;

    console.log(
      `👋 Player left: ${client.sessionId} (${player.playerName}) from Map ${player.mapId}`
    );

    // Notify others in same map only
    for (const [id, other] of Object.entries(this.state.players)) {
      if (other.mapId === player.mapId && id !== client.sessionId) {
        const target = this.clients.find(c => c.sessionId === id);
        if (target) {
          target.send("player_left", { id: client.sessionId });
        }
      }
    }

    delete this.state.players[client.sessionId];
  }

  /* ============================================================
     🧹 Dispose
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
