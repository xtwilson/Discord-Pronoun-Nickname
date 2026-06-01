require("dotenv").config();
require("./health");

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const fs = require("fs");
const xml2js = require("xml2js");

// Load XML config
async function loadPronounConfig() {
  const xml = fs.readFileSync("my-discord-pronoun-nickname.xml", "utf8");
  const parsed = await xml2js.parseStringPromise(xml);

  const messageText = parsed.config.message[0].content[0];
  const buttons = parsed.config.buttons[0].button.map((btn) => ({
    id: btn.$.id,
    label: btn.$.label,
    value: btn.$.value,
  }));

  return { messageText, buttons };
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

// When bot is ready
client.once(Events.ClientReady, async
