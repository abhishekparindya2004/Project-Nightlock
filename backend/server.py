"""NightLock's same-origin website, content API, and mail queue (Python 3.10+)."""
import argparse
import contextlib
import datetime as dt
from email.message import EmailMessage
from http import cookies
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import smtplib
import sqlite3
import ssl
import sys
import threading
import time
from urllib.parse import urlsplit
from wsgiref.simple_server import WSGIServer, WSGIRequestHandler, make_server
from socketserver import ThreadingMixIn
import hashlib
import hmac
from getpass import getpass
from nightlock_ai.assistant import wrap as wrap_assistant

BACKEND = Path(__file__).resolve().parent
ROOT = BACKEND.parent


def load_env(path):
    """Load local settings without overriding the host's environment."""
    if path.is_file():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = (x.strip() for x in line.split("=", 1))
            if re.fullmatch(r"(NIGHTLOCK_[A-Z0-9_]+|OPENAI_API_KEY|PORT)", key):
                if len(val) > 1 and val[0] in ('"', "'") and val[-1] == val[0]:
                    val = val[1:-1]
                os.environ.setdefault(key, val)


load_env(ROOT / ".env")
STATE = Path(os.getenv("NIGHTLOCK_DATA_DIR", ROOT / "instance")).expanduser().resolve()
PUBLIC_URL = os.getenv("NIGHTLOCK_PUBLIC_URL", "").rstrip("/")
ADMIN_EMAIL = os.getenv("NIGHTLOCK_ADMIN_EMAIL", "admin@space.lk.nasa").strip().lower()
SEED = json.loads((BACKEND / "data/site.json").read_text(encoding="utf-8"))
MANIFEST = json.loads((BACKEND / "data/editor.json").read_text(encoding="utf-8"))
DB = STATE / "nightlock.sqlite3"
MEDIA = STATE / "media"
COOKIE = "nightlock_session"
COLLECTIONS = ("articles", "events", "people", "services", "gallery", "reading", "stats")
PAGES = {"index","about-spherex","astronut","blog","details","event","gallery","observatory","our-services","our-team","team-member"}
EMAIL = re.compile(r"[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+\.[^\s@<>\x00-\x1f]+")
SLUG = re.compile(r"[a-z0-9][a-z0-9-]{0,100}")
MAX_UPLOAD = 30 * 1024 * 1024
PLACE = {"home","recent","popular","latest","mission","guides"}
SEND_LOCK = threading.Lock()
FORMAT = {"jpg":"image/jpeg","png":"image/png","webp":"image/webp","gif":"image/gif","mp4":"video/mp4","webm":"video/webm","pdf":"application/pdf","txt":"text/plain; charset=utf-8","csv":"text/csv; charset=utf-8","json":"application/json","fits":"application/fits"}
RESPONSE_CODES = {200:"OK",201:"Created",202:"Accepted",206:"Partial Content",304:"Not Modified",400:"Bad Request",401:"Unauthorized",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",409:"Conflict",413:"Content Too Large",416:"Range Not Satisfiable",429:"Too Many Requests",500:"Internal Server Error",503:"Service Unavailable"}

class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

@contextlib.contextmanager
def db():
    con = sqlite3.connect(DB, timeout=12)
    con.row_factory = sqlite3.Row
    try:
        with con:
            yield con
    finally:
        con.close()

def initialize():
    STATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    MEDIA.mkdir(mode=0o700, exist_ok=True)
    with db() as c:
        c.execute("PRAGMA journal_mode=WAL")
        c.executescript("""
        CREATE TABLE IF NOT EXISTS store(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY, csrf TEXT NOT NULL, until INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS rate(key TEXT PRIMARY KEY, start INTEGER NOT NULL, hits INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY, name TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS subscribers(email TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, created INTEGER NOT NULL, active INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS mail(id INTEGER PRIMARY KEY, email TEXT NOT NULL, subject TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL, sent INTEGER, tries INTEGER NOT NULL DEFAULT 0, error TEXT);
        """)
        c.execute("INSERT OR IGNORE INTO store VALUES('site',?)", (json.dumps(SEED,ensure_ascii=False),))
        c.execute("INSERT OR IGNORE INTO store VALUES('revision','0')")
        env_password = os.getenv("NIGHTLOCK_ADMIN_PASSWORD")
        if env_password and not c.execute("SELECT 1 FROM store WHERE key='password'").fetchone():
            c.execute("INSERT INTO store VALUES('password',?)",(password_hash(env_password),))
        live = json.loads(value(c, "site"))
        migrated = False
        launch_added = False
        article = next((r for r in live["articles"] if r["id"] == "spherex-first-year-data"), None)
        if article and any(s.get("url") == "https://www.ipac.caltech.edu/doi/10.26131/IRSA678" for s in article.get("sources", [])):
            article["sources"] = [
                {"label": "NASA Science · SPHEREx mission", "url": "https://science.nasa.gov/mission/spherex/"},
                {"label": "NASA · First all-sky infrared map", "url": "https://www.nasa.gov/image-article/first-sky-map-from-nasas-spherex-observatory/"},
            ]
            migrated = True
        release_event = next((r for r in live["events"] if r["id"] == "spherex-dr1"), None)
        if release_event and any(s.get("url") == "https://www.ipac.caltech.edu/doi/10.26131/IRSA678" for s in release_event.get("sources", [])):
            release_event["sources"] = [
                {"label": "NASA Science · SPHEREx mission", "url": "https://science.nasa.gov/mission/spherex/"},
                {"label": "NASA · First all-sky infrared map", "url": "https://www.nasa.gov/image-article/first-sky-map-from-nasas-spherex-observatory/"},
            ]
            migrated = True
        for key in ("gallery", "our-services"):
            video = live.get("videos", {}).get(key)
            if video and video.get("url") == "https://player.vimeo.com/video/313824875?dnt=1":
                video["url"] = "https://youtu.be/V-UhPS1Jwl4?si=AsgARDqHf8BWogNZ"
                migrated = True
        team_video = live.get("videos", {}).get("our-team")
        if team_video and team_video.get("poster") == "images/image25-copyright-qh4vrvpwev4p8q7alzfdnp3xveh36w0a9ur6b9874k.jpg":
            team_video["poster"] = "images/our-team-video-poster.png"
            migrated = True
        if value(c, "gallery_frames_version") != "1":
            live["gallery"] = SEED["gallery"]
            set_value(c, "gallery_frames_version", "1")
            migrated = True
        launch = next((r for r in live["events"] if r["id"] == "launching-of-the-project-nightlock"), None)
        if launch is None:
            live["events"].append({
                "id": "launching-of-the-project-nightlock",
                "title": "Launching of the Project Nightlock",
                "date": "2026-11-15",
                "summary": "Launch of Project NightLock at SLIIT Malabe, Colombo.",
                "body": "Join us at SLIIT Malabe, Colombo, for the launch of Project NightLock.",
                "image": "images/spherex launch(2).jpeg",
                "video": "",
                "poster": "",
                "document": "",
                "dateDisplay": "",
                "location": "SLIIT Malabe, Colombo",
                "status": "Project launch",
                "organizer": "Project NightLock",
                "end": "",
                "eventTime": "15:30–16:30",
                "publishAt": "",
                "announce": False,
                "schedule": False,
                "calendar": True,
                "sources": [],
            })
            migrated = True
            launch_added = True
        notes = live.get("feedbackDefaults", [])
        if notes and all(n.get("author") == "NightLock gallery notes" for n in notes):
            live["feedbackDefaults"] = []
            migrated = True
        if migrated:
            set_value(c, "site", json.dumps(live, ensure_ascii=False))
            set_value(c, "revision", str(int(value(c, "revision") or "0") + 1))
        # Add the original homepage cards when upgrading an earlier NightLock database.
        if value(c, "cms_version") != "2":
            ids = {r["id"] for r in live["articles"]}
            live["articles"].extend(r for r in SEED["articles"] if "home" in r.get("placement", []) and r["id"] not in ids)
            set_value(c, "site", json.dumps(live, ensure_ascii=False))
            set_value(c, "cms_version", "2")
        announced_before = value(c, "announced")
        if announced_before is None:
            set_value(c, "announced", json.dumps(notice_snapshot(visible_site(live))))
        elif launch_added:
            announced = json.loads(announced_before)
            snapshot = notice_snapshot(visible_site(live)).get("event:launching-of-the-project-nightlock")
            if snapshot:
                announced["event:launching-of-the-project-nightlock"] = snapshot
                set_value(c, "announced", json.dumps(announced))

def password_hash(value, salt=None):
    salt = salt or secrets.token_bytes(24)
    digest = hashlib.pbkdf2_hmac("sha256",value.encode(),salt,600_000)
    return salt.hex()+":"+digest.hex()

def verify(value, saved):
    try:
        return hmac.compare_digest(password_hash(value,bytes.fromhex(saved.split(":",1)[0])), saved)
    except (ValueError, AttributeError):
        return False

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def value(c,key):
    row=c.execute("SELECT value FROM store WHERE key=?",(key,)).fetchone()
    return row["value"] if row else None

def set_value(c,key,val):
    c.execute("INSERT INTO store VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(key,val))

def now():
    return int(time.time())

def bounded(v, n, key, required=False):
    if not isinstance(v,str):
        raise ApiError(key+" must be text.")
    v=v.strip()
    if len(v)>n or (required and not v):
        raise ApiError(key+(" is required." if not v else f" must be {n:,} characters or fewer."))
    return v

def url(v, key, media=False):
    v=bounded(v,1300,key)
    if not v:
        return v
    if any(ord(c)<32 for c in v) or "\\" in v or v.startswith("//"):
        raise ApiError("Invalid link in "+key+".")
    try:
        u=urlsplit(v)
        schemes=("https","http") if media else ("https","http","mailto","tel")
        if u.scheme and u.scheme.lower() not in schemes:
            raise ValueError()
        if u.scheme in ("http","https") and (not u.hostname or u.username or u.password):
            raise ValueError()
    except ValueError:
        raise ApiError("Use a relative path or a valid web address in "+key+".")
    return v

def obj(v,k):
    if not isinstance(v,dict):raise ApiError(k+" must be an object.")
    return v

def array(v,k,limit):
    if not isinstance(v,list) or len(v)>limit:raise ApiError(f"{k} must be a list of at most {limit} entries.")
    return v

def as_text(d, key, n, required=False):
    return bounded(d.get(key,""),n,key,required)

def as_link(d,key,media=False):
    return url(d.get(key,""),key,media)

def valid_id(d):
    s=as_text(d,"id",101,True)
    if not SLUG.fullmatch(s):raise ApiError("IDs must contain only lowercase letters, numbers, and hyphens.")
    return s

def valid_date(d,k,required=False):
    s=as_text(d,k,10,required)
    if s:
        try:
            if dt.date.fromisoformat(s).isoformat()!=s:raise ValueError()
        except ValueError:raise ApiError(k+" must use YYYY-MM-DD.")
    return s

def valid_time(d, key):
    raw=as_text(d,key,40)
    if not raw:
        return ""
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})",raw):
            raise ValueError
        t=dt.datetime.fromisoformat(raw.replace("Z","+00:00"))
        return t.astimezone(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
    except (ValueError, OverflowError):
        raise ApiError(key+" must be a date and time with a timezone.")


def visible_site(site, at=None):
    at=at or dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
    out={**site}
    for kind in ("articles","events"):
        out[kind]=[r for r in site[kind] if not r.get("publishAt") or r["publishAt"]<=at]
    # Only explicitly announced future records expose calendar metadata, never draft text or media.
    out["upcoming"]=[
        {"type":kind[:-1],"id":r["id"],"title":r["title"],"publishAt":r["publishAt"]}
        for kind in ("articles","events") for r in site[kind]
        if r.get("announce") and r.get("publishAt") and r["publishAt"]>at
    ]
    return out


def sources(v):
    return [{"label":as_text(x,"label",180,True),"url":as_link(x,"url") or require("A source or profile link needs a URL.")} for e in array(v,"links",30) for x in [obj(e,"link")]]

def require(msg):
    raise ApiError(msg)

def collection(v,k):
    out=[];seen=set()
    for n in array(v,k,500):
        x=obj(n,k)
        if k=="stats":
            out.append({"label":as_text(x,"label",100,True),"value":as_text(x,"value",50,True)})
            continue
        record={"id":valid_id(x),"title":as_text(x,"title",200,True)}
        if record["id"] in seen:raise ApiError("Duplicate ID in "+k+": "+record["id"])
        seen.add(record["id"])
        if k=="reading":
            record["body"]=as_text(x,"body",30000,True)
        elif k=="gallery":
            record.update(image=as_link(x,"image",True) or require("Gallery entries need an image."),alt=as_text(x,"alt",240),description=as_text(x,"description",2000))
        else:
            record["summary"]=as_text(x,"summary",3000,True)
            record["body"]=as_text(x,"body",60000,k!="services")
            record["image"]=as_link(x,"image",True)
            for key in ("video","poster","document"):
                if k!="people":record[key]=as_link(x,key,True)
            if k=="people":
                kind=x.get("kind","team")
                if kind not in ("team","astronaut"):raise ApiError("Choose team or astronaut.")
                record.update(kind=kind,role=as_text(x,"role",180,True),linkedin=as_link(x,"linkedin"),profileLink=as_link(x,"profileLink"),featured=x.get("featured",False) is True,
                  links=sources(x.get("links",[])),
                  institutes=[{"title":as_text(i,"title",180,True),"image":as_link(i,"image",True)} for e in array(x.get("institutes",[]),"institutions",24) for i in [obj(e,"institution")]],
                  sections=[{"title":as_text(i,"title",180,True),"body":as_text(i,"body",25000,True)} for e in array(x.get("sections",[]),"profile sections",30) for i in [obj(e,"profile section")]])
            if k=="services":
                record.update(link=as_link(x,"link"),button=as_text(x,"button",80))
            if k in ("articles","events"):
                record["date"]=valid_date(x,"date",k=="events")
                record["sources"]=sources(x.get("sources",[]))
                record["publishAt"]=valid_time(x,"publishAt")
                record["announce"]=x.get("announce",False) is True
            if k=="events":
                end=valid_date(x,"end")
                if end and end<record["date"]:raise ApiError("The event end date cannot precede its start date.")
                record.update(end=end,dateDisplay=as_text(x,"dateDisplay",120),location=as_text(x,"location",240),organizer=as_text(x,"organizer",180),
                              status=as_text(x,"status",180),eventTime=as_text(x,"eventTime",100),schedule=x.get("schedule",True) is True, calendar=x.get("calendar",False) is True)
            if k=="articles":
                placement=array(x.get("placement",[]),"placement",6)
                if any(not isinstance(i,str) or i not in PLACE for i in placement):raise ApiError("Choose valid article placements.")
                record.update(placement=list(dict.fromkeys(placement)),category=as_text(x,"category",100,True))
        out.append(record)
    return out

def validate_site(raw):
    raw=obj(raw,"Site content")
    result={k:collection(raw.get(k,[]),k) for k in COLLECTIONS}
    settings=obj(raw.get("settings",{}),"Settings")
    result["settings"]={k:bounded(settings.get(k,v),350,k,True) for k,v in SEED["settings"].items()}
    result["videos"]={}
    for k,v in obj(raw.get("videos",{}),"Videos").items():
        if k not in PAGES:raise ApiError("Unrecognised video section.")
        x=obj(v,"Video")
        result["videos"][k]={"title":as_text(x,"title",180,True),"url":as_link(x,"url",True),"poster":as_link(x,"poster",True)}
    result["overrides"]={}
    for k,v in obj(raw.get("overrides",{}),"Text and media edits").items():
        if k not in MANIFEST:raise ApiError("Unknown editable field: "+k)
        x=obj(v,"Edit")
        if any(f not in MANIFEST[k]["fields"] for f in x):raise ApiError("This field is not editable on "+k)
        result["overrides"][k]={f:(url(s,f,f=="image") if f in ("image","url") else bounded(s,14000 if f=="text" else 240,f)) for f,s in x.items()}
    result["blocks"]={}
    for k,v in obj(raw.get("blocks",{}),"New content blocks").items():
        if k not in PAGES:raise ApiError("Unrecognised page.")
        result["blocks"][k]=[
            {"title":as_text(x,"title",200,True),"body":as_text(x,"body",30000),"button":as_text(x,"button",80),"alt":as_text(x,"alt",240),
             **{key:as_link(x,key,key!="url") for key in ("image","video","poster","url","document")}}
             for e in array(v,"content blocks",120) for x in [obj(e,"content block")]]
    return result

def read_body(environ, limit):
    try: length=int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError: raise ApiError("Invalid request size.")
    if length<0 or length>limit:raise ApiError("This upload or request is too large.",413)
    return environ["wsgi.input"].read(length)

def parse_body(env,limit=8*1024*1024):
    if env.get("CONTENT_TYPE","").split(";",1)[0]!="application/json":raise ApiError("Expected JSON.")
    try:return obj(json.loads(read_body(env,limit)),"Request")
    except (json.JSONDecodeError,UnicodeError):raise ApiError("Invalid JSON.")

def origin(env):
    s=env.get("HTTP_ORIGIN")
    if env.get("HTTP_SEC_FETCH_SITE")=="cross-site":raise ApiError("Cross-site submissions are not accepted.",403)
    if s:
        request_host=env.get("HTTP_HOST","").lower()
        u=urlsplit(s)
        expected=urlsplit(PUBLIC_URL) if PUBLIC_URL else None
        if not (u.scheme in ("http","https") and (u.netloc.lower()==request_host or (expected and (u.scheme,u.netloc.lower())==(expected.scheme,expected.netloc.lower())))):
            raise ApiError("Invalid request origin.",403)

def session(c,env,mutating=False):
    jar=cookies.SimpleCookie()
    try:jar.load(env.get("HTTP_COOKIE",""))
    except cookies.CookieError:return None
    item=jar.get(COOKIE)
    if not item or len(item.value)>100:return None
    digest=token_hash(item.value)
    record=c.execute("SELECT digest,csrf,until FROM sessions WHERE digest=? AND until>?",(digest,now())).fetchone()
    if record and mutating and not hmac.compare_digest(record["csrf"],env.get("HTTP_X_CSRF_TOKEN","")):
        raise ApiError("Session verification failed. Refresh the admin panel.",403)
    return record

def cookie(value,env,max_age):
    secure = env.get("wsgi.url_scheme")=="https" or PUBLIC_URL.startswith("https://")
    return ("Set-Cookie",f"{COOKIE}={value}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Strict"+("; Secure" if secure else ""))

def throttle(c,key,limit,seconds):
    t=now()
    c.execute("DELETE FROM rate WHERE start<?",(t-86400,))
    row=c.execute("SELECT start,hits FROM rate WHERE key=?",(key,)).fetchone()
    if row and t-row["start"]<seconds:
        if row["hits"]>=limit:raise ApiError("Too many attempts. Please try again later.",429)
        c.execute("UPDATE rate SET hits=hits+1 WHERE key=?",(key,))
    else:c.execute("INSERT OR REPLACE INTO rate VALUES(?,?,1)",(key,t))
    c.commit()

def email_address(v):
    v=bounded(v,254,"Email address",True).lower()
    if not v.isascii() or not EMAIL.fullmatch(v):raise ApiError("Enter a valid email address.")
    return v

def mail_ready():
    try:
        u=urlsplit(PUBLIC_URL)
        return bool(os.getenv("NIGHTLOCK_SMTP_HOST") and os.getenv("NIGHTLOCK_MAIL_FROM") and
                    u.scheme in {"https","http"} and u.hostname and not any((u.path,u.query,u.fragment,u.username)))
    except ValueError:
        return False

def enqueue(c,subject,message):
    return c.execute("INSERT INTO mail(email,subject,text,created) SELECT email,?,?,? FROM subscribers WHERE active=1",(subject,message,now())).rowcount

def notice_snapshot(site):
    result={}
    for kind,param in (("events","event"),("articles","article")):
        for r in site[kind]:
            result[param+":"+r["id"]]=(r.get("document",""),r["title"],r["summary"],"/details.html?"+param+"="+r["id"])
    for r in site["gallery"]:
        result["photo:"+r["id"]]=(r["image"],r["title"],r.get("description",""),"/gallery.html")
    for page,blocks in site.get("blocks",{}).items():
        for i,r in enumerate(blocks,1):
            if r.get("document"):
                result["block:"+page+":"+r["document"]]=(r["document"],r["title"],"New document available.","/"+page+".html#nightlock-update-"+str(i))
    return result


def queue_publications(c, site):
    """Atomically track first visibility, including releases due while offline."""
    previous=json.loads(value(c,"announced") or "{}")
    current=notice_snapshot(visible_site(site))
    added=[item for key,item in current.items() if key not in previous or (item[0] and previous[key][0]!=item[0])]
    updated={key:[item[0]] for key,item in {**previous,**current}.items()}
    payload=json.dumps(updated)
    if payload!=json.dumps(previous):
        set_value(c,"announced",payload)
    if not added:return 0
    message="Here’s what’s new on NightLock.\n\n"+"\n\n".join(
        f"{title}\n{summary}\n{path}" for _,title,summary,path in added)
    return enqueue(c,"New from Project NightLock",message)


def release_due():
    with db() as c:
        c.execute("BEGIN IMMEDIATE")
        return queue_publications(c, json.loads(value(c,"site")))


def deliver():
    if not SEND_LOCK.acquire(blocking=False):return
    try:
        release_due()
        if not mail_ready():return
        with db() as c:
            jobs=c.execute("SELECT m.*,s.token FROM mail m JOIN subscribers s ON s.email=m.email WHERE m.sent IS NULL AND m.tries<6 AND s.active=1 ORDER BY m.id LIMIT 25").fetchall()
        if not jobs:return
        tls=ssl.create_default_context()
        host=os.environ["NIGHTLOCK_SMTP_HOST"]
        mode=os.getenv("NIGHTLOCK_SMTP_MODE","starttls")
        port=int(os.getenv("NIGHTLOCK_SMTP_PORT","465" if mode=="ssl" else "587"))
        smtp=None
        try:
            if mode=="ssl":smtp=smtplib.SMTP_SSL(host,port,timeout=12,context=tls)
            else:
                smtp=smtplib.SMTP(host,port,timeout=12)
                if mode=="starttls":smtp.starttls(context=tls)
                elif mode!="plain":raise ValueError("Unknown SMTP mode")
            user=os.getenv("NIGHTLOCK_SMTP_USER")
            if user:smtp.login(user,os.getenv("NIGHTLOCK_SMTP_PASSWORD",""))
            for job in jobs:
                # Re-check consent before each delivery, including after queueing.
                with db() as c:
                    record=c.execute("SELECT active,token FROM subscribers WHERE email=?",(job["email"],)).fetchone()
                if not record or not record["active"]:continue
                unsubscribe=PUBLIC_URL+"/unsubscribe?token="+record["token"]
                msg=EmailMessage()
                msg["From"]=os.environ["NIGHTLOCK_MAIL_FROM"];msg["To"]=job["email"];msg["Subject"]=job["subject"]
                msg["List-Unsubscribe"]="<"+unsubscribe+">"
                body=re.sub(r"(?m)^(/(?:details|gallery|[a-z-]+)\.html\b)",lambda m:PUBLIC_URL+m[1],job["text"])
                msg.set_content(re.sub(r"http://(?:127\.0\.0\.1|localhost)(?::\d+)?(?=/)",PUBLIC_URL,body)+"\n\nUnsubscribe from NightLock: "+unsubscribe)
                try:
                    smtp.send_message(msg)
                    with db() as c:c.execute("UPDATE mail SET sent=?,error=NULL WHERE id=?",(now(),job["id"]))
                except (OSError,smtplib.SMTPException) as err:
                    with db() as c:c.execute("UPDATE mail SET tries=tries+1,error=? WHERE id=?",(type(err).__name__,job["id"]))
        except (OSError,ValueError,smtplib.SMTPException) as err:
            with db() as c:
                c.executemany("UPDATE mail SET tries=tries+1,error=? WHERE id=?",[(type(err).__name__,j["id"]) for j in jobs])
        finally:
            if smtp:
                with contextlib.suppress(OSError,smtplib.SMTPException):smtp.quit()
    finally:SEND_LOCK.release()

def mime_upload(data):
    if data.startswith(b"\xff\xd8\xff"):return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):return "png"
    if len(data)>12 and data[:4]==b"RIFF" and data[8:12]==b"WEBP":return "webp"
    if data.startswith((b"GIF87a",b"GIF89a")):return "gif"
    if data.startswith(b"%PDF-"):return "pdf"
    if len(data)>=2880 and len(data)%2880==0 and data.startswith(b"SIMPLE  ="):return "fits"
    if data.startswith(b"\x1a\x45\xdf\xa3") and b"webm" in data[:256]:return "webm"
    if len(data)>12 and data[4:8]==b"ftyp" and data[8:12] not in (b"heic",b"avif"):return "mp4"
    return None

