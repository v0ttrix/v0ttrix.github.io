// Translate visible text locally. English originals stay available for switching back.
(() => {
    const dictionary = window.PORTFOLIO_AR || {};
    const textSources = new WeakMap();
    const attributeSources = new WeakMap();
    const ignored = 'script, style, pre, code, svg, kbd, samp, noscript, [data-no-translate]';
    const attributes = ['alt', 'title', 'aria-label', 'placeholder'];
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    let language = 'en';
    try { if (localStorage.getItem('portfolio-language') === 'ar') language = 'ar'; } catch {}
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    function arabic(source) {
        const key = normalize(source);
        if (Object.hasOwn(dictionary, key)) return dictionary[key];
        if (key.endsWith(' - Abd Ulrahman Mardini')) {
            return arabic(key.slice(0, -' - Abd Ulrahman Mardini'.length)) + ' - عبد الرحمن مارديني';
        }
        if (/^All \d+ projects/.test(key)) return key.replace(/^All (\d+) projects/, 'جميع المشاريع الـ $1');
        if (key.startsWith('Used in: ')) return 'استُخدمت في: ' + arabic(key.slice(9));
        if (key.startsWith('Enlarge image: ')) return 'تكبير الصورة: ' + arabic(key.slice(15));
        if (key.startsWith('Open full-size image: ')) return 'فتح الصورة بالحجم الكامل: ' + arabic(key.slice(22));
        if (key.includes(': view ')) {
            const [skill, project] = key.split(': view ');
            return arabic(skill) + ': استعراض ' + arabic(project);
        }
        return key;
    }

    function translateText(node) {
        if (!node.parentElement || node.parentElement.closest(ignored) || !node.nodeValue.trim()) return;
        let record = textSources.get(node);
        if (!record || node.nodeValue !== record.rendered) {
            record = { source: node.nodeValue, rendered: node.nodeValue };
            textSources.set(node, record);
        }
        const source = record.source;
        let result = source;
        if (language === 'ar') {
            const key = normalize(source);
            const translated = key === 'References' && node.parentElement.classList.contains('meta-tag') ? 'المراجع' : arabic(key);
            result = source.match(/^\s*/)[0] + translated + source.match(/\s*$/)[0];
        }
        if (node.nodeValue !== result) node.nodeValue = result;
        record.rendered = result;
    }

    function translateAttributes(element) {
        if (element.closest(ignored)) return;
        let records = attributeSources.get(element);
        if (!records) { records = {}; attributeSources.set(element, records); }
        attributes.forEach(name => {
            const value = element.getAttribute(name);
            if (!value) return;
            let record = records[name];
            if (!record || value !== record.rendered) record = records[name] = { source: value, rendered: value };
            const next = language === 'ar' ? arabic(record.source) : record.source;
            if (value !== next) element.setAttribute(name, next);
            record.rendered = next;
        });
    }

    let observer;
    let scheduled = false;
    const originalTitle = document.title;
    function applyLanguage() {
        observer?.disconnect();
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) translateText(walker.currentNode);
        document.body.querySelectorAll('[alt], [title], [aria-label], [placeholder]').forEach(translateAttributes);
        document.title = language === 'ar' ? arabic(originalTitle) : originalTitle;
        const button = document.getElementById('language-switch');
        if (button) {
            button.setAttribute('aria-pressed', String(language === 'ar'));
            button.setAttribute('aria-label', language === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic');
            button.title = language === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic';
        }
        observer?.observe(document.body, { subtree: true, childList: true, characterData: true });
    }

    function initialize() {
        document.getElementById('language-switch')?.addEventListener('click', () => {
            language = language === 'en' ? 'ar' : 'en';
            try { localStorage.setItem('portfolio-language', language); } catch {}
            applyLanguage();
        });
        observer = new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            queueMicrotask(() => { scheduled = false; applyLanguage(); });
        });
        applyLanguage();
    }
    if (document.readyState === 'complete') initialize();
    else document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
