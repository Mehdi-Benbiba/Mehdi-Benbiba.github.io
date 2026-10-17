"""Integration checks for file persistence, validation, private data, and export."""
from pathlib import Path
import base64
import copy
import importlib.util
import io
import json
import shutil
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import zipfile

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('portfolio_server', PROJECT / 'server.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

class EditorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        shutil.copytree(PROJECT / 'assets', self.root / 'assets')
        for name in ['index.html', 'portfolio.html', 'about.html', 'blogs.html', 'contact.html', '.nojekyll']:
            shutil.copy(PROJECT / name, self.root / name)
        app.ROOT = self.root
        app.CONTENT = self.root / 'assets/data/content.json'
        app.OWNER = self.root / '.local/owner-settings.json'
        app.atomic_write(app.OWNER, json.dumps({'email': 'private@example.com'}))
        self.server = app.ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, body=None, token=True, origin=None):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['X-Portfolio-Token'] = app.TOKEN
        if origin:
            headers['Origin'] = origin
        request = Request(self.url + path, headers=headers, data=None if body is None else json.dumps(body).encode())
        return urlopen(request, timeout=5)

    def test_save_persists_and_detects_stale_editor(self):
        initial = app.read_content()
        next_content = copy.deepcopy(initial)
        next_content['projects'].append({**next_content['projects'][0], 'id': 'test-added-project', 'title': 'An added project'})
        with self.request('/api/content', {'content': next_content, 'expectedRevision': initial['revision']}) as response:
            saved = json.load(response)
        self.assertEqual(app.read_content()['projects'][-1]['title'], 'An added project')
        self.assertNotEqual(saved['revision'], initial['revision'])
        self.assertIn('An added project', (self.root / 'assets/js/content-data.js').read_text(encoding='utf-8'))
        self.assertEqual(len(list((self.root / '.local/history').glob('*.json'))), 1)
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/content', {'content': initial, 'expectedRevision': initial['revision']})
        self.assertEqual(rejected.exception.code, 409)

    def test_rejects_bad_urls_and_unauthorized_saves(self):
        data = app.read_content()
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/content', {'content': data, 'expectedRevision': data['revision']}, token=False)
        self.assertEqual(rejected.exception.code, 403)
        data['projects'][0]['url'] = 'javascript:alert(1)'
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/content', {'content': data, 'expectedRevision': data['revision']})
        self.assertEqual(rejected.exception.code, 400)
        self.assertNotEqual(app.read_content()['projects'][0]['url'], 'javascript:alert(1)')
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/content', {'content': data}, origin='https://example.com')
        self.assertEqual(rejected.exception.code, 403)

    def test_upload_and_export_keep_private_settings_out(self):
        raw = (PROJECT / 'assets/images/globotech.png').read_bytes()
        with self.request('/api/upload', {'data': 'data:image/png;base64,' + base64.b64encode(raw).decode()}) as response:
            upload = json.load(response)
        self.assertTrue((self.root / upload['path']).exists())
        with self.request('/api/export') as response:
            archive = zipfile.ZipFile(io.BytesIO(response.read()))
        self.assertIn('index.html', archive.namelist())
        self.assertIn('assets/js/content-data.js', archive.namelist())
        self.assertNotIn('editor.html', archive.namelist())
        self.assertNotIn(b'href="editor.html', archive.read('index.html'))
        self.assertFalse(any(name.startswith('.local/') for name in archive.namelist()))
        self.assertFalse(any(b'private@example.com' in archive.read(name) for name in archive.namelist()))
        with self.assertRaises(HTTPError) as rejected:
            self.request('/.local/owner-settings.json')
        self.assertEqual(rejected.exception.code, 404)
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/owner', token=False)
        self.assertEqual(rejected.exception.code, 403)

    def test_anonymous_contact_id_and_invalid_upload(self):
        data = app.read_content()
        data['contact'] = {'formId': 'private@example.com'}
        with self.assertRaises(ValueError):
            app.normalize_content(data)
        data['contact'] = {'formId': 'abc123anonymous'}
        self.assertEqual(app.normalize_content(data)['contact']['formId'], 'abc123anonymous')
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/upload', {'data': 'data:image/png;base64,' + base64.b64encode(b'not an image').decode()})
        self.assertEqual(rejected.exception.code, 400)

if __name__ == '__main__':
    unittest.main()
