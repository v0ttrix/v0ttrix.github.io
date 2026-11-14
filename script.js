// Pick a project for the homepage card, avoiding the previous pick when possible.
(() => {
    const card = document.getElementById('hero-project');
    if (!card) return;
    const projects = [
        { id: 'coil', title: 'COIL robot / command & control', image: 'images/photo_5165805167360806308_x.jpg', alt: 'COIL robot network architecture diagram', href: 'pages/projects/coil-robot.html' },
        { id: 'flora', title: 'FloraTracker / ConHacks 2026', image: 'images/IMG2.png', alt: 'FloraTracker wiring diagram with Raspberry Pi and plant sensors', href: 'pages/projects/scada-greenhouse-monitor.html' },
        { id: 'ctf', title: 'CTF Pi / Raspberry Pi platform', image: 'images/ctfpi/1776490434444.jpeg', alt: 'CTF Pi hardware and server status LEDs', href: 'pages/projects/ctfpi.html' },
        { id: 'scanner', title: 'Web Vulnerability Scanner', image: 'images/demo.jpg', alt: 'Web Vulnerability Scanner terminal report', href: 'pages/projects/virus-detection.html' },
        { id: 'arqam', title: 'Arqam / All Your Banks in One Place', image: 'images/ArcLogo.png', alt: 'Arqam app logo', href: 'pages/phone-apps/arqam.html' }
    ];
    let previous;
    try { previous = sessionStorage.getItem('hero-project'); } catch {}
    const choices = projects.filter(project => project.id !== previous);
    const selected = choices[Math.floor(Math.random() * choices.length)];
    const image = card.querySelector('img');
    image.src = selected.image;
    image.alt = selected.alt;
    card.querySelector('.hero-project-title').textContent = selected.title;
    const link = card.querySelector('a');
    link.href = selected.href;
    link.textContent = 'View project ' + String.fromCodePoint(0x2197);
    try { sessionStorage.setItem('hero-project', selected.id); } catch {}
})();

// A quiet background, with no animation when reduced motion is requested.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.getElementById('matrix');
const ctx = canvas?.getContext('2d');
let matrixTimer;
const fontSize = 14;
let drops = [];
function resizeMatrix() {
    if (!ctx) return;
    const width = Math.ceil(canvas.clientWidth);
    const height = Math.ceil(canvas.clientHeight);
    if (!width || !height || (canvas.width === width && canvas.height === height && drops.length)) return;
    // Keep the trails and column positions when the device actually changes size.
    // Mobile browser controls can fire resize events during ordinary scrolling.
    const previous = document.createElement('canvas');
    previous.width = canvas.width;
    previous.height = canvas.height;
    previous.getContext('2d').drawImage(canvas, 0, 0);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(previous, 0, 0);
    drops = Array.from({ length: Math.ceil(width / fontSize) }, (_, i) =>
        drops[i] ?? Math.floor(Math.random() * height / fontSize));
}
function drawMatrix() {
    ctx.fillStyle = 'rgba(10, 14, 39, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00f0ff';
    ctx.font = `${fontSize}px monospace`;
    drops.forEach((drop, i) => {
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', i * fontSize, drop * fontSize);
        drops[i] = drop * fontSize > canvas.height && Math.random() > 0.975 ? 0 : drop + 1;
    });
}
function updateAnimation() {
    clearInterval(matrixTimer);
    if (ctx && !motionPreference.matches && !document.hidden) matrixTimer = setInterval(drawMatrix, 65);
}
resizeMatrix();
updateAnimation();
window.addEventListener('resize', resizeMatrix);
motionPreference.addEventListener('change', updateAnimation);
document.addEventListener('visibilitychange', updateAnimation);

// Respect the visitor's motion preference for in-page links too.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
        const id = anchor.getAttribute('href').slice(1);
        const target = id && document.getElementById(id);
        if (target) {
            event.preventDefault();
            target.scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth', block: 'start' });
            history.replaceState(null, '', `#${id}`);
        }
    });
});

// Project details remain readable without JavaScript. Overview and demos start open.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[onclick="toggleSection(this)"], [onclick="toggleMainSection(this)"]').forEach((header, index) => {
        const content = header.nextElementSibling;
        if (!content) return;
        const open = /overview|demo|photos|screenshots/i.test(header.textContent) || header.classList.contains('collapsible-section');
        content.id ||= `project-section-${index}`;
        header.removeAttribute('onclick');
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-controls', content.id);
        const setOpen = expanded => {
            header.classList.toggle('collapsed', !expanded);
            header.setAttribute('aria-expanded', String(expanded));
            content.hidden = !expanded;
            content.classList.toggle('expanded', expanded);
        };
        setOpen(open);
        const toggle = () => setOpen(header.getAttribute('aria-expanded') !== 'true');
        header.addEventListener('click', toggle);
        header.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
        });
    });
});

