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
    const path = window.location.pathname;
    const navigation = links.map(([label, href]) => {
        const active = path === href || (label === 'Home' && path === '/index.html') || (label === 'Projects' && path.startsWith('/pages/projects/')) || (label === 'Phone Apps' && path.startsWith('/pages/phone-apps/'));
        const content = label === 'Home' ? '<svg class="nav-home-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>' : label;
        return `<a href="${href}"${label === 'Home' ? ' class="nav-home" aria-label="Home" title="Home"' : ''}${active ? ' aria-current="page"' : ''}>${content}</a>`;
    }).join('');
    document.body.insertAdjacentHTML('afterbegin', `
        <a class="skip-link" href="#main">Skip to content</a>
        <header class="site-header"><div class="container nav-inner">
            <a class="wordmark" href="/" aria-label="Jaden Mardini, home">jm<span>.</span></a>
            <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu <span aria-hidden="true">+</span></button>
            <nav id="site-navigation" class="site-navigation" aria-label="Main navigation">${navigation}</nav>
            <div class="header-actions">
                <a class="virtual-tour" href="/virtual-tour/">Virtual Tour</a>
                <button id="language-switch" class="language-switch" type="button" dir="ltr" data-no-translate aria-label="Switch to Arabic" aria-pressed="false"><span lang="en" data-language="en">Eng</span><span aria-hidden="true">/</span><span lang="ar" data-language="ar">Ar</span></button>
            </div>
        </div></header>`);
    if (!document.getElementById('main')) {
        const content = document.querySelector('section, .contact-page');
        if (content) { content.id ||= 'main'; document.querySelector('.skip-link').href = `#${content.id}`; }
    }
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-navigation');
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
