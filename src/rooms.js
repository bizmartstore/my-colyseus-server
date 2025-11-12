// ============================================================
// src/rooms.js — Colyseus MMORPG Room Logic (Node Compatible)
// ============================================================

const { Room } = require("colyseus");
const { Schema, MapSchema, defineTypes } = require("@colyseus/schema");

// ============================================================
// 📦 Player Schema
// ============================================================
class Player extends Schema {
  constructor() {
    super();
    this.email = "";
    this.name = "";
    this.characterID = "";
    this.characterName = "";
    this.characterClass = "";
    this.x = 0;
    this.y = 0;
    this.animation = "IdleFront";
    this.direction = "down";
    this.moving = false;
    this.attacking = false;
    this.mapID = 1;

    this.currentHP = 100;
    this.maxHP = 100;
    this.currentMana = 100;
    this.maxMana = 100;
    this.currentEXP = 0;
    this.maxEXP = 100;
    this.attack = 10;
    this.defense = 5;
    this.speed = 8;
    this.critDamage = 100;
    this.level = 1;

    // ✅ Sprite URLs
    this.idleFront = "";
    this.idleBack = "";
    this.idleLeft = "";
    this.idleRight = "";
    this.walkLeft = "";
    this.walkRight = "";
    this.walkUp = "";
    this.walkDown = "";
    this.attackLeft = "";
    this.attackRight = "";
    this.attackUp = "";
    this.attackDown = "";
  }
}

defineTypes(Player, {
  email: "string",
  name: "string",
  characterID: "string",
  characterName: "string",
  characterClass: "string",

  x: "number",
  y: "number",
  animation: "string",
  direction: "string",
  moving: "boolean",
  attacking: "boolean",
  mapID: "number",

  currentHP: "number",
  maxHP: "number",
  currentMana: "number",
  maxMana: "number",
  currentEXP: "number",
  maxEXP: "number",
  attack: "number",
  defense: "number",
  speed: "number",
  critDamage: "number",
  level: "number",

  idleFront: "string",
  idleBack: "string",
  idleLeft: "string",
  idleRight: "string",
  walkLeft: "string",
  walkRight: "string",
  walkUp: "string",
  walkDown: "string",
  attackLeft: "string",
  attackRight: "string",
  attackUp: "string",
  attackDown: "string",
});

// ============================================================
// 🧟 Monster Schema
// ============================================================
class Monster extends Schema {
  constructor() {
    super();
    this.id = "";
    this.name = "";
    this.class = "";
    this.level = 1;
    this.x = 0;
    this.y = 0;
    this.direction = "down";
    this.moving = false;
    this.attacking = false;
    this.currentHP = 100;
    this.maxHP = 100;
    this.attack = 10;
    this.defense = 5;
    this.speed = 5;
    this.critDamage = 100;
    this.mapID = 1;

    // ✅ Monster Sprite URLs
    this.idleLeft = "";
    this.idleRight = "";
    this.idleUp = "";
    this.idleDown = "";
    this.walkLeft = "";
    this.walkRight = "";
    this.walkUp = "";
    this.walkDown = "";
    this.attackLeft = "";
    this.attackRight = "";
    this.attackUp = "";
    this.attackDown = "";
  }
}

defineTypes(Monster, {
  id: "string",
  name: "string",
  class: "string",
  level: "number",
  x: "number",
  y: "number",
  direction: "string",
  moving: "boolean",
  attacking: "boolean",
  currentHP: "number",
  maxHP: "number",
  attack: "number",
  defense: "number",
  speed: "number",
  critDamage: "number",
  mapID: "number",
  idleLeft: "string",
  idleRight: "string",
  idleUp: "string",
  idleDown: "string",
  walkLeft: "string",
  walkRight: "string",
  walkUp: "string",
  walkDown: "string",
  attackLeft: "string",
  attackRight: "string",
  attackUp: "string",
  attackDown: "string",
});

// ============================================================
// 🌍 Game State Schema
// ============================================================
class State extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.monsters = new MapSchema();
  }
}
defineTypes(State, {
  players: { map: Player },
  monsters: { map: Monster },
});

// ============================================================
// 🎮 MMORPG Room
// ============================================================
class MMORPGRoom extends Room {
  onCreate(options) {
    this.setState(new State());
    this.maxClients = 100;
    console.log("🟢 MMORPGRoom created");

    // ============================================================
    // 🧭 PLAYER MOVEMENT HANDLER
    // ============================================================
    this.onMessage("player_move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.x = Number(data.PositionX ?? player.x);
      player.y = Number(data.PositionY ?? player.y);
      player.direction = data.direction || player.direction;
      player.moving = !!data.moving;
      player.attacking = !!data.attacking;
      player.mapID = Number(data.mapId ?? player.mapID);

      this.broadcast("player_move", {
        id: client.sessionId,
        x: player.x,
        y: player.y,
        direction: player.direction,
        moving: player.moving,
        attacking: player.attacking,
        mapID: player.mapID,
      }, { except: client });
    });

