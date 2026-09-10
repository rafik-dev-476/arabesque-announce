import { createFileRoute } from "@tanstack/react-router";

import { buildEmbed, buildButtonRows } from "@/lib/discord-payload";
import { hexToInt, type EmbedButton } from "@/lib/announcement-types";
import {
  createTextChannel,
  deleteChannel,
  DISCORD_PERMISSION,
  getMe,
  sendMessage,
  verifyDiscordSignature,
} from "@/lib/discord-rest.server";
import { DISCORD_PUBLIC_KEY } from "@/lib/discord-config";

const EPHEMERAL = 64;

type Json = any;

function reply(content: string, ephemeral = true): Response {
  return Response.json({
    type: 4,
    data: { content, flags: ephemeral ? EPHEMERAL : 0 },
  });
}

function replyEmbed(embed: Json, ephemeral = true): Response {
  return Response.json({
    type: 4,
    data: { embeds: [embed], flags: ephemeral ? EPHEMERAL : 0 },
  });
}

function optionValue(options: Json[] | undefined, name: string) {
  return options?.find((o) => o.name === name)?.value as string | undefined;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------ /announcement ----------------------------- */

async function handleCommand(interaction: Json) {
  const data = interaction.data as Json;
  if (data.name !== "announcement") return reply("أمر غير معروف.");

  const options = data.options as Json[] | undefined;
  const id = optionValue(options, "announcement");
  const supabase = await db();
  const { data: ann } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id ?? "")
    .maybeSingle();
  if (!ann) return reply("لم يتم العثور على الإعلان المحدد.");

  const target =
    optionValue(options, "room") ?? ann.default_channel_id ?? interaction.channel_id;
  if (!target) return reply("حدّد الروم التي سيُنشر فيها الإعلان.");

  const description = optionValue(options, "description");
  const thumbnail = optionValue(options, "thumbnail");

  try {
    await sendMessage(target, {
      embeds: [
        buildEmbed({
          ...ann,
          ...(description ? { body: description } : {}),
          ...(thumbnail ? { thumbnail_url: thumbnail } : {}),
        }),
      ],
      components: buildButtonRows(ann.id, (ann.buttons ?? []) as unknown as EmbedButton[]),
    });
  } catch (e) {
    return reply(`فشل النشر: ${(e as Error).message}`);
  }

  await supabase
    .from("announcements")
    .update({ last_published_at: new Date().toISOString() })
    .eq("id", ann.id);
  return reply(`تم نشر الإعلان في <#${target}> ✅`);
}

async function handleAutocomplete(interaction: Json) {
  const supabase = await db();
  const focused = (interaction.data?.options as Json[])?.find((o) => o.focused);
  const query = String(focused?.value ?? "");
  const { data: rows } = await supabase
    .from("announcements")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(25);
  return Response.json({
    type: 8,
    data: { choices: (rows ?? []).map((r: Json) => ({ name: r.name, value: r.id })) },
  });
}

async function handleComponent(interaction: Json) {
  const customId = String(interaction.data?.custom_id ?? "");
  const [kind, annId, buttonId] = customId.split(":");
  if (kind !== "ab") return reply("هذا الزر لم يعد متاحاً.");

  const supabase = await db();
  const { data: ann } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", annId ?? "")
    .maybeSingle();
  const button = ((ann?.buttons ?? []) as unknown as EmbedButton[]).find((b) => b.id === buttonId);
  if (!button) return reply("هذا الزر لم يعد متاحاً.");

  if (button.action === "ticket") {
    return openTicket(interaction, button);
  }

  if (button.action === "info") {
    return replyEmbed(
      {
        title: button.responseTitle || button.label,
        description: button.responseText || "",
        color: hexToInt(ann?.color ?? "#5865F2"),
      },
      button.ephemeral !== false,
    );
  }
  return reply(button.responseText || "تم تسجيل طلبك ✅", button.ephemeral !== false);
}

