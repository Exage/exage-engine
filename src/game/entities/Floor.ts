import { Entity } from '@/engine'
import type { Renderer } from '@/engine'

/** A floor surface that renders beneath actors without blocking movement or projectiles. */
export class Floor extends Entity {
  override zIndex = -10

  constructor(
    x: number,
    y: number,
    readonly width: number,
    readonly height: number,
    readonly color = '#263442'
  ) {
    super()
    this.transform.position.set(x, y)
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, this.width, this.height, this.color)
  }
}
