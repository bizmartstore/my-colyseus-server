// ============================================================
// src/rooms.js — MMORPG Room Definition (Multi-map Ready)
// ============================================================

const { Room } = require("colyseus");

// 🧩 Dynamic import of node-fetch for server compatibility
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ============================================================
   🧠 Process-level Safety Handlers
   ============================================================ */
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("🚨 Unhandled Rejection:", reason, "Promise:", p);
});
process.on("exit", (code) => console.warn("⚰️ Process exiting with code:", code));

// small heartbeat so container restarts are obvious in logs
setInterval(() => console.log("💓 server alive", new Date().toISOString()), 30000);

/* ============================================================
   📄 Google Apps Script Endpoints
   ============================================================ */
const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx5iXEVK7xzNwS465caDOF0ZaMdh6gi7h3xcvxySPjkeZ41LsFA0sIXKyBk3v0-ROfuzg/exec?action=getMonsters";

const REWARD_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx5iXEVK7xzNwS465caDOF0ZaMdh6gi7h3xcvxySPjkeZ41LsFA0sIXKyBk3v0-ROfuzg/exec?action=rewardPlayerForKill";

/* ============================================================
   🧩 Load Monsters from Google Sheets
   ============================================================ */
async function loadMonstersFromSheet() {
  try {
    const res = await fetch(SHEET_ENDPOINT);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((m) => ({
      id: m.MonsterID,
      name: m.Name,
      level: Number(m.Level) || 1,
      maxHP: Number(m.BaseHP) || 100,
      hp: Number(m.CurrentHP) || Number(m.BaseHP) || 100,
      attack: Number(m.Attack) || 10,
      defense: Number(m.Defense) || 5,
      speed: Number(m.Speed) || 5,
      critDamage: Number(m.CritDamage) || 100,
      critChance: Number(m.CritChance) || 10,
      mapId: Number(m.MapID) || 101,
      x: Number(m.PositionX) || 500,
      y: Number(m.PositionY) || 260,
      coins: Math.floor((Number(m.Attack) + Number(m.Level)) / 2) || 10,
      exp: Math.floor(Number(m.Level) * 5 + 10),
      sprites: {
        idleLeft: m.ImageURL_IdleLeft,
        idleRight: m.ImageURL_IdleRight,
      },
      state: "idle",
      dir: "left",
    }));
  } catch (err) {
    console.error("❌ Failed to fetch monsters:", err);
    return [];
  }
}

/* ============================================================
   🧩 Character Database
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
    ImageURL_Walk_Left: "https://i.ibb.co/jkGCZG33/Valkyrie-RUNLEFT.gif",
    ImageURL_Walk_Right: "https://i.ibb.co/XxtZZ46d/Valkyrie-RUNRIGHT.gif",
    ImageURL_Attack_Left: "https://i.ibb.co/QSX6Q6V/Valkyrie-Attack-Left.gif",
    ImageURL_Attack_Right: "https://i.ibb.co/xtLLKjxJ/Valkyrie-Attack-Right.gif",
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
    ImageURL_Walk_Left: "https://i.ibb.co/YBMvpGzG/RUN-LEFT.gif",
    ImageURL_Walk_Right: "https://i.ibb.co/D3DYmMv/RUN-RIGHT.gif",
    ImageURL_Attack_Left: "https://i.ibb.co/DPDXwnWM/ATTACK-LEFT.gif",
    ImageURL_Attack_Right: "https://i.ibb.co/mrMCxpJM/ATTACK-RIGHT.gif",
  },
};

/* ============================================================
 🏰 MMORPG Room Definition (Multi-map Ready, Monster + Player)
 ============================================================ */
class MMORPGRoom extends Room {
  async onCreate() {
    console.log("🌍 MMORPGRoom created!");
    this.setSeatReservationTime(20);
    this.setState({ players: {}, monsters: {} });

    /* ============================================================
       📜 Load and Spawn Monsters
       ============================================================ */
    this.monsterTemplates = await loadMonstersFromSheet();
    console.log(`📜 Loaded ${this.monsterTemplates.length} monsters`);
    this.spawnMonsters();

    // 🧭 Lightweight monster movement update every 2s
    this.clock.setInterval(() => this.updateMonsterMovement(), 2000);

    /* ============================================================
       🕐 Keep-alive Ping Handler
       ============================================================ */
    this.onMessage("ping", (client) => {
      client.send("pong", { ok: true, t: Date.now() });
    });

    /* ============================================================
       🚶 Player Movement (Authoritative, Map-Safe)
       ============================================================ */
    this.onMessage("move", (client, msg) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;

      p.x = msg.x;
      p.y = msg.y;
      p.dir = msg.dir;

      const payload = {
        id: client.sessionId,
        x: p.x,
        y: p.y,
        dir: p.dir,
        mapId: p.mapId,
        playerName: p.playerName,
      };

      this.safeBroadcastToMap(p.mapId, "player_move", payload);
    });

