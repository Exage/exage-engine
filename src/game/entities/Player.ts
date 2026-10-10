import { BoxCollider, Entity, Hitbox, Vector2 } from '@/engine'
import type { CollisionWorld, Input, Renderer } from '@/engine'
import type { Weapon } from '@/game/entities/Weapon'

/** A rectangle controlled by the physical WASD keys. */
export class Player extends Entity {
  controlsEnabled = true
  invulnerable = false
  hiddenFromEnemies = false
  weapon: Weapon | null = null

  get canEquipWeapon(): boolean {
    return this.controlsEnabled
  }
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

  die(): void {
    if (import.meta.env.VITE_ENVIRONMENT === 'development' && this.invulnerable) {
      return
    }
    this.controlsEnabled = false
    this.weapon?.drop()
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
    this.weapon?.renderHeld(renderer, '#d5f2ff')
  }
}
