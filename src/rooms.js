// ============================================================
// src/rooms.js — Colyseus MMORPG Room Logic
// ============================================================
const { Room, Client } = require("colyseus");
const { Schema, type, MapSchema } = require("@colyseus/schema");

// ============================================================
// 📦 Player Schema
// ============================================================
class Player extends Schema {
  @type("string") email;
  @type("string") name;
  @type("string") characterID;
  @type("string") characterName;
  @type("string") characterClass;

  @type("number") x;
  @type("number") y;
  @type("string") animation;
  @type("number") mapID;

  @type("number") currentHP;
  @type("number") maxHP;
  @type("number") currentMana;
  @type("number") maxMana;
  @type("number") attack;
  @type("number") defense;
  @type("number") speed;
  @type("number") critDamage;
  @type("number") level;

  @type("string") idleFront;
  @type("string") idleBack;
  @type("string") walkLeft;
  @type("string") walkRight;
  @type("string") walkUp;
  @type("string") walkDown;
  @type("string") attackLeft;
  @type("string") attackRight;
}

// ============================================================
// 🌍 Game State Schema
// ============================================================
class State extends Schema {
  @type({ map: Player }) players = new MapSchema();
}

// ============================================================
// 🎮 MMORPG Room
// ============================================================
class MMORPGRoom extends Room {
  onCreate(options) {
    this.setState(new State());
    this.maxClients = 100;

    console.log("🟢 MMORPGRoom created");

    // Broadcast loop (20 times per second)
    this.setSimulationInterval((deltaTime) => {
      this.broadcastPatch();
    }, 50);

    // Handle player inputs
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.x = data.x ?? player.x;
      player.y = data.y ?? player.y;
      player.animation = data.animation ?? player.animation;
      player.mapID = data.mapID ?? player.mapID;
    });

    this.onMessage("attack", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Broadcast attack animation to all players
      this.broadcast("attack_event", {
        attackerId: client.sessionId,
        direction: data.direction,
        skillName: data.skillName,
        damage: data.damage,
        crit: data.crit,
        mapID: player.mapID,
      });
    });

    this.onMessage("chat", (client, msg) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.broadcast("chat_message", {
        sender: player.name,
        text: msg.text || "",
        mapID: player.mapID,
      });
    });
  }

  onJoin(client, options) {
    const p = options.playerData || {};
    console.log(`👋 ${p.Email || "Unknown"} joined the room`);

    const newPlayer = new Player();
    newPlayer.email = p.Email || client.sessionId;
    newPlayer.name = p.PlayerName || "Guest";
    newPlayer.characterID = p.CharacterID || "C000";
    newPlayer.characterName = p.CharacterName || "Unknown";
    newPlayer.characterClass = p.CharacterClass || "Adventurer";

    newPlayer.x = Number(p.PositionX) || 300;
    newPlayer.y = Number(p.PositionY) || 200;
    newPlayer.animation = p.MovementAnimation || "IdleFront";
    newPlayer.mapID = Number(p.MapID) || 101;

    newPlayer.currentHP = Number(p.CurrentHP) || 100;
    newPlayer.maxHP = Number(p.MaxHP) || 100;
    newPlayer.currentMana = Number(p.CurrentMana) || 100;
    newPlayer.maxMana = Number(p.MaxMana) || 100;
    newPlayer.attack = Number(p.Attack) || 10;
    newPlayer.defense = Number(p.Defense) || 5;
    newPlayer.speed = Number(p.Speed) || 8;
    newPlayer.critDamage = Number(p.CritDamage) || 100;
    newPlayer.level = Number(p.Level) || 1;

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
      message: "Welcome to MMORPG Room!",
      currentMap: newPlayer.mapID,
    });

    this.broadcast("player_joined", {
      id: client.sessionId,
      name: newPlayer.name,
      mapID: newPlayer.mapID,
    });
  }

  onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`❌ ${player.name} left the room`);
      this.state.players.delete(client.sessionId);
      this.broadcast("player_left", { id: client.sessionId });
    }
  }

  onDispose() {
    console.log("🧹 MMORPGRoom disposed.");
  }
}

module.exports = { MMORPGRoom };
