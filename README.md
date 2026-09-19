# salesb — Cloudflare Python Worker

This version adds:

- `Delete snapshot` button on the dashboard
- `Refresh` button
- automatic polling every 5 seconds
- authenticated `DELETE /receive?name=sales`

## Cloudflare secret

The runtime secret must be named:

`SAI_DASHBOARD_TOKEN`

The HTTP header used for POST and DELETE is:

`X-SAI-DASHBOARD-Token`

## Routes

- `GET /` — dashboard
- `GET /receive?name=sales` — latest snapshot
- `POST /receive?name=sales` — store snapshot, token required
- `DELETE /receive?name=sales` — delete snapshot, token required
- `GET /receive?name=sales&status=1` — status

The Delete button prompts for the token in the browser. The token is not embedded in the public HTML and is not stored by the page.
