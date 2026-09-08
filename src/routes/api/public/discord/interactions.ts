import { createFileRoute } from "@tanstack/react-router";

import { buildEmbed, buildButtonRows } from "@/lib/discord-payload";
import { hexToInt, type EmbedButton } from "@/lib/announcement-types";
import { verifyDiscordSignature, sendMessage } from "@/lib/discord-rest.server";

const EPHEMERAL = 64;

type Json = Record<string, any>;

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
      components: buildButtonRows(ann.id, (ann.buttons ?? []) as EmbedButton[]),
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
  const button = ((ann?.buttons ?? []) as EmbedButton[]).find((b) => b.id === buttonId);
  if (!button) return reply("هذا الزر لم يعد متاحاً.");

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
        return reply("غير مدعوم");
      },
    },
  },
});
