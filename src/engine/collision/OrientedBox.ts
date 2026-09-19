import type { Bounds, SweepContact } from '@/engine/collision/BoxCollider'

/** Position is the unrotated top-left corner; rotation is around the box center. */
export interface OrientedBox extends Bounds {
  rotation: number
}

const EPSILON = 1e-8

export function boxBounds(shape: OrientedBox): Bounds {
  const { x, y, width, height, rotation } = shape
  const cos = Math.abs(Math.cos(rotation))
  const sin = Math.abs(Math.sin(rotation))
  const enclosingWidth = width * cos + height * sin
  const enclosingHeight = width * sin + height * cos
  return {
    x: x + (width - enclosingWidth) / 2,
    y: y + (height - enclosingHeight) / 2,
    width: enclosingWidth,
    height: enclosingHeight,
  }
}

function axes(box: OrientedBox): { x: number; y: number }[] {
  const cos = Math.cos(box.rotation)
  const sin = Math.sin(box.rotation)
  return [
    { x: cos, y: sin },
    { x: -sin, y: cos },
  ]
}

function projection(box: OrientedBox, axis: { x: number; y: number }): number {
  const [horizontal, vertical] = axes(box)
  return (
    (Math.abs(horizontal!.x * axis.x + horizontal!.y * axis.y) * box.width) / 2 +
    (Math.abs(vertical!.x * axis.x + vertical!.y * axis.y) * box.height) / 2
  )
}

/** Minimum translation separating a from b, or null when they do not overlap. */
export function boxPenetration(a: OrientedBox, b: OrientedBox): { x: number; y: number } | null {
  const dx = a.x + a.width / 2 - b.x - b.width / 2
  const dy = a.y + a.height / 2 - b.y - b.height / 2
  let depth = Infinity
  let translation = { x: 0, y: 0 }
  for (const axis of [...axes(a), ...axes(b)]) {
    const distance = dx * axis.x + dy * axis.y
    const overlap = projection(a, axis) + projection(b, axis) - Math.abs(distance)
    if (overlap <= EPSILON) {
      return null
    }
    if (overlap < depth) {
      depth = overlap
      const sign = distance <= 0 ? -1 : 1
      translation = { x: axis.x * overlap * sign, y: axis.y * overlap * sign }
    }
  }
  return translation
}

/** Continuous SAT for translation with both orientations held fixed during the sweep. */
export function sweepBox(
  a: OrientedBox,
  b: OrientedBox,
  dx: number,
  dy: number
): SweepContact | null {
  if (boxPenetration(a, b)) {
    return { time: 0, normalX: 0, normalY: 0 }
  }
  const centerX = a.x + a.width / 2 - b.x - b.width / 2
  const centerY = a.y + a.height / 2 - b.y - b.height / 2
  let entry = -Infinity
  let exit = Infinity
  let normalX = 0
  let normalY = 0
  for (const axis of [...axes(a), ...axes(b)]) {
    const distance = centerX * axis.x + centerY * axis.y
    const radius = projection(a, axis) + projection(b, axis)
    const velocity = dx * axis.x + dy * axis.y
    if (Math.abs(velocity) <= EPSILON) {
      if (Math.abs(distance) >= radius - EPSILON) {
        return null
      }
      continue
    }
    const first = (-radius - distance) / velocity
    const last = (radius - distance) / velocity
    const near = Math.min(first, last)
    if (near > entry) {
      entry = near
      normalX = -Math.sign(velocity) * axis.x
      normalY = -Math.sign(velocity) * axis.y
    }
    exit = Math.min(exit, Math.max(first, last))
  }
  if (entry < -EPSILON || entry > 1 || exit <= Math.max(0, entry)) {
    return null
  }
  return { time: Math.max(0, entry), normalX, normalY }
}
