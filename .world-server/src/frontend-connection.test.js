import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import msgpack from 'msgpack-lite';
import { DEFAULT_SERVER_URL } from '../../.virtual-tour-source/sources/data/server.js';

function setup(override) {
    const classes = new Set();
    const sockets = [];
    const storage = new Map();
    const timers = [];
    class Events {
        constructor() { this.handlers = new Map(); }
        on(name, callback) { this.handlers.set(name, [...this.handlers.get(name) ?? [], callback]); }
        trigger(name, args = []) { for(const callback of this.handlers.get(name) ?? []) callback(...args); }
    }
    class Socket {
        constructor(url) { this.url = url; this.handlers = new Map(); this.sent = []; sockets.push(this); }
        addEventListener(name, callback) { this.handlers.set(name, callback); }
        emit(name, data) { this.handlers.get(name)?.(data); }
        send(data) { this.sent.push(data); }
    }
    const source = readFileSync(new URL('../../.virtual-tour-source/sources/Game/Server.js', import.meta.url), 'utf8')
        .replace(/^\uFEFF?import .*\r?\n/gm, '')
        .replace('export class Server', 'class Server')
        .replaceAll('import.meta.env.VITE_SERVER_URL', 'override');
    const game = { ticker: { elapsed: 0 }, notifications: { show() {} } };
    const Server = new Function('msgpack', 'uuidv4', 'Events', 'Game', 'DEFAULT_SERVER_URL', 'override', 'WebSocket', 'localStorage', 'document', 'setInterval', source + '\nreturn Server')(
        msgpack, () => '12345678-1234-1234-1234-123456789abc', Events, { getInstance: () => game }, DEFAULT_SERVER_URL, override,
        Socket, { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        { documentElement: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } } },
        callback => timers.push(callback)
    );
    return { server: new Server(), sockets, classes, timers };
}

test('frontend connects to deployed Worker without a build variable, including empty CI overrides', () => {
    for(const override of [undefined, '']) {
        const { server, sockets } = setup(override);
        server.start();
        assert.equal(sockets[0].url, 'wss://mardinis-world-server.jaden-mardini.workers.dev/websocket');
        assert.equal(sockets[0].binaryType, 'arraybuffer');
    }
});

test('frontend consumes the initial scoreboard and whispers and restores offline UI on disconnect', () => {
    const { server, sockets, classes, timers } = setup();
    server.start();
    const first = sockets[0];
    first.emit('open');
    assert(server.connected);
    assert(classes.has('is-server-online'));
    assert(!classes.has('is-server-offline'));
    const init = { type: 'init', circuitLeaderboard: [['ABC', 'ca', 60000]], circuitResetTime: 1, whispers: [] };
    let received;
    server.events.on('message', data => { received = data; });
    const bytes = msgpack.encode(init);
    first.emit('message', { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
    assert.deepEqual(server.initData, init);
    assert.deepEqual(received, init);
    server.send({ type: 'whispersInsert', message: 'Hello', x: 1, y: 2, z: 3 });
    const sent = msgpack.decode(first.sent[0]);
    assert.equal(sent.uuid, server.uuid);
    assert.equal(sent.type, 'whispersInsert');
    first.emit('close');
    assert(!server.connected);
    assert(classes.has('is-server-offline'));
    assert.equal(server.send({ type: 'circuitInsert' }), false);
    timers[0]();
    assert.equal(sockets[1].url, DEFAULT_SERVER_URL);
});

test('explicit backend override is used for first connection and reconnect', () => {
    const { server, sockets, timers } = setup('ws://localhost:8787/websocket');
    server.start();
    assert.equal(sockets[0].url, 'ws://localhost:8787/websocket');
    timers[0]();
    assert.equal(sockets[1].url, 'ws://localhost:8787/websocket');
});
