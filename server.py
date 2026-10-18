"""Local portfolio editor server. Python standard library only; binds to loopback."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
from datetime import datetime, timezone
import argparse
import base64
import copy
import hashlib
import io
import json
import os
import re
import secrets
import threading
import uuid
import zipfile
import webbrowser

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / 'assets/data/content.json'
OWNER = ROOT / '.local/owner-settings.json'
LOCK = threading.Lock()
TOKEN = secrets.token_urlsafe(32)
MAX_BODY = 8 * 1024 * 1024
PROFILE_FIELDS = ('name', 'role', 'intro', 'about', 'focus', 'currentWork', 'education', 'skills', 'linkedin', 'github', 'medium')

def safe_url(value, required=False):
    if not isinstance(value, str) or len(value) > 2000:
        raise ValueError('A link is too long or is not text.')
    if not value and not required:
        return ''
    parsed = urlsplit(value)
    if parsed.scheme not in ('https', 'http') or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError('Links must be full http:// or https:// addresses.')
    return value

def text_field(obj, name, limit=12000, required=False):
    value = obj.get(name, '')
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValueError(f'Please check the {name} field (maximum {limit} characters).')
    return value.strip()

def normalize_content(raw):
    if not isinstance(raw, dict) or raw.get('version') != 1:
        raise ValueError('This is not a supported portfolio backup.')
    profile = raw.get('profile')
    if not isinstance(profile, dict):
        raise ValueError('Profile information is missing.')
    clean = {'version': 1, 'revision': raw.get('revision', ''), 'profile': {}, 'projects': [], 'blogs': []}
    for key in PROFILE_FIELDS:
        clean['profile'][key] = text_field(profile, key, required=key in ('name', 'role', 'intro'))
        if key in ('linkedin', 'github', 'medium'):
            safe_url(clean['profile'][key])
    certs = profile.get('certifications', [])
    if not isinstance(certs, list) or len(certs) > 100 or any(not isinstance(c, str) or len(c) > 500 for c in certs):
        raise ValueError('Please check the certifications list.')
    clean['profile']['certifications'] = [c.strip() for c in certs if c.strip()]
    for kind in ('projects', 'blogs'):
        items = raw.get(kind)
        if not isinstance(items, list) or len(items) > 500:
            raise ValueError(f'The {kind} collection is invalid or too large.')
        seen = set()
        for item in items:
            if not isinstance(item, dict):
                raise ValueError('An entry is invalid.')
            entry = {}
            entry['id'] = text_field(item, 'id', 100, True)
            if not re.fullmatch(r'[a-zA-Z0-9_-]+', entry['id']) or entry['id'] in seen:
                raise ValueError('Entries need unique IDs using letters, numbers, underscores, and dashes.')
            seen.add(entry['id'])
            for key, limit in [('title', 300), ('category', 100), ('summary', 2000), ('url', 2000)]:
                entry[key] = text_field(item, key, limit, True)
            safe_url(entry['url'], True)
            entry['featured'] = bool(item.get('featured', False))
            image = text_field(item, 'image', 2000)
            if image:
                if image.startswith('assets/'):
                    resolved = (ROOT / image).resolve()
                    if not resolved.is_relative_to(ROOT / 'assets') or not resolved.is_file():
                        raise ValueError('An image file is missing from this portfolio folder.')
                else:
                    safe_url(image)
            entry['image'] = image
            if kind == 'projects':
                entry['projectGroup'] = text_field(item, 'projectGroup', 40) or 'data-analysis'
                if entry['projectGroup'] not in ('data-analysis', 'power-bi-development'):
                    raise ValueError('Choose a valid project type.')
                tools = item.get('tools', [])
                if not isinstance(tools, list) or len(tools) > 20 or any(not isinstance(t, str) or len(t) > 100 for t in tools):
                    raise ValueError('Please check the project tools.')
                entry['tools'] = [t.strip() for t in tools if t.strip()]
                for key in ('challenge', 'approach', 'insights'):
                    entry[key] = text_field(item, key)
            else:
                entry['date'] = text_field(item, 'date', 10)
                if entry['date']:
                    try:
                        datetime.strptime(entry['date'], '%Y-%m-%d')
                    except ValueError:
                        raise ValueError('Please choose a valid publication date.')
            clean[kind].append(entry)
    contact = raw.get('contact', {})
    if not isinstance(contact, dict):
        raise ValueError('Contact configuration is invalid.')
    form_id = text_field(contact, 'formId', 200)
    if form_id and not re.fullmatch(r'[A-Za-z0-9_-]+', form_id):
        raise ValueError('Use the anonymous FormSubmit ID, not your email or a full URL.')
    clean['contact'] = {'formId': form_id}
    return clean

def read_content():
    return json.loads(CONTENT.read_text(encoding='utf-8'))

def atomic_write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(value, encoding='utf-8')
    os.replace(temporary, path)

def write_content(data, backup=True):
    if backup and CONTENT.exists():
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        atomic_write(ROOT / '.local/history' / (stamp + '.json'), CONTENT.read_text(encoding='utf-8'))
    data['revision'] = str(uuid.uuid4())
    serialized = json.dumps(data, ensure_ascii=False, indent=2)
    atomic_write(CONTENT, serialized + '\n')
    # This companion file lets the public pages also work when opened directly.
    atomic_write(ROOT / 'assets/js/content-data.js', 'window.PORTFOLIO_CONTENT = ' + serialized + ';\n')
    return data

def export_website():
    buffer = io.BytesIO()
    public_pages = ['index.html', 'portfolio.html', 'about.html', 'blogs.html', 'contact.html', '.nojekyll']
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in public_pages:
            if file.endswith('.html'):
                markup = (ROOT / file).read_text(encoding='utf-8')
                markup = re.sub(r'<a\b[^>]*\bdata-editor-link\b[^>]*>.*?</a>', '', markup, flags=re.S)
                archive.writestr(file, markup)
            else:
                archive.write(ROOT / file, file)
        for path in (ROOT / 'assets').rglob('*'):
            if path.is_file() and path.suffix != '.tmp' and path.name != 'editor.js':
                archive.write(path, path.relative_to(ROOT).as_posix())
    return buffer.getvalue()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def local_host(self):
        host = self.headers.get('Host', '')
        return host in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}')

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        if not self.local_host() or self.headers.get('X-Portfolio-Token') != TOKEN:
            self.respond(403, {'error': 'Open the editor from the local portfolio server.'})
            return False
        origin = self.headers.get('Origin')
        if origin and origin not in (f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'):
            self.respond(403, {'error': 'This request did not come from the local editor.'})
            return False
        return True

    def do_GET(self):
        if not self.local_host():
            return self.respond(403, {'error': 'Local access only.'})
        path = unquote(urlsplit(self.path).path)
        if path == '/api/status':
            return self.respond(200, {'localEditor': True, 'token': TOKEN})
        if path == '/api/content':
            with LOCK:
                return self.respond(200, read_content())
        if path == '/api/owner':
            if self.authorized():
                return self.respond(200, json.loads(OWNER.read_text(encoding='utf-8')) if OWNER.exists() else {'email': ''})
            return
        if path == '/api/export':
            if not self.authorized():
                return
            with LOCK:
                body = export_website()
            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Disposition', 'attachment; filename="mehdi-portfolio-website.zip"')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        # Never expose local history, private recipient settings, code, or directory listings.
        target = (ROOT / path.lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or any(part.startswith('.') for part in target.relative_to(ROOT).parts) or target.suffix.lower() in ('.py', '.cmd', '.ps1', '.tmp'):
            return self.send_error(404)
        if target.is_dir() and path != '/':
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        # HEAD uses the same path protection as GET.
        return self.send_error(405, 'Use GET')

    def do_POST(self):
        if not self.authorized():
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > MAX_BODY:
                return self.respond(413, {'error': 'Choose an image under 5 MB or a smaller backup.'})
            if self.headers.get_content_type() != 'application/json':
                return self.respond(415, {'error': 'Expected JSON content.'})
            payload = json.loads(self.rfile.read(length))
            path = urlsplit(self.path).path
            if path == '/api/content':
                clean = normalize_content(payload.get('content'))
                with LOCK:
                    if payload.get('expectedRevision') != read_content().get('revision'):
                        return self.respond(409, {'error': 'The portfolio changed in another tab. Reload the editor before saving.'})
                    return self.respond(200, write_content(clean))
            if path == '/api/owner':
                email = text_field(payload, 'email', 200, True)
                if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
                    raise ValueError('Please enter a valid recipient email.')
                with LOCK:
                    atomic_write(OWNER, json.dumps({'email': email}))
                return self.respond(200, {'saved': True})
            if path == '/api/upload':
                encoded = payload.get('data', '')
                match = re.fullmatch(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)', encoded)
                if not match:
                    raise ValueError('Choose a PNG, JPEG, or WebP image.')
                raw = base64.b64decode(match.group(2), validate=True)
                if len(raw) > 5 * 1024 * 1024:
                    raise ValueError('Choose an image under 5 MB.')
                fmt = match.group(1)
                valid = (fmt == 'png' and raw.startswith(b'\x89PNG\r\n\x1a\n')) or (fmt == 'jpeg' and raw.startswith(b'\xff\xd8\xff')) or (fmt == 'webp' and raw.startswith(b'RIFF') and raw[8:12] == b'WEBP')
                if not valid:
                    raise ValueError('The image contents do not match its file type.')
                name = hashlib.sha256(raw).hexdigest()[:24] + '.' + ('jpg' if fmt == 'jpeg' else fmt)
                destination = ROOT / 'assets/uploads' / name
                destination.parent.mkdir(exist_ok=True)
                destination.write_bytes(raw)
                return self.respond(200, {'path': 'assets/uploads/' + name})
            return self.respond(404, {'error': 'Unknown endpoint.'})
        except (ValueError, TypeError, KeyError, AttributeError) as exc:
            return self.respond(400, {'error': str(exc)})
        except OSError:
            return self.respond(500, {'error': 'The folder could not be written. Your existing content is preserved; check folder permissions and try again.'})

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4174)
    parser.add_argument('--open', action='store_true', help='Open the portfolio in your default browser')
    args = parser.parse_args()
    if not (ROOT / 'assets/js/content-data.js').exists():
        write_content(normalize_content(read_content()), backup=False)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Portfolio: http://127.0.0.1:{args.port}/index.html', flush=True)
    print(f'Editor:    http://127.0.0.1:{args.port}/editor.html', flush=True)
    if args.open:
        webbrowser.open(f'http://127.0.0.1:{args.port}/index.html')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
