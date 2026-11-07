# Connect a new client to the Login Site

A new client is an onboarding step, not a migration: no code change and no database migration in the Login Site. Get IT's explicit yes before adding a person or publishing a site for the first time.

The values below are placeholders. Never commit a real person's address, a client's facts or an installation ID to this template.

| Placeholder | Meaning |
| --- | --- |
| `<owner>/<repo>` | The client's private repository |
| `<slug>` | The site's name on the Login Site, as in `login.yesid.dev/<slug>/` |
| `<installation-id>` | The GitHub App installation that holds the repository |

## 1. Choose the slug

It must match `^[a-z0-9][a-z0-9.-]{0,62}$` and must not be one of the Login Site's own paths: `auth`, `api`, `admin`, `login`, `editor`, `account`, `privacy`, `terms`. `bun run test` checks this.

## 2. Create the repository

```sh
gh repo create <owner>/<repo> --private --template mgkdante/yesid.static-template --clone
```

In `src/lib/config/site.ts`, set `slug`, `repository`, `origin`, the languages and the Business Facts. Set the Worker name in `wrangler.jsonc`. Then run these and push to `main`:

```sh
bun install --frozen-lockfile
bun run cms:config
bun run check
bun run test
```

The Login Site reads `cms/config.yml` from the repository's branch, so that file must be on `main` first.

## 3. Let the GitHub App reach the repository

GitHub allows one installation of an App per account. For a repository in the account that already has the App, don't install it again:

1. Open that account's **Settings > Applications > Installed GitHub Apps > Configure** for the Login Site's App.
2. Keep **Only select repositories**, and add `<owner>/<repo>`.
3. Read the installation ID from the end of that page's address.

A repository in another account needs its own installation there, with its own ID.

Keep the App's permissions as they are: contents and metadata, never workflows. The Login Site asks GitHub for a token limited to this one repository on each use. The App itself can reach every selected repository.

## 4. Add the site record

IT runs this against the Login Site's D1 database, with a backup kept first. The Login Site's README owns the operating details.

```sql
INSERT INTO site (slug, owner, repo, branch, label, installation_id)
VALUES ('<slug>', '<owner>', '<repo>', 'main', '<label shown to people>', '<installation-id>');
```

## 5. Add the Owner and IT

No one can sign up alone. Use a lowercase address. Look up an existing person first, and reuse their ID:

```sql
SELECT id FROM user WHERE email = '<address>';
```

For someone new:

```sql
INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
VALUES ('<unique-internal-id>', '<display name>', '<address>', 0, datetime('now'), datetime('now'));
```

Then give each their role:

```sql
INSERT INTO membership (site_slug, user_id, role) VALUES ('<slug>', '<owner-user-id>', 'owner');
INSERT INTO membership (site_slug, user_id, role) VALUES ('<slug>', '<it-user-id>', 'it');
```

Owner and IT access never expires. The Owner adds and removes Employees at `login.yesid.dev/<slug>/people`.

## 6. Prove it

Use an IT account first, then have the Owner do it on their own phone.

- [ ] At `login.yesid.dev/<slug>/`, a code arrives by email and the editor opens with the site's own sections.
- [ ] A one-line edit in the editor creates a commit on `main`.
- [ ] A new blog post with an accented title and a phone photo saves.
- [ ] Someone who isn't a member gets no access to the site.
- [ ] Signing out ends the session.

## 7. Publish

Publishing is set up separately in the README's "Start a client site". A failed build keeps the previous site up and opens an issue titled `Publishing failed`, assigned to the repository owner. IT handles the domain, then sets `origin` to it.

After the first authorized publish, check that `<site>/admin/` leads to `login.yesid.dev/<slug>/` and that a save publishes by itself.

## When it doesn't work

| What you see | Likely cause |
| --- | --- |
| `/<slug>/` is not found | No site record, or the slug is invalid or reserved |
| The editor says its configuration is unavailable | The App can't reach the repository, or `cms/config.yml` isn't on the branch. The Login Site keeps a copy for 60 seconds |
| A person gets no code | No membership on any site, or their only memberships are unconfirmed Employee invitations older than 7 days |
| A save is refused | The file path is outside the Login Site's `CONTENT_FILES` rules. Check for a folder nested below its collection, a capital letter in a folder name, or an upload that isn't WebP, PNG, JPEG or AVIF |

## When a client leaves

Hand over a full working copy. Then remove their memberships, and remove the repository from the App's selected repositories. The site record stays while retained edit logs refer to it.
