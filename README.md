# yesid.static-template

The invisible Foundation for a brochure or portfolio site: static SvelteKit 3, Svelte 5, TypeScript, languages, editable content, SEO and deploy checks. Every client gets a Custom Design. This repository intentionally has semantic HTML with no stylesheet, art, motion or visual identity. E-commerce belongs on Shopify.

The sample business is fake. `example.invalid` cannot be a production destination. This repository is private and deployment is disabled unless explicitly enabled in GitHub.

## Start a client site

1. Create a private client repository from this starter. Install Bun 1.4.4 and Node 24 (`.node-version` pins the tested patch). Run `bun install --frozen-lockfile`.
2. Edit `src/lib/config/site.ts`: repository slug, public origin, Active Languages, default language and Business Facts. Facts appear once here and feed visible contact details and JSON-LD. Omit unknown facts. Update the Worker name in `wrangler.jsonc` to the slug with dots replaced by hyphens; tests check agreement.
3. Fill `src/lib/content/<language>.json` and `pages.<language>.json`. Define the client's editable content shape in `contract.ts`, then run `bun run content:format` and `bun run cms:config`. Commit content and `cms/config.yml` together. Structure is checked; the Owner controls wording.
4. Replace `src/lib/sections/` with the client's Custom Design. Header, page, footer and error markup live there. Admin markup lives in its route. Keep the content, Site Map and SEO interfaces intact. No rendered pages use `@yesid/tokens`, `@yesid/ui` or `@yesid/motion`.
5. Add Fixed Pages to the contract and the `fixedPages` list in `src/lib/site-map.ts`. All paths, navigation, canonical URLs, language switches, prerender entries, hreflang and sitemap output come from that map. A slug change needs a redirect before publication.
6. To add a language, add its code and label to settings, its two JSON files and a translated slug for every Fixed Page. No matcher, route, switcher, sitemap or error-page language list needs editing. Missing fixed content or slugs fail the build. An untranslated Blog Post is simply absent from that language.
7. Register the client separately in the Login Site. `/admin/` uses a noindex meta refresh and visible link to `https://login.yesid.dev/<slug>/`. There is no local CMS, authentication code or frontend secret. Owners and Employees need no GitHub account. Do not test the sample login URL.
8. Run `bun run check`, `bun run test`, and `bun run build`. Tests build first so generated-output checks cannot pass against stale HTML. `bun test tests` runs just the test cases when a current build already exists. `bun run dev` opens the development server when needed.
9. Have IT create the client's one assets-only Worker separately. Add repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through GitHub settings. The token must be limited to that existing Worker. Set `DEPLOY_ENABLED=true` only when deployment is authorized. The deploy workflow checks and builds before invoking the pinned Wrangler with an explicit Worker name. It never enumerates Workers or manages account resources. This task did not run it.

## Blog editing

Posts live in `src/lib/content/posts/<entry>.<language>.md`. The entry filename ties translations together. Titles create URL slugs; changing a title changes its URL, so preserve old links with redirects when editing a live post. The CMS collection uses multiple files, shared date and optional shared photo. Blank `photo` means no cover. Supply `photoAlt` when adding a photo. Dates and photos must agree across translations. Markdown becomes HTML at build time through Marked with raw HTML removed, followed by an explicit sanitize-html allowlist; script elements, event handlers, dangerous URL protocols and embedded frames are removed.

Photos upload to `static/images/uploads` and are served from `/images/uploads`. This Foundation does not resize images or generate social cards.

**Known integration gap:** the Login Site currently permits only `src/lib/content/*.json` at one level and uploads. It cannot save `src/lib/content/posts/*.md` yet. The parent session owns that change. Until then, blog files can only be committed through GitHub/IT. The collection is declared here but end-to-end CMS publishing has not been proven.

## Static output and 404 limit

The strict static adapter writes complete pages under `build/`, plus `sitemap.xml`, `robots.txt`, `llms.txt`, `admin/index.html` and exactly `404.html`. Cloudflare configuration uses `404-page` handling. Client-side rendering is disabled, so content and language navigation work without JavaScript.

A single static `404.html` cannot select a language from an unknown request URL without JavaScript or request-time logic. The file therefore presents every configured language's message and correct home link, marked with that language. Its document language is the default. This is the explicit limitation of the assets-only, single-file requirement. No request-time Worker or fallback JavaScript was added.

## Ownership and maintenance

- `config/site.ts`: Business Facts and settings.
- `site-map.ts` and `post-map.ts`: page identities, translated paths, available translations and queries.
- `content/contract.ts`: editable shape, inferred types and CMS fields, using released `@yesid/content-contract` 0.1.0.
- `content/index.ts`: build-time discovery and validation.
- `seo.ts` and `components/Seo.svelte`: escaped sitemap and head metadata; JSON-LD uses only stated Business Facts.
- `sections/`: replaceable Custom Design markup.
- `.github/workflows/`: CI and the separately gated deployment job. Every action is pinned by SHA; checkout retains no credentials.

No `.env.example` is needed. Deployment credentials belong only in GitHub secrets. A failed check/build prevents asset upload. For a bad content edit, revert the responsible commit, run the checks and republish through the authorized workflow. Test restore and Cloudflare rollback during the first real client's launch, not against this sample.

Optional `@yesid/i18n-core` and `@yesid/seo-kit` are not installed: the Site Map already owns routing, while seo-kit adds token/image-generation peers this Foundation does not need. Their v0.36.0 guide was read without modifying the shared repository.

Potential future packages, after another client proves the interfaces: the Site Map and translation availability model, safe Markdown/post ingestion, facts-only SEO and static-output verification helpers. Nothing is extracted here. The Content Contract is already a released package.
