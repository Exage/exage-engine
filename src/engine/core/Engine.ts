import { Renderer } from '../rendering/Renderer'

export interface EngineOptions {
  canvas: HTMLCanvasElement
  /** Logical width in pixels. */
  width: number
  /** Logical height in pixels. */
  height: number
}

export class Engine {
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

    this.frameId = requestAnimationFrame(this.frame)
    console.log('[Exage Engine] Started')
  }

  stop(): void {
    if (this.frameId === null) {
      return
    }

    cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  private readonly frame = (): void => {
    if (!this.isRunning) {
      return
    }

    try {
      this.renderer.clear()
      this.frameId = requestAnimationFrame(this.frame)
    } catch (error) {
      this.stop()
      throw error
    }
  }
}
