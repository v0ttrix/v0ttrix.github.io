const archiveRoot = new URL('.', document.currentScript.src).pathname.replace(/\/$/, '');
// Shared navigation for every page, including project details.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.menu-btn')?.remove();
    const links = [
        ['Home', '/'],
        ['My Business', '/pages/my-business.html'],
        ['Projects', '/pages/projects.html'], ['Phone Apps', '/pages/phone-apps.html'], ['Experience', '/pages/experience.html'],
        ['About', '/pages/about.html'], ['Skills', '/pages/skills.html'],
        ['Certifications', '/pages/certifications.html'], ['References', '/pages/references.html'],
        ['Contact', '/pages/contact.html']
    ];
    const path = window.location.pathname.slice(archiveRoot.length) || '/';
    const navigation = links.map(([label, href]) => {
        const active = path === href || (label === 'Home' && path === '/index.html') || (label === 'Projects' && path.startsWith('/pages/projects/')) || (label === 'Phone Apps' && path.startsWith('/pages/phone-apps/'));
        const content = label === 'Home' ? '<svg class="nav-home-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>' : label;
        return `<a href="${archiveRoot}${href}"${label === 'Home' ? ' class="nav-home" aria-label="Home" title="Home"' : ''}${active ? ' aria-current="page"' : ''}>${content}</a>`;
    }).join('');
    document.body.insertAdjacentHTML('afterbegin', `
        <a class="skip-link" href="#main">Skip to content</a>
        <header class="site-header"><div class="container nav-inner">
            <a class="wordmark" href="${archiveRoot}/" aria-label="Jaden Mardini, home">jm<span>.</span></a>
            <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu <span aria-hidden="true">+</span></button>
            <div class="nav-strip"><button class="nav-scroll-arrow nav-scroll-prev" type="button" aria-label="Scroll navigation left" data-no-translate>&lsaquo;</button><nav id="site-navigation" class="site-navigation" aria-label="Main navigation">${navigation}</nav><button class="nav-scroll-arrow nav-scroll-next" type="button" aria-label="Scroll navigation right" data-no-translate>&rsaquo;</button></div>
            <details class="language-menu" data-no-translate dir="ltr"><summary class="language-switch" aria-label="Choose language"><span aria-hidden="true">A &#8644; &#23383;</span><span class="language-caret" aria-hidden="true">&#9662;</span></summary><div class="language-options"><div id="language-switch" role="group" aria-label="Choose language"><button type="button" class="language-option" data-language="en" lang="en">English</button><button type="button" class="language-option" data-language="ar" lang="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</button><button type="button" class="language-option" data-language="fr" lang="fr">Fran&#231;ais</button><button type="button" class="language-option" data-language="zh-CN" lang="zh-CN">&#31616;&#20307;&#20013;&#25991; (Mandarin)</button><button type="button" class="language-option" data-language="ru" lang="ru">&#1056;&#1091;&#1089;&#1089;&#1082;&#1080;&#1081;</button><button type="button" class="language-option" data-language="de" lang="de">Deutsch</button><button type="button" class="language-option" data-language="nl" lang="nl">Nederlands</button><button type="button" class="language-option" data-language="es" lang="es">Espa&#241;ol</button><button type="button" class="language-option" data-language="it" lang="it">Italiano</button><button type="button" class="language-option" data-language="pt" lang="pt">Portugu&#234;s</button></div><small>Choose your language.</small></div></details>
        </div></header>`);
    if (!document.getElementById('main')) {
        const content = document.querySelector('section, .contact-page');
        if (content) { content.id ||= 'main'; document.querySelector('.skip-link').href = `#${content.id}`; }
    }
    const languageMenu = document.querySelector('.language-menu');
    document.addEventListener('click', event => { if (!languageMenu.contains(event.target)) languageMenu.open = false; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && languageMenu.open) { languageMenu.open = false; languageMenu.querySelector('summary').focus(); } });
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-navigation');
    document.querySelector('.nav-scroll-prev').addEventListener('click', () => nav.scrollBy({ left: -180, behavior: 'smooth' }));
    document.querySelector('.nav-scroll-next').addEventListener('click', () => nav.scrollBy({ left: 180, behavior: 'smooth' }));
    // Bring the current tab into view when arriving on a phone or tablet page.
    if (window.matchMedia('(max-width: 1280px)').matches) {
        const current = nav.querySelector('[aria-current="page"]');
        if (current) nav.scrollLeft = current.offsetLeft - nav.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    }
    const close = () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); };
    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { close(); toggle.focus(); }
    });
    document.addEventListener('click', event => { if (!event.target.closest('.site-header')) close(); });
});

// Legal links belong in portfolio footers, outside the world canvas.
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.js-game')) return;
    let footer = document.querySelector('footer');
    if (!footer) {
        footer = document.createElement('footer');
        document.body.append(footer);
    }
    if (footer.querySelector('.footer-legal')) return;
    const links = document.createElement('nav');
    links.className = 'footer-legal';
    links.setAttribute('aria-label', 'Legal');
    links.innerHTML = '<a href="/pages/privacy-policy.html">Privacy Policy</a><a href="/pages/terms-of-service.html">Terms of Service</a>';
    footer.append(links);
});
