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
html = html.replace('<head>', '<head>\n<link rel="stylesheet" href="./portfolio-return.css">\n<link rel="stylesheet" href="/tour-transition.css">\n<script src="/tour-transition.js?v=homepage-loader-2"></script>');
html = html.replace(/<body([^>]*)>/, '<body$1>\n<a class="portfolio-return" href="/">Back to portfolio</a>');
html = html.replace('rel="canonical" href="https://v0ttrix.github.io/"', 'rel="canonical" href="https://v0ttrix.github.io/virtual-tour/"');
fs.writeFileSync(index, html);
require('./sync-background.cjs').syncBackground('.world-build', '_site');

// Give each generated background script its own URL. Otherwise a browser can
// keep showing an older palette after rebuilding or switching preview branches.
const { createHash } = require('node:crypto');
function versionScripts(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            versionScripts(file);
        } else if (entry.name.endsWith('.html')) {
            const html = fs.readFileSync(file, 'utf8');
            const versioned = html.replace(/(<script\b[^>]*\bsrc=["'])([^"'?]*\bscript\.js)(?:\?[^"']*)?(["'])/g, (match, prefix, src, quote) => {
                if (/^(?:[a-z]+:)?\/\//i.test(src)) return match;
                const target = src.startsWith('/') ? path.join('_site', src) : path.resolve(path.dirname(file), src);
                if (!fs.existsSync(target)) return match;
                const hash = createHash('sha256').update(fs.readFileSync(target)).digest('hex').slice(0, 12);
                return `${prefix}${src}?v=${hash}${quote}`;
            });
            if (versioned !== html) fs.writeFileSync(file, versioned);
        }
    }
}
versionScripts('_site');
