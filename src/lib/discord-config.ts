// Public Discord application configuration (safe to expose in the client).
// The bot token is NEVER stored here — it lives only as a private environment
// variable (DISCORD_BOT_TOKEN) on the hosting the owner controls.
export const DISCORD_APPLICATION_ID = "1355703858571120650";
export const DISCORD_PUBLIC_KEY =
  "17f30a5ceb3481d10c58167a91f619dc5ea31b96ce9c504fffd38aac2a964ac5";

// View Channels + Send Messages + Embed Links + Attach Files + Manage Channels
// + Manage Messages + Read Message History + Use Application Commands
export const RECOMMENDED_PERMISSIONS = 2147609516;

export const DISCORD_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_APPLICATION_ID}&scope=bot%20applications.commands&permissions=${RECOMMENDED_PERMISSIONS}`;
export const DISCORD_ADMIN_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_APPLICATION_ID}&scope=bot%20applications.commands&permissions=8`;

export const PERMISSION_LIST = [
  { name: "View Channels", ar: "رؤية القنوات" },
  { name: "Send Messages", ar: "إرسال الرسائل" },
  { name: "Embed Links", ar: "تضمين البطاقات والروابط" },
  { name: "Attach Files", ar: "إرفاق الملفات" },
  { name: "Manage Channels", ar: "إدارة القنوات (لإنشاء قنوات التذاكر)" },
  { name: "Manage Messages", ar: "إدارة الرسائل" },
  { name: "Read Message History", ar: "قراءة سجل الرسائل (لنسخ المحادثات)" },
  { name: "Use Application Commands", ar: "استخدام أوامر التطبيق" },
];
