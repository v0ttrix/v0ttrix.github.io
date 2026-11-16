import * as THREE from 'three/webgpu'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import fontData from './welcomeFont.json'

// Bundled Helvetiker Bold outlines keep the sign independent of web fonts.
const font = new FontLoader().parse(fontData)
const capGeometry = new THREE.ShapeGeometry(font.generateShapes('M', 1))
capGeometry.computeBoundingBox()
const capHeight = capGeometry.boundingBox.max.y - capGeometry.boundingBox.min.y
capGeometry.dispose()

export function createLetterBlocks(text, cell = 0.2, depth = 0.5)
{
    const letters = []
    const size = cell * 7 / capHeight
    const bevel = cell * 0.12
    let cursor = 0
    for(const character of text.toUpperCase())
    {
        if(character === ' ')
        {
            cursor += cell * 3
            continue
        }
        if(!fontData.glyphs[character])
            throw new Error(`Missing sign glyph: ${character}`)
        const shapes = font.generateShapes(character, size)
        const geometry = new THREE.ExtrudeGeometry(shapes, {
            depth: depth - bevel * 2, steps: 1, curveSegments: 16,
            bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3
        })
        geometry.computeBoundingBox()
        const bounds = geometry.boundingBox.clone()
        const center = bounds.getCenter(new THREE.Vector3())
        geometry.translate(-center.x, -center.y, -center.z)
        const width = bounds.max.x - bounds.min.x
        const height = bounds.max.y - bounds.min.y
        // Triangular prisms preserve letter holes when the car pushes the sign.
        const colliders = []
        for(const shape of shapes)
        {
            const { shape: contour, holes } = shape.extractPoints(8)
            const triangles = THREE.ShapeUtils.triangulateShape(contour, holes)
            const points = [...contour, ...holes.flat()]
            for(const triangle of triangles)
            {
                const vertices = []
                for(const z of [-depth / 2, depth / 2])
                    for(const index of triangle)
                        vertices.push(points[index].x - center.x, points[index].y - center.y, z)
                colliders.push({ shape: 'hull', parameters: [new Float32Array(vertices)], category: 'object' })
            }
        }
        // Keep punctuation at its font baseline instead of dropping it to the floor.
        const elevation = bounds.min.y + bevel
        letters.push({ character, geometry, colliders, x: cursor + width / 2, height, elevation })
        cursor += width + cell
    }
    const width = cursor - cell
    for(const letter of letters)
        letter.x -= width / 2
    return letters
}