def api(path,method,env):
    if method not in ("GET","POST"):raise ApiError("Method not allowed.",405)
    if method=="POST":origin(env)
    addr=env.get("REMOTE_ADDR","local")
    with db() as c:
        if path=="/api/site" and method=="GET":
            out=visible_site(json.loads(value(c,"site")))
            out["revision"]=int(value(c,"revision") or "0")
            out["feedback"]=[dict(row) for row in c.execute("SELECT name,text FROM feedback WHERE status='approved' ORDER BY created DESC LIMIT 100")]
            return out,200,[("Cache-Control","no-cache")]
        if path=="/api/revision" and method=="GET":
            return {"revision":int(value(c,"revision") or "0")},200,[("Cache-Control","no-store")]
        if path=="/api/feedback" and method=="GET":
            entries=[dict(row) for row in c.execute("SELECT id,name,text,created FROM feedback WHERE status='approved' ORDER BY created DESC LIMIT 100")]
            return {"entries":entries},200,[("Cache-Control","no-store")]
        if path=="/api/subscribe" and method=="POST":
            throttle(c,"subscribe:"+addr,16,1800)
            address=email_address(parse_body(env,4096).get("email",""))
            c.execute("INSERT INTO subscribers VALUES(?,?,?,1) ON CONFLICT(email) DO UPDATE SET active=1,token=excluded.token,created=excluded.created WHERE subscribers.active=0",
                      (address,secrets.token_urlsafe(32),now()))
            message="You’re subscribed to NightLock updates." if mail_ready() else "Your address was saved. Email updates will start when delivery is connected."
            return {"message":message},201,[]
        if path=="/api/unsubscribe" and method=="POST":
            x=as_text(parse_body(env,4096),"token",75,True)
            c.execute("UPDATE subscribers SET active=0 WHERE token=?",(x,))
            c.execute("DELETE FROM mail WHERE sent IS NULL AND email=(SELECT email FROM subscribers WHERE token=?)",(x,))
            return {"message":"You’ve been unsubscribed from NightLock updates."},200,[]
        if path=="/api/feedback" and method=="POST":
            throttle(c,"feedback:"+addr,8,1800)
            x=parse_body(env,12000)
            if x.get("consent") not in (True,"on"):raise ApiError("Confirm your consent before sending feedback.")
            # Visitors explicitly consent to public display. The admin can hide it at once.
            c.execute("INSERT INTO feedback VALUES(?,?,?,'approved',?)",(secrets.token_hex(12),as_text(x,"name",80,True),as_text(x,"text",1200,True),now()))
            return {"message":"Thank you. Your feedback is now visible in Community Feedback."},201,[]
        if path=="/api/admin/login" and method=="POST":
            throttle(c,"login:"+addr,8,900)
            x=parse_body(env,4096); identity=as_text(x,"email",254,True).lower(); password=as_text(x,"password",256,True)
            saved=value(c,"password")
            if not saved:raise ApiError("Set up an admin password on the server before signing in.",503)
            valid=verify(password,saved)
            if not (hmac.compare_digest(identity.encode(),ADMIN_EMAIL.encode()) and valid):raise ApiError("Incorrect email address or password.",401)
            c.execute("DELETE FROM sessions WHERE until<=?",(now(),))
            tok=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32)
            c.execute("INSERT INTO sessions VALUES(?,?,?)",(token_hash(tok),csrf,now()+8*3600))
            return {"csrf":csrf},200,[cookie(tok,env,8*3600)]
        if not path.startswith("/api/admin/"):raise ApiError("Not found.",404)
        auth=session(c,env,method=="POST")
        if not auth:raise ApiError("Sign in to the admin panel.",401)
        if path=="/api/admin/logout" and method=="POST":
            c.execute("DELETE FROM sessions WHERE digest=?",(auth["digest"],))
            return {"message":"Signed out."},200,[cookie("",env,0)]
        if path=="/api/admin/site" and method=="GET":
            return {"csrf":auth["csrf"],"site":json.loads(value(c,"site")),"revision":int(value(c,"revision")),"fields":MANIFEST,
                    "mailReady":mail_ready(),"subscriberCount":c.execute("SELECT count(*) FROM subscribers WHERE active=1").fetchone()[0]},200,[]
        if path=="/api/admin/site" and method=="POST":
            incoming=parse_body(env)
            new=validate_site(incoming.get("site"))
            c.execute("BEGIN IMMEDIATE")
            version=int(value(c,"revision"))
            if incoming.get("revision")!=version:raise ApiError("Someone else published an edit. Reload the admin panel and reapply your changes.",409)
            old=json.loads(value(c,"site"))
            known={r["id"]:r for r in old["articles"]}
            date_today=(dt.datetime.now(dt.timezone.utc)+dt.timedelta(hours=5,minutes=30)).date().isoformat()
            for article in new["articles"]:
                if not article["date"] and not article["publishAt"] and article["id"] not in known:
                    article["date"]=date_today
            set_value(c,"site",json.dumps(new,ensure_ascii=False));set_value(c,"revision",str(version+1))
            queued=queue_publications(c,new)
            return {"revision":version+1,"queued":queued,"message":"Published."},200,[]
        if path=="/api/admin/media" and method=="POST":
            data=read_body(env,MAX_UPLOAD)
            ext=mime_upload(data)
            if not ext:
                try:
                    kind=env.get("CONTENT_TYPE","").split(";")[0].lower()
                    if kind in {"text/plain","text/csv","application/json"} and b"\0" not in data and data.decode("utf-8-sig").strip():
                        ext={"text/plain":"txt","text/csv":"csv","application/json":"json"}[kind]
                        if ext=="json":json.loads(data)
                except (UnicodeError,ValueError):ext=None
            if not ext:raise ApiError("Upload a JPG, PNG, WebP, GIF, MP4, WebM, PDF, FITS, CSV, JSON, or UTF-8 text file.")
            name=secrets.token_hex(20)+"."+ext
            (MEDIA/name).write_bytes(data)
            return {"url":"uploads/"+name,"message":"Uploaded. Save and publish to show it on the website."},201,[]
        if path=="/api/admin/feedback" and method=="GET":
            return {"entries":[dict(x) for x in c.execute("SELECT * FROM feedback ORDER BY created DESC LIMIT 500")]},200,[]
        if path=="/api/admin/feedback" and method=="POST":
            incoming=parse_body(env,12000); key=as_text(incoming,"id",40,True); action=as_text(incoming,"status",12,True)
            if action=="delete":row=c.execute("DELETE FROM feedback WHERE id=?",(key,))
            elif action in ("approved","hidden","pending"):row=c.execute("UPDATE feedback SET status=? WHERE id=?",(action,key))
            elif action=="edit":
                name=as_text(incoming,"name",80,True)
                text=as_text(incoming,"text",1200,True)
                row=c.execute("UPDATE feedback SET name=?,text=? WHERE id=?",(name,text,key))
            else:raise ApiError("Choose a valid feedback action.")
            if row.rowcount!=1:raise ApiError("Feedback not found.",404)
            return {"message":"Feedback updated."},200,[]
        if path=="/api/admin/newsletter" and method=="GET":
            return {"ready":mail_ready(),
                    "subscribers":c.execute("SELECT count(*) FROM subscribers WHERE active=1").fetchone()[0],
                    "pending":c.execute("SELECT count(*) FROM mail WHERE sent IS NULL AND tries<6").fetchone()[0],
                    "sent":c.execute("SELECT count(*) FROM mail WHERE sent IS NOT NULL").fetchone()[0],
                    "failed":c.execute("SELECT count(*) FROM mail WHERE sent IS NULL AND tries>=6").fetchone()[0]},200,[]
        if path=="/api/admin/newsletter" and method=="POST":
            x=parse_body(env,20000)
            if x.get("action")=="retry":
                c.execute("UPDATE mail SET tries=0,error=NULL WHERE sent IS NULL AND tries>=6")
                return {"message":"Failed messages were requeued."},200,[]
            subject=as_text(x,"subject",140,True)
            if any(ord(ch)<32 for ch in subject):raise ApiError("The subject must be on a single line.")
            count=enqueue(c,subject,as_text(x,"body",12000,True))
            return {"message":f"Queued for {count} subscriber(s).","queued":count},201,[]
        raise ApiError("Not found.",404)