    // ============================================================
    // ⚔️ PLAYER ATTACK HANDLER
    // ============================================================
    this.onMessage("attack", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      this.broadcast("attack_event", {
        attackerId: client.sessionId,
        direction: data.direction || "right",
        skillName: data.skillName || "Basic Attack",
        damage: data.damage || 0,
        crit: data.crit || false,
        mapID: player.mapID,
      });
    });

    // ============================================================
    // 🧟 MONSTER UPDATE HANDLER (for AI or admin control)
    // ============================================================
    this.onMessage("monster_update", (client, data) => {
      const m = this.state.monsters.get(data.id);
      if (!m) return;
      m.x = Number(data.x ?? m.x);
      m.y = Number(data.y ?? m.y);
      m.direction = data.direction || m.direction;
      m.moving = !!data.moving;
      m.attacking = !!data.attacking;

      this.broadcast("monster_update", {
        id: m.id,
        x: m.x,
        y: m.y,
        direction: m.direction,
        moving: m.moving,
        attacking: m.attacking,
        currentHP: m.currentHP,
      });
    });

    // ============================================================
    // ❤️ HP/MP/EXP REAL-TIME SYNC
    // ============================================================
    this.onMessage("update_stats", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.currentHP = Number(data.currentHP ?? player.currentHP);
      player.maxHP = Number(data.maxHP ?? player.maxHP);
      player.currentMana = Number(data.currentMana ?? player.currentMana);
      player.maxMana = Number(data.maxMana ?? player.maxMana);
      player.currentEXP = Number(data.currentEXP ?? player.currentEXP);
      player.maxEXP = Number(data.maxEXP ?? player.maxEXP);
      player.level = Number(data.level ?? player.level);

      this.broadcast("player_stats_update", {
        id: client.sessionId,
        currentHP: player.currentHP,
        maxHP: player.maxHP,
        currentMana: player.currentMana,
        maxMana: player.maxMana,
        currentEXP: player.currentEXP,
        maxEXP: player.maxEXP,
        level: player.level,
      }, { except: client });
    });

    // ============================================================
    // 🧩 INIT: Spawn Monsters on Room Start
    // ============================================================
    this.spawnDefaultMonsters();
    this.startMonsterAI();
    this.startMonsterBattleAI();

    // ============================================================
    // 🧠 STATE PATCH SYNC (20 FPS)
    // ============================================================
    this.setSimulationInterval(() => this.broadcastPatch(), 50);
  }

  spawnDefaultMonsters() {
    const monsters = [
      {
        id: "M001",
        name: "Orc Soldier",
        class: "Beast",
        level: 1,
        x: 490,
        y: 260,
        currentHP: 120,
        maxHP: 120,
        attack: 35,
        defense: 13,
        speed: 8,
        critDamage: 100,
        mapID: 1,
        idleLeft: "https://i.ibb.co/93z4RPk8/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-breathing-idle-west-1.gif",
        idleRight: "https://i.ibb.co/XxVTbBxG/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-breathing-idle-east-1.gif",
        idleUp: "https://i.ibb.co/gFLNNQxv/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-breathing-idle-north-1.gif",
        idleDown: "https://i.ibb.co/zWptpc41/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-breathing-idle-south-1.gif",
        walkLeft: "https://i.ibb.co/TqmN8GXx/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-running-4-frames-west.gif",
        walkRight: "https://i.ibb.co/gMVNP0mJ/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-running-4-frames-east.gif",
        walkUp: "https://i.ibb.co/Pvbx1mrQ/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-running-4-frames-north.gif",
        walkDown: "https://i.ibb.co/k6BWK4BQ/ezgif-com-animated-gif-maker-5.gif",
        attackLeft: "https://i.ibb.co/CKNkMfwb/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-cross-punch-east2-ezgif-com-rotate.gif",
        attackRight: "https://i.ibb.co/4gTn9xzM/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-cross-punch-east-2.gif",
        attackUp: "https://i.ibb.co/39B2HvNb/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-cross-punch-north.gif",
        attackDown: "https://i.ibb.co/M5sNBTyF/Shadow-male-Assassin-Rogue-standing-in-a-poised-st-cross-punch-south-1.gif",
      }
    ];

    for (const m of monsters) {
      const monster = new Monster();
      Object.assign(monster, m);
      this.state.monsters.set(m.id, monster);
    }

    console.log(`🧟 Spawned ${this.state.monsters.size} monsters`);
  }

