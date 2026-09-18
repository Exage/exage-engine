import { afterEach, describe, expect, it, vi } from 'vitest'
import { Camera2D } from '@/engine/rendering/Camera2D'
import { Renderer } from '@/engine/rendering/Renderer'

afterEach(() => vi.unstubAllGlobals())

function setup(pixelRatio = 1, width = 1280, height = 720) {
  const display = { devicePixelRatio: pixelRatio }
  vi.stubGlobal('window', display)
  const context = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  }
  const canvas = {
    width: 0,
    height: 0,
    style: { setProperty: vi.fn() },
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement
  const renderer = new Renderer(canvas, width, height)
  return { renderer, canvas, context, display }
}

describe('Renderer', () => {
  it('resizes logical dimensions and refreshes density without stretching coordinates', () => {
    const { renderer, canvas, context, display } = setup(2)
    renderer.resize(800, 600)
    expect([renderer.width, renderer.height]).toEqual([800, 600])
    expect([canvas.width, canvas.height]).toEqual([1600, 1200])
    expect(canvas.style.width).toBe('800px')
    expect(canvas.style.aspectRatio).toBe('800 / 600')
    display.devicePixelRatio = 1.25
    renderer.resize(1600, 900)
    renderer.clear()
    expect([canvas.width, canvas.height]).toEqual([2000, 1125])
    expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 1600, 900)
  })

  it('restores the camera transform after rotating a rectangle', () => {
    const { renderer, context } = setup(2)
    renderer.drawRotatedRect(100, 200, 40, 20, Math.PI / 2, '#66ccff')
    expect(context.save).toHaveBeenCalledOnce()
    expect(context.translate).toHaveBeenCalledWith(120, 210)
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(context.fillRect).toHaveBeenCalledWith(-20, -10, 40, 20)
    expect(context.restore).toHaveBeenCalledOnce()
  })

  it.each([1, 1.25, 2])('preserves rounded DPI scaling with camera and UI at %s', (ratio) => {
    const { renderer, canvas, context } = setup(ratio, 101, 51)
    const camera = new Camera2D(101, 51)
    camera.position.set(300, 200)
    const sx = canvas.width / 101
    const sy = canvas.height / 51
    renderer.setCamera(camera)
    expect(context.setTransform).toHaveBeenLastCalledWith(sx, 0, 0, sy, -300 * sx, -200 * sy)
    renderer.setCamera(null)
    expect(context.setTransform).toHaveBeenLastCalledWith(sx, 0, 0, sy, -0, -0)
    renderer.setCamera(camera)
    renderer.clear()
    expect(context.setTransform).toHaveBeenLastCalledWith(sx, 0, 0, sy, 0, 0)
  })

  it.each([1, 1.25, 2])('keeps logical coordinates at pixel ratio %s', (ratio) => {
    const { renderer, canvas, context } = setup(ratio)
    expect([canvas.width, canvas.height]).toEqual([1280 * ratio, 720 * ratio])
    expect(canvas.style.width).toBe('1280px')
    expect(canvas.style.height).toBe('auto')
    expect(canvas.style.aspectRatio).toBe('1280 / 720')
    renderer.clear()
    expect(context.setTransform).toHaveBeenLastCalledWith(ratio, 0, 0, ratio, 0, 0)
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1280, 720)
    renderer.drawRect(640, 360, 50, 30, '#ff0000')
    expect(context.fillRect).toHaveBeenCalledWith(640, 360, 50, 30)
    expect(context.fillStyle).toBe('#ff0000')
  })

  it('adapts to density changes and covers the entire rounded buffer', () => {
    const { renderer, canvas, context, display } = setup(1, 101, 51)
    display.devicePixelRatio = 1.25
    renderer.clear()
    expect([canvas.width, canvas.height]).toEqual([126, 64])
    expect(context.setTransform).toHaveBeenLastCalledWith(126 / 101, 0, 0, 64 / 51, 0, 0)
    expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 101, 51)
    display.devicePixelRatio = 2
    renderer.clear()
    expect([canvas.width, canvas.height]).toEqual([202, 102])
    expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0)
  })

  it('does not resize the buffer when density stays unchanged', () => {
    const { renderer, canvas } = setup(2)
    const widthSetter = vi.fn()
    const heightSetter = vi.fn()
    Object.defineProperty(canvas, 'width', { get: () => 2560, set: widthSetter })
    Object.defineProperty(canvas, 'height', { get: () => 1440, set: heightSetter })
    renderer.clear()
    renderer.clear()
    expect(widthSetter).not.toHaveBeenCalled()
    expect(heightSetter).not.toHaveBeenCalled()
  })

  it('applies text options and restores defaults for subsequent draws', () => {
    const { renderer, context } = setup(2)
    renderer.drawText('FPS: 60', 10, 20, {
      color: '#00ff00',
      fontSize: 24,
      fontFamily: 'sans-serif',
    })
    expect(context.fillText).toHaveBeenLastCalledWith('FPS: 60', 10, 20)
    expect(context.font).toBe('24px sans-serif')
    expect(context.fillStyle).toBe('#00ff00')
    expect(context.textAlign).toBe('left')
    expect(context.textBaseline).toBe('top')
    renderer.drawText('Delta: 0.016', 10, 50)
    expect(context.font).toBe('16px monospace')
    expect(context.fillStyle).toBe('#ffffff')
    renderer.drawRect(0, 0, 10, 10, '#000000')
    renderer.drawRect(10, 10, 10, 10)
    expect(context.fillStyle).toBe('#ffffff')
  })
})
