import { BUTTON_STYLE_META, type EmbedButton } from "@/lib/announcement-types";

export interface PreviewData {
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  color?: string | null;
  footer_text?: string | null;
  buttons?: EmbedButton[];
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i} className="block">
      {line || "\u00A0"}
    </span>
  ));
}

export function DiscordPreview({
  data,
  botName = "Announcer",
}: {
  data: PreviewData;
  botName?: string;
}) {
  const color = data.color || "#5865F2";
  const buttons = (data.buttons ?? []).filter((b) => b.label?.trim());

  return (
    <div className="rounded-2xl bg-[var(--color-discord-chat)] p-4">
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          BOT
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{botName}</span>
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              APP
            </span>
            <span className="text-xs text-muted-foreground">اليوم</span>
          </div>

          <div
            className="overflow-hidden rounded-md bg-[var(--color-discord-panel)]"
            style={{ borderInlineStartWidth: 4, borderInlineStartStyle: "solid", borderInlineStartColor: color }}
          >
            <div className="flex gap-4 p-4">
              <div className="min-w-0 flex-1">
                {data.title ? (
                  <h3 className="mb-2 text-base font-bold text-foreground">{data.title}</h3>
                ) : null}
                {data.body ? (
                  <div className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {renderMarkdown(data.body)}
                  </div>
                ) : null}
              </div>
              {data.thumbnail_url ? (
                <img
                  src={data.thumbnail_url}
                  alt="صورة مصغّرة"
                  className="size-20 shrink-0 rounded-md object-cover"
                />
              ) : null}
            </div>
            {data.image_url ? (
              <img
                src={data.image_url}
                alt="بانر الإعلان"
                className="max-h-72 w-full object-cover"
              />
            ) : null}
            {data.footer_text ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">{data.footer_text}</div>
            ) : null}
          </div>

          {buttons.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {buttons.map((b) => (
                <span
                  key={b.id}
                  className={`inline-flex items-center gap-1.5 rounded-[3px] px-4 py-2 text-sm font-medium ${
                    BUTTON_STYLE_META[b.action === "url" ? "link" : b.style]?.className ?? ""
                  }`}
                >
                  {b.emoji ? <span>{b.emoji}</span> : null}
                  {b.label}
                  {b.action === "url" ? <span className="text-xs opacity-70">↗</span> : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
