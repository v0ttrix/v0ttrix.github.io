import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, initialState, resetDay, snapshot, applyMessage } from './state.js';

const now = Date.UTC(2026, 10, 16, 12);
const uuid = '12345678-1234-1234-1234-123456789abc';
const race = (overrides = {}) => ({ type: 'circuitInsert', uuid, tag: 'ABC', countryCode: 'CA', duration: 60000, checkpointTimings: [20000, 40000, 60000], ...overrides });
const whisper = (overrides = {}) => ({ type: 'whispersInsert', uuid, countryCode: 'CA', message: 'Hello world', x: 1, y: 2, z: 3, ...overrides });

test('initial handshake supplies every field consumed by circuit, whispers and altar', () => {
    assert.deepEqual(snapshot(initialState(now)), {
        type: 'init', circuitResetTime: Date.UTC(2026, 10, 16), circuitLeaderboard: [], whispers: [],
        cataclysmCount: 0, cataclysmProgress: 0, cataclysmRunning: false
    });
});

test('race keeps the personal best and emits the frontend array format', () => {
    const state = initialState(now);
    applyMessage(state, race(), now, 'one');
    applyMessage(state, race({ duration: 70000 }), now, 'one');
    assert.equal(state.scores.length, 1);
    assert.deepEqual(snapshot(state).circuitLeaderboard, [['ABC', 'ca', 60000]]);
    const events = applyMessage(state, race({ uuid: '22345678-1234-1234-1234-123456789abc', tag: 'xyz', duration: 50000, checkpointTimings: [20000, 50000] }), now, 'two');
    assert.deepEqual(events[0].circuitLeaderboard, [['XYZ', 'ca', 50000], ['ABC', 'ca', 60000]]);
});

test('rejects malformed times, checkpoint order, tags, coordinates and oversized whispers', () => {
    for(const input of [race({ duration: -1 }), race({ tag: '<b>' }), race({ checkpointTimings: [30000, 20000] }), race({ checkpointTimings: [] }), whisper({ x: Infinity }), whisper({ message: 'a'.repeat(101) })])
        assert.throws(() => applyMessage(initialState(now), input, now, 'one'));
});

test('whispers update in place, remove markup and keep private identifiers off the wire', () => {
    const state = initialState(now);
    applyMessage(state, whisper(), now, 'one');
    const id = state.whispers[0].id;
    const events = applyMessage(state, whisper({ message: '<hello>&' }), now, 'one');
    assert.equal(state.whispers.length, 1);
    assert.equal(events[0].whispers[0].id, id);
    assert.equal(events[0].whispers[0].message, 'hello');
    assert(!('uuid' in events[0].whispers[0]));
    assert.equal(snapshot(state).whispers[0].countrycode, 'ca');
});

test('whisper capacity matches the default 100 flames, broadcasting removal before insert', () => {
    const state = initialState(now);
    let events;
    for(let i = 0; i < 101; i++)
        events = applyMessage(state, whisper({ uuid: `${i.toString(16).padStart(8, '0')}-1234-1234-1234-123456789abc` }), now, 'client-' + i);
    assert.equal(state.whispers.length, 100);
    assert.equal(events[0].type, 'whispersDelete');
    assert.equal(events[1].type, 'whispersInsert');
});

test('daily reset clears times but preserves whispers and lava count', () => {
    const state = initialState(now);
    applyMessage(state, race(), now, 'one');
    applyMessage(state, whisper(), now, 'one');
    applyMessage(state, { type: 'cataclysmInsert', uuid }, now, 'one');
    assert.equal(resetDay(state, now), false);
    assert.equal(resetDay(state, now + DAY), true);
    assert.equal(state.scores.length, 0);
    assert.equal(state.whispers.length, 1);
    assert.equal(state.lavaCount, 1);
});

test('rate limits are shared by client key and expire after a minute', () => {
    const state = initialState(now);
    for(let i = 0; i < 12; i++) applyMessage(state, whisper(), now, 'same-client');
    assert.throws(() => applyMessage(state, whisper(), now, 'same-client'), /wait/);
    assert.doesNotThrow(() => applyMessage(state, whisper(), now + 60000, 'same-client'));
});
