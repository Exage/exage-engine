import { BoxCollider } from '@/engine/collision/BoxCollider'
import { boxBounds } from '@/engine/collision/OrientedBox'
import type { Bounds } from '@/engine/collision/BoxCollider'
import type { OrientedBox } from '@/engine/collision/OrientedBox'
import type { Entity } from '@/engine/entities/Entity'

export interface HitboxOptions {
  id: string
  width: number
  height: number
  offsetX?: number
  offsetY?: number
  followRotation?: boolean
  /** Local rotation pivot; defaults to this hitbox's center. */
  pivotX?: number
  pivotY?: number
}

/** A query-only target region. Hitboxes never participate in physical movement. */
export class Hitbox {
  readonly id: string
  enabled = true
  followRotation: boolean
  private readonly geometry: BoxCollider
  private readonly pivotX: number
  private readonly pivotY: number

  constructor(
    readonly entity: Entity,
    options: HitboxOptions
  ) {
    if (options.id.trim().length === 0) {
      throw new RangeError('Hitbox id must not be empty')
    }
    this.id = options.id
    this.followRotation = options.followRotation ?? true
    this.geometry = new BoxCollider(
      entity,
      options.width,
      options.height,
      options.offsetX,
      options.offsetY
    )
    this.pivotX = options.pivotX ?? this.geometry.offsetX + options.width / 2
    this.pivotY = options.pivotY ?? this.geometry.offsetY + options.height / 2
    if (!Number.isFinite(this.pivotX) || !Number.isFinite(this.pivotY)) {
      throw new RangeError('Hitbox pivot must be finite')
    }
  }

  get shape(): OrientedBox {
    const shape = this.geometry.shape
    if (!this.followRotation) {
      return shape
    }
    const rotation = this.entity.transform.rotation
    const dx = this.geometry.offsetX + shape.width / 2 - this.pivotX
    const dy = this.geometry.offsetY + shape.height / 2 - this.pivotY
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    return {
      ...shape,
      x: this.entity.transform.position.x + this.pivotX + dx * cos - dy * sin - shape.width / 2,
      y: this.entity.transform.position.y + this.pivotY + dx * sin + dy * cos - shape.height / 2,
      rotation,
    }
  }

  get bounds(): Bounds {
    return boxBounds(this.shape)
  }
}
