# Kubik Freelance

Mini freelance platform: portfolio, order form, admin panel and private client chat.
Stack: Node.js 22.5+ (built-in `node:sqlite`), no npm dependencies.

## Setup
1. Copy `.env.example` to `.env`.
2. Set `ADMIN_PASSWORD` in `.env`. The password is checked on the server only; change it by editing `.env` and restarting.
3. Optional: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to receive notifications about new requests and client messages. Without them the site works normally.

## Run
- Development: `npm run dev`
- Production: `NODE_ENV=production npm start`

Open http://localhost:3000. Click the logo in the top left corner to sign in as admin.
Data is stored in `data.db` (SQLite), the schema is created automatically.

## Production notes
- Serve over HTTPS (the session cookie is `Secure` when `NODE_ENV=production`).
- Behind a reverse proxy set `TRUST_PROXY=1` so login rate limiting sees the real client IP.
- Admin sessions are kept in memory and reset on restart.
- Keep `data.db` on persistent storage and back it up.
- Client access links contain a secret token stored as a hash; a lost link cannot be restored.
