import * as THREE from 'three/webgpu'
import { Area } from './Area.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import certificates from '../../../data/certificates.js'

// Reuse the former time machine as a certificate display, with no external link.
export class TimeMachineArea extends Area
{
    constructor(model)
    {
        super(model)
        this.setTV()
        this.setInteractivePoint()
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'timeMachine')
        })
    }

    setTV()
    {
        this.certificateIndex = 0
        const canvas = document.createElement('canvas')
        canvas.width = 1600
        canvas.height = 900
        const context = canvas.getContext('2d')
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.flipY = false
        const screen = this.references.items.get('screen')[0]
        screen.material = new THREE.MeshBasicNodeMaterial({ map: texture })

        this.showCertificate = () =>
        {
            const index = this.certificateIndex
            const certificate = certificates[index]
            context.fillStyle = '#251f2b'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.textAlign = 'center'
            context.fillStyle = '#b7ee97'
            context.font = 'bold 42px sans-serif'
            context.fillText(certificate.title, 800, 65, 1500)
            context.font = '30px sans-serif'
            context.fillText(`${index + 1} / ${certificates.length} - Interact for next certificate`, 800, 860)
            texture.needsUpdate = true
            const image = new Image()
            image.onload = () =>
            {
                if(index !== this.certificateIndex)
                    return
                const scale = Math.min(1040 / image.naturalWidth, 500 / image.naturalHeight)
                const width = image.naturalWidth * scale
                const height = image.naturalHeight * scale
                context.drawImage(image, (1600 - width) / 2, 110 + (690 - height) / 2, width, height)
                texture.needsUpdate = true
            }
            image.src = certificate.image
        }
        this.showCertificate()
        this.nextCertificate = () =>
        {
            this.certificateIndex = (this.certificateIndex + 1) % certificates.length
            this.showCertificate()
        }
        let lastCollision = -Infinity
        this.references.items.get('tv')[0].userData.object.physical.onCollision = () =>
        {
            if(this.game.ticker.elapsed - lastCollision < 1)
                return
            lastCollision = this.game.ticker.elapsed
            this.nextCertificate()
        }
    }

    setInteractivePoint()
    {
        this.interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('interactivePoint')[0].position,
            'Next certificate',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () => this.nextCertificate(),
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact'])
        )
    }
}
