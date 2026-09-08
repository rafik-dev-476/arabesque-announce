import { BUTTON_STYLE_META, hexToInt, type EmbedButton } from "./announcement-types";

export interface EmbedSource {
  id?: string;
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  color?: string | null;
  footer_text?: string | null;
}

export function buildEmbed(source: EmbedSource) {
  const embed: Record<string, unknown> = {
    color: hexToInt(source.color ?? "#5865F2"),
  };
  if (source.title) embed["title"] = source.title;
  if (source.body) embed["description"] = source.body;
  if (source.image_url) embed["image"] = { url: source.image_url };
  if (source.thumbnail_url) embed["thumbnail"] = { url: source.thumbnail_url };
  if (source.footer_text) embed["footer"] = { text: source.footer_text };
  return embed;
}

function emojiPayload(emoji?: string) {
  if (!emoji) return undefined;
  const custom = emoji.match(/^<a?:(\w+):(\d+)>$/);
  if (custom) return { name: custom[1], id: custom[2], animated: emoji.startsWith("<a:") };
  return { name: emoji };
}

/** Discord action rows (max 5 buttons per row) for announcement buttons. */
export function buildButtonRows(ownerId: string, buttons: EmbedButton[]) {
  const usable = (buttons || []).filter((b) => b.label?.trim());
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < usable.length; i += 5) {
    rows.push({
      type: 1,
      components: usable.slice(i, i + 5).map((b) => {
        const isLink = b.action === "url";
        const base: Record<string, unknown> = {
          type: 2,
          label: b.label.slice(0, 80),
          style: isLink ? 5 : BUTTON_STYLE_META[b.style]?.discord ?? 1,
        };
        const emoji = emojiPayload(b.emoji);
        if (emoji) base["emoji"] = emoji;
        if (isLink) base["url"] = b.url || "https://discord.com";
        else base["custom_id"] = `ab:${ownerId}:${b.id}`;
        return base;
      }),
    });
  }
  return rows;
}