// ============================================================
// 🧠 SIMPLE MONSTER AI — random wandering within small radius
// ============================================================
startMonsterAI() {
  const moveMonster = (m) => {
    if (!m) return;

    // ✅ Define small random wander radius
    const radius = 40; // smaller distance = more natural idle pacing
    if (!m.spawnX) m.spawnX = m.x;
    if (!m.spawnY) m.spawnY = m.y;

    // ✅ Choose random target within small radius
    const newX = m.spawnX + (Math.random() * 2 - 1) * radius;
    const newY = m.spawnY + (Math.random() * 2 - 1) * radius;

    // ✅ Pick direction based on target offset
    const dx = newX - m.x;
    const dy = newY - m.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > absY) {
      m.direction = dx < 0 ? "left" : "right";
    } else {
      m.direction = dy < 0 ? "up" : "down";
    }

    m.moving = true;

    // ✅ Smooth movement (simulate walking)
    const steps = 25;
    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      m.x += dx / steps;
      m.y += dy / steps;

      // Broadcast monster movement in real time
      this.broadcast("monster_update", {
        id: m.id,
        x: m.x,
        y: m.y,
        direction: m.direction,
        moving: true,
      });

      // ✅ Stop after finishing movement
      if (step >= steps) {
        clearInterval(stepInterval);
        m.moving = false;

        // ✅ After moving, set proper idle direction sprite
        let idleDirection = "idleDown";
        switch (m.direction) {
          case "left":  idleDirection = "idleLeft"; break;
          case "right": idleDirection = "idleRight"; break;
          case "up":    idleDirection = "idleUp"; break;
          case "down":  idleDirection = "idleDown"; break;
        }

        this.broadcast("monster_update", {
          id: m.id,
          moving: false,
          direction: m.direction,
          currentAnimation: idleDirection,
        });

        // ⏳ Wait 5 seconds before moving again
        setTimeout(() => moveMonster(m), 5000);
      }
    }, 150);
  };

  // ✅ Start the wandering loop for each monster
  this.state.monsters.forEach((m) => {
    setTimeout(() => moveMonster(m), 1000 + Math.random() * 2000);
  });
}


