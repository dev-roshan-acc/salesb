# salesb — Cloudflare Python Worker

This project serves the static dashboard from `public/index.html` and handles snapshot API requests with a Python Worker in `src/index.py`.

## Deploy

Cloudflare Workers Builds settings:

- Build command: leave empty
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

The Wrangler config explicitly includes `disable_python_external_sdk` so this project can use Cloudflare's built-in Python Workers SDK while deploying directly with Wrangler. This avoids requiring Pywrangler for this dependency-free Worker.

## Secret

Add the Worker secret `SAI_TOKEN` in Cloudflare Dashboard -> Workers & Pages -> salesb -> Settings -> Variables and Secrets.

## Routes

- `GET /` -> dashboard
- `GET /receive?name=sales` -> latest stored JSON snapshot
- `POST /receive?name=sales` -> store JSON snapshot (requires `X-SAI-Token`)
- `GET /receive?name=sales&status=1` -> status
- `/receive.php` remains an alias handled by Python; there is no PHP runtime/file.

## Runtime null fix
Cloudflare's built-in Python SDK can expose a missing KV value as Pyodide `jsnull` rather than Python `None`. This project explicitly handles both, so an empty KV returns a real JSON 404 response instead of the text `jsnull`.