async function openTicket(interaction: Json, button: EmbedButton) {
  const guildId = String(interaction.guild_id ?? "");
  const member = interaction.member?.user ?? interaction.user ?? {};
  const userId = String(member.id ?? "");
  const username = String(member.global_name ?? member.username ?? userId);

  if (!guildId || !userId) {
    return reply("لا يمكن فتح تذكرة من خارج السيرفر أو بدون معرفة العضو.");
  }

  const supabase = await db();
  const { data: existing, error: existingError } = await supabase
    .from("tickets")
    .select("channel_id, number")
    .eq("guild_id", guildId)
    .eq("opener_discord_id", userId)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error("تعذر التحقق من التذاكر المفتوحة في قاعدة البيانات.");
  if (existing?.channel_id) {
    return reply(`لديك تذكرة مفتوحة بالفعل: <#${existing.channel_id}>`);
  }

  const [{ data: settings, error: settingsError }, bot] = await Promise.all([
    supabase
      .from("guild_settings")
      .select("staff_role_id, ticket_category_id, welcome_text, terms_text")
      .eq("guild_id", guildId)
      .limit(1)
      .maybeSingle(),
    getMe(),
  ]);

  if (settingsError) throw new Error("تعذر قراءة إعدادات التذاكر من قاعدة البيانات.");

  const viewSendRead =
    DISCORD_PERMISSION.VIEW_CHANNEL |
    DISCORD_PERMISSION.SEND_MESSAGES |
    DISCORD_PERMISSION.EMBED_LINKS |
    DISCORD_PERMISSION.ATTACH_FILES |
    DISCORD_PERMISSION.READ_MESSAGE_HISTORY;
  const staffPermissions = viewSendRead | DISCORD_PERMISSION.MANAGE_MESSAGES;
  const channelName = `order-${username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || userId.slice(-8)}`;
  const overwrites = [
    {
      id: guildId,
      type: 0,
      allow: "0",
      deny: String(DISCORD_PERMISSION.VIEW_CHANNEL),
    },
    {
      id: userId,
      type: 1,
      allow: String(viewSendRead),
      deny: "0",
    },
    ...(settings?.staff_role_id
      ? [
          {
            id: settings.staff_role_id,
            type: 0,
            allow: String(staffPermissions),
            deny: "0",
          },
        ]
      : []),
    {
      id: bot.id,
      type: 1,
      allow: String(staffPermissions),
      deny: "0",
    },
  ];

  const channel = await createTextChannel(guildId, {
    name: channelName,
    parent_id: settings?.ticket_category_id || undefined,
    permission_overwrites: overwrites,
    reason: `Order ticket for ${username}`,
  });

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      guild_id: guildId,
      channel_id: channel.id,
      topic: button.topic || null,
      subject: button.label,
      opener_discord_id: userId,
      opener_username: username,
      status: "open",
    })
    .select("id, number")
    .single();

  if (ticketError || !ticket) {
    try {
      await deleteChannel(channel.id);
    } catch (cleanupError) {
      console.error("failed to remove orphaned ticket channel", cleanupError);
    }
    throw new Error("تعذر حفظ التذكرة. لم يتم ترك قناة تذكرة معلّقة.");
  }

  const messageParts = [
    `<@${userId}> تم فتح طلبك رقم #${ticket.number}.`,
    settings?.welcome_text?.trim(),
    button.topic?.trim() ? `نوع الطلب: ${button.topic.trim()}` : null,
    settings?.terms_text?.trim() ? `\n${settings.terms_text.trim()}` : null,
  ].filter(Boolean);

  try {
    await sendMessage(channel.id, {
      content: messageParts.join("\n"),
      allowed_mentions: { users: [userId] },
    });
  } catch (messageError) {
    console.error("ticket channel created but welcome message failed", messageError);
    throw new Error(`تم إنشاء التذكرة <#${channel.id}> لكن تعذر إرسال رسالة الترحيب.`);
  }

  return reply(`تم فتح تذكرتك بنجاح: <#${channel.id}> ✅`);
}

export const Route = createFileRoute("/api/public/discord/interactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const valid = await verifyDiscordSignature(
          rawBody,
          request.headers.get("x-signature-ed25519"),
          request.headers.get("x-signature-timestamp"),
          process.env["DISCORD_PUBLIC_KEY"] || DISCORD_PUBLIC_KEY,
        );
        if (!valid) return new Response("invalid request signature", { status: 401 });

        let interaction: Json;
        try {
          interaction = JSON.parse(rawBody) as Json;
        } catch {
          return new Response("invalid JSON", { status: 400 });
        }
        try {
          if (interaction.type === 1) return Response.json({ type: 1 });
          if (interaction.type === 2) return await handleCommand(interaction);
          if (interaction.type === 3) return await handleComponent(interaction);
          if (interaction.type === 4) return await handleAutocomplete(interaction);
        } catch (error) {
          console.error("discord interaction failed", error);
          return reply(`حدث خطأ: ${(error as Error).message.slice(0, 300)}`);
        }
        return reply("غير مدعوم");
      },
    },
  },
});
