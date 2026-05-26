// Run once after deploying: npx tsx workers/discord-bot/register-commands.ts
// Requires: DISCORD_APP_ID and DISCORD_BOT_TOKEN env vars

async function main() {
const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error("Set DISCORD_APP_ID and DISCORD_BOT_TOKEN");
  process.exit(1);
}

const commands = [
  {
    name: "discover",
    description: "Søg efter nye historier om danske atleter nu",
  },
  {
    name: "generate",
    description: "Generer artikeludkast fra fundne historier nu",
  },
  {
    name: "scrape",
    description: "Scrape hold-sider for nye danske atleter",
  },
  {
    name: "stats",
    description: "Send ugentlig statistik-digest med det samme",
  },
];

const res = await fetch(
  `https://discord.com/api/v10/applications/${APP_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (res.ok) {
  const data = await res.json();
  console.log(`Registered ${(data as unknown[]).length} commands:`);
  (data as Array<{ name: string }>).forEach((c) => console.log(`  /${c.name}`));
} else {
  console.error("Failed:", res.status, await res.text());
  process.exit(1);
}
}

main();
