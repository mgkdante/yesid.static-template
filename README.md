# yesid.static-template

The invisible Foundation for a brochure or portfolio site: static SvelteKit 3, Svelte 5, TypeScript, languages, editable content, SEO and deploy checks. Every client gets a Custom Design. This repository intentionally has semantic HTML with no stylesheet, art, motion or visual identity. E-commerce belongs on Shopify.

The sample business is fake. `example.invalid` cannot be a production destination. This repository is private and deployment is disabled unless explicitly enabled in GitHub.

## Start a client site

1. Create a private client repository from this starter with `gh repo create <owner>/<repo> --private --template mgkdante/yesid.static-template --clone`. Install Bun 1.4.4 and Node 24 (`.node-version` pins the tested patch). Run `bun install --frozen-lockfile`.
2. Edit `src/lib/config/site.ts`: site slug, repository, public origin, Active Languages, default language and Business Facts. Facts appear once here and feed visible contact details and JSON-LD. Omit unknown facts. Update the Worker name in `wrangler.jsonc` to the slug with dots replaced by hyphens; tests check agreement. Publishing refuses the sample `example.invalid` origin.
3. Fill `src/lib/content/<name>.<language>.json`, one file per place on the site. `contentGroups` in `src/lib/content/cms.ts` lists them and lays out the editor like the site: Pages, everything seen on every page (menu, footer, error page), and legal pages. Define the client's editable content shape in `contract.ts`, then run `bun run content:format` and `bun run cms:config`. Commit content and `cms/config.yml` together. Structure is checked; the Owner controls wording.
4. Replace `src/lib/sections/` with the client's Custom Design. Header, page, footer and error markup live there. Admin markup lives in its route. Keep the content, Site Map and SEO interfaces intact. This starter depends on no design system: Foundation code carries no design, and a test keeps `@yesid/content-contract` as its only `@yesid` package.
5. Add Fixed Pages to the contract and the `fixedPages` list in `src/lib/site-map.ts`. All paths, navigation, canonical URLs, language switches, prerender entries, hreflang and sitemap output come from that map. A slug change needs a redirect before publication.
6. To add a language, add its code and label to settings, its Fixed Page and shared JSON files and a translated slug for every Fixed Page. No matcher, route, switcher, sitemap or error-page language list needs editing. Missing fixed content or slugs fail the build. An untranslated Blog Post is simply absent from that language.
7. Connect the client to the Login Site by following [docs/connect-a-client.md](docs/connect-a-client.md). `/admin/` uses a noindex meta refresh and visible link to `https://login.yesid.dev/<slug>/`. There is no local CMS, authentication code or frontend secret. Owners and Employees need no GitHub account. Do not test the sample login URL.
8. Run `bun run check`, `bun run test`, and `bun run build`. Tests build first so generated-output checks cannot pass against stale HTML. `bun test tests` runs just the test cases when a current build already exists. `bun run dev` opens the development server when needed.
9. Have IT create the client's one assets-only Worker separately. Add repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through GitHub settings. The token must be limited to that existing Worker. Set `DEPLOY_ENABLED=true` only when deployment is authorized. The deploy workflow checks and builds `main` in a job with no Cloudflare secrets, then a second job installs without dependency scripts and invokes the pinned Wrangler with an explicit Worker name on that exact output. It never enumerates Workers or manages account resources. A failure keeps the previous site up and opens an issue titled `Publishing failed`, assigned to the repository owner. This workflow has never run a real upload from this repository; the same design runs on the pioneer site.

## Repeatable collections

Blog and Projects are examples registered in `src/lib/content/registry.ts`. A collection defines its name, CMS label, listing page, Content Contract, metadata mapping and presentation data. The shared pipeline discovers its files, validates content and shared fields, ties translations together, generates paths and supplies listings. It has no required date, photo, title or body field. The metadata mapping supplies the page title and description from whichever fields the collection owns.

```ts
const resources = defineCollection({
  name: 'resources', label: 'Resources', listing: 'resources',
  contract: resourceContract,
  metadata: (data) => ({ title: data.name, description: data.summary }),
  present: (data) => data
});
```

To add a collection:

1. Define its editable fields in `content/contract.ts` using the released Content Contract builders.
2. Register it in `content/registry.ts`. `present` prepares whatever its Custom Design needs; call the shared `renderMarkdown` for rich text that will render as HTML. Other text stays escaped by Svelte. An optional `slug(data, key)` callback controls public slugs; otherwise they derive from mapped page titles, with a filename-based fallback for symbolic titles.
3. Add a listing Fixed Page, translated slugs and `<listing>.<language>.json` files, just like any other Fixed Page. Add that file to the Pages group in `content/cms.ts`.
4. Add the collection's detail and listing components under `sections/collections/` and register them in that directory's `index.ts`. This registry is checked against the collection names. The shared route requires no edits.
5. Add entries at `src/lib/content/<collection>/<entry>.<language>.md`, then run `bun run cms:config`, check, test and build. File discovery, CMS folder registration, routes, hreflang and sitemap need no additional collection list.

