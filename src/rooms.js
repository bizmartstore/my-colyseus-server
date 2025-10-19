// ============================================================
// src/rooms.js — MMORPG Room Definition
// ============================================================
const { Room } = require("colyseus");
const fetch = require("node-fetch");

// ============================================================
// 🔗 Load Monsters from Google Sheet
// ============================================================
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
      attack: Number(m.Attack) || 10,
      defense: Number(m.Defense) || 5,
      speed: Number(m.Speed) || 5,
      critDamage: Number(m.CritDamage) || 100,
      critChance: Number(m.CritChance) || 10,
      mapId: Number(m.MapID) || 101,
      x: Number(m.PositionX) || 500,
      y: Number(m.PositionY) || 260,
      hp: Number(m.CurrentHP) || Number(m.BaseHP) || 100,
      coins: Math.floor((Number(m.Attack) + Number(m.Level)) / 2) || 10,
      exp: Math.floor((Number(m.Level) * 5) + 10),
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
    }));
  } catch (err) {
    console.error("❌ Failed to fetch monsters:", err);
    return [];
  }
}

/* ============================================================
 🧩 Character Database (Player Templates)
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
  async onCreate(options) {
    console.log("🌍 MMORPGRoom created!");
    this.setSeatReservationTime(20);
    this.setState({ players: {}, monsters: {} });

    // Load monsters dynamically
    this.monsterTemplates = await loadMonstersFromSheet();
    console.log(`📜 Loaded ${this.monsterTemplates.length} monster templates`);

    // Spawn monsters for each map
    this.spawnMonsters();

    // Random movement updates
    this.clock.setInterval(() => this.updateMonsterMovement(), 2000);

    /* ============================================================
       Player Movement
       ============================================================ */
    this.onMessage("move", (client, msg) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.dir = msg.dir;
      this.broadcastToMap(p.mapId, "player_move", { id: client.sessionId, ...p });
    });

    /* ============================================================
       Player Attack → Damage Monsters
       ============================================================ */
    this.onMessage("attack_monster", (client, msg) => {
      const player = this.state.players[client.sessionId];
      const monster = this.state.monsters[msg.monsterId];
      if (!player || !monster) return;

      const damage = Math.max(1, player.attack - monster.defense);
      monster.hp -= damage;

      this.broadcastToMap(player.mapId, "monster_hit", {
        monsterId: monster.id,
        hp: monster.hp,
        damage,
        attacker: player.playerName,
      });

      if (monster.hp <= 0) {
        this.broadcastToMap(player.mapId, "monster_dead", {
          monsterId: monster.id,
          coins: monster.coins,
          exp: monster.exp,
        });

        // Reward player
        player.exp = (player.exp || 0) + monster.exp;
        player.coins = (player.coins || 0) + monster.coins;

        // Respawn monster
        this.clock.setTimeout(() => this.respawnMonster(monster), 5000);
      }
    });
  }

  /* ============================================================
     🧍 Player Joins
     ============================================================ */
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

  /* ============================================================
     🧩 Monster Logic
     ============================================================ */
  spawnMonsters() {
    this.monsterTemplates.forEach((t) => {
      const monster = { ...t, dir: "left", state: "idle" };
      this.state.monsters[monster.id] = monster;
    });
    console.log(`🧟 Spawned ${Object.keys(this.state.monsters).length} monsters`);
  }

  updateMonsterMovement() {
    for (const m of Object.values(this.state.monsters)) {
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
    monster.x += (Math.random() * 100 - 50);
    monster.y += (Math.random() * 60 - 30);
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
