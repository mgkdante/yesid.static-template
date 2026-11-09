# Working here

The maintainer's notes live in a private Notion workspace; outside contributors can ignore those links. Notion owns intent, decisions, standing rules and how to work with Yesito. Before agentic coding, read [LLMs](https://app.notion.com/p/4083e863069080df9e63d165128a1522), which routes to the rest, and this project's [Notion home](https://app.notion.com/p/4113e863069080debbc0d277c139afa2). Don't add standing rules here: this file keeps local commands and constraints only. Write to Notion only when the current task authorizes it.

Use Node 24 and Bun from `.bun-version`.

- `bun install --frozen-lockfile`
- `bun run check`
- `bun run test` builds first, then tests source and generated HTML.
- `bun run build`
- `bun run cms:config`
- `bun run content:format`
- `bun run icons` regenerates `static/favicon.ico` from `static/favicon.svg`; keep both.

Keep Business Facts and settings in `src/lib/config/site.ts`. Fixed Page identities and translated slugs belong to the Site Map. All language plumbing derives from settings. Owner-editable fields, types and checks originate in `src/lib/content/contract.ts`; use the released package, never copy it. Check structure only, never constrain wording. Values code depends on stay in code.

Custom Design belongs in `src/lib/sections/`; keep routing, content and SEO independent. Render semantic HTML; this starter has no visual design and imports no design-system UI, tokens or motion. Markdown must be sanitized at build time.

Keep the repository private. Never read or commit secrets. Never deploy, create Cloudflare resources, modify neighboring repositories or contact Login without task-specific authorization. Publishing stays gated by `DEPLOY_ENABLED`. Saved content paths must match Login's file rules, owned in its repository. Connecting a client: `docs/connect-a-client.md`.
