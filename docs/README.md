# District 79 Directory docs (Mintlify)

This folder is a [Mintlify](https://mintlify.com) documentation site for the Consolidated School Plan app.

## Preview locally

```bash
cd docs
npx mintlify dev
```

If the CLI asks for a Mintlify account, follow its login prompt.

- **`mint.json`** — classic Mintlify config (anchors + grouped sidebar). Keep this in sync when you add pages.
- **`docs.json`** — current Mintlify schema. Navigation groups must list the same pages as `mint.json`.

Run `npx mintlify validate` from `docs/` after navigation edits.

## Screenshots

Until real captures exist, every MDX figure uses the same placeholder:

```md
![Descriptive Alt Text](https://placehold.co/600x400)
```

Swap those URLs for production screenshots when they are ready. Logo and favicon in `mint.json` / `docs.json` use the same placeholder URL for now.

## Publish

Connect this `docs/` directory to a Mintlify GitHub integration, or deploy with the Mintlify GitHub Action using `mint.json` as the config file.
