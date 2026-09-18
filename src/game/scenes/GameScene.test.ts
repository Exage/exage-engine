import { afterEach, describe, expect, it, vi } from 'vitest'
import { Engine, Entity, Input, Time } from '@/engine'
import type { Renderer } from '@/engine'
import { GameScene } from '@/game/scenes/GameScene'

afterEach(() => vi.unstubAllGlobals())

describe('GameScene integration', () => {
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
      'Entities: 41',
      'Player: 620.0, 340.0',
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
      ['Entities: 42', 16, 64],
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
      expect(context.translate).toHaveBeenCalledWith(640, 360)
      expect(context.fillText).toHaveBeenCalledWith('FPS: 0', 16, 16)
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
      callback(100)
      expect(context.translate).toHaveBeenCalledWith(680, 360)
      expect(context.fillText).toHaveBeenLastCalledWith('Player: 660.0, 340.0', 16, 88)
      documentTarget.hidden = true
      const target = eventName === 'blur' ? windowTarget : documentTarget
      target.dispatchEvent(new Event(eventName))
      documentTarget.hidden = false
      windowTarget.dispatchEvent(new Event('focus'))
      callback(10000)
      expect(context.fillText).toHaveBeenCalledWith('Delta: 0.000 s', 16, 40)
      callback(10100)
      expect(scene.player.transform.position.x).toBe(660)
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
      callback(10200)
      expect(scene.player.transform.position.x).toBe(700)
      engine.stop()
    }
  )
})
