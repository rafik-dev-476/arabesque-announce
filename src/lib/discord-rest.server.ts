const API = "https://discord.com/api/v10";

export function botToken(): string {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) throw new Error("DISCORD_BOT_TOKEN MTM1NTcwMzg1ODU3MTEyMDY1MA.GqED6c.-lq8N7WaYaXYGURmfuJUEFlunFWbQKsZgecOGo");
  return token;
}

export async function discordFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text.slice(0, 400)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function sendMessage(channelId: string, payload: Record<string, unknown>) {
  return discordFetch<{ id: string }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getGuild(guildId: string) {
  return discordFetch<Record<string, unknown>>(`/guilds/${guildId}?with_counts=true`);
}

export function getGuildChannels(guildId: string) {
  return discordFetch<Array<Record<string, unknown>>>(`/guilds/${guildId}/channels`);
}

export function createChannel(guildId: string, payload: Record<string, unknown>) {
  return discordFetch<{ id: string; name: string }>(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteChannel(channelId: string) {
  return discordFetch(`/channels/${channelId}`, { method: "DELETE" });
}

export function getChannelMessages(channelId: string, limit = 100) {
  return discordFetch<Array<Record<string, unknown>>>(
    `/channels/${channelId}/messages?limit=${limit}`,
  );
}

/** Registers the slash commands for the application (guild-scoped when provided). */
export function registerCommands(applicationId: string, guildId: string | null) {
  const commands = [
    {
      name: "announce",
      description: "نشر إعلان جاهز في قناة محددة",
      options: [
        {
          type: 3,
          name: "template",
          description: "الإعلان المحفوظ",
          required: true,
          autocomplete: true,
        },
        {
          type: 7,
          name: "channel",
          description: "القناة المستهدفة (اختياري)",
          required: false,
          channel_types: [0, 5],
        },
      ],
    },
    {
      name: "ticket",
      description: "نشر لوحة تذاكر أو عرض معلومات التذكرة الحالية",
      options: [
        {
          type: 3,
          name: "panel",
          description: "لوحة التذاكر المحفوظة",
          required: false,
          autocomplete: true,
        },
        {
          type: 7,
          name: "channel",
          description: "القناة المستهدفة (اختياري)",
          required: false,
          channel_types: [0, 5],
        },
      ],
    },
    {
      name: "serverinfo",
      description: "عرض معلومات السيرفر أو عضو محدد",
      options: [
        { type: 6, name: "user", description: "عضو محدد (اختياري)", required: false },
      ],
    },
  ];
  const path = guildId
    ? `/applications/${applicationId}/guilds/${guildId}/commands`
    : `/applications/${applicationId}/commands`;
  return discordFetch(path, { method: "PUT", body: JSON.stringify(commands) });
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

/** Verifies the Ed25519 signature Discord sends with every interaction. */
export async function verifyDiscordSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string,
): Promise<boolean> {
  if (!signature || !timestamp) return false;
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
      new TextEncoder().encode(timestamp + rawBody),
    );
  } catch {
    return false;
  }
}
