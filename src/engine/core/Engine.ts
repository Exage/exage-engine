import { Time } from '@/engine/core/Time'
import { Input } from '@/engine/input/Input'
import { Renderer } from '@/engine/rendering/Renderer'
import type { Scene } from '@/engine/scene/Scene'

export interface EngineOptions {
  canvas: HTMLCanvasElement
  /** Logical width in pixels. */
  width: number
  /** Logical height in pixels. */
  height: number
}

export class Engine {
  readonly time = new Time()
  readonly input: Input
  private readonly renderer: Renderer
  private scene: Scene | null = null
  private frameId: number | null = null

  constructor({ canvas, width, height }: EngineOptions) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError('Engine dimensions must be positive integers')
    }

    this.renderer = new Renderer(canvas, width, height)
    this.input = new Input(canvas)
  }

  get isRunning(): boolean {
    return this.frameId !== null
  }

  /** Select the scene for subsequent frames, or null to clear it. */
  setScene(scene: Scene | null): void {
    this.scene = scene
    scene?.resize(this.renderer.width, this.renderer.height)
  }

  /** Resize the drawing surface and notify the current scene. */
  resize(width: number, height: number): void {
    this.renderer.resize(width, height)
    this.scene?.resize(width, height)
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
      const frameId = this.frameId
      const scene = this.scene
      this.time.update(timestamp)
      scene?.update(this.time.deltaTime)

      if (this.frameId !== frameId) {
        return
      }

      this.renderer.clear()
      scene?.render(this.renderer)

      if (this.frameId !== frameId) {
        return
      }

      this.input.endFrame()
      this.frameId = requestAnimationFrame(this.frame)
    } catch (error) {
      this.stop()
      throw error
    }
  }
}
