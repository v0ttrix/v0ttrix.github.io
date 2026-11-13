// Shared navigation for every page, including project details.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.menu-btn')?.remove();
    const links = [
        ['Projects', '/pages/projects.html'], ['Phone Apps', '/pages/phone-apps.html'], ['My Business', '/pages/my-business.html'], ['Experience', '/pages/experience.html'],
        ['About', '/pages/about.html'], ['Skills', '/pages/skills.html'],
        ['Certifications', '/pages/certifications.html'], ['References', '/pages/references.html'],
        ['Contact', '/pages/contact.html']
    ];
    const path = window.location.pathname;
    const navigation = links.map(([label, href]) => {
        const active = path === href || (label === 'Projects' && path.startsWith('/pages/projects/')) || (label === 'Phone Apps' && path.startsWith('/pages/phone-apps/'));
        return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
    }).join('');
    document.body.insertAdjacentHTML('afterbegin', `
        <a class="skip-link" href="#main">Skip to content</a>
        <header class="site-header"><div class="container nav-inner">
            <a class="wordmark" href="/" aria-label="Jaden Mardini, home">jm<span>.</span></a>
            <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu <span aria-hidden="true">+</span></button>
            <nav id="site-navigation" class="site-navigation" aria-label="Main navigation">${navigation}</nav>
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
