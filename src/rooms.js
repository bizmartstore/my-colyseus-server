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
    this.dead = false;


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
  dead: "boolean",


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
  constructor(data = {}) {
    super();

    this.id = data.id || "";
    this.name = data.name || "";
    this.class = data.class || "";
    this.level = data.level || 1;
    this.x = data.x || 0;
    this.y = data.y || 0;

    this.direction = data.direction || "down";
    this.moving = false;
    this.attacking = false;

    this.currentHP = data.currentHP || 100;
    this.maxHP = data.maxHP || 100;

    this.attack = data.attack || 10;
    this.defense = data.defense || 5;
    this.speed = data.speed || 5;
    this.critDamage = data.critDamage || 100;

    this.mapID = data.mapID || 1;
    this.visible = true;

    this.spawnX = data.spawnX ?? data.x ?? 0;
    this.spawnY = data.spawnY ?? data.y ?? 0;

    // ⭐ FULLY DYNAMIC EXP — NO HARDCODING
    this.exp = data.exp || 0;
    this._aggroMap = new Map();
    this._wandering = false;
    this._wanderTimer = null;
    this._regenTimer = null;
    this._lastBroadcast = 0;
    this._forcedAggroTick = 0;
    this.attackCooldown = 0;
    this.invulnerable = false;

    // Sprites
    this.idleLeft = data.idleLeft || "";
    this.idleRight = data.idleRight || "";
    this.idleUp = data.idleUp || "";
    this.idleDown = data.idleDown || "";

    this.walkLeft = data.walkLeft || "";
    this.walkRight = data.walkRight || "";
    this.walkUp = data.walkUp || "";
    this.walkDown = data.walkDown || "";

    this.attackLeft = data.attackLeft || "";
    this.attackRight = data.attackRight || "";
    this.attackUp = data.attackUp || "";
    this.attackDown = data.attackDown || "";
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
  exp: "number",
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
  // ⚔️ Compute Damage
  // ===========================================
  const attackPower = player.attack;
  const defense = monster.defense;
  const levelBonus = player.level * 2;
  const base = attackPower + levelBonus;

  const variance = base * (Math.random() * 0.2 - 0.1);
  const defReduce = defense * 0.5;

  let damage = Math.max(1, Math.floor(base - defReduce + variance));

  // ===========================================
  // 💥 Critical hit (20%)
  // ===========================================
  const isCrit = Math.random() < 0.2;
  if (isCrit) {
    damage = Math.floor(damage * (player.critDamage / 100));
  }

  // ===========================================
  // 💢 Optional skill damage bonus
  // ===========================================
  if (player.Skill1_Damage && !data.basicAttack) {
    damage = Math.floor(damage + Number(player.Skill1_Damage));
  }

  // ===========================================
  // 🩸 Apply damage
  // ===========================================
  monster.currentHP -= damage;
  if (monster.currentHP < 0) monster.currentHP = 0;

  // ===========================================
  // 🧠 Add Aggro
  // ===========================================
  if (!monster._aggroMap) monster._aggroMap = new Map();

  let currentAggro = monster._aggroMap.get(client.sessionId) || 0;
  monster._aggroMap.set(client.sessionId, currentAggro + damage + 50);

  monster.isAggro = true;
  monster.targetPlayer = client.sessionId;

  const prev = monster._aggroMap.get(client.sessionId) || 0;
  monster._aggroMap.set(client.sessionId, prev + damage + 100);

  monster._forcedAggroTick = Date.now();

  // ===========================================
  // 📢 Broadcast floating damage
  // ===========================================
  this.broadcast("monster_hp_update", {
    monsterId: monster.id,
    currentHP: monster.currentHP,
    maxHP: monster.maxHP,
    damage,
    crit: isCrit,
  });

  // ===========================================
  // 💀 MONSTER DEATH
  // ===========================================
  if (monster.currentHP <= 0) {
    console.log(`💀 Monster ${monster.name} killed by ${player.name}`);

    this.broadcast("monster_killed", { monsterId: monster.id });
    monster.visible = false;

    this.broadcast("monster_visibility", {
      monsterId: monster.id,
      visible: false
    });

    // ======================================================
    // ⭐ GIVE EXP TO PLAYER (Dynamic from Google Sheets)
    // ======================================================
    if (!isNaN(monster.exp)) {
      player.currentEXP += Number(monster.exp);
    }

    // ⭐ SAVE EXP IMMEDIATELY
    fetch("https://script.google.com/macros/s/AKfycbz14_p6dz4Y1_MpU6C3T-nIF9ebhEI7u_dlR6d8dxRSUqqRIKnC-PtHr_4qwWvv_LWLbg/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "saveEXP",
        email: player.email,
        exp: player.currentEXP,
        maxEXP: player.maxEXP,
        level: player.level
      })
    }).catch(err => console.log("❌ Failed to save EXP:", err));

    // ======================================================
    // ⭐ LEVEL UP LOOP (handles multiple levels)
    // ======================================================
    while (player.currentEXP >= player.maxEXP) {
      player.currentEXP -= player.maxEXP;
      player.level += 1;

      player.maxHP += 10;
      player.maxMana += 5;
      player.attack += 2;
      player.defense += 1;

      player.currentHP = player.maxHP;
      player.currentMana = player.maxMana;

      player.maxEXP = Math.floor(player.maxEXP * 1.25);

      this.broadcast("player_level_up", {
        id: client.sessionId,
        level: player.level,
        maxHP: player.maxHP,
        maxMana: player.maxMana,
        attack: player.attack,
        defense: player.defense,
        maxEXP: player.maxEXP
      });

      // ⭐ SAVE AFTER LEVEL UP TOO
      fetch("https://script.google.com/macros/s/AKfycbz14_p6dz4Y1_MpU6C3T-nIF9ebhEI7u_dlR6d8dxRSUqqRIKnC-PtHr_4qwWvv_LWLbg/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "saveEXP",
          email: player.email,
          exp: player.currentEXP,
          maxEXP: player.maxEXP,
          level: player.level
        })
      }).catch(err => console.log("❌ Failed to save EXP:", err));
    }

    // ======================================================
    // ⭐ Broadcast updated EXP
    // ======================================================
    this.broadcast("player_exp_update", {
      id: client.sessionId,
      exp: player.currentEXP,
      maxEXP: player.maxEXP,
      level: player.level
    });

    // ⏳ Monster Respawn
    setTimeout(() => {
      monster.currentHP = monster.maxHP;
      monster.visible = true;
      monster.x = monster.spawnX;
      monster.y = monster.spawnY;

      monster.isAggro = false;
      monster.targetPlayer = "";
      monster.attacking = false;
      monster.moving = false;
      monster.direction = "down";

      if (monster._aggroMap) monster._aggroMap.clear();

      if (monster._regenTimer) {
        clearInterval(monster._regenTimer);
        monster._regenTimer = null;
      }
      if (monster._wanderTimer) {
        clearTimeout(monster._wanderTimer);
        monster._wanderTimer = null;
      }

      monster._wandering = false;
      monster._lastBroadcast = 0;
      monster._forcedAggroTick = 0;

      monster.invulnerable = true;
      setTimeout(() => (monster.invulnerable = false), 1500);

      monster.attackCooldown = Date.now() + 2000;

      this.broadcast("monster_respawn", {
        monsterId: monster.id,
        x: monster.x,
        y: monster.y,
        currentHP: monster.currentHP,
        maxHP: monster.maxHP,
        visible: true,
        direction: "down",
        moving: false,
        attacking: false,
        isAggro: false,
      });

      this.broadcast("monster_update", {
        id: monster.id,
        x: monster.x,
        y: monster.y,
        direction: "down",
        moving: false,
        attacking: false,
      });

      monster._startWanderAfterRespawn = true;

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
// ❤️ HP/MP/EXP REAL-TIME SYNC (SAFE VERSION)
// ============================================================
this.onMessage("update_stats", (client, data) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  // --------------------------
  // 🩸 Update HP ONLY if sent
  // --------------------------
  if (data.currentHP !== undefined && data.currentHP !== null && !isNaN(Number(data.currentHP))) {
    player.currentHP = Number(data.currentHP);
  }

  if (data.maxHP !== undefined && data.maxHP !== null && !isNaN(Number(data.maxHP))) {
    player.maxHP = Number(data.maxHP);
  }

  // --------------------------
  // 🔵 Update Mana ONLY if sent
  // --------------------------
  if (data.currentMana !== undefined && data.currentMana !== null && !isNaN(Number(data.currentMana))) {
    player.currentMana = Number(data.currentMana);
  }

  if (data.maxMana !== undefined && data.maxMana !== null && !isNaN(Number(data.maxMana))) {
    player.maxMana = Number(data.maxMana);
  }

  // --------------------------
  // 🟣 Update EXP ONLY if sent
  // --------------------------
  if (data.currentEXP !== undefined && data.currentEXP !== null && !isNaN(Number(data.currentEXP))) {
    player.currentEXP = Number(data.currentEXP);
  }

  if (data.maxEXP !== undefined && data.maxEXP !== null && !isNaN(Number(data.maxEXP))) {
    player.maxEXP = Number(data.maxEXP);
  }

  // --------------------------
  // 🟡 Update level ONLY if sent
  // --------------------------
  if (data.level !== undefined && data.level !== null && !isNaN(Number(data.level))) {
    player.level = Number(data.level);
  }

  // --------------------------
  // 📡 Broadcast updated stats
  // (only forwards sanitized values)
  // --------------------------
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
// 🔁 PLAYER RESPAWN REQUEST (client → server) — PORTAL VERSION
// ============================================================
this.onMessage("player_request_respawn", async (client, data) => {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;

    // ⛔ Ignore if not actually dead
    if (!p.dead && p.currentHP > 0) return;

    console.log(`🔄 Respawning player ${p.name} (client-side portal respawn)`);

    // --------------------------------------------------------
    // 🧹 REMOVE PLAYER FROM ALL MONSTER AGGRO TABLES
    // --------------------------------------------------------
    this.state.monsters.forEach(mon => {
        if (mon._aggroMap && mon._aggroMap.has(client.sessionId)) {
            mon._aggroMap.delete(client.sessionId);
        }

        if (mon._aggroMap && mon._aggroMap.size === 0) {
            mon.isAggro = false;
            mon.targetPlayer = "";
        }
    });

    // --------------------------------------------------------
    // ❤️ FULL HP RESTORE
    // --------------------------------------------------------
    p.dead = false;
    p.currentHP = p.maxHP;

    // --------------------------------------------------------
    // ❗ IMPORTANT ❗
    // DO NOT set p.x or p.y anymore!
    // Client already respawned at portal location.
    // --------------------------------------------------------

    p.moving = false;
    p.attacking = false;
    p.direction = "down";

    // --------------------------------------------------------
    // 📩 Send respawn info WITHOUT ANY POSITION
    // --------------------------------------------------------
    client.send("player_respawn", {
        // NO x, NO y → client keeps its portal location
        hp: p.currentHP,
        maxHP: p.maxHP
    });

    // --------------------------------------------------------
    // ⭐ SAVE FULL HP TO GOOGLE SHEETS ⭐
    // --------------------------------------------------------
    try {
        await fetch("https://script.google.com/macros/s/AKfycbz14_p6dz4Y1_MpU6C3T-nIF9ebhEI7u_dlR6d8dxRSUqqRIKnC-PtHr_4qwWvv_LWLbg/exec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                endpoint: "saveRespawnHP",
                email: p.email,
                hp: p.currentHP
            })
        });

        console.log(`📡 Sheets Updated: ${p.email} = ${p.currentHP}`);
    } catch (err) {
        console.error("❌ Failed to update Sheets HP:", err);
    }
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
  // Base monster template
  const baseMonster = {
    name: "Skeleton Reaper",
    class: "Ghost",
    level: 1,
    maxHP: 120,
    attack: 20,
    defense: 13,
    speed: 5,
    critDamage: 25,
    exp: 10,
    mapID: 1,

    idleLeft: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/y4qhx8gy0kog/REAPER_IDLE_LEFT.gif",
    idleRight: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/o4k3chk1upwh/REPEAR_IDLE_RIGHT.gif",
    idleUp: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/3n3wzjkqzvmc/REAPER_IDLE_BACK.gif",
    idleDown: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/pakkkxc5c6al/REAPER_IDLE_FRONT.gif",

    walkLeft: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/gxmnkcn8c8qq/REAPER_WALK_LEFT.gif",
    walkRight: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/a60gyazg4scz/REAPER_WALK_RIGHT.gif",
    walkUp: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/cmgajnf0womj/REAPER_WALK_UP.gif",
    walkDown: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/nr7afv8x8ptx/REAPER_WALK_DOWN.gif",

    attackLeft: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/mst9d68ui2ir/REAPER_ATTACK_LEFT.gif",
    attackRight: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/nrmz9wqdmkup/REPEAR_ATTACK_RIGHT.gif",
    attackUp: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/d2e5282rnzq5/REAPER_ATTACK_BACK.gif",
    attackDown: "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/the-green-cart-rahmnf/assets/l0he1jgxx03g/REAPER_ATTACK_FRONT.gif",
  };

  // How many monsters to spawn
  const totalToSpawn = 20;

  // ==== ZONE B (Left Center) ====
  // Using your map's "Left Center" den: approximately { x: 600, y: 1600 }
  // We'll spawn inside a radius around that point so monsters appear in "left-center below gate town".
  const zoneBCenter = { x: 600, y: 1600 };
  const zoneBRadius = 220; // radius in px (tweak as needed)

  let idNumber = 1;

  for (let i = 0; i < totalToSpawn; i++) {
    const id = `M${String(idNumber).padStart(3, "0")}`;
    idNumber++;

    // Random point inside zoneB circle (uniform)
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * zoneBRadius; // sqrt for even distribution
    const spawnX = Math.floor(zoneBCenter.x + Math.cos(angle) * r);
    const spawnY = Math.floor(zoneBCenter.y + Math.sin(angle) * r);

    const monster = new Monster({
      id,
      name: baseMonster.name,
      class: baseMonster.class,
      level: baseMonster.level,

      x: spawnX,
      y: spawnY,
      spawnX,
      spawnY,

      maxHP: baseMonster.maxHP,
      currentHP: baseMonster.maxHP,

      attack: baseMonster.attack,
      defense: baseMonster.defense,
      speed: baseMonster.speed,
      critDamage: baseMonster.critDamage,
      exp: baseMonster.exp,
      mapID: baseMonster.mapID,

      idleLeft: baseMonster.idleLeft,
      idleRight: baseMonster.idleRight,
      idleUp: baseMonster.idleUp,
      idleDown: baseMonster.idleDown,

      walkLeft: baseMonster.walkLeft,
      walkRight: baseMonster.walkRight,
      walkUp: baseMonster.walkUp,
      walkDown: baseMonster.walkDown,

      attackLeft: baseMonster.attackLeft,
      attackRight: baseMonster.attackRight,
      attackUp: baseMonster.attackUp,
      attackDown: baseMonster.attackDown,
    });

    this.state.monsters.set(monster.id, monster);
  }

  console.log(`🧟 Spawned ${this.state.monsters.size} monsters (Zone B left-center)`);
}



// ============================================================
// 🧠 MONSTER AI — Random Wander + Aggro Follow + Attack
// ============================================================
startMonsterAI() {

  const TICK_MS = 120;
  const WANDER_STEP_MS = 150;
  const CHASE_SPEED = 2.4;
  const WANDER_SPEED = 1.2;
  const ATTACK_RANGE = 40;
  const CHASE_LEASH = 300;
  const ATTACK_COOLDOWN_MS = 1000;
  const REGEN_AMOUNT = 5;
  const REGEN_INTERVAL_MS = 1000;
  const KNOCKBACK_DISTANCE = 28;
  const SMOOTH_BROADCAST = 150;

  // ------------------------------------------------------------
  // Ensure runtime fields
  // ------------------------------------------------------------
  const ensureRuntime = (m) => {
    if (!(m._aggroMap instanceof Map)) m._aggroMap = new Map();
    if (!m._wandering) m._wandering = false;
    if (!m._wanderTimer) m._wanderTimer = null;
    if (!m._lastBroadcast) m._lastBroadcast = 0;
    if (!m._regenTimer) m._regenTimer = null;
    if (!m.attackCooldown) m.attackCooldown = 0;
    if (!m.directionIdle) m.directionIdle = "down";
  };

  // ------------------------------------------------------------
  // 🟩 WANDER BEHAVIOR (UPDATED WITH 7-SECOND IDLE)
  // ------------------------------------------------------------
  const wander = (m) => {
    if (!m || m.isAggro || !m.visible || m.currentHP <= 0) return;

    ensureRuntime(m);

    m._wandering = true;

    if (!m.spawnX) m.spawnX = m.x;
    if (!m.spawnY) m.spawnY = m.y;

    const radius = 80;
    const newX = m.spawnX + (Math.random() * 2 - 1) * radius;
    const newY = m.spawnY + (Math.random() * 2 - 1) * radius;

    let dx = newX - m.x;
    let dy = newY - m.y;

    // Determine walk direction
    m.direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0 ? "left" : "right"
        : dy < 0 ? "up" : "down";

    m.moving = true;

    const steps = 20;
    let step = 0;

    const stepInterval = setInterval(() => {
      if (!m || m.isAggro || m.currentHP <= 0) {
        clearInterval(stepInterval);
        m._wandering = false;
        m.moving = false;
        return;
      }

      step++;
      m.x += dx / steps;
      m.y += dy / steps;

      this.broadcast("monster_update", {
        id: m.id,
        x: m.x,
        y: m.y,
        direction: m.direction,
        moving: true,
      });

      // Reached wander destination
      if (step >= steps) {
        clearInterval(stepInterval);

        m._wandering = false;
        m.moving = false;

        // NEW: record idle direction
        m.directionIdle = m.direction;

        // NEW: broadcast idle animation
        this.broadcast("monster_update", {
          id: m.id,
          x: m.x,
          y: m.y,
          direction: m.directionIdle,
          moving: false,
        });

        // NEW: idle for exactly 7 seconds before walking again
        clearTimeout(m._wanderTimer);
        m._wanderTimer = setTimeout(() => wander(m), 7000);
      }

    }, WANDER_STEP_MS);
  };

  // ------------------------------------------------------------
  // 🟧 PICK TARGET VIA AGGRO MAP
  // ------------------------------------------------------------
  const pickTopAggro = (m) => {
    let best = null;
    let bestWeight = 0;

    m._aggroMap.forEach((w, sid) => {
      if (w > bestWeight) {
        best = sid;
        bestWeight = w;
      }
    });

    return best;
  };

  // ------------------------------------------------------------
  // 🟦 DECAY AGGRO OVER TIME
  // ------------------------------------------------------------
  const decayAggro = (m) => {
    for (const [sid, w] of m._aggroMap.entries()) {
      const newW = Math.max(0, w - 1);
      if (newW <= 0) m._aggroMap.delete(sid);
      else m._aggroMap.set(sid, newW);
    }
  };

  // ------------------------------------------------------------
  // 💚 HP REGEN WHEN DE-AGGRO
  // ------------------------------------------------------------
  const startRegen = (m) => {
    if (m._regenTimer) return;

    m._regenTimer = setInterval(() => {
      if (m.isAggro || m.currentHP <= 0) {
        clearInterval(m._regenTimer);
        m._regenTimer = null;
        return;
      }

      m.currentHP = Math.min(m.maxHP, m.currentHP + REGEN_AMOUNT);

      this.broadcast("monster_regen", {
        monsterId: m.id,
        currentHP: m.currentHP,
        maxHP: m.maxHP,
      });

      if (m.currentHP >= m.maxHP) {
        clearInterval(m._regenTimer);
        m._regenTimer = null;
      }
    }, REGEN_INTERVAL_MS);
  };

  // ------------------------------------------------------------
  // 🟥 APPLY KNOCKBACK TO PLAYER
  // ------------------------------------------------------------
  const knockback = (p, mx, my) => {
    const dx = p.x - mx;
    const dy = p.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    p.x += (dx / dist) * KNOCKBACK_DISTANCE;
    p.y += (dy / dist) * KNOCKBACK_DISTANCE;

    this.broadcast("player_knockback", {
      playerId: Object.keys(this.state.players)
        .find(id => this.state.players.get(id) === p),
      x: Math.floor(p.x),
      y: Math.floor(p.y),
    });
  };

  // ------------------------------------------------------------
  // 🧠 MAIN AI LOOP — CHASE + ATTACK
  // ------------------------------------------------------------
  setInterval(() => {
    const now = Date.now();

    this.state.monsters.forEach((m) => {
      ensureRuntime(m);

      if (m._startWanderAfterRespawn && !m.isAggro && m.visible && m.currentHP > 0) {
        m._startWanderAfterRespawn = false;
        wander(m);
      }

      if (!m.visible || m.currentHP <= 0) return;

      decayAggro(m);

      const targetID = pickTopAggro(m);

      if (!targetID) {
        if (m.isAggro) {
          m.isAggro = false;
          m.targetPlayer = "";
          startRegen(m);
        }
        return;
      }

      m.isAggro = true;
      m.targetPlayer = targetID;

      const p = this.state.players.get(targetID);
      if (!p) return;

      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > CHASE_LEASH) {
        m._aggroMap.delete(targetID);

        if (m._aggroMap.size === 0) {
          m.isAggro = false;
          m.targetPlayer = "";
          startRegen(m);
        }
        return;
      }

      // MOVE toward target
      if (dist > ATTACK_RANGE) {
        m.x += (dx / dist) * CHASE_SPEED;
        m.y += (dy / dist) * CHASE_SPEED;

        m.direction = Math.abs(dx) > Math.abs(dy)
          ? dx > 0 ? "right" : "left"
          : dy > 0 ? "down" : "up";

        m.moving = true;

        if (now - m._lastBroadcast > SMOOTH_BROADCAST) {
          m._lastBroadcast = now;

          this.broadcast("monster_update", {
            id: m.id,
            x: Math.floor(m.x),
            y: Math.floor(m.y),
            direction: m.direction,
            moving: true,
          });
        }

        return;
      }

      // ATTACK
      m.moving = false;

      if (now >= m.attackCooldown) {
        m.attackCooldown = now + ATTACK_COOLDOWN_MS;

        m.attacking = true;

        this.broadcast("monster_play_attack", {
          monsterId: m.id,
          direction: m.direction,
        });

        const damage = Math.max(1, Math.floor(m.attack - p.defense / 1.5));
        p.currentHP = Math.max(0, p.currentHP - damage);

        knockback(p, m.x, m.y);

        this.broadcast("monster_attack_player", {
          monsterId: m.id,
          playerId: targetID,
          damage,
          direction: m.direction,
          playerHP: p.currentHP,
          playerMaxHP: p.maxHP,
        });

        if (p.currentHP <= 0) {
          p.dead = true;

          console.log(`💀 Player ${p.name} died.`);

          m._aggroMap.delete(targetID);

          if (m._aggroMap.size === 0) {
            m.isAggro = false;
            m.targetPlayer = "";
            startRegen(m);
          }

          return;
        }

        setTimeout(() => {
          m.attacking = false;
        }, 350);
      }
    });

  }, TICK_MS);

  // ------------------------------------------------------------
  // START WANDERING FOR ALL MONSTERS
  // ------------------------------------------------------------
  this.state.monsters.forEach((m) => {
    ensureRuntime(m);
    setTimeout(() => wander(m), 1000 + Math.random() * 2000);
  });

}


