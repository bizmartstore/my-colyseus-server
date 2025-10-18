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

    /* ============================================================
       🧭 Handle movement (✅ Server-Authoritative Fix)
       ============================================================ */
    this.onMessage("move", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      // 🧠 Update player's authoritative position
      player.x = message.x;
      player.y = message.y;
      player.dir = message.dir;

      console.log(
        `📦 [MOVE] ${player.playerName} (${client.sessionId}) — x:${message.x}, y:${message.y}, dir:${message.dir}, map:${player.mapId}`
      );

      // ✅ Create authoritative payload
      const payload = {
        id: client.sessionId,
        x: player.x,
        y: player.y,
        dir: player.dir,
        mapId: player.mapId,
        playerName: player.playerName,
      };

      // ✅ Broadcast to ALL players (including sender) in same map
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === player.mapId) {
          c.send("player_move", payload);
        }
      });
    });

    /* ============================================================
       ⚔️ Handle attacks
       ============================================================ */
    this.onMessage("attack", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const payload = {
        sessionId: client.sessionId,
        mapId: player.mapId,
        ...message,
      };

      // Broadcast attack to all in same map
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === player.mapId) {
          c.send("attack", payload);
        }
      });
    });

    /* ============================================================
       📨 Handle manual player snapshot requests
       ============================================================ */
    this.onMessage("request_players", (client) => {
      const requester = this.state.players[client.sessionId];
      if (!requester) return;

      const sameMapPlayers = {};
      for (const [id, p] of Object.entries(this.state.players)) {
        if (p.mapId === requester.mapId) sameMapPlayers[id] = p;
      }

      client.send("players_snapshot", sameMapPlayers);
    });

    /* ============================================================
       💬 Handle chat messages (map-based visibility)
       ============================================================ */
    this.onMessage("chat", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player || !message.text) return;

      const chatPayload = {
        sender: player.email,
        name: player.playerName,
        text: String(message.text).substring(0, 300),
        mapId: player.mapId,
        ts: Date.now(),
      };

      console.log(`💬 [CHAT] ${player.playerName}@Map${player.mapId}: ${chatPayload.text}`);

      // Broadcast only to players in the same map
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === player.mapId) {
          c.send("chat", chatPayload);
        }
      });
    });

    /* ============================================================
       🗺️ Handle map change (fix for ghost duplicates)
       ============================================================ */
    this.onMessage("change_map", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const oldMap = player.mapId;
      const newMap = Number(message.newMapId) || oldMap;
      if (newMap === oldMap) return;

      console.log(`🌍 ${player.playerName} moved from Map ${oldMap} → ${newMap}`);

      // Update server-side player map
      player.mapId = newMap;

      // Notify old map players to remove this player
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === oldMap) {
          c.send("player_left", { id: client.sessionId });
        }
      });

      // Notify new map players to add this player
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === newMap && c.sessionId !== client.sessionId) {
          c.send("player_joined", {
            id: client.sessionId,
            player: this.state.players[client.sessionId],
          });
        }
      });

      // Send fresh snapshot to this player for new map
      const sameMapPlayers = {};
      for (const [id, p] of Object.entries(this.state.players)) {
        if (p.mapId === newMap) sameMapPlayers[id] = p;
      }
      client.send("players_snapshot", sameMapPlayers);
    });
  }

  /* ============================================================
     🧍 Player joins
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

    // 📨 Send snapshot of current players on same map
    const sameMapPlayers = {};
    for (const [id, other] of Object.entries(this.state.players)) {
      if (other.mapId === mapId) sameMapPlayers[id] = other;
    }
    client.send("players_snapshot", sameMapPlayers);

    // 🔔 Notify others about the new player
    this.clients.forEach((c) => {
      const other = this.state.players[c.sessionId];
      if (c.sessionId !== client.sessionId && other?.mapId === mapId) {
        c.send("player_joined", {
          id: client.sessionId,
          player: this.state.players[client.sessionId],
        });
      }
    });
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

    // Notify others in same map
    this.clients.forEach((c) => {
      const other = this.state.players[c.sessionId];
      if (other?.mapId === player.mapId) {
        c.send("player_left", { id: client.sessionId });
      }
    });

    delete this.state.players[client.sessionId];
  }

  /* ============================================================
     🧹 Room disposed
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
