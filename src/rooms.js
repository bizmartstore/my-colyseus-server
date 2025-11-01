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
   ⚔️ Player Attack (vs Monsters) — Respawn handled externally
   ============================================================ */
this.onMessage("attack_monster", async (client, msg) => {
  const player = this.state.players?.[client.sessionId];
  const monster = this.state.monsters?.[msg.monsterId];
  if (!player || !monster || monster.hp <= 0) return;

  try {
    // 🧮 Damage calculation
    const baseDamage = Math.max(1, (player.attack || 1) - (monster.defense || 0));
    const crit = Math.random() < 0.1;
    const totalDamage = Math.floor(baseDamage * (crit ? 1.5 : 1));

    // 💥 Apply damage
    monster.hp = Math.max(0, monster.hp - totalDamage);

    // 📡 Broadcast damage
    this.safeBroadcastToMap(player.mapId, "monster_hit", {
      monsterId: monster.id,
      hp: monster.hp,
      damage: totalDamage,
      crit,
      attacker: player.playerName,
    });

    // 💀 Monster death
    if (monster.hp <= 0) {
      // Reward player
      player.exp = (player.exp || 0) + (monster.exp || 0);
      player.coins = (player.coins || 0) + (monster.coins || 0);

      // Inform map clients
      this.safeBroadcastToMap(player.mapId, "monster_dead", {
        monsterId: monster.id,
        killedBy: player.playerName,
        exp: monster.exp,
        coins: monster.coins,
      });

      // Mark monster dead — do not respawn server-side
      monster.state = "dead";
      console.log(
        `💀 Monster ${monster.name} (${monster.id}) killed by ${player.playerName}. Respawn handled by handleMonsterSheet() client-side.`
      );
    }
  } catch (err) {
    console.error("⚠️ attack_monster failed:", err);
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
   🗺️ Map Change (No Ghost Duplicates) — robust snapshot & notify
   ============================================================ */
this.onMessage("change_map", (client, message) => {
  const player = this.state.players[client.sessionId];
  if (!player) return;

  const oldMap = Number(player.mapId) || 0;
  const newMap = Number(message.newMapId) || oldMap;
  if (newMap === oldMap) return;

  console.log(`🌍 ${player.playerName} moved from Map ${oldMap} → ${newMap}`);

  // Update server-side state first
  player.mapId = newMap;

  // Notify old map players this player left
  try {
    this.safeBroadcastToMap(oldMap, "player_left", { id: client.sessionId });
  } catch (e) {
    console.warn("⚠️ safeBroadcastToMap(player_left) failed:", e);
  }

  // Notify new map players about the join (basic info)
  try {
    this.safeBroadcastToMap(newMap, "player_joined", {
      id: client.sessionId,
      player,
    });
  } catch (e) {
    console.warn("⚠️ safeBroadcastToMap(player_joined) failed:", e);
  }

  // Build and send a fresh snapshot for the new map back to the caller
  try {
    const sameMapPlayers = {};
    for (const [id, p] of Object.entries(this.state.players)) {
      if (Number(p.mapId) === newMap) sameMapPlayers[id] = p;
    }
    client.send("players_snapshot", sameMapPlayers);
    // Also proactively broadcast the updated snapshot to everyone in newMap.
    // This guarantees clients already in the map will see the newcomer immediately.
    this.safeBroadcastToMap(newMap, "players_snapshot", sameMapPlayers);
  } catch (e) {
    console.warn("⚠️ Sending players_snapshot in change_map failed:", e);
  }
});


   /* ============================================================
   📨 Manual Player Snapshot Request (supports explicit mapId)
   ============================================================ */
this.onMessage("request_players", (client, msg) => {
  const requester = this.state.players[client.sessionId];
  if (!requester) return;

  // Accept explicit mapId param or fall back to requester's map
  const targetMap = Number((msg && msg.mapId) || requester.mapId || 0);

  const sameMapPlayers = {};
  for (const [id, p] of Object.entries(this.state.players)) {
    if (Number(p.mapId) === targetMap) sameMapPlayers[id] = p;
  }

  try {
    client.send("players_snapshot", sameMapPlayers);
  } catch (e) {
    console.warn("⚠️ request_players -> client.send failed:", e);
  }
});


  /* ============================================================
   🧍 Player Join (robust snapshot + broadcast)
   ============================================================ */
onJoin(client, options) {
  console.log("✨ Player joined:", client.sessionId, options);

  const safeEmail = options.email || `guest_${Math.random().toString(36).substring(2, 8)}@game.local`;
  const safeName = options.playerName || "Guest";
  const safeCharacterID = options.CharacterID || "C001";
  const charData = characterDatabase[safeCharacterID] || characterDatabase["C001"];
  // Use Number(options.mapId) so types are consistent
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

  // Send snapshot of players already in same map to the joining client
  try {
    const sameMapPlayers = {};
    for (const [id, other] of Object.entries(this.state.players)) {
      if (Number(other.mapId) === mapId) sameMapPlayers[id] = other;
    }
    client.send("players_snapshot", sameMapPlayers);
  } catch (e) {
    console.warn("⚠️ onJoin -> sending players_snapshot failed:", e);
  }

  // Notify others in the map that this client joined
  try {
    this.safeBroadcastToMap(mapId, "player_joined", {
      id: client.sessionId,
      player: this.state.players[client.sessionId],
    });
    // Also broadcast the updated snapshot to everyone in the map (ensures consistency)
    const snapshotForAll = {};
    for (const [id, other] of Object.entries(this.state.players)) {
      if (Number(other.mapId) === mapId) snapshotForAll[id] = other;
    }
    this.safeBroadcastToMap(mapId, "players_snapshot", snapshotForAll);
  } catch (e) {
    console.warn("⚠️ onJoin -> broadcast player_joined/players_snapshot failed:", e);
  }
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
   🧟 Monster Logic (Client-Handled Respawn Compatible)
   ============================================================ */
spawnMonsters() {
  // Initialize monsters from templates
  this.state.monsters = {};
  this.monsterTemplates.forEach((t) => {
    const monster = {
      ...t,
      hp: Number(t.maxHP) || 100,
      maxHP: Number(t.maxHP) || 100,
      state: "idle",
      dir: "left",
    };
    this.state.monsters[t.id] = monster;
  });
  console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);
}

updateMonsterMovement() {
  try {
    const lightMonsters = [];
    for (const m of Object.values(this.state.monsters)) {
      if (!m || m.hp <= 0) continue; // Skip dead monsters

      // Random wandering
      if (Math.random() < 0.5) {
        m.dir = Math.random() < 0.5 ? "left" : "right";
        m.state = "walk";
        m.x += m.dir === "left" ? -30 : 30;
      } else {
        m.state = "idle";
      }

      // Prepare lightweight update packet
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

    // Broadcast movement updates to all maps
    if (lightMonsters.length > 0) {
      this.safeBroadcast("monsters_update", lightMonsters);
    }
  } catch (err) {
    console.error("⚠️ updateMonsterMovement failed:", err);
  }
}

/* ============================================================
   ♻️ Legacy Respawn (Disabled — Client Handles Respawn)
   ============================================================ */
respawnMonster(monster) {
  // ❌ This function is kept only as fallback (no auto-calls)
  if (!monster) return;

  // Restore monster stats (if called manually)
  monster.hp = monster.maxHP;
  monster.x += Math.random() * 100 - 50;
  monster.y += Math.random() * 60 - 30;
  monster.state = "idle";

  // Inform nearby players manually if ever used
  this.safeBroadcastToMap(monster.mapId, "monster_respawn", {
    id: monster.id,
    x: monster.x,
    y: monster.y,
    hp: monster.hp,
    maxHP: monster.maxHP,
    mapId: monster.mapId,
  });

  console.log(`♻️ Manual respawn triggered for ${monster.name} (${monster.id})`);
}

/* ============================================================
   📡 Safe Broadcast Utilities
   ============================================================ */
safeBroadcastToMap(mapId, event, data) {
  let count = 0;
  for (const c of this.clients) {
    const p = this.state.players[c.sessionId];
    if (p?.mapId === mapId) {
      try {
        c.send(event, data);
        count++;
      } catch (err) {
        console.warn(`⚠️ Failed to send ${event} to ${c.sessionId}:`, err);
      }
    }
  }
  if (count > 0) console.log(`📡 Sent "${event}" to ${count} players on Map ${mapId}`);
}

safeBroadcast(event, data) {
  let count = 0;
  for (const c of this.clients) {
    try {
      c.send(event, data);
      count++;
    } catch (err) {
      console.warn(`⚠️ safeBroadcast failed for ${event}:`, err);
    }
  }
  if (count > 0) console.log(`📡 Broadcasted "${event}" to ${count} total players`);
}


  /* ============================================================
     🧹 Room Disposal
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
