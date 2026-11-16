import msgpack from 'msgpack-lite';
import { DAY, initialState, resetDay, snapshot, applyMessage } from './state.js';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if(url.pathname === '/health') return Response.json({ ok: true, service: 'mardinis-world' });
        if(url.pathname !== '/websocket') return new Response('World server. Connect at /websocket.');
        if(request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
            return new Response('WebSocket connection required', { status: 426 });
        const origins = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim());
        if(!origins.includes(request.headers.get('Origin')))
            return new Response('Origin not allowed', { status: 403 });
        return env.WORLD.get(env.WORLD.idFromName('main-world')).fetch(request);
    }
};

export class WorldRoom {
    constructor(ctx, env) {
        this.ctx = ctx;
        this.env = env;
    }

    send(ws, data) {
        ws.send(new Uint8Array(msgpack.encode(data)));
    }

    broadcast(data) {
        for(const ws of this.ctx.getWebSockets()) {
            try { this.send(ws, data); }
            catch { try { ws.close(1011, 'Reconnect'); } catch {} }
        }
    }

    async loadState() {
        const now = Date.now();
        const state = await this.ctx.storage.get('world') ?? initialState(now);
        const reset = resetDay(state, now);
        await this.ctx.storage.setAlarm(state.day + DAY);
        return { state, reset };
    }

    async fetch(request) {
        if(this.ctx.getWebSockets().length >= 200) return new Response('Room is full', { status: 503 });
        const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
        const clientKey = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
        return this.ctx.blockConcurrencyWhile(async () => {
            const { state, reset } = await this.loadState();
            await this.ctx.storage.put('world', state);
            if(reset) this.broadcast(snapshot(state));
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);
            this.ctx.acceptWebSocket(server);
            server.serializeAttachment({ clientKey, uuid: null, lastMessage: 0 });
            this.send(server, snapshot(state));
            return new Response(null, { status: 101, webSocket: client });
        });
    }

    async webSocketMessage(ws, message) {
        if(typeof message === 'string' || message.byteLength > 8192) {
            ws.close(1009, 'Binary messages up to 8 KB only');
            return;
        }
        let input;
        try { input = msgpack.decode(new Uint8Array(message)); }
        catch { ws.close(1007, 'Invalid MessagePack'); return; }
        const session = ws.deserializeAttachment();
        if(!session || Date.now() - session.lastMessage < 1000) return;
        if(session.uuid && session.uuid !== input?.uuid) { ws.close(1008, 'Session changed'); return; }
        session.lastMessage = Date.now();
        session.uuid = input?.uuid;
        ws.serializeAttachment(session);
        await this.ctx.blockConcurrencyWhile(async () => {
            const { state, reset } = await this.loadState();
            if(reset) {
                await this.ctx.storage.put('world', state);
                this.broadcast(snapshot(state));
            }
            try {
                const events = applyMessage(state, input, Date.now(), session.clientKey);
                await this.ctx.storage.put('world', state);
                for(const event of events) this.broadcast(event);
            } catch(error) {
                this.send(ws, { type: 'error', message: error.message });
            }
        });
    }

    async alarm() {
        await this.ctx.blockConcurrencyWhile(async () => {
            const { state } = await this.loadState();
            await this.ctx.storage.put('world', state);
            this.broadcast(snapshot(state));
        });
    }

    webSocketClose(ws, code, reason) { ws.close(code, reason); }
    webSocketError(ws) { try { ws.close(1011, 'Reconnect'); } catch {} }
}
