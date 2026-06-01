require("dotenv").config();
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

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Load XML config
function loadXMLConfig() {
  const xml = fs.readFileSync("my-discord-pronoun-nickname.xml", "utf8");
  let parsed = null;

  xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
    if (err) throw err;
    parsed = result.config;
  });

  return parsed;
}

// When bot is ready
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const config = loadXMLConfig();
  const channelId = process.env.PRONOUN_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  const messageContent = config.message.content;
  const buttons = config.buttons.button;

// Build rows of buttons (3 per row)
const rows = [];
for (let i = 0; i < buttons.length; i += 3) {
  const row = new ActionRowBuilder();

  buttons.slice(i, i + 3).forEach((btn, index) => {
    const label = btn.$?.label?.trim() || "unknown";
    const value = btn.$?.value?.trim() || "unknown";

    // Generate safe, unique customId
    const baseId = value.replace(/\s+/g, "_").toLowerCase();
    const id = `${baseId}_${i + index}`;

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary)
    );
  });

  rows.push(row);
}



 // Send the message with buttons
  await channel.send({
    content: messageContent,
    components: rows,
  });

  console.log("Pronoun buttons posted.");
});

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const baseName = member.displayName.split("•")[0].trim();
  const selected = interaction.customId;

  let newNickname = baseName;

  if (selected !== "clear_pronouns") {
    newNickname = `${baseName} • ${selected}`;
  }

  if (newNickname.length > 32) {
    newNickname = newNickname.slice(0, 32);
  }

  try {
    await member.setNickname(newNickname);
    await interaction.reply({
      content: `Updated your pronouns to **${selected}**`,
      ephemeral: true,
    });
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: "I couldn't update your nickname. Check my role position.",
      ephemeral: true,
    });
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);
