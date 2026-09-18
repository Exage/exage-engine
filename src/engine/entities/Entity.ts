import { Transform } from '@/engine/entities/Transform'
import type { Renderer } from '@/engine/rendering/Renderer'

/** Base game object with its own transform and optional lifecycle behavior. */
export class Entity {
  transform = new Transform()

  /** Override to update gameplay using delta time in seconds. */
  update(dt: number): void {
    void dt
  }

  /** Override to draw this object through the Renderer API. */
  render(renderer: Renderer): void {
    void renderer
  }
}
