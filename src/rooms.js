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
    this.visible = true;
    this.spawnX = 0;
    this.spawnY = 0;


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
  visible: "boolean",
  spawnX: "number",
  spawnY: "number",

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
// ⚔️ PLAYER ATTACK MONSTER HANDLER (Realtime HP + Respawn)
// ============================================================
// ============================================================
// ⚔️ PLAYER ATTACK MONSTER HANDLER (Ragnarok-style Damage + Respawn)
// ============================================================
this.onMessage("attack_monster", (client, data) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  const monster = this.state.monsters.get(data.monsterId);
  if (!monster) return;

  // ===========================================
  // ✅ Determine base damage and range check
  // ===========================================
  const dx = player.x - monster.x;
  const dy = player.y - monster.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const meleeRange = 48;

  if (dist > meleeRange) return; // too far, ignore attack

  // ===========================================
  // ⚔️ Compute Damage (Ragnarok-inspired)
  // ===========================================
  const attackPower = player.attack;       // e.g. 51
  const defense = monster.defense;         // e.g. 13
  const levelBonus = player.level * 2;     // scale by level
  const base = attackPower + levelBonus;

  // ±10% variance
  const variance = base * (Math.random() * 0.2 - 0.1);

  // soft defense formula
  const defReduce = defense * 0.5;

  // final damage
  let damage = Math.max(1, Math.floor(base - defReduce + variance));

  // ===========================================
  // 💥 Critical hit (20% chance)
  // ===========================================
  const isCrit = Math.random() < 0.2;
  if (isCrit) {
    damage = Math.floor(damage * (player.critDamage / 100));
  }

  // ===========================================
  // 💢 Optional Skill Damage Multiplier
  // ===========================================
  if (player.Skill1_Damage && !data.basicAttack) {
    damage = Math.floor(damage + Number(player.Skill1_Damage));
  }

  // ===========================================
  // 🩸 Apply damage to monster
  // ===========================================
  monster.currentHP -= damage;
  if (monster.currentHP < 0) monster.currentHP = 0;

  // Broadcast HP + floating number
  this.broadcast("monster_hp_update", {
    monsterId: monster.id,
    currentHP: monster.currentHP,
    maxHP: monster.maxHP,
    damage,
    crit: isCrit,
  });

  // ===========================================
  // 💀 Handle monster death & respawn
  // ===========================================
  if (monster.currentHP <= 0) {
    console.log(`💀 Monster ${monster.name} killed by ${player.name}`);

    this.broadcast("monster_killed", { monsterId: monster.id });
    monster.visible = false;
    this.broadcast("monster_visibility", { monsterId: monster.id, visible: false });

    // Respawn after 10 seconds
    setTimeout(() => {
      monster.currentHP = monster.maxHP;
      monster.visible = true;
      monster.x = monster.spawnX || monster.x;
      monster.y = monster.spawnY || monster.y;
      this.broadcast("monster_respawn", {
        monsterId: monster.id,
        x: monster.x,
        y: monster.y,
        currentHP: monster.currentHP,
        maxHP: monster.maxHP,
      });
    }, 10000);
  }
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
      this.state.monsters.set(m.id, monster);
    }

    console.log(`🧟 Spawned ${this.state.monsters.size} monsters`);
  }

