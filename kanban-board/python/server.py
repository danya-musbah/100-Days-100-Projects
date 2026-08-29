"""
Kanban Board — optional local server.
"""

import json
import os
import sys
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
BOARD_FILE = DATA_DIR / "board.json"
DEMO_FILE = DATA_DIR / "demo-board.json"

DEFAULT_PORT = 8000
DEFAULT_HOST = "127.0.0.1"

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not BOARD_FILE.exists():
        if DEMO_FILE.exists():
            BOARD_FILE.write_text(DEMO_FILE.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            empty = {
                "board": {
                    "id": "default-board",
                    "name": "My Kanban Board",
                    "createdAt": now_iso(),
                    "updatedAt": now_iso(),
                },
                "columns": [
                    {"id": "todo", "title": "To Do", "position": 0},
                    {"id": "in-progress", "title": "In Progress", "position": 1},
                    {"id": "review", "title": "Review", "position": 2},
                    {"id": "done", "title": "Done", "position": 3},
                ],
                "tasks": [],
                "settings": {
                    "theme": "dark",
                    "storageMode": "server",
                    "confirmBeforeDelete": True,
                    "animations": True,
                    "compactMode": False,
                },
            }
            BOARD_FILE.write_text(json.dumps(empty, indent=2), encoding="utf-8")


def validate_board_shape(data):
    """Minimal structural validation. Returns (is_valid, error_message)."""
    if not isinstance(data, dict):
        return False, "Body must be a JSON object."
    if "board" not in data or not isinstance(data["board"], dict):
        return False, "Missing 'board' object."
    if "columns" not in data or not isinstance(data["columns"], list) or not data["columns"]:
        return False, "Missing or empty 'columns' array."
    if "tasks" not in data or not isinstance(data["tasks"], list):
        return False, "Missing 'tasks' array."
    column_ids = set()
    for col in data["columns"]:
        if not isinstance(col, dict) or "id" not in col or "title" not in col:
            return False, "Each column needs an 'id' and 'title'."
        column_ids.add(col["id"])
    for task in data["tasks"]:
        if not isinstance(task, dict) or "id" not in task or "title" not in task or "columnId" not in task:
            return False, "Each task needs 'id', 'title', and 'columnId'."
        if task["columnId"] not in column_ids:
            return False, f"Task '{task.get('title')}' references an unknown column."
    return True, None


class KanbanRequestHandler(BaseHTTPRequestHandler):
    server_version = "KanbanBoardHTTP/1.0"

    # Silence default noisy logging; keep it concise instead.
    def log_message(self, fmt, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")

    # ---- helpers -----------------------------------------------------
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _send_error_json(self, message, status=400):
        self._send_json({"error": message}, status=status)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length == 0:
            return None, "Empty request body."
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8")), None
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None, "Body is not valid JSON."

    def _serve_static(self, url_path):
        # Prevent path traversal outside the project root.
        clean_path = urllib.parse.unquote(url_path.split("?")[0])
        if clean_path in ("", "/"):
            clean_path = "/index.html"
        rel_path = clean_path.lstrip("/")
        target = (PROJECT_ROOT / rel_path).resolve()

        if PROJECT_ROOT not in target.parents and target != PROJECT_ROOT:
            self._send_error_json("Forbidden.", 403)
            return
        if not target.exists() or target.is_dir():
            self._send_error_json("Not found.", 404)
            return

        mime = MIME_TYPES.get(target.suffix, "application/octet-stream")
        try:
            body = target.read_bytes()
        except OSError:
            self._send_error_json("Could not read file.", 500)
            return

        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ---- HTTP verbs ----------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/health":
            self._send_json({"status": "ok", "time": now_iso()})
            return

        if parsed.path == "/api/board":
            ensure_data_dir()
            try:
                data = json.loads(BOARD_FILE.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                self._send_error_json("Board file is missing or corrupted.", 500)
                return
            self._send_json(data)
            return

        self._serve_static(parsed.path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path in ("/api/board", "/api/export"):
            data, err = self._read_json_body()
            if err:
                self._send_error_json(err, 400)
                return
            valid, err = validate_board_shape(data)
            if not valid:
                self._send_error_json(err, 422)
                return
            ensure_data_dir()
            data.setdefault("board", {})["updatedAt"] = now_iso()
            try:
                BOARD_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
            except OSError:
                self._send_error_json("Could not write board file.", 500)
                return
            self._send_json({"status": "saved", "time": now_iso()})
            return

        self._send_error_json("Unknown endpoint.", 404)


def main():
    host = os.environ.get("KANBAN_HOST", DEFAULT_HOST)
    port = int(os.environ.get("KANBAN_PORT", DEFAULT_PORT))

    ensure_data_dir()

    server = ThreadingHTTPServer((host, port), KanbanRequestHandler)
    url = f"http://{host}:{port}/"
    print("=" * 60)
    print(" Kanban Board — optional Python server")
    print("=" * 60)
    print(f" Serving project from: {PROJECT_ROOT}")
    print(f" Board data file:      {BOARD_FILE}")
    print(f" Open in your browser: {url}")
    print(" Press Ctrl+C to stop.")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server…")
        server.shutdown()


if __name__ == "__main__":
    main()
