import { Entity, Hitbox } from '@/engine'
import type { HitboxWorld, Renderer } from '@/engine'
import type { Player } from '@/game/entities/Player'
import { Projectile } from '@/game/entities/Projectile'

/** A stationary shooter that remains in the world after being defeated. */
export class Enemy extends Entity {
  readonly width = 48
  readonly height = 48
  private wasHit = false
  private shotCooldown = 1.2

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

  attack(dt: number, player: Player, world: HitboxWorld): Projectile | null {
    if (this.hit) {
      return null
    }
    this.shotCooldown = Math.max(0, this.shotCooldown - dt)
    const x = this.transform.position.x + this.width / 2
    const y = this.transform.position.y + this.height / 2
    const dx = player.transform.position.x + player.width / 2 - x
    const dy = player.transform.position.y + player.height / 2 - y
    this.transform.rotation = Math.atan2(dy, dx)
    if (this.shotCooldown > 0 || Math.hypot(dx, dy) > 900) {
      return null
    }
    const target = world.cast({ x: x - 4, y: y - 4, width: 8, height: 8, rotation: 0 }, dx, dy, {
      ignore: this,
      filter: (entity) => !(entity instanceof Enemy),
    })
    if (target?.kind !== 'hitbox' || target.entity !== player) {
      return null
    }
    this.shotCooldown = 1.2
    return new Projectile(x, y, this.transform.rotation, {
      owner: this,
      speed: 450,
      color: '#ff785a',
    })
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, this.width, this.height, this.hit ? '#777f89' : '#ef4444')
  }
}
