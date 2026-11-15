// Translate visible text locally. English originals stay available for switching back.
(() => {
    const dictionary = window.PORTFOLIO_AR || {};
    const textSources = new WeakMap();
    const attributeSources = new WeakMap();
    const ignored = 'script, style, pre, code, svg, kbd, samp, noscript, [data-no-translate]';
    const attributes = ['alt', 'title', 'aria-label', 'placeholder'];
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    const supported = ['en', 'ar', 'fr', 'zh-CN', 'ru', 'de', 'nl', 'es', 'it', 'pt'];
    const assetRoot = new URL('.', document.currentScript.src);
    const loadedLanguages = new Map();
    function loadLanguage(code) {
        if (code === 'en' || code === 'ar') return Promise.resolve();
        if (!loadedLanguages.has(code)) loadedLanguages.set(code, new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL('locale-' + code + '.js', assetRoot).href;
            script.onload = resolve;
            script.onerror = () => { loadedLanguages.delete(code); script.remove(); reject(new Error('Language could not be loaded')); };
            document.head.append(script);
        }));
        return loadedLanguages.get(code);
    }
    function translate(source) {
        if (language === 'ar') return arabic(source);
        return window.PORTFOLIO_LOCALES?.[language]?.[normalize(source)] || source;
    }
    let language = 'en';
    try { const saved = localStorage.getItem('portfolio-language'); if (supported.includes(saved)) language = saved; } catch {}
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
        if (language !== 'en') {
            const key = normalize(source);
            const translated = language === 'ar' && key === 'References' && node.parentElement.classList.contains('meta-tag') ? 'المراجع' : translate(key);
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
            const next = language === 'en' ? record.source : translate(record.source);
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
        document.title = language === 'en' ? originalTitle : translate(originalTitle);
        const select = document.getElementById('language-switch');
        select?.querySelectorAll('[data-language]').forEach(option => {
            option.setAttribute('aria-pressed', String(option.dataset.language === language));
        });
        observer?.observe(document.body, { subtree: true, childList: true, characterData: true });
    }

    async function initialize() {
        const select = document.getElementById('language-switch');
        const status = document.querySelector('.language-options small');
        let selection = 0;
        select?.addEventListener('click', async event => {
            const option = event.target.closest('[data-language]');
            if (!option || !select.contains(option)) return;
            const selected = option.dataset.language;
            if (!supported.includes(selected)) return;
            const request = ++selection;
            select.querySelectorAll('button').forEach(button => button.disabled = true);
            if (status) status.textContent = 'Loading language...';
            try {
                await loadLanguage(selected);
                if (request !== selection) return;
                language = selected;
                try { localStorage.setItem('portfolio-language', language); } catch {}
                applyLanguage();
                document.querySelector('.language-menu').open = false;
                if (status) status.textContent = 'Choose your language.';
            } catch {
                applyLanguage();
                if (status) status.textContent = 'Could not load this language. Please try again.';
            } finally { select.querySelectorAll('button').forEach(button => button.disabled = false); }
        });
        try { await loadLanguage(language); } catch { language = 'en'; }
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
