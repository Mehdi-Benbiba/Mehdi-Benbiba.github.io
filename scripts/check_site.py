"""Check static pages and local links. No third-party packages needed."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
ROOT = parser.parse_args().root.resolve()

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.links, self.errors = path, set(), [], []
        self.h1_count = self.current_count = 0
        self.has_title = self.has_description = False
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if 'id' in attr:
            if attr['id'] in self.ids:
                self.errors.append(f"Duplicate id: {attr['id']}")
            self.ids.add(attr['id'])
        self.h1_count += tag == 'h1'
        self.current_count += attr.get('aria-current') == 'page'
        self.has_title |= tag == 'title'
        self.has_description |= tag == 'meta' and attr.get('name') == 'description'
        for key in ('href', 'src'):
            if attr.get(key):
                self.links.append(attr[key])

pages = {path.resolve(): Page(path) for path in ROOT.glob('*.html')}
errors = []
if not pages:
    errors.append('No HTML pages found.')
checked = 0
for path, page in pages.items():
    label = path.relative_to(ROOT)
    for message in page.errors:
        errors.append(f'{label}: {message}')
    if page.h1_count != 1:
        errors.append(f'{label}: expected one h1, got {page.h1_count}')
    if path.name != 'editor.html' and page.current_count != 2:
        errors.append(f'{label}: top and bottom navigation need an active page')
    if not page.has_title or not page.has_description:
        errors.append(f'{label}: missing page metadata')
    for link in page.links:
        parts = urlsplit(link)
        if parts.scheme or parts.netloc:
            continue
        if parts.path.startswith('/'):
            errors.append(f'{label}: root-relative URL breaks repository hosting: {link}')
            continue
        target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
        checked += 1
        if not target.is_file():
            errors.append(f'{label}: missing local target: {link}')
        elif parts.fragment and target in pages and unquote(parts.fragment) not in pages[target].ids:
            errors.append(f'{label}: missing fragment: {link}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages, {checked} local links/assets, metadata, headings, and active navigation.')
