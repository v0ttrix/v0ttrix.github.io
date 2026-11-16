import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { getScreenCinematic } from '../sources/Game/utilities/screenCinematic.js'

const loader = new GLTFLoader()
loader.register(parser => {
    parser.loadTexture = async () => new THREE.Texture()
    return { name: 'cameraTestTextures' }
})
const bytes = readFileSync(new URL('../static/areas/areas.glb', import.meta.url))
const { scene } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
scene.updateMatrixWorld(true)

function display(areaName) {
    const area = scene.children.find(child => child.name === areaName)
    const meshes = []
    for(const key of areaName === 'timeMachine' ? ['refScreen'] : ['refImages', 'refTitle', 'refUrl']) {
        let mesh
        area.traverse(child => {
            if(child.name.startsWith(key) && !mesh) mesh = child
        })
        assert(mesh, `${areaName} is missing ${key}`)
        meshes.push(mesh)
    }
    return meshes
}

function corners(mesh) {
    if(!mesh.isMesh)
        return mesh.children.flatMap(corners)
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    const result = []
    for(const x of [box.min.x, box.max.x])
        for(const y of [box.min.y, box.max.y])
            for(const z of [box.min.z, box.max.z])
                result.push(new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld))
    return result
}

for(const area of ['projects', 'lab', 'timeMachine']) {
    for(const [width, height] of [[390, 844], [844, 390], [768, 1024], [1024, 768], [1920, 1080]]) {
        test(`${area} fills the viewport without clipping at ${width}x${height}`, () => {
            const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 200)
            const meshes = display(area)
            const frame = getScreenCinematic(camera, meshes)
            assert([...frame.position, ...frame.target].every(Number.isFinite))
            camera.position.copy(frame.position)
            camera.lookAt(frame.target)
            camera.updateMatrixWorld(true)
            const projected = meshes.flatMap(corners).map(point => point.project(camera))
            for(const point of projected) {
                assert(Math.abs(point.x) < 1 && Math.abs(point.y) < 1, 'Screen is clipped')
                assert(point.z > -1 && point.z < 1, 'Screen is outside the camera range')
            }
            const spanX = Math.max(...projected.map(p => p.x)) - Math.min(...projected.map(p => p.x))
            const spanY = Math.max(...projected.map(p => p.y)) - Math.min(...projected.map(p => p.y))
            assert(Math.max(spanX, spanY) > 1.2, 'Display is too far away to fill the viewport')
        })
    }
}

function testView() {
    const source = readFileSync(new URL('../sources/Game/View.js', import.meta.url), 'utf8')
        .replace(/^\uFEFF?import .*\r?\n/gm, '')
        .replace('export class View', 'class View')
    const gsap = { to(target, props) {
        if('progress' in props) target.progress = props.progress
        if('value' in props) target.value = props.value
    } }
    const View = new Function('THREE', 'CameraControls', 'alea', 'gsap', source + '\nreturn View')(
        THREE, { install() {} }, function() { return () => 0.5 }, gsap
    )
    const view = Object.create(View.prototype)
    view.idealRatio = 16 / 9
    view.ratioOverflow = 16 / 9 / (390 / 844) - 1
    view.camera = new THREE.PerspectiveCamera(25, 390 / 844, 0.1, 200)
    view.defaultCamera = view.camera.clone()
    view.freeCamera = view.camera.clone()
    view.game = { viewport: { width: 390, height: 844, ratio: 390 / 844 }, rendering: { cheapDOFPass: { strength: { value: 1.5 } } } }
    view.setCinematic()
    return view
}

test('shared cinematic does not add the narrow-screen pullback to an already fitted screen', () => {
    const view = testView()
    const frame = () => getScreenCinematic(view.camera, display('timeMachine'))
    const expected = frame()
    view.cinematic.start(expected.position, expected.target, frame)
    assert(view.cinematic.position.distanceTo(expected.position) < 0.00001)
    assert.equal(view.cinematic.progress, 1)
})

test('rotating an open screen recomputes framing and closing releases the framing callback', () => {
    const view = testView()
    const frame = () => getScreenCinematic(view.camera, display('projects'))
    const portrait = frame()
    view.cinematic.start(portrait.position, portrait.target, frame)
    view.game.viewport = { width: 844, height: 390, ratio: 844 / 390 }
    view.resize()
    const landscape = frame()
    assert(view.cinematic.position.distanceTo(landscape.position) < 0.00001)
    assert(view.cinematic.position.distanceTo(portrait.position) > 0.1)
    view.cinematic.end()
    assert.equal(view.cinematic.active, false)
    assert.equal(view.cinematic.getFrame, null)
    assert.equal(view.cinematic.progress, 0)
})