// ============================================================
// 👋 PLAYER JOIN (NOW LOADS EXP/LEVEL/HP FROM GOOGLE SHEETS)
// ============================================================
async onJoin(client, options) {

  // Remove old session if reconnecting
  if (this.state.players.has(client.sessionId)) {
    console.log("♻️ Cleaning old player instance on reconnect");
    this.state.players.delete(client.sessionId);
  }

  const p = options.player || {};
  const email =
    (p.Email || p.email || p.EmailAddress || p.playerEmail || "").trim();

if (!email) {
    console.error("❌ ERROR: Player joined WITHOUT A VALID EMAIL");
    client.send("error", { message: "Email missing in join payload." });
    client.leave();
    return;
}


  console.log(`👋 ${email} joining MMORPG room...`);

  // ============================================================
  // ⭐ STEP 1 — LOAD STATS FROM GOOGLE SHEETS ⭐
  // ============================================================
  let sheetStats = null;

  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbz14_p6dz4Y1_MpU6C3T-nIF9ebhEI7u_dlR6d8dxRSUqqRIKnC-PtHr_4qwWvv_LWLbg/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "loadStats",
          email: email
        })
      }
    );

    sheetStats = await res.json();
    console.log(`📥 Loaded stats from Sheets for ${email}:`, sheetStats);

  } catch (err) {
    console.error("❌ Failed to load stats from Sheets:", err);
  }

  // If Google Sheets failed, use fallback
  if (!sheetStats) {
    sheetStats = {
      maxHP: p.MaxHP || 100,
      currentHP: p.CurrentHP || 100,
      maxMana: p.MaxMana || 100,
      currentMana: p.CurrentMana || 100,
      maxEXP: p.MaxEXP || 100,
      currentEXP: p.CurrentEXP || 0,
      level: p.Level || 1,
      attack: p.Attack || 10,
      defense: p.Defense || 5,
      speed: p.Speed || 8,
      critDamage: p.CritDamage || 100
    };
  }

  // ============================================================
  // ⭐ STEP 2 — CREATE PLAYER WITH SAVED STATS ⭐
  // ============================================================
  const newPlayer = new Player();

  // Identity
  newPlayer.email = email;
  newPlayer.name = p.PlayerName || "Guest";
  newPlayer.characterID = p.CharacterID || "C000";
  newPlayer.characterName = p.CharacterName || "Unknown";
  newPlayer.characterClass = p.CharacterClass || "Adventurer";

  // Position
  newPlayer.x = Number(p.PositionX || 300);
  newPlayer.y = Number(p.PositionY || 200);
  newPlayer.mapID = Number(p.MapID || 1);

  // ⭐ LOAD SAVED STATS ⭐
  newPlayer.level = Number(sheetStats.level);
  newPlayer.maxHP = Number(sheetStats.maxHP);
  newPlayer.currentHP = Number(sheetStats.currentHP);
  newPlayer.maxMana = Number(sheetStats.maxMana);
  newPlayer.currentMana = Number(sheetStats.currentMana);
  newPlayer.maxEXP = Number(sheetStats.maxEXP);
  newPlayer.currentEXP = Number(sheetStats.currentEXP);
  newPlayer.attack = Number(sheetStats.attack);
  newPlayer.defense = Number(sheetStats.defense);
  newPlayer.speed = Number(sheetStats.speed);
  newPlayer.critDamage = Number(sheetStats.critDamage);

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

  newPlayer.dead = false;

  // Add to room
  this.state.players.set(client.sessionId, newPlayer);

  // ============================================================
  // ⭐ STEP 3 — SEND JOIN PACKET WITH REAL STATS ⭐
  // ============================================================
  client.send("joined", {
    sessionId: client.sessionId,
    message: "Welcome",
    currentMap: newPlayer.mapID,
    currentHP: newPlayer.currentHP,
    maxHP: newPlayer.maxHP,
    currentMana: newPlayer.currentMana,
    maxMana: newPlayer.maxMana,
    currentEXP: newPlayer.currentEXP,
    maxEXP: newPlayer.maxEXP,
    level: newPlayer.level
  });

  // Notify others
  this.broadcast("player_joined", {
    id: client.sessionId,
    name: newPlayer.name,
    characterID: newPlayer.characterID,
    characterName: newPlayer.characterName,
    characterClass: newPlayer.characterClass,
    x: newPlayer.x,
    y: newPlayer.y,
    mapID: newPlayer.mapID,
    direction: newPlayer.direction,
    moving: newPlayer.moving,
    attacking: newPlayer.attacking,
    currentHP: newPlayer.currentHP,
    maxHP: newPlayer.maxHP,
    currentMana: newPlayer.currentMana,
    maxMana: newPlayer.maxMana,
    currentEXP: newPlayer.currentEXP,
    maxEXP: newPlayer.maxEXP,
    level: newPlayer.level
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
