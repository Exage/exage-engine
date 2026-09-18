import { afterEach, describe, expect, it, vi } from 'vitest'
import { Engine, Entity, Input, Time } from '@/engine'
import type { Renderer } from '@/engine'
import { GameScene } from '@/game/scenes/GameScene'

afterEach(() => vi.unstubAllGlobals())

describe('GameScene integration', () => {
  it('renders live diagnostics after entities without changing timing or position', () => {
    const time = new Time()
    const scene = new GameScene(new Input(), time, 1280, 720)
    const calls: string[] = []
    const drawText = vi.fn((text: string) => calls.push(text))
    const renderer = {
      drawRect: vi.fn(() => calls.push('rectangle')),
      drawText,
    } as unknown as Renderer
    scene.render(renderer)
    expect(calls).toEqual([
      'rectangle',
      'rectangle',
      'FPS: 0',
      'Delta: 0.000 s',
      'Entities: 1',
      'Player: 620.0, 340.0',
    ])
    time.update(0)
    time.update(20)
    scene.player.transform.position.set(123.456, -7.89)
    scene.add(new Entity())
    drawText.mockClear()
    scene.render(renderer)
    expect(drawText.mock.calls).toEqual([
      ['FPS: 50', 16, 16],
      ['Delta: 0.020 s', 16, 40],
      ['Entities: 2', 16, 64],
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
        fillText: vi.fn(),
      }
      const canvas = {
        width: 0,
        height: 0,
        style: { setProperty: vi.fn() },
        getContext: () => context,
      } as unknown as HTMLCanvasElement
      const engine = new Engine({ canvas, width: 1280, height: 720 })
      const scene = new GameScene(engine.input, engine.time, 1280, 720)
      engine.setScene(scene)
      expect(scene.entities).toEqual([scene.player])
      engine.start()
      callback(0)
      expect(context.fillRect).toHaveBeenNthCalledWith(1, 620, 340, 40, 40)
      expect(context.fillText).toHaveBeenCalledWith('FPS: 0', 16, 16)
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
      callback(100)
      expect(context.fillRect).toHaveBeenNthCalledWith(3, 640, 340, 40, 40)
      expect(context.fillText).toHaveBeenLastCalledWith('Player: 640.0, 340.0', 16, 88)
      documentTarget.hidden = true
      const target = eventName === 'blur' ? windowTarget : documentTarget
      target.dispatchEvent(new Event(eventName))
      documentTarget.hidden = false
      windowTarget.dispatchEvent(new Event('focus'))
      callback(10000)
      expect(context.fillText).toHaveBeenCalledWith('Delta: 0.000 s', 16, 40)
      callback(10100)
      expect(scene.player.transform.position.x).toBe(640)
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
      callback(10200)
      expect(scene.player.transform.position.x).toBe(660)
      engine.stop()
    }
  )
})
