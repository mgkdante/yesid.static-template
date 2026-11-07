# Working here

Read the current About Yesid, enabled Notion Skills and model-selection Skill before agentic coding. Notion owns intent and decisions; this repository owns implementation and local commands. Write to Notion only when the current task authorizes it.

Use Node 24 and Bun from `.bun-version`.

- `bun install --frozen-lockfile`
- `bun run check`
- `bun run test` builds first, then tests source and generated HTML.
- `bun run build`
- `bun run cms:config`
- `bun run content:format`

Keep Business Facts and settings in `src/lib/config/site.ts`. Fixed Page identities and translated slugs belong to the Site Map. All language plumbing derives from settings. Owner-editable fields, types and checks originate in `src/lib/content/contract.ts`; use the released package, never copy it. Check structure only, never constrain wording. Values code depends on stay in code.

Custom Design belongs in `src/lib/sections/`; keep routing, content and SEO independent. Render semantic HTML; this starter has no visual design and imports no design-system UI, tokens or motion. Markdown must be sanitized at build time.

Keep files focused, typically under 400 lines and always under 800. Functions stay under 50 lines. Use immutable updates, explicit errors and short comments. No app `console.log`. Never use em dashes.

Keep the repository private. Never read or commit secrets. Never deploy, create Cloudflare resources, modify neighboring repositories or contact the Login Site without task-specific authorization. The deploy job stays gated by `DEPLOY_ENABLED`. Saved content paths must match the Login Site's file rules, owned in its repository. Connecting a client: `docs/connect-a-client.md`.
