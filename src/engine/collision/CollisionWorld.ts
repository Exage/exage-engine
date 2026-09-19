import { BoxCollider } from '@/engine/collision/BoxCollider'
import { boxPenetration, sweepBox } from '@/engine/collision/OrientedBox'
import type { SweepContact } from '@/engine/collision/BoxCollider'
import type { Entity } from '@/engine/entities/Entity'

export interface CollisionHit extends SweepContact {
  collider: BoxCollider
}

/** Queries the scene's live entities; movement treats other colliders as stationary. */
export class CollisionWorld {
  constructor(private readonly entities: readonly Entity[]) {}

  overlaps(collider: BoxCollider): BoxCollider[] {
    return this.entities.flatMap((entity) => {
      const other = entity.collider
      return other && collider.overlaps(other) ? [other] : []
    })
  }

  /** Return the nearest solid contact along a displacement. Triggers never block. */
  cast(collider: BoxCollider, dx: number, dy: number): CollisionHit | null {
    let closest: CollisionHit | null = null
    if (!collider.enabled || collider.isTrigger) {
      return null
    }
    for (const entity of this.entities) {
      const other = entity.collider
      if (!other || other === collider || !other.enabled || other.isTrigger) {
        continue
      }
      const contact = sweepBox(collider.shape, other.shape, dx, dy)
      if (contact && (!closest || contact.time < closest.time)) {
        closest = { ...contact, collider: other }
      }
    }
    return closest
  }

  /** Move to contact, then slide. Direct Transform edits bypass collision handling. */
  move(collider: BoxCollider, dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new RangeError('Movement must be finite')
    }
    const position = collider.entity.transform.position
    if (!collider.enabled || collider.isTrigger) {
      position.x += dx
      position.y += dy
      return
    }

    // Recover simple spawn/teleport overlaps using the shortest separating translation.
    for (let attempt = 0; attempt < 8; attempt++) {
      const obstacle = this.overlaps(collider).find((other) => !other.isTrigger)
      if (!obstacle) {
        break
      }
      const translation = boxPenetration(collider.shape, obstacle.shape)!
      position.x += translation.x
      position.y += translation.y
    }

    for (let attempt = 0; attempt < 4 && (dx !== 0 || dy !== 0); attempt++) {
      const hit = this.cast(collider, dx, dy)
      if (!hit) {
        position.x += dx
        position.y += dy
        break
      }
      position.x += dx * hit.time
      position.y += dy * hit.time
      dx *= 1 - hit.time
      dy *= 1 - hit.time
      const inward = Math.min(0, dx * hit.normalX + dy * hit.normalY)
      dx -= inward * hit.normalX
      dy -= inward * hit.normalY
      if (hit.normalX === 0 && hit.normalY === 0) {
        break
      }
    }
  }
}
