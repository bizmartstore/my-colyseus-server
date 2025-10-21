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
   🧩 Load Monsters from Google Sheets (Updated Persistent-Safe)
   ============================================================ */
async function loadMonstersFromSheet() {
  try {
    const res = await fetch(SHEET_ENDPOINT);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ No monster data returned from Sheet");
      return [];
    }

    return data.map((m) => {
      // 🔹 Safe numeric parsing
      const level = Number(m.Level) || 1;
      const baseHP = Number(m.BaseHP) || 100;
      const currentHP = Number(m.CurrentHP) || baseHP;
      const attack = Number(m.Attack) || 10;
      const defense = Number(m.Defense) || 5;
      const speed = Number(m.Speed) || 5;
      const critDmg = Number(m.CritDamage) || 100;
      const critChance = Number(m.CritChance) || 10;
      const mapId = Number(m.MapID) || 101;
      const posX = Number(m.PositionX) || 500;
      const posY = Number(m.PositionY) || 260;

      // 🔹 Derived values
      const coins = Math.floor((attack + level) / 2) || 10;
      const exp = Math.floor(level * 5 + 10);

      // ✅ Return normalized monster object
      return {
        id: String(m.MonsterID),        // 🔥 Always string for consistency
        name: m.Name || "Unknown",
        level,
        maxHP: baseHP,
        hp: currentHP,
        attack,
        defense,
        speed,
        critDamage: critDmg,
        critChance,
        mapId,
        x: posX,
        y: posY,
        coins,
        exp,
        sprites: {
          idleLeft: m.ImageURL_IdleLeft || "",
          idleRight: m.ImageURL_IdleRight || "",
        },
        state: "idle",
        dir: "left",
      };
    });
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
       📜 Load and Spawn Monsters (From Google Sheets)
       ============================================================ */
    try {
      this.monsterTemplates = await loadMonstersFromSheet();
      console.log(`📜 Loaded ${this.monsterTemplates.length} monsters from Sheets`);
    } catch (err) {
      console.error("❌ Failed to load monsters from sheet:", err);
      this.monsterTemplates = [];
    }

    // 🧩 Spawn monsters into state
    this.spawnMonsters();

    /* ============================================================
       ⏱️ Monster AI & Movement Loop (Server-Authoritative)
       ============================================================ */
    // Update monster movement every 1 second
    this.clock.setInterval(() => this.updateMonsterMovement(), 1000);

    // 💾 Persist monster positions every 10 seconds (reduces data loss)
    // Start 5s after room creation to allow spawnMonsters() to finish
    this.clock.setTimeout(() => {
      this.clock.setInterval(() => {
        try {
          this.persistMonsterPositions();
        } catch (err) {
          console.warn("⚠️ Failed to persist monster positions:", err);
        }
      }, 10000);
    }, 5000);

    /* ============================================================
       🕐 Keep-alive Ping Handler
       ============================================================ */
    this.onMessage("ping", (client) => {
      client.send("pong", { ok: true, t: Date.now() });
    });

    console.log("✅ MMORPGRoom fully initialized and ready!");
  }

  /* ============================================================
     🚶 PERSISTENT MONSTER POSITION (Save to Google Sheets)
     ============================================================ */
  async persistMonsterPositions() {
    try {
      const monsters = Object.values(this.state.monsters).map((m) => ({
        id: String(m.id),
        mapId: m.mapId,
        x: Math.round(m.x),
        y: Math.round(m.y),
        hp: Math.floor(m.hp),
      }));

      // 🔹 Avoid empty writes
      if (monsters.length === 0) {
        console.warn("⚠️ No monsters found to persist.");
        return;
      }

      // 🔹 POST request to Apps Script endpoint
      const response = await fetch(`${SHEET_ENDPOINT}&action=savePositions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monsters }),
      });

      if (!response.ok) {
        console.warn(`⚠️ persistMonsterPositions: HTTP ${response.status}`);
        return;
      }

      const result = await response.json().catch(() => ({}));
      console.log(`💾 Saved ${monsters.length} monster positions.`, result);
    } catch (err) {
      console.warn("⚠️ persistMonsterPositions failed:", err);
    }
  }

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
   ⚔️ Player Attack (vs Monsters) — Final Synced Version
   ============================================================ */
this.onMessage("attack_monster", async (client, msg) => {
  try {
    const player = this.state.players?.[client.sessionId];
    const monster = this.state.monsters?.[msg.monsterId];
    if (!player || !monster) return;
    if (monster.hp <= 0) return; // skip dead monsters

    // 🧮 Damage calculation
    const baseAtk = Number(player.attack || msg.baseATK || 10);
    const def = Number(monster.defense || 0);
    const skillPower = Number(msg.skillPower || 0);
    const crit = !!msg.crit;
    const defenseFactor = 100 / (100 + def);
    const rawDamage = baseAtk + skillPower * 0.6;
    const totalDamage = Math.max(1, Math.floor(rawDamage * defenseFactor * (crit ? 1.5 : 1)));

    monster.hp = Math.max(0, monster.hp - totalDamage);

    // 🩸 Broadcast damage to everyone on same map (normalized)
this.safeBroadcastToMap(player.mapId, "monster_damaged", {
  monsterId: String(monster.id),
  newHP: monster.hp,        // ✅ unified field name
  maxHP: monster.maxHP,
  damage: totalDamage,
  crit,
  attacker: player.playerName,
  mapId: player.mapId,
});
    // 💀 Death + Reward
    if (monster.hp <= 0) {
      console.log(`💀 Monster ${monster.id} killed by ${player.playerName}`);

      // 🎁 Send monster_dead event
      this.safeBroadcastToMap(player.mapId, "monster_dead", {
        monsterId: monster.id,
        exp: monster.exp,
        coins: monster.coins,
      });

      // Update player stats
      player.exp = (player.exp || 0) + monster.exp;
      player.coins = (player.coins || 0) + monster.coins;

      // 🧠 Try rewarding via Google Apps Script
      (async () => {
        try {
          const url = `${REWARD_ENDPOINT}&email=${encodeURIComponent(player.email)}&monsterId=${encodeURIComponent(monster.id)}`;
          const res = await fetch(url);
          const reward = await res.json();

          this.safeBroadcastToMap(player.mapId, "playerReward", {
            email: player.email,
            gainedExp: reward.gainedExp ?? monster.exp,
            gainedCoins: reward.gainedCoins ?? monster.coins,
            exp: reward.exp ?? player.exp,
            maxExp: reward.maxExp ?? (player.maxExp || 100),
            level: reward.level ?? (player.level || 1),
            mapId: player.mapId,
          });
        } catch (err) {
          console.warn("⚠️ Reward fetch failed:", err);
          this.safeBroadcastToMap(player.mapId, "playerReward", {
            email: player.email,
            gainedExp: monster.exp,
            gainedCoins: monster.coins,
            exp: player.exp,
            maxExp: player.maxExp || 100,
            level: player.level || 1,
            mapId: player.mapId,
          });
        }
      })();

      // 🕐 Respawn in 5s
      this.clock.setTimeout(() => this.respawnMonster(monster), 5000);
    }
  } catch (err) {
    console.error("❌ attack_monster failed:", err);
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
     🧟 Monster Logic (Updated for Persistent + Realtime Sync)
   ============================================================ */
spawnMonsters() {
  // 🧹 Clear any old monsters before spawning
  this.state.monsters = {};

  // 🧩 Spawn all monsters from template with normalized IDs
  for (const t of this.monsterTemplates) {
    const id = String(t.id); // 🔥 always string for lookup consistency
    this.state.monsters[id] = { ...t, id };
  }

  const total = Object.keys(this.state.monsters).length;
  console.log(`🧟 Spawned ${total} monsters across all maps`);

  // 🧠 Group monsters by map for initial broadcast
  const monstersByMap = {};
  for (const m of Object.values(this.state.monsters)) {
    if (!monstersByMap[m.mapId]) monstersByMap[m.mapId] = [];
    monstersByMap[m.mapId].push(m);
  }

  // ✅ Send initial monster list to players on same map
  for (const [mapId, list] of Object.entries(monstersByMap)) {
    this.safeBroadcastToMap(Number(mapId), "monsters_update", list);
  }

  // 💾 Save initial monster positions for persistence
  this.persistMonsterPositions();
}

updateMonsterMovement() {
  try {
    // ✅ Step 1: Group monsters by map
    const monstersByMap = {};

    for (const m of Object.values(this.state.monsters)) {
      if (m.hp <= 0) continue; // skip dead monsters

      // 🎲 Random movement pattern
      if (Math.random() < 0.5) {
        m.dir = Math.random() < 0.5 ? "left" : "right";
        m.state = "walk";
        m.x += m.dir === "left" ? -30 : 30;

        // 🔒 Clamp boundaries (optional: prevent leaving map)
        if (m.x < 0) m.x = 0;
        if (m.x > 2000) m.x = 2000; // adjust map width as needed
      } else {
        m.state = "idle";
      }

      // Group by map for efficient broadcast
      if (!monstersByMap[m.mapId]) monstersByMap[m.mapId] = [];
      monstersByMap[m.mapId].push({
        id: String(m.id),
        x: m.x,
        y: m.y,
        dir: m.dir,
        state: m.state,
        hp: m.hp,
        mapId: m.mapId,
      });
    }

    // ✅ Step 2: Broadcast movement updates to each map
    for (const [mapId, list] of Object.entries(monstersByMap)) {
      this.safeBroadcastToMap(Number(mapId), "monsters_update", list);
    }

    // 💾 Occasionally persist positions to external DB/Sheet
    if (Math.random() < 0.2) { // only 20% of ticks to reduce API calls
      this.persistMonsterPositions();
    }
  } catch (err) {
    console.error("⚠️ updateMonsterMovement failed:", err);
  }
}

respawnMonster(monster) {
  monster.hp = monster.maxHP;
  monster.x += Math.random() * 100 - 50;
  monster.y += Math.random() * 60 - 30;
  monster.state = "idle";
  monster.dir = Math.random() < 0.5 ? "left" : "right";

  // ✅ Broadcast respawn to players on the same map
  this.safeBroadcastToMap(monster.mapId, "monster_respawn", {
    id: String(monster.id),
    x: monster.x,
    y: monster.y,
    hp: monster.hp,
    mapId: monster.mapId,
  });

  // 💾 Persist new monster state
  this.persistMonsterPositions();
}



  /* ============================================================
     📡 Safe Broadcast Utilities
     ============================================================ */
  safeBroadcastToMap(mapId, event, data) {
    for (const c of this.clients) {
      const p = this.state.players[c.sessionId];
      if (p?.mapId === mapId) {
        try {
          c.send(event, data);
        } catch (err) {
          console.warn(`⚠️ Failed to send ${event} to ${c.sessionId}:`, err);
        }
      }
    }
  }

  safeBroadcast(event, data) {
    for (const c of this.clients) {
      try {
        c.send(event, data);
      } catch (err) {
        console.warn(`⚠️ safeBroadcast failed for ${event}:`, err);
      }
    }
  }

    /* ============================================================
     🧹 Room Disposal (Final Save)
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed — saving final monster positions...");
    this.persistMonsterPositions();
  }
}

module.exports = { MMORPGRoom };
