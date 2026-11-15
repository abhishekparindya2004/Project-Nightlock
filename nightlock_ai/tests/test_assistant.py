import contextlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from threading import Thread
import unittest
from unittest.mock import patch
from urllib import error, request
from wsgiref.simple_server import WSGIRequestHandler, make_server

from nightlock_ai.assistant import wrap
from nightlock_ai.preview import Server


class MockOllama(BaseHTTPRequestHandler):
    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        self.server.calls.append((self.path, data))
        if self.server.redirect:
            self.send_response(302)
            self.send_header("Location","http://example.invalid/")
            self.end_headers()
            return
        payload = json.dumps({"choices":[{"message":{"content":"Mock model reply."}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self,*args):
        pass


class Quiet(WSGIRequestHandler):
    def log_message(self,*args):
        pass


@contextlib.contextmanager
def live(server):
    thread = Thread(target=server.serve_forever, kwargs={"poll_interval":.02}, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def original(env,start):
    start("200 OK",[("Content-Type","text/plain"),("Content-Length","16")])
    return [b"Original handler"]


def api(url, path="/api/nightlock-ai", payload=None, **headers):
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    req = request.Request(url+path,data=data,headers=headers)
    try:
        response = request.urlopen(req,timeout=3)
    except error.HTTPError as exc:
        response = exc
    with response as r:
        body = r.read()
        return r.status, json.loads(body) if r.headers.get_content_type()=="application/json" else body


class TestNightLock(unittest.TestCase):
    def test_preview_assets_and_existing_routes(self):
        with patch.dict(os.environ,{"NIGHTLOCK_AI_MODEL":""}):
            with live(make_server("127.0.0.1",0,wrap(original),server_class=Server,handler_class=Quiet)) as web:
                self.assertEqual(api(web),(200,{"mode":"guide","webSearch":False}))
                self.assertIn(b"NightLock Assistant Preview",api(web,"/nightlock_ai/preview.html")[1])
                self.assertIn(b"wave-arm",api(web,"/nightlock_ai/widget.js")[1])
                self.assertIn(b"prefers-reduced-motion",api(web,"/nightlock_ai/widget.css")[1])
                self.assertEqual(api(web,"/admin/"),(200,b"Original handler"))
                self.assertEqual(api(web,payload={"message":"Hello"})[0],503)

    def test_ai_request_has_public_context_and_conversation(self):
        upstream = ThreadingHTTPServer(("127.0.0.1",0),MockOllama)
        upstream.calls, upstream.redirect = [], False
        data = {"events":[{"title":"Meteor watch","date":"2099-01-10","summary":"Watch together."},
                          {"title":"Do not show this","date":"2099-01-11","status":"Archived example · not bookable"}]}
        history = [{"role":"user","content":"What can you do?"},{"role":"assistant","content":"Find astronomy eve."}]
        with live(upstream) as model, patch.dict(os.environ,{"NIGHTLOCK_AI_MODEL":"mock:3b","NIGHTLOCK_AI_OLLAMA_URL":model}):
            with live(make_server("127.0.0.1",0,wrap(original,lambda:data),server_class=Server,handler_class=Quiet)) as web:
                self.assertEqual(api(web),(200,{"mode":"ai","webSearch":False}))
                status, result = api(web,payload={"message":"Any upcoming events?","history":history},Origin=web)
                self.assertEqual(status,200)
                self.assertEqual(result,{"answer":"Mock model reply.","links":["event.html"],"citations":[],"mode":"ai"})
                path, sent = upstream.calls[0]
                self.assertEqual(path,"/v1/chat/completions")
                self.assertEqual(sent["model"],"mock:3b")
                self.assertEqual(sent["messages"][1:3],history)
                self.assertIn("Meteor watch",sent["messages"][0]["content"])
                self.assertNotIn("Do not show this",sent["messages"][0]["content"])
                self.assertEqual(api(web,payload={"message":"Hi"},Origin="https://wrong.example")[0],403)
                self.assertEqual(api(web,payload={"message":"x"*1001})[0],400)
                self.assertEqual(api(web,payload={"message":"Hello","history":[{"role":"system","content":"Test"}]})[0],400)
                self.assertEqual(len(upstream.calls),1)
                upstream.redirect = True
                self.assertEqual(api(web,payload={"message":"Hi"})[0],502)

    def test_live_web_search_payload_and_citations(self):
        article={"id":"survey-notes","title":"NightLock SPHEREx notes","body":"Published survey context.","summary":"Survey summary."}
        answer="NASA runs the mission. See NightLock [NL1]."
        fake_reply={"output":[{"type":"web_search_call"},{"type":"message","content":[{"type":"output_text","text":answer,
                    "annotations":[{"type":"url_citation","url":"https://science.nasa.gov/mission/spherex/","title":"NASA SPHEREx","end_index":22},
                    {"type":"url_citation","url":"javascript:alert(1)","title":"Bad URL","end_index":22}]}]}]}
        with patch.dict(os.environ,{"NIGHTLOCK_OPENAI_API_KEY":"mock-key"}), patch(
            "nightlock_ai.assistant.CLIENT.open",return_value=io.BytesIO(json.dumps(fake_reply).encode())) as upstream:
            with live(make_server("127.0.0.1",0,wrap(original,lambda:{"articles":[article]}),server_class=Server,handler_class=Quiet)) as web:
                self.assertEqual(api(web),(200,{"mode":"ai","webSearch":True}))
                status,result=api(web,payload={"message":"What is the latest from SPHEREx?"},Origin=web)
        self.assertEqual(status,200)
        self.assertEqual(result["answer"],answer)
        self.assertEqual([x["url"] for x in result["citations"]],["https://science.nasa.gov/mission/spherex/","details.html?article=survey-notes"])
        sent=upstream.call_args.args[0]
        self.assertEqual(sent.full_url,"https://api.openai.com/v1/responses")
        self.assertEqual(sent.get_header("Authorization"),"Bearer mock-key")
        body=json.loads(sent.data)
        self.assertEqual(body["tools"],[{"type":"web_search"}])
        self.assertFalse(body["store"])
        self.assertIn("Published survey context",body["input"][0]["content"])


    def test_non_local_model_rejected(self):
        with patch.dict(os.environ,{"NIGHTLOCK_AI_MODEL":"model","NIGHTLOCK_AI_OLLAMA_URL":"https://example.invalid"}):
            with live(make_server("127.0.0.1",0,wrap(original),server_class=Server,handler_class=Quiet)) as web:
                self.assertEqual(api(web)[0],503)


if __name__ == "__main__":
    unittest.main()