    /* ============================================================
   ⚔️ Player Attack (vs Monsters)
   ============================================================ */
this.onMessage("attack_monster", async (client, msg) => {
  const player = this.state.players?.[client.sessionId];
  const monster = this.state.monsters?.[msg.monsterId];

  // 🚫 Safety checks
  if (!player) {
    console.warn(`⚠️ attack_monster: Player not found (${client.sessionId})`);
    return;
  }
  if (!monster) {
    console.warn(`⚠️ attack_monster: Monster not found (${msg.monsterId})`);
    return;
  }
  if (monster.hp <= 0) {
    console.warn(`⚠️ attack_monster: Monster ${monster.id} already dead`);
    return;
  }

  // 🎯 Calculate damage
  const baseDamage = Math.max(1, (player.attack || 1) - (monster.defense || 0));
  const crit = Math.random() < 0.1;
  const totalDamage = Math.floor(baseDamage * (crit ? 1.5 : 1));

  // 💥 Apply damage
  monster.hp = Math.max(0, monster.hp - totalDamage);

  // 📡 Broadcast hit update to everyone in same map
  this.safeBroadcastToMap(player.mapId, "monster_hit", {
    monsterId: monster.id,
    hp: monster.hp,
    damage: totalDamage,
    crit,
    attacker: player.playerName,
  });

  // 💀 Monster killed
  if (monster.hp <= 0) {
    console.log(`💀 Monster ${monster.id} (${monster.name}) died on map ${monster.mapId}`);

    // 📡 Notify clients of death
    this.safeBroadcastToMap(player.mapId, "monster_dead", {
      monsterId: monster.id,
      coins: monster.coins,
      exp: monster.exp,
    });

    // 🧠 Reward player
    player.exp = (player.exp || 0) + (monster.exp || 0);
    player.coins = (player.coins || 0) + (monster.coins || 0);

    // 🕒 Schedule respawn after 5 seconds
    this.clock.setTimeout(() => {
      try {
        const safeMonster = { ...monster }; // shallow copy to preserve data
        const safeMap = Number(monster.mapId) || Number(msg.mapId) || player.mapId || 1;

        console.log(`🧩 Respawn scheduled for ${monster.id} (map ${safeMap})`);
        this.respawnMonster({ ...safeMonster, mapId: safeMap });
      } catch (err) {
        console.error(`❌ Respawn failed for ${monster.id}:`, err);
      }
    }, 5000);
  }
});


