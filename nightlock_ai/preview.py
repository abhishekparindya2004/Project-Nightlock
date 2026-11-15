"""Run just the NightLock assistant, with no website or dependencies required."""
import argparse
from socketserver import ThreadingMixIn
from wsgiref.simple_server import WSGIServer, make_server

from .assistant import wrap


class Server(ThreadingMixIn, WSGIServer):
    daemon_threads = True


def page(env,start):
    if env.get("PATH_INFO") == "/":
        start("302 Found",[("Location","/nightlock_ai/preview.html"),("Content-Length","0")])
    else:
        start("404 Not Found",[("Content-Type","text/plain; charset=utf-8"),("Content-Length","0")])
    return [b""]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port",type=int,default=8018)
    args = parser.parse_args()
    with make_server("127.0.0.1",args.port,wrap(page),server_class=Server) as server:
        print(f"NightLock preview: http://127.0.0.1:{args.port}/",flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__=="__main__":
    main()
