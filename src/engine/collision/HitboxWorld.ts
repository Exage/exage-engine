import { boxPenetration, sweepBox } from '@/engine/collision/OrientedBox'
import { Vector2 } from '@/engine/math/Vector2'
import type { BoxCollider, SweepContact } from '@/engine/collision/BoxCollider'
import type { Hitbox } from '@/engine/collision/Hitbox'
import type { OrientedBox } from '@/engine/collision/OrientedBox'
import type { Entity } from '@/engine/entities/Entity'

export interface HitQueryOptions {
  /** Exclude the attack's owner, including its physical collider. */
  ignore?: Entity
  /** Game-owned eligibility rules, applied to hitboxes and blockers alike. */
  filter?: (entity: Entity) => boolean
}

interface HitContact extends SweepContact {
  entity: Entity
  /** Center of the moving query shape at impact, not a surface contact point. */
  position: Vector2
}

export type HitResult =
  | (HitContact & { kind: 'hitbox'; hitbox: Hitbox })
  | (HitContact & { kind: 'blocker'; collider: BoxCollider })

/** Scene queries for attacks and target regions; damage remains game-owned. */
export class HitboxWorld {
  constructor(private readonly entities: readonly Entity[]) {}

  overlaps(shape: OrientedBox, options: HitQueryOptions = {}): Hitbox[] {
    const hits: Hitbox[] = []
    for (const entity of this.entities) {
      if (entity === options.ignore || (options.filter && !options.filter(entity))) {
        continue
      }
      for (const hitbox of entity.hitboxes) {
        if (hitbox.enabled && boxPenetration(shape, hitbox.shape)) {
          hits.push(hitbox)
        }
      }
    }
    return hits
  }

  /** Sweep a shape and return its nearest hitbox or solid blocker. */
  cast(
    shape: OrientedBox,
    dx: number,
    dy: number,
    options: HitQueryOptions = {}
  ): HitResult | null {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new RangeError('Hit query displacement must be finite')
    }
    let closest: HitResult | null = null
    const positionAt = (time: number): Vector2 =>
      new Vector2(shape.x + shape.width / 2 + dx * time, shape.y + shape.height / 2 + dy * time)

    for (const entity of this.entities) {
      if (entity === options.ignore || (options.filter && !options.filter(entity))) {
        continue
      }
      for (const hitbox of entity.hitboxes) {
        if (!hitbox.enabled) {
          continue
        }
        const contact = sweepBox(shape, hitbox.shape, dx, dy)
        if (contact && (!closest || contact.time < closest.time)) {
          closest = {
            ...contact,
            kind: 'hitbox',
            entity,
            hitbox,
            position: positionAt(contact.time),
          }
        }
      }
      const collider = entity.collider
      if (!collider || !collider.enabled || collider.isTrigger || !collider.blocksHits) {
        continue
      }
      const contact = sweepBox(shape, collider.shape, dx, dy)
      if (
        contact &&
        (!closest ||
          contact.time < closest.time ||
          (contact.time === closest.time && entity !== closest.entity))
      ) {
        closest = {
          ...contact,
          kind: 'blocker',
          entity,
          collider,
          position: positionAt(contact.time),
        }
      }
    }
    return closest
  }
}
