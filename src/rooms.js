const { Room, Client } = require("colyseus");
let sheets = null;

// ====================== Google Sheets Setup ======================
const SHEET_ID = "1U3MFNEf7G32Gs10Z0s0NoiZ6PPP1TgsEVbRUFcmjr7Y";
const SHEET_RANGE = "PlayerData!A2:Z"; // adjust if necessary

// Initialize Google Sheets only if env variable exists
if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    const { google } = require("googleapis");
    const serviceAccountJSON = process.env.GOOGLE_SERVICE_ACCOUNT;

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(serviceAccountJSON),
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        });
        sheets = google.sheets({ version: "v4", auth });
    } catch (err) {
        console.error("❌ Failed to initialize Google Sheets:", err);
    }
} else {
    console.warn("⚠️ GOOGLE_SERVICE_ACCOUNT env variable is not set. Sheet data will be unavailable.");
}

// ====================== PlayerRoom ======================
exports.PlayerRoom = class PlayerRoom extends Room {

    onCreate(options) {
        console.log("PlayerRoom created");

        // Room state
        this.setState({
            players: {}  // all connected players
        });

        // Movement sync
        this.onMessage("move", (client, data) => {
            const p = this.state.players[client.sessionId];
            if (!p) return;

            p.x = parseFloat(data.x) || p.x;
            p.y = parseFloat(data.y) || p.y;
            p.vx = parseFloat(data.vx) || 0;
            p.vy = parseFloat(data.vy) || 0;
            p.moving = !!data.moving;
            p.lastDir = data.lastDir || p.lastDir;
            p.MapID = data.MapID || p.MapID;
        });

        // Attack sync
        this.onMessage("attack", (client, data) => {
            const p = this.state.players[client.sessionId];
            if (!p) return;

            p.attacking = true;
            p.attackAnimation = data.attackAnimation || p.attackAnimation;

            setTimeout(() => {
                if (p) p.attacking = false;
            }, 400);
        });
    }

    async onJoin(client, options) {
        console.log("Client joined:", client.sessionId);

        if (!options.email) {
            console.log("Missing email in options for client:", client.sessionId);
            client.leave();
            return;
        }

        let pdata = null;
        if (sheets) {
            try {
                pdata = await this.loadPlayerData(options.email);
            } catch (err) {
                console.error("Error loading player data:", err);
            }
        }

        if (!pdata) {
            console.warn("No sheet data found, using default values for player:", options.email);
            pdata = {}; // fallback to defaults
        }

        // Initialize player state
        this.state.players[client.sessionId] = {
            id: pdata.CharacterID || client.sessionId,
            name: pdata.CharacterName || "Unknown",
            class: pdata.CharacterClass || "Adventurer",
            x: parseFloat(pdata.PositionX) || 0,
            y: parseFloat(pdata.PositionY) || 0,
            MapID: pdata.MapID || 101,
            vx: 0,
            vy: 0,
            moving: false,
            lastDir: pdata.MovementAnimation || "IdleFront",
            attacking: false,
            attackAnimation: pdata.ImageURL_Attack_Right || pdata.ImageURL_Attack_Left || "",
            hp: parseInt(pdata.CurrentHP) || 100,
            maxHp: parseInt(pdata.MaxHP) || 100,
            mana: parseInt(pdata.CurrentMana) || 100,
            maxMana: parseInt(pdata.MaxMana) || 100,
            level: parseInt(pdata.Level) || 1,
            exp: parseInt(pdata.CurrentEXP) || 0,
            maxExp: parseInt(pdata.MaxEXP) || 100,
            speed: parseInt(pdata.Speed) || 5,
            images: {
                idleFront: pdata.ImageURL_IdleFront || "",
                idleBack: pdata.ImageURL_IdleBack || "",
                walkLeft: pdata.ImageURL_Walk_Left || "",
                walkRight: pdata.ImageURL_Walk_Right || "",
                walkUp: pdata.ImageURL_Walk_Up || "",
                walkDown: pdata.ImageURL_Walk_Down || "",
                attackLeft: pdata.ImageURL_Attack_Left || "",
                attackRight: pdata.ImageURL_Attack_Right || ""
            }
        };

        console.log(`Player ${this.state.players[client.sessionId].name} initialized.`);
    }

    async loadPlayerData(email) {
        if (!sheets) return null;

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) return null;

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
            row.forEach((val, i) => { if (keys[i]) obj[keys[i]] = val; });
            if (obj.Email === email) return obj;
        }

        return null;
    }

    onLeave(client, consented) {
        console.log("Client left:", client.sessionId);
        delete this.state.players[client.sessionId];
    }

    onDispose() {
        console.log("Disposing PlayerRoom");
    }
};
