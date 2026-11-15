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

// Palette and stops are refreshed from the pinned world's DayCycles.js at build time.
// WORLD_DAY_CYCLE_START
const worldDayCycle = {"duration":240,"floorColor":"#1b191f","markColor":"#8d55ff","lineColor":"#675369","rendering":{"fov":25,"cameraPhiHigh":0.9738937226128359,"cameraPhiLow":0.8482300164692442,"radiusMin":15,"radiusMax":30,"radiusOverflow":9,"optimalScale":1.4,"idealAspect":1.7777777777777777,"introZoom":0.3,"lightPhi":0.63,"lightAmplitude":0.62,"lightOffset":0.5625,"shadowLow":-0.25,"shadowHigh":1},"lightIntensities":{"day":1.2,"dusk":1.2,"night":3.8,"dawn":1.2},"fogRanges":{"day":[0.315,1.25],"dusk":[0,1.25],"night":[-0.85,1],"dawn":[0.3,1.25]},"presets":{"day":["#ffd2c2","#00ffff","#9b89ff","#6d3fff"],"dusk":["#ff8181","#3e53ff","#ff4ce4","#4e009c"],"night":["#3240ff","#10266f","#490a42","#2f00db"],"dawn":["#ffa882","#f885ff","#ff7d24","#db004f"]},"stops":[[0,"day"],[0.15,"day"],[0.25,"dusk"],[0.35,"night"],[0.6,"night"],[0.8,"dawn"],[0.9,"day"],[1,"day"]]};
// WORLD_DAY_CYCLE_END

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
(() => {
    // Keep the existing canvas ID so every portfolio page gets the same background.
    const canvas = document.getElementById('matrix');
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    canvas.setAttribute('aria-hidden', 'true');
    let width, height, animationFrame;
    let backgroundLayer, gridLayer, lineLayer, gridPattern, linePattern, pixelRatio;
    let markTint, lineTint, paintLayer;
    let lastColorFrame = -Infinity, lastScrollOffset = NaN;
    let gridScale = 1;
    let gridPeriod = 112 * 8;
    const cycleLeadMs = 4000; // Anticipate a few seconds of loading when entering the world.
    const colorInterval = 1000 / 30;
    const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    const srgb = value => value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055;
    const rgb = hex => hex.match(/[a-f0-9]{2}/gi).map(v => linear(parseInt(v, 16) / 255));
    const floorColor = rgb(worldDayCycle.floorColor);
    const gridColor = rgb(worldDayCycle.markColor);
    const lineColor = rgb(worldDayCycle.lineColor); // The world's major grid-line material.
    const presets = Object.fromEntries(Object.entries(worldDayCycle.presets).map(([key, colors]) => [key, colors.map(rgb)]));
    function palette(now) {
        const progress = ((now + cycleLeadMs) / 1000 / worldDayCycle.duration) % 1;
        const next = worldDayCycle.stops.findIndex(stop => stop[0] > progress);
        const [start, from] = worldDayCycle.stops[next - 1];
        const [end, to] = worldDayCycle.stops[next];
        const t = (progress - start) / (end - start);
        const mix = t * t * (3 - 2 * t); // Same smoothstep and linear colour space as Three.js.
        return {
            progress,
            colors: presets[from].map((color, i) => color.map((v, c) => v + (presets[to][i][c] - v) * mix)),
            intensity: worldDayCycle.lightIntensities[from] + (worldDayCycle.lightIntensities[to] - worldDayCycle.lightIntensities[from]) * mix,
            fogRange: worldDayCycle.fogRanges[from].map((v, i) => v + (worldDayCycle.fogRanges[to][i] - v) * mix)
        };
    }
    const smoothstep = (low, high, value) => {
        const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
        return t * t * (3 - 2 * t);
    };
    function renderView(progress) {
        const model = worldDayCycle.rendering;
        const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const phi = mobile ? model.cameraPhiLow : model.cameraPhiHigh;
        const tangent = Math.tan(model.fov * Math.PI / 360);
        const cosine = Math.cos(phi), sine = Math.sin(phi);
        const maxRadius = model.radiusMax + Math.max(0, model.idealAspect / (width / height) - 1) * model.radiusOverflow;
        const optimalRadius = maxRadius * (mobile ? 1 : model.optimalScale);
        const rayLength = Math.sqrt(1 + tangent * tangent);
        const nearDistance = optimalRadius * cosine / (cosine + tangent * sine) * rayLength;
        const farDistance = optimalRadius * cosine / (cosine - tangent * sine) * rayLength;
        const radius = model.radiusMin + (maxRadius - model.radiusMin) * (1 - model.introZoom);
        const lightPhi = model.lightPhi + Math.cos(-(progress + model.lightOffset) * Math.PI * 2) * .5 * model.lightAmplitude;
        return { tangent, cosine, sine, radius, nearDistance, farDistance,
            shadow: smoothstep(model.shadowHigh, model.shadowLow, Math.cos(lightPhi)) };
    }
    // Same material sequence as MeshDefaultMaterial: light, core shadow, then depth fog.
    function surfaceColor(base, x, y, state, view) {
        const [light, fogA, fogB, shadow] = state.colors;
        const core = base.map((value, i) => {
            const lit = value * light[i] * state.intensity;
            return lit + (value * shadow[i] - lit) * view.shadow;
        });
        const amplitude = view.farDistance - view.nearDistance;
        const near = view.nearDistance + state.fogRange[0] * amplitude;
        const far = view.nearDistance + state.fogRange[1] * amplitude;
        const depth = view.radius * view.cosine / (view.cosine - (1 - 2 * y) * view.tangent * view.sine);
        const strength = smoothstep(near, far, depth);
        const blend = smoothstep(0, 1, Math.hypot(x, y));
        return core.map((value, i) => {
            const fog = fogA[i] + (fogB[i] - fogA[i]) * blend;
            return value + (fog - value) * strength;
        });
    }
    function tintLayer(layer, base, state, view) {
        const target = layer.getContext('2d');
        const data = target.createImageData(layer.width, layer.height);
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < layer.width; x++) {
                const color = surfaceColor(base, (x + .5) / layer.width, (y + .5) / layer.height, state, view);
                const offset = (y * layer.width + x) * 4;
                for (let i = 0; i < 3; i++) data.data[offset + i] = srgb(Math.max(0, color[i])) * 255;
                data.data[offset + 3] = 255;
            }
        }
        target.putImageData(data, 0, 0);
    }
    function updateLayers() {
        const state = palette(Date.now());
        const view = renderView(state.progress);
        tintLayer(backgroundLayer, floorColor, state, view);
        tintLayer(markTint, gridColor, state, view);
        tintLayer(lineTint, lineColor, state, view);
    }
    // Cache geometry separately: the source materials colour both lines and marks,
    // without the old brightness normalization that muted the blue phase.
    function buildGrid() {
        const major = lineLayer.getContext('2d');
        major.strokeStyle = '#fff';
        major.lineWidth = 3;
        major.lineCap = 'square';
        major.beginPath();
        for (const edge of [.5, 112 * 8 + .5]) {
            major.moveTo(edge, 0); major.lineTo(edge, 112 * 8);
            major.moveTo(0, edge); major.lineTo(112 * 8, edge);
        }
        major.stroke();
        const gridCtx = gridLayer.getContext('2d');
        gridCtx.strokeStyle = '#fff';
        gridCtx.lineWidth = 2;
        gridCtx.lineCap = 'square';
        gridCtx.beginPath();
        for (let row = 0; row <= 8; row++) {
            for (let column = 0; column <= 8; column++) {
                const x = column * 112 + 1, y = row * 112 + 1;
                if (row % 8 !== 0) {
                    gridCtx.moveTo(x - 9, y); gridCtx.lineTo(x + 9, y);
                }
                if (column % 8 !== 0) {
                    gridCtx.moveTo(x, y - 9); gridCtx.lineTo(x, y + 9);
                }
            }
        }
        gridCtx.stroke();
        gridPattern = ctx.createPattern(gridLayer, 'repeat');
        linePattern = ctx.createPattern(lineLayer, 'repeat');
        for (const pattern of [gridPattern, linePattern]) pattern.setTransform(new DOMMatrix().scale(gridScale / pixelRatio));
    }
    function gridOffset() {
        // Keep the loader aligned even when focus or history changes the page scroll.
        if (document.documentElement.classList.contains('tour-loading')) return -334;
        return motionPreference.matches ? 0 : window.scrollY * .6;
    }
    function paintPattern(pattern, tint, offsetY) {
        const paint = paintLayer.getContext('2d');
        paint.globalCompositeOperation = 'source-over';
        paint.clearRect(0, 0, width, height);
        paint.save();
        paint.translate(32, offsetY);
        paint.fillStyle = pattern;
        paint.fillRect(-32, -offsetY, width, height);
        paint.restore();
        paint.globalCompositeOperation = 'source-in';
        paint.drawImage(tint, 0, 0, width, height);
        ctx.drawImage(paintLayer, 0, 0, width, height);
    }
    function draw(scrollOffset) {
        ctx.drawImage(backgroundLayer, 0, 0, width, height);
        const offsetY = 32 + scrollOffset % gridPeriod;
        paintPattern(linePattern, lineTint, offsetY);
        paintPattern(gridPattern, markTint, offsetY);
        lastScrollOffset = scrollOffset;
    }
    function resize() {
        const w = Math.ceil(canvas.clientWidth), h = Math.ceil(canvas.clientHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        gridScale = Math.min(w, h) <= 600 ? .25 : 1;
        gridPeriod = 112 * 8 * gridScale;
        if (!w || !h || (w === width && h === height && ratio === pixelRatio)) return;
        width = w; height = h; pixelRatio = ratio;
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const colorLayer = () => {
            const layer = document.createElement('canvas');
            layer.width = layer.height = 64;
            return layer;
        };
        backgroundLayer = colorLayer(); markTint = colorLayer(); lineTint = colorLayer();
        gridLayer = document.createElement('canvas'); lineLayer = document.createElement('canvas');
        for (const layer of [gridLayer, lineLayer]) {
            layer.width = layer.height = Math.round(112 * 8 * ratio);
            layer.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        paintLayer = document.createElement('canvas');
        paintLayer.width = canvas.width; paintLayer.height = canvas.height;
        paintLayer.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
        buildGrid();
        updateLayers();
        draw(gridOffset());
        lastColorFrame = performance.now();
    }
    function animate(timestamp) {
        if (document.hidden || motionPreference.matches) return;
        const scrollOffset = gridOffset();
        const colorsChanged = timestamp - lastColorFrame >= colorInterval;
        if (colorsChanged) {
            updateLayers();
            lastColorFrame = timestamp;
        }
        if (colorsChanged || scrollOffset !== lastScrollOffset) draw(scrollOffset);
        animationFrame = requestAnimationFrame(animate);
    }
    function updateAnimation() {
        cancelAnimationFrame(animationFrame);
        lastColorFrame = -Infinity;
        if (!document.hidden) {
            updateLayers();
            draw(gridOffset());
            if (!motionPreference.matches) animationFrame = requestAnimationFrame(animate);
        }
    }
    resize();
    updateAnimation();
    window.addEventListener('resize', resize);
    window.addEventListener('pageshow', updateAnimation);
    motionPreference.addEventListener('change', updateAnimation);
    document.addEventListener('visibilitychange', updateAnimation);
    new MutationObserver(() => {
        const offset = gridOffset();
        if (!document.hidden && offset !== lastScrollOffset) draw(offset);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();

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

// Project search includes titles, awards and descriptions, preserving their markup.
document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('project-search');
    if (!search) return;
    const cards = [...document.querySelectorAll('#projects .project-card')].map(element => {
        const labels = [];
        element.querySelectorAll('h3, p').forEach(container => {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
            nodes.forEach(node => {
                const source = node.textContent;
                const label = document.createElement('span');
                label.className = 'project-search-label';
                label.setAttribute('data-no-translate', '');
                node.replaceWith(label);
                labels.push({ source, label, title: container.tagName === 'H3' });
            });
        });
        return { element, labels };
    });
    function highlightProjects() {
        const query = search.value.trim().toLocaleLowerCase();
        const arabic = document.documentElement.lang === 'ar';
        cards.forEach(({ element, labels }) => {
            let matches = !query;
            let exactTitle = false;
            labels.forEach(({ source, label, title }) => {
                const name = arabic ? (window.PORTFOLIO_AR?.[source.trim()] || source) : source;
                const normalized = name.toLocaleLowerCase();
                const exact = !!query && normalized.trim() === query;
                if (query && normalized.includes(query)) matches = true;
                if (exact && title) exactTitle = true;
                label.classList.toggle('project-exact-match', exact);
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
            element.hidden = !matches;
            element.classList.toggle('project-exact-match', exactTitle);
        });
    }
    search.addEventListener('input', highlightProjects);
    let lastLanguage = document.documentElement.lang;
    new MutationObserver(() => {
        const language = document.documentElement.lang;
        if (language === lastLanguage) return;
        lastLanguage = language;
        highlightProjects();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    highlightProjects();
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

// Open the resume in a modal viewer without leaving the homepage.
(() => {
    const trigger = document.querySelector('.home-page a[href="resume.pdf"]');
    if (!trigger || typeof HTMLDialogElement === 'undefined') return;
    const viewer = document.createElement('dialog');
    viewer.id = 'resume-viewer';
    viewer.className = 'resume-viewer';
    viewer.setAttribute('aria-labelledby', 'resume-viewer-title');
    viewer.innerHTML = '<div class="resume-viewer-header"><h2 id="resume-viewer-title">My r&eacute;sum&eacute;</h2><a class="resume-open" target="_blank" rel="noopener noreferrer">Open PDF</a><a class="resume-download" download>Download</a><button class="resume-viewer-close" type="button" aria-label="Close resume viewer">&times;</button></div><iframe title="Resume PDF"></iframe>';
    const url = trigger.href;
    viewer.querySelector('.resume-open').href = url;
    viewer.querySelector('.resume-download').href = url;
    const frame = viewer.querySelector('iframe');
    const closeButton = viewer.querySelector('button');
    document.body.append(viewer);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', viewer.id);
    let overflow;
    trigger.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (viewer.open) return;
        overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        frame.src = url;
        viewer.showModal();
        closeButton.focus();
    });
    closeButton.addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => {
        if (event.target !== viewer) return;
        const bounds = viewer.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
    });
    viewer.addEventListener('close', () => {
        document.body.style.overflow = overflow;
        frame.removeAttribute('src');
        trigger.focus({ preventScroll: true });
    });
})();
