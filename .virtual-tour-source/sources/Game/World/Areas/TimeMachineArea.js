import { hideVehicleForScreen } from '../../utilities/screenVehicle.js'
﻿import * as THREE from 'three/webgpu'
import { Area } from './Area.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import certificates from '../../../data/certificates.js'
import gsap from 'gsap'
import { getScreenCinematic } from '../../utilities/screenCinematic.js'
import { createScreenReader } from '../../utilities/screenReader.js'

// Reuse the former time machine as a certificate display, with no external link.
export class TimeMachineArea extends Area
{
    constructor(model)
    {
        super(model)
        this.isViewing = false
        this.recoverTransition = null
        this.setTV()
        this.setInteractivePoint()
        this.setInputs()
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
        this.screen = screen
        screen.material = new THREE.MeshBasicNodeMaterial({ map: texture })

        this.showCertificate = () =>
        {
            this.screenReader?.refresh()
            const index = this.certificateIndex
            const certificate = certificates[index]
            context.fillStyle = '#251f2b'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.textAlign = 'center'
            context.fillStyle = '#b7ee97'
            context.font = 'bold 42px sans-serif'
            context.fillText(certificate.title, 800, 65, 1500)
            context.font = '30px sans-serif'
            const hint = this.isViewing ? 'Previous / Next to browse - Open image for full size' : 'Interact to view certificates'
            context.fillText(`${index + 1} / ${certificates.length} - ${hint}`, 800, 860)
            texture.needsUpdate = true
            const image = new Image()
            image.onload = () =>
            {
                if(index !== this.certificateIndex)
                    return
                const scale = Math.min(1480 / image.naturalWidth, 680 / image.naturalHeight)
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
        this.previousCertificate = () =>
        {
            this.certificateIndex = (this.certificateIndex - 1 + certificates.length) % certificates.length
            this.showCertificate()
        }
        let lastCollision = -Infinity
        this.references.items.get('tv')[0].userData.object.physical.onCollision = () =>
        {
            if(this.isViewing || this.game.ticker.elapsed - lastCollision < 1)
                return
            lastCollision = this.game.ticker.elapsed
            this.nextCertificate()
        }
    }

    setInteractivePoint()
    {
        this.interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('interactivePoint')[0].position,
            'View certificates',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () => this.open(),
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact'])
        )
    }

    setInputs()
    {
        const browse = (action, direction) =>
        {
            if(this.isViewing && action.active && this.game.ticker.elapsed >= this.navigationReadyAt)
                direction < 0 ? this.previousCertificate() : this.nextCertificate()
        }
        this.game.inputs.events.on('left', action => browse(action, -1))
        this.game.inputs.events.on('right', action => browse(action, 1))
        this.game.inputs.events.on('forward', action =>
        {
            if(!action.activeKeys.has('Gamepad.r2'))
                browse(action, -1)
        })
        this.game.inputs.events.on('backward', action =>
        {
            if(!action.activeKeys.has('Gamepad.l2'))
                browse(action, 1)
        })
        this.game.inputs.events.on('interact', action =>
        {
            if(this.isViewing && !action.active && this.game.ticker.elapsed >= this.navigationReadyAt)
                this.openImage()
        })
        const buttons = this.game.inputs.interactiveButtons
        buttons.events.on('previous', () => { if(this.isViewing) this.previousCertificate() })
        buttons.events.on('next', () => { if(this.isViewing) this.nextCertificate() })
        buttons.events.on('open', () => { if(this.isViewing) this.openImage() })
        buttons.events.on('close', () => this.close())
    }

    getCinematic()
    {
        return getScreenCinematic(this.game.view.camera, [this.screen], 1.06)
    }

    open()
    {
        if(this.isViewing)
            return
        this.recoverTransition?.kill()
        this.recoverTransition = null
        this.isViewing = true
        // The low table/stool directly in front of the TV obscures its screen.
        this.screenObstructions = this.objects.items
            .map(object => object.visual?.object3D)
            .filter(object => object && /^stool/i.test(object.name))
            .map(object => ({ object, visible: object.visible }))
        for(const { object } of this.screenObstructions)
            object.visible = false
        this.navigationReadyAt = this.game.ticker.elapsed + 1.5
        const cinematic = this.getCinematic()
        this.game.inputs.filters.delete('wandering')
        this.game.inputs.filters.add('cinematic')
        this.game.view.cinematic.start(cinematic.position, cinematic.target, () => this.getCinematic())
        this.game.interactivePoints.temporaryHide()
        this.restoreScreenVehicle = hideVehicleForScreen(this.game)
        this.game.physicalVehicle.deactivate()
        this.game.inputs.interactiveButtons.clearItems()
        this.game.inputs.interactiveButtons.addItems(['previous', 'next', 'open', 'close'])
        this.screenReader ??= createScreenReader({
            title: 'Certificates',
            getContent: () => ({
                ...certificates[this.certificateIndex],
                url: certificates[this.certificateIndex].image,
                urlLabel: 'Open full-size certificate',
                counter: `${this.certificateIndex + 1} / ${certificates.length}`
            }),
            previous: () => this.previousCertificate(),
            next: () => this.nextCertificate(),
            close: () => this.close()
        })
        // Keep the display in the 3D world on touch devices too.

        this.showCertificate()
    }

    openImage()
    {
        window.open(certificates[this.certificateIndex].image, '_blank', 'noopener,noreferrer')
    }

    close()
    {
        if(!this.isViewing)
            return
        this.isViewing = false
        for(const { object, visible } of this.screenObstructions || [])
            object.visible = visible
        this.screenObstructions = null
        this.screenReader?.hide()
        this.game.inputs.filters.delete('cinematic')
        this.game.inputs.filters.add('wandering')
        this.game.view.cinematic.end()
        this.restoreScreenVehicle?.()
        this.restoreScreenVehicle = null
        this.game.physicalVehicle.activate()
        this.game.inputs.interactiveButtons.clearItems()
        this.recoverTransition = gsap.delayedCall(1, () =>
        {
            this.game.interactivePoints.recover()
            this.recoverTransition = null
        })
        this.showCertificate()
    }
}
