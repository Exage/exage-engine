import type { Entity } from '@/engine/entities/Entity'
import { boxBounds, boxPenetration } from '@/engine/collision/OrientedBox'
import type { OrientedBox } from '@/engine/collision/OrientedBox'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface SweepContact {
  /** Fraction of the requested displacement, between zero and one. */
  time: number
  normalX: number
  normalY: number
}

export function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/** Sweep an axis-aligned box against a stationary box, including thin obstacles. */
export function sweepAABB(a: Bounds, b: Bounds, dx: number, dy: number): SweepContact | null {
  if (overlaps(a, b)) {
    return { time: 0, normalX: 0, normalY: 0 }
  }
  let entry = -Infinity
  let exit = Infinity
  let normalX = 0
  let normalY = 0
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'width' : 'height'
    const delta = axis === 'x' ? dx : dy
    if (delta === 0) {
      if (a[axis] + a[size] <= b[axis] || a[axis] >= b[axis] + b[size]) {
        return null
      }
      continue
    }
    const first = (b[axis] - a[axis] - a[size]) / delta
    const last = (b[axis] + b[size] - a[axis]) / delta
    const near = Math.min(first, last)
    if (near > entry) {
      entry = near
      normalX = axis === 'x' ? -Math.sign(delta) : 0
      normalY = axis === 'y' ? -Math.sign(delta) : 0
    }
    exit = Math.min(exit, Math.max(first, last))
  }
  if (entry < 0 || entry > 1 || entry >= exit) {
    return null
  }
  return { time: entry, normalX, normalY }
}

/** A fixed-size box with optional rotation around its own center. Scale is ignored. */
export class BoxCollider {
  enabled = true
  isTrigger = false
  followRotation = false
  /** Whether hit queries stop on this collider; independent of movement blocking. */
  blocksHits = true

  constructor(
    readonly entity: Entity,
    readonly width: number,
    readonly height: number,
    readonly offsetX = 0,
    readonly offsetY = 0
  ) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new RangeError('Collider dimensions must be finite and positive')
    }
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
      throw new RangeError('Collider offsets must be finite')
    }
  }

  get shape(): OrientedBox {
    const { x, y } = this.entity.transform.position
    return {
      x: x + this.offsetX,
      y: y + this.offsetY,
      width: this.width,
      height: this.height,
      rotation: this.followRotation ? this.entity.transform.rotation : 0,
    }
  }

  /** Axis-aligned enclosure for world bounds checks, not the exact rotated shape. */
  get bounds(): Bounds {
    return boxBounds(this.shape)
  }

  overlaps(other: BoxCollider): boolean {
    return (
      this !== other &&
      this.enabled &&
      other.enabled &&
      boxPenetration(this.shape, other.shape) !== null
    )
  }
}
