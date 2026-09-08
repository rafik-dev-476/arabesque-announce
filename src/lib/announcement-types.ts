export type ButtonAction = "url" | "info" | "ack";

export type ButtonStyle = "primary" | "secondary" | "success" | "danger" | "link";

export interface EmbedButton {
  id: string;
  label: string;
  emoji?: string;
  style: ButtonStyle;
  action: ButtonAction;
  /** action = url */
  url?: string;
  /** action = info | ack */
  responseTitle?: string;
  responseText?: string;
  ephemeral?: boolean;
}

export interface AnnouncementDraft {
  id?: string;
  name: string;
  title: string;
  body: string;
  image_url: string | null;
  thumbnail_url: string | null;
  color: string;
  footer_text: string | null;
  default_channel_id: string | null;
  buttons: EmbedButton[];
}

export const BUTTON_STYLE_META: Record<
  ButtonStyle,
  { label: string; discord: number; className: string }
> = {
  primary: { label: "أزرق (رئيسي)", discord: 1, className: "bg-[#5865f2] text-white" },
  secondary: { label: "رمادي (ثانوي)", discord: 2, className: "bg-[#4e5058] text-white" },
  success: { label: "أخضر (نجاح)", discord: 3, className: "bg-[#248046] text-white" },
  danger: { label: "أحمر (خطر)", discord: 4, className: "bg-[#da373c] text-white" },
  link: { label: "رابط خارجي", discord: 5, className: "bg-[#4e5058] text-white" },
};

export const ACTION_META: Record<ButtonAction, { label: string; hint: string }> = {
  url: { label: "فتح رابط خارجي", hint: "يفتح رابطاً في المتصفح" },
  info: { label: "عرض معلومة", hint: "يرسل بطاقة معلومات للعضو" },
  ack: { label: "رد تأكيد بسيط", hint: "يرسل رسالة تأكيد قصيرة للعضو" },
};

export function hexToInt(hex: string): number {
  const clean = (hex || "#5865F2").replace("#", "").trim();
  const parsed = parseInt(clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean, 16);
  return Number.isNaN(parsed) ? 0x5865f2 : parsed;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
