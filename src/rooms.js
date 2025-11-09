const { Room, Schema, type, MapSchema } = require("colyseus");

class Player extends Schema {
  @type("string") Email = "";
  @type("string") PlayerName = "";
  @type("string") CharacterID = "";
  @type("string") CharacterName = "";
  @type("string") CharacterClass = "";
  @type("number") PositionX = 0;
  @type("number") PositionY = 0;
  @type("string") MovementAnimation = "IdleFront";
}

class MMORPGRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema();
}

exports.MMORPGRoom = class MMORPGRoom extends Room {
  onCreate(options) {
    console.log("🌍 MMORPGRoom created!");

    this.setState(new MMORPGRoomState());

    this.onMessage("join", (client, data) => {
      if (!this.state.players[client.sessionId]) {
        const p = new Player();
        Object.assign(p, data);
        this.state.players[client.sessionId] = p;
        console.log(`✅ Player joined: ${p.PlayerName}`);
      }
    });

    this.onMessage("move", (client, data) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      player.PositionX = data.x;
      player.PositionY = data.y;
      player.MovementAnimation = data.anim; // e.g., "WalkLeft", "IdleFront"
    });

    this.onMessage("attack", (client, data) => {
      const player = this.state.players[client.sessionId];
      if (!player) return;

      player.MovementAnimation = `Attack_${data.direction}`; // "Attack_Left", "Attack_Right" etc.
    });
  }

  onJoin(client, options) {
    console.log(`🔑 Player connected: ${client.sessionId}`);
  }

  onLeave(client, consented) {
    console.log(`❌ Player left: ${client.sessionId}`);
    delete this.state.players[client.sessionId];
  }
};
