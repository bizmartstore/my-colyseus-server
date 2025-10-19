// ============================================================
// src/rooms.js — MMORPG Room Definition (Render + Colyseus)
// ============================================================

const { Room } = require("colyseus");

// 🧩 Dynamic import of node-fetch for server compatibility
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ============================================================
   🧠 Process-level Safety Handlers
   ============================================================ */
process.on("uncaughtException", (err) => console.error("🚨 Uncaught Exception:", err));
process.on("unhandledRejection", (reason, p) => console.error("🚨 Unhandled Rejection:", reason, "Promise:", p));

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
      class: m.Class,
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
   🏰 MMORPG Room Definition
   ============================================================ */
class MMORPGRoom extends Room {
  async onCreate() {
    console.log("🌍 MMORPGRoom created!");
    this.setSeatReservationTime(20);
    this.setState({ players: {}, monsters: {} });

    // ✅ Load monsters
    this.monsterTemplates = await loadMonstersFromSheet();
    console.log(`📜 Loaded ${this.monsterTemplates.length} monsters`);
    this.spawnMonsters();

    // 🧭 Update movement every 2s (lightweight broadcast)
    this.clock.setInterval(() => this.updateMonsterMovement(), 2000);

    /* ============================================================
       🚶 Player Movement
       ============================================================ */
    this.onMessage("move", (client, msg) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.dir = msg.dir;
      this.safeBroadcastToMap(p.mapId, "player_move", { id: client.sessionId, x: p.x, y: p.y, dir: p.dir });
    });

    /* ============================================================
       ⚔️ Player Attack — Safe & Non-blocking
       ============================================================ */
    this.onMessage("attack_monster", async (client, msg) => {
      try {
        const player = this.state.players?.[client.sessionId];
        const monster = this.state.monsters?.[msg.monsterId];
        if (!player || !monster || monster.hp <= 0) return;

        const baseDamage = Math.max(1, (player.attack || 1) - (monster.defense || 0));
        const crit = Math.random() < 0.1;
        const totalDamage = Math.floor(baseDamage * (crit ? 1.5 : 1));
        monster.hp = Math.max(0, monster.hp - totalDamage);

        this.safeBroadcastToMap(player.mapId, "monster_hit", {
          monsterId: monster.id,
          hp: monster.hp,
          damage: totalDamage,
          crit,
          attacker: player.playerName,
        });

        // 🧟 Monster counterattack
        if (monster.hp > 0 && Math.random() < 0.4) {
          const counterDamage = Math.max(1, (monster.attack || 1) - (player.defense || 0));
          player.hp = Math.max(0, player.hp - counterDamage);
          this.safeBroadcastToMap(player.mapId, "player_hit", {
            playerId: client.sessionId,
            damage: counterDamage,
            hp: player.hp,
            monsterId: monster.id,
          });
        } else if (monster.hp <= 0) {
          // Monster death
          this.safeBroadcastToMap(player.mapId, "monster_dead", {
            monsterId: monster.id,
            coins: monster.coins,
            exp: monster.exp,
          });
          player.exp += monster.exp;
          player.coins += monster.coins;

          // ✅ Reward async — non-blocking
          if (player.email && player.email !== "unknown") {
            (async () => {
              try {
                const url = `${REWARD_ENDPOINT}&email=${encodeURIComponent(player.email)}&monsterId=${monster.id}`;
                await fetch(url);
              } catch (e) {
                console.warn("⚠️ rewardPlayerForKill failed silently:", e);
              }
            })();
          }

          // Respawn safely
          this.clock.setTimeout(() => this.respawnMonster(monster), 5000);
        }
      } catch (err) {
        console.error("❌ attack_monster crashed:", err);
      }
    });
  }

  /* ============================================================
     🧍 Player Join / Leave
     ============================================================ */
  async onJoin(client, options) {
    const char = characterDatabase[options.CharacterID] || characterDatabase["C001"];
    const mapId = Number(options.mapId) || 101;

    this.state.players[client.sessionId] = {
      id: client.sessionId,
      playerName: options.playerName || "Guest",
      email: options.email || "unknown",
      mapId,
      x: 200,
      y: 200,
      attack: char.Attack,
      defense: char.Defense,
      hp: char.BaseHP,
      mp: char.BaseMana,
      exp: 0,
      coins: 0,
    };

    client.send("join_ack", { ok: true });
    client.send("monsters_snapshot", this.state.monsters);
    console.log(`✅ ${options.playerName} joined map ${mapId}`);
  }

  onLeave(client) {
    const p = this.state.players[client.sessionId];
    if (!p) return;
    delete this.state.players[client.sessionId];
    console.log(`👋 ${p.playerName} left the game.`);
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
        lightMonsters.push({ id: m.id, x: m.x, y: m.y, dir: m.dir, state: m.state, hp: m.hp, mapId: m.mapId });
      }
      this.safeBroadcast("monsters_update", lightMonsters);
    } catch (err) {
      console.error("⚠️ updateMonsterMovement failed:", err);
    }
  }

  respawnMonster(monster) {
    monster.hp = monster.maxHP;
    monster.x += Math.random() * 100 - 50;
    monster.y += Math.random() * 60 - 30;
    monster.state = "idle";
    this.safeBroadcastToMap(monster.mapId, "monster_respawn", {
      id: monster.id,
      x: monster.x,
      y: monster.y,
      hp: monster.hp,
    });
  }

  /* ============================================================
     📡 Safe Broadcast Utilities
     ============================================================ */
  safeBroadcastToMap(mapId, event, data) {
    for (const c of this.clients) {
      try {
        const p = this.state.players[c.sessionId];
        if (p?.mapId === mapId) c.send(event, data);
      } catch (err) {
        console.warn(`⚠️ Failed broadcastToMap ${event}:`, err);
      }
    }
  }

  safeBroadcast(event, data) {
    for (const c of this.clients) {
      try {
        c.send(event, data);
      } catch (err) {
        console.warn(`⚠️ safeBroadcast failed:`, err);
      }
    }
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
