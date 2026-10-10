import { sweepAABB } from '@/engine'
import type { Bounds, Entity } from '@/engine'
import type { PatrolArea } from '@/game/entities/EnemyConfig'
import { Wall } from '@/game/entities/Wall'

export interface NavigationPoint {
  x: number
  y: number
}

const EPSILON = 1e-6
const CLEARANCE = 0.01

/** Visibility-graph navigation for static walls, independent of character collision. */
export class EnemyNavigation {
  private walls: Bounds[] = []
  private corners: NavigationPoint[] = []
  private signature = ''
  private target: NavigationPoint | null = null
  private path: NavigationPoint[] = []
  private pathStart: NavigationPoint | null = null
  private pathBlocked = false
  readonly radius: number

  constructor(
    private readonly width: number,
    private readonly height: number,
    readonly room: PatrolArea | null
  ) {
    // This envelope contains the whole visual body at every facing angle.
    this.radius = Math.hypot(width, height) / 2
  }

  /** Refresh only when wall geometry or movement eligibility changes. */
  update(entities: readonly Entity[]): boolean {
    const walls = entities.flatMap((entity) => {
      if (!(entity instanceof Wall) || !entity.collider.enabled || entity.collider.isTrigger) {
        return []
      }
      // Rotated walls use their conservative world-space enclosure.
      const bounds = entity.collider.bounds
      const room = this.room
      if (
        room &&
        (bounds.x + bounds.width < room.x - this.radius ||
          bounds.y + bounds.height < room.y - this.radius ||
          bounds.x > room.x + room.width + this.radius ||
          bounds.y > room.y + room.height + this.radius)
      ) {
        return []
      }
      return [bounds]
    })
    const signature = JSON.stringify(walls)
    if (signature === this.signature) {
      return false
    }
    this.signature = signature
    this.walls = walls
    this.corners = walls
      .flatMap((wall) => {
        const left = wall.x - this.radius - CLEARANCE - this.width / 2
        const right = wall.x + wall.width + this.radius + CLEARANCE - this.width / 2
        const top = wall.y - this.radius - CLEARANCE - this.height / 2
        const bottom = wall.y + wall.height + this.radius + CLEARANCE - this.height / 2
        return [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ].map((point) => this.constrain(point))
      })
      .filter((point) => this.isFree(point))
    this.target = null
    return true
  }

  constrain(point: NavigationPoint, area = this.room, clearance = 0): NavigationPoint {
    if (!area) {
      return { ...point }
    }
    const marginX = this.radius - this.width / 2 + clearance
    const marginY = this.radius - this.height / 2 + clearance
    return {
      x: Math.max(area.x + marginX, Math.min(point.x, area.x + area.width - this.width - marginX)),
      y: Math.max(
        area.y + marginY,
        Math.min(point.y, area.y + area.height - this.height - marginY)
      ),
    }
  }

  isFree(point: NavigationPoint): boolean {
    const constrained = this.constrain(point)
    if (Math.hypot(point.x - constrained.x, point.y - constrained.y) > EPSILON) {
      return false
    }
    return this.clear(point, point)
  }

  /** Move along one heading and stop before the first wall or room edge. */
  walkStraight(position: NavigationPoint, angle: number, distance: number): boolean {
    if (distance <= 0 || !this.isFree(position)) {
      return false
    }
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance
    let fraction = 1
    const end = this.constrain({ x: position.x + dx, y: position.y + dy })
    if (Math.abs(dx) > EPSILON) {
      fraction = Math.min(fraction, (end.x - position.x) / dx)
    }
    if (Math.abs(dy) > EPSILON) {
      fraction = Math.min(fraction, (end.y - position.y) / dy)
    }
    const shape = {
      x: position.x + this.width / 2 - this.radius,
      y: position.y + this.height / 2 - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    }
    for (const wall of this.walls) {
      const contact = sweepAABB(shape, wall, dx, dy)
      if (contact) {
        fraction = Math.min(fraction, Math.max(0, contact.time - CLEARANCE / distance))
      }
    }
    position.x += dx * fraction
    position.y += dy * fraction
    return fraction < 1 - EPSILON
  }

  /** A sweep of the full envelope also prevents tunneling through thin walls. */
  private clear(from: NavigationPoint, to: NavigationPoint): boolean {
    const shape = {
      x: from.x + this.width / 2 - this.radius,
      y: from.y + this.height / 2 - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    }
    return this.walls.every((wall) => !sweepAABB(shape, wall, to.x - from.x, to.y - from.y))
  }