def respond(start,status,body,headers=None,ctype="application/json; charset=utf-8"):
    if isinstance(body,dict):body=json.dumps(body,ensure_ascii=False).encode()
    if isinstance(body,str):body=body.encode()
    headers=list(headers or [])
    if not any(k.lower()=="cache-control" for k,_ in headers):headers.append(("Cache-Control","no-store"))
    headers.extend([("Content-Type",ctype),("Content-Length",str(len(body))),("X-Content-Type-Options","nosniff"),("X-Frame-Options","SAMEORIGIN"),("Referrer-Policy","strict-origin-when-cross-origin")])
    start(f"{status} {RESPONSE_CODES[status]}",headers)
    return [body]

def file_response(env,start,path,ctype,public=True,content_security=None):
    size=path.stat().st_size
    start_byte,end_byte,status=0,size-1,200
    hdr=env.get("HTTP_RANGE","")
    headers=[("Accept-Ranges","bytes"),("Cache-Control","public, max-age=3600" if public else "no-store")]
    if content_security:headers.append(("Content-Security-Policy",content_security))
    if env.get("NIGHTLOCK_DOWNLOAD"):headers.append(("Content-Disposition",'attachment; filename="'+env["NIGHTLOCK_DOWNLOAD"]+'"'))
    if hdr:
        m=re.fullmatch(r"bytes=(\d{0,15})-(\d{0,15})",hdr)
        if m and (m[1] or m[2]):
            if m[1]:start_byte=int(m[1]);end_byte=min(end_byte,int(m[2])) if m[2] else end_byte
            else:start_byte=max(0,size-int(m[2]))
            if start_byte>=size or end_byte<start_byte:return respond(start,416,b"",[("Content-Range",f"bytes */{size}")],ctype)
            status=206;headers.append(("Content-Range",f"bytes {start_byte}-{end_byte}/{size}"))
    n=max(0,end_byte-start_byte+1)
    headers.extend([("Content-Type",ctype),("Content-Length",str(n)),("X-Content-Type-Options","nosniff"),("X-Frame-Options","SAMEORIGIN"),("Referrer-Policy","strict-origin-when-cross-origin")])
    start(f"{status} {RESPONSE_CODES[status]}",headers)
    if env["REQUEST_METHOD"]=="HEAD":return [b""]
    def read():
        with path.open("rb") as f:
            f.seek(start_byte)
            remaining=n
            while remaining:
                chunk=f.read(min(128*1024,remaining))
                if not chunk:break
                remaining-=len(chunk);yield chunk
    return read()

