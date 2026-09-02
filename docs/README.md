# Consolidated School & Youth Development Plan docs (Mintlify)

This folder is a [Mintlify](https://mintlify.com) documentation site for the District 79 Consolidated School & Youth Development Plan app.

## Preview locally

```bash
cd docs
npx mintlify dev
```

If the CLI asks for a Mintlify account, follow its login prompt.

## Configuration

**`docs.json`** is the only config file. It holds the site name, colors, fonts, navbar, footer,
and the whole navigation tree — add a page there when you add an `.mdx` file.

There used to be a `mint.json` alongside it carrying the same content in Mintlify's older
schema. Two configs describing one site is a drift hazard, and Mintlify's own migration
guidance is to delete `mint.json` once `docs.json` exists, so it is gone. Note that the
`feedback` block it used to carry has no `docs.json` equivalent: thumbs ratings and edit
suggestions are now switched on from the Add-ons page in the Mintlify dashboard.

Run `npx mintlify validate` from `docs/` after navigation edits.

## Screenshots

None of the pages carry images yet. Each place one belongs is marked in the source with an MDX
comment, which does not render:

```mdx
{/* Screenshot needed: Alt text — what to capture. */}
```

`images/placeholders/README.md` lists every outstanding capture. To fill one in, drop the image
into `images/` and replace the comment with a normal embed:

```mdx
![Alt text](/images/your-capture.png)
```

These were previously `https://placehold.co/600x400` embeds. Pointing readers at an external
placeholder service is worse than showing nothing — it renders as an obvious grey box and adds
a third-party request to every page — so the requirement now lives in source and in the
inventory instead.

## Publish

Connect this `docs/` directory to a Mintlify GitHub integration, or deploy with the Mintlify
GitHub Action using `docs.json` as the config file.
