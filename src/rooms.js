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
    const startTime = Date.now();
    console.log("🌍 [DEBUG] MMORPGRoom created!");
    this.setSeatReservationTime(20);

    try {
      // ============================================================
      // 🧠 INITIAL STATE
      // ============================================================
      this.setState({ players: {}, monsters: {} });
      console.log("✅ [DEBUG] Initial room state set (players + monsters)");

      // ============================================================
      // 📜 LOAD MONSTERS FROM SHEET
      // ============================================================
      console.log("📡 [DEBUG] Fetching monsters from Google Sheets...");
      this.monsterTemplates = await loadMonstersFromSheet();

      if (!Array.isArray(this.monsterTemplates)) {
        console.error("❌ loadMonstersFromSheet() returned invalid data:", this.monsterTemplates);
        this.monsterTemplates = [];
      }

      this.spawnMonsters();
      console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);

      // ============================================================
      // 🧠 INTERVAL: Monster Movement Updates
      // ============================================================
      this.clock.setInterval(() => this.updateMonsterMovement(), 2000);
      console.log("⏱️ Monster movement update every 2s");

      // ============================================================
      // 🕐 Keep-alive PING / PONG
      // ============================================================
      this.onMessage("ping", (client) => {
        client.send("pong", { ok: true, t: Date.now() });
      });

      // ============================================================
      // 🚶 PLAYER MOVEMENT SYNC
      // ============================================================
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

     // ============================================================
// ⚔️ PLAYER ATTACK MONSTER — Safe + Non-Blocking
// ============================================================
this.onMessage("attack_monster", (client, msg) => {
  const start = Date.now();
  try {
    const player = this.state.players?.[client.sessionId];
    if (!player) return console.warn(`⚠️ Player not found for ${client.sessionId}`);

    const monsterId = String(msg?.monsterId || "").trim();
    const monster = this.state.monsters?.[monsterId];
    if (!monster) return console.warn(`⚠️ Monster not found: ${monsterId}`);

    // 🧭 Map + Death guard
    if (player.mapId !== monster.mapId) return console.warn(`⚠️ Cross-map attack ignored.`);
    if (monster.hp <= 0) return console.warn(`⚰️ Monster ${monsterId} already dead`);

    // --- 💥 Damage Calculation ---
    const baseDamage = Math.max(1, (player.attack || 1) - (monster.defense || 0));
    const skillPower = Number(msg.skillPower) || 1.0;
    const critChance = player.critChance ? player.critChance / 100 : 0.1;
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? (player.critDamage ? player.critDamage / 100 : 1.5) : 1;
    const totalDamage = Math.floor(baseDamage * skillPower * critMult);

    monster.hp = Math.max(0, monster.hp - totalDamage);
    monster.state = monster.hp > 0 ? "aggro" : "dead";
    monster.target = client.sessionId;
    monster.lastAggroAt = Date.now();

    // --- ⚔️ Broadcast Attack Animation + Hit Update ---
    this.safeBroadcastToMap(player.mapId, "attack_animation", {
      attackerId: client.sessionId,
      monsterId: monster.id,
      playerId: player.email,
      playerName: player.playerName,
      skillName: msg.skillName || "Basic Attack",
      damage: totalDamage,
      crit: isCrit,
    });

    this.safeBroadcastToMap(player.mapId, "monster_hit", {
      monsterId: monster.id,
      hp: monster.hp,
      damage: totalDamage,
      crit: isCrit,
      attacker: player.playerName,
      playerId: player.email,
    });

    // --- 💀 Monster Death Handling ---
    if (monster.hp <= 0) {
      console.log(`💀 ${player.playerName} killed ${monster.name}`);

      this.safeBroadcastToMap(player.mapId, "monster_dead", {
        monsterId: monster.id,
        coins: monster.coins,
        exp: monster.exp,
        killedBy: player.playerName,
        playerId: player.email,
      });

      // ✅ Apply reward locally (immediate)
      player.exp = (player.exp || 0) + monster.exp;
      player.coins = (player.coins || 0) + monster.coins;

      this.safeBroadcastToMap(player.mapId, "playerReward", {
        email: player.email,
        playerName: player.playerName,
        gainedExp: monster.exp,
        gainedCoins: monster.coins,
        mapId: player.mapId,
      });

      // ✅ Reward call (fire-and-forget, non-blocking)
      (async () => {
        try {
          const rewardUrl = `${REWARD_ENDPOINT}&playerEmail=${encodeURIComponent(
            player.email
          )}&monster=${encodeURIComponent(monster.name)}`;
          const res = await Promise.race([
            fetch(rewardUrl).catch(() => null),
            new Promise((resolve) => setTimeout(() => resolve(null), 7000)),
          ]);
          if (res) {
            const text = await res.text();
            console.log(`🎁 rewardPlayerForKill(${player.email}) → ${text}`);
          } else {
            console.warn(`⚠️ rewardPlayerForKill(${player.email}) skipped (timeout/no response)`);
          }
        } catch (err) {
          console.warn(`⚠️ rewardPlayerForKill(${player.email}) failed safely: ${err.message}`);
        }
      })();

      // ✅ Respawn after delay (non-blocking)
      this.clock.setTimeout(() => {
        try {
          this.respawnMonster(monster);
        } catch (err) {
          console.error("⚠️ respawnMonster() failed:", err);
        }
      }, 5000);

      monster.target = null;
    }
  } catch (err) {
    console.error("💥 [attack_monster] crashed:", err);
  } finally {
    console.log(`⏱️ [attack_monster] done in ${Date.now() - start}ms`);
  }
});