To remove a collection, delete its registry entry, contract, views and folder, then its listing page from the contract, Site Map, `contentGroups` and content files. A site with no collection at all is fine: type it as `collections: readonly CollectionDefinition[] = []` in the registry, with `collectionViews = {}`.

Storage follows the released package: one YAML-frontmatter Markdown file per entry language, one level below the collection folder. Arbitrary nested content fields are supported by its contract. This is not a page builder, a relational CMS or a plugin system. New content types still need their own fields and Custom Design; infrastructure code stays unchanged. A contract without a `body` field uses only frontmatter and leaves the document body empty.

An entry filename identifies the same item across translations. Collection names namespace identities, so Blog and Projects may use the same filename. Public paths are `<translated listing slug>/<entry slug>/`; changing a title-derived public slug needs a redirect on an already published site. Missing translations never advertise a page. Two entries may share a title: the one whose file name matches keeps the plain address, and the other adds its file name. A missing collection folder may be empty, while an unregistered content folder, invalid file or shared-field disagreement fails the build.

An Owner's save should never stop later saves from publishing. A dead link, dead anchor or deleted photo in their content only warns in the build log; links the site itself writes in its header and footer are still tested. If you add a design that writes more of its own links, cover them the same way.

Blog retains title, description, date, optional cover photo, photo description and Markdown body. Projects instead uses name, summary, services and body, without a date or photo. Their fields, detail markup, listing markup and ordering remain separate. Shared values are discovered from the package's generated field metadata, including nested lists, rather than a hardcoded date/photo list.

Markdown becomes HTML at build time through Marked with raw HTML removed, followed by the sanitize-html allowlist. Photos upload to `static/images/uploads` and are served from `/images/uploads`. The editor renames a photo to plain characters, converts it to WebP and caps it at 2048 pixels before it uploads, so no build step resizes images.

**Login Site rules:** a save only reaches the repository when its path matches `CONTENT_FILES` in the `yesid.login` repository, and the editor can only read paths that match. Those rules allow root JSON, one-level collection Markdown in any folder a collection name can be, and raster uploads, so a new collection needs no Login Site change. A file the editor must reach outside those rules won't work. `tests/login-rules.test.ts` holds a hand-kept copy of them, updated when they change. The template tests cover content create, edit and delete through the public catalog interface. They don't prove a real save through the live Login Site, so do not reuse a real client's domain or membership to test one. Keep this repository's deployment disabled while testing dummy content.


## Link previews, icons and structured data

Set these in `config/site.ts`. All are optional, and nothing is emitted for a value that is absent.

- `languages[].shareImage`: a 1200 x 630 file in `static/`, per language. A Blog Post's cover replaces it on that post. Keep editable text and phone numbers off the card, because they go stale when an Owner edits. Open the image, then test the real link on a phone in each language.
- `languages[].ogLocale`: the Open Graph locale.
- `icons`: favicon and touch icon files in `static/`. They are part of the Custom Design, so this starter has none.
- `business.type`: a schema.org type, kept in code and out of the editor. `business.hours` feeds structured data from one place.

## Static output and 404 limit

The strict static adapter writes complete pages under `build/`, plus `sitemap.xml`, `robots.txt`, `llms.txt`, `admin/index.html` and exactly `404.html`. Cloudflare configuration uses `404-page` handling. Client-side rendering is disabled, so content and language navigation work without JavaScript. A Custom Design that needs it changes `csr` in `src/routes/+layout.ts`, and the test `no built page runs JavaScript` in `tests/build.test.ts`, which fails on purpose until then.

A single static `404.html` cannot select a language from an unknown request URL without JavaScript or request-time logic. The file therefore presents every configured language's message and correct home link, marked with that language. Its document language is the default. This is the explicit limitation of the assets-only, single-file requirement. No request-time Worker or fallback JavaScript was added.

## Ownership and maintenance

- `config/site.ts`: Business Facts and settings.
- `site-map.ts` and `collection-catalog.ts`: page identities, translated paths, available translations and queries.
- `content/contract.ts`: editable shape, inferred types and CMS fields, using released `@yesid/content-contract` 0.4.0.
- `content/collections.ts`: generic parsing and contract-derived shared-field checks.
- `content/registry.ts`: collection definitions and typed presentation data.
- `content/index.ts`: build-time discovery and validation.
- `seo.ts` and `components/Seo.svelte`: escaped sitemap and head metadata; JSON-LD uses only stated Business Facts.
- `sections/`: replaceable Custom Design markup.
- `.github/workflows/`: CI and the separately gated deployment job. Every action is pinned by SHA; checkout retains no credentials.

No `.env.example` is needed. Deployment credentials belong only in GitHub secrets. A failed check or build prevents asset upload and opens the failure issue. For a bad content edit, revert the responsible commit, run the checks and republish through the authorized workflow. Test restore and Cloudflare rollback during the first real client's launch, not against this sample.

`@yesid/i18n-core` and `@yesid/seo-kit` from `yesid.design` are deliberately not installed: the Site Map already owns routing, and seo-kit brings token and image-generation peers this Foundation does not need.

Potential future packages, after another client proves the interfaces: the Site Map and translation availability model, safe Markdown/post ingestion, facts-only SEO and static-output verification helpers. Nothing is extracted here. The Content Contract is already a released package.
