import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildEmbed, buildButtonRows, buildPanelRow } from "@/lib/discord-payload";
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
    if (!target) throw new Error("حدّد معرّف القناة المستهدفة.");

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

export const publishTicketPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; channelId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { sendMessage } = await import("@/lib/discord-rest.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: panel } = await supabaseAdmin
      .from("ticket_panels")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!panel) throw new Error("اللوحة غير موجودة.");
    const target = data.channelId || panel.channel_id;
    if (!target) throw new Error("حدّد معرّف القناة المستهدفة.");

    const message = await sendMessage(target, {
      embeds: [buildEmbed(panel)],
      components: [buildPanelRow(panel.id, panel.button_label, panel.button_emoji)],
    });
    await supabaseAdmin
      .from("ticket_panels")
      .update({ channel_id: target, message_id: message.id })
      .eq("id", panel.id);
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

export const botHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const hasToken = Boolean(process.env["DISCORD_BOT_TOKEN"]);
    const hasKey = Boolean(process.env["DISCORD_PUBLIC_KEY"]);
    const hasApp = Boolean(process.env["DISCORD_APPLICATION_ID"]);
    let username: string | null = null;
    let error: string | null = null;
    if (hasToken) {
      try {
        const { discordFetch } = await import("@/lib/discord-rest.server");
        const me = await discordFetch<{ username: string }>("/users/@me");
        username = me.username;
      } catch (e) {
        error = (e as Error).message.slice(0, 200);
      }
    }
    return { hasToken, hasKey, hasApp, username, error };
  });