// One image viewer for the whole site, matching the COIL photo overlay.
document.addEventListener('DOMContentLoaded', () => {
    const images = [...document.querySelectorAll('img')];
    if (!images.length) return;
    const viewer = document.createElement('dialog');
    viewer.className = 'image-viewer';
    viewer.setAttribute('aria-label', 'Full-size image');
    viewer.innerHTML = '<button class="image-viewer-close" type="button" aria-label="Close image viewer">×</button><img class="image-viewer-image" alt="">';
    document.body.append(viewer);
    const expandedImage = viewer.querySelector('img');
    const closeButton = viewer.querySelector('button');
    let opener;
    let previousOverflow;
    const open = (image, trigger) => {
        opener = trigger;
        expandedImage.src = image.currentSrc || image.src;
        expandedImage.alt = image.alt;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        viewer.showModal();
        closeButton.focus();
    };
    viewer.addEventListener('click', () => viewer.close());
    viewer.addEventListener('close', () => {
        document.body.style.overflow = previousOverflow;
        expandedImage.removeAttribute('src');
        opener?.focus({ preventScroll: true });
    });
    images.forEach(image => {
        const anchor = image.closest('a');
        const imageOnlyLink = anchor && anchor.children.length === 1 && anchor.firstElementChild === image && !anchor.textContent.trim();
        const trigger = imageOnlyLink ? anchor : image;
        if (!imageOnlyLink) trigger.tabIndex = 0;
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-label', `Enlarge image: ${image.alt || 'Photo'}`);
        image.classList.add('expandable-image');
        trigger.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            open(image, trigger);
        });
        trigger.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                open(image, trigger);
            }
        });
    });
});

// Filter skills and highlight matches while preserving project links.
document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('skill-search');
    if (!search) return;
    const skills = [...document.querySelectorAll('.skill-project-link, .additional-skills .skill-tags > span')].map(element => {
        const text = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const source = text?.textContent.trim() || '';
        const label = document.createElement('span');
        label.className = 'skill-search-label';
        label.setAttribute('data-no-translate', '');
        text?.replaceWith(label);
        return { element, label, source };
    });
    function highlight() {
        const query = search.value.trim().toLocaleLowerCase();
        const arabic = document.documentElement.lang === 'ar';
        skills.forEach(({ element, label, source }) => {
            const name = arabic ? (window.PORTFOLIO_AR?.[source] || source) : source;
            const normalized = name.toLocaleLowerCase();
            const exact = !!query && normalized === query;
            element.hidden = !!query && !normalized.includes(query);
            element.classList.toggle('skill-exact-match', exact);
            label.replaceChildren();
            let offset = 0;
            let index = query && !exact ? normalized.indexOf(query) : -1;
            while (index !== -1) {
                label.append(document.createTextNode(name.slice(offset, index)));
                const mark = document.createElement('mark');
                mark.textContent = name.slice(index, index + query.length);
                label.append(mark);
                offset = index + query.length;
                index = normalized.indexOf(query, offset);
            }
            label.append(document.createTextNode(name.slice(offset)));
        });
    }
    search.addEventListener('input', highlight);
    let lastLanguage = document.documentElement.lang;
    new MutationObserver(() => {
        const language = document.documentElement.lang;
        if (language === lastLanguage) return;
        lastLanguage = language;
        highlight();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    highlight();
});

// Independent reference columns: opening a quote only pushes down its own column.
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.references-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll(':scope > .reference-card')];
    if (!cards.length) return;
    let currentColumns = 0;
    const layout = () => {
        const count = window.innerWidth <= 768 ? 1 : Math.max(1, Math.min(3, Math.floor((grid.clientWidth + 24) / 324)));
        if (count === currentColumns) return;
        currentColumns = count;
        const columns = Array.from({ length: count }, () => {
            const column = document.createElement('div');
            column.className = 'reference-column';
            return column;
        });
        cards.forEach((card, index) => columns[index % count].append(card));
        grid.replaceChildren(...columns);
        grid.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
    };
    layout();
    new ResizeObserver(layout).observe(grid);
    window.addEventListener('resize', layout);
});
