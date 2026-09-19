import { BoxCollider, Entity, HitboxWorld, Vector2 } from '@/engine'
import type { HitQueryOptions, HitResult, Renderer } from '@/engine'

interface ProjectileOptions {
  owner?: Entity
  speed?: number
  color?: string
}

export class Projectile extends Entity {
  readonly owner: Entity | undefined
  readonly previous = new Vector2()
  readonly radius = 4
  override readonly collider: BoxCollider = new BoxCollider(
    this,
    this.radius * 2,
    this.radius * 2,
    -this.radius,
    -this.radius
  )
  private age = 0
  expired = false

  constructor(
    x: number,
    y: number,
    private readonly angle: number,
    private readonly options: ProjectileOptions = {}
  ) {
    super()
    this.owner = options.owner
    this.transform.position.set(x, y)
    this.previous.set(x, y)
  }

  override update(dt: number): void {
    const position = this.transform.position
    this.previous.set(position.x, position.y)
    const speed = this.options.speed ?? 1000
    position.x += Math.cos(this.angle) * speed * dt
    position.y += Math.sin(this.angle) * speed * dt
    this.age += dt
    this.expired = this.age >= 4
  }

  /** Swept collision returns the first contact fraction, avoiding thin-target tunneling. */
  contact(entity: Entity): number | null {
    return this.cast(new HitboxWorld([entity]))?.time ?? null
  }

  cast(world: HitboxWorld, options: HitQueryOptions = {}): HitResult | null {
    if (!this.collider.enabled) {
      return null
    }
    const bounds = {
      ...this.collider.shape,
      x: this.previous.x + this.collider.offsetX,
      y: this.previous.y + this.collider.offsetY,
    }
    return world.cast(
      bounds,
      this.transform.position.x - this.previous.x,
      this.transform.position.y - this.previous.y,
      options
    )
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(
      x - this.radius,
      y - this.radius,
      this.radius * 2,
      this.radius * 2,
      this.options.color ?? '#ffe38a'
    )
  }
}
