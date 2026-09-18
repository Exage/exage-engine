import { Vector2 } from '@/engine/math/Vector2'

/** A logical viewport whose position is the top-left corner in world coordinates. */
export class Camera2D {
  readonly position = new Vector2()

  constructor(
    private viewportWidth: number,
    private viewportHeight: number
  ) {
    const width = viewportWidth
    const height = viewportHeight
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new RangeError('Camera dimensions must be positive finite numbers')
    }
  }

  get width(): number {
    return this.viewportWidth
  }

  get height(): number {
    return this.viewportHeight
  }

  /** Update logical viewport dimensions without changing world state. */
  resize(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError('Viewport dimensions must be positive integers')
    }
    this.viewportWidth = width
    this.viewportHeight = height
  }

  /** Center on a world point while keeping the viewport within the level. */
  follow(x: number, y: number, worldWidth: number, worldHeight: number): void {
    this.position.set(
      Math.max(0, Math.min(x - this.width / 2, worldWidth - this.width)),
      Math.max(0, Math.min(y - this.height / 2, worldHeight - this.height))
    )
  }
}
