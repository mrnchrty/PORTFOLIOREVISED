#!/usr/bin/env python3
"""Static preview server for Cha's portfolio.

Serves the cha-portfolio folder on 0.0.0.0 and redirects "/" to the
portfolio homepage, so the preview opens on the real site instead of a
directory listing.

Usage:  python3 scripts/preview.py        (default port 4173)
        PORT=8080 python3 scripts/preview.py
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(REPO_ROOT, "cha-portfolio")


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/portfolio/index.html")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return None
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4173"))
    handler = partial(Handler, directory=ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    server.daemon_threads = True
    print(f"Serving {ROOT} on 0.0.0.0:{port}", flush=True)
    server.serve_forever()
