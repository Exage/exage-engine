import { Entity, Hitbox } from '@/engine'
import type { Renderer } from '@/engine'

/** A stationary target that remains in the world after being hit. */
export class Enemy extends Entity {
  readonly width = 48
  readonly height = 48
  private wasHit = false

  get hit(): boolean {
    return this.wasHit
  }

  set hit(value: boolean) {
    this.wasHit = value
    for (const hitbox of this.hitboxes) {
      hitbox.enabled = !value
    }
  }

  constructor(x: number, y: number) {
    super()
    this.transform.position.set(x, y)
    this.hitboxes.push(
      new Hitbox(this, {
        id: 'body',
        width: this.width,
        height: this.height,
        followRotation: false,
      })
    )
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, this.width, this.height, this.hit ? '#777f89' : '#ef4444')
  }
}
