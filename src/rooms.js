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
    this.spawnX = 0;
    this.spawnY = 0;
    this.targetId = "";
    this.aggro = false;

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
  spawnX: "number",
  spawnY: "number",
  targetId: "string",
  aggro: "boolean",
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
      monster.spawnX = m.x;
      monster.spawnY = m.y;
      monster.aggro = false;
      monster.targetId = "";
      this.state.monsters.set(m.id, monster);
    }

    console.log(`🧟 Spawned ${this.state.monsters.size} monsters`);
  }

  // ============================================================
  // 🧠 MONSTER AI — Aggro / Attack / Return
  // ============================================================
  startMonsterAI() {
    const AGGRO_RADIUS = 200;
    const ATTACK_RADIUS = 50;
    const LEASH_RADIUS = 350;
    const ATTACK_COOLDOWN = 1500;

    setInterval(() => {
      this.state.monsters.forEach((m) => {
        if (m.currentHP <= 0) return;

        let nearestPlayer = null;
        let nearestDist = Infinity;

        this.state.players.forEach((p) => {
          if (!p || p.mapID !== m.mapID) return;
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = p;
          }
        });

        if (nearestPlayer && nearestDist < AGGRO_RADIUS) {
          m.aggro = true;
          m.targetId = nearestPlayer.$sessionId;

          const dx = nearestPlayer.x - m.x;
          const dy = nearestPlayer.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            m.x += nx * (m.speed / 2);
            m.y += ny * (m.speed / 2);
          }

          m.direction =
            Math.abs(dx) > Math.abs(dy)
              ? dx < 0
                ? "left"
                : "right"
              : dy < 0
              ? "up"
              : "down";

          m.moving = true;

          if (
            dist < ATTACK_RADIUS &&
            (!m._lastAttack || Date.now() - m._lastAttack > ATTACK_COOLDOWN)
          ) {
            m._lastAttack = Date.now();
            m.attacking = true;

            const damage = Math.max(1, m.attack - nearestPlayer.defense);
            nearestPlayer.currentHP = Math.max(
              0,
              nearestPlayer.currentHP - damage
            );

            this.broadcast("monster_attack", {
              monsterId: m.id,
              targetId: m.targetId,
              damage,
              newHP: nearestPlayer.currentHP,
            });

            this.broadcast("player_stats_update", {
              id: m.targetId,
              currentHP: nearestPlayer.currentHP,
              maxHP: nearestPlayer.maxHP,
            });

            setTimeout(() => (m.attacking = false), 400);
          }
        } else if (m.aggro) {
          const dx = m.x - m.spawnX;
          const dy = m.y - m.spawnY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > LEASH_RADIUS) {
            m.aggro = false;
            m.targetId = "";
          }
        } else {
          const dx = m.spawnX - m.x;
          const dy = m.spawnY - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 10) {
            m.x += dx * 0.05;
            m.y += dy * 0.05;
            m.direction =
              Math.abs(dx) > Math.abs(dy)
                ? dx < 0
                  ? "left"
                  : "right"
                : dy < 0
                ? "up"
                : "down";
            m.moving = true;
          } else {
            m.moving = false;
          }
        }

        this.broadcast("monster_update", {
          id: m.id,
          x: m.x,
          y: m.y,
          moving: m.moving,
          attacking: m.attacking,
          direction: m.direction,
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

    newPlayer.email = p.Email || client.sessionId;
    newPlayer.name = p.PlayerName || "Guest";
    newPlayer.characterID = p.CharacterID || "C000";
    newPlayer.characterName = p.CharacterName || "Unknown";
    newPlayer.characterClass = p.CharacterClass || "Adventurer";

    newPlayer.x = Number(p.PositionX) || 300;
    newPlayer.y = Number(p.PositionY) || 200;
    newPlayer.animation = p.MovementAnimation || "IdleFront";
    newPlayer.mapID = Number(p.MapID) || 1;

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
