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

    // store spawn position and AI properties
    monster.spawnX = m.x;
    monster.spawnY = m.y;
    monster.targetId = null;
    monster.aggroRadius = 200;   // distance to detect players
    monster.attackRange = 40;    // attack distance
    monster.leaveRadius = 300;   // distance before losing target
    monster.attackCooldown = 1000;
    monster._lastAttack = 0;

    this.state.monsters.set(m.id, monster);
  }

  console.log(`🧟 Spawned ${this.state.monsters.size} monsters`);
}


// ============================================================
// 🧠 SIMPLE MONSTER AI — chase, attack, and wander
// ============================================================
startMonsterAI() {
  const TICK_MS = 200;

  const tick = () => {
    const now = Date.now();

    this.state.monsters.forEach((m) => {
      if (!m.spawnX) m.spawnX = m.x;
      if (!m.spawnY) m.spawnY = m.y;

      // ✅ Keep player sessionIds so lookup works
      const playerEntries = Array.from(this.state.players.entries());
      let target = m.targetId ? this.state.players.get(m.targetId) : null;

      // ✅ Acquire new target if none
      if (!target) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const [pid, p] of playerEntries) {
          const dist = Math.hypot(p.x - m.x, p.y - m.y);
          if (dist < m.aggroRadius && dist < nearestDist) {
            nearest = { id: pid, player: p, dist };
            nearestDist = dist;
          }
        }
        if (nearest) {
          m.targetId = nearest.id; // ✅ use sessionId, not email
          target = nearest.player;
        }
      }

      // ✅ If has a target → chase or attack
      if (target) {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const dist = Math.hypot(dx, dy);

        // ✅ Determine direction for sprite facing
        if (Math.abs(dx) > Math.abs(dy)) {
          m.direction = dx < 0 ? "left" : "right";
        } else {
          m.direction = dy < 0 ? "up" : "down";
        }

        if (dist > m.leaveRadius) {
          // too far → forget target
          m.targetId = null;
          m.moving = false;
          m.attacking = false;
          this.broadcast("monster_update", {
            id: m.id,
            moving: false,
            attacking: false,
            direction: m.direction,
          });
        } else if (dist <= m.attackRange) {
          // ✅ attack
          if (now - m._lastAttack > m.attackCooldown) {
            m._lastAttack = now;
            m.attacking = true;
            m.moving = false;

            this.broadcast("monster_update", {
              id: m.id,
              attacking: true,
              moving: false,
              direction: m.direction,
            });

            const damage = Math.max(1, m.attack - target.defense * 0.5);
            target.currentHP = Math.max(0, target.currentHP - damage);

            this.broadcast("player_stats_update", {
              id: target.sessionId,
              currentHP: target.currentHP,
            });

            // ✅ end attack animation after short delay
            setTimeout(() => {
              m.attacking = false;
              this.broadcast("monster_update", {
                id: m.id,
                attacking: false,
                direction: m.direction,
              });
            }, 400);
          }
        } else {
          // ✅ chase movement
          const step = Math.min(m.speed * (TICK_MS / 1000) * 1.5, dist);
          m.x += (dx / dist) * step;
          m.y += (dy / dist) * step;
          m.moving = true;
          m.attacking = false;

          this.broadcast("monster_update", {
            id: m.id,
            x: m.x,
            y: m.y,
            moving: true,
            attacking: false,
            direction: m.direction,
          });
        }
      } else {
        // ✅ No target → random wandering
        if (!m._nextWander || now > m._nextWander) {
          m._nextWander = now + 3000 + Math.random() * 4000;
          const radius = 80;
          m._wanderTarget = {
            x: m.spawnX + (Math.random() * 2 - 1) * radius,
            y: m.spawnY + (Math.random() * 2 - 1) * radius,
          };
        }

        if (m._wanderTarget) {
          const dx = m._wanderTarget.x - m.x;
          const dy = m._wanderTarget.y - m.y;
          const dist = Math.hypot(dx, dy);

          // choose facing direction while wandering
          if (Math.abs(dx) > Math.abs(dy)) {
            m.direction = dx < 0 ? "left" : "right";
          } else {
            m.direction = dy < 0 ? "up" : "down";
          }

          if (dist > 5) {
            const step = Math.min(m.speed * (TICK_MS / 1000), dist);
            m.x += (dx / dist) * step;
            m.y += (dy / dist) * step;
            m.moving = true;

            this.broadcast("monster_update", {
              id: m.id,
              x: m.x,
              y: m.y,
              moving: true,
              attacking: false,
              direction: m.direction,
            });
          } else {
            m.moving = false;
            this.broadcast("monster_update", {
              id: m.id,
              moving: false,
              attacking: false,
              direction: m.direction,
            });
          }
        }
      }
    });

    this._monsterAITick = setTimeout(tick, TICK_MS);
  };

  tick();
}


