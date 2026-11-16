import './screenReader.css'

// Mobile viewing must not depend on a clear line of sight through the 3D world.
export function createScreenReader({ title, getContent, previous, next, close })
{
    const element = document.createElement('section')
    element.className = 'world-screen-reader'
    element.hidden = true
    element.setAttribute('role', 'dialog')
    element.setAttribute('aria-modal', 'true')
    element.setAttribute('aria-label', title)

    const make = (tag, className, text) => {
        const child = document.createElement(tag)
        child.className = className
        if(text) child.textContent = text
        return child
    }
    const button = (text, callback) => {
        const child = make('button', 'world-screen-reader__button', text)
        child.type = 'button'
        child.addEventListener('click', callback)
        return child
    }
    const header = make('header', 'world-screen-reader__header')
    const closeButton = button('Close', close)
    header.append(make('span', 'world-screen-reader__section', title), closeButton)
    const content = make('div', 'world-screen-reader__content')
    const heading = make('h2', 'world-screen-reader__title')
    const image = make('img', 'world-screen-reader__image')
    const description = make('p', 'world-screen-reader__description')
    const link = make('a', 'world-screen-reader__link')
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    content.append(heading, image, description, link)
    const navigation = make('nav', 'world-screen-reader__navigation')
    navigation.setAttribute('aria-label', 'Display navigation')
    const counter = make('span', 'world-screen-reader__counter')
    counter.setAttribute('aria-live', 'polite')
    navigation.append(button('Previous', () => { previous(); refresh() }), counter, button('Next', () => { next(); refresh() }))
    element.append(header, content, navigation)
    document.body.append(element)

    let active = false
    let savedFocus = null
    let contentKey = null
    const mobile = () => window.matchMedia('(pointer: coarse), (max-width: 1024px)').matches
    const refresh = () => {
        if(!active) return
        const data = getContent()
        heading.textContent = data.title
        description.textContent = data.description || ''
        description.hidden = !data.description
        counter.textContent = data.counter || ''
        image.alt = data.title
        image.hidden = !data.image
        if(data.image && image.getAttribute('src') !== data.image) image.setAttribute('src', data.image)
        link.textContent = data.urlLabel || 'Open full image'
        const href = data.url || data.image || ''
        if(href) link.href = href
        else link.removeAttribute('href')
        link.hidden = !href
        const nextKey = `${data.title}|${data.image}`
        if(nextKey !== contentKey) content.scrollTop = 0
        contentKey = nextKey
    }
    const updateVisibility = () => {
        const visible = active && mobile()
        const wasHidden = element.hidden
        element.hidden = !visible
        document.documentElement.classList.toggle('is-screen-reader-open', visible)
        if(visible) {
            refresh()
            if(wasHidden) closeButton.focus({ preventScroll: true })
        }
    }
    window.addEventListener('resize', () => { if(active) updateVisibility() })
    for(const name of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'])
        element.addEventListener(name, event => event.stopPropagation())
    element.addEventListener('keydown', event => {
        event.stopPropagation()
        if(event.key === 'Escape') { event.preventDefault(); close() }
        else if(event.key === 'ArrowLeft') { event.preventDefault(); previous(); refresh() }
        else if(event.key === 'ArrowRight') { event.preventDefault(); next(); refresh() }
        else if(event.key === 'Tab') {
            const controls = [...element.querySelectorAll('button, a[href]')].filter(control => !control.hidden)
            const first = controls[0], last = controls.at(-1)
            if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
    })
    return {
        show() { active = true; savedFocus = document.activeElement; updateVisibility() },
        refresh,
        hide() {
            active = false
            updateVisibility()
            if(savedFocus?.isConnected) savedFocus.focus({ preventScroll: true })
        }
    }
}
