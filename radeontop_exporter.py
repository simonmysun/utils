#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess
import re

host = 'localhost'
port = 9111

non_decimal = re.compile(r'[^\d.]+')

class radeontop_exporter_handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            res = subprocess.check_output(['radeontop', '-l', '1', '-d', '-']).decode('utf-8').split('\n')[1].split(', ')
            res = '\n'.join(list(map(lambda r: 'radeontop_' + r[0] + '{} ' + non_decimal.sub('', r[-1]), map(lambda r: r.split(' '), res)))[1:])
            self.send_response(200)
            self.send_header("Content-type", "text/plaintext")
            self.end_headers()
            self.wfile.write(bytes(res, "utf-8"))
        else:
            self.send_response(404)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(bytes("<html><head><title>404</title></head><body>404</body></html>", "utf-8"))
    def log_message(self, format, *args):
        return

if __name__ == "__main__":
    web_server = HTTPServer((host, port), radeontop_exporter_handler)
    print("Server started http://%s:%s" % (host, port))

    try:
        web_server.serve_forever()
    except KeyboardInterrupt:
        pass

    web_server.server_close()
    print("Server stopped.")
