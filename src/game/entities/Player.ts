import { BoxCollider, Entity, Hitbox, Vector2 } from '@/engine'
import type { CollisionWorld, Input, Renderer } from '@/engine'

/** A rectangle controlled by the physical WASD keys. */
export class Player extends Entity {
  controlsEnabled = true
  readonly width = 40
  readonly height = 40
  override readonly collider: BoxCollider = new BoxCollider(this, this.width, this.height)
  private readonly speed = 400
  private readonly direction = new Vector2()

  constructor(
    private readonly input: Input,
    private readonly collisions?: CollisionWorld
  ) {
    super()
    this.collider.blocksHits = false
    this.hitboxes.push(new Hitbox(this, { id: 'body', width: this.width, height: this.height }))
  }

  override update(dt: number): void {
    if (!this.controlsEnabled) {
      return
    }
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
      if (this.collisions) {
        this.collisions.move(this.collider, this.direction.x, this.direction.y)
      } else {
        this.transform.position.add(this.direction)
      }
    }
  }

  aimAt(x: number, y: number): void {
    if (!this.controlsEnabled) {
      return
    }
    const dx = x - this.transform.position.x - this.width / 2
    const dy = y - this.transform.position.y - this.height / 2
    if (dx !== 0 || dy !== 0) {
      this.transform.rotation = Math.atan2(dy, dx)
    }
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    const angle = this.transform.rotation
    renderer.drawRotatedRect(
      x,
      y,
      this.width,
      this.height,
      angle,
      this.controlsEnabled ? '#66ccff' : '#777f89'
    )
    renderer.drawRotatedRect(
      x + this.width / 2 + Math.cos(angle) * 24 - 14,
      y + this.height / 2 + Math.sin(angle) * 24 - 5,
      28,
      10,
      angle,
      this.controlsEnabled ? '#d5f2ff' : '#a4a9b0'
    )
  }
}
