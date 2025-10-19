// ============================================================
// src/rooms.js — MMORPG Room Definition (Render + Colyseus)
// ============================================================

const { Room } = require("colyseus");

// 🧩 Dynamic import of node-fetch for server compatibility
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ============================================================
   Process-level safety handlers
   ============================================================ */
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception (server):", err);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("🚨 Unhandled Rejection (server):", reason, "promise:", p);
});

/* ============================================================
   📄 Google Apps Script Endpoints
   ============================================================ */
const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx5iXEVK7xzNwS465caDOF0ZaMdh6gi7h3xcvxySPjkeZ41LsFA0sIXKyBk3v0-ROfuzg/exec?action=getMonsters";

// Replace this with your real reward endpoint
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
        walkLeft: m.ImageURL_Walk_Left,
        walkRight: m.ImageURL_Walk_Right,
        attackLeft: m.ImageURL_Attack_Left,
        attackRight: m.ImageURL_Attack_Right,
        dieLeft: m.ImageURL_Die_Left,
        dieRight: m.ImageURL_Die_Right,
      },
      state: "idle",
      dir: "left",
    }));
  } catch (err) {
    console.error("❌ Failed to fetch monsters:", err);
    return [];
  }
}

// ============================================================
// 🧩 Character Database (Player Templates)
// ============================================================
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


// ============================================================
// 🏰 MMORPG Room Definition
// ============================================================
class MMORPGRoom extends Room {
  async onCreate() {
    console.log("🌍 MMORPGRoom created!");
    this.setSeatReservationTime(20);
    this.setState({ players: {}, monsters: {} });

    // ✅ Load monsters dynamically
    this.monsterTemplates = await loadMonstersFromSheet();
    console.log(`📜 Loaded ${this.monsterTemplates.length} monster templates`);

    this.spawnMonsters();
    this.clock.setInterval(() => this.updateMonsterMovement(), 2000);

    // ============================================================
    // 🚶 Player Movement
    // ============================================================
    this.onMessage("move", (client, msg) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.dir = msg.dir;
      try {
        this.broadcastToMap(p.mapId, "player_move", { id: client.sessionId, ...p });
      } catch (err) {
        console.error("⚠️ Error broadcasting player_move:", err);
      }
    });

