import json
import hmac
import sys
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

from workers import Response, WorkerEntrypoint

try:
    from pyodide.ffi import jsnull
except Exception:
    jsnull = object()

MAX_BYTES = 4 * 1024 * 1024
KEY_PREFIX = "snapshot:"
NAME_CHARS = set("abcdefghijklmnopqrstuvwxyz0123456789-")
TOKEN_HEADER = "X-SAI-DASHBOARD-Token"


def json_response(payload, status=200, cors=False):
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    }
    if cors:
        headers["Access-Control-Allow-Origin"] = "*"
    return Response(
        json.dumps(payload, separators=(",", ":")),
        status=status,
        headers=headers,
    )


def valid_name(name):
    return 1 <= len(name) <= 40 and all(ch in NAME_CHARS for ch in name)


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def kv_missing(value):
    return value is None or value is jsnull or type(value).__name__ == "JsNull"


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = urlparse(request.url)

        if url.path not in ("/receive", "/receive.php"):
            return await self.env.ASSETS.fetch(request)

        params = parse_qs(url.query)
        name = params.get("name", ["sales"])[0].lower()

        if not valid_name(name):
            return json_response({"error": "bad snapshot name"}, status=400)

        key = KEY_PREFIX + name

        if "status" in params:
            stored = await self.env.SNAPSHOTS.get(key)
            snapshots = []
            try:
                listing = await self.env.SNAPSHOTS.list(prefix=KEY_PREFIX)
                for item in listing["keys"]:
                    key_name = str(item["name"])
                    if key_name.startswith(KEY_PREFIX):
                        snapshots.append(key_name[len(KEY_PREFIX):] + ".json")
            except Exception:
                snapshots = []

            modified = None
            if not kv_missing(stored):
                try:
                    parsed = json.loads(str(stored))
                    if isinstance(parsed, dict):
                        modified = parsed.get("received_at")
                except Exception:
                    pass

            try:
                token_set = bool(str(self.env.SAI_DASHBOARD_TOKEN))
            except Exception:
                token_set = False

            return json_response(
                {
                    "runtime": "Cloudflare Python Worker",
                    "python": sys.version.split()[0],
                    "storage": "Workers KV",
                    "snapshots": snapshots,
                    "this_snapshot": name,
                    "exists": not kv_missing(stored),
                    "size": len(str(stored).encode("utf-8")) if not kv_missing(stored) else 0,
                    "modified": modified,
                    "token_set": token_set,
                },
                cors=True,
            )

        if request.method == "GET":
            stored = await self.env.SNAPSHOTS.get(key)
            if kv_missing(stored):
                return json_response(
                    {"error": "no snapshot yet", "name": name},
                    status=404,
                    cors=True,
                )

            return Response(
                str(stored),
                status=200,
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-store",
                },
            )

        if request.method not in ("POST", "DELETE"):
            return json_response({"error": "GET, POST or DELETE only"}, status=405)

        try:
            expected = str(self.env.SAI_DASHBOARD_TOKEN)
        except Exception:
            return json_response(
                {"error": "server token is not configured"}, status=500
            )

        sent = request.headers.get(TOKEN_HEADER) or ""
        if not hmac.compare_digest(str(expected), str(sent)):
            return json_response({"error": "bad or missing token"}, status=401)

        if request.method == "DELETE":
            existed = not kv_missing(await self.env.SNAPSHOTS.get(key))
            await self.env.SNAPSHOTS.delete(key)
            return json_response(
                {
                    "ok": True,
                    "deleted": existed,
                    "name": name,
                    "storage_key": key,
                }
            )

        body = str(await request.text())
        body_bytes = len(body.encode("utf-8"))
        if body_bytes > MAX_BYTES:
            return json_response({"error": "snapshot too large"}, status=413)

        try:
            decoded = json.loads(body)
        except Exception:
            return json_response({"error": "body is not valid JSON"}, status=400)

        if not isinstance(decoded, dict):
            return json_response({"error": "body must be a JSON object"}, status=400)

        decoded["received_at"] = utc_now_iso()
        stored = json.dumps(decoded, separators=(",", ":"))

        await self.env.SNAPSHOTS.put(key, stored)
        return json_response(
            {
                "ok": True,
                "name": name,
                "bytes": body_bytes,
                "stored_bytes": len(stored.encode("utf-8")),
                "storage_key": key,
                "received_at": decoded["received_at"],
            }
        )
