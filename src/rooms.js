// ============================================================
// src/rooms.js — Colyseus MMORPG Room Definition
// ============================================================

const { Room } = require("colyseus");
const { google } = require("googleapis"); // For Google Sheets API

// Utility function to fetch player data from Google Sheets
async function fetchPlayerData(email) {
  const sheets = google.sheets({ version: "v4" });
  const SPREADSHEET_ID = process.env.PLAYERDATA_SHEET_ID;

  // Fetch all player data
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "PlayerData!A2:AZ", // Adjust range as needed
  });

  const rows = res.data.values || [];
  const headers = [
    "Email","PlayerName","CharacterID","CharacterName","CharacterClass",
    "PositionX","PositionY","MovementAnimation","MapID",
    "CurrentHP","MaxHP","CurrentMana","MaxMana","Attack","Defense",
    "Speed","CritDamage","CurrentEXP","MaxEXP","Level","StatPointsAvailable",
    "LevelUpsPending","Skill1_Name","Skill1_Damage","Skill1_Cooldown","Skill1_Image",
    "Skill1_Range","Skill1_AnimationURL","Skill2_Name","Skill2_Damage",
    "Skill2_Cooldown","Skill2_Image","Skill2_Range","Skill2_AnimationURL",
    "Skill3_Name","Skill3_Damage","Skill3_Cooldown","Skill3_Image","Skill3_Range",
    "Skill3_AnimationURL","PeerID","Coins","Grade","Section",
    "ImageURL_Attack_Left","ImageURL_Attack_Right","FullName","ImageURL_IdleFront",
    "ImageURL_IdleBack","ImageURL_Walk_Left","ImageURL_Walk_Right",
    "ImageURL_Walk_Up","ImageURL_Walk_Down"
  ];

  // Find the player row by email
  const row = rows.find(r => r[0] === email);
  if (!row) return null;

  // Map headers to values dynamically
  const playerData = {};
  headers.forEach((key, i) => {
    playerData[key] = row[i] || null;
  });

  return playerData;
}

class MMORPGRoom extends Room {
  onCreate(options) {
    console.log("🌍 MMORPGRoom created", options);

    // Store all connected players
    this.setState({ players: {} });

    // Movement handler
    this.onMessage("move", (client, data) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      player.PositionX = data.x;
      player.PositionY = data.y;
      player.MovementAnimation = data.animation;
    });

    // Attack / skill handler
    this.onMessage("attack", (client, data) => {
      const attacker = this.state.players[client.sessionId];
      if (!attacker) return;

      const target = Object.values(this.state.players).find(p => p.Email === data.targetEmail);
      if (!target) return;

      const damage = data.skillDamage || attacker.Attack;
      target.CurrentHP -= damage;
      if (target.CurrentHP < 0) target.CurrentHP = 0;

      this.broadcast("attackEvent", {
        attacker: attacker.Email,
        target: target.Email,
        skill: data.skillName,
        damage
      });
    });

    // Periodic broadcast for smooth movement
    this.clock.setInterval(() => {
      this.broadcast("updatePlayers", this.state.players);
    }, 200);
  }

  async onJoin(client, options) {
    console.log(`🟢 Player joined: ${client.sessionId}`, options);

    // Dynamically fetch player data by email
    const player = await fetchPlayerData(options.email);
    if (!player) {
      console.warn(`⚠️ Player data not found for email: ${options.email}`);
      return;
    }

    // Add player to room state
    this.state.players[client.sessionId] = player;

    // Notify others
    this.broadcast("playerJoined", player);
  }

  onLeave(client, consented) {
    console.log(`🔴 Player left: ${client.sessionId}`);
    delete this.state.players[client.sessionId];
    this.broadcast("playerLeft", client.sessionId);
  }

  onDispose() {
    console.log("🗑️ MMORPGRoom disposed");
  }
}

module.exports = { MMORPGRoom };
