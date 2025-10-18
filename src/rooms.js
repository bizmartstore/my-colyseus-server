// src/rooms.js
const { Room } = require("colyseus");

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
 🏰 MMORPG Room — Map-based Visibility + Monster System
 ============================================================ */
class MMORPGRoom extends Room {
  async onCreate(options) {
    console.log("🌍 MMORPGRoom created!");
    this.setState({ players: {}, monsters: {} });

    const mapId = options.mapId || 101;
    await this.loadMonsters(mapId);
    this.startMonsterAI();

    /* ============================================================
       🧭 Player Movement
       ============================================================ */
    this.onMessage("move", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      player.x = message.x;
      player.y = message.y;
      player.dir = message.dir;

      const payload = {
        id: client.sessionId,
        x: player.x,
        y: player.y,
        dir: player.dir,
        mapId: player.mapId,
        playerName: player.playerName,
      };

      this.broadcastToMap(player.mapId, "player_move", payload);
    });

    /* ============================================================
       ⚔️ Player Attack Animation
       ============================================================ */
    this.onMessage("attack", (client) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const payload = {
        sessionId: client.sessionId,
        mapId: player.mapId,
        dir: player.dir,
        sprite: player.sprites,
      };

      this.broadcastToMap(player.mapId, "player_attack", payload);
    });

    /* ============================================================
       ⚔️ Player Attacking Monster
       ============================================================ */
    this.onMessage("attack_monster", (client, message) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      const { monsterId, damage } = message;
      const monster = this.state.monsters[monsterId];
      if (!monster || monster.hp <= 0) return;

      monster.hp = Math.max(0, monster.hp - (damage || player.attack));

      this.broadcastToMap(monster.mapId, "monster_hp_update", {
        id: monster.id,
        hp: monster.hp,
        maxHp: monster.maxHp,
      });

      if (monster.hp <= 0) {
        console.log(`💀 ${monster.name} defeated by ${player.playerName}`);
        monster.isWalking = false;
        monster.isAttacking = false;
        this.broadcastMonsterDeath(monster);

        // Respawn after 10s
        setTimeout(() => {
          monster.hp = monster.maxHp;
          monster.x += (Math.random() - 0.5) * 200;
          monster.y += (Math.random() - 0.5) * 200;
          this.broadcastMonsterRespawn(monster);
        }, 10000);
      }
    });

    /* ============================================================
       💬 Chat System (Map Scoped)
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

      this.broadcastToMap(player.mapId, "chat", chatPayload);
    });
  }

  /* ============================================================
     🧍 Player Join
     ============================================================ */
  onJoin(client, options) {
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
      sprites: {
        idleFront: charData.ImageURL_IdleFront,
        idleBack: charData.ImageURL_IdleBack,
        walkLeft: charData.ImageURL_Walk_Left,
        walkRight: charData.ImageURL_Walk_Right,
        attackLeft: charData.ImageURL_Attack_Left,
        attackRight: charData.ImageURL_Attack_Right,
      },
    };

    const sameMapPlayers = {};
    for (const [id, other] of Object.entries(this.state.players)) {
      if (other.mapId === mapId) sameMapPlayers[id] = other;
    }

    client.send("players_snapshot", sameMapPlayers);
    client.send("monsters_snapshot", this.getMonstersByMap(mapId));

    this.broadcastToMap(mapId, "player_joined", {
      id: client.sessionId,
      player: this.state.players[client.sessionId],
    });
  }

  /* ============================================================
     👋 Player Leaves
     ============================================================ */
  onLeave(client) {
    const player = this.state.players[client.sessionId];
    if (!player) return;

    this.broadcastToMap(player.mapId, "player_left", { id: client.sessionId });
    delete this.state.players[client.sessionId];
  }

  /* ============================================================
     🧹 Room Disposed
     ============================================================ */
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }

  /* ============================================================
     🧠 MONSTER SYSTEM
     ============================================================ */
  async loadMonsters(mapId) {
    try {
      const sheetURL =
        "https://script.google.com/macros/s/AKfycbx5iXEVK7xzNwS465caDOF0ZaMdh6gi7h3xcvxySPjkeZ41LsFA0sIXKyBk3v0-ROfuzg/exec?action=getMonsters";
      const res = await fetch(sheetURL);
      const allMonsters = await res.json();

      for (const m of allMonsters) {
        if (Number(m.MapID) !== Number(mapId)) continue;

        const offsetX = (Math.random() - 0.5) * 200;
        const offsetY = (Math.random() - 0.5) * 200;

        this.state.monsters[m.MonsterID] = {
          id: m.MonsterID,
          name: m.Name,
          mapId: Number(m.MapID),
          x: Number(m.PositionX) + offsetX,
          y: Number(m.PositionY) + offsetY,
          dir: Math.random() > 0.5 ? "left" : "right",
          hp: Number(m.CurrentHP),
          maxHp: Number(m.BaseHP),
          speed: Number(m.Speed) || 5,
          isWalking: false,
          isAttacking: false,
          sprite: {
            idleLeft: m.ImageURL_IdleLeft,
            idleRight: m.ImageURL_IdleRight,
            walkLeft: m.ImageURL_Walk_Left,
            walkRight: m.ImageURL_Walk_Right,
            attackLeft: m.ImageURL_Attack_Left,
            attackRight: m.ImageURL_Attack_Right,
            dieLeft: m.ImageURL_Die_Left,
            dieRight: m.ImageURL_Die_Right,
          },
        };
      }

      console.log(`✅ Loaded monsters for Map ${mapId}`);
    } catch (err) {
      console.error("❌ Failed to load monsters:", err);
    }
  }

  startMonsterAI() {
    setInterval(() => {
      for (const [id, m] of Object.entries(this.state.monsters)) {
        if (!m || m.hp <= 0) continue;

        if (Math.random() < 0.7) {
          const dirX = Math.random() * 2 - 1;
          const dirY = Math.random() * 2 - 1;
          const step = m.speed;

          m.x += dirX * step;
          m.y += dirY * step;
          m.dir = dirX < 0 ? "left" : "right";
          m.isWalking = true;
        } else {
          m.isWalking = false;
        }

        this.broadcastMonsterUpdate(m);
      }
    }, 1000);
  }

  /* ============================================================
     🧩 Helper: Broadcast Functions
     ============================================================ */
  broadcastToMap(mapId, event, data) {
    this.clients.forEach((c) => {
      const p = this.state.players[c.sessionId];
      if (p && Number(p.mapId) === Number(mapId)) c.send(event, data);
    });
  }

  broadcastMonsterUpdate(m) {
    const payload = {
      id: m.id,
      x: m.x,
      y: m.y,
      dir: m.dir,
      isWalking: m.isWalking,
      isAttacking: m.isAttacking,
      sprite: m.sprite,
    };
    this.broadcastToMap(m.mapId, "monster_update", payload);
  }

  broadcastMonsterDeath(monster) {
    this.broadcastToMap(monster.mapId, "monster_dead", { id: monster.id });
  }

  broadcastMonsterRespawn(monster) {
    this.broadcastToMap(monster.mapId, "monster_respawn", {
      id: monster.id,
      hp: monster.hp,
      x: monster.x,
      y: monster.y,
      mapId: monster.mapId,
      sprite: monster.sprite,
    });
  }

  getMonstersByMap(mapId) {
    const monsters = {};
    for (const [id, m] of Object.entries(this.state.monsters)) {
      if (Number(m.mapId) === Number(mapId)) monsters[id] = m;
    }
    return monsters;
  }
}

module.exports = { MMORPGRoom };
