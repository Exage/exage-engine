import { Vector2 } from '@/engine/math/Vector2'

/** Position, rotation, and scale of a game object. */
export class Transform {
  /** Position in logical pixels. */
  position = new Vector2()

  /** Rotation in radians. */
  rotation = 0

  /** Unitless scale; (1, 1) represents the original size. */
  scale = new Vector2(1, 1)
}
