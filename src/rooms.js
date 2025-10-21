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

      const coins = Math.floor((attack + level) / 2) || 10;
      const exp = Math.floor(level * 5 + 10);

      return {
        id: String(m.MonsterID),
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

// 🕒 Prevent auto-dispose — keep room alive as long as 1+ players exist
this.autoDispose = false;

// 🩵 Keep-alive ping to ensure Render doesn’t suspend the instance
this.clock.setInterval(() => {
  console.log("💓 [KeepAlive] Room active with", Object.keys(this.state.players).length, "players");
}, 30000);


    // 📜 Load and spawn monsters
    try {
      this.monsterTemplates = await loadMonstersFromSheet();
      console.log(`📜 Loaded ${this.monsterTemplates.length} monsters from Sheets`);
    } catch (err) {
      console.error("❌ Failed to load monsters from sheet:", err);
      this.monsterTemplates = [];
    }

    this.spawnMonsters();

    // ⏱️ Monster AI & Persistence Loops
    this.clock.setInterval(() => this.updateMonsterMovement(), 1000);
    this.clock.setTimeout(() => {
      this.clock.setInterval(() => this.persistMonsterPositions(), 10000);
    }, 5000);

    // 🕐 Keep-alive Ping
    this.onMessage("ping", (client) => client.send("pong", { ok: true, t: Date.now() }));

    // 🚶 Player Movement
    this.onMessage("move", (client, msg) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.dir = msg.dir;
      this.safeBroadcastToMap(p.mapId, "player_move", {
        id: client.sessionId,
        x: p.x,
        y: p.y,
        dir: p.dir,
        mapId: p.mapId,
        playerName: p.playerName,
      });
    });

    // ⚔️ Attack Monster
    this.onMessage("attack_monster", async (client, msg) => {
  try {
    if (!client || !client.sessionId) return;
    if (!msg || !msg.monsterId) return;

    const player = this.state.players?.[client.sessionId];
    const monster = this.state.monsters?.[String(msg.monsterId)];
    if (!player || !monster || monster.hp <= 0) return;

        const baseAtk = Number(player.attack || msg.baseATK || 10);
        const def = Number(monster.defense || 0);
        const skillPower = Number(msg.skillPower || 0);
        const crit = !!msg.crit;
        const defenseFactor = 100 / (100 + def);
        const rawDamage = baseAtk + skillPower * 0.6;
        const totalDamage = Math.max(1, Math.floor(rawDamage * defenseFactor * (crit ? 1.5 : 1)));

        monster.hp = Math.max(0, monster.hp - totalDamage);

        this.safeBroadcastToMap(player.mapId, "monster_damaged", {
          monsterId: String(monster.id),
          newHP: monster.hp,
          maxHP: monster.maxHP,
          damage: totalDamage,
          crit,
          attacker: player.playerName,
          mapId: player.mapId,
        });

        if (monster.hp <= 0) {
          console.log(`💀 Monster ${monster.id} killed by ${player.playerName}`);
          this.safeBroadcastToMap(player.mapId, "monster_dead", {
            monsterId: monster.id,
            exp: monster.exp,
            coins: monster.coins,
          });

          player.exp = (player.exp || 0) + monster.exp;
          player.coins = (player.coins || 0) + monster.coins;

          (async () => {
            try {
              const url = `${REWARD_ENDPOINT}&email=${encodeURIComponent(
                player.email
              )}&monsterId=${encodeURIComponent(monster.id)}`;
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

          this.clock.setTimeout(() => this.respawnMonster(monster), 5000);
        }
      } catch (err) {
        console.error("❌ attack_monster failed:", err);
      }
    });

    // ⚔️ Player vs Player Attack
    this.onMessage("attack", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;
      this.safeBroadcastToMap(player.mapId, "attack", {
        sessionId: client.sessionId,
        mapId: player.mapId,
        ...message,
      });
    });

    // 💬 Chat System
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

    // 🗺️ Map Change
    this.onMessage("change_map", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;
      const oldMap = player.mapId;
      const newMap = Number(message.newMapId) || oldMap;
      if (newMap === oldMap) return;
      console.log(`🌍 ${player.playerName} moved from Map ${oldMap} → ${newMap}`);
      player.mapId = newMap;
      this.safeBroadcastToMap(oldMap, "player_left", { id: client.sessionId });
      this.safeBroadcastToMap(newMap, "player_joined", {
        id: client.sessionId,
        player,
      });
      const sameMapPlayers = {};
      for (const [id, p] of Object.entries(this.state.players)) {
        if (p.mapId === newMap) sameMapPlayers[id] = p;
      }
      client.send("players_snapshot", sameMapPlayers);
    });

    // 📨 Manual Player Snapshot Request
    this.onMessage("request_players", (client) => {
      const requester = this.state.players[client.sessionId];
      if (!requester) return;
      const sameMapPlayers = {};
      for (const [id, p] of Object.entries(this.state.players)) {
        if (p.mapId === requester.mapId) sameMapPlayers[id] = p;
      }
      client.send("players_snapshot", sameMapPlayers);
    });

    console.log("✅ MMORPGRoom fully initialized and ready!");
  }

  // ============================================================
  // 🚶 Persist Monster Positions
  // ============================================================
  async persistMonsterPositions() {
    try {
      const monsters = Object.values(this.state.monsters).map((m) => ({
        id: String(m.id),
        mapId: m.mapId,
        x: Math.round(m.x),
        y: Math.round(m.y),
        hp: Math.floor(m.hp),
      }));
      if (monsters.length === 0) return;
      const response = await fetch(`${SHEET_ENDPOINT}&action=savePositions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monsters }),
      });
      const result = await response.json().catch(() => ({}));
      console.log(`💾 Saved ${monsters.length} monster positions.`, result);
    } catch (err) {
      console.warn("⚠️ persistMonsterPositions failed:", err);
    }
  }

  // ============================================================
// 🧍 Player Join / Leave
// ============================================================
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
    exp: 0,
    coins: 0,
    sprites: {
      walkLeft: charData.ImageURL_Walk_Left,
      walkRight: charData.ImageURL_Walk_Right,
      attackLeft: charData.ImageURL_Attack_Left,
      attackRight: charData.ImageURL_Attack_Right,
    },
  };

  console.log(
    `✅ ${safeName} (${safeEmail}) joined Map ${mapId} as ${charData.Class}`
  );

  // ✅ Send players currently in the same map
  const sameMapPlayers = {};
  for (const [id, other] of Object.entries(this.state.players)) {
    if (other.mapId === mapId) sameMapPlayers[id] = other;
  }
  client.send("players_snapshot", sameMapPlayers);

  // ✅ NEW: Send monsters currently in the same map
  const sameMapMonsters = {};
  for (const [id, m] of Object.entries(this.state.monsters)) {
    if (Number(m.mapId) === Number(mapId)) {
      sameMapMonsters[id] = {
        monsterId: String(m.id),
        x: Math.round(m.x),
        y: Math.round(m.y),
        hp: Math.floor(m.hp),
        maxHP: Math.floor(m.maxHP || m.hp),
        dir: m.dir,
        state: m.state,
        mapId: m.mapId,
        sprites: m.sprites,
      };
    }
  }
  client.send("monsters_snapshot", sameMapMonsters);

  // Broadcast join to others
  this.safeBroadcastToMap(mapId, "player_joined", {
    id: client.sessionId,
    player: this.state.players[client.sessionId],
  });
}

onLeave(client) {
  const player = this.state.players[client.sessionId];
  if (!player) return;

  console.log(`👋 Player left: ${player.playerName} (${client.sessionId})`);
  this.safeBroadcastToMap(player.mapId, "player_left", { id: client.sessionId });
  delete this.state.players[client.sessionId];

  // 🚫 Keep room alive for monster persistence
  console.log("🕓 Room remains active for monster persistence.");
}



// ============================================================
// 🧟 Monster Logic
// ============================================================
async spawnMonsters() {
  this.state.monsters = {};

  // 🧩 Try loading saved monster positions (if your sheet supports it)
  let savedPositions = {};
  try {
    const res = await fetch(`${SHEET_ENDPOINT}&action=getSavedPositions`);
    const data = await res.json();
    if (Array.isArray(data)) {
      for (const m of data) savedPositions[m.id] = m;
      console.log(`📥 Loaded ${data.length} saved monster positions`);
    }
  } catch (err) {
    console.warn("⚠️ No saved positions found, using defaults.");
  }

  for (const t of this.monsterTemplates) {
    const id = String(t.id);
    const saved = savedPositions[id] || {};
    this.state.monsters[id] = {
      ...t,
      id,
      x: saved.x ?? t.x,
      y: saved.y ?? t.y,
      hp: saved.hp ?? t.hp,
    };
  }

  const total = Object.keys(this.state.monsters).length;
  console.log(`🧟 Spawned ${total} monsters`);

  // Group minimal info by map and broadcast
  const monstersByMap = {};
  for (const m of Object.values(this.state.monsters)) {
    const payload = {
      monsterId: String(m.id),
      x: Math.round(m.x || 0),
      y: Math.round(m.y || 0),
      hp: Math.floor(m.hp || m.maxHP || 0),
      maxHP: Math.floor(m.maxHP || 0),
      dir: m.dir || "left",
      state: m.state || "idle",
      mapId: m.mapId,
    };
    if (!monstersByMap[m.mapId]) monstersByMap[m.mapId] = [];
    monstersByMap[m.mapId].push(payload);
  }

  for (const [mapId, list] of Object.entries(monstersByMap)) {
    this.safeBroadcastToMap(Number(mapId), "monsters_update", list);
  }

  // Save initial positions without blocking other logic
  this.persistMonsterPositions();
}


updateMonsterMovement() {
  try {
    const monstersByMap = {};

    for (const m of Object.values(this.state.monsters)) {
      if (!m || m.hp <= 0) continue;

      // Random movement
      if (Math.random() < 0.5) {
        m.dir = Math.random() < 0.5 ? "left" : "right";
        m.state = "walk";
        m.x += m.dir === "left" ? -30 : 30;
        m.x = Math.max(0, Math.min(2000, m.x));
      } else {
        m.state = "idle";
      }

      const payload = {
        monsterId: String(m.id),
        x: Math.round(m.x || 0),
        y: Math.round(m.y || 0),
        dir: m.dir,
        state: m.state,
        hp: Math.max(0, Math.floor(m.hp || 0)),
        mapId: m.mapId,
      };

      if (!monstersByMap[m.mapId]) monstersByMap[m.mapId] = [];
      monstersByMap[m.mapId].push(payload);
    }

    for (const [mapId, list] of Object.entries(monstersByMap)) {
      this.safeBroadcastToMap(Number(mapId), "monsters_update", list);
    }

    // Periodically save to Sheet
    if (Math.random() < 0.2) this.persistMonsterPositions();
  } catch (err) {
    console.error("⚠️ updateMonsterMovement failed:", err);
  }
}


respawnMonster(monster) {
  try {
    if (!monster) return;

    // 🚧 Delay respawn if no players are around
    if (
      !this.clients ||
      this.clients.length === 0 ||
      Object.keys(this.state.players).length === 0
    ) {
      console.warn(`⚠️ Delaying respawn for ${monster.id} — no active clients.`);
      this.clock.setTimeout(() => this.respawnMonster(monster), 5000);
      return;
    }

    monster.hp = monster.maxHP;
    monster.x += Math.random() * 100 - 50;
    monster.y += Math.random() * 60 - 30;
    monster.state = "idle";
    monster.dir = Math.random() < 0.5 ? "left" : "right";

    const respawnData = {
      monsterId: String(monster.id),
      x: Math.round(monster.x),
      y: Math.round(monster.y),
      hp: Math.floor(monster.hp),
      maxHP: Math.floor(monster.maxHP || monster.hp),
      dir: monster.dir,
      mapId: monster.mapId,
      state: monster.state,
    };

    // 📡 Broadcast safely
    this.safeBroadcastToMap(monster.mapId, "monster_respawn", respawnData);

    // Save new position
    this.persistMonsterPositions();
    console.log(`🔄 Monster ${monster.id} respawned on map ${monster.mapId}`);
  } catch (err) {
    console.warn("⚠️ respawnMonster failed:", err);
  }
}




// ============================================================
// 📡 Safe Broadcast Utilities (Crash-proof version)
// ============================================================
safeBroadcastToMap(mapId, event, data) {
  if (!this.clients || this.clients.length === 0) return; // nothing to send to

  for (const c of this.clients) {
    try {
      const p = this.state.players[c.sessionId];
      if (!p || Number(p.mapId) !== Number(mapId)) continue;

      const ws = c.connection;
      if (!ws || ws.readyState !== 1) continue; // 1 = OPEN

      c.send(event, data);
    } catch (err) {
      // 🧩 Silent skip to avoid "code 1005" abnormal closure
      console.warn(`⚠️ Broadcast to ${c.sessionId} failed (${event}):`, err.message);
      continue;
    }
  }
}






  onDispose() {
    console.log("🧹 MMORPGRoom disposed — saving final monster positions...");
    this.persistMonsterPositions();
  }
}

module.exports = { MMORPGRoom };
