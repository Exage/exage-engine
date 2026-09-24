import { BoxCollider, Entity, Hitbox } from '@/engine'
import type { CollisionWorld, HitboxWorld, Renderer } from '@/engine'
import { resolveEnemyConfig } from '@/game/entities/EnemyConfig'
import type { EnemyConfig, EnemyOptions } from '@/game/entities/EnemyConfig'
import type { Player } from '@/game/entities/Player'
import { Projectile } from '@/game/entities/Projectile'

/** A shooter that approaches visible targets and remains after defeat. */
export class Enemy extends Entity {
  readonly config: EnemyConfig
  private wasHit = false
  private shotCooldown: number
  private seesPlayer = false
  // Used only for movement queries so enemies remain passable to other characters.
  private readonly movementCollider: BoxCollider

  get width(): number {
    return this.config.width
  }

  get height(): number {
    return this.config.height
  }

  get playerVisible(): boolean {
    return this.seesPlayer
  }

  get hit(): boolean {
    return this.wasHit
  }

  set hit(value: boolean) {
    this.wasHit = value
    if (value) {
      this.seesPlayer = false
    }
    for (const hitbox of this.hitboxes) {
      hitbox.enabled = !value
    }
  }

  constructor(x: number, y: number, options: EnemyOptions = {}) {
    super()
    this.config = resolveEnemyConfig(options)
    this.movementCollider = new BoxCollider(this, this.width, this.height)
    this.shotCooldown = this.config.weapon.initialDelay
    this.transform.position.set(x, y)
    this.transform.rotation = this.config.facingAngle
    this.hitboxes.push(
      new Hitbox(this, {
        id: 'body',
        ...this.config.hitbox,
        followRotation: false,
      })
    )
  }

  /** Test the player's center against the current cone and attack-blocking obstacles. */
  canSee(player: Player, world: HitboxWorld): boolean {
    const { range, angleDegrees } = this.config.vision
    if (this.hit || range === 0 || angleDegrees === 0) {
      return false
    }
    const x = this.transform.position.x + this.width / 2
    const y = this.transform.position.y + this.height / 2
    const dx = player.transform.position.x + player.width / 2 - x
    const dy = player.transform.position.y + player.height / 2 - y
    const distance = Math.hypot(dx, dy)
    if (distance > range) {
      return false
    }
    const difference = Math.atan2(dy, dx) - this.transform.rotation
    const angle = Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference)))
    if (distance > 0 && angle > (angleDegrees * Math.PI) / 360 + 1e-10) {
      return false
    }
    const target = world.cast({ x, y, width: 0, height: 0, rotation: 0 }, dx, dy, {
      ignore: this,
      filter: (entity) => !(entity instanceof Enemy),
    })
    return target?.kind === 'hitbox' && target.entity === player
  }

  attack(
    dt: number,
    player: Player,
    world: HitboxWorld,
    collisions?: CollisionWorld
  ): Projectile | null {
    this.seesPlayer = this.canSee(player, world)
    if (this.hit) {
      return null
    }
    this.shotCooldown = Math.max(0, this.shotCooldown - dt)
    if (!this.seesPlayer) {
      return null
    }
    this.approach(dt, player, collisions)
    this.seesPlayer = this.canSee(player, world)
    if (!this.seesPlayer) {
      return null
    }
    const x = this.transform.position.x + this.width / 2
    const y = this.transform.position.y + this.height / 2
    const dx = player.transform.position.x + player.width / 2 - x
    const dy = player.transform.position.y + player.height / 2 - y
    if (dx !== 0 || dy !== 0) {
      this.transform.rotation = Math.atan2(dy, dx)
    }
    if (this.shotCooldown > 0) {
      return null
    }
    // Sight is a ray; firing additionally requires clearance for the whole projectile.
    const target = world.cast({ x: x - 4, y: y - 4, width: 8, height: 8, rotation: 0 }, dx, dy, {
      ignore: this,
      filter: (entity) => !(entity instanceof Enemy),
    })
    if (target?.kind !== 'hitbox' || target.entity !== player) {
      return null
    }
    this.shotCooldown = this.config.weapon.shotInterval
    return new Projectile(x, y, this.transform.rotation, {
      owner: this,
      speed: this.config.weapon.projectileSpeed,
      color: '#ff785a',
    })
  }

  private approach(dt: number, player: Player, collisions?: CollisionWorld): void {
    const position = this.transform.position
    const dx = player.transform.position.x + player.width / 2 - position.x - this.width / 2
    const dy = player.transform.position.y + player.height / 2 - position.y - this.height / 2
    const distance = Math.hypot(dx, dy)
    const { speed, stopDistance } = this.config.movement
    if (distance <= stopDistance || speed === 0 || dt <= 0) {
      return
    }
    const step = Math.min(speed * dt, distance - stopDistance)
    if (collisions) {
      collisions.move(this.movementCollider, (dx / distance) * step, (dy / distance) * step)
    } else {
      position.x += (dx / distance) * step
      position.y += (dy / distance) * step
    }
  }

  renderVision(renderer: Renderer): void {
    const { range, angleDegrees } = this.config.vision
    if (this.hit || range === 0 || angleDegrees === 0) {
      return
    }
    renderer.drawSector(
      this.transform.position.x + this.width / 2,
      this.transform.position.y + this.height / 2,
      range,
      this.transform.rotation,
      (angleDegrees * Math.PI) / 180,
      this.seesPlayer ? 'rgba(255, 120, 90, 0.16)' : 'rgba(250, 204, 21, 0.10)',
      this.seesPlayer ? '#ff785a' : '#facc15'
    )
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
      this.hit ? '#777f89' : this.seesPlayer ? '#ff785a' : '#ef4444'
    )
    const barrelLength = this.width * 0.6
    const barrelWidth = this.height * 0.2
    renderer.drawRotatedRect(
      x + this.width / 2 + Math.cos(angle) * (this.width / 2) - barrelLength / 2,
      y + this.height / 2 + Math.sin(angle) * (this.width / 2) - barrelWidth / 2,
      barrelLength,
      barrelWidth,
      angle,
      this.hit ? '#a4a9b0' : this.seesPlayer ? '#fff0bd' : '#ffc9b9'
    )
  }
}
