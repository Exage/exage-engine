import { Time } from '@/engine/core/Time'
import { Input } from '@/engine/input/Input'
import { Renderer } from '@/engine/rendering/Renderer'

export interface EngineOptions {
  canvas: HTMLCanvasElement
  /** Logical width in pixels. */
  width: number
  /** Logical height in pixels. */
  height: number
}

export class Engine {
  readonly time = new Time()
  readonly input = new Input()
  private readonly renderer: Renderer
  private frameId: number | null = null

  constructor({ canvas, width, height }: EngineOptions) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError('Engine dimensions must be positive integers')
    }

    this.renderer = new Renderer(canvas, width, height)
  }

  get isRunning(): boolean {
    return this.frameId !== null
  }

  start(): void {
    if (this.isRunning) {
      return
    }

    this.time.reset()
    this.input.start()
    window.addEventListener('blur', this.resetTime)
    window.addEventListener('focus', this.resetTime)
    document.addEventListener('visibilitychange', this.resetTime)
    this.frameId = requestAnimationFrame(this.frame)
    console.log('[Exage Engine] Started')
  }

  stop(): void {
    if (this.frameId === null) {
      return
    }

    cancelAnimationFrame(this.frameId)
    this.frameId = null
    this.input.stop()
    window.removeEventListener('blur', this.resetTime)
    window.removeEventListener('focus', this.resetTime)
    document.removeEventListener('visibilitychange', this.resetTime)
    this.time.reset()
  }

  private readonly resetTime = (): void => {
    this.time.reset()
  }

  private readonly frame = (timestamp: number): void => {
    if (!this.isRunning) {
      return
    }

    try {
      this.time.update(timestamp)
      this.renderer.clear()
      this.input.endFrame()
      this.frameId = requestAnimationFrame(this.frame)
    } catch (error) {
      this.stop()
      throw error
    }
  }
}
