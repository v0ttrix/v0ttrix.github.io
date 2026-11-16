import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function setup({ width = 390, coarse = true } = {}) {
    const document = { activeElement: null }
    class Element extends EventTarget {
        constructor(tag) { super(); this.tagName = tag; this.children = []; this.attributes = new Map(); this.hidden = false; this.isConnected = true }
        append(...children) { this.children.push(...children) }
        setAttribute(key, value) { this.attributes.set(key, value) }
        getAttribute(key) { return this.attributes.get(key) ?? null }
        removeAttribute(key) { this.attributes.delete(key) }
        focus() { document.activeElement = this }
        querySelectorAll() {
            return this.children.flatMap(child => [child, ...child.querySelectorAll()])
                .filter(child => child.tagName === 'button' || (child.tagName === 'a' && child.href))
        }
    }
    const classes = new Set()
    document.body = new Element('body')
    document.documentElement = { classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name) } } }
    document.createElement = tag => new Element(tag)
    const window = new EventTarget()
    const viewport = { width, coarse }
    window.matchMedia = () => ({ matches: viewport.coarse || viewport.width <= 1024 })
    const source = readFileSync(new URL('../sources/Game/utilities/screenReader.js', import.meta.url), 'utf8')
        .replace(/^import .*\r?\n/gm, '').replace('export function createScreenReader', 'function createScreenReader')
    const createScreenReader = new Function('document', 'window', source + '\nreturn createScreenReader')(document, window)
    let index = 0
    const entries = [
        { title: 'First certificate', image: 'first.jpg', description: 'Readable full text', counter: '1 / 2' },
        { title: 'Second certificate', image: 'second.jpg', description: '<b>Text stays literal</b>', counter: '2 / 2' }
    ]
    let closes = 0
    const reader = createScreenReader({
        title: 'Certificates', getContent: () => entries[index],
        previous: () => { index = (index + 1) % 2 },
        next: () => { index = (index + 1) % 2 },
        close: () => { closes++; reader.hide() }
    })
    const root = document.body.children[0]
    return { reader, root, document, window, viewport, classes, get closes() { return closes } }
}

test('phone reader presents accessible text and native images outside the game canvas', () => {
    const { reader, root, classes } = setup()
    reader.show()
    assert(!root.hidden)
    assert.equal(root.getAttribute('role'), 'dialog')
    assert.equal(root.getAttribute('aria-modal'), 'true')
    assert(classes.has('is-screen-reader-open'))
    const content = root.children[1]
    assert.equal(content.children[0].textContent, 'First certificate')
    assert.equal(content.children[1].getAttribute('src'), 'first.jpg')
    assert.equal(content.children[2].textContent, 'Readable full text')
    assert.equal(content.children[3].href, 'first.jpg')
    assert.equal(content.children[3].rel, 'noopener noreferrer')
});

test('Previous/Next refresh text, image and counter and reset scrolling', () => {
    const { reader, root } = setup()
    reader.show()
    const content = root.children[1], navigation = root.children[2]
    content.scrollTop = 500
    navigation.children[2].dispatchEvent(new Event('click'))
    assert.equal(content.children[0].textContent, 'Second certificate')
    assert.equal(content.children[1].getAttribute('src'), 'second.jpg')
    assert.equal(content.children[2].textContent, '<b>Text stays literal</b>')
    assert.equal(navigation.children[1].textContent, '2 / 2')
    assert.equal(content.scrollTop, 0)
    navigation.children[0].dispatchEvent(new Event('click'))
    assert.equal(content.children[0].textContent, 'First certificate')
});

test('Close and Escape restore focus and release the mobile reader', () => {
    const state = setup()
    const before = state.document.createElement('button')
    before.focus()
    state.reader.show()
    assert.notEqual(state.document.activeElement, before)
    const event = new Event('keydown', { cancelable: true })
    Object.defineProperty(event, 'key', { value: 'Escape' })
    state.root.dispatchEvent(event)
    assert(event.defaultPrevented)
    assert.equal(state.closes, 1)
    assert(state.root.hidden)
    assert(!state.classes.has('is-screen-reader-open'))
    assert.equal(state.document.activeElement, before)
    state.reader.show()
    state.root.children[0].children[1].dispatchEvent(new Event('click'))
    assert.equal(state.closes, 2)
});

test('landscape tablets keep the reader while desktop retains the 3D view', () => {
    const state = setup({ width: 1366, coarse: true })
    state.reader.show()
    assert(!state.root.hidden)
    state.viewport.width = 390
    state.window.dispatchEvent(new Event('resize'))
    assert(!state.root.hidden)
    state.viewport.width = 1600
    state.viewport.coarse = false
    state.window.dispatchEvent(new Event('resize'))
    assert(state.root.hidden)
    assert(!state.classes.has('is-screen-reader-open'))
});
