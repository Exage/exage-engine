import { Entity, Vector2 } from '@/engine'
import type { Renderer } from '@/engine'
import type { Enemy } from '@/game/entities/Enemy'

export class Projectile extends Entity {
  readonly previous = new Vector2()
  readonly radius = 4
  private age = 0
  expired = false

  constructor(
    x: number,
    y: number,
    private readonly angle: number
  ) {
    super()
    this.transform.position.set(x, y)
    this.previous.set(x, y)
  }

  override update(dt: number): void {
    const position = this.transform.position
    this.previous.set(position.x, position.y)
    position.x += Math.cos(this.angle) * 1000 * dt
    position.y += Math.sin(this.angle) * 1000 * dt
    this.age += dt
    this.expired = this.age >= 4
  }

  /** Swept collision returns the first contact fraction, avoiding thin-target tunneling. */
  contact(enemy: Enemy): number | null {
    let entry = 0
    let exit = 1
    for (const axis of ['x', 'y'] as const) {
      const start = this.previous[axis]
      const delta = this.transform.position[axis] - start
      const min = enemy.transform.position[axis] - this.radius
      const max =
        enemy.transform.position[axis] + (axis === 'x' ? enemy.width : enemy.height) + this.radius
      if (delta === 0) {
        if (start < min || start > max) {
          return null
        }
      } else {
        const a = (min - start) / delta
        const b = (max - start) / delta
        entry = Math.max(entry, Math.min(a, b))
        exit = Math.min(exit, Math.max(a, b))
        if (entry > exit) {
          return null
        }
      }
    }
    return entry
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x - this.radius, y - this.radius, this.radius * 2, this.radius * 2, '#ffe38a')
  }
}
