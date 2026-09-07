import {
  BUTTON_STYLE_META,
  hexToInt,
  type EmbedButton,
  type TicketTopic,
} from "./announcement-types";

export interface EmbedSource {
  id?: string;
  title?: string | null;
  body?: string | null;
  description?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  thumbnail_url?: string | null;
  color?: string | null;
  footer_text?: string | null;
}

export function buildEmbed(source: EmbedSource) {
  const embed: Record<string, unknown> = {
    color: hexToInt(source.color ?? "#5865F2"),
  };
  if (source.title) embed["title"] = source.title;
  const description = source.body ?? source.description;
  if (description) embed["description"] = description;
  const image = source.image_url ?? source.banner_url;
  if (image) embed["image"] = { url: image };
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

/** Row with the "open ticket" button of a ticket panel. */
export function buildPanelRow(panelId: string, label: string, emoji?: string | null) {
  const button: Record<string, unknown> = {
    type: 2,
    style: 1,
    label: (label || "فتح تذكرة").slice(0, 80),
    custom_id: `tp:${panelId}`,
  };
  const e = emojiPayload(emoji ?? undefined);
  if (e) button["emoji"] = e;
  return { type: 1, components: [button] };
}

export function buildTopicSelect(panelId: string, topics: TicketTopic[]) {
  return {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `tt:${panelId}`,
        placeholder: "اختر تصنيف التذكرة",
        options: topics.slice(0, 25).map((t) => {
          const option: Record<string, unknown> = { label: t.label.slice(0, 100), value: t.id };
          if (t.description) option["description"] = t.description.slice(0, 100);
          const e = emojiPayload(t.emoji);
          if (e) option["emoji"] = e;
          return option;
        }),
      },
    ],
  };
}

export function buildTicketControls(ticketId: string) {
  return {
    type: 1,
    components: [
      { type: 2, style: 3, label: "استلام", custom_id: `tc:${ticketId}` },
      { type: 2, style: 2, label: "نسخة المحادثة", custom_id: `tr:${ticketId}` },
      { type: 2, style: 4, label: "إغلاق", custom_id: `tx:${ticketId}` },
    ],
  };
}
