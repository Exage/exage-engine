import { Entity } from '@/engine'
import type { Renderer } from '@/engine'

/** A stationary target that remains in the world after being hit. */
export class Enemy extends Entity {
  readonly width = 48
  readonly height = 48
  hit = false

  constructor(x: number, y: number) {
    super()
    this.transform.position.set(x, y)
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, this.width, this.height, this.hit ? '#777f89' : '#ef4444')
  }
}
