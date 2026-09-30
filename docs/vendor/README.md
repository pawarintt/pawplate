# Vendored frontend libraries

Served from GitHub Pages with the app so the editor and spellcheck never depend
on a third-party CDN (which stalled on weak wifi). Files never change at a
given name; the service worker (`docs/sw.js`) caches them permanently, so a
new version must use a new file name.

- `tiptap-2.11.7.js`: one ES module bundle exporting `Editor`, `Extension`,
  `StarterKit`, `Underline`, `TextStyle`, `Color`, `Highlight`, `Placeholder`.
  Every `@tiptap/*` package is pinned to 2.11.7. Rebuild in a scratch folder:

  ```
  npm init -y
  npm i esbuild @tiptap/core@2.11.7 @tiptap/pm@2.11.7 @tiptap/starter-kit@2.11.7 \
    @tiptap/extension-underline@2.11.7 @tiptap/extension-text-style@2.11.7 \
    @tiptap/extension-color@2.11.7 @tiptap/extension-highlight@2.11.7 \
    @tiptap/extension-placeholder@2.11.7
  # add "overrides" pinning every @tiptap/* dependency of starter-kit to 2.11.7
  # entry.js re-exports the names above from their packages
  npx esbuild entry.js --bundle --format=esm --minify --legal-comments=eof --outfile=tiptap-2.11.7.js
  ```

- `typo-1.3.2.js`, `typo-en_US/`: `typo.js` and `dictionaries/en_US` from the
  `typo-js@1.3.2` npm package, unchanged.
