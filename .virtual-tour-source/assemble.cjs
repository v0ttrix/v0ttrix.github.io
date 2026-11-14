const fs = require('node:fs');
const path = require('node:path');
const excluded = new Set(['.git', '.github', '.virtual-tour-source', '.world-build', '_site', 'virtual-tour']);
fs.mkdirSync('_site', { recursive: true });
for (const entry of fs.readdirSync('.')) {
    if (!excluded.has(entry)) fs.cpSync(entry, path.join('_site', entry), { recursive: true });
}
fs.cpSync('.world-build/dist', '_site/virtual-tour', { recursive: true });
fs.copyFileSync('.world-build/license.md', '_site/virtual-tour/license.md');
fs.copyFileSync('.virtual-tour-source/portfolio-return.css', '_site/virtual-tour/portfolio-return.css');
const index = '_site/virtual-tour/index.html';
let html = fs.readFileSync(index, 'utf8');
html = html.replace('<head>', '<head>\n<link rel="stylesheet" href="./portfolio-return.css">');
html = html.replace(/<body([^>]*)>/, '<body$1>\n<a class="portfolio-return" href="/">Back to portfolio</a>');
html = html.replace('rel="canonical" href="https://v0ttrix.github.io/"', 'rel="canonical" href="https://v0ttrix.github.io/virtual-tour/"');
fs.writeFileSync(index, html);
