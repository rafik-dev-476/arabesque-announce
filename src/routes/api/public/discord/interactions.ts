import { createFileRoute } from "@tanstack/react-router";

import {
  buildEmbed,
  buildButtonRows,
  buildPanelRow,
  buildTopicSelect,
  buildTicketControls,
} from "@/lib/discord-payload";
import { hexToInt, type EmbedButton, type TicketTopic } from "@/lib/announcement-types";
import {
  verifyDiscordSignature,
  discordFetch,
  sendMessage,
  createChannel,
  getGuild,
  getChannelMessages,
} from "@/lib/discord-rest.server";

const EPHEMERAL = 64;

type Json = Record<string, any>;

function reply(content: string, ephemeral = true): Response {
  return Response.json({
    type: 4,
    data: { content, flags: ephemeral ? EPHEMERAL : 0 },
  });
}

function replyEmbed(embed: Json, ephemeral = true, components: Json[] = []): Response {
  return Response.json({
    type: 4,
    data: { embeds: [embed], components, flags: ephemeral ? EPHEMERAL : 0 },
  });
}

function optionValue(options: Json[] | undefined, name: string) {
  return options?.find((o) => o.name === name)?.value as string | undefined;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function settings() {
  const db = await admin();
  const { data } = await db.from("guild_settings").select("*").limit(1).maybeSingle();
  return data;
}

/* ------------------------------- tickets --------------------------------- */

async function createTicket(panel: Json, interaction: Json, topicId?: string) {
  const db = await admin();
  const guildId = interaction.guild_id as string;
  const member = interaction.member?.user ?? interaction.user;
  if (!guildId || !member) return reply("هذا الإجراء متاح داخل السيرفر فقط.");

  const config = await settings();
  const topics = (panel.topics ?? []) as TicketTopic[];
  const topic = topics.find((t) => t.id === topicId);

  const { data: existing } = await db
    .from("tickets")
    .select("channel_id")
    .eq("opener_discord_id", member.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (existing?.channel_id) {
    return reply(`لديك تذكرة مفتوحة بالفعل: <#${existing.channel_id}>`);
  }

  const { data: ticket, error } = await db
    .from("tickets")
    .insert({
      panel_id: panel.id,
      guild_id: guildId,
      topic: topic?.label ?? null,
      opener_discord_id: member.id,
      opener_username: member.username,
      status: "open",
    })
    .select()
    .single();
  if (error || !ticket) return reply("تعذّر إنشاء التذكرة، حاول لاحقاً.");

  const staffRoleId = (panel.staff_role_id as string) ?? config?.staff_role_id ?? null;
  const categoryId = (panel.category_id as string) ?? config?.ticket_category_id ?? null;

  const overwrites: Json[] = [
    { id: guildId, type: 0, deny: "1024" },
    { id: member.id, type: 1, allow: "101376" },
  ];
  if (staffRoleId) overwrites.push({ id: staffRoleId, type: 0, allow: "101376" });

  let channel: { id: string };
  try {
    channel = await createChannel(guildId, {
      name: `ticket-${ticket.number}`,
      type: 0,
      ...(categoryId ? { parent_id: categoryId } : {}),
      topic: `تذكرة #${ticket.number} — ${member.username}`,
      permission_overwrites: overwrites,
    });
  } catch (e) {
    await db.from("tickets").delete().eq("id", ticket.id);
    return reply(`تعذّر إنشاء قناة التذكرة: ${(e as Error).message}`);
  }

  await db.from("tickets").update({ channel_id: channel.id }).eq("id", ticket.id);

  const welcome = (panel.welcome_text as string) || config?.welcome_text || "";
  const terms = (panel.terms_text as string) || config?.terms_text || "";
  const description = [
    welcome,
    topic ? `**التصنيف:** ${topic.label}` : "",
    terms ? `\n**الشروط:**\n${terms}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  await sendMessage(channel.id, {
    content: `<@${member.id}>${staffRoleId ? ` <@&${staffRoleId}>` : ""}`,
    embeds: [
      {
        title: `تذكرة #${ticket.number}`,
        description: description || "أهلاً بك، اشرح طلبك وسيصلك الرد قريباً.",
        color: hexToInt((panel.color as string) ?? "#5865F2"),
        footer: { text: "استخدم الأزرار بالأسفل لإدارة التذكرة" },
      },
    ],
    components: [buildTicketControls(ticket.id)],
  });

  return reply(`تم فتح تذكرتك: <#${channel.id}>`);
}

