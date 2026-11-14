import * as THREE from 'three/webgpu'

// Keep images contained inside the display, with a visible border on every side.
export function createScreenTexture(image, fill = false)
{
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 900
    const context = canvas.getContext('2d')
    context.fillStyle = '#251f2b'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const scale = Math.min((fill ? canvas.width : 1120) / width, (fill ? canvas.height : 630) / height)
    const drawWidth = width * scale
    const drawHeight = height * scale
    context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = false
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    return texture
}
