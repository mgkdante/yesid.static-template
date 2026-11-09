# Connect a new client to Login

A new Client is an onboarding step, not a migration: no code change and no database migration in Login. The Operator runs these steps. Get the Operator's explicit yes before adding a person or publishing a Site for the first time.

The values below are placeholders. Never commit a real person's address, a Client's facts or an installation ID to this template.

| Placeholder | Meaning |
| --- | --- |
| `<owner>/<repo>` | The Client's private repository |
| `<slug>` | The Site's name on Login, as in `login.yesid.dev/<slug>/` |
| `<installation-id>` | The GitHub App installation that holds the repository |

## What a Site must keep

Login guarantees which files change and who changes them, not what they say. Each Site's build treats content as untrusted, so a Site connects to Login only while it keeps both of these from the Foundation:

- Markdown is sanitized at build time: raw HTML is removed, then an allowlist is applied (`renderMarkdown`). Other Owner text stays escaped.
- A failed check or build publishes nothing, so the previous site stays up, and the failure opens an issue titled `Publishing failed`.

A Custom Design that renders Owner text another way, or a publishing setup that replaces the deploy workflow, must keep the same two guarantees.

## 1. Choose the slug

It must match `^[a-z0-9][a-z0-9.-]{0,62}$` and must not be one of Login's own paths: `auth`, `api`, `admin`, `login`, `editor`, `account`, `privacy`, `terms`, `legal`, `relay`. `bun run test` checks this.

Login also refuses a retired slug: the slug of any Site that has left Login is never given to another. The template can't see that list, so pick a slug no earlier Client has used.

## 2. Create the repository

```sh
gh repo create <owner>/<repo> --private --template mgkdante/yesid.static-template --clone
```

The repository's name must not be one of the Operator's own projects: Login's `scripts/new-client.ts` refuses any name starting with `yesid.`, and `transit` and `yesid-portfolio`.

In `src/lib/config/site.ts`, set `slug`, `repository`, `origin`, the languages and the Business Facts. Set the Worker name in `wrangler.jsonc`. Replace `static/favicon.svg` with the Client's mark, with text as paths and any image embedded, and run `bun run icons`, so the Site keeps serving `/favicon.ico` from it; publishing refuses the placeholder mark. Then run these and push to `main`:

```sh
bun install --frozen-lockfile
bun run cms:config
bun run check
bun run test
```

Login reads `cms/config.yml` from the repository's branch, so that file must be on `main` first.

## 3. Let the GitHub App reach the repository

GitHub allows one installation of an App per account. For a repository in the account that already has the App, don't install it again:

1. Open that account's **Settings > Applications > Installed GitHub Apps > Configure** for Login's App.
2. Keep **Only select repositories**, and add `<owner>/<repo>`.
3. Read the installation ID from the end of that page's address.

A repository in another account needs its own installation there, with its own ID.

The selected repositories hold Client Sites and the Sandbox Site only, never the Operator's own projects. Keep the App's permissions as they are: contents and metadata, never workflows. Login asks GitHub for a token limited to this one repository on each use. The App itself can reach every selected repository.

## 4. Add the Site and the Owner

No one can sign up alone. In the `yesid.login` repository, `scripts/new-client.ts` generates the SQL for the Site and its first person. Follow "Add a site and a person" in its README, which owns the commands, the backup, the review and the check. Give it this Site's slug, owner, repository, `main`, a label, the installation ID, the Owner's address and `--role owner`.

Write the generated SQL to a temporary file outside any repository, because it holds a real address.

## 5. Add IT

IT is the Client's own technical person, never the Operator. The Operator holds no membership on a Client's Site and supports the Client through GitHub. If the Client has IT, add them once the Site exists. The script creates the Site, so it only runs once per Site; add IT with a membership row, against the same database and with the same care:

```sql
INSERT INTO membership (site_slug, user_id, role, confirmed_at)
SELECT '<slug>', id, 'it', datetime('now') FROM user WHERE email = '<lowercase-address>';
```

Owner and IT access never expires. The Owner or IT adds and removes Employees at `login.yesid.dev/<slug>/people`.

## 6. Prove it

First check Login itself on the production Sandbox Site, `login.yesid.dev/sandbox/`: sign in and save once. Then the Owner proves it on their own Site, on their own phone.

- [ ] At `login.yesid.dev/<slug>/`, a code arrives by email and the editor opens with the Site's own sections.
- [ ] A one-line edit in the editor creates a commit on `main`.
- [ ] A new blog post with an accented title and a phone photo saves.
- [ ] Someone who isn't a Member gets no access to the Site.
- [ ] Signing out ends the session.

## 7. Publish

Publishing is set up separately in the README's "Start a client site". A failed build keeps the previous site up and opens an issue titled `Publishing failed`, assigned to the repository owner. The Operator handles the domain, then sets `origin` to it.

After the first authorized publish, check that `<site>/admin/` leads to `login.yesid.dev/<slug>/`, that a save publishes by itself, and that `<site>/favicon.ico` returns the Client's mark.

## When it doesn't work

| What you see | Likely cause |
| --- | --- |
| `/<slug>/` is not found | No Site record, the Site is retired, or the slug is invalid or reserved |
| The editor says its configuration is unavailable | The App can't reach the repository, or `cms/config.yml` isn't on the branch. Login keeps a copy for 60 seconds |
| A person gets no code | No membership on any Site, or their only memberships are unconfirmed Employee invitations older than 7 days |
| A save is refused | The file path is outside Login's `CONTENT_FILES` rules. Check for a folder nested below its collection, a capital letter in a folder name, or an upload that isn't WebP, PNG, JPEG or AVIF |

## Optional: try a test copy on staging

A test copy of this template can point its editor at Login's staging service. In `createCmsConfig` (`src/lib/content/cms.ts`), set `loginOrigin: 'https://staging.login.yesid.dev'` and add `branch: 'staging'`, then run `bun run cms:config` and commit `cms/config.yml` on that branch, as the `staging` branch of `mgkdante/yesid-login-sandbox` does. Only the Operator's sandbox repository is installed on the staging App, so a Client's repository always uses production.

## Offboarding

When a Client leaves, Login's [Offboarding runbook](https://app.notion.com/p/4133e8630690814f84cac5c422d3be7e) owns the steps and their checks. In short:

1. Hand over a full working copy: transfer the repository to the Client's own GitHub account, or archive it if they don't want it.
2. Remove the repository from the App installation's selected repositories.
3. The Operator retires the Site in place in Login, after a database backup: `UPDATE site SET retired_at = datetime('now') WHERE slug = '<slug>'`. Its memberships and sessions end at once and every Login route for it answers 404. Retiring can't be undone, and the slug is never reused.
