import type { Entity } from '@/engine/entities/Entity'
import { CollisionWorld } from '@/engine/collision/CollisionWorld'
import { HitboxWorld } from '@/engine/collision/HitboxWorld'
import type { Renderer } from '@/engine/rendering/Renderer'

/** Container that updates and renders entities in insertion order. */
export class Scene {
  readonly entities: Entity[] = []
  readonly collisions = new CollisionWorld(this.entities)
  readonly hitboxes = new HitboxWorld(this.entities)

  add(entity: Entity): void {
    this.entities.push(entity)
  }

  /** Receive logical viewport changes from Engine. */
  resize(width: number, height: number): void {
    void width
    void height
  }

  update(dt: number): void {
    for (const entity of this.entities) {
      entity.update(dt)
    }
  }

  render(renderer: Renderer): void {
    for (const entity of this.entities) {
      entity.render(renderer)
    }
  }
}
