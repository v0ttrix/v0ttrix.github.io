# World backend

Cloudflare Worker + one SQLite-backed Durable Object for the existing MessagePack WebSocket client. The portfolio stays on GitHub Pages. Scores and whispers persist across deployments and idle periods.

## Deploy from PowerShell

From this directory:

```powershell
npm.cmd install
npx.cmd wrangler login
npm.cmd test
npm.cmd run deploy
```

Approve the Cloudflare login in your browser. Wrangler provisions the `WorldRoom` namespace using the checked-in migration. Use the Workers Free plan; no separate D1 database or domain purchase is needed.

Deployment prints an HTTPS URL such as `https://mardinis-world-server.YOUR-SUBDOMAIN.workers.dev`.

## Connect the website

The world needs the WebSocket URL, with `wss://` and `/websocket`:

```text
wss://mardinis-world-server.YOUR-SUBDOMAIN.workers.dev/websocket
```

In the portfolio GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and create a repository variable named `WORLD_SERVER_URL` containing that URL. The Pages workflow passes it to Vite during the world build. Run the deployment workflow again after the source changes are pushed.

For the existing local preview, set `VITE_SERVER_URL` to the same value in the local world's `.env.local`, then rebuild and assemble the portfolio. The public WebSocket URL is configuration, not a secret. Never put a Cloudflare API token in the website.

`GET /health` returns an OK JSON response. The website origin must be in `ALLOWED_ORIGINS` in `wrangler.jsonc`; the GitHub Pages origin and current local preview ports are already configured.

## Behavior

- Circuit: top ten personal bests for the current UTC day, reset at midnight. Up to 100 ranked results are kept during the day.
- Whispers: one current message per browser UUID, up to 100 total, with oldest entries removed first. Text is limited to 100 characters.
- Updates are broadcast to connected players using the existing binary protocol.
- Lava/altar counter is retained for client compatibility. This backend does not start the template's shared cataclysm events.
- Scores are client-reported with basic timing validation; this is a casual leaderboard, not an authoritative racing/anti-cheat server.
- Connections are limited, messages are size-limited, and submissions are throttled per connection and hashed IP. No raw IP addresses are stored.
- Removing abusive whispers can be done in the Durable Object storage inspector; a moderation UI is not included.

Run `npm.cmd test` to check data validation, wire payloads, daily reset, rate limits and whisper capacity. Cloudflare integration still needs a real `wrangler dev` or deployed test.
