# AGENTIUM · Casino Verse OS — marketing site

Marketing website for AGENTIUM, the company behind Casino Verse OS, the AI operating system for the agentic casino economy. B2B audience: licensed casino and iGaming operators, investors and technical partners.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, React Three Fiber (one shared WebGL canvas behind the whole site) and a seeded live-data simulator.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production build
```

Node 18.18+ (20 or 22 recommended).

Useful URLs:

- `/?intro=1` replays the 20-second intro film; `/?intro=0` skips it.
- `/_lab/ui` shows every UI component (not indexed).

## Deploy on Vercel

1. Import this repository in Vercel. The framework preset is detected as **Next.js**; keep the default build command (`next build`) and output settings.
2. Add these environment variables (Project → Settings → Environment Variables):

   | Variable | Required | Purpose |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | Yes | Your live origin, e.g. `https://agentium.com`. Used for canonical URLs, sitemap, robots and social images. |
   | `RESEND_API_KEY` | For the briefing form | API key from [resend.com](https://resend.com). |
   | `BRIEFING_TO_EMAIL` | For the briefing form | Inbox that receives briefing and sandbox requests. |
   | `BRIEFING_FROM_EMAIL` | For the briefing form | Sender on a domain verified in Resend, e.g. `AGENTIUM <no-reply@agentium.com>`. |
   | `NEXT_PUBLIC_FEED_URL` | No | Optional WebSocket feed that replaces the seeded simulator. |

   **Important:** if the three Resend variables are missing, `/api/briefing` accepts the form, logs it and returns success without sending any email, so requests would be lost. Set them before going live.

3. Deploy. Every route is statically generated except `/api/briefing`.

See `.env.example` for the same variables.

## Project structure

- `app/` — routes, metadata, sitemap, robots, OG image, `/api/briefing`
- `components/intro/` — the 20-second intro film (canvas 2D, `film/` engine and scenes)
- `components/scenes/` — WebGL scenes for the shared background canvas
- `components/sections/` — homepage and inner-page sections
- `components/ui/` — UI kit
- `content/` — all site copy (`copy.ts` and `copy/*`), data files, MDX insights and legal pages
- `lib/sim/` — seeded simulator behind every live number (labelled "SIMULATED NETWORK")
- `public/brand/` — AGENTIUM logo assets
- `middleware.ts` — security headers (CSP, HSTS, frame and referrer policies)
- `docs/` — original build brief and shared contracts

## Content still to supply

Placeholders are marked `TO CONFIRM` in `content/copy/pages.ts`, and legal pages say "To be supplied by counsel": registered address, contact emails, leadership, legal texts, client logos, supported settlement networks and certification status.
