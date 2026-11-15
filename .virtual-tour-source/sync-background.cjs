// Read the same pinned source used to build the world, avoiding a second palette to maintain.
const fs = require('node:fs');
const path = require('node:path');
function syncBackground(worldRoot, siteRoot) {
    const source = fs.readFileSync(path.join(worldRoot, 'sources/Game/Cycles/DayCycles.js'), 'utf8');
    const presets = {};
    const lightIntensities = {};
    for (const match of source.matchAll(/(\w+):\s*\{([^}]+)\}/g)) {
        const colors = ['lightColor', 'fogColorA', 'fogColorB'].map(key =>
            match[2].match(new RegExp(key + ": new THREE\\.Color\\('([^']+)'\\)"))?.[1]);
        const intensity = match[2].match(/lightIntensity: ([\d.]+)/);
        if (colors.every(Boolean) && intensity) {
            presets[match[1]] = colors;
            lightIntensities[match[1]] = Number(intensity[1]);
        }
    }
    const stops = [...source.matchAll(/properties: presets\.(\w+), stop: ([\d.]+)/g)].map(m => [Number(m[2]), m[1]]);
    const duration = source.match(/super\('[^']+',\s*(\d+)\s*\*\s*(\d+)/);
    if (!duration || !stops.length || stops.some(s => !presets[s[1]])) throw new Error('World day-cycle format changed; update background sync.');
    stops.push([1, stops[0][1]]);
    const grid = fs.readFileSync(path.join(worldRoot, 'sources/Game/World/Grid.js'), 'utf8');
    const floor = grid.match(/color:\s*0x([a-f0-9]{6})/i);
    if (!floor) throw new Error('World floor colour format changed; update background sync.');
    const config = { duration: Number(duration[1]) * Number(duration[2]), floorColor: '#' + floor[1], lightIntensities, presets, stops };
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