  /** Null means unreachable; an empty route means the constrained target is reached. */
  plan(from: NavigationPoint, destination: NavigationPoint): NavigationPoint[] | null {
    const to = this.constrain(destination)
    if (!this.isFree(from) || !this.isFree(to)) {
      return null
    }
    if (Math.hypot(to.x - from.x, to.y - from.y) <= EPSILON) {
      return []
    }
    if (this.clear(from, to)) {
      return [to]
    }
    const nodes = [from, to, ...this.corners]
    const distances = nodes.map(() => Infinity)
    const parents = nodes.map(() => -1)
    const visited = new Set<number>()
    distances[0] = 0
    // Dijkstra finds the shortest visible route around the expanded wall corners.
    while (visited.size < nodes.length) {
      let current = -1
      let closest = Infinity
      for (let index = 0; index < nodes.length; index++) {
        if (!visited.has(index) && distances[index]! < closest) {
          current = index
          closest = distances[index]!
        }
      }
      if (current < 0) {
        return null
      }
      if (current === 1) {
        const path: NavigationPoint[] = []
        for (let index = 1; index !== 0; index = parents[index]!) {
          path.unshift({ ...nodes[index]! })
        }
        return path
      }
      visited.add(current)
      for (let index = 1; index < nodes.length; index++) {
        if (visited.has(index) || !this.clear(nodes[current]!, nodes[index]!)) {
          continue
        }
        const distance =
          closest +
          Math.hypot(nodes[index]!.x - nodes[current]!.x, nodes[index]!.y - nodes[current]!.y)
        if (distance < distances[index]!) {
          distances[index] = distance
          parents[index] = current
        }
      }
    }
    return null
  }

  travel(
    position: NavigationPoint,
    destination: NavigationPoint,
    budget: number
  ): {
    reached: boolean
    blocked: boolean
    used: number
    heading: number | null
  } {
    const to = this.constrain(destination)
    const changed = !this.target || Math.hypot(to.x - this.target.x, to.y - this.target.y) > EPSILON
    const displaced =
      !this.pathStart ||
      Math.hypot(position.x - this.pathStart.x, position.y - this.pathStart.y) > EPSILON
    if (changed || displaced) {
      this.target = to
      const path = this.plan(position, to)
      this.path = path ?? []
      this.pathBlocked = path === null
      this.pathStart = { ...position }
    }
    if (this.pathBlocked) {
      return { reached: false, blocked: true, used: 0, heading: null }
    }
    let remaining = Math.max(0, budget)
    let heading: number | null = null
    while (this.path.length > 0) {
      const next = this.path[0]!
      const dx = next.x - position.x
      const dy = next.y - position.y
      const distance = Math.hypot(dx, dy)
      heading = Math.atan2(dy, dx)
      if (distance > remaining) {
        position.x += (dx / distance) * remaining
        position.y += (dy / distance) * remaining
        remaining = 0
        break
      }
      position.x = next.x
      position.y = next.y
      remaining -= distance
      this.path.shift()
    }
    this.pathStart = { ...position }
    return {
      reached: this.path.length === 0,
      blocked: false,
      used: Math.max(0, budget) - remaining,
      heading,
    }
  }

  /** Keep a horizontal patrol on its spawn line, reversing at the nearest wall faces. */
  straightPatrolDestinations(area: PatrolArea, spawn: NavigationPoint): NavigationPoint[] {
    const left = this.constrain({ x: area.x, y: spawn.y }, area)
    const right = this.constrain({ x: area.x + area.width - this.width, y: spawn.y }, area)
    const centerX = spawn.x + this.width / 2
    const centerY = left.y + this.height / 2
    for (const wall of this.walls) {
      if (wall.y >= centerY + this.radius || wall.y + wall.height <= centerY - this.radius) {
        continue
      }
      if (wall.x + wall.width <= centerX) {
        left.x = Math.max(left.x, wall.x + wall.width + this.radius + CLEARANCE - this.width / 2)
      } else if (wall.x >= centerX) {
        right.x = Math.min(right.x, wall.x - this.radius - CLEARANCE - this.width / 2)
      }
    }
    return [left, right].filter((point) => this.isFree(point))
  }

  /** Opposite room sides and solid wall faces supply reachable wall-to-wall stops. */
  patrolDestinations(area: PatrolArea): NavigationPoint[] {
    const center = {
      x: area.x + (area.width - this.width) / 2,
      y: area.y + (area.height - this.height) / 2,
    }
    const points = [
      { x: area.x, y: center.y },
      { x: area.x + area.width - this.width, y: center.y },
      { x: center.x, y: area.y },
      { x: center.x, y: area.y + area.height - this.height },
    ].map((point) => this.constrain(this.constrain(point, area)))
    for (const wall of this.walls) {
      const x = wall.x + (wall.width - this.width) / 2
      const y = wall.y + (wall.height - this.height) / 2
      points.push(
        { x: wall.x - this.radius - CLEARANCE - this.width / 2, y },
        { x: wall.x + wall.width + this.radius + CLEARANCE - this.width / 2, y },
        { x, y: wall.y - this.radius - CLEARANCE - this.height / 2 },
        { x, y: wall.y + wall.height + this.radius + CLEARANCE - this.height / 2 }
      )
    }
    return points.filter(
      (point, index) =>
        point.x >= area.x &&
        point.y >= area.y &&
        point.x + this.width <= area.x + area.width &&
        point.y + this.height <= area.y + area.height &&
        this.isFree(point) &&
        !points
          .slice(0, index)
          .some((other) => Math.hypot(point.x - other.x, point.y - other.y) <= EPSILON)
    )
  }
}
