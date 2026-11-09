# Language

Terms used across this repository. Terms about Login, its people and its Sites follow [Login's glossary](https://github.com/mgkdante/yesid.login/blob/main/GLOSSARY.md), which owns them.

## Login and its people

**Login**: The hosted service at `login.yesid.dev` where Members sign in, edit content in the editor and, as Owner or IT, manage a Site's Employees. It never builds, publishes or hosts a Site.

**Operator**: yesid.dev, which runs Login and every Site's repository. The Operator is not a Role and holds no membership on a Client's Site.

**Client**: The person or organization a Site is made for, paid or not.

**Site**: One Client website, known to Login by its slug, with exactly one repository and branch.

**Sandbox Site**: A Site that holds only test content, owned by the Operator, used to check Login after a release.

**Member**: A person who holds a Role on a Site: Owner, IT or Employee. Every Role may edit content.

**Owner**: The Client's lead person on a Site, who decides what it says and who may edit it.

**IT**: The Client's own technical person, a Member who looks after the Site for the Client. Never the Operator.

**Employee**: A Member invited by an Owner or IT, who edits all content but does not manage people. Access starts as a pending invitation.

**Offboarding**: A Client leaving Login: their repository goes back to them or is archived, and their Site is retired in Login.

**Retired slug**: The slug of a Site that has left Login. It is never given to another Site.

## This repository

**Foundation**: The invisible parts every Client's Site shares: sign-in, publishing steps, language and SEO rules, and checks.

**Custom Design**: Everything made for one business alone: layout, sections, art, motion and the shape of its content.

**Content Contract**: The agreement about what an Owner can edit and the shape it must keep. It checks structure, never wording.

**Business Facts**: Facts about the business that appear on many surfaces at once, such as phone, email and service area.

**Fixed Page**: A page that is part of the site's structure and exists in every Active Language.

**Blog Post**: An article created by the Owner or an Employee, which may exist in only one language.

**Active Language**: A language the Owner has chosen to offer on their site.
