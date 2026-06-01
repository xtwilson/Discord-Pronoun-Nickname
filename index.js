require("dotenv").config();
require("./health");

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const fs = require("fs");
const xml2js = require("xml2js");

// Load XML config (message + buttons)
async function loadPronounConfig() {
  const xml = fs.readFileSync("my-discord-pronoun-nickname.xml", "utf8");
  const parsed = await xml2js.parseStringPromise(xml);

  const messageText = parsed.config.message[0].content[0];
  const buttons = parsed.config.buttons[0].button.map((btn) => ({
    label: btn.$.label,
    value: btn.$.value,
  }));

  return { messageText, buttons };
}

// Build 3 rows of pronoun buttons (updated layout)
function buildPronounRows(buttons) {
  const rows = [];

  // Row 1: she/her, he/him, they/them
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buttons[0].value)
        .setLabel(buttons[0].label)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttons[1].value)
        .setLabel(buttons[1].label)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttons[2].value)
        .setLabel(buttons[2].label)
        .setStyle(ButtonStyle.Primary)
    )
  );

  // Row 2: she/they, he/they, any pronouns
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buttons[3].value)
        .setLabel(buttons[3].label)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttons[4].value)
        .setLabel(buttons[4].label)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttons[5].value)
        .setLabel(buttons[5].label)
        .setStyle(ButtonStyle.Primary)
    )
  );

  // Row 3: ask me, use my name, clear pronouns
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buttons[6].value)
        .setLabel(buttons[6].label)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttons[7].value)
        .setLabel(buttons[7].label)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttons[8].value)
        .setLabel(buttons[8].label)
        .setStyle(ButtonStyle.Danger)
    )
  );

  return rows;
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

// Post pronoun buttons on startup
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channelId = process.env.CHANNEL_ID;
  if (!channelId) {
    console.error("CHANNEL_ID is missing in environment variables.");
    return;
  }

  const channel = await client.channels.fetch(channelId);

  const { messageText, buttons } = await loadPronounConfig();
  const rows = buildPronounRows(buttons);

  await channel.send({
    content: messageText,
    components: rows,
  });

  console.log("Pronoun buttons posted.");
});

// Handle button clicks
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const pronouns = interaction.customId;
  const member = interaction.member;

  const baseName = member.displayName.split(" [")[0];

  // Clear pronouns
  if (pronouns === "clear_pronouns") {
    try {
      await member.setNickname(baseName);
      await interaction.reply({
        content: `Your pronouns have been cleared.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content:
          "I couldn't update your nickname. Please check my permissions.",
        ephemeral: true,
      });
    }
    return;
  }

// Build the new nickname
let newNickname = `${baseName} • ${selectedPronouns}`;

// Discord nickname limit is 32 characters
if (newNickname.length > 32) {
    newNickname = newNickname.slice(0, 32);
}

try {
    await interaction.member.setNickname(newNickname);
    await interaction.reply({
        content: `Your pronouns have been set to **${selectedPronouns}**!`,
        ephemeral: true
    });
} catch (error) {
    console.error("Failed to update nickname:", error);
    await interaction.reply({
        content: "I couldn't update your nickname. Please check my permissions in this server.",
        ephemeral: true
    });
  }
});

// Login
client.login(process.env.TOKEN);
