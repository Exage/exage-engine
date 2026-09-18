import { afterEach, describe, expect, it, vi } from 'vitest'
import { Engine } from '@/engine/core/Engine'
import { Scene } from '@/engine/scene/Scene'

afterEach(() => vi.unstubAllGlobals())

function setup() {
  const windowTarget = new EventTarget()
  const documentTarget = new EventTarget()
  vi.stubGlobal('window', windowTarget)
  vi.stubGlobal('document', documentTarget)
  const pending = new Map<number, FrameRequestCallback>()
  let nextId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++
    pending.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))

  const clearRect = vi.fn()
  const canvas = {
    width: 0,
    height: 0,
    style: { setProperty: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getContext: vi.fn(() => ({ clearRect, setTransform: vi.fn() })),
  } as unknown as HTMLCanvasElement
  const engine = new Engine({ canvas, width: 1280, height: 720 })
  function frame(timestamp: number) {
    const [id, callback] = [...pending.entries()][0]!
    pending.delete(id)
    callback(timestamp)
  }

  return { engine, canvas, pending, clearRect, frame, windowTarget, documentTarget }
}

describe('Engine lifecycle', () => {
  it('resizes the buffer and notifies both current and newly selected scenes', () => {
    const { engine, canvas } = setup()
    const scene = new Scene()
    const resize = vi.spyOn(scene, 'resize')
    engine.setScene(scene)
    engine.resize(800, 600)
    expect([canvas.width, canvas.height]).toEqual([800, 600])
    expect(resize).toHaveBeenLastCalledWith(800, 600)
    const next = new Scene()
    const nextResize = vi.spyOn(next, 'resize')
    engine.setScene(next)
    expect(nextResize).toHaveBeenCalledWith(800, 600)
    expect(() => engine.resize(0, 600)).toThrow(RangeError)
    expect([canvas.width, canvas.height]).toEqual([800, 600])
  })

  it('updates the active scene before clearing and rendering, then ends input', () => {
    const { engine, frame, clearRect, windowTarget } = setup()
    const scene = new Scene()
    const calls: string[] = []
    const update = vi.spyOn(scene, 'update').mockImplementation((dt) => {
      calls.push('update')
      expect(dt).toBeCloseTo(0.02)
      expect(engine.time.deltaTime).toBeCloseTo(dt)
      expect(engine.input.wasPressed('KeyD')).toBe(true)
    })
    const render = vi.spyOn(scene, 'render').mockImplementation((renderer) => {
      calls.push('render')
      expect(renderer.width).toBe(1280)
      expect(engine.input.wasPressed('KeyD')).toBe(true)
    })
    engine.start()
    frame(0)
    engine.setScene(scene)
    clearRect.mockImplementation(() => calls.push('clear'))
    windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
    frame(20)
    expect(calls).toEqual(['update', 'clear', 'render'])
    expect(engine.input.wasPressed('KeyD')).toBe(false)
    expect(engine.input.isDown('KeyD')).toBe(true)
    engine.setScene(null)
    frame(40)
    expect(update).toHaveBeenCalledTimes(1)
    expect(render).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['update', 'clear', 'render', 'clear'])
    engine.stop()
  })

  it('uses one scene throughout a frame and preserves the selected scene across restart', () => {
    const { engine, frame } = setup()
    const first = new Scene()
    const second = new Scene()
    vi.spyOn(first, 'update').mockImplementation(() => engine.setScene(second))
    const firstRender = vi.spyOn(first, 'render')
    const secondUpdate = vi.spyOn(second, 'update')
    const secondRender = vi.spyOn(second, 'render')
    engine.setScene(first)
    engine.start()
    frame(0)
    expect(firstRender).toHaveBeenCalledTimes(1)
    expect(secondRender).not.toHaveBeenCalled()
    frame(20)
    expect(secondUpdate).toHaveBeenLastCalledWith(0.02)
    expect(secondRender).toHaveBeenCalledTimes(1)
    engine.stop()
    engine.start()
    frame(10000)
    expect(secondUpdate).toHaveBeenLastCalledWith(0)
    expect(secondRender).toHaveBeenCalledTimes(2)
    engine.stop()
  })

  it.each(['update', 'render'] as const)('cleans up when scene %s fails', (method) => {
    const { engine, frame, pending, windowTarget } = setup()
    const scene = new Scene()
    vi.spyOn(scene, method).mockImplementation(() => {
      throw new Error('Scene failed')
    })
    engine.setScene(scene)
    engine.start()
    windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
    expect(() => frame(0)).toThrow('Scene failed')
    expect(engine.isRunning).toBe(false)
    expect(engine.input.isDown('KeyD')).toBe(false)
    expect(pending.size).toBe(0)
  })

  it.each(['update', 'render'] as const)(
    'does not schedule another frame after stopping in %s',
    (method) => {
      const { engine, frame, pending } = setup()
      const scene = new Scene()
      vi.spyOn(scene, method).mockImplementation(() => engine.stop())
      engine.setScene(scene)
      engine.start()
      frame(0)
      expect(engine.isRunning).toBe(false)
      expect(pending.size).toBe(0)
    }
  )

  it('keeps a single loop when a scene stops and restarts the engine', () => {
    const { engine, frame, pending } = setup()
    const scene = new Scene()
    vi.spyOn(scene, 'update').mockImplementationOnce(() => {
      engine.stop()
      engine.start()
    })
    const render = vi.spyOn(scene, 'render')
    engine.setScene(scene)
    engine.start()
    frame(0)
    expect(pending.size).toBe(1)
    expect(render).not.toHaveBeenCalled()
    frame(20)
    expect(pending.size).toBe(1)
    expect(render).toHaveBeenCalledTimes(1)
    engine.stop()
  })

  it('keeps input transitions through rendering and clears them at frame end', () => {
    const { engine, frame, clearRect, windowTarget } = setup()
    const press = () => {
      windowTarget.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
    }
    press()
    expect(engine.input.isDown('KeyD')).toBe(false)
    engine.start()
    press()
    clearRect.mockImplementation(() => {
      expect(engine.input.wasPressed('KeyD')).toBe(true)
    })
    frame(0)
    expect(engine.input.wasPressed('KeyD')).toBe(false)
    expect(engine.input.isDown('KeyD')).toBe(true)
    engine.stop()
    expect(engine.input.isDown('KeyD')).toBe(false)
    press()
    expect(engine.input.isDown('KeyD')).toBe(false)
    engine.start()
    press()
    frame(10000)
    expect(engine.input.wasPressed('KeyD')).toBe(false)
    engine.stop()
  })

  it('updates time before rendering and resets it on restart', () => {
    const { engine, frame, clearRect } = setup()
    engine.start()
    frame(1000)
    expect(engine.time.deltaTime).toBe(0)
    clearRect.mockImplementation(() => {
      expect(engine.time.deltaTime).toBeCloseTo(0.02)
    })
    frame(1020)
    expect(engine.time.fps).toBeCloseTo(50)
    clearRect.mockReset()
    engine.stop()
    engine.start()
    frame(10000)
    expect(engine.time.deltaTime).toBe(0)
    engine.stop()
  })

  it.each(['blur', 'focus', 'visibilitychange'])('resets time on %s', (eventName) => {
    const { engine, frame, windowTarget, documentTarget } = setup()
    engine.start()
    frame(0)
    frame(20)
    const target = eventName === 'visibilitychange' ? documentTarget : windowTarget
    target.dispatchEvent(new Event(eventName))
    frame(10000)
    expect(engine.time.deltaTime).toBe(0)
    frame(10020)
    expect(engine.time.deltaTime).toBeCloseTo(0.02)
    engine.stop()

    engine.time.update(0)
    engine.time.update(20)
    target.dispatchEvent(new Event(eventName))
    expect(engine.time.deltaTime).toBeCloseTo(0.02)
  })

  it('keeps a single loop across repeated start, stop, and restart calls', () => {
    const { engine, pending, clearRect, canvas } = setup()
    expect(engine.isRunning).toBe(false)
    expect([canvas.width, canvas.height]).toEqual([1280, 720])
    engine.stop()
    engine.start()
    engine.start()
    expect(pending.size).toBe(1)

    const callback = pending.get(0)!
    pending.delete(0)
    callback(0)
    expect(clearRect).toHaveBeenCalledWith(0, 0, 1280, 720)
    expect(pending.size).toBe(1)

    engine.stop()
    engine.stop()
    expect(pending.size).toBe(0)
    expect(engine.isRunning).toBe(false)
    engine.start()
    expect(pending.size).toBe(1)
    expect(engine.isRunning).toBe(true)
    engine.stop()
  })

  it('stops if rendering fails', () => {
    const { engine, pending, clearRect } = setup()
    clearRect.mockImplementation(() => {
      throw new Error('Render failed')
    })
    engine.start()
    window.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
    const callback = pending.get(0)!
    pending.delete(0)
    expect(() => callback(0)).toThrow('Render failed')
    expect(engine.isRunning).toBe(false)
    expect(pending.size).toBe(0)
    expect(engine.input.isDown('KeyD')).toBe(false)
    window.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }))
    expect(engine.input.isDown('KeyD')).toBe(false)
  })

  it('rejects invalid dimensions and unavailable Canvas 2D', () => {
    const { canvas } = setup()
    for (const width of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => new Engine({ canvas, width, height: 720 })).toThrow(RangeError)
    }
    vi.mocked(canvas.getContext).mockReturnValue(null)
    expect(() => new Engine({ canvas, width: 1280, height: 720 })).toThrow(
      'Canvas 2D rendering is not supported'
    )
  })
})