    // ============================================================
    // ⚔️ Player Attack — Hardened and defensive
    // ============================================================
    this.onMessage("attack_monster", async (client, msg) => {
      console.log("🧾 attack_monster received from", client.sessionId, "payload:", msg);
      try {
        if (!msg || typeof msg.monsterId === "undefined") {
          console.warn("⚠️ attack_monster: Missing monsterId", msg);
          return;
        }

        const player = this.state.players?.[client.sessionId];
        const monster = this.state.monsters?.[msg.monsterId];

        if (!player) {
          console.warn("⚠️ attack_monster: Player not found", client.sessionId);
          return;
        }
        if (!monster) {
          console.warn("⚠️ attack_monster: Monster not found", msg.monsterId);
          return;
        }
        if (monster.hp <= 0) return;

        // Safe damage calculation (use defaults if fields missing)
        const attackerAttack = Number(player.attack || 1);
        const monsterDefense = Number(monster.defense || 0);
        const baseDamage = Math.max(1, attackerAttack - monsterDefense);
        const critChance = Number(player.critChance ?? 0.1);
        const critDamageMultiplier = (Number(player.critDamage) || 150) / 100; // default 1.5
        const crit = Math.random() < critChance;
        const totalDamage = Math.floor(baseDamage * (crit ? critDamageMultiplier : 1.0));
        monster.hp = Math.max(0, monster.hp - totalDamage);

        // Broadcast monster being hit (use safe broadcastToMap)
        try {
          this.broadcastToMap(player.mapId, "monster_hit", {
            monsterId: monster.id,
            hp: monster.hp,
            damage: totalDamage,
            crit,
            attacker: player.playerName,
          });
        } catch (bErr) {
          console.error("⚠️ broadcastToMap failed (monster_hit):", bErr);
        }

        // 🧟 Counterattack logic
        if (monster.hp > 0) {
          if (Math.random() < 0.4) {
            const counterDamage = Math.max(1, (monster.attack || 1) - (player.defense || 0));
            player.hp = Math.max(0, player.hp - counterDamage);

            try {
              this.broadcastToMap(player.mapId, "player_hit", {
                playerId: client.sessionId,
                damage: counterDamage,
                hp: player.hp,
                monsterId: monster.id,
              });
            } catch (bErr2) {
              console.error("⚠️ broadcastToMap failed (player_hit):", bErr2);
            }

            if (player.hp <= 0) {
              try {
                this.broadcastToMap(player.mapId, "player_dead", {
                  playerId: client.sessionId,
                  by: monster.name,
                });
              } catch (bErr3) {
                console.error("⚠️ broadcastToMap failed (player_dead):", bErr3);
              }
            }
          }
        } else {
          // 🪙 Monster died
          try {
            this.broadcastToMap(player.mapId, "monster_dead", {
              monsterId: monster.id,
              coins: monster.coins,
              exp: monster.exp,
            });
          } catch (bErr4) {
            console.error("⚠️ broadcastToMap failed (monster_dead):", bErr4);
          }

          // ✅ Reward player locally
          player.exp = (player.exp || 0) + (monster.exp || 0);
          player.coins = (player.coins || 0) + (monster.coins || 0);

          // ✅ Fire-and-forget update to Google Sheet asynchronously so it can't crash handler
          if (player.email && player.email !== "unknown") {
            (async () => {
              try {
                const url = `${REWARD_ENDPOINT}&email=${encodeURIComponent(player.email)}&monsterId=${encodeURIComponent(monster.id)}`;
                const rewardRes = await fetch(url);
                const rewardJson = await rewardRes.json().catch(() => ({}));
                console.log(`🎁 Synced reward for ${player.email}:`, rewardJson);
              } catch (e) {
                console.error(`❌ rewardPlayerForKill (async) failed for ${player.email}:`, e);
              }
            })();
          } else {
            console.warn(`⚠️ Player ${player.playerName} has no valid email; skipping Sheets reward.`);
          }

          // Respawn monster after delay (safe call)
          this.clock.setTimeout(() => {
            try {
              this.respawnMonster(monster);
            } catch (rErr) {
              console.error("⚠️ respawnMonster error:", rErr);
            }
          }, 5000);
        }
      } catch (err) {
        console.error("❌ attack_monster crashed (protected):", err);
        // do not rethrow
      }
    });
  }

  /* ============================================================
     🧍 Player Join / Leave
     ============================================================ */
  async onJoin(client, options) {
    const safeName = options.playerName || "Guest";
    const safeChar = characterDatabase[options.CharacterID] || characterDatabase["C001"];
    const mapId = Number(options.mapId) || 101;

    this.state.players[client.sessionId] = {
      id: client.sessionId,
      playerName: safeName,
      email: options.email || "unknown", // ✅ NEW LINE
      mapId,
      x: 200,
      y: 200,
      attack: safeChar.Attack,
      defense: safeChar.Defense,
      hp: safeChar.BaseHP,
      mp: safeChar.BaseMana,
      exp: 0,
      coins: 0,
      sprites: safeChar,
      isConnected: true,
      disconnectedAt: null,
    };

    try {
      client.send("join_ack", { ok: true });
      client.send("monsters_snapshot", this.state.monsters);
    } catch (err) {
      console.warn(`⚠️ Failed to send join ack/monsters_snapshot to ${client.sessionId}:`, err);
    }

    console.log(`✅ ${safeName} joined map ${mapId} (email: ${options.email || "unknown"})`);
  }

  onLeave(client) {
    const p = this.state.players[client.sessionId];
    if (!p) return;

    // Mark as disconnected instead of immediate deletion
    p.disconnectedAt = Date.now();
    p.isConnected = false;
    console.log(`👋 Player left (marked for cleanup): ${p.playerName} (${client.sessionId})`);

    // Remove from state after a short grace period (30s)
    const GRACE_MS = 30 * 1000;
    this.clock.setTimeout(() => {
      try {
        const current = this.state.players[client.sessionId];
        if (!current) return; // already cleaned up
        if (current.isConnected === false && Date.now() - (current.disconnectedAt || 0) >= GRACE_MS) {
          delete this.state.players[client.sessionId];
          console.log(`🧹 Player cleaned up: ${p.playerName} (${client.sessionId})`);
        }
      } catch (err) {
        console.error("⚠️ Error during onLeave cleanup:", err);
      }
    }, GRACE_MS);
  }

  /* ============================================================
     🧟 Monster Spawning / Movement / Respawn
     ============================================================ */
  spawnMonsters() {
    this.monsterTemplates.forEach((t) => {
      this.state.monsters[t.id] = { ...t };
    });
    console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);
  }

  updateMonsterMovement() {
    try {
      for (const m of Object.values(this.state.monsters)) {
        if (m.hp <= 0) continue;
        if (Math.random() < 0.5) {
          m.dir = Math.random() < 0.5 ? "left" : "right";
          m.state = "walk";
          m.x += m.dir === "left" ? -30 : 30;
        } else {
          m.state = "idle";
        }
      }
      // Use safe broadcast to all clients
      try {
        this.safeBroadcast("monsters_update", this.state.monsters);
      } catch (bErr) {
        console.error("⚠️ safeBroadcast failed (monsters_update):", bErr);
      }
    } catch (err) {
      console.error("⚠️ updateMonsterMovement error:", err);
    }
  }

  respawnMonster(monster) {
    try {
      monster.hp = monster.maxHP;
      monster.x += Math.random() * 100 - 50;
      monster.y += Math.random() * 60 - 30;
      monster.state = "idle";
      // Use broadcastToMap (safe)
      try {
        this.broadcastToMap(monster.mapId, "monster_respawn", monster);
      } catch (bErr) {
        console.error("⚠️ broadcastToMap failed (monster_respawn):", bErr);
      }
    } catch (err) {
      console.error("⚠️ respawnMonster error:", err);
    }
  }

  /* ============================================================
     📡 Utility: Safe broadcast helpers
     ============================================================ */

  // Send message only to players in same map (safe per-client send)
  broadcastToMap(mapId, event, data) {
    this.clients.forEach((c) => {
      try {
        const p = this.state.players[c.sessionId];
        if (p?.mapId === mapId) {
          try {
            c.send(event, data);
          } catch (sendErr) {
            console.warn(`⚠️ Failed to send ${event} to client ${c.sessionId}:`, sendErr);
          }
        }
      } catch (err) {
        console.error("⚠️ broadcastToMap iteration error:", err);
      }
    });
  }

  // Broadcast to all connected clients (safe)
  safeBroadcast(event, data) {
    this.clients.forEach((c) => {
      try {
        // Only send to clients that have a player record and are on a map (avoid undefined)
        const p = this.state.players[c.sessionId];
        if (!p) {
          // still attempt to send if no player object? skip to be safe
          return;
        }
        try {
          c.send(event, data);
        } catch (sendErr) {
          console.warn(`⚠️ Failed to send ${event} to client ${c.sessionId}:`, sendErr);
        }
      } catch (err) {
        console.error("⚠️ safeBroadcast iteration error:", err);
      }
    });
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
