import type { Entity } from '@/engine'
import type { PatrolArea } from '@/game/entities/EnemyConfig'
import { Wall } from '@/game/entities/Wall'

interface Point {
  x: number
  y: number
}

/** Resolve the local zone independently of sight; a forbidden nearest zone uses wall fallback. */
export function nearestPatrolArea(
  position: Point,
  width: number,
  height: number,
  areas: readonly PatrolArea[]
): PatrolArea | null {
  let nearest: PatrolArea | null = null
  let bestDistance = Infinity
  for (const area of areas) {
    const x = Math.max(area.x, Math.min(position.x, area.x + area.width - width))
    const y = Math.max(area.y, Math.min(position.y, area.y + area.height - height))
    const distance = Math.hypot(x - position.x, y - position.y)
    if (distance < bestDistance) {
      nearest = area
      bestDistance = distance
    }
  }
  return nearest?.allowSearchPatrol === false ? null : nearest
}

/** A navigation destination near a wall, not a physical collider or movement constraint. */
export function nearestWallDestination(
  position: Point,
  width: number,
  height: number,
  entities: readonly Entity[],
  range: number,
  clearance: number,
  accept: (point: Point) => boolean = () => true
): (Point & { facingAngle: number }) | null {
  const center = { x: position.x + width / 2, y: position.y + height / 2 }
  let nearest: (Point & { facingAngle: number }) | null = null
  let bestDistance = Infinity
  for (const entity of entities) {
    if (!(entity instanceof Wall) || !entity.collider.enabled || entity.collider.isTrigger) {
      continue
    }
    const shape = entity.collider.shape
    const wallX = shape.x + shape.width / 2
    const wallY = shape.y + shape.height / 2
    const cos = Math.cos(shape.rotation)
    const sin = Math.sin(shape.rotation)
    const localX = (center.x - wallX) * cos + (center.y - wallY) * sin
    const localY = -(center.x - wallX) * sin + (center.y - wallY) * cos
    let x = Math.max(-shape.width / 2, Math.min(localX, shape.width / 2))
    let y = Math.max(-shape.height / 2, Math.min(localY, shape.height / 2))
    if (x === localX && y === localY) {
      // If investigation ended inside a wall, choose its nearest exit face.
      if (shape.width / 2 - Math.abs(localX) <= shape.height / 2 - Math.abs(localY)) {
        x = ((localX < 0 ? -1 : 1) * shape.width) / 2
      } else {
        y = ((localY < 0 ? -1 : 1) * shape.height) / 2
      }
    }
    const surfaceX = wallX + x * cos - y * sin
    const surfaceY = wallY + x * sin + y * cos
    const dx = center.x - surfaceX
    const dy = center.y - surfaceY
    const distance = Math.hypot(dx, dy)
    if (distance > range || distance >= bestDistance) {
      continue
    }
    const inside = Math.abs(localX) <= shape.width / 2 && Math.abs(localY) <= shape.height / 2
    let angle = Math.atan2(dy, dx)
    if (distance <= 1e-6) {
      angle = Math.atan2(y / (shape.height / 2), x / (shape.width / 2)) + shape.rotation
    } else if (inside) {
      angle += Math.PI
    }
    const gap = Math.hypot(width, height) / 2 + clearance
    const destination = {
      x: surfaceX + Math.cos(angle) * gap - width / 2,
      y: surfaceY + Math.sin(angle) * gap - height / 2,
      facingAngle: Math.atan2(Math.sin(angle), Math.cos(angle)),
    }
    if (!accept(destination)) {
      continue
    }
    nearest = destination
    bestDistance = distance
  }
  return nearest
}
