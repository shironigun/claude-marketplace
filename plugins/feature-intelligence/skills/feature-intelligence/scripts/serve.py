#!/usr/bin/env python3
"""Serve a folder for local preview, with HTML marked as UTF-8.

    python serve.py <folder> [port]

The built page has no <meta charset> of its own (the Artifact tool adds it when it publishes), so a plain
`python -m http.server` makes the browser read it as Windows-1252: curly quotes turn into mojibake and the
page's scripts can fail with "Invalid regular expression". This server sends charset=utf-8 instead.
"""
import http.server, os, sys

folder = sys.argv[1] if len(sys.argv) > 1 else "."
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8799
os.chdir(folder)
H = http.server.SimpleHTTPRequestHandler
H.extensions_map = {**H.extensions_map, ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8"}
print(f"serving {os.getcwd()} on http://127.0.0.1:{port}/", flush=True)
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
