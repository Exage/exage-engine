import type { Entity } from '@/engine/entities/Entity'
import type { Renderer } from '@/engine/rendering/Renderer'

/** Container that updates and renders entities in insertion order. */
export class Scene {
  readonly entities: Entity[] = []

  add(entity: Entity): void {
    this.entities.push(entity)
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
