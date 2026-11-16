export const DAY = 24 * 60 * 60 * 1000;
export const dayStart = now => Math.floor(now / DAY) * DAY;

export function initialState(now = Date.now()) {
    return { day: dayStart(now), scores: [], whispers: [], lavaCount: 0, rates: {} };
}

export function resetDay(state, now) {
    if(state.day === dayStart(now)) return false;
    state.day = dayStart(now);
    state.scores = [];
    return true;
}

export function snapshot(state) {
    return {
        type: 'init',
        circuitResetTime: state.day,
        circuitLeaderboard: state.scores.slice(0, 10).map(s => [s.tag, s.countrycode, s.duration]),
        whispers: state.whispers.map(({ uuid, ...whisper }) => whisper),
        cataclysmCount: state.lavaCount,
        cataclysmProgress: 0,
        cataclysmRunning: false
    };
}

function country(value) {
    return typeof value === 'string' && /^[a-z]{2}$/i.test(value) ? value.toLowerCase() : '';
}

// All visitors share this room. These are casual, client-reported race times,
// not an authoritative simulation or an anti-cheat system.
export function applyMessage(state, input, now, clientKey) {
    if(!input || typeof input !== 'object' || !/^[a-f0-9-]{36}$/i.test(input.uuid ?? ''))
        throw new Error('Invalid session');
    if(!['circuitInsert', 'whispersInsert', 'cataclysmInsert'].includes(input.type))
        throw new Error('Unknown message');
    state.rates = Object.fromEntries(Object.entries(state.rates).filter(([, r]) => now - r.since < 60000));
    const rate = state.rates[clientKey] ?? { since: now, count: 0 };
    if(rate.count >= 12) throw new Error('Please wait before submitting again');
    state.rates[clientKey] = { ...rate, count: rate.count + 1 };

    if(input.type === 'circuitInsert') {
        const tag = String(input.tag ?? '').toUpperCase();
        const times = input.checkpointTimings;
        if(!/^[A-Z0-9]{3}$/.test(tag) || !Number.isSafeInteger(input.duration) || input.duration < 1000 || input.duration > 3600000)
            throw new Error('Invalid race result');
        if(!Array.isArray(times) || times.length < 2 || times.length > 64 || times.some((t, i) =>
            !Number.isSafeInteger(t) || t < 0 || t > input.duration + 1000 || (i && t < times[i - 1])))
            throw new Error('Invalid checkpoint timings');
        const previous = state.scores.find(s => s.uuid === input.uuid);
        if(!previous || input.duration < previous.duration) {
            state.scores = state.scores.filter(s => s.uuid !== input.uuid);
            state.scores.push({ uuid: input.uuid, tag, countrycode: country(input.countryCode), duration: input.duration });
            state.scores.sort((a, b) => a.duration - b.duration);
            state.scores = state.scores.slice(0, 100);
        }
        return [{ type: 'circuitUpdate', circuitLeaderboard: snapshot(state).circuitLeaderboard }];
    }

    if(input.type === 'whispersInsert') {
        const message = String(input.message ?? '').replace(/[<>&\u0000-\u001f\u007f]/g, '').trim();
        if(!message || [...message].length > 100 || ![input.x, input.y, input.z].every(n => Number.isFinite(n) && Math.abs(n) <= 2000))
            throw new Error('Invalid whisper');
        const old = state.whispers.find(w => w.uuid === input.uuid);
        const whisper = {
            id: old?.id ?? crypto.randomUUID(), uuid: input.uuid, message,
            countrycode: country(input.countryCode), x: input.x, y: input.y, z: input.z
        };
        state.whispers = state.whispers.filter(w => w.uuid !== input.uuid);
        state.whispers.push(whisper);
        const removed = state.whispers.splice(0, Math.max(0, state.whispers.length - 100));
        const events = removed.length ? [{ type: 'whispersDelete', whispers: removed.map(w => ({ id: w.id })) }] : [];
        const { uuid, ...publicWhisper } = whisper;
        return [...events, { type: 'whispersInsert', whispers: [publicWhisper] }];
    }

    state.lavaCount++;
    return [{ type: 'cataclysmUpdate', cataclysmCount: state.lavaCount, cataclysmProgress: 0, cataclysmRunning: false }];
}
