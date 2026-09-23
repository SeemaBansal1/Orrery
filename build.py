"""Rebuild index.html from the files in src/ (inlines CSS and JS)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
parts = ['1_data.js', '2_shaders.js', '3_scene.js', '4_ui.js']
js = '(function(){\n' + '\n'.join((src / f).read_text() for f in parts) + '\n})();'
html = (src / 'index.html').read_text().replace('/*__CSS__*/', (src / 'style.css').read_text()).replace('/*__JS__*/', js)
(root / 'index.html').write_text(html)
print('Built index.html,', len(html), 'bytes')