async function buildTranscript(ticket: Json) {
  if (!ticket.channel_id) return "";
  const messages = await getChannelMessages(ticket.channel_id, 100);
  const lines = messages
    .slice()
    .reverse()
    .map((m: Json) => {
      const time = new Date(m.timestamp as string).toISOString().replace("T", " ").slice(0, 16);
      const author = m.author?.username ?? "غير معروف";
      const content = (m.content as string) || (m.embeds?.length ? "[بطاقة]" : "[مرفق]");
      return `[${time}] ${author}: ${content}`;
    });
  const transcript = lines.join("\n");
  const db = await admin();
  await db.from("tickets").update({ transcript }).eq("id", ticket.id);
  await db.from("ticket_messages").delete().eq("ticket_id", ticket.id);
  if (messages.length) {
    await db.from("ticket_messages").insert(
      messages
        .slice()
        .reverse()
        .map((m: Json) => ({
          ticket_id: ticket.id,
          author_discord_id: m.author?.id ?? null,
          author_username: m.author?.username ?? null,
          content: (m.content as string) ?? "",
          sent_at: m.timestamp,
        })),
    );
  }
  return transcript;
}

async function handleTicketControl(action: string, ticketId: string, interaction: Json) {
  const db = await admin();
  const { data: ticket } = await db.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return reply("لم يتم العثور على التذكرة.");
  const actor = interaction.member?.user ?? interaction.user;

  if (action === "tc") {
    if (ticket.status === "closed") return reply("التذكرة مغلقة.");
    await db
      .from("tickets")
      .update({
        status: "claimed",
        claimed_by_discord_id: actor?.id ?? null,
        claimed_by_username: actor?.username ?? null,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    return reply(`تم استلام التذكرة بواسطة <@${actor?.id}>`, false);
  }

  if (action === "tr") {
    const transcript = await buildTranscript(ticket);
    const preview = transcript.slice(-3800) || "لا توجد رسائل بعد.";
    return replyEmbed({
      title: `نسخة محادثة التذكرة #${ticket.number}`,
      description: "```\n" + preview + "\n```",
      color: hexToInt("#5865F2"),
    });
  }

  if (action === "tx") {
    const transcript = await buildTranscript(ticket);
    await db
      .from("tickets")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by_username: actor?.username ?? null,
      })
      .eq("id", ticketId);

    const config = await settings();
    if (config?.transcript_channel_id) {
      await sendMessage(config.transcript_channel_id, {
        embeds: [
          {
            title: `أُغلقت التذكرة #${ticket.number}`,
            description:
              `**صاحب التذكرة:** ${ticket.opener_username ?? "-"}\n` +
              `**أغلقها:** ${actor?.username ?? "-"}\n\n` +
              "```\n" +
              (transcript.slice(-3500) || "لا توجد رسائل") +
              "\n```",
            color: hexToInt("#da373c"),
          },
        ],
      }).catch(() => undefined);
    }

    if (ticket.channel_id) {
      await discordFetch(`/channels/${ticket.channel_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: `closed-${ticket.number}`,
          permission_overwrites: [
            { id: interaction.guild_id, type: 0, deny: "1024" },
            ...(ticket.opener_discord_id
              ? [{ id: ticket.opener_discord_id, type: 1, allow: "65536", deny: "2048" }]
              : []),
          ],
        }),
      }).catch(() => undefined);
    }
    return reply(`تم إغلاق التذكرة بواسطة <@${actor?.id}>. تم حفظ نسخة المحادثة.`, false);
  }

  return reply("إجراء غير معروف.");
}

/* ------------------------------- commands -------------------------------- */

async function handleCommand(interaction: Json) {
  const db = await admin();
  const data = interaction.data as Json;
  const options = data.options as Json[] | undefined;

  if (data.name === "announce") {
    const id = optionValue(options, "template");
    const channelId =
      optionValue(options, "channel") ?? interaction.channel_id ?? null;
    const { data: ann } = await db.from("announcements").select("*").eq("id", id).maybeSingle();
    if (!ann) return reply("لم يتم العثور على الإعلان المحدد.");
    const target = optionValue(options, "channel") ?? ann.default_channel_id ?? channelId;
    if (!target) return reply("حدّد القناة المستهدفة.");
    try {
      await sendMessage(target, {
        embeds: [buildEmbed(ann)],
        components: buildButtonRows(ann.id, (ann.buttons ?? []) as EmbedButton[]),
      });
    } catch (e) {
      return reply(`فشل النشر: ${(e as Error).message}`);
    }
    await db
      .from("announcements")
      .update({ last_published_at: new Date().toISOString() })
      .eq("id", ann.id);
    return reply(`تم نشر الإعلان في <#${target}> ✅`);
  }

  if (data.name === "ticket") {
    const panelId = optionValue(options, "panel");
    if (panelId) {
      const { data: panel } = await db
        .from("ticket_panels")
        .select("*")
        .eq("id", panelId)
        .maybeSingle();
      if (!panel) return reply("لم يتم العثور على اللوحة.");
      const target = optionValue(options, "channel") ?? interaction.channel_id;
      const message = await sendMessage(target, {
        embeds: [buildEmbed(panel)],
        components: [buildPanelRow(panel.id, panel.button_label, panel.button_emoji)],
      });
      await db
        .from("ticket_panels")
        .update({ channel_id: target, message_id: message.id })
        .eq("id", panel.id);
      return reply(`تم نشر لوحة التذاكر في <#${target}> ✅`);
    }

    const { data: ticket } = await db
      .from("tickets")
      .select("*")
      .eq("channel_id", interaction.channel_id)
      .maybeSingle();
    if (!ticket) return reply("استخدم `/ticket panel:` لنشر لوحة، أو استخدم الأمر داخل قناة تذكرة.");
    return replyEmbed({
      title: `معلومات التذكرة #${ticket.number}`,
      color: hexToInt("#5865F2"),
      fields: [
        { name: "الحالة", value: ticket.status, inline: true },
        { name: "التصنيف", value: ticket.topic ?? "—", inline: true },
        { name: "صاحب التذكرة", value: ticket.opener_username ?? "—", inline: true },
        { name: "المستلم", value: ticket.claimed_by_username ?? "لم تُستلم بعد", inline: true },
        {
          name: "أُنشئت",
          value: new Date(ticket.created_at).toISOString().slice(0, 16).replace("T", " "),
          inline: true,
        },
      ],
    });
  }

  if (data.name === "serverinfo") {
    const userId = optionValue(options, "user");
    if (userId) {
      const user = data.resolved?.users?.[userId] as Json | undefined;
      const member = data.resolved?.members?.[userId] as Json | undefined;
      const avatar = user?.avatar
        ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=256`
        : undefined;
      return replyEmbed({
        title: `معلومات العضو: ${user?.username ?? userId}`,
        color: hexToInt("#5865F2"),
        ...(avatar ? { thumbnail: { url: avatar } } : {}),
        fields: [
          { name: "المعرّف", value: String(userId), inline: true },
          {
            name: "انضم للسيرفر",
            value: member?.joined_at
              ? new Date(member.joined_at).toISOString().slice(0, 10)
              : "—",
            inline: true,
          },
          { name: "عدد الرتب", value: String(member?.roles?.length ?? 0), inline: true },
        ],
      });
    }

    const guild = (await getGuild(interaction.guild_id)) as Json;
    const created = new Date(
      Number(BigInt(interaction.guild_id) >> 22n) + 1420070400000,
    );
    const icon = guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
      : undefined;
    return replyEmbed({
      title: `معلومات السيرفر: ${guild.name}`,
      color: hexToInt("#5865F2"),
      ...(icon ? { thumbnail: { url: icon } } : {}),
      ...(guild.description ? { description: guild.description } : {}),
      fields: [
        { name: "الأعضاء", value: String(guild.approximate_member_count ?? "—"), inline: true },
        { name: "المتصلون", value: String(guild.approximate_presence_count ?? "—"), inline: true },
        { name: "عدد الرتب", value: String((guild.roles as Json[])?.length ?? 0), inline: true },
        { name: "المعرّف", value: String(guild.id), inline: true },
        { name: "تاريخ الإنشاء", value: created.toISOString().slice(0, 10), inline: true },
        { name: "مستوى التعزيز", value: String(guild.premium_tier ?? 0), inline: true },
      ],
    });
  }

  return reply("أمر غير معروف.");
}

async function handleAutocomplete(interaction: Json) {
  const db = await admin();
  const data = interaction.data as Json;
  const focused = (data.options as Json[])?.find((o) => o.focused);
  const query = String(focused?.value ?? "");
  const table = data.name === "announce" ? "announcements" : "ticket_panels";
  const { data: rows } = await db
    .from(table)
    .select("id, name")
    .ilike("name", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(25);
  return Response.json({
    type: 8,
    data: {
      choices: (rows ?? []).map((r: Json) => ({ name: r.name, value: r.id })),
    },
  });
}

async function handleComponent(interaction: Json) {
  const db = await admin();
  const customId = String(interaction.data?.custom_id ?? "");
  const [kind, first, second] = customId.split(":");

  if (kind === "tc" || kind === "tr" || kind === "tx") {
    return handleTicketControl(kind, first, interaction);
  }

  if (kind === "tp" || kind === "tt") {
    const { data: panel } = await db
      .from("ticket_panels")
      .select("*")
      .eq("id", first)
      .maybeSingle();
    if (!panel) return reply("اللوحة غير متاحة.");
    const topics = (panel.topics ?? []) as TicketTopic[];
    if (kind === "tp" && topics.length > 0) {
      return Response.json({
        type: 4,
        data: {
          content: "اختر تصنيف تذكرتك:",
          components: [buildTopicSelect(panel.id, topics)],
          flags: EPHEMERAL,
        },
      });
    }
    const topicId = kind === "tt" ? interaction.data?.values?.[0] : undefined;
    return createTicket(panel, interaction, topicId);
  }

  if (kind === "ab") {
    const { data: ann } = await db
      .from("announcements")
      .select("*")
      .eq("id", first)
      .maybeSingle();
    const button = ((ann?.buttons ?? []) as EmbedButton[]).find((b) => b.id === second);
    if (!button) return reply("هذا الزر لم يعد متاحاً.");

    if (button.action === "ack") {
      return reply(button.responseText || "تم تسجيل طلبك ✅", button.ephemeral !== false ? true : false);
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
    if (button.action === "ticket") {
      let panel: Json | null = null;
      if (button.panelId) {
        const { data } = await db
          .from("ticket_panels")
          .select("*")
          .eq("id", button.panelId)
          .maybeSingle();
        panel = data;
      } else {
        const { data } = await db
          .from("ticket_panels")
          .select("*")
          .eq("is_active", true)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        panel = data;
      }
      if (!panel) return reply("لا توجد لوحة تذاكر مهيأة بعد.");
      const topics = (panel.topics ?? []) as TicketTopic[];
      if (!button.topic && topics.length > 0) {
        return Response.json({
          type: 4,
          data: {
            content: "اختر تصنيف تذكرتك:",
            components: [buildTopicSelect(panel.id, topics)],
            flags: EPHEMERAL,
          },
        });
      }
      return createTicket(panel, interaction, button.topic);
    }
  }

  return reply("إجراء غير معروف.");
}

export const Route = createFileRoute("/api/public/discord/interactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const publicKey = process.env["DISCORD_PUBLIC_KEY"];
        if (!publicKey) return new Response("Missing DISCORD_PUBLIC_KEY", { status: 500 });

        const rawBody = await request.text();
        const valid = await verifyDiscordSignature(
          rawBody,
          request.headers.get("x-signature-ed25519"),
          request.headers.get("x-signature-timestamp"),
          publicKey,
        );
        if (!valid) return new Response("invalid request signature", { status: 401 });

        const interaction = JSON.parse(rawBody) as Json;
        try {
          if (interaction.type === 1) return Response.json({ type: 1 });
          if (interaction.type === 2) return await handleCommand(interaction);
          if (interaction.type === 3) return await handleComponent(interaction);
          if (interaction.type === 4) return await handleAutocomplete(interaction);
        } catch (error) {
          console.error("discord interaction failed", error);
          return reply(`حدث خطأ: ${(error as Error).message.slice(0, 300)}`);
        }
        return Response.json({ type: 4, data: { content: "غير مدعوم", flags: EPHEMERAL } });
      },
    },
  },
});
