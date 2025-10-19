// ============================================================
// src/rooms.js — MMORPG Room Definition (Render + Colyseus)
// ============================================================

const { Room } = require("colyseus");

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx5iXEVK7xzNwS465caDOF0ZaMdh6gi7h3xcvxySPjkeZ41LsFA0sIXKyBk3v0-ROfuzg/exec?action=getMonsters";

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
  C001: { /* ... keep your character definitions unchanged ... */ },
  C002: { /* ... */ },
  C003: { /* ... */ },
  C004: { /* ... */ },
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

    // Player Movement
    this.onMessage("move", (client, msg) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.dir = msg.dir;
      this.broadcastToMap(p.mapId, "player_move", { id: client.sessionId, ...p });
    });

    // ============================================================
    // ⚔️ Player Attack — Safe & Crash-Proof Version
    // ============================================================
    this.onMessage("attack_monster", (client, msg) => {
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

        // ✅ Safe damage calculation
        const baseDamage = Math.max(1, player.attack - monster.defense);
        const crit = Math.random() < 0.1;
        const totalDamage = Math.floor(baseDamage * (crit ? 1.5 : 1.0));
        monster.hp = Math.max(0, monster.hp - totalDamage);

        // Broadcast monster being hit
        this.broadcastToMap(player.mapId, "monster_hit", {
          monsterId: monster.id,
          hp: monster.hp,
          damage: totalDamage,
          crit,
          attacker: player.playerName,
        });

        // 🧟 Counterattack logic
        if (monster.hp > 0) {
          if (Math.random() < 0.4) {
            const counterDamage = Math.max(1, monster.attack - player.defense);
            player.hp = Math.max(0, player.hp - counterDamage);

            this.broadcastToMap(player.mapId, "player_hit", {
              playerId: client.sessionId,
              damage: counterDamage,
              hp: player.hp,
              monsterId: monster.id,
            });

            if (player.hp <= 0) {
              this.broadcastToMap(player.mapId, "player_dead", {
                playerId: client.sessionId,
                by: monster.name,
              });
            }
          }
        } else {
          // 🪙 Monster died
          this.broadcastToMap(player.mapId, "monster_dead", {
            monsterId: monster.id,
            coins: monster.coins,
            exp: monster.exp,
          });

          // Reward player
          player.exp = (player.exp || 0) + monster.exp;
          player.coins = (player.coins || 0) + monster.coins;

          // Respawn monster after delay
          this.clock.setTimeout(() => this.respawnMonster(monster), 5000);
        }
      } catch (err) {
        console.error("❌ attack_monster crashed:", err);
      }
    });
  }

  async onJoin(client, options) {
    const safeName = options.playerName || "Guest";
    const safeChar = characterDatabase[options.CharacterID] || characterDatabase["C001"];
    const mapId = Number(options.mapId) || 101;

    this.state.players[client.sessionId] = {
      id: client.sessionId,
      playerName: safeName,
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
    };

    client.send("join_ack", { ok: true });
    client.send("monsters_snapshot", this.state.monsters);
    console.log(`✅ ${safeName} joined map ${mapId}`);
  }

  onLeave(client) {
    const p = this.state.players[client.sessionId];
    if (!p) return;
    delete this.state.players[client.sessionId];
    console.log(`👋 Player left: ${p.playerName}`);
  }

  spawnMonsters() {
    this.monsterTemplates.forEach((t) => {
      this.state.monsters[t.id] = { ...t };
    });
    console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);
  }

  updateMonsterMovement() {
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
    this.broadcast("monsters_update", this.state.monsters);
  }

  respawnMonster(monster) {
    monster.hp = monster.maxHP;
    monster.x += Math.random() * 100 - 50;
    monster.y += Math.random() * 60 - 30;
    monster.state = "idle";
    this.broadcastToMap(monster.mapId, "monster_respawn", monster);
  }

  broadcastToMap(mapId, event, data) {
    this.clients.forEach((c) => {
      const p = this.state.players[c.sessionId];
      if (p?.mapId === mapId) c.send(event, data);
    });
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
