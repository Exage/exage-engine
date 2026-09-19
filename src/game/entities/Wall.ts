import { BoxCollider, Entity } from '@/engine'
import type { Renderer } from '@/engine'

/** A solid wall that blocks movement and projectiles. */
export class Wall extends Entity {
  override zIndex = 10
  override readonly collider: BoxCollider

  constructor(
    x: number,
    y: number,
    readonly width: number,
    readonly height: number
  ) {
    super()
    this.transform.position.set(x, y)
    this.collider = new BoxCollider(this, width, height)
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, this.width, this.height, '#8795a5')
  }
}
