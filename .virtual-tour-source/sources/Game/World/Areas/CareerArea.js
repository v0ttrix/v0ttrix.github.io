import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { color, float, Fn, luminance, max, mix, positionGeometry, step, texture, uniform, uv, vec4 } from 'three/tsl'
import gsap from 'gsap'
import { clamp } from 'three/src/math/MathUtils.js'
import { Area } from './Area.js'

export class CareerArea extends Area
{
    constructor(references)
    {
        super(references)

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '💼 Career',
                expanded: false,
            })
        }

        this.setSounds()
        this.setLines()
        this.setYears()
        this.setAchievement()
    }

    setSounds()
    {
        this.sounds = {}
        this.sounds.stoneOut = this.game.audio.register({
            path: 'sounds/stoneSlides/stoneSlideOut.mp3',
            autoplay: false,
            loop: false,
            volume: 0.3,
            antiSpam: 0.1,
            positions: new THREE.Vector3(),
            distanceFade: 14,
            onPlay: (item, line) =>
            {
                item.positions[0].copy(line.origin)
                item.rate = 1.2 + line.index * 0.1
            }
        })
        this.sounds.stoneIn = this.game.audio.register({
            path: 'sounds/stoneSlides/stoneSlideIn.mp3',
            autoplay: false,
            loop: false,
            volume: 0.2,
            rate: 0.8,
            antiSpam: 0.1,
            positions: new THREE.Vector3(),
            distanceFade: 14,
            onPlay: (item, line) =>
            {
                item.positions[0].copy(line.origin)
                // item.rate = 0.9 + Math.random() * 0.2
            }
        })
    }

    setLines()
    {
        this.lines = {}
        this.lines.items = []
        this.lines.activeElevation = 2.5
        this.lines.padding = 0.25
        
        // Assign entries in the order encountered while driving down the timeline.
        const lineGroups = [...this.references.items.get('line')]
            .sort((a, b) => b.position.z - a.position.z)

        const colors = {
            blue: uniform(color('#5390ff')),
            orange: uniform(color('#ff8039')),
            purple: uniform(color('#b65fff')),
            yellow: uniform(color('#ffe600')),
            green: uniform(color('#a2ffab')),
            teal: uniform(color('#24d9bd'))
        }

        const neonBars = {
            yellow: this.game.materials.createEmissiveGradient('careerScienceYellow', '#fff04a', '#ffd500', 1.7),
            green: this.game.materials.getFromName('emissiveGreenRadialGradient'),
            teal: this.game.materials.createEmissiveGradient('careerClubTeal', '#75ffe0', '#00bfa8', 1.7)
        }
        const originalGlows = new Set(['Blue', 'Orange', 'Purple', 'Green'].map(
            name => this.game.materials.getFromName(`emissive${name}RadialGradient`)
        ))

        // Capture each lane's own glow meshes before replacing shared materials.
        const barBindings = new Map(lineGroups.map(group => {
            const bindings = []
            const capture = root => root.traverse(mesh => {
                if(!mesh.isMesh)
                    return
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                materials.forEach((material, index) => {
                    if(originalGlows.has(material))
                        bindings.push({ mesh, index })
                })
            })
            capture(group)
            return [group, bindings]
        }))

        // The floor combines several lanes in one mesh. Keep those meshes
        // separate from the moving stones and color their triangles by lane.
        const floorTracks = []
        for(const object of this.objects.items)
        {
            const root = object.visual?.object3D
            if(!root || lineGroups.includes(root))
                continue
            root.traverse(mesh => {
                if(!mesh.isMesh || Array.isArray(mesh.material))
                    return
                for(const name of ['Blue', 'Orange', 'Purple', 'Green'])
                {
                    if(mesh.material === this.game.materials.getFromName(`emissive${name}RadialGradient`))
                        floorTracks.push({ mesh, sourceColor: name.toLowerCase() })
                }
            })
        }

        const labels = [
            ['Cameron Heights', 'Collegiate Institute', '2018 - 2020'],
            ['Conestoga Cybersecurity Club', 'President', '2024 - 2026'],
            ['Computer Engineering', 'Conestoga College', '2020 - 2023'],
            ['Munitores Technology', 'Software & security', ''],
            ['FloraTracker', 'ConHacks Winner', '2026'],
            ['Computer Science', 'University of Guelph', '2025 - 2027']
        ]
        for(const [labelIndex, group] of lineGroups.entries())
        {
            const line = {}
            line.group = group
            line.size = parseFloat(line.group.userData.size)
            line.hasEnd = line.group.userData.hasEnd
            line.color = line.group.userData.color
            const title = labels[labelIndex % labels.length][0]
            if(title === 'FloraTracker')
                line.color = 'green'
            else if(title === 'Conestoga Cybersecurity Club')
                line.color = 'teal'
            else if(title === 'Computer Science')
                line.color = 'yellow'
            const label = labels[labelIndex % labels.length].filter(Boolean).join(' | ')
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            context.font = 'bold 90px sans-serif'
            canvas.width = Math.ceil(context.measureText(label).width) + 128
            canvas.height = 256
            context.fillStyle = '#000000'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.fillStyle = '#ffffff'
            context.font = 'bold 90px sans-serif'
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            if(line.color === 'teal')
            {
                // Green stores the outline mask; white stores the letter fill.
                context.strokeStyle = '#00ff00'
                context.lineWidth = 10
                context.lineJoin = 'round'
                context.strokeText(label, canvas.width / 2, 128)
            }
            context.fillText(label, canvas.width / 2, 128)
            line.texture = new THREE.CanvasTexture(canvas)
            line.texture.flipY = false

            line.stone = line.group.children.find(child => child.name.startsWith('stone'))
            line.stone.position.y = 0
            
            line.origin = line.group.position.clone()

            // Give every entry a separate material, including unchanged orange.
            const colorName = line.color.charAt(0).toUpperCase() + line.color.slice(1)
            const barMaterial = (neonBars[line.color] ?? this.game.materials.getFromName(
                `emissive${colorName}RadialGradient`
            )).clone()
            line.barMaterial = barMaterial
            barMaterial.name = 'careerBar-' + labelIndex
            barMaterial.userData.prevent = true
            for(const { mesh, index } of barBindings.get(group))
            {
                if(Array.isArray(mesh.material))
                {
                    const materials = [...mesh.material]
                    materials[index] = barMaterial
                    mesh.material = materials
                }
                else
                    mesh.material = barMaterial
            }

            line.isIn = false
            line.isUp = false
            line.elevationTarget = 0
            line.offsetTarget = 0
            line.labelReveal = uniform(0)

            {
                line.textMesh = line.stone.children.find(child => child.name.startsWith('careerText'))
                // Match the measured canvas aspect ratio instead of stretching
                // every label into the template's narrow panel.
                line.textMesh.scale.z *= 1.35
                line.textMesh.scale.x = line.textMesh.scale.z * canvas.width / canvas.height

                const material = new THREE.MeshLambertNodeMaterial({ transparent: true })
                
                const baseColor = colors[line.color]

                material.outputNode = Fn(() =>
                {
                    const baseUv = uv().toVar()

                    step(baseUv.x, line.labelReveal).lessThan(0.5).discard()

                    const textureColor = texture(line.texture, baseUv)

                    const alpha = step(0.1, max(textureColor.r, textureColor.g))

                    const emissiveColor = baseColor.div(luminance(baseColor)).mul(1.7)

                    const maskColor = color(line.color === 'teal' ? '#000000' : '#251f2b')
                    const finalColor = mix(maskColor, emissiveColor, textureColor.r)
                    
                    return vec4(finalColor, alpha)
                })()

                // Mesh
                line.textMesh.castShadow = false
                line.textMesh.receiveShadow = false
                line.textMesh.material = material
            }

            this.lines.items.push(line)
        }

        for(const { mesh, sourceColor } of floorTracks)
        {
            const lanes = this.lines.items.filter(line => line.group.userData.color === sourceColor)
            if(!lanes.length)
                continue
            mesh.updateWorldMatrix(true, false)
            const geometry = mesh.geometry.clone()
            const positions = geometry.attributes.position
            const index = geometry.index
            const count = index ? index.count : positions.count
            geometry.clearGroups()
            const center = new THREE.Vector3()
            const vertex = new THREE.Vector3()
            for(let offset = 0; offset < count; offset += 3)
            {
                center.set(0, 0, 0)
                for(let corner = 0; corner < 3; corner++)
                {
                    const i = index ? index.getX(offset + corner) : offset + corner
                    center.add(vertex.fromBufferAttribute(positions, i))
                }
                center.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld)
                let closest = 0
                let closestDistance = Infinity
                for(const [i, line] of lanes.entries())
                {
                    const z = clamp(center.z, line.origin.z - line.size, line.origin.z)
                    const distance = Math.hypot(center.x - line.origin.x, center.z - z)
                    if(distance < closestDistance)
                    {
                        closest = i
                        closestDistance = distance
                    }
                }
                geometry.addGroup(offset, 3, closest)
            }
            mesh.geometry = geometry
            mesh.material = lanes.map(line => line.barMaterial)
        }

        this.lines.items.sort((a, b) => b.origin.z - a.origin.z)

        let i = 0
        for(const line of this.lines.items)
        {
            line.index = i++
        }

        // Debug
        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.blue.value, 'blue')
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.orange.value, 'orange')
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.purple.value, 'purple')
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.green.value, 'green')
        }
    }

    setYears()
    {
        this.year = {}
        this.year.group = this.references.items.get('year')[0]
        this.year.group.visible = false // The template's career dates are not Jaden’s timeline.
        this.year.originZ = this.year.group.position.z
        this.year.size = 17
        this.year.offsetTarget = 0
        this.year.start = 2001
        this.year.end = 2027
        this.year.current = this.year.start

        //    Digit indexes
        //
        //      --- 0 ---
        //    |           |
        //    5           1
        //    |           |
        //      --- 6 --- 
        //    |           |
        //    4           2
        //    |           |
        //      --- 3 ---

        const a = 255

        const digitData = new Uint8Array([
            a, a, a, a, a, a, 0, // 0
            0, a, a, 0, 0, 0, 0, // 1
            a, a, 0, a, a, 0, a, // 2
            a, a, a, a, 0, 0, a, // 3
            0, a, a, 0, 0, a, a, // 4
            a, 0, a, a, 0, a, a, // 5
            a, 0, a, a, a, a, a, // 6
            a, a, a, 0, 0, 0, 0, // 7
            a, a, a, a, a, a, a, // 8
            a, a, a, a, 0, a, a, // 9
        ])

        this.year.digitsTexture = new THREE.DataTexture(
            digitData,
            7,
            10,
            THREE.RedFormat,
            THREE.UnsignedByteType,
            THREE.UVMapping,
            THREE.ClampToEdgeWrapping,
            THREE.ClampToEdgeWrapping,
            THREE.NearestFilter,
            THREE.NearestFilter
        )
        this.year.digitsTexture.generateMipmaps = false
        this.year.digitsTexture.needsUpdate = true

        this.year.digits = []

        const digitMeshes = this.year.group.children.filter(child => child.name.startsWith('digit'))

        for(const mesh of digitMeshes)
        {
            const digit = {}
            digit.mesh = mesh
            digit.indexUniform = uniform(0)
            
            const material = new THREE.MeshBasicNodeMaterial()
            material.outputNode = vec4(1.7)

            material.positionNode = Fn(() =>
            {
                const barUv = uv(1).toVar()

                const uvY = digit.indexUniform.div(10).add(float(0.5).div(10))
                barUv.y.assign(uvY)

                const barActive = texture(this.year.digitsTexture, barUv).r

                const newPosition = positionGeometry.toVar()
                newPosition.y.subAssign(barActive.oneMinus())

                return newPosition
            })()

            digit.mesh.material = material

            this.year.digits.push(digit)
        }

        this.year.updateDigits = (year = 2025) =>
        {
            const yearString = `${year}`
            let i = 0
            for(const digit of this.year.digits)
            {
                digit.indexUniform.value = parseInt(yearString[i])
                i++
            }
        }

        this.year.updateDigits(this.year.current)

        // // Test mesh
        // const mesh = new THREE.Mesh(
        //     new THREE.PlaneGeometry(2, 2),
        //     new THREE.MeshBasicMaterial({ map: this.year.digitsTexture, side: THREE.DoubleSide })
        // )
        // mesh.position.y = 4
        // mesh.position.z = -30
        // mesh.position.x = -10
        // this.game.scene.add(mesh)
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'career')
        })
    }

    update()
    {
        // Lines
        for(const line of this.lines.items)
        {
            const delta = line.origin.z - this.game.player.position.z

            // Is in
            if(delta > - this.lines.padding && delta < line.size + this.lines.padding * 2)
            {
                if(!line.isIn)
                {
                    line.isIn = true
                    gsap.to(line.labelReveal, { value: 1, duration: 1, delay: 0.3, overwrite: true, ease: 'power2.inOut' })
                }
            }

            // Is out
            else
            {
                if(line.isIn)
                {
                    line.isIn = false
                    gsap.to(line.labelReveal, { value: 0, duration: 1, overwrite: true, ease: 'power2.inOut' })
                }
            }

            // Elevation
            if(line.isIn)
            {
                if(!line.isUp)
                {
                    line.isUp = true
                    this.sounds.stoneOut.play(line)
                }
            }
            else
            {
                if(delta > line.size)
                {
                    if(line.hasEnd)
                    {
                        if(line.isUp)
                        {
                            line.isUp = false
                            gsap.delayedCall(0.3, () =>
                            {
                                this.sounds.stoneIn.play(line)
                            })
                        }
                    }
                }
                else
                {
                    if(line.isUp)
                    {
                        line.isUp = false
                        gsap.delayedCall(0.3, () =>
                        {
                            this.sounds.stoneIn.play(line)
                        })
                    }
                }
            }

            line.elevationTarget = line.isUp ? this.lines.activeElevation : 0
            line.stone.position.y += (line.elevationTarget - line.stone.position.y) * this.game.ticker.deltaScaled * 3

            // Position
            if(line.isIn)
            {
                if(line.stone.position.y > 1)
                    line.offsetTarget = - clamp(delta, 0, line.size)
            }
            else
            {
                // End
                if(delta > line.size)
                    line.offsetTarget = - line.size
                // Start
                else
                    line.offsetTarget = 0
            }

            line.stone.position.z += (line.offsetTarget - line.stone.position.z) * this.game.ticker.deltaScaled * 10
        }

        // Year
        const delta = this.year.originZ - this.game.player.position.z

        if(delta > this.year.size)
            this.year.offsetTarget = this.year.size
        else if(delta < 0)
            this.year.offsetTarget = 0
        else
            this.year.offsetTarget = delta

        const finalPositionZ = this.year.originZ - this.year.offsetTarget
        this.year.group.position.z += (finalPositionZ - this.year.group.position.z) * this.game.ticker.deltaScaled * 10

        const yearProgress = clamp(this.year.offsetTarget / this.year.size, 0, 1)
        const yearCurrent = this.year.start + Math.floor(yearProgress * (this.year.end - this.year.start))

        if(yearCurrent !== this.year.current)
        {
            this.year.current = yearCurrent
            this.year.updateDigits(this.year.current)
        }
    }
}
