import { afterEach, describe, expect, it, vi } from 'vitest'
import { BoxCollider, Engine, Entity, Input, Time, Vector2 } from '@/engine'
import type { Renderer } from '@/engine'
import { GameScene } from '@/game/scenes/GameScene'
import { Projectile } from '@/game/entities/Projectile'
import { Wall } from '@/game/entities/Wall'
import { demoLevel } from '@/game/levels/demoLevel'

afterEach(() => vi.unstubAllGlobals())

describe('GameScene integration', () => {
  it('approaches visible players and freezes pursuit after game over', () => {
    const scene = new GameScene(new Input(), new Time(), 800, 600)
    const enemy = scene.enemies[0]!
    scene.enemies[1]!.hit = true
    scene.player.transform.position.set(3000, 1004)
    enemy.transform.position.set(3500, 1000)
    scene.update(0.25)
    expect(enemy.transform.position.x).toBeCloseTo(3440)
    scene.update(0.25)
    expect(enemy.transform.position.x).toBeCloseTo(3396)
    scene.player.transform.position.x = 2900
    scene.projectiles.push(new Projectile(2920, 1024, 0, { owner: enemy }))
    scene.update(0)
    expect(scene.isGameOver).toBe(true)
    scene.update(1)
    expect(enemy.transform.position.x).toBeCloseTo(3396)
  })

  it('aims at the player, disables controls on impact, and restores the level on R', () => {
    const input = new Input()
    const scene = new GameScene(input, new Time(), 800, 600)
    const enemy = scene.enemies[0]!
    scene.player.transform.position.set(3000, 1000)
    enemy.transform.position.set(3300, 1000)
    scene.enemies[1]!.hit = true
    scene.update(0.6)
    expect(scene.projectiles).toHaveLength(0)
    scene.update(0.6)
    expect(scene.projectiles).toHaveLength(1)
    expect(scene.projectiles[0]!.owner).toBe(enemy)
    expect(scene.isGameOver).toBe(false)
    scene.update(0.7)
    expect(scene.isGameOver).toBe(true)

    const position = scene.player.transform.position.clone()
    vi.spyOn(input, 'isDown').mockImplementation((code) => code === 'KeyD')
    input.clicks.push(new Vector2(100, 100))
    scene.update(2)
    expect(scene.player.transform.position).toEqual(position)
    expect(scene.projectiles).toHaveLength(0)
    scene.resize(1000, 700)
    const renderer = {
      setCamera: vi.fn(),
      drawRect: vi.fn(),
      drawRotatedRect: vi.fn(),
      drawText: vi.fn(),
    }
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawText).toHaveBeenLastCalledWith('Press [R] to restart', 500, 646, {
      fontSize: 24,
      align: 'center',
    })
    expect(renderer.setCamera.mock.invocationCallOrder.at(-1)).toBeLessThan(
      renderer.drawText.mock.invocationCallOrder.at(-1)!
    )

    input.endFrame()
    vi.spyOn(input, 'wasPressed').mockImplementation((code) => code === 'KeyR')
    scene.update(0.1)
    expect(scene.isGameOver).toBe(false)
    expect(scene.player.controlsEnabled).toBe(true)
    expect(scene.player.transform.position).toMatchObject(demoLevel.playerSpawn)
    expect(scene.player.transform.rotation).toBe(0)
    expect(scene.projectiles).toHaveLength(0)
    expect(scene.enemies.every((target) => !target.hit && target.hitboxes[0]!.enabled)).toBe(true)
    expect(scene.enemies.map((target) => target.transform.position)).toEqual(
      demoLevel.enemies.map(({ x, y }) => ({ x, y }))
    )
    expect(scene.entities).toHaveLength(
      demoLevel.floors.length + demoLevel.walls.length + demoLevel.enemies.length + 1
    )
    expect(scene.camera.position).toMatchObject({
      x: Math.max(0, demoLevel.playerSpawn.x + 20 - 500),
      y: Math.max(0, demoLevel.playerSpawn.y + 20 - 350),
    })
    renderer.drawText.mockClear()
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawText.mock.calls.some(([text]) => text === 'Press [R] to restart')).toBe(
      false
    )
    vi.mocked(input.isDown).mockReturnValue(false)
    scene.update(0.1)
    expect(scene.projectiles).toHaveLength(0)
  })

  it('keeps the world and existing shots running after death without aiming or new shots', () => {
    const input = new Input()
    const scene = new GameScene(input, new Time(), 800, 600)
    const enemy = scene.enemies[0]!
    const target = scene.enemies[1]!
    scene.player.transform.position.set(3000, 1000)
    enemy.transform.position.set(3300, 1000)
    target.transform.position.set(3600, 1000)
    const entity = new Entity()
    const update = vi.spyOn(entity, 'update')
    scene.add(entity)
    const attacks = scene.enemies.map((shooter) => vi.spyOn(shooter, 'attack'))
    const lingering = new Projectile(4000, 1500, 0, { owner: enemy, speed: 450 })
    scene.projectiles.push(
      new Projectile(3500, 1024, 0, { owner: scene.player }),
      lingering,
      new Projectile(3020, 1020, 0, { owner: enemy })
    )
    scene.update(0.01)
    expect(scene.isGameOver).toBe(true)
    expect(lingering.transform.position.x).toBeCloseTo(4004.5)

    vi.spyOn(input, 'isDown').mockImplementation((code) => code === 'KeyD')
    input.pointer = new Vector2(100, 100)
    input.clicks.push(input.pointer.clone())
    const rotation = scene.player.transform.rotation
    scene.update(0.2)
    expect(scene.player.transform.position).toMatchObject({ x: 3000, y: 1000 })
    expect(scene.player.transform.rotation).toBe(rotation)
    expect(target.hit).toBe(true)
    expect(scene.projectiles).toEqual([lingering])
    expect(lingering.transform.position.x).toBeCloseTo(4094.5)
    expect(update).toHaveBeenCalledTimes(2)
    for (const attack of attacks) {
      expect(attack).not.toHaveBeenCalled()
    }
    scene.update(4)
    expect(scene.projectiles).toHaveLength(0)

    input.endFrame()
    vi.spyOn(input, 'wasPressed').mockImplementation((code) => code === 'KeyR')
    scene.update(0)
    input.clicks.push(new Vector2(700, 100))
    scene.update(0.01)
    expect(scene.player.transform.position.x).toBeCloseTo(demoLevel.playerSpawn.x + 4)
    expect(scene.player.transform.rotation).not.toBe(rotation)
    expect(scene.projectiles).toHaveLength(1)
    expect(scene.projectiles[0]!.owner).toBe(scene.player)
  })

  it('fires only with a clear shot, waits between shots, and stops when defeated or out of range', () => {
    const scene = new GameScene(new Input(), new Time(), 800, 600)
    const enemy = scene.enemies[0]!
    for (const other of scene.enemies.slice(1)) {
      other.hit = true
    }
    enemy.transform.position.set(3300, 1000)
    scene.add(new Wall(3200, 1000, 20, 100))
    scene.player.transform.position.set(3000, 1000)
    scene.update(1.2)
    expect(scene.projectiles).toHaveLength(0)
    scene.player.transform.position.set(3000, 1300)
    scene.update(0)
    expect(scene.projectiles).toHaveLength(1)
    scene.projectiles.length = 0
    scene.update(0.2)
    expect(scene.projectiles).toHaveLength(0)
    scene.update(1)
    expect(scene.projectiles).toHaveLength(1)
    scene.projectiles.length = 0
    enemy.hit = true
    scene.update(2)
    expect(scene.projectiles).toHaveLength(0)
    enemy.hit = false
    scene.player.transform.position.set(4500, 1000)
    scene.update(2)
    expect(scene.projectiles).toHaveLength(0)
  })

  it('blocks enemy projectiles with walls and lets the player dodge a fired shot', () => {
    const scene = new GameScene(new Input(), new Time(), 800, 600)
    const enemy = scene.enemies[0]!
    scene.player.transform.position.set(3000, 1000)
    enemy.transform.position.set(3300, 1000)
    const wall = new Wall(3200, 900, 20, 400)
    scene.add(wall)
    scene.projectiles.push(new Projectile(3324, 1024, Math.PI, { owner: enemy }))
    scene.update(0.4)
    expect(scene.isGameOver).toBe(false)
    expect(scene.projectiles).toHaveLength(0)
    wall.collider.enabled = false
    scene.update(1.2)
    expect(scene.projectiles).toHaveLength(1)
    scene.player.transform.position.y += 100
    scene.update(0.7)
    expect(scene.isGameOver).toBe(false)
    expect(scene.projectiles).toHaveLength(1)
  })

  it('spawns the configured enemies and walls with a clear player spawn', () => {
    const scene = new GameScene(new Input(), new Time(), 800, 600)
    expect(scene.enemies.map((enemy) => enemy.transform.position)).toEqual(
      demoLevel.enemies.map(({ x, y }) => ({ x, y }))
    )
    expect(scene.entities.filter((entity) => entity instanceof Wall)).toHaveLength(
      demoLevel.walls.length
    )
    for (const [index, spawn] of demoLevel.enemies.entries()) {
      const { facingAngleDegrees, ...options } = spawn.options ?? {}
      expect(scene.enemies[index]!.config).toMatchObject(options)
      if (facingAngleDegrees !== undefined) {
        expect(scene.enemies[index]!.transform.rotation).toBeCloseTo(
          facingAngleDegrees * (Math.PI / 180)
        )
      }
    }
    expect(scene.player.transform.position).toMatchObject(demoLevel.playerSpawn)
    expect(scene.collisions.overlaps(scene.player.collider)).toEqual([])
  })

  it('blocks movement at the side wall and allows entry through the doorway', () => {
    const input = new Input()
    vi.spyOn(input, 'isDown').mockImplementation((key) => key === 'KeyD')
    const scene = new GameScene(input, new Time(), 1280, 720)
    scene.player.transform.position.set(900, 240)
    scene.update(0.5)
    expect(scene.player.transform.position.x).toBeCloseTo(960)
    vi.mocked(input.isDown).mockImplementation((key) => key === 'KeyS')
    scene.player.transform.position.set(1180, 100)
    scene.update(0.5)
    expect(scene.player.transform.position).toMatchObject({ x: 1180, y: 300 })
    expect(scene.collisions.overlaps(scene.player.collider)).toEqual([])
  })

  it('shields an indoor enemy behind a wall but allows a clear shot inside', () => {
    const scene = new GameScene(new Input(), new Time(), 1280, 720)
    const enemy = scene.enemies[1]!
    enemy.transform.position.set(1070, 320)
    scene.projectiles.push(new Projectile(950, 344, 0))
    scene.update(0.3)
    expect(scene.projectiles).toHaveLength(0)
    expect(scene.enemies.every((target) => !target.hit)).toBe(true)

    scene.projectiles.push(new Projectile(1200, 344, Math.PI))
    scene.update(0.3)
    expect(scene.projectiles).toHaveLength(0)
    expect(enemy.hit).toBe(true)
    expect(scene.enemies.filter((target) => target.hit)).toHaveLength(1)
  })

  it('toggles colliders, hitboxes, and enemy vision with Command+C', () => {
    const windowTarget = new EventTarget()
    vi.stubGlobal('window', windowTarget)
    vi.stubGlobal('document', new EventTarget())
    const input = new Input()
    const scene = new GameScene(input, new Time(), 1280, 720)
    scene.player.transform.position.set(3000, 1000)
    scene.projectiles.push(new Projectile(3100, 1040, 0))
    const renderer = {
      drawRect: vi.fn(),
      drawRotatedRect: vi.fn(),
      drawSector: vi.fn(),
      drawRectOutline: vi.fn(),
      drawRotatedRectOutline: vi.fn(),
      drawText: vi.fn(),
      setCamera: vi.fn(),
    }
    const frame = (): void => {
      renderer.drawSector.mockClear()
      renderer.drawRectOutline.mockClear()
      renderer.drawRotatedRectOutline.mockClear()
      renderer.setCamera.mockClear()
      scene.update(0)
      scene.render(renderer as unknown as Renderer)
      input.endFrame()
    }
    const press = (metaKey: boolean, repeat = false): Event => {
      const event = Object.assign(new Event('keydown', { cancelable: true }), {
        code: 'KeyC',
        metaKey,
        repeat,
      })
      windowTarget.dispatchEvent(event)
      return event
    }
    input.start()
    try {
      frame()
      expect(renderer.drawSector).not.toHaveBeenCalled()
      expect(renderer.drawRectOutline).not.toHaveBeenCalled()
      expect(press(false).defaultPrevented).toBe(false)
      frame()
      expect(renderer.drawSector).not.toHaveBeenCalled()
      expect(renderer.drawRectOutline).not.toHaveBeenCalled()
      expect(press(true).defaultPrevented).toBe(true)
      frame()
      expect(
        renderer.drawRectOutline.mock.calls.filter((call) => call[4] === '#00ff00')
      ).toHaveLength(demoLevel.walls.length + 2)
      expect(
        renderer.drawRectOutline.mock.calls.filter((call) => call[4] === '#c084fc')
      ).toHaveLength(demoLevel.enemies.length + 1)
      expect(renderer.drawSector).toHaveBeenCalledTimes(scene.enemies.length)
      for (const enemy of scene.enemies) {
        expect(renderer.drawSector).toHaveBeenCalledWith(
          enemy.transform.position.x + enemy.width / 2,
          enemy.transform.position.y + enemy.height / 2,
          enemy.config.vision.range,
          enemy.transform.rotation,
          (enemy.config.vision.angleDegrees * Math.PI) / 180,
          'rgba(250, 204, 21, 0.10)',
          '#facc15'
        )
      }
      expect(renderer.drawSector.mock.invocationCallOrder[0]).toBeGreaterThan(
        renderer.setCamera.mock.invocationCallOrder[0]!
      )
      expect(renderer.drawSector.mock.invocationCallOrder.at(-1)).toBeLessThan(
        renderer.setCamera.mock.invocationCallOrder[1]!
      )
      expect(renderer.drawRectOutline).toHaveBeenCalledWith(3000, 1000, 40, 40, '#c084fc', 1)
      scene.player.transform.rotation = Math.PI / 4
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyR' }))
      frame()
      expect(scene.player.collider.followRotation).toBe(false)
      expect(
        renderer.drawRotatedRectOutline.mock.calls.filter((call) => call[5] === '#00ff00')
      ).toHaveLength(0)
      expect(renderer.drawRotatedRectOutline).toHaveBeenCalledWith(
        3000,
        1000,
        40,
        40,
        Math.PI / 4,
        '#c084fc',
        1
      )
      expect(renderer.drawRectOutline).toHaveBeenCalledWith(3000, 1000, 40, 40, '#00ff00')
      expect(renderer.drawRectOutline).toHaveBeenCalledWith(3096, 1036, 8, 8, '#00ff00')
      expect(renderer.drawRectOutline.mock.invocationCallOrder[0]).toBeGreaterThan(
        renderer.setCamera.mock.invocationCallOrder[0]!
      )
      expect(renderer.drawRectOutline.mock.invocationCallOrder.at(-1)).toBeLessThan(
        renderer.setCamera.mock.invocationCallOrder[1]!
      )
      expect(press(true, true).defaultPrevented).toBe(true)
      frame()
      expect(
        renderer.drawRectOutline.mock.calls.filter((call) => call[4] === '#00ff00')
      ).toHaveLength(demoLevel.walls.length + 2)
      // A fresh press must work even when macOS has omitted the previous C keyup.
      press(true)
      frame()
      expect(renderer.drawSector).not.toHaveBeenCalled()
      expect(renderer.drawRectOutline).not.toHaveBeenCalled()
      expect(renderer.drawRotatedRectOutline).not.toHaveBeenCalled()
    } finally {
      input.stop()
    }
  })

  it('passes through enemies but stops and slides against added walls', () => {
    const input = new Input()
    const held = new Set(['KeyD'])
    vi.spyOn(input, 'isDown').mockImplementation((key) => held.has(key))
    const scene = new GameScene(input, new Time(), 1280, 720)
    scene.player.transform.position.set(200, 220)
    scene.update(1)
    expect(scene.player.transform.position).toMatchObject({ x: 600, y: 220 })
    expect(scene.enemies.every((enemy) => enemy.collider === null)).toBe(true)

    const wall = new Entity()
    wall.transform.position.set(3100, 900)
    wall.collider = new BoxCollider(wall, 2, 400)
    scene.add(wall)
    scene.player.transform.position.set(3000, 1000)
    held.add('KeyS')
    scene.update(0.5)
    expect(scene.player.transform.position.x).toBeCloseTo(3060)
    expect(scene.player.transform.position.y).toBeCloseTo(1000 + 200 / Math.sqrt(2))
    expect(scene.collisions.overlaps(scene.player.collider)).toEqual([])
  })

  it('keeps the fixed collider inside the world while allowing aiming at its edge', () => {
    const input = new Input()
    const scene = new GameScene(input, new Time(), 1280, 720)
    scene.player.transform.rotation = Math.PI / 4
    scene.player.transform.position.set(-100, -100)
    scene.update(0)
    expect(scene.player.collider.bounds.x).toBeCloseTo(0)
    expect(scene.player.collider.bounds.y).toBeCloseTo(0)
    scene.player.transform.rotation = 0
    scene.player.transform.position.set(0, 0)
    input.pointer = new Vector2(100, 100)
    scene.update(0)
    expect(scene.player.transform.rotation).toBe(Math.PI / 4)
    expect(scene.player.collider.shape.rotation).toBe(0)
  })

  it('adapts the camera on resize without resetting gameplay', () => {
    const scene = new GameScene(new Input(), new Time(), 1280, 720)
    scene.player.transform.position.set(3000, 1000)
    scene.enemies[0]!.hit = true
    scene.resize(800, 600)
    expect([scene.camera.width, scene.camera.height]).toEqual([800, 600])
    expect(scene.camera.position).toMatchObject({ x: 2620, y: 720 })
    expect(scene.player.transform.position).toMatchObject({ x: 3000, y: 1000 })
    expect(scene.enemies[0]!.hit).toBe(true)
    scene.resize(8000, 3000)
    expect(scene.camera.position).toMatchObject({ x: 0, y: 0 })
  })

  it('follows after movement, clamps the player to the world, and restores UI coordinates', () => {
    const input = new Input()
    vi.spyOn(input, 'isDown').mockImplementation((key) => key === 'KeyD')
    const scene = new GameScene(input, new Time(), 1280, 720)
    scene.player.transform.position.set(3000, 1000)
    scene.update(0.1)
    expect(scene.camera.position.x).toBe(2420)
    expect(scene.camera.position.y).toBe(660)
    const renderer = {
      setCamera: vi.fn(),
      drawRotatedRect: vi.fn(),
      drawRect: vi.fn(),
      drawText: vi.fn(),
    }
    scene.render(renderer as unknown as Renderer)
    expect(renderer.setCamera.mock.calls).toEqual([[scene.camera], [null]])
    expect(renderer.setCamera.mock.invocationCallOrder[1]).toBeLessThan(
      renderer.drawText.mock.invocationCallOrder.at(-4)!
    )
    scene.player.transform.position.set(7000, 3000)
    scene.update(0)
    expect(scene.player.transform.position).toMatchObject({ x: 5960, y: 1960 })
    expect(scene.camera.position).toMatchObject({ x: 4720, y: 1280 })
  })

  it('renders live diagnostics after entities without changing timing or position', () => {
    const time = new Time()
    const scene = new GameScene(new Input(), time, 1280, 720)
    const calls: string[] = []
    const drawText = vi.fn((text: string) => calls.push(text))
    const renderer = {
      drawRect: vi.fn(() => calls.push('rectangle')),
      drawRotatedRect: vi.fn(() => calls.push('rectangle')),
      drawText,
      setCamera: vi.fn(),
    } as unknown as Renderer
    scene.render(renderer)
    expect(calls.slice(-6)).toEqual([
      'rectangle',
      'rectangle',
      'FPS: 0',
      'Delta: 0.000 s',
      `Entities: ${demoLevel.floors.length + demoLevel.walls.length + demoLevel.enemies.length + 1}`,
      `Player: ${demoLevel.playerSpawn.x.toFixed(1)}, ${demoLevel.playerSpawn.y.toFixed(1)}`,
    ])
    time.update(0)
    time.update(20)
    scene.player.transform.position.set(123.456, -7.89)
    scene.add(new Entity())
    drawText.mockClear()
    scene.render(renderer)
    expect(drawText.mock.calls.slice(-4)).toEqual([
      ['FPS: 50', 16, 16],
      ['Delta: 0.020 s', 16, 40],
      [
        `Entities: ${demoLevel.floors.length + demoLevel.walls.length + demoLevel.enemies.length + 2}`,
        16,
        64,
      ],
      ['Player: 123.5, -7.9', 16, 88],
    ])
    expect(time.deltaTime).toBe(0.02)
    expect(scene.player.transform.position.x).toBe(123.456)
  })

  it.each(['blur', 'visibilitychange'])(
    'moves and renders the player, then stops movement after %s',
    (eventName) => {
      const windowTarget = new EventTarget()
      const documentTarget = Object.assign(new EventTarget(), { hidden: false })
      vi.stubGlobal('window', windowTarget)
      vi.stubGlobal('document', documentTarget)
      let callback: FrameRequestCallback = () => {}
      let nextId = 0
      vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => {
        callback = next
        return nextId++
      })
      vi.stubGlobal('cancelAnimationFrame', vi.fn())
      const context = {
        clearRect: vi.fn(),
        setTransform: vi.fn(),
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillText: vi.fn(),
      }
      const canvas = {
        width: 0,
        height: 0,
        style: { setProperty: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: () => context,
      } as unknown as HTMLCanvasElement
      const engine = new Engine({ canvas, width: 1280, height: 720 })
      const scene = new GameScene(engine.input, engine.time, 1280, 720)
      engine.setScene(scene)
      expect(scene.entities).toContain(scene.player)
      engine.start()
      callback(0)
      const { x: spawnX, y: spawnY } = demoLevel.playerSpawn
      expect(context.translate).toHaveBeenCalledWith(spawnX + 20, spawnY + 20)
      expect(context.fillText).toHaveBeenCalledWith('FPS: 0', 16, 16)
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
      callback(100)
      expect(context.translate).toHaveBeenCalledWith(spawnX + 60, spawnY + 20)
      expect(context.fillText).toHaveBeenLastCalledWith(
        `Player: ${(spawnX + 40).toFixed(1)}, ${spawnY.toFixed(1)}`,
        16,
        88
      )
      documentTarget.hidden = true
      const target = eventName === 'blur' ? windowTarget : documentTarget
      target.dispatchEvent(new Event(eventName))
      documentTarget.hidden = false
      windowTarget.dispatchEvent(new Event('focus'))
      callback(10000)
      expect(context.fillText).toHaveBeenCalledWith('Delta: 0.000 s', 16, 40)
      callback(10100)
      expect(scene.player.transform.position.x).toBe(spawnX + 40)
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
      callback(10200)
      expect(scene.player.transform.position.x).toBe(spawnX + 80)
      engine.stop()
    }
  )
})
