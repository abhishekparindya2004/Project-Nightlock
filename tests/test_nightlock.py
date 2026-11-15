import copy
from email import policy
from email.parser import BytesParser
import http.cookiejar
import json
import os
from pathlib import Path
import re
import socketserver
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

from backend import server


class SMTPHandler(socketserver.StreamRequestHandler):
    def handle(self):
        self.wfile.write(b"220 localhost test SMTP\r\n")
        receiving = False
        chunks = []
        while line := self.rfile.readline():
            if receiving:
                if line == b".\r\n":
                    self.server.received.append(b"".join(chunks))
                    chunks = []
                    receiving = False
                    self.wfile.write(b"250 accepted\r\n")
                else:
                    chunks.append(line[1:] if line.startswith(b"..") else line)
                continue
            cmd = line.split(maxsplit=1)[0].upper()
            if cmd == b"DATA":
                self.wfile.write(b"354 send it\r\n")
                receiving = True
            elif cmd == b"QUIT":
                self.wfile.write(b"221 goodbye\r\n")
                break
            else:
                self.wfile.write(b"250 localhost\r\n")


class TestNightLock(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        state = Path(cls.temp.name)
        cls.patch = patch.multiple(server, STATE=state, DB=state/"test.sqlite3", MEDIA=state/"media")
        cls.patch.start()
        cls.addClassCleanup(cls.patch.stop)
        server.initialize()
        cls.password = "test-only-password-548!"
        with server.db() as c:
            server.set_value(c, "password", server.password_hash(cls.password))
        cls.web = server.make_server("127.0.0.1", 0, server.app, server_class=server.ThreadedServer,
                                     handler_class=server.PrivacyHandler)
        cls.base = f"http://127.0.0.1:{cls.web.server_port}"
        cls.thread = threading.Thread(target=cls.web.serve_forever, daemon=True)
        cls.thread.start()
        cls.addClassCleanup(cls.web.server_close)
        cls.addClassCleanup(cls.web.shutdown)

    def setUp(self):
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def test_existing_database_gets_launch_event_once(self):
        with tempfile.TemporaryDirectory() as temp:
            state=Path(temp)
            with patch.multiple(server,STATE=state,DB=state/"test.sqlite3",MEDIA=state/"media"):
                server.initialize()
                with server.db() as c:
                    site=json.loads(server.value(c,"site"))
                    site["events"]=[r for r in site["events"] if r["id"]!="launching-of-the-project-nightlock"]
                    server.set_value(c,"site",json.dumps(site,ensure_ascii=False))
                    announced=json.loads(server.value(c,"announced"))
                    announced.pop("event:launching-of-the-project-nightlock",None)
                    server.set_value(c,"announced",json.dumps(announced))
                server.initialize()
                with server.db() as c:
                    site=json.loads(server.value(c,"site"))
                    self.assertEqual(sum(r["id"]=="launching-of-the-project-nightlock" for r in site["events"]),1)
                    announced=json.loads(server.value(c,"announced"))
                    self.assertIn("event:launching-of-the-project-nightlock",announced)

    def test_existing_database_migrates_team_poster_once(self):
        with tempfile.TemporaryDirectory() as temp:
            state = Path(temp)
            with patch.multiple(server, STATE=state, DB=state/"test.sqlite3", MEDIA=state/"media"):
                server.initialize()
                with server.db() as c:
                    site = json.loads(server.value(c, "site"))
                    site["videos"]["our-team"]["poster"] = "images/image25-copyright-qh4vrvpwev4p8q7alzfdnp3xveh36w0a9ur6b9874k.jpg"
                    server.set_value(c, "site", json.dumps(site, ensure_ascii=False))
                    revision = int(server.value(c, "revision"))
                server.initialize()
                with server.db() as c:
                    site = json.loads(server.value(c, "site"))
                    self.assertEqual(site["videos"]["our-team"]["poster"], "images/our-team-video-poster.png")
                    migrated_revision = int(server.value(c, "revision"))
                self.assertEqual(migrated_revision, revision + 1)
                server.initialize()
                with server.db() as c:
                    self.assertEqual(int(server.value(c, "revision")), migrated_revision)

    def test_gallery_uses_requested_frames_across_all_detectors(self):
        expected = [
            "sky-explorer-for-abhishek/images/spherex/barnards_star/SPHEREx-D1/frame_000.png",
            "sky-explorer-for-abhishek/images/spherex/barnards_star/SPHEREx-D2/frame_001.png",
            "sky-explorer-for-abhishek/images/spherex/barnards_star/SPHEREx-D3/frame_007.png",
            "sky-explorer-for-abhishek/images/spherex/barnards_star/SPHEREx-D4/frame_000.png",
            "sky-explorer-for-abhishek/images/spherex/barnards_star/SPHEREx-D5/frame_010.png",
            "sky-explorer-for-abhishek/images/spherex/barnards_star/SPHEREx-D6/frame_021.png",
        ]
        gallery = server.SEED["gallery"]
        self.assertEqual([item["image"] for item in gallery], expected)
        self.assertTrue(all((server.ROOT / image).is_file() for image in expected))
        self.assertEqual(len(gallery), 6)

    def test_existing_database_migrates_gallery_frames_once(self):
        with tempfile.TemporaryDirectory() as temp:
            state = Path(temp)
            with patch.multiple(server, STATE=state, DB=state/"test.sqlite3", MEDIA=state/"media"):
                server.initialize()
                with server.db() as c:
                    old_gallery = [{"id": "gallery-1", "image": "images/image5-copyright.jpg"}]
                    site = json.loads(server.value(c, "site"))
                    site["gallery"] = old_gallery
                    server.set_value(c, "site", json.dumps(site, ensure_ascii=False))
                    c.execute("DELETE FROM store WHERE key='gallery_frames_version'")
                server.initialize()
                with server.db() as c:
                    site = json.loads(server.value(c, "site"))
                    self.assertEqual([item["image"] for item in site["gallery"]],
                                     [item["image"] for item in server.SEED["gallery"]])
                    site["gallery"] = old_gallery
                    server.set_value(c, "site", json.dumps(site, ensure_ascii=False))
                server.initialize()
                with server.db() as c:
                    site = json.loads(server.value(c, "site"))
                    self.assertEqual(site["gallery"], old_gallery)

    def request(self, path, value=None, csrf=None, ctype="application/json", opener=None, headers=None):
        headers = dict(headers or {})
        if value is not None:
            headers["Content-Type"] = ctype
            if not isinstance(value, bytes):
                value = json.dumps(value).encode()
        if csrf is not None:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(self.base+path, data=value, headers=headers)
        try:
            r = (opener or self.client).open(req, timeout=5)
        except urllib.error.HTTPError as e:
            r = e
        with r:
            raw = r.read()
            if r.headers.get_content_type() == "application/json":
                raw = json.loads(raw)
            return r.status, raw, r.headers

    def login(self):
        code, data, headers = self.request("/api/admin/login", {"email":server.ADMIN_EMAIL, "password":self.password})
        self.assertEqual(code, 200)
        self.assertIn("HttpOnly", headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", headers["Set-Cookie"])
        return data["csrf"]

    def test_00_ai_widget_assets_and_quick_guide(self):
        for path in ("/nightlock_ai/widget.js", "/nightlock_ai/widget.css"):
            code, body, _ = self.request(path)
            self.assertEqual(code, 200)
            self.assertTrue(body)
        with patch.dict(os.environ, {"NIGHTLOCK_AI_MODEL": ""}):
            code, payload, _ = self.request("/api/nightlock-ai")
        self.assertEqual((code, payload), (200, {"mode": "guide","webSearch":False}))

    def test_01_public_pages_and_private_data(self):
        for p in server.PAGES:
            code, body, _ = self.request(f"/{p}.html")
            self.assertEqual(code, 200)
            self.assertEqual(body.count(b'id="nl-subscribe"'), 1, p)
            self.assertEqual(body.count(b'data-nl-scroll'), 1, p)
        code, blink, _ = self.request("/blink.html")
        self.assertEqual(code, 200)
        self.assertIn(b"human-blink", blink)
        self.assertIn(b"images/image24-copyright-qh4vrvpwev4elp6nyfbatloc2loi4mkvbn3i248eto.jpg", blink)
        self.assertEqual(self.request("/images/IMG_0492.jpg")[0], 200)
        team=self.request("/our-team.html")[1]
        self.assertIn(b'src="images/IMG_0492.jpg"',team)
        observatory=self.request("/observatory.html")[1]
        self.assertIn(b'src="images/image24-copyright-qh4vrvpwev4elp6nyfbatloc2loi4mkvbn3i248eto.jpg"',observatory)
        code, explorer, _ = self.request("/sky-explorer-for-abhishek/sky-explorer.html")
        self.assertEqual(code, 200)
        self.assertIn(b"NightLock", explorer)
        self.assertEqual(self.request("/sky-explorer-for-abhishek/css/nightlock-explorer.css")[0],200)
        self.assertIn(b"sky-explorer-for-abhishek/sky-explorer.html",self.request("/index.html")[1])
        self.assertNotIn(b"Peter Bowman",self.request("/details.html")[1])
        for path in ("/server.py", "/backend/data/editor.json", "/instance/nightlock.sqlite3", "/api/admin/site"):
            self.assertIn(self.request(path)[0], (401,404))
        public=self.request("/api/site")[1]
        self.assertEqual(len(public["gallery"]),6)
        self.assertEqual(public["videos"]["our-team"]["poster"],"images/our-team-video-poster.png")
        self.assertIn(b"images/our-team-video-poster.png",self.request("/our-team.html")[1])
        article=next(r for r in public["articles"] if r["id"]=="spherex-first-year-data")
        self.assertTrue(all("nasa.gov" in s["url"] or "science.nasa.gov" in s["url"] for s in article["sources"]))
        self.assertTrue(public["videos"]["gallery"]["url"].startswith("https://youtu.be/V-UhPS1Jwl4"))
        launch=next(r for r in public["events"] if r["id"]=="launching-of-the-project-nightlock")
        self.assertEqual((launch["date"],launch["location"],launch["eventTime"]),("2026-11-15","SLIIT Malabe, Colombo","15:30–16:30"))
        self.assertTrue(launch["calendar"])
        self.assertEqual(self.request("/css/nightlock-additions.css")[0],200)
        self.assertIn(b"Admin sign-in",self.request("/admin/")[1])
        self.assertEqual(self.request("/admin/assets/admin.js")[0],200)
        self.assertEqual(self.request("/backend/server.py")[0],404)

    def test_02_auth_and_media(self):
        self.assertEqual(self.request("/api/admin/login", {"email":server.ADMIN_EMAIL, "password":"bad"})[0],401)
        csrf = self.login()
        _, payload, _ = self.request("/api/admin/site")
        self.assertGreater(len(payload["fields"]), 200)
        self.assertEqual(self.request("/api/admin/site",{"site":payload["site"],"revision":payload["revision"]})[0],403)
        self.assertEqual(self.request("/api/admin/site",{"site":payload["site"],"revision":payload["revision"]},csrf,headers={"Origin":"https://example.invalid"})[0],403)
        self.assertEqual(self.request("/api/admin/media",b"<script>test</script>",csrf,ctype="text/html")[0],400)
        image = (server.ROOT/"images/nightlock-favicon-32.png").read_bytes()
        code, uploaded, _ = self.request("/api/admin/media",image,csrf,ctype="image/png")
        self.assertEqual(code,201)
        code, result, headers = self.request("/"+uploaded["url"],headers={"Range":"bytes=0-7"})
        self.assertEqual((code,result),(206,image[:8]))
        self.assertEqual(headers["X-Content-Type-Options"],"nosniff")
        self.assertEqual(self.request("/api/admin/logout",{},csrf)[0],200)
        self.assertEqual(self.request("/api/admin/site")[0],401)

    def test_03_review_and_publish(self):
        csrf = self.login()
        start_revision=self.request("/api/site")[1]["revision"]
        self.assertEqual(self.request("/api/revision")[1]["revision"],start_revision)
        self.assertEqual(self.request("/api/feedback",{"name":"Test visitor","text":"Album feedback","consent":True})[0],201)
        self.assertEqual(self.request("/api/site")[1]["feedback"][0]["text"],"Album feedback")
        public_feedback=self.request("/api/feedback")[1]["entries"]
        self.assertEqual(public_feedback[0]["text"],"Album feedback")
        self.assertNotIn("status",public_feedback[0])
        feedback=self.request("/api/admin/feedback")[1]["entries"][0]
        self.assertEqual(self.request("/api/admin/feedback",{"id":feedback["id"],"status":"approved"},csrf)[0],200)
        self.assertEqual(self.request("/api/site")[1]["feedback"][0]["text"],"Album feedback")
        self.assertEqual(self.request("/api/admin/feedback",{"id":feedback["id"],"status":"edit","name":"Edited visitor","text":"Edited feedback"},csrf)[0],200)
        self.assertEqual(self.request("/api/feedback")[1]["entries"][0]["name"],"Edited visitor")
        self.assertEqual(self.request("/api/site")[1]["feedback"][0]["text"],"Edited feedback")
        self.assertEqual(self.request("/api/admin/feedback",{"id":feedback["id"],"status":"hidden"},csrf)[0],200)
        self.assertEqual(self.request("/api/site")[1]["feedback"],[])
        self.assertEqual(self.request("/api/feedback")[1]["entries"],[])
        self.assertEqual(self.request("/api/subscribe",{"email":"test-nightlock@example.invalid"})[0],201)
        _, payload, _=self.request("/api/admin/site")
        site=payload["site"];rev=payload["revision"]
        broken=copy.deepcopy(site)
        broken["articles"].append({"id":"bad","title":"No detail"})
        self.assertEqual(self.request("/api/admin/site",{"site":broken,"revision":rev},csrf)[0],400)
        broken=copy.deepcopy(site)
        broken["overrides"]["nav.link.index"]={"url":"javascript:alert(1)"}
        self.assertEqual(self.request("/api/admin/site",{"site":broken,"revision":rev},csrf)[0],400)
        site["articles"].append({"id":"test-article","title":"Test Article","date":"2026-12-07","category":"Science","summary":"A new post","body":"A complete body","placement":["recent","latest"],"document":"uploads/guide.pdf"})
        site["events"].append({"id":"test-event","title":"Test Event","date":"2026-12-08","summary":"A new event","body":"Details for the event","schedule":True})
        site["people"].append({"id":"test-astronaut","title":"Test Astronaut","role":"Astronaut","summary":"The introduction","body":"Biography text","kind":"astronaut","institutes":[{"title":"Institute","image":"images/nightlock-favicon-32.png"}]})
        site["gallery"].append({"id":"test-gallery","title":"A new album photo","image":"images/nightlock-favicon-32.png"})
        site["blocks"]["index"]=[{"title":"New document","document":"uploads/report.pdf"}]
        site["overrides"]["nav.link.index"]={"text":"Start","url":"index.html"}
        code, saved, _=self.request("/api/admin/site",{"site":site,"revision":rev},csrf)
        self.assertEqual(code,200,saved)
        self.assertEqual(saved["queued"],1)
        self.assertGreater(saved["revision"],start_revision)
        revision_code,revision_data,revision_headers=self.request("/api/revision")
        self.assertEqual(revision_code,200)
        self.assertEqual(revision_data["revision"],saved["revision"])
        self.assertEqual(revision_headers["Cache-Control"],"no-store")
        self.assertEqual(self.request("/api/admin/site",{"site":site,"revision":rev},csrf)[0],409)
        public=self.request("/api/site")[1]
        self.assertEqual(public["revision"],saved["revision"])
        self.assertEqual(public["articles"][-1]["placement"],["recent","latest"])
        self.assertTrue(public["events"][-1]["schedule"])
        self.assertEqual(public["people"][-1]["kind"],"astronaut")
        self.assertEqual(public["gallery"][-1]["id"],"test-gallery")
        self.assertEqual(public["overrides"]["nav.link.index"]["text"],"Start")
        self.assertNotIn("test-nightlock@example.invalid",json.dumps(public))

        with socketserver.TCPServer(("127.0.0.1",0),SMTPHandler) as smtp:
            smtp.received=[]
            threading.Thread(target=smtp.serve_forever,daemon=True).start()
            options={"NIGHTLOCK_SMTP_HOST":"127.0.0.1","NIGHTLOCK_SMTP_MODE":"plain",
                     "NIGHTLOCK_SMTP_PORT":str(smtp.server_address[1]),"NIGHTLOCK_MAIL_FROM":"site@example.invalid",
                     "NIGHTLOCK_SMTP_USER":""}
            try:
                with patch.dict(os.environ,options), patch.object(server,"PUBLIC_URL",self.base):
                    server.deliver()
            finally:
                smtp.shutdown()
            self.assertEqual(len(smtp.received),1)
            received=BytesParser(policy=policy.default).parsebytes(smtp.received[0])
            self.assertIn("test-nightlock@example.invalid",received["To"])
            body=received.get_body().get_content()
            self.assertIn("/details.html?event=test-event",body)
            self.assertIn("/details.html?article=test-article",body)
            self.assertIn("/index.html#nightlock-update-1",body)
            token=re.search(r"/unsubscribe\?token=([\w-]+)",body).group(1)
        self.assertEqual(self.request("/api/unsubscribe",{"token":token})[0],200)
        self.assertEqual(self.request("/api/admin/newsletter")[1]["subscribers"],0)
        self.assertEqual(self.request("/api/admin/newsletter")[1]["sent"],1)

    def test_04_scheduled_releases_are_private_then_announced_once(self):
        csrf=self.login()
        _, start, _=self.request("/api/admin/site")
        site, rev=start["site"],start["revision"]
        self.assertEqual(self.request("/api/subscribe",{"email":"schedule@example.invalid"})[0],201)
        code, upload, _=self.request("/api/admin/media",b"band,value\n01,2\n",csrf,ctype="text/csv")
        self.assertEqual(code,201)
        path="/"+upload["url"]
        visitor=urllib.request.build_opener()
        self.assertEqual(self.request(path,opener=visitor)[0],404)
        record={"id":"scheduled-test","title":"Future data release","summary":"Observing data set","body":"PRIVATE BEFORE RELEASE",
                "category":"Data","placement":["home","recent","popular"],"document":upload["url"],"publishAt":"2099-01-01T00:10+05:30","announce":True}
        site["articles"].append(record)
        site["events"].append({"id":"scheduled-event","title":"Future NightLock event","summary":"Upcoming talk","body":"Private program",
                               "date":"2099-01-11","publishAt":record["publishAt"],"announce":True})
        status,saved,_=self.request("/api/admin/site",{"site":site,"revision":rev},csrf)
        self.assertEqual(status,200,saved)
        self.assertEqual(saved["queued"],0)
        public=self.request("/api/site",opener=visitor)[1]
        self.assertNotIn(record["id"],[r["id"] for r in public["articles"]])
        self.assertNotIn("PRIVATE BEFORE RELEASE",json.dumps(public))
        self.assertNotIn(record["id"],[r["id"] for r in server.public_site_context()["articles"]])
        self.assertIn({"type":"article","id":"scheduled-test","title":"Future data release","publishAt":"2098-12-31T18:40:00Z"},public["upcoming"])
        self.assertEqual(self.request(path,opener=visitor)[0],404)
        original=server.visible_site
        with patch.object(server,"visible_site",side_effect=lambda site:original(site,"2099-01-01T00:00:00Z")):
            self.assertEqual(server.release_due(),1)
            self.assertEqual(server.release_due(),0)
            public=self.request("/api/site",opener=visitor)[1]
            self.assertNotIn("scheduled-test",[r["id"] for r in public["upcoming"]])
            released=next(r for r in public["articles"] if r["id"]=="scheduled-test")
            self.assertEqual(released["body"],record["body"])
            self.assertEqual(self.request(path,opener=visitor)[0],200)
            with server.db() as c:
                jobs=c.execute("SELECT text FROM mail WHERE email='schedule@example.invalid'").fetchall()
                self.assertEqual(len(jobs),1)
                self.assertIn("/details.html?article=scheduled-test",jobs[0]["text"])
                self.assertIn("/details.html?event=scheduled-event",jobs[0]["text"])



if __name__=="__main__":
    unittest.main()
