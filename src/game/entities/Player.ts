import { Entity, Vector2 } from '@/engine'
import type { Input, Renderer } from '@/engine'

/** A rectangle controlled by the physical WASD keys. */
export class Player extends Entity {
  readonly width = 40
  readonly height = 40
  private readonly speed = 200
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

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, this.width, this.height, '#66ccff')
  }
}