// =========================== 🧠 Monster Battle AI ===========================
startMonsterBattleAI() {
  const AGGRO_RANGE = 150;
  const DISENGAGE_RANGE = 300;
  const ATTACK_INTERVAL = 1500; // ms between attacks

  setInterval(() => {
    this.state.monsters.forEach((m) => {
      if (m.currentHP <= 0) return; // Skip dead monsters

      // Find nearest player
      let nearestPlayer = null;
      let nearestDist = Infinity;

      this.state.players.forEach((p) => {
        if (p.mapID !== m.mapID) return; // skip different map
        const dx = p.x - m.x;
        const dy = p.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPlayer = p;
        }
      });

      if (!nearestPlayer) return;

      // 🧭 Check aggression distance
      if (nearestDist < AGGRO_RANGE) {
        // Move toward nearest player
        const dx = nearestPlayer.x - m.x;
        const dy = nearestPlayer.y - m.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        m.x += (dx / len) * m.speed * 0.6;
        m.y += (dy / len) * m.speed * 0.6;

        // Update facing direction
        m.direction =
          Math.abs(dx) > Math.abs(dy)
            ? (dx < 0 ? "left" : "right")
            : (dy < 0 ? "up" : "down");
        m.moving = true;

        // 🗡️ Attack when close (fixed logic with parentheses)
        if (
          nearestDist < 40 &&
          (!m._lastAttackTime || Date.now() - m._lastAttackTime > ATTACK_INTERVAL)
        ) {
          m._lastAttackTime = Date.now();
          m.attacking = true;

          // Calculate damage
          const rawDmg = Math.max(1, m.attack - nearestPlayer.defense);
          nearestPlayer.currentHP = Math.max(0, nearestPlayer.currentHP - rawDmg);

          // Broadcast attack event
          this.broadcast("monster_attack", {
            monsterId: m.id,
            targetId: nearestPlayer.email,
            damage: rawDmg,
            playerHP: nearestPlayer.currentHP,
          });

          // Sync updated player HP
          this.broadcast("player_stats_update", {
            id: nearestPlayer.sessionId,
            currentHP: nearestPlayer.currentHP,
            maxHP: nearestPlayer.maxHP,
          });

          // Stop attack animation after short delay
          setTimeout(() => (m.attacking = false), 400);
        }
      } 
      // 😴 Out of range → return to spawn point
      else if (nearestDist > DISENGAGE_RANGE) {
        if (m.spawnX && m.spawnY) {
          const dx = m.spawnX - m.x;
          const dy = m.spawnY - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 2) {
            m.x += dx * 0.05;
            m.y += dy * 0.05;
            m.moving = true;
          } else {
            m.moving = false;
          }
        }
      }

      // 🔁 Sync monster state to clients
      this.broadcast("monster_update", {
        id: m.id,
        x: m.x,
        y: m.y,
        direction: m.direction,
        moving: m.moving,
        attacking: m.attacking,
        currentHP: m.currentHP,
      });
    });
  }, 300);
}


  // ============================================================
  // 👋 PLAYER JOIN
  // ============================================================
  onJoin(client, options) {
    const p = options.player || {};
    console.log(`👋 ${p.Email || "Unknown"} joined MMORPG room.`);

    const newPlayer = new Player();

    // Basic info
    newPlayer.email = p.Email || client.sessionId;
    newPlayer.name = p.PlayerName || "Guest";
    newPlayer.characterID = p.CharacterID || "C000";
    newPlayer.characterName = p.CharacterName || "Unknown";
    newPlayer.characterClass = p.CharacterClass || "Adventurer";

    // Position
    newPlayer.x = Number(p.PositionX) || 300;
    newPlayer.y = Number(p.PositionY) || 200;
    newPlayer.animation = p.MovementAnimation || "IdleFront";
    newPlayer.mapID = Number(p.MapID) || 1;

    // Stats
    newPlayer.currentHP = Number(p.CurrentHP) || 100;
    newPlayer.maxHP = Number(p.MaxHP) || 100;
    newPlayer.currentMana = Number(p.CurrentMana) || 100;
    newPlayer.maxMana = Number(p.MaxMana) || 100;
    newPlayer.currentEXP = Number(p.CurrentEXP) || 0;
    newPlayer.maxEXP = Number(p.MaxEXP) || 100;
    newPlayer.attack = Number(p.Attack) || 10;
    newPlayer.defense = Number(p.Defense) || 5;
    newPlayer.speed = Number(p.Speed) || 8;
    newPlayer.critDamage = Number(p.CritDamage) || 100;
    newPlayer.level = Number(p.Level) || 1;

    // Sprites
    newPlayer.idleFront = p.ImageURL_IdleFront || "";
    newPlayer.idleBack = p.ImageURL_IdleBack || "";
    newPlayer.idleLeft = p.ImageURL_IdleLeft || "";
    newPlayer.idleRight = p.ImageURL_IdleRight || "";
    newPlayer.walkLeft = p.ImageURL_Walk_Left || "";
    newPlayer.walkRight = p.ImageURL_Walk_Right || "";
    newPlayer.walkUp = p.ImageURL_Walk_Up || "";
    newPlayer.walkDown = p.ImageURL_Walk_Down || "";
    newPlayer.attackLeft = p.ImageURL_Attack_Left || "";
    newPlayer.attackRight = p.ImageURL_Attack_Right || "";
    newPlayer.attackUp = p.ImageURL_Attack_Up || "";
    newPlayer.attackDown = p.ImageURL_Attack_Down || "";

    this.state.players.set(client.sessionId, newPlayer);

    client.send("joined", {
      sessionId: client.sessionId,
      message: "✅ Welcome to MMORPG Room!",
      currentMap: newPlayer.mapID,
    });

    this.broadcast("player_joined", {
      id: client.sessionId,
      name: newPlayer.name,
      characterID: newPlayer.characterID,
      characterName: newPlayer.characterName,
      characterClass: newPlayer.characterClass,
      x: newPlayer.x,
      y: newPlayer.y,
      direction: newPlayer.direction,
      moving: newPlayer.moving,
      attacking: newPlayer.attacking,
      mapID: newPlayer.mapID,
      // Include all sprites
      idleFront: newPlayer.idleFront,
      idleBack: newPlayer.idleBack,
      idleLeft: newPlayer.idleLeft,
      idleRight: newPlayer.idleRight,
      walkLeft: newPlayer.walkLeft,
      walkRight: newPlayer.walkRight,
      walkUp: newPlayer.walkUp,
      walkDown: newPlayer.walkDown,
      attackLeft: newPlayer.attackLeft,
      attackRight: newPlayer.attackRight,
      attackUp: newPlayer.attackUp,
      attackDown: newPlayer.attackDown,
      // Stats
      currentHP: newPlayer.currentHP,
      maxHP: newPlayer.maxHP,
      currentMana: newPlayer.currentMana,
      maxMana: newPlayer.maxMana,
      currentEXP: newPlayer.currentEXP,
      maxEXP: newPlayer.maxEXP,
      level: newPlayer.level,
    });
  }

  // ============================================================
  // 🚪 PLAYER LEAVE
  // ============================================================
  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    console.log(`❌ ${player.name} left`);
    this.state.players.delete(client.sessionId);
    this.broadcast("player_left", { id: client.sessionId });
  }

  // ============================================================
  // 🧹 DISPOSE
  // ============================================================
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
