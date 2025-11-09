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
    this.mapID = 1; // 🔥 unified map for everyone

    this.currentHP = 100;
    this.maxHP = 100;
    this.currentMana = 100;
    this.maxMana = 100;
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
// 🌍 Game State Schema
// ============================================================
class State extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(State, {
  players: { map: Player },
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
    // 🧭 Player Movement Handler
    // ============================================================
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Apply movement data
      if (typeof data.x === "number") player.x = data.x;
      if (typeof data.y === "number") player.y = data.y;
      if (typeof data.direction === "string") player.direction = data.direction;
      if (typeof data.moving === "boolean") player.moving = data.moving;
      if (typeof data.attacking === "boolean") player.attacking = data.attacking;
      if (typeof data.mapID === "number") player.mapID = 1; // force unified map
    });

    // ============================================================
    // ⚔️ Player Attack Broadcast
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
    // 💬 Chat System
    // ============================================================
    this.onMessage("chat", (client, msg) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const text = (msg?.text || "").toString().trim();
      if (text.length === 0) return;

      this.broadcast("chat_message", {
        sender: player.name,
        text,
        mapID: player.mapID,
      });
    });

    // ============================================================
    // 🧩 Sync Interval (20 FPS)
    // ============================================================
    this.setSimulationInterval(() => {
      this.broadcastPatch();
    }, 50);
  }

  // ============================================================
  // 👋 On Player Join
  // ============================================================
  onJoin(client, options) {
    const p = options.player || options.playerData || {};
    console.log(`👋 ${p.Email || "Unknown"} joined the MMORPG room.`);

    const newPlayer = new Player();

    newPlayer.email = p.Email || client.sessionId;
    newPlayer.name = p.PlayerName || "Guest";
    newPlayer.characterID = p.CharacterID || "C000";
    newPlayer.characterName = p.CharacterName || "Unknown";
    newPlayer.characterClass = p.CharacterClass || "Adventurer";

    newPlayer.x = Number(p.PositionX) || 300;
    newPlayer.y = Number(p.PositionY) || 200;
    newPlayer.animation = p.MovementAnimation || "IdleFront";
    newPlayer.mapID = 1; // ✅ Everyone shares same map

    newPlayer.currentHP = Number(p.CurrentHP) || 100;
    newPlayer.maxHP = Number(p.MaxHP) || 100;
    newPlayer.currentMana = Number(p.CurrentMana) || 100;
    newPlayer.maxMana = Number(p.MaxMana) || 100;
    newPlayer.attack = Number(p.Attack) || 10;
    newPlayer.defense = Number(p.Defense) || 5;
    newPlayer.speed = Number(p.Speed) || 8;
    newPlayer.critDamage = Number(p.CritDamage) || 100;
    newPlayer.level = Number(p.Level) || 1;

    // ✅ Sprite URLs
    newPlayer.idleFront = p.ImageURL_IdleFront || "";
    newPlayer.idleBack = p.ImageURL_IdleBack || "";
    newPlayer.walkLeft = p.ImageURL_Walk_Left || "";
    newPlayer.walkRight = p.ImageURL_Walk_Right || "";
    newPlayer.walkUp = p.ImageURL_Walk_Up || "";
    newPlayer.walkDown = p.ImageURL_Walk_Down || "";
    newPlayer.attackLeft = p.ImageURL_Attack_Left || "";
    newPlayer.attackRight = p.ImageURL_Attack_Right || "";

    this.state.players.set(client.sessionId, newPlayer);

    client.send("joined", {
      sessionId: client.sessionId,
      message: "✅ Welcome to MMORPG Room!",
      currentMap: newPlayer.mapID,
    });

    this.broadcast("player_joined", {
      id: client.sessionId,
      name: newPlayer.name,
      mapID: newPlayer.mapID,
    });
  }

  // ============================================================
  // 🚪 On Player Leave
  // ============================================================
  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`❌ ${player.name} left the room`);
      this.state.players.delete(client.sessionId);
      this.broadcast("player_left", { id: client.sessionId });
    }
  }

  // ============================================================
  // 🧹 On Room Dispose
  // ============================================================
  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
