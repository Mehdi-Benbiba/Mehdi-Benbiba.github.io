"""Build the saved portfolio for GitHub Pages using only the Python standard library."""
from pathlib import Path
import io
import json
import shutil
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import server


def main():
    content = server.read_content()
    server.normalize_content(content)
    companion = (ROOT / 'assets/js/content-data.js').read_text(encoding='utf-8')
    prefix = 'window.PORTFOLIO_CONTENT = '
    if not companion.startswith(prefix) or json.loads(companion[len(prefix):].strip().removesuffix(';')) != content:
        raise SystemExit('Saved content files differ. Save through the local editor, then try again.')

    payload = server.export_website()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for entry in archive.infolist():
            path = Path(entry.filename)
            if path.is_absolute() or '..' in path.parts or not (entry.filename in {
                'index.html', 'portfolio.html', 'about.html', 'blogs.html', 'contact.html', '.nojekyll'
            } or entry.filename.startswith('assets/')):
                raise SystemExit('Unexpected file in the public export.')
            if any(part.startswith('.') for part in path.parts) and entry.filename != '.nojekyll':
                raise SystemExit('A hidden file was found in the public assets.')
            if path.name == 'editor.js':
                raise SystemExit('The local editor must stay out of the public export.')

        # Guard the exact generated directory before clearing a previous build.
        build_root = ROOT / 'deployment'
        output = build_root / 'github-pages'
        if build_root.is_symlink() or output.is_symlink() or output.resolve() != ROOT / 'deployment/github-pages':
            raise SystemExit('The deployment output must be a normal folder inside this workspace.')
        build_root.mkdir(exist_ok=True)
        if output.exists():
            shutil.rmtree(output)
        output.mkdir()
        archive.extractall(output)
        count = len(archive.infolist())

    bundle = build_root / 'mehdi-portfolio-github-pages.zip'
    bundle.write_bytes(payload)
    print(f'Ready: {output}')
    print(f'ZIP: {bundle}')
    print(f'{count} public files; {len(content["projects"])} projects; {len(content["blogs"])} articles.')
    if not content.get('contact', {}).get('formId'):
        print('Contact: the public page offers LinkedIn.')


if __name__ == '__main__':
    main()
