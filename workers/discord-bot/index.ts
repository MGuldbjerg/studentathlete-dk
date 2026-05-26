export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APP_ID: string;
  GITHUB_PAT: string;
  DISCORD_WEBHOOK_URL: string;
}

const GITHUB_REPO = "MGuldbjerg/studentathlete-dk";

const WORKFLOWS: Record<string, { file: string; label: string }> = {
  discover: { file: "discover-daily.yml", label: "Discovery (finder nye historier)" },
  generate: { file: "generate-manual.yml", label: "Artikelgenerering" },
  scrape: { file: "weekly-scrape.yml", label: "Roster-scraping" },
  stats: { file: "weekly-digest.yml", label: "Ugentlig statistik" },
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifySignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    );
  } catch {
    return false;
  }
}

async function triggerWorkflow(workflowFile: string, pat: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "studentathlete-discord-bot/1.0",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );
  const body = await res.text();
  return { ok: res.status === 204, status: res.status, body };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const signature = request.headers.get("x-signature-ed25519") ?? "";
    const timestamp = request.headers.get("x-signature-timestamp") ?? "";
    const body = await request.text();

    const valid = await verifySignature(env.DISCORD_PUBLIC_KEY, signature, timestamp, body);
    if (!valid) return new Response("Unauthorized", { status: 401 });

    const interaction = JSON.parse(body);

    // Discord endpoint verification ping
    if (interaction.type === 1) {
      return jsonResponse({ type: 1 });
    }

    // Slash command
    if (interaction.type === 2) {
      const command = interaction.data.name as string;
      const workflow = WORKFLOWS[command];

      if (!workflow) {
        return jsonResponse({
          type: 4,
          data: { content: `Ukendt kommando: \`/${command}\`` },
        });
      }

      const result = await triggerWorkflow(workflow.file, env.GITHUB_PAT);

      if (result.ok) {
        return jsonResponse({
          type: 4,
          data: {
            embeds: [
              {
                title: `▶️ ${workflow.label} startet`,
                description: `Workflow kører nu. Du får besked når det er færdigt.\n[Se fremgang](https://github.com/${GITHUB_REPO}/actions)`,
                color: 5793266,
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });
      } else {
        return jsonResponse({
          type: 4,
          data: {
            embeds: [
              {
                title: "❌ Kunne ikke starte workflow",
                description: `GitHub API svarede **${result.status}**:\n\`\`\`${result.body.slice(0, 300)}\`\`\``,
                color: 15158332,
              },
            ],
          },
        });
      }
    }

    return jsonResponse({ error: "Unknown interaction type" }, 400);
  },
};
