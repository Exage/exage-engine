import { Entity, Vector2 } from '@/engine'
import type { Input, Renderer } from '@/engine'

/** A rectangle controlled by the physical WASD keys. */
export class Player extends Entity {
  readonly width = 40
  readonly height = 40
  private readonly speed = 400
  private readonly direction = new Vector2()

  constructor(private readonly input: Input) {
    super()
  }

  override update(dt: number): void {
    this.direction.set(0, 0)

    if (this.input.isDown('KeyW')) {
      this.direction.y -= 1
    }
    if (this.input.isDown('KeyS')) {
      this.direction.y += 1
    }
    if (this.input.isDown('KeyA')) {
      this.direction.x -= 1
    }
    if (this.input.isDown('KeyD')) {
      this.direction.x += 1
    }

    if (this.direction.length() > 0) {
      this.direction.normalize().multiply(this.speed * dt)
      this.transform.position.add(this.direction)
    }
  }

  aimAt(x: number, y: number): void {
    const dx = x - this.transform.position.x - this.width / 2
    const dy = y - this.transform.position.y - this.height / 2
    if (dx !== 0 || dy !== 0) {
      this.transform.rotation = Math.atan2(dy, dx)
    }
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    const angle = this.transform.rotation
    renderer.drawRotatedRect(x, y, this.width, this.height, angle, '#66ccff')
    renderer.drawRotatedRect(
      x + this.width / 2 + Math.cos(angle) * 24 - 14,
      y + this.height / 2 + Math.sin(angle) * 24 - 5,
      28,
      10,
      angle,
      '#d5f2ff'
    )
  }
}
