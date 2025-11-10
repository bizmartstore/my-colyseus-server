// ============================================================
// src/rooms.js — Colyseus MMORPG Room Logic (Players + Monsters)
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

    this.idleFront = "";
    this.idleBack = "";
    this.walkLeft = "";
    this.walkRight = "";
    this.walkUp = "";
    this.walkDown = "";
    this.attackLeft = "";
    this.attackRight = "";
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
  walkLeft: "string",
  walkRight: "string",
  walkUp: "string",
  walkDown: "string",
  attackLeft: "string",
  attackRight: "string",
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
    this.baseHP = 100;
    this.currentHP = 100;
    this.attack = 10;
    this.defense = 5;
    this.speed = 8;
    this.x = 300;
    this.y = 300;
    this.direction = "left";
    this.animation = "Idle";
    this.attacking = false;
    this.dead = false;

    this.imageIdleLeft = "";
    this.imageIdleRight = "";
    this.imageWalkLeft = "";
    this.imageWalkRight = "";
    this.imageAttackLeft = "";
    this.imageAttackRight = "";
    this.imageDieLeft = "";
    this.imageDieRight = "";
  }
}

defineTypes(Monster, {
  id: "string",
  name: "string",
  class: "string",
  level: "number",
  baseHP: "number",
  currentHP: "number",
  attack: "number",
  defense: "number",
  speed: "number",
  x: "number",
  y: "number",
  direction: "string",
  animation: "string",
  attacking: "boolean",
  dead: "boolean",
  imageIdleLeft: "string",
  imageIdleRight: "string",
  imageWalkLeft: "string",
  imageWalkRight: "string",
  imageAttackLeft: "string",
  imageAttackRight: "string",
  imageDieLeft: "string",
  imageDieRight: "string",
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
    // 🧟 Initialize monsters from sheet data (server-side cache)
    // ============================================================
    if (options.monsters && Array.isArray(options.monsters)) {
      options.monsters.forEach((m) => {
        const monster = new Monster();
        monster.id = m.MonsterID;
        monster.name = m.Name;
        monster.class = m.Class;
        monster.level = Number(m.Level);
        monster.baseHP = Number(m.BaseHP);
        monster.currentHP = Number(m.BaseHP);
        monster.attack = Number(m.Attack);
        monster.defense = Number(m.Defense);
        monster.speed = Number(m.Speed);
        monster.x = Number(m.PositionX);
        monster.y = Number(m.PositionY);

        monster.imageIdleLeft = m.ImageURL_IdleLeft;
        monster.imageIdleRight = m.ImageURL_IdleRight;
        monster.imageWalkLeft = m.ImageURL_Walk_Left;
        monster.imageWalkRight = m.ImageURL_Walk_Right;
        monster.imageAttackLeft = m.ImageURL_Attack_Left;
        monster.imageAttackRight = m.ImageURL_Attack_Right;
        monster.imageDieLeft = m.ImageURL_Die_Left;
        monster.imageDieRight = m.ImageURL_Die_Right;

        this.state.monsters.set(monster.id, monster);
      });
      console.log(`🐉 Loaded ${this.state.monsters.size} monsters`);
    }

    // ============================================================
    // 🧠 Monster AI simulation (every 1s)
    // ============================================================
    this.setSimulationInterval(() => {
      for (let [id, monster] of this.state.monsters.entries()) {
        if (monster.dead) continue;

        // Random small patrol movement
        if (Math.random() < 0.05) {
          const dx = (Math.random() - 0.5) * monster.speed * 2;
          const dy = (Math.random() - 0.5) * monster.speed * 2;
          monster.x += dx;
          monster.y += dy;
          monster.direction = dx > 0 ? "right" : "left";
          monster.animation = dx > 0 ? "WalkRight" : "WalkLeft";

          this.broadcast("monster_move", {
            id,
            x: monster.x,
            y: monster.y,
            direction: monster.direction,
            animation: monster.animation,
          });
        }

        // Random attack event
        if (Math.random() < 0.02) {
          monster.attacking = true;
          monster.animation = monster.direction === "left" ? "AttackLeft" : "AttackRight";
          this.broadcast("monster_attack", {
            id,
            animation: monster.animation,
          });

          setTimeout(() => {
            monster.attacking = false;
            monster.animation = monster.direction === "left" ? "IdleLeft" : "IdleRight";
          }, 500);
        }
      }
    }, 1000);

    // ============================================================
    // 🧩 State Patch Sync (20 FPS)
    // ============================================================
    this.setPatchRate(50);
  }

  // ============================================================
  // 👋 PLAYER JOIN
  // ============================================================
  onJoin(client, options) {
    const p = options.player || options.playerData || {};
    console.log(`👋 ${p.Email || "Unknown"} joined MMORPG room`);

    const newPlayer = new Player();
    newPlayer.email = p.Email || client.sessionId;
    newPlayer.name = p.PlayerName || "Guest";
    newPlayer.characterID = p.CharacterID || "C000";
    newPlayer.characterName = p.CharacterName || "Unknown";
    newPlayer.characterClass = p.CharacterClass || "Adventurer";
    newPlayer.x = Number(p.PositionX) || 300;
    newPlayer.y = Number(p.PositionY) || 200;
    newPlayer.mapID = Number(p.MapID) || 1;
    newPlayer.currentHP = Number(p.CurrentHP) || 100;
    newPlayer.maxHP = Number(p.MaxHP) || 100;

    this.state.players.set(client.sessionId, newPlayer);
    client.send("joined", {
      sessionId: client.sessionId,
      message: "✅ Welcome to MMORPG Room!",
      monsters: Array.from(this.state.monsters.values()),
    });
  }

  // ============================================================
  // 🚪 PLAYER LEAVE
  // ============================================================
  onLeave(client) {
    this.state.players.delete(client.sessionId);
    this.broadcast("player_left", { id: client.sessionId });
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
