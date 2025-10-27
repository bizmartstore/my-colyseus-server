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

    // 🧩 Initialize monster respawn template store (FIX ADDED)
    this._monsterSpawnTemplates = {};

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
   ⚔️ Player Attack (vs Monsters) — FINAL FIXED + SAFE RESPAWN
   ============================================================ */
this.onMessage("attack_monster", async (client, msg) => {
  const player = this.state.players?.[client.sessionId];
  const monster = this.state.monsters?.[msg.monsterId];

  if (!player || !monster) return;
  if (monster.hp <= 0 || monster.state === "dead") return;

  // ✅ Calculate damage
  const baseDamage = Math.max(1, (player.attack || 1) - (monster.defense || 0));
  const crit = Math.random() < ((player.critChance ?? 10) / 100);
  const totalDamage = Math.floor(baseDamage * (crit ? 1.5 : 1));

  // ✅ Apply damage
  monster.hp = Math.max(0, monster.hp - totalDamage);

  // ✅ Broadcast hit to all players on the same map
  this.safeBroadcastToMap(player.mapId, "monster_hit", {
    monsterId: monster.id,
    hp: monster.hp,
    damage: totalDamage,
    crit,
    attacker: player.playerName,
  });

  // ✅ Monster death check
  if (monster.hp <= 0) {
    monster.state = "dead";
    console.log(`💀 ${monster.name} (${monster.id}) killed by ${player.playerName}`);

    // ✅ Reward player
    player.exp = (player.exp || 0) + (monster.exp || 0);
    player.coins = (player.coins || 0) + (monster.coins || 0);

    // ✅ Notify all clients on same map of death
    this.safeBroadcastToMap(player.mapId, "monster_dead", {
      monsterId: monster.id,
      coins: monster.coins,
      exp: monster.exp,
    });

    // ✅ Ensure respawn template store exists
    this._monsterSpawnTemplates ||= {};

    // ✅ Find and clone original spawn template
    const origTpl =
      this.monsterTemplates.find((t) => String(t.id) === String(monster.id)) ||
      this._monsterSpawnTemplates?.[monster.id] ||
      monster;

    const cleanTpl = JSON.parse(JSON.stringify(origTpl));

    // ✅ Save safe respawn template (retains correct map & spawn pos)
    this._monsterSpawnTemplates[monster.id] = {
      ...cleanTpl,
      spawnX: cleanTpl.spawnX ?? monster.spawnX ?? monster.x,
      spawnY: cleanTpl.spawnY ?? monster.spawnY ?? monster.y,
      maxHP: Number(cleanTpl.maxHP) || Number(monster.maxHP) || 100,
      mapId: Number(cleanTpl.mapId) || Number(monster.mapId) || Number(player.mapId) || 101,
      coins: cleanTpl.coins || monster.coins || 0,
      exp: cleanTpl.exp || monster.exp || 0,
    };

    // 🕒 Schedule respawn after 5 seconds
    const monsterId = monster.id;
    const mapId = Number(monster.mapId) || Number(player.mapId);

    console.log(`🕒 Respawning ${monster.name} (${monster.id}) in 5 seconds on map ${mapId}...`);

    this.clock.setTimeout(() => {
      console.log(`🔄 Attempting respawn for ${monsterId} on map ${mapId}`);
      if (typeof this.respawnMonsterById === "function") {
        this.respawnMonsterById(monsterId);
      } else {
        console.error("❌ respawnMonsterById not defined or invalid!");
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
   🧟 Monster Logic (Fully Fixed + Safe Respawn)
   ============================================================ */
  spawnMonsters() {
  // 🧠 Create a clean spawn template store
  this._monsterSpawnTemplates = {};

  this.monsterTemplates.forEach((t) => {
    const monster = {
      ...t,
      spawnX: Number(t.x) || 400,
      spawnY: Number(t.y) || 300,
      hp: Number(t.hp || t.maxHP || 100),
      maxHP: Number(t.maxHP || t.hp || 100),
      state: "idle",
      dir: "left",
    };

    // 🧩 Put live monster into game state
    this.state.monsters[t.id] = monster;

    // 🧩 Deep clone template to prevent aliasing (VERY IMPORTANT)
    try {
      this._monsterSpawnTemplates[t.id] = JSON.parse(JSON.stringify(monster));
    } catch {
      this._monsterSpawnTemplates[t.id] = { ...monster };
    }
  });

  console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);
}

  updateMonsterMovement() {
    try {
      const lightMonsters = [];

      for (const m of Object.values(this.state.monsters)) {
        if (m.hp <= 0 || m.state === "dead") continue;

        // 50% chance to move or idle
        if (Math.random() < 0.5) {
          m.dir = Math.random() < 0.5 ? "left" : "right";
          m.state = "walk";
          m.x += m.dir === "left" ? -30 : 30;
        } else {
          m.state = "idle";
        }

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

      // ✅ Send minimal update packet
      this.safeBroadcast("monsters_update", lightMonsters);
    } catch (err) {
      console.error("⚠️ updateMonsterMovement failed:", err);
    }
  }

  /* ============================================================
   ♻️ Safe Monster Respawn (Full Stats from Sheet + Auto-map)
   ============================================================ */
respawnMonsterById(monsterId) {
  if (!monsterId) return;
  console.log("🧩 respawnMonsterById called for", monsterId);

  if (!this._monsterSpawnTemplates) this._monsterSpawnTemplates = {};

  let tpl =
    this.monsterTemplates.find((t) => String(t.id) === String(monsterId)) ||
    this._monsterSpawnTemplates?.[monsterId];

  console.log("📜 Respawn template found:", tpl ? "✅ YES" : "❌ NO");
  if (!tpl) return console.warn(`❌ No respawn template for ${monsterId}`);

  tpl = JSON.parse(JSON.stringify(tpl));

  const previous = this.state.monsters?.[monsterId];
  const mapId =
    Number(tpl.mapId) ||
    Number(previous?.mapId) ||
    Number(tpl.MapID) ||
    null;
  if (!mapId) return console.error(`❌ Missing mapId for ${monsterId}`);

  const spawnX =
    Number(tpl.spawnX) ||
    Number(tpl.PositionX) ||
    Number(previous?.spawnX) ||
    Number(previous?.x) ||
    400;
  const spawnY =
    Number(tpl.spawnY) ||
    Number(tpl.PositionY) ||
    Number(previous?.spawnY) ||
    Number(previous?.y) ||
    300;

  const newMonster = {
    id: tpl.id || tpl.MonsterID,
    name: tpl.name || tpl.Name,
    class: tpl.class || tpl.Class,
    level: Number(tpl.level || tpl.Level || 1),
    maxHP: Number(tpl.maxHP || tpl.BaseHP || 100),
    hp: Number(tpl.BaseHP || tpl.maxHP || 100),
    attack: Number(tpl.attack || tpl.Attack || 10),
    defense: Number(tpl.defense || tpl.Defense || 5),
    speed: Number(tpl.speed || tpl.Speed || 5),
    critDamage: Number(tpl.critDamage || tpl.CritDamage || 100),
    critChance: Number(tpl.critChance || tpl.CritChance || 5),
    mapId,
    x: spawnX,
    y: spawnY,
    spawnX,
    spawnY,
    state: "idle",
    dir: tpl.Direction || "left",
    exp: Number(tpl.exp || tpl.Experience || 0),
    coins: Number(tpl.coins || tpl.Coins || 0),
    isAggro: tpl.isAggro === "TRUE" || tpl.isAggro === true,
    skills: [
      {
        name: tpl.Skill1_Name,
        damage: Number(tpl.Skill1_Damage),
        cooldown: Number(tpl.Skill1_Cooldown),
        range: Number(tpl.Skill1_Range),
        animation: tpl.Skill1_AnimationURL,
      },
      {
        name: tpl.Skill2_Name,
        damage: Number(tpl.Skill2_Damage),
        cooldown: Number(tpl.Skill2_Cooldown),
        range: Number(tpl.Skill2_Range),
        animation: tpl.Skill2_AnimationURL,
      },
    ],
    sprites: {
      idleLeft: tpl.ImageURL_IdleLeft,
      idleRight: tpl.ImageURL_IdleRight,
      walkLeft: tpl.ImageURL_Walk_Left,
      walkRight: tpl.ImageURL_Walk_Right,
      attackLeft: tpl.ImageURL_Attack_Left,
      attackRight: tpl.ImageURL_Attack_Right,
      dieLeft: tpl.ImageURL_Die_Left,
      dieRight: tpl.ImageURL_Die_Right,
    },
    loot: [
      { name: tpl.Loot1, chance: Number(tpl.Loot1Chance || 0), image: tpl.Loot1ImageURL },
      { name: tpl.Loot2, chance: Number(tpl.Loot2Chance || 0), image: tpl.Loot2ImageURL },
      { name: tpl.Loot3, chance: Number(tpl.Loot3Chance || 0), image: tpl.Loot3ImageURL },
    ],
  };

  // ✅ Clean old instance before replacing
  delete this.state.monsters[monsterId];
  this.state.monsters[newMonster.id] = newMonster;

  const respawnData = {
    monsterId: newMonster.id,
    baseData: newMonster,
    mapId: newMonster.mapId,
    x: newMonster.x,
    y: newMonster.y,
    hp: newMonster.hp,
    maxHP: newMonster.maxHP,
    name: newMonster.name,
    sprites: newMonster.sprites,
    coins: newMonster.coins,
    exp: newMonster.exp,
  };

  this.safeBroadcastToMap(newMonster.mapId, "monster_respawn", respawnData);
  console.log(`📢 monster_respawn event broadcasted for ${newMonster.id}`);
}









/* ============================================================
   📡 Safe Broadcast Utilities (Fixed + Type-Safe + Debug Logs)
   ============================================================ */
safeBroadcastToMap(mapId, event, data) {
  try {
    if (mapId === undefined || mapId === null) {
      console.warn(`⚠️ safeBroadcastToMap called with invalid mapId:`, mapId);
      return;
    }

    const targetMap = Number(mapId);
    let sentCount = 0;

    for (const c of this.clients) {
      const p = this.state.players[c.sessionId];
      if (!p) continue;

      // ✅ Convert both map IDs to numbers to avoid type mismatch
      if (Number(p.mapId) === targetMap) {
        try {
          c.send(event, data);
          sentCount++;
        } catch (err) {
          console.warn(`⚠️ Failed to send ${event} to ${c.sessionId}:`, err);
        }
      }
    }

    // 🧠 Helpful debug info
    console.log(
      `📡 Broadcasted "${event}" to map ${targetMap} (${sentCount} players)`
    );

  } catch (err) {
    console.error(`❌ safeBroadcastToMap failed for event "${event}":`, err);
  }
}

safeBroadcast(event, data) {
  try {
    let sentCount = 0;
    for (const c of this.clients) {
      try {
        c.send(event, data);
        sentCount++;
      } catch (err) {
        console.warn(`⚠️ safeBroadcast failed for ${event} to ${c.sessionId}:`, err);
      }
    }

    if (sentCount > 0) {
      console.log(`📢 Broadcasted "${event}" globally to ${sentCount} clients`);
    }
  } catch (err) {
    console.error(`❌ safeBroadcast failed for "${event}":`, err);
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