    /* ============================================================
       ⚔️ Player Attack (vs Players)
       ============================================================ */
    this.onMessage("attack", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const payload = {
        sessionId: client.sessionId,
        mapId: player.mapId,
        ...message,
      };

      this.safeBroadcastToMap(player.mapId, "attack", payload);
    });

    /* ============================================================
       💬 Chat System (Map-based)
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
      this.safeBroadcastToMap(player.mapId, "chat", chatPayload);
    });

    /* ============================================================
       🗺️ Map Change (No Ghost Duplicates)
       ============================================================ */
    this.onMessage("change_map", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const oldMap = player.mapId;
      const newMap = Number(message.newMapId) || oldMap;
      if (newMap === oldMap) return;

      console.log(`🌍 ${player.playerName} moved from Map ${oldMap} → ${newMap}`);
      player.mapId = newMap;

      // Remove from old map
      this.safeBroadcastToMap(oldMap, "player_left", { id: client.sessionId });

      // Add to new map
      this.safeBroadcastToMap(newMap, "player_joined", {
        id: client.sessionId,
        player,
      });

      // Send fresh snapshot
      const sameMapPlayers = {};
      for (const [id, p] of Object.entries(this.state.players)) {
        if (p.mapId === newMap) sameMapPlayers[id] = p;
      }
      client.send("players_snapshot", sameMapPlayers);
    });

    /* ============================================================
       📨 Manual Player Snapshot Request
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
  }

  /* ============================================================
     🧍 Player Join
     ============================================================ */
  onJoin(client, options) {
    console.log("✨ Player joined:", client.sessionId, options);

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
      exp: 0,
      coins: 0,
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

    // Send snapshot of players in same map
    const sameMapPlayers = {};
    for (const [id, other] of Object.entries(this.state.players)) {
      if (other.mapId === mapId) sameMapPlayers[id] = other;
    }
    client.send("players_snapshot", sameMapPlayers);

    // Notify others
    this.safeBroadcastToMap(mapId, "player_joined", {
      id: client.sessionId,
      player: this.state.players[client.sessionId],
    });
  }

  /* ============================================================
     👋 Player Leave
     ============================================================ */
  onLeave(client) {
    const player = this.state.players[client.sessionId];
    if (!player) return;

    console.log(`👋 Player left: ${player.playerName} (${client.sessionId})`);
    this.safeBroadcastToMap(player.mapId, "player_left", { id: client.sessionId });
    delete this.state.players[client.sessionId];
  }

  /* ============================================================
     🧟 Monster Logic
     ============================================================ */
  spawnMonsters() {
    this.monsterTemplates.forEach((t) => (this.state.monsters[t.id] = { ...t }));
    console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);
  }

  updateMonsterMovement() {
    try {
      const lightMonsters = [];
      for (const m of Object.values(this.state.monsters)) {
        if (m.hp <= 0) continue;
        if (Math.random() < 0.5) {
          m.dir = Math.random() < 0.5 ? "left" : "right";
          m.state = "walk";
          m.x += m.dir === "left" ? -30 : 30;
        } else m.state = "idle";
        lightMonsters.push({
          id: m.id,
          x: m.x,
          y: m.y,
          dir: m.dir,
          state: m.state,
          hp: m.hp,
          mapId: m.mapId,
        });
      }
      this.safeBroadcast("monsters_update", lightMonsters);
    } catch (err) {
      console.error("⚠️ updateMonsterMovement failed:", err);
    }
  }

  respawnMonster(monster) {
  try {
    if (!monster || !monster.id) {
      console.warn("⚠️ respawnMonster called with invalid monster:", monster);
      return;
    }

    const id = String(monster.id);

    // ✅ Lookup template from original spawn data
    const template =
      this.monsterTemplates.find((m) => String(m.id) === id) || monster;

    if (!template) {
      console.warn(`⚠️ No template found for monster ${id}`);
      return;
    }

    // ✅ Ensure mapId is always valid
    const mapId = Number(template.mapId || template.MapID || monster.mapId || 1);
    if (!mapId || isNaN(mapId)) {
      console.warn(`⚠️ Missing valid mapId for monster ${id}`, { template, monster });
      return;
    }

    // ✅ Safe coordinate randomization near original spawn
    const baseX = Number(template.x || monster.x || 400);
    const baseY = Number(template.y || monster.y || 300);

    const newMonster = {
      ...template,
      id,
      mapId,
      name: template.name || template.Name || monster.name || monster.Name || `Monster ${id}`,
      hp: Number(template.maxHP || template.BaseHP || monster.maxHP || 100),
      maxHP: Number(template.maxHP || template.BaseHP || monster.maxHP || 100),
      state: "idle",
      x: baseX + (Math.random() * 40 - 20),
      y: baseY + (Math.random() * 20 - 10),
      sprites: {
        idleLeft: template.ImageURL_IdleLeft || template.sprites?.idleLeft,
        idleRight: template.ImageURL_IdleRight || template.sprites?.idleRight,
        walkLeft: template.ImageURL_Walk_Left || template.sprites?.walkLeft,
        walkRight: template.ImageURL_Walk_Right || template.sprites?.walkRight,
        attackLeft: template.ImageURL_Attack_Left || template.sprites?.attackLeft,
        attackRight: template.ImageURL_Attack_Right || template.sprites?.attackRight,
        dieLeft: template.ImageURL_Die_Left || template.sprites?.dieLeft,
        dieRight: template.ImageURL_Die_Right || template.sprites?.dieRight,
      },
    };

    // ✅ Save to server state
    this.state.monsters[id] = newMonster;

    // ✅ Clean payload (client expects lowercase keys)
    const payload = {
      id,
      name: newMonster.name,
      mapId,
      x: newMonster.x,
      y: newMonster.y,
      hp: newMonster.hp,
      maxHP: newMonster.maxHP,
      sprites: newMonster.sprites,
      baseData: newMonster,
    };

    // ✅ Broadcast only to players in same map
    this.safeBroadcastToMap(mapId, "monster_respawn", payload);

    console.log(
      `🔄 [Respawned] ${id} (${newMonster.name}) on map ${mapId} at (${newMonster.x.toFixed(
        1
      )}, ${newMonster.y.toFixed(1)})`
    );
  } catch (err) {
    console.error("❌ respawnMonster failed:", err);
  }
}







  /* ============================================================
   📡 Safe Broadcast Utilities (Stable + Safe)
   ============================================================ */
  safeBroadcastToMap(mapId, event, data) {
    if (!mapId || !event) return;
    if (data === undefined || data === null) return;

    const jsonData = typeof data === "object" ? { ...data } : data;

    for (const client of this.clients) {
      try {
        const player = this.state.players?.[client.sessionId];
        if (!player || player.mapId !== mapId) continue;

        // Check connection ready state
        if (
          !client.connection ||
          client.connection.readyState !== 1 // WebSocket.OPEN
        ) {
          console.warn(`⚠️ Skipping ${event}: client ${client.sessionId} not open`);
          continue;
        }

        client.send(event, jsonData);
      } catch (err) {
        console.warn(`⚠️ Failed to send ${event} to client ${client.sessionId}:`, err);
      }
    }
  }

  safeBroadcast(event, data) {
    if (!event) return;
    if (data === undefined || data === null) return;

    const jsonData = typeof data === "object" ? { ...data } : data;

    for (const client of this.clients) {
      try {
        if (
          !client.connection ||
          client.connection.readyState !== 1
        ) {
          console.warn(`⚠️ Skipping ${event}: client ${client.sessionId} not open`);
          continue;
        }

        client.send(event, jsonData);
      } catch (err) {
        console.warn(`⚠️ safeBroadcast failed for ${event} to ${client.sessionId}:`, err);
      }
    }
  }

  /* ============================================================
     🧹 Room Disposal
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
