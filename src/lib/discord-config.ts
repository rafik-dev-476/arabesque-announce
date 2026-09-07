// Public Discord application configuration (safe to expose in the client).
// The bot token is NEVER stored here — it lives only as a private environment
// variable (DISCORD_BOT_TOKEN) on the hosting the owner controls.
export const DISCORD_APPLICATION_ID = "1355703858571120650";
export const DISCORD_PUBLIC_KEY =
  "17f30a5ceb3481d10c58167a91f619dc5ea31b96ce9c504fffd38aac2a964ac5";

export const DISCORD_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_APPLICATION_ID}&scope=bot%20applications.commands&permissions=536887296`;
