// 🌪️ Sky Brawl: the battle server for this game (the engine is in ./shared, from kittyhome-shared).
import { startBattleServer } from "./shared/battle/server.js";

await startBattleServer("brawl", { port: 5203 });