def published_media(site, name):
    expected="uploads/"+name
    def contains(node):
        if isinstance(node,dict):return any(contains(val) for val in node.values())
        if isinstance(node,list):return any(contains(val) for val in node)
        return isinstance(node,str) and node.lstrip("/")==expected
    return contains(site)


def app(env,start):
    path=env.get("PATH_INFO","/")
    method=env["REQUEST_METHOD"]
    try:
        if path.startswith("/api/"):
            result,status,headers=api(path,method,env)
            return respond(start,status,result,headers)
        if method not in ("GET","HEAD"):raise ApiError("Method not allowed.",405)
        if path=="/unsubscribe":
            page="admin/unsubscribe.html"
        elif path in ("/admin", "/admin.html"):
            start("302 Found",[("Location","/admin/"),("Content-Length","0"),("Cache-Control","no-store")])
            return [b""]
        elif path=="/admin/":
            page="admin/index.html"
        else:page=path.lstrip("/") or "index.html"
        if page.startswith("uploads/"):
            name=page.removeprefix("uploads/")
            if not re.fullmatch(r"[a-f0-9]{40}\.(jpg|png|webp|gif|mp4|webm|pdf|txt|csv|json|fits)",name):raise ApiError("Not found.",404)
            target=MEDIA/name
            if not target.is_file():raise ApiError("Not found.",404)
            with db() as c:
                public=published_media(visible_site(json.loads(value(c,"site"))),name)
                if not (public or session(c,env)):raise ApiError("Not found.",404)
            if target.suffix in {".txt",".csv",".json",".fits"}:
                return file_response({**env,"NIGHTLOCK_DOWNLOAD":name},start,target,FORMAT[target.suffix[1:]],public,"default-src 'none'; sandbox")
            return file_response(env,start,target,FORMAT[target.suffix[1:]],public,"default-src 'none'; sandbox")
        parts=Path(page).parts
        if any(k.startswith(".") for k in parts):raise ApiError("Not found.",404)
        target=(ROOT/page).resolve()
        if ROOT not in target.parents or not target.is_file():raise ApiError("Not found.",404)
        if page in {"admin/index.html","admin/unsubscribe.html","sky-explorer-for-abhishek/sky-explorer.html","blink.html"} or (len(parts)==1 and page in {p+".html" for p in PAGES}):
            policy="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" if page.startswith("admin/") else None
            return file_response(env,start,target,"text/html; charset=utf-8",False,policy)
        if page in {"admin/assets/admin.css","admin/assets/admin.js","admin/assets/unsubscribe.js"}:
            return file_response(env,start,target,mimetypes.guess_type(target.name)[0] or "application/octet-stream",False)
        if len(parts)>1 and parts[0] in {"images","fonts","css","js"} and target.is_relative_to(ROOT/parts[0]):
            return file_response(env,start,target,mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        if len(parts)>2 and parts[0]=="sky-explorer-for-abhishek" and parts[1] in {"images","css","js"} and target.is_relative_to(ROOT/"sky-explorer-for-abhishek"/parts[1]):
            return file_response(env,start,target,mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        raise ApiError("Not found.",404)
    except ApiError as err:
        return respond(start,err.status,{"error":err.message})
    except Exception as err:
        print(f"NightLock request error ({type(err).__name__})",file=sys.stderr)
        return respond(start,500,{"error":"Something went wrong on the NightLock server."})

def public_site_context():
    with db() as conn:
        content=value(conn,"site")
    public=visible_site(json.loads(content) if content else SEED)
    public["pages"]=[]
    for page,title in (("about-spherex","About SPHEREx"),("index","NightLock homepage"),
                       ("observatory","NightLock Observatory"),("blog","NightLock Blog and News"),
                       ("event","NightLock Events"),("gallery","NightLock Gallery"),
                       ("our-services","NightLock Services"),("our-team","NightLock Team")):
        texts=[]
        for k,field in MANIFEST.items():
            if field["page"]==page:
                text=public["overrides"].get(k,{}).get("text",field["fields"].get("text",""))
                if len(text)>=30 and text not in texts:texts.append(text)
        for block in public["blocks"].get(page,[]):
            texts.insert(0,block["title"]+" "+block["body"])
        public["pages"].append({"path":page+".html","title":title,"body":" ".join(texts)})
    return public

app=wrap_assistant(app,public_site_context)

class ThreadedServer(ThreadingMixIn, WSGIServer):
    daemon_threads=True

class PrivacyHandler(WSGIRequestHandler):
    def log_request(self, code="-", size="-"):
        print(f"{self.command} {urlsplit(self.path).path} {code}",file=sys.stderr)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--host",default=os.getenv("NIGHTLOCK_HOST","127.0.0.1"))
    p.add_argument("--port",type=int,default=int(os.getenv("PORT","8010")))
    p.add_argument("--set-password",action="store_true")
    p.add_argument("--mail-once",action="store_true")
    opts=p.parse_args()
    os.umask(0o077);initialize()
    if opts.set_password:
        pw=getpass("Set the admin password: ");confirmed=getpass("Confirm the admin password: ")
        if pw!=confirmed or not 10<=len(pw)<=256:sys.exit("Passwords must match and contain 10–256 characters.")
        with db() as c:
            set_value(c,"password",password_hash(pw))
            c.execute("DELETE FROM sessions")
        print("Admin password set for "+ADMIN_EMAIL);return
    if opts.mail_once:
        deliver();return
    def mail_loop():
        while True:
            try:deliver()
            except Exception as err:print(f"Mail queue error ({type(err).__name__})",file=sys.stderr)
            time.sleep(20)
    threading.Thread(target=mail_loop,daemon=True).start()
    with make_server(opts.host,opts.port,app,server_class=ThreadedServer,handler_class=PrivacyHandler) as srv:
        print(f"Project NightLock at http://{opts.host}:{opts.port}/",flush=True)
        try:srv.serve_forever()
        except KeyboardInterrupt:pass

if __name__=="__main__":main()
