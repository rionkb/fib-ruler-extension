# Fib Ruler for Chrome

Fib Ruler is a small Chrome Manifest V3 extension that places a visual Fibonacci ruler over charts, images, and web pages. It does not use chart APIs, OCR, page prices, cookies, local storage, analytics, telemetry, or network requests.

## Features

- Viewport-fixed SVG overlay isolated in Shadow DOM
- Shift+A to arm drawing, then drag from A to B
- Shift+D to delete the placed ruler
- Ctrl+Alt+F to switch between EDIT and LOCK
- Editable handles and whole-ruler dragging in EDIT
- Level visibility and custom levels from the ruler context menu
- Per-tab session restoration and live settings

## Permissions

The extension requests `activeTab`, `scripting`, and `storage`. `activeTab` lets the user grant access only to the current tab when **Enable on this tab** is pressed; no `<all_urls>` host permission is requested. Chrome internal pages and the Chrome Web Store cannot be injected and are reported without crashing.

## Build

```bash
npm install
npm run typecheck
npm test
npm run build
```

Load the generated `dist/` directory from `chrome://extensions` with **Developer mode** and **Load unpacked**.

## Controls and settings

Default controls are Shift+A (Draw), Shift+D (Delete), and Ctrl+Alt+F (EDIT/LOCK). Options lets you change Draw/Delete shortcuts, colors, and band opacity. Settings are saved live.

## Limitations

Fib Ruler is unavailable on `chrome://`, Chrome Web Store pages, and some other browser-internal pages. Browser or operating-system shortcuts may still take precedence. The extension does not read page data and does not support a price-axis-aware mode.

The Windows version is maintained separately at [rionkb/fib-ruler](https://github.com/rionkb/fib-ruler).

License: not specified.
