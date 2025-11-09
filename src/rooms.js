// ============================================================
// src/rooms.js — MMORPG Room Definition (Fixed for Node.js)
// ============================================================

const { Room } = require("colyseus");
const { Schema, MapSchema, type, defineTypes } = require("@colyseus/schema");

let sheets = null;

/* ====================== Google Sheets Setup ====================== */
const SHEET_ID = "1U3MFNEf7G32Gs10Z0s0NoiZ6PPP1TgsEVbRUFcmjr7Y";
const SHEET_RANGE = "PlayerData!A2:Z";

if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  const { google } = require("googleapis");
  const srvJSON = process.env.GOOGLE_SERVICE_ACCOUNT;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(srvJSON),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    sheets = google.sheets({ version: "v4", auth });
  } catch (err) {
    console.error("❌ Failed Google Sheets init:", err);
  }
} else {
  console.warn("⚠️ GOOGLE_SERVICE_ACCOUNT missing. Sheet data disabled.");
}

/* ====================== Colyseus Schema ====================== */
class Player extends Schema {
  constructor() {
    super();
    this.id = "";
    this.name = "";
    this.class = "";

    this.x = 0;
    this.y = 0;
    this.MapID = 101;

    this.vx = 0;
    this.vy = 0;
    this.moving = false;
    this.lastDir = "IdleFront";
    this.attacking = false;
    this.attackAnimation = "";

    this.hp = 100;
    this.maxHp = 100;
    this.mana = 100;
    this.maxMana = 100;
    this.level = 1;
    this.exp = 0;
    this.maxExp = 100;
    this.speed = 5;

    this.images = new MapSchema();
  }
}

defineTypes(Player, {
  id: "string",
  name: "string",
  class: "string",

  x: "number",
  y: "number",
  MapID: "number",

  vx: "number",
  vy: "number",
  moving: "boolean",
  lastDir: "string",
  attacking: "boolean",
  attackAnimation: "string",

  hp: "number",
  maxHp: "number",
  mana: "number",
  maxMana: "number",
  level: "number",
  exp: "number",
  maxExp: "number",
  speed: "number",

  images: { map: "string" }
});

class State extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}

defineTypes(State, {
  players: { map: Player }
});

/* ====================== MMORPGRoom ====================== */
exports.MMORPGRoom = class MMORPGRoom extends Room {

  onCreate(options) {
    console.log("✅ MMORPGRoom created");
    this.setState(new State());

    // ----------------- Movement Sync -----------------
    this.onMessage("move", (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      p.x = data.x ?? p.x;
      p.y = data.y ?? p.y;
      p.vx = data.vx ?? p.vx;
      p.vy = data.vy ?? p.vy;
      p.moving = data.moving ?? p.moving;
      p.lastDir = data.lastDir ?? p.lastDir;
      p.MapID = data.MapID ?? p.MapID;
    });

    // ----------------- Attack Sync -----------------
    this.onMessage("attack", (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      p.attacking = true;
      p.attackAnimation = data.attackAnimation ?? p.attackAnimation;

      setTimeout(() => {
        if (p) p.attacking = false;
      }, 400);
    });
  }

  async onJoin(client, options) {
    console.log("🟢 Join:", client.sessionId, options.email);

    if (!options.email) {
      console.warn("🚫 Missing email → kicking:", client.sessionId);
      client.leave();
      return;
    }

    let pdata = null;
    if (sheets) {
      try {
        pdata = await this.loadPlayerData(options.email);
      } catch (err) {
        console.error("⚠️ Sheet error:", err);
      }
    }
    if (!pdata) pdata = {}; // fallback defaults

    const player = new Player();
    player.id = pdata.CharacterID || client.sessionId;
    player.name = pdata.CharacterName || "Unknown";
    player.class = pdata.CharacterClass || "Adventurer";

    player.x = Number(pdata.PositionX) || 0;
    player.y = Number(pdata.PositionY) || 0;
    player.MapID = Number(pdata.MapID) || 101;

    player.vx = 0;
    player.vy = 0;
    player.moving = false;
    player.lastDir = pdata.MovementAnimation || "IdleFront";
    player.attacking = false;
    player.attackAnimation = pdata.ImageURL_Attack_Right || "";

    player.hp = Number(pdata.CurrentHP) || 100;
    player.maxHp = Number(pdata.MaxHP) || 100;
    player.mana = Number(pdata.CurrentMana) || 100;
    player.maxMana = Number(pdata.MaxMana) || 100;

    player.level = Number(pdata.Level) || 1;
    player.exp = Number(pdata.CurrentEXP) || 0;
    player.maxExp = Number(pdata.MaxEXP) || 100;
    player.speed = Number(pdata.Speed) || 5;

    // Populate MapSchema images
    const images = pdata.images || {
      idleFront: pdata.ImageURL_IdleFront || "",
      idleBack: pdata.ImageURL_IdleBack || "",
      walkLeft: pdata.ImageURL_Walk_Left || "",
      walkRight: pdata.ImageURL_Walk_Right || "",
      walkUp: pdata.ImageURL_Walk_Up || "",
      walkDown: pdata.ImageURL_Walk_Down || "",
      attackLeft: pdata.ImageURL_Attack_Left || "",
      attackRight: pdata.ImageURL_Attack_Right || ""
    };
    Object.entries(images).forEach(([k, v]) => player.images.set(k, v));

    this.state.players.set(client.sessionId, player);
    console.log(`✅ Player initialized: ${player.name}`);
  }

  onLeave(client) {
    console.log("🔴 Leave:", client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("❌ Disposing MMORPGRoom");
  }

  // ----------------- Google Sheets Loader -----------------
  async loadPlayerData(email) {
    if (!sheets) return null;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE
    });

    const rows = res.data.values;
    if (!rows?.length) return null;

    const keys = [
      "Email","PlayerName","CharacterID","CharacterName","CharacterClass","PositionX","PositionY","MovementAnimation","MapID",
      "CurrentHP","MaxHP","CurrentMana","MaxMana","Attack","Defense","Speed","CritDamage","CurrentEXP","MaxEXP","Level",
      "StatPointsAvailable","LevelUpsPending","Skill1_Name","Skill1_Damage","Skill1_Cooldown","Skill1_Image","Skill1_Range","Skill1_AnimationURL",
      "Skill2_Name","Skill2_Damage","Skill2_Cooldown","Skill2_Image","Skill2_Range","Skill2_AnimationURL",
      "Skill3_Name","Skill3_Damage","Skill3_Cooldown","Skill3_Image","Skill3_Range","Skill3_AnimationURL",
      "PeerID","Coins","Grade","Section","ImageURL_Attack_Left","ImageURL_Attack_Right","FullName",
      "ImageURL_IdleFront","ImageURL_IdleBack","ImageURL_Walk_Left","ImageURL_Walk_Right","ImageURL_Walk_Up","ImageURL_Walk_Down"
    ];

    for (const row of rows) {
      const obj = {};
      row.forEach((val, i) => keys[i] && (obj[keys[i]] = val));
      if (obj.Email === email) return obj;
    }
    return null;
  }
};
