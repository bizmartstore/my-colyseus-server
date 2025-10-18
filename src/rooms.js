// ============================================================
// src/rooms.js — MMORPG Room Definition
// ============================================================
const { Room } = require("colyseus");

/* ============================================================
 🧩 Character Database (Static Sample)
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
 🏰 MMORPG Room — Shared World (Map-based Visibility)
 ============================================================ */
class MMORPGRoom extends Room {
  onCreate(options) {
    console.log("🌍 MMORPGRoom created!");

    // ✅ Fix: Extend reservation time to prevent join timeout
    this.setSeatReservationTime(20);

    // ✅ Initialize room state
    this.setState({ players: {} });

    // Maintain a tick clock (keeps room active)
    this.clock.setInterval(() => {}, 1000 / 20);

    /* ============================================================
       🧭 Movement Handler
       ============================================================ */
    this.onMessage("move", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;
      player.x = message.x;
      player.y = message.y;
      player.dir = message.dir;

      const payload = {
        id: client.sessionId,
        x: player.x,
        y: player.y,
        dir: player.dir,
        mapId: player.mapId,
        playerName: player.playerName,
      };

      // Broadcast to players in same map
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === player.mapId) c.send("player_move", payload);
      });
    });

    /* ============================================================
       ⚔️ Attack Handler
       ============================================================ */
    this.onMessage("attack", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;
      const payload = {
        sessionId: client.sessionId,
        mapId: player.mapId,
        ...message,
      };
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === player.mapId) c.send("attack", payload);
      });
    });

    /* ============================================================
       📨 Snapshot Request Handler
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
       💬 Chat Handler
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

      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === player.mapId) c.send("chat", chatPayload);
      });
    });

    /* ============================================================
       🗺️ Map Change Handler
       ============================================================ */
    this.onMessage("change_map", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const oldMap = player.mapId;
      const newMap = Number(message.newMapId) || oldMap;
      if (newMap === oldMap) return;

      console.log(`🌍 ${player.playerName} moved from Map ${oldMap} → ${newMap}`);

      player.mapId = newMap;

      // Notify old map players
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === oldMap) c.send("player_left", { id: client.sessionId });
      });

      // Notify new map players
      this.clients.forEach((c) => {
        const other = this.state.players[c.sessionId];
        if (other?.mapId === newMap && c.sessionId !== client.sessionId) {
          c.send("player_joined", {
            id: client.sessionId,
            player: this.state.players[client.sessionId],
          });
        }
      });

      // Send snapshot to switching player
      const sameMapPlayers = {};
      for (const [id, p] of Object.entries(this.state.players)) {
        if (p.mapId === newMap) sameMapPlayers[id] = p;
      }
      client.send("players_snapshot", sameMapPlayers);
    });
  }

  /* ============================================================
     🧍 Player Joins (fast non-blocking join)
     ============================================================ */
  async onJoin(client, options) {
    console.log("✨ Player joined:", client.sessionId, options);

    // ✅ Early acknowledgment — prevents seat expiry
    client.send("join_ack", { ok: true });

    // 🕒 Setup player data asynchronously
    setTimeout(() => {
      try {
        const safeEmail = options.email || `guest_${Math.random().toString(36).substring(2, 8)}@game.local`;
        const safeName = options.playerName || "Guest";
        const safeCharacterID = options.CharacterID || "C001";
        const charData = characterDatabase[safeCharacterID] || characterDatabase["C001"];
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

        console.log(`✅ ${safeName} (${safeEmail}) joined Map ${mapId} as ${charData.Class}`);

        // Send same-map snapshot
        const sameMapPlayers = {};
        for (const [id, other] of Object.entries(this.state.players)) {
          if (other.mapId === mapId) sameMapPlayers[id] = other;
        }
        client.send("players_snapshot", sameMapPlayers);

        // Notify others
        this.clients.forEach((c) => {
          const other = this.state.players[c.sessionId];
          if (c.sessionId !== client.sessionId && other?.mapId === mapId) {
            c.send("player_joined", {
              id: client.sessionId,
              player: this.state.players[client.sessionId],
            });
          }
        });
      } catch (err) {
        console.error("❌ Error in delayed join:", err);
      }
    }, 100);
  }

  /* ============================================================
     👋 Player Leaves
     ============================================================ */
  onLeave(client) {
    const player = this.state.players[client.sessionId];
    if (!player) return;

    console.log(`👋 Player left: ${client.sessionId} (${player.playerName}) from Map ${player.mapId}`);

    this.clients.forEach((c) => {
      const other = this.state.players[c.sessionId];
      if (other?.mapId === player.mapId) {
        c.send("player_left", { id: client.sessionId });
      }
    });

    delete this.state.players[client.sessionId];
  }

  /* ============================================================
     🧹 Room Disposed
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
