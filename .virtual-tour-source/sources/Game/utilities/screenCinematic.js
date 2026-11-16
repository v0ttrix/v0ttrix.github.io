import * as THREE from 'three/webgpu'

// Fit the display itself, rather than adding a large world-camera offset on
// narrow screens. Explicit geometry bounds also work before images are visible.
export function getScreenCinematic(camera, meshes, padding = 1.18)
{
    const corners = []
    const bounds = new THREE.Box3()
    for(const object of meshes.filter(Boolean))
    {
        object.updateWorldMatrix(true, true)
        object.traverse(mesh =>
        {
            if(!mesh.isMesh)
                return
            if(!mesh.geometry.boundingBox)
                mesh.geometry.computeBoundingBox()
            const box = mesh.geometry.boundingBox
            for(const x of [box.min.x, box.max.x])
                for(const y of [box.min.y, box.max.y])
                    for(const z of [box.min.z, box.max.z])
                    {
                        const corner = new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld)
                        corners.push(corner)
                        bounds.expandByPoint(corner)
                    }
        })
    }
    const target = bounds.getCenter(new THREE.Vector3())
    const screen = meshes.find(Boolean)
    const normal = new THREE.Vector3()
    const sample = new THREE.Vector3()
    const normals = screen.geometry.attributes.normal
    for(let i = 0; i < normals.count; i++)
        normal.add(sample.fromBufferAttribute(normals, i))
    normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(screen.matrixWorld)).normalize()
    const right = new THREE.Vector3(0, 1, 0).cross(normal)
    if(right.lengthSq() < 0.001)
        right.set(0, 0, 1).cross(normal)
    right.normalize()
    const up = normal.clone().cross(right).normalize()
    const verticalTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const horizontalTangent = verticalTangent * camera.aspect
    let distance = camera.near
    for(const corner of corners)
    {
        const offset = corner.clone().sub(target)
        const depth = offset.dot(normal)
        distance = Math.max(distance,
            padding * Math.abs(offset.dot(right)) / horizontalTangent + depth,
            padding * Math.abs(offset.dot(up)) / verticalTangent + depth
        )
    }
    return { target, position: target.clone().addScaledVector(normal, distance) }
}
