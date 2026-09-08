import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildEmbed, buildButtonRows } from "@/lib/discord-payload";
import type { EmbedButton } from "@/lib/announcement-types";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("هذه العملية متاحة لمالك اللوحة فقط.");
}

export const publishAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; channelId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { sendMessage } = await import("@/lib/discord-rest.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ann } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!ann) throw new Error("الإعلان غير موجود.");

    const target = data.channelId || ann.default_channel_id;
    if (!target) throw new Error("حدّد معرّف الروم المستهدفة.");

    await sendMessage(target, {
      embeds: [buildEmbed(ann)],
      components: buildButtonRows(ann.id, (ann.buttons ?? []) as unknown as EmbedButton[]),
    });
    await supabaseAdmin
      .from("announcements")
      .update({ last_published_at: new Date().toISOString() })
      .eq("id", ann.id);
    return { ok: true, channelId: target };
  });

export const syncSlashCommands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { guildId?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { registerCommands } = await import("@/lib/discord-rest.server");
    const appId = process.env["DISCORD_APPLICATION_ID"];
    if (!appId) throw new Error("DISCORD_APPLICATION_ID غير مضبوط.");
    await registerCommands(appId, data.guildId?.trim() || null);
    return { ok: true, scope: data.guildId ? "guild" : "global" };
  });

/** Saves the bot token securely (server-only table, never readable from the browser). */
export const saveBotToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const token = data.token.trim();
    if (token.length < 40) throw new Error("رمز البوت يبدو غير صحيح.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { discordFetch } = await import("@/lib/discord-rest.server");

    // Validate the token against Discord before storing it.
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) throw new Error("رفض ديسكورد هذا الرمز. تأكد أنك نسخت Bot Token كاملاً.");
    const me = (await res.json()) as { username: string };

    const { data: row } = await supabaseAdmin.from("bot_config").select("id").limit(1).maybeSingle();
    if (row?.id) {
      await supabaseAdmin
        .from("bot_config")
        .update({ bot_token: token, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    } else {
      await supabaseAdmin.from("bot_config").insert({ bot_token: token });
    }
    void discordFetch;
    return { ok: true, username: me.username };
  });

export const clearBotToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("bot_config")
      .update({ bot_token: null, updated_at: new Date().toISOString() })
      .not("bot_token", "is", null);
    return { ok: true };
  });

export const botHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("bot_config")
      .select("bot_token, updated_at")
      .not("bot_token", "is", null)
      .limit(1)
      .maybeSingle();

    const hasEnvToken = Boolean(process.env["DISCORD_BOT_TOKEN"]);
    const hasToken = hasEnvToken || Boolean(row?.bot_token);
    const hasKey = Boolean(process.env["DISCORD_PUBLIC_KEY"]);
    const hasApp = Boolean(process.env["DISCORD_APPLICATION_ID"]);

    let username: string | null = null;
    let error: string | null = null;
    if (hasToken) {
      try {
        const { getMe } = await import("@/lib/discord-rest.server");
        username = (await getMe()).username;
      } catch (e) {
        error = (e as Error).message.slice(0, 200);
      }
    }
    return {
      hasToken,
      hasKey,
      hasApp,
      username,
      error,
      source: hasEnvToken ? "env" : row?.bot_token ? "dashboard" : null,
      updatedAt: row?.updated_at ?? null,
    };
  });
