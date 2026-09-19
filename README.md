# salesb — Cloudflare Python Worker

This project was converted from `receive.php` to a Cloudflare Python Worker.
There is no PHP runtime and no `.php` file in the project.

## What changed

- `receive.php` was replaced by `src/index.py`.
- The dashboard now reads `/receive?name=sales`.
- `/receive.php` is still accepted as a temporary compatibility URL for an existing publisher.
- Snapshot data is stored in Cloudflare Workers KV instead of a local `data/` directory.
- The upload token is no longer hard-coded in source control. It must be configured as the Worker secret `SAI_TOKEN`.

## Cloudflare deployment

The `SNAPSHOTS` KV binding has no ID in `wrangler.jsonc` on purpose. Current Wrangler can auto-provision the KV namespace on deployment.

### Cloudflare Git build settings

Use:

- Build command: leave empty
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

Push the project to GitHub and let Cloudflare deploy it.

## Set the SAI token

After the first deployment, set the secret in Cloudflare:

**Workers & Pages → salesb → Settings → Variables and Secrets → Add → Secret**

Name:

`SAI_TOKEN`

Value: use the same token configured in the Santosh AI publisher, or rotate both sides to a new long random token.

You can also set it from a terminal after logging into Wrangler:

```bash
npx wrangler secret put SAI_TOKEN
```

Do not commit the real token to GitHub.

## URLs

Dashboard:

`https://YOUR-WORKER.workers.dev/`

Read snapshot:

`https://YOUR-WORKER.workers.dev/receive?name=sales`

Health/status:

`https://YOUR-WORKER.workers.dev/receive?name=sales&status=1`

POST snapshot:

`POST https://YOUR-WORKER.workers.dev/receive?name=sales`

Headers:

```text
Content-Type: application/json
X-SAI-Token: YOUR_TOKEN
```

The old URL `/receive.php?name=sales` is also handled by the Python Worker so the sender does not need to be changed immediately.

## Local test

```bash
npm install
cp .dev.vars.example .dev.vars
# edit .dev.vars and add your token
npx wrangler dev
```

Then open `http://localhost:8787/`.