// ============================================================
// 🧠 MONSTER AI — Random Wander + Aggro Follow + Attack
// ============================================================
startMonsterAI() {
  const TICK_MS = 120;            // AI tick (chase/attack)
  const WANDER_STEP_MS = 150;     // used by wander movement steps (keeps original feel)
  const CHASE_SPEED = 2.4;        // chase speed in pixels per tick
  const WANDER_SPEED = 1.2;       // strolling speed
  const ATTACK_RANGE = 40;        // melee range
  const CHASE_LEASH = 300;        // distance to drop aggro
  const ATTACK_COOLDOWN_MS = 1000; // 1s between monster attacks
  const REGEN_AMOUNT = 5;         // HP per regen tick
  const REGEN_INTERVAL_MS = 1000; // regen tick while de-aggro
  const KNOCKBACK_DISTANCE = 28;  // pixels to push player on hit
  const SMOOTH_BROADCAST = 150;   // how often to broadcast position updates for smoother motion

  // helper to ensure non-schema runtime fields exist on monsters
  const ensureRuntimeFields = (m) => {
    if (!m) {
      return;
    }
    // per-monster aggro map: Map<sessionId, weight>
    if (!m._aggroMap) m._aggroMap = new Map();
    if (!m._wandering) m._wandering = false;
    if (!m._wanderTimer) m._wanderTimer = null;
    if (!m._lastBroadcast) m._lastBroadcast = 0;
    if (!m._regenTimer) m._regenTimer = null;
    if (!m.attackCooldown) m.attackCooldown = 0; // schema field already exists? keep safe
  };

  // --- Wander implementation reworked to allow interruption by aggro
  const wander = (m) => {
    if (!m || m.isAggro || !m.visible || m.currentHP <= 0) return;
    ensureRuntimeFields(m);

    // mark wandering state
    m._wandering = true;
    if (!m.spawnX) m.spawnX = m.x;
    if (!m.spawnY) m.spawnY = m.y;

    const radius = 80;
    const newX = m.spawnX + (Math.random() * 2 - 1) * radius;
    const newY = m.spawnY + (Math.random() * 2 - 1) * radius;

    let dx = newX - m.x;
    let dy = newY - m.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    m.direction = absX > absY ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    m.moving = true;

    const steps = 20;
    let step = 0;

    const stepInterval = setInterval(() => {
      // if aggro triggers, stop this wander
      if (!m || m.isAggro || m.currentHP <= 0) {
        clearInterval(stepInterval);
        m.moving = false;
        m._wandering = false;
        return;
      }

      step++;
      m.x += (dx / steps) * (WANDER_SPEED / 1.2);
      m.y += (dy / steps) * (WANDER_SPEED / 1.2);

      // direction update
      if (Math.abs(dx) > Math.abs(dy)) m.direction = dx < 0 ? "left" : "right";
      else m.direction = dy < 0 ? "up" : "down";

      // broadcast incremental position for smoother display
      this.broadcast("monster_update", {
        id: m.id,
        x: m.x,
        y: m.y,
        direction: m.direction,
        moving: true,
      });

      if (step >= steps) {
        clearInterval(stepInterval);
        m.moving = false;
        m._wandering = false;
        this.broadcast("monster_update", { id: m.id, moving: false });
        // schedule next wander
        clearTimeout(m._wanderTimer);
        m._wanderTimer = setTimeout(() => wander(m), 1000 + Math.random() * 2500);
      }
    }, WANDER_STEP_MS);
  };

  // --- Pick top aggro target (highest weight) or fallback to single target field
  const pickTopAggro = (m) => {
    ensureRuntimeFields(m);
    // if _aggroMap has entries, pick highest weight
    let top = null;
    let topWeight = 0;
    for (const [sid, w] of m._aggroMap.entries()) {
      if (w > topWeight) { topWeight = w; top = sid; }
    }
    if (top) return top;
    // fallback to legacy single target (attack_monster may set this)
    if (m.targetPlayer) return m.targetPlayer;
    return null;
  };

  // --- Reduce aggro weights over time (fades)
  const decayAggro = (m) => {
    ensureRuntimeFields(m);
    if (!m._aggroMap) return;
    for (const [sid, w] of Array.from(m._aggroMap.entries())) {
      const newW = Math.max(0, w - 1); // simple linear decay
      if (newW <= 0) m._aggroMap.delete(sid);
      else m._aggroMap.set(sid, newW);
    }
    // if empty, ensure isAggro false
    if (m._aggroMap.size === 0 && !m.targetPlayer) {
      m.isAggro = false;
    }
  };

  // --- Start regen for monster when de-aggrored
  const tryStartRegen = (m) => {
    ensureRuntimeFields(m);
    if (m._regenTimer) return; // already running
    m._regenTimer = setInterval(() => {
      if (!m) return clearInterval(m._regenTimer);
      // stop regen if aggro or dead
      if (m.isAggro || m.currentHP <= 0) {
        clearInterval(m._regenTimer);
        m._regenTimer = null;
        return;
      }
      // regen a bit
      m.currentHP = Math.min(m.maxHP, (m.currentHP || 0) + REGEN_AMOUNT);
      this.broadcast("monster_regen", { monsterId: m.id, currentHP: m.currentHP, maxHP: m.maxHP });
      // fire an update occasionally to UI players
      if (m.hpFill) {
        // (client side handles hp bar update on this message if desired)
      }
      // if full HP, stop regen
      if (m.currentHP >= m.maxHP) {
        clearInterval(m._regenTimer);
        m._regenTimer = null;
      }
    }, REGEN_INTERVAL_MS);
  };

  // --- Apply knockback to a player (server authoritative)
  const applyKnockbackToPlayer = (player, fromX, fromY) => {
    if (!player) return;
    // vector from monster to player, push player away
    const dx = player.x - fromX;
    const dy = player.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    player.x += nx * KNOCKBACK_DISTANCE;
    player.y += ny * KNOCKBACK_DISTANCE;
    // clamp within reasonable bounds if you have map bounds (optional)
    // broadcast player knockback (clients can play effect & lerp)
    this.broadcast("player_knockback", {
      playerId: Object.keys(this.state.players).find(k => this.state.players.get(k) === player) || null,
      x: Math.floor(player.x),
      y: Math.floor(player.y),
    });
    // also broadcast a player_move update so other clients see new position (excepted client will get authoritative update)
    this.broadcast("player_move", {
      id: Object.keys(this.state.players).find(k => this.state.players.get(k) === player) || null,
      x: Math.floor(player.x),
      y: Math.floor(player.y),
      direction: player.direction,
      moving: true,
      attacking: false,
      mapID: player.mapID
    });
  };

  // --- Main chase/attack tick (runs every TICK_MS)
  setInterval(() => {
    const now = Date.now();

    // iterate a copy to avoid mutation issues
    this.state.monsters.forEach((m) => {
      try {
        ensureRuntimeFields(m);
        if (!m.visible || m.currentHP <= 0) {
          // clear runtime timers if dead
          if (m._regenTimer) {
            clearInterval(m._regenTimer);
            m._regenTimer = null;
          }
          return;
        }

        // decay aggro gradually
        decayAggro(m);

        // decide top target
        const topTargetId = pickTopAggro(m);
        if (topTargetId) {
          m.isAggro = true;
          m.targetPlayer = topTargetId;
        } else {
          // no targets: ensure flagged as not aggro
          if (m.isAggro) {
            m.isAggro = false;
            m.targetPlayer = "";
            tryStartRegen(m); // start regen when de-aggro
            // inform clients about aggro change
            this.broadcast("monster_aggro_update", { monsterId: m.id, isAggro: false });
          }
        }

        // If not aggro, skip chase logic
        if (!m.isAggro) continue;

        // get current target player
        const targetSid = pickTopAggro(m);
        const player = this.state.players.get(targetSid);
        if (!player) {
          // drop invalid target
          m._aggroMap.delete(targetSid);
          m.isAggro = m._aggroMap.size > 0;
          if (!m.isAggro) {
            m.targetPlayer = "";
            tryStartRegen(m);
          }
          continue;
        }

        // compute vector to player
        const dx = player.x - m.x;
        const dy = player.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

        // if player too far, drop them from aggro map (leash)
        if (dist > CHASE_LEASH) {
          m._aggroMap.delete(targetSid);
          if (m._aggroMap.size === 0) {
            m.isAggro = false;
            m.targetPlayer = "";
            tryStartRegen(m);
            this.broadcast("monster_aggro_update", { monsterId: m.id, isAggro: false });
          }
          continue;
        }

        // Move towards player if not in attack range
        if (dist > ATTACK_RANGE) {
          // move a step towards player
          const step = CHASE_SPEED * (TICK_MS / 1000) * 60 / 60; // normalized
          m.x += (dx / dist) * CHASE_SPEED;
          m.y += (dy / dist) * CHASE_SPEED;

          // direction based on vector
          m.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
          m.moving = true;

          // broadcast smooth updates at SMOOTH_BROADCAST intervals (avoid flooding)
          if (!m._lastBroadcast || (now - m._lastBroadcast) > SMOOTH_BROADCAST) {
            m._lastBroadcast = now;
            this.broadcast("monster_update", {
              id: m.id, x: Math.floor(m.x), y: Math.floor(m.y),
              direction: m.direction, moving: true
            });
          }
        } else {
          // within attack range: stop and attack respecting cooldown
          m.moving = false;

          if (!m.attackCooldown || m.attackCooldown <= now) {
            m.attackCooldown = now + ATTACK_COOLDOWN_MS;

            // mark attacking and broadcast animation trigger
            m.attacking = true;
            this.broadcast("monster_play_attack", { monsterId: m.id, direction: m.direction });

            // compute damage formula (simple)
            const damage = Math.max(1, Math.floor(m.attack - player.defense / 1.5));

            // apply damage to player
            player.currentHP = Math.max(0, (player.currentHP || player.currentHp || player.hp || 0) - damage);

            // apply small knockback
            applyKnockbackToPlayer(player, m.x, m.y);

            // broadcast the damage event (client already has listener for monster_attack previously, but this is specific)
            this.broadcast("monster_attack_player", {
              monsterId: m.id,
              playerId: targetSid,
              damage,
              direction: m.direction,
              playerHP: player.currentHP,
              playerMaxHP: player.maxHP
            });

            // if player died: remove from aggro map and optionally award XP (not changed here)
            if (player.currentHP <= 0) {
              m._aggroMap.delete(targetSid);
              if (m._aggroMap.size === 0) {
                m.isAggro = false;
                m.targetPlayer = "";
                tryStartRegen(m);
                this.broadcast("monster_aggro_update", { monsterId: m.id, isAggro: false });
              }
            }

            // short attack animation end toggle
            setTimeout(() => { try { m.attacking = false; } catch (e) {} }, 350);
          }
        }

      } catch (err) {
        console.error("Monster AI error for monster", m?.id, err);
      }
    });
  }, TICK_MS);

  // --- start wandering behavior for all monsters (preserve original timing) ---
  this.state.monsters.forEach((m) => {
    ensureRuntimeFields(m);
    setTimeout(() => wander(m), 1000 + Math.random() * 2000);
  });
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
