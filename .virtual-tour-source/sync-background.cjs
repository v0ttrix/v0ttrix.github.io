// Read the same pinned source used to build the world, avoiding a second palette to maintain.
const fs = require('node:fs');
const path = require('node:path');
function syncBackground(worldRoot, siteRoot) {
    const source = fs.readFileSync(path.join(worldRoot, 'sources/Game/Cycles/DayCycles.js'), 'utf8');
    const presets = {};
    const lightIntensities = {};
    const fogRanges = {};
    for (const match of source.matchAll(/(\w+):\s*\{([^}]+)\}/g)) {
        const colors = ['lightColor', 'fogColorA', 'fogColorB', 'shadowColor'].map(key =>
            match[2].match(new RegExp(key + ": new THREE\\.Color\\('([^']+)'\\)"))?.[1]);
        const intensity = match[2].match(/lightIntensity: ([\d.]+)/);
        const fogNear = match[2].match(/fogNearRatio: (-?[\d.]+)/);
        const fogFar = match[2].match(/fogFarRatio: (-?[\d.]+)/);
        if (colors.every(Boolean) && intensity && fogNear && fogFar && Number(fogFar[1]) > Number(fogNear[1])) {
            presets[match[1]] = colors;
            lightIntensities[match[1]] = Number(intensity[1]);
            fogRanges[match[1]] = [Number(fogNear[1]), Number(fogFar[1])];
        }
    }
    const stops = [...source.matchAll(/properties: presets\.(\w+), stop: ([\d.]+)/g)].map(m => [Number(m[2]), m[1]]);
    const duration = source.match(/super\('[^']+',\s*(\d+)\s*\*\s*(\d+)/);
    if (!duration || !stops.length || stops.some(s => !presets[s[1]])) throw new Error('World day-cycle format changed; update background sync.');
    stops.push([1, stops[0][1]]);
    const grid = fs.readFileSync(path.join(worldRoot, 'sources/Game/World/Grid.js'), 'utf8');
    const floor = grid.match(/color:\s*0x([a-f0-9]{6})/i);
    if (!floor) throw new Error('World floor colour format changed; update background sync.');
    const view = fs.readFileSync(path.join(worldRoot, 'sources/Game/View.js'), 'utf8');
    const lighting = fs.readFileSync(path.join(worldRoot, 'sources/Game/Ligthing.js'), 'utf8');
    const reveal = fs.readFileSync(path.join(worldRoot, 'sources/Game/Reveal.js'), 'utf8');
    const value = (text, pattern, label, group = 1) => {
        const match = text.match(pattern);
        if (!match) throw new Error('World ' + label + ' format changed; update background sync.');
        const number = Number(match[group].replace(/\s/g, ''));
        if (!Number.isFinite(number)) throw new Error('Invalid world ' + label);
        return number;
    };
    const rendering = {
        fov: value(view, /new THREE\.PerspectiveCamera\(([\d.]+)/, 'camera FOV'),
        cameraPhiHigh: Math.PI * value(view, /this\.spherical\.phi = Math\.PI \* \(this\.game\.quality\.level === 0 \? ([\d.]+) : ([\d.]+)/, 'camera angle'),
        cameraPhiLow: Math.PI * value(view, /this\.spherical\.phi = Math\.PI \* \(this\.game\.quality\.level === 0 \? ([\d.]+) : ([\d.]+)/, 'camera angle', 2),
        radiusMin: value(view, /radius\.edges = \{ min: ([\d.]+), max: ([\d.]+)/, 'camera radius'),
        radiusMax: value(view, /radius\.edges = \{ min: ([\d.]+), max: ([\d.]+)/, 'camera radius', 2),
        radiusOverflow: value(view, /radius\.nonIdealRatioOffset = ([\d.]+)/, 'camera aspect offset'),
        optimalScale: 1 - value(view, /zoom\.speedAmplitude = (-?\s*[\d.]+)/, 'camera zoom amplitude'),
        idealAspect: value(view, /constructor\(idealRatio = ([\d.]+) \/ ([\d.]+)/, 'ideal aspect') / value(view, /constructor\(idealRatio = ([\d.]+) \/ ([\d.]+)/, 'ideal aspect', 2),
        introZoom: value(reveal, /baseRatio: ([\d.]+)/, 'intro zoom'),
        lightPhi: value(lighting, /this\.phi = ([\d.]+)/, 'light angle'),
        lightAmplitude: value(lighting, /this\.phiAmplitude = ([\d.]+)/, 'light angle amplitude'),
        lightOffset: value(lighting, /progressOffset = ([\d.]+)\/([\d.]+)/, 'light phase') / value(lighting, /progressOffset = ([\d.]+)\/([\d.]+)/, 'light phase', 2),
        shadowLow: value(lighting, /coreShadowEdgeLow = uniform\(float\((-?[\d.]+)/, 'shadow range'),
        shadowHigh: value(lighting, /coreShadowEdgeHigh = uniform\(float\((-?[\d.]+)/, 'shadow range')
    };
    const gridLines = [...grid.replace(/\/\/[^\n]*/g, '').matchAll(/new MeshGridMaterialLine\('([^']+)'/g)];
    if (gridLines.length < 2) throw new Error('World grid colours changed; update background sync.');
    const config = { duration: Number(duration[1]) * Number(duration[2]), floorColor: '#' + floor[1], markColor: gridLines[0][1], lineColor: gridLines[1][1], rendering, lightIntensities, fogRanges, presets, stops };
    for (const file of ['script.js', 'virtual-tour/portfolio/script.js']) {
        const target = path.join(siteRoot, file);
        if (!fs.existsSync(target)) continue;
        const script = fs.readFileSync(target, 'utf8');
        if (!script.includes('// WORLD_DAY_CYCLE_START')) throw new Error('Missing background palette marker: ' + file);
        fs.writeFileSync(target, script.replace(/\/\/ WORLD_DAY_CYCLE_START[\s\S]*?\/\/ WORLD_DAY_CYCLE_END/,
            '// WORLD_DAY_CYCLE_START\nconst worldDayCycle = ' + JSON.stringify(config) + ';\n// WORLD_DAY_CYCLE_END'));
    }
    return config;
}
module.exports = { syncBackground };
