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
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const { messageText, buttons } = await loadPronounConfig();

  // Build rows of buttons (3 per row)
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) {
    const row = new ActionRowBuilder();
    buttons.slice(i, i + 3).forEach((btn) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(btn.id)
          .setLabel(btn.label)
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(row);
  }

  // Post buttons to the configured channel
  const channelId = process.env.PRONOUN_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (channel) {
    await channel.send({ content: messageText, components: rows });
    console.log("Pronoun buttons posted.");
  } else {
    console.error("Channel not found. Check PRONOUN_CHANNEL_ID.");
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.deferReply({ ephemeral: true }); // <-- prevents ALL interaction failures

  const { buttons } = await loadPronounConfig();
  const selected = buttons.find((b) => b.id === interaction.customId);

  if (!selected) {
    return interaction.editReply("Unknown button.");
  }

  const selectedPronouns = selected.value;

  // Build nickname
  const baseName = interaction.member.displayName.split(" • ")[0].split("(")[0].trim();
  let newNickname = `${baseName} • ${selectedPronouns}`;

  // Enforce Discord's 32‑character limit
  if (newNickname.length > 32) {
    newNickname = newNickname.slice(0, 32);
  }

  try {
    await interaction.member.setNickname(newNickname);

    return interaction.editReply(
      `Your pronouns have been set to **${selectedPronouns}**!`
    );
  } catch (error) {
    console.error("Nickname update failed:", error);

    return interaction.editReply(
      "I couldn't update your nickname. Please check my permissions in this server."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
