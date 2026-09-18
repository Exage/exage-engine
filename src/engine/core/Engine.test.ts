import { afterEach, describe, expect, it, vi } from 'vitest'
import { Engine } from './Engine'

afterEach(() => vi.unstubAllGlobals())

function setup() {
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
    getContext: vi.fn(() => ({ clearRect })),
  } as unknown as HTMLCanvasElement
  const engine = new Engine({ canvas, width: 1280, height: 720 })
  return { engine, canvas, pending, clearRect }
}

describe('Engine lifecycle', () => {
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
    const callback = pending.get(0)!
    pending.delete(0)
    expect(() => callback(0)).toThrow('Render failed')
    expect(engine.isRunning).toBe(false)
    expect(pending.size).toBe(0)
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