// ---------- extend player attack handler so players can damage monsters ----------
this.onMessage("attack", (client, data) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  // ✅ if targetId provided, apply damage to monster
  if (data && data.targetId) {
    const m = this.state.monsters.get(data.targetId);
    if (m && m.mapID === player.mapID) {
      // ✅ validate distance server-side (anti-cheat)
      const dx = m.x - player.x;
      const dy = m.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const VALID_RANGE = 48; // adjust for sprite sizes

      if (distance <= VALID_RANGE) {
        const raw = Number(data.damage || player.attack || 5);
        const mitigated = Math.max(1, raw - (m.defense || 0));
        m.currentHP = Math.max(0, Number(m.currentHP || 0) - mitigated);

        // ✅ Make monster face attacker when hit
        if (Math.abs(dx) > Math.abs(dy)) {
          m.direction = dx < 0 ? "left" : "right";
        } else {
          m.direction = dy < 0 ? "up" : "down";
        }

        // ✅ Broadcast monster HP & animation updates
        this.broadcast("monster_update", {
          id: m.id,
          currentHP: m.currentHP,
          x: m.x,
          y: m.y,
          moving: false,
          attacking: false,
          direction: m.direction,
        });

        // ✅ Handle monster death
        if (m.currentHP <= 0) {
          this.broadcast("monster_dead", {
            id: m.id,
            killer: client.sessionId,
            mapID: m.mapID,
          });

          // remove from state
          this.state.monsters.delete(m.id);

          // ✅ Respawn after 8 seconds
          setTimeout(() => {
            const resp = new Monster();
            Object.assign(resp, {
              id: m.id,
              name: m.name,
              class: m.class,
              level: m.level,
              x: m.spawnX,
              y: m.spawnY,
              spawnX: m.spawnX,
              spawnY: m.spawnY,
              currentHP: m.maxHP,
              maxHP: m.maxHP,
              attack: m.attack,
              defense: m.defense,
              speed: m.speed,
              critDamage: m.critDamage,
              mapID: m.mapID,
              // ✅ copy sprites
              idleLeft: m.idleLeft,
              idleRight: m.idleRight,
              idleUp: m.idleUp,
              idleDown: m.idleDown,
              walkLeft: m.walkLeft,
              walkRight: m.walkRight,
              walkUp: m.walkUp,
              walkDown: m.walkDown,
              attackLeft: m.attackLeft,
              attackRight: m.attackRight,
              attackUp: m.attackUp,
              attackDown: m.attackDown,
            });

            // ✅ reattach AI data
            resp.aggroRadius = m.aggroRadius || 200;
            resp.attackRange = m.attackRange || 40;
            resp.leaveRadius = m.leaveRadius || 300;
            resp.attackCooldown = m.attackCooldown || 1000;
            resp._lastAttack = 0;
            resp.targetId = null;

            this.state.monsters.set(resp.id, resp);

            // ✅ notify clients of respawn
            this.broadcast("monster_spawn", {
              id: resp.id,
              x: resp.x,
              y: resp.y,
              mapID: resp.mapID,
              direction: "down",
            });
          }, 8000);
        }
      } // distance valid
    } // monster exists
  }

  // ✅ Broadcast the player attack for client animation
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
