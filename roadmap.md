# Roadmap

## Announcements (initial request)
- [ ] DB: announcement templates + admin role + image storage
- [ ] Arabic RTL dashboard: composer (title, body, image, color, button label/link)
- [ ] Discord-like embed preview card
- [ ] /announce slash command with template + optional channel
- [ ] Setup instructions page (bot connection, permissions)

## Tickets & server info (follow-up request)
- [ ] DB: ticket panels, tickets, ticket messages/transcripts, guild settings (welcome/terms text)
- [ ] Dashboard: ticket panel builder (banner, description, category/topic choices, button labels)
- [ ] Private ticket channels on button click; claim/close controls for staff
- [ ] Transcript export
- [ ] /ticket and /serverinfo slash commands + info panel
- [ ] Deployment docs for external hosting + env vars

## Interactive buttons (follow-up request)
- [ ] Multiple buttons per announcement/template
- [ ] Per-button action: open ticket (optional type), show info embed, external URL, confirmation reply
- [ ] Per-button label, emoji, style/color, response text
- [ ] Buttons rendered in the Discord-style live preview
- [ ] Deployment guide covers handling of button interactions

## Setup values (follow-up request)
- [ ] Show Application ID 1355703858571120650 and Public Key in setup docs + env examples
- [ ] Never store/request a bot token; explain user sets DISCORD_BOT_TOKEN on own hosting

## Permissions & channel choice (follow-up request)
- [ ] Setup guide: Administrator as easiest optional route
- [ ] Recommend least-privilege list (View Channels, Send Messages, Embed Links, Attach Files, Manage Channels, Manage Messages, Read Message History, Use Application Commands)
- [ ] /announce channel option to pick target room
