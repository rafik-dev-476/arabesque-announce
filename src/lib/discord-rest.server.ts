const API = "https://discord.com/api/v10";

/**
 * Bot token resolution order:
 * 1. DISCORD_BOT_TOKEN environment variable (hosting).
 * 2. The token saved by the owner from the dashboard (server-only table).
 */
export async function botToken(): Promise<string> {
  const fromEnv = process.env["DISCORD_BOT_TOKEN"];
  if (fromEnv) return fromEnv;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("bot_config")
    .select("bot_token")
    .not("bot_token", "is", null)
    .limit(1)
    .maybeSingle();
  if (data?.bot_token) return data.bot_token;
  throw new Error("رمز البوت غير محفوظ. افتح صفحة «رمز البوت» وضع الرمز ثم أعد المحاولة.");
}

export async function discordFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await botToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error("رمز البوت غير صحيح أو منتهي. حدّثه من صفحة «رمز البوت».");
    }
    if (res.status === 403) {
      throw new Error("البوت لا يملك صلاحية الكتابة في هذه القناة. أضف الصلاحيات ثم أعد المحاولة.");
    }
    if (res.status === 404) {
      throw new Error("معرّف القناة غير صحيح أو البوت لا يرى هذه القناة.");
    }
    throw new Error(`Discord API ${res.status}: ${text.slice(0, 300)}`);
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

export function getMe() {
  return discordFetch<{ username: string; id: string }>("/users/@me");
}

/** Sends the final answer for a deferred interaction (no bot token needed). */
export async function followUp(
  applicationId: string,
  interactionToken: string,
  payload: Record<string, unknown>,
) {
  await fetch(
    `${API}/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

/** Registers the single slash command: /announcement */
export function registerCommands(applicationId: string, guildId: string | null) {
  const commands = [
    {
      name: "announcement",
      description: "نشر إعلان محفوظ في قناة محددة",
      options: [
        {
          type: 3,
          name: "announcement",
          description: "الإعلان المحفوظ",
          required: true,
          autocomplete: true,
        },
        {
          type: 7,
          name: "room",
          description: "الروم (القناة) التي يُنشر فيها الإعلان",
          required: false,
          channel_types: [0, 5],
        },
        {
          type: 3,
          name: "description",
          description: "وصف بديل يظهر داخل الإعلان (اختياري)",
          required: false,
        },
        {
          type: 3,
          name: "thumbnail",
          description: "رابط صورة مصغّرة (اختياري)",
          required: false,
        },
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
