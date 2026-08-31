# MaxPhotos

Dark-themed photography portfolio for Maxwell. Photos are displayed in an
edge-to-edge mosaic gallery with per-photo detail pages; every photo added
through the site is automatically signed with a translucent cursive
*maxwell* watermark.

## Running locally

```
npm install
npm run dev
```

## How photos are stored

Photos and their details live as real files in `public/photos/` —
`photos.json` is the manifest with titles, collections, descriptions, and
camera info; the images sit alongside it. Everything in that folder is
committed to the repo, so the gallery is fully portable.

`export.html` (dev-only page, open it at `/export.html` while the dev server
runs) copies photos out of the browser's local database into
`public/photos/` — used to migrate photos that were added before static
storage existed, or after adding new ones through the site.

The upload/edit UI is temporarily removed; the full version is archived in
`archive/` and can be copied back over `index.html` and `src/main.js`.