// ============================================================
// 💀 MONSTER KILLED — External Sync (Fire-and-Forget)
// ============================================================
this.onMessage("monster_killed", (client, msg) => {
  const { monsterId, killedBy, mapId } = msg || {};
  if (!monsterId || !killedBy) return console.warn("⚠️ monster_killed missing data:", msg);

  console.log(`💀 monster_killed → ${monsterId} by ${killedBy}`);

  // ✅ Fire-and-forget reward handling
  (async () => {
    try {
      const monsterObj = this.state.monsters?.[monsterId];
      const monsterName = monsterObj?.name || monsterId;
      const rewardUrl = `${REWARD_ENDPOINT}&playerEmail=${encodeURIComponent(
        killedBy
      )}&monster=${encodeURIComponent(monsterName)}`;

      const res = await Promise.race([
        fetch(rewardUrl).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 7000)), // 7s max wait
      ]);

      if (res) {
        const text = await res.text();
        console.log(`🎁 rewardPlayerForKill(${killedBy}) → ${text}`);
        this.safeBroadcastToMap(mapId, "playerReward", {
          email: killedBy,
          raw: text,
          mapId,
        });
      } else {
        console.warn(`⚠️ rewardPlayerForKill(${killedBy}) skipped (timeout/no response)`);
      }
    } catch (err) {
      console.error("💥 monster_killed reward fetch failed:", err);
    }
  })();

  // ✅ Respawn still runs immediately (non-blocking)
  const m = this.state.monsters?.[monsterId];
  if (m) {
    this.clock.setTimeout(() => {
      try {
        this.respawnMonster(m);
        console.log(`🔄 Monster ${monsterId} respawned after kill`);
      } catch (e) {
        console.warn(`⚠️ respawnMonster failed for ${monsterId}:`, e);
      }
    }, 5000);
  }
});
      // ============================================================
      // ATTACK SYNC (PVP / VISUAL)
      // ============================================================
      this.onMessage("attack", (client, message) => {
        const player = this.state.players[client.sessionId];
        if (!player) return;
        const payload = {
          sessionId: client.sessionId,
          mapId: player.mapId,
          playerId: player.email,
          playerName: player.playerName,
          skillName: message.skillName || "Basic Attack",
          damage: message.damage || 0,
          crit: message.crit || false,
          monsterId: message.monsterId || null,
          ...message,
        };
        this.safeBroadcastToMap(player.mapId, "attack", payload);
      });

      // ============================================================
      // 💬 CHAT
      // ============================================================
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

      // ============================================================
      // MAP CHANGE
      // ============================================================
      this.onMessage("change_map", (client, message) => {
        const player = this.state.players[client.sessionId];
        if (!player) return;
        const oldMap = player.mapId;
        const newMap = Number(message.newMapId) || oldMap;
        if (newMap === oldMap) return;

        console.log(`🌍 ${player.playerName} moved Map ${oldMap} → ${newMap}`);
        player.mapId = newMap;
        this.safeBroadcastToMap(oldMap, "player_left", { id: client.sessionId });
        this.safeBroadcastToMap(newMap, "player_joined", { id: client.sessionId, player });

        const sameMapPlayers = {};
        for (const [id, p] of Object.entries(this.state.players)) {
          if (p.mapId === newMap) sameMapPlayers[id] = p;
        }
        client.send("players_snapshot", sameMapPlayers);
      });

      // ============================================================
      // PLAYER SNAPSHOT REQUEST
      // ============================================================
      this.onMessage("request_players", (client) => {
        const requester = this.state.players[client.sessionId];
        if (!requester) return;
        const sameMapPlayers = {};
        for (const [id, p] of Object.entries(this.state.players)) {
          if (p.mapId === requester.mapId) sameMapPlayers[id] = p;
        }
        client.send("players_snapshot", sameMapPlayers);
      });

      // ============================================================
      // COMPATIBILITY / SAFETY HOOKS
      // ============================================================
      this.onMessage("pong", () => {});
      this.onMessage("monsterUpdate", (client, data) => {
        const m = this.state.monsters?.[data.monsterId];
        if (m) m.hp = data.hp ?? m.hp;
      });
      this.onMessage("playerReward", () => {});

      console.log(`✅ MMORPGRoom fully initialized in ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error("💥 MMORPGRoom initialization failed:", err);
    }
  }

  /* ============================================================
     🧍 PLAYER JOIN
  ============================================================ */
  async onJoin(client, options) {
    const safeEmail =
      options?.email || `guest_${Math.random().toString(36).substring(2, 8)}@game.local`;
    const safeName = options?.playerName || "Guest";
    const mapId = Number(options?.mapId || 1);

    this.state.players[client.sessionId] = {
      id: client.sessionId,
      email: safeEmail,
      playerName: safeName,
      mapId,
      x: options?.x || 200,
      y: options?.y || 200,
      dir: "down",
      hp: 100,
      mp: 100,
      attack: 10,
      defense: 5,
      speed: 5,
      critDamage: 150,
      exp: 0,
      coins: 0,
      level: 1,
    };

    console.log(`✅ ${safeName} joined Map ${mapId}`);

    const sameMapPlayers = {};
    for (const [id, p] of Object.entries(this.state.players)) {
      if (p.mapId === mapId) sameMapPlayers[id] = p;
    }
    client.send("players_snapshot", sameMapPlayers);
    this.safeBroadcastToMap(mapId, "player_joined", {
      id: client.sessionId,
      player: this.state.players[client.sessionId],
    });
  }

  /* ============================================================
     👋 PLAYER LEAVE
  ============================================================ */
  onLeave(client) {
    const player = this.state.players[client.sessionId];
    if (!player) return;
    console.log(`👋 Player left: ${player.playerName}`);
    this.safeBroadcastToMap(player.mapId, "player_left", { id: client.sessionId });
    delete this.state.players[client.sessionId];
  }

  /* ============================================================
     🧟 MONSTER SPAWNING & BEHAVIOR
  ============================================================ */
  spawnMonsters() {
    this.monsterTemplates.forEach((t) => {
      const id = String(t.id || t.MonsterID || `M${Date.now()}`);
      const mapId = Number(t.mapId || t.MapID || 101);
      this.state.monsters[id] = {
        ...t,
        id,
        mapId,
        hp: t.BaseHP || 100,
        maxHP: t.BaseHP || 100,
        x: t.SpawnX || Math.random() * 800,
        y: t.SpawnY || Math.random() * 600,
        state: "idle",
        target: null,
      };
    });
    console.log("🧩 Spawned monsters:", Object.keys(this.state.monsters));
  }

  updateMonsterMovement() {
    try {
      const updates = [];
      for (const m of Object.values(this.state.monsters)) {
        if (m.hp <= 0) continue;
        if (m.state === "aggro" && m.target && this.state.players[m.target]) {
          const target = this.state.players[m.target];
          if (!target || target.mapId !== m.mapId) {
            m.state = "idle";
            m.target = null;
          } else {
            const dx = target.x - m.x;
            const dy = target.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const step = Math.min(30, m.speed || 10);
            m.x += (dx / dist) * step;
            m.y += (dy / dist) * step;
            m.dir = Math.abs(dx) > Math.abs(dy)
              ? (dx < 0 ? "left" : "right")
              : (dy < 0 ? "up" : "down");
          }
        } else if (Math.random() < 0.5) {
          m.state = "walk";
          m.x += Math.random() < 0.5 ? -20 : 20;
        } else m.state = "idle";
        updates.push({ id: m.id, x: m.x, y: m.y, dir: m.dir, state: m.state, hp: m.hp });
      }
      this.safeBroadcast("monsters_update", updates);
    } catch (err) {
      console.error("⚠️ updateMonsterMovement failed:", err);
    }
  }

  respawnMonster(monster) {
    monster.hp = monster.maxHP;
    monster.state = "idle";
    monster.target = null;
    monster.x += Math.random() * 50 - 25;
    monster.y += Math.random() * 30 - 15;

    this.safeBroadcastToMap(monster.mapId, "monster_respawn", {
      id: monster.id,
      x: Math.round(monster.x),
      y: Math.round(monster.y),
      hp: monster.hp,
    });
    console.log(`🧟‍♂️ Monster ${monster.name} respawned at (${Math.round(monster.x)}, ${Math.round(monster.y)})`);
  }

  /* ============================================================
     📡 SAFE BROADCAST
  ============================================================ */
  safeBroadcastToMap(mapId, event, data) {
    for (const c of this.clients) {
      const p = this.state.players[c.sessionId];
      if (p?.mapId === mapId) {
        try {
          c.send(event, data);
        } catch (err) {
          console.warn(`⚠️ Failed to send ${event}:`, err);
        }
      }
    }
  }

  safeBroadcast(event, data) {
    for (const c of this.clients) {
      try {
        c.send(event, data);
      } catch (err) {
        console.warn(`⚠️ Broadcast failed for ${event}:`, err);
      }
    }
  }

  /* ============================================================
     🧹 ROOM DISPOSAL
  ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
