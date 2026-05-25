#!/usr/bin/env node

import { parseArgs } from "node:util";
import { WebSocket } from "ws";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";
import { randomUUID } from "crypto";
import pc from "picocolors";

// --- CLI Parsing ---

const { values } = parseArgs({
  options: {
    room: { type: "string", short: "r" },
    users: { type: "string", short: "n", default: "5" },
    url: { type: "string", short: "u", default: "http://localhost:5173" },
    "auto-vote": { type: "boolean", default: false },
    "vote-delay": { type: "string", default: "3000" },
    stagger: { type: "string", default: "500" },
    "leave-random": { type: "boolean", default: false },
    quiet: { type: "boolean", short: "q", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: node simulate.js [options]

Options:
  --room, -r <id>     Join an existing room (creates a new one if omitted)
  --users, -n <n>     Number of bots to connect (default: 5)
  --url, -u <url>     Server URL (default: http://localhost:5173)
  --auto-vote         Bots vote automatically on each new round
  --vote-delay <ms>   Max random delay before voting (default: 3000)
  --stagger <ms>      Delay between each bot connection (default: 500)
  --leave-random      Bots randomly disconnect and reconnect
  --quiet, -q         Less output
  --help, -h          Show this help
`);
  process.exit(0);
}

const config = {
  room: values.room || null,
  users: parseInt(values.users, 10),
  url: values.url.replace(/\/$/, ""),
  autoVote: values["auto-vote"],
  voteDelay: parseInt(values["vote-delay"], 10),
  stagger: parseInt(values.stagger, 10),
  leaveRandom: values["leave-random"],
  quiet: values.quiet,
};

// --- Helpers ---

const MOODS = ["🦊", "🐱", "🐶", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐔", "🐧", "🐦", "🦄", "🐝", "🐙", "🦀", "🐬", "🦋", "🐢"];

function generateName() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: " ",
    style: "capital",
    length: 2,
  });
}

function randomMood() {
  return MOODS[Math.floor(Math.random() * MOODS.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg) {
  if (!config.quiet) {
    console.log(pc.dim(`[simulate]`) + ` ${msg}`);
  }
}

// --- Room Creation ---

async function createRoom(adminUserId) {
  let res;
  try {
    res = await fetch(`${config.url}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId: adminUserId, roomTitle: "Simulation Room" }),
    });
  } catch (err) {
    throw new Error(`Cannot connect to ${config.url} — is the server running? (npm run dev)`);
  }
  if (!res.ok) {
    throw new Error(`Failed to create room: ${res.status} ${await res.text()}`);
  }
  const { roomId } = await res.json();
  return roomId;
}

// --- Bot ---

class Bot {
  constructor(roomId, index) {
    this.roomId = roomId;
    this.index = index;
    this.userId = randomUUID();
    this.name = generateName();
    this.mood = randomMood();
    this.publicId = null;
    this.ws = null;
    this.currentRoundId = null;
    this.deck = [];
    this.voted = false;
    this.connected = false;
  }

  connect() {
    const wsUrl = `${config.url.replace(/^http/, "ws")}/api/rooms/${this.roomId}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on("open", () => {
      this.connected = true;
      this.ws.send(JSON.stringify({
        type: "USER_JOIN",
        userId: this.userId,
        name: this.name,
        mood: this.mood,
      }));
      log(pc.green(`Bot #${this.index} "${this.name}" ${this.mood} connected`));
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (e) {
        // ignore parse errors
      }
    });

    this.ws.on("close", () => {
      this.connected = false;
    });

    this.ws.on("error", (err) => {
      if (!config.quiet) {
        console.error(pc.red(`Bot #${this.index} error: ${err.message}`));
      }
    });
  }

  handleMessage(msg) {
    if (msg.type === "JOINED") {
      this.publicId = msg.publicId;
    } else if (msg.type === "STATE") {
      const state = msg.payload;
      this.deck = state.deck || [];

      // Detect new round
      let currentRound = null;
      if (state.currentTaskId) {
        const task = state.tasks?.find((t) => t.id === state.currentTaskId);
        if (task && task.rounds.length > 0) {
          currentRound = task.rounds[task.rounds.length - 1];
        }
      } else {
        currentRound = state.unassociatedRound;
      }

      if (currentRound && currentRound.id !== this.currentRoundId) {
        this.currentRoundId = currentRound.id;
        this.voted = false;

        if (config.autoVote && !currentRound.revealed) {
          this.scheduleVote();
        }
      }
    }
  }

  scheduleVote() {
    if (this.voted || this.deck.length === 0) return;
    const delay = Math.floor(Math.random() * config.voteDelay);
    setTimeout(() => {
      if (!this.voted && this.connected && this.ws?.readyState === WebSocket.OPEN) {
        const card = this.deck[Math.floor(Math.random() * this.deck.length)];
        this.ws.send(JSON.stringify({ type: "USER_VOTE", vote: card }));
        this.voted = true;
        log(pc.blue(`Bot #${this.index} "${this.name}" voted ${card}`));
        printStatus();
      }
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}

// --- Status Display ---

const bots = [];

function printStatus() {
  const connected = bots.filter((b) => b.connected).length;
  const voted = bots.filter((b) => b.voted).length;
  if (!config.quiet) {
    process.stdout.write(`\r${pc.dim("[status]")} ${pc.cyan(`${connected}/${config.users}`)} connected, ${pc.cyan(`${voted}/${config.users}`)} voted   `);
  }
}

// --- Leave Random ---

function startLeaveRandom() {
  const interval = setInterval(() => {
    const activeBots = bots.filter((b) => b.connected);
    if (activeBots.length <= 1) return;

    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
    log(pc.yellow(`\nBot #${bot.index} "${bot.name}" leaving temporarily...`));
    bot.disconnect();

    // Rejoin after 3-8 seconds
    const rejoinDelay = 3000 + Math.floor(Math.random() * 5000);
    setTimeout(() => {
      if (!bot.connected) {
        log(pc.green(`Bot #${bot.index} "${bot.name}" rejoining...`));
        bot.connect();
      }
    }, rejoinDelay);
  }, 5000 + Math.floor(Math.random() * 10000));

  return interval;
}

// --- Main ---

async function main() {
  let roomId = config.room;

  if (!roomId) {
    const adminUserId = randomUUID();
    roomId = await createRoom(adminUserId);
    console.log(`\n✨ Room created: ${roomId}`);
    console.log(`🔗 Open in browser: ${config.url}/room/${roomId}\n`);
  } else {
    console.log(`\n🔗 Joining room: ${roomId}`);
    console.log(`🔗 Open in browser: ${config.url}/room/${roomId}\n`);
  }

  // Connect bots with stagger
  for (let i = 0; i < config.users; i++) {
    const bot = new Bot(roomId, i + 1);
    bots.push(bot);
    bot.connect();
    if (i < config.users - 1) {
      await sleep(config.stagger);
    }
  }

  console.log(`\n${config.users} bots connecting...`);
  if (config.autoVote) {
    console.log(`Auto-vote enabled (max delay: ${config.voteDelay}ms)`);
  }
  console.log(`Press Ctrl+C to stop\n`);

  // Leave random mode
  let leaveInterval = null;
  if (config.leaveRandom) {
    leaveInterval = startLeaveRandom();
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\nShutting down...");
    if (leaveInterval) clearInterval(leaveInterval);
    for (const bot of bots) {
      bot.disconnect();
    }
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
