import test from 'node:test';
import assert from 'node:assert/strict';
import msgpack from 'msgpack-lite';
import worker, { WorldRoom } from './index.js';

const uuid = '12345678-1234-1234-1234-123456789abc';
function socket() {
    return {
        attachment: { clientKey: 'test-ip', uuid: null, lastMessage: 0 },
        messages: [], closed: null,
        deserializeAttachment() { return structuredClone(this.attachment); },
        serializeAttachment(value) { this.attachment = structuredClone(value); },
        send(bytes) { this.messages.push(msgpack.decode(bytes)); },
        close(code) { this.closed = code; }
    };
}
function context(sockets = []) {
    const values = new Map();
    return {
        storage: {
            async get(key) { return structuredClone(values.get(key)); },
            async put(key, value) { values.set(key, structuredClone(value)); },
            async setAlarm() {}
        },
        getWebSockets: () => sockets,
        blockConcurrencyWhile: callback => callback()
    };
}

test('Worker refuses untrusted origins and ordinary HTTP requests to the socket', async () => {
    const env = { ALLOWED_ORIGINS: 'https://v0ttrix.github.io', WORLD: { get() { throw Error('must not dispatch'); } } };
    const bad = await worker.fetch(new Request('https://test/websocket', { headers: { Upgrade: 'websocket', Origin: 'https://other.example' } }), env);
    assert.equal(bad.status, 403);
    assert.equal((await worker.fetch(new Request('https://test/websocket'), env)).status, 426);
    assert.deepEqual(await (await worker.fetch(new Request('https://test/health'), env)).json(), { ok: true, service: 'mardinis-world' });
});

test('binary client submissions persist and broadcast to another connected player', async () => {
    const first = socket(), second = socket(), ctx = context([first, second]);
    const room = new WorldRoom(ctx, {});
    const message = msgpack.encode({ type: 'whispersInsert', uuid, message: 'Hello', countryCode: 'CA', x: 1, y: 2, z: 3 });
    await room.webSocketMessage(first, message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength));
    assert.equal(second.messages[0].type, 'whispersInsert');
    assert.equal(second.messages[0].whispers[0].countrycode, 'ca');
    const resumed = new WorldRoom(ctx, {});
    const { state } = await resumed.loadState();
    assert.equal(state.whispers[0].message, 'Hello');
});

test('malformed packets and oversized payloads are closed before database access', async () => {
    const ws = socket(), room = new WorldRoom(context([ws]), {});
    await room.webSocketMessage(ws, new ArrayBuffer(9000));
    assert.equal(ws.closed, 1009);
    const invalid = socket();
    await room.webSocketMessage(invalid, new Uint8Array([0xc1]).buffer);
    assert.equal(invalid.closed, 1007);
});
