import * as THREE from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Solid, extruded block lettering. Each occupied cell has its own collider so
// the empty spaces inside letters remain open to collisions.
const glyphs = {
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    A: ['01110', '11011', '10001', '10001', '11111', '10001', '10001'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
    "'": ['11', '01', '10', '00', '00', '00', '00'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    O: ['01110', '11011', '10001', '10001', '10001', '11011', '01110'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111']
}

export function createLetterBlocks(text, cell = 0.2, depth = 0.5)
{
    const letters = []
    let cursor = 0
    for(const character of text.toUpperCase())
    {
        if(character === ' ')
        {
            cursor += cell * 3
            continue
        }
        const rows = glyphs[character]
        if(!rows)
            throw new Error(`Missing sign glyph: ${character}`)
        const width = rows[0].length * cell
        const height = rows.length * cell
        const pieces = []
        const colliders = []
        for(let row = 0; row < rows.length; row++)
        {
            for(let column = 0; column < rows[row].length; column++)
            {
                if(rows[row][column] !== '1')
                    continue
                const position = { x: (column + 0.5) * cell - width / 2, y: height / 2 - (row + 0.5) * cell, z: 0 }
                const piece = new THREE.BoxGeometry(cell, cell, depth)
                piece.translate(position.x, position.y, 0)
                pieces.push(piece)
                colliders.push({ shape: 'cuboid', parameters: [cell / 2, cell / 2, depth / 2], position, category: 'object' })
            }
        }
        const geometry = mergeGeometries(pieces)
        for(const piece of pieces)
            piece.dispose()
        letters.push({ character, geometry, colliders, x: cursor + width / 2, height })
        cursor += width + cell
    }
    const width = cursor - cell
    for(const letter of letters)
        letter.x -= width / 2
    return letters
}
