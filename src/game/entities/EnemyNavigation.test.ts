import { describe, expect, it, vi } from 'vitest'
import { boxPenetration, HitboxWorld, Input, sweepBox } from '@/engine'
import type { Entity } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import type { EnemyOptions } from '@/game/entities/EnemyConfig'
import { EnemyNavigation } from '@/game/entities/EnemyNavigation'
import { Player } from '@/game/entities/Player'
import { Wall } from '@/game/entities/Wall'

const room = { x: 0, y: 0, width: 400, height: 400 }

function setup(options: EnemyOptions = {}, walls: Wall[] = []) {
  const enemy = new Enemy(60, 176, {
    room,
    vision: { range: 1000, angleDegrees: 360 },
    movement: { speed: 100, stopDistance: 0 },
    ...options,
  })
  const player = new Player(new Input())
  player.transform.position.set(3000, 3000)
  const entities: Entity[] = [enemy, player, ...walls]
  const world = new HitboxWorld(entities)
  const tick = (dt: number) => {
    const before = { ...enemy.hitboxes[0]!.shape }
    const position = enemy.transform.position.clone()
    enemy.attack(dt, player, world)
    const after = enemy.hitboxes[0]!.shape
    for (const wall of walls) {
      if (wall.collider.enabled && !wall.collider.isTrigger) {
        expect(boxPenetration(after, wall.collider.shape)).toBeNull()
        // Small frame translations cannot cross a thin wall between samples.
        if (dt <= 0.1) {
          expect(
            sweepBox(before, wall.collider.shape, after.x - before.x, after.y - before.y)
          ).toBeNull()
        }
      }
    }
    expect(enemy.transform.position.x + 24).toBeGreaterThanOrEqual(Math.hypot(48, 48) / 2 - 1e-6)
    expect(enemy.transform.position.y + 24).toBeGreaterThanOrEqual(Math.hypot(48, 48) / 2 - 1e-6)
    expect(enemy.transform.position.x + 24).toBeLessThanOrEqual(400 - Math.hypot(48, 48) / 2 + 1e-6)
    expect(enemy.transform.position.y + 24).toBeLessThanOrEqual(400 - Math.hypot(48, 48) / 2 + 1e-6)
    return Math.hypot(
      enemy.transform.position.x - position.x,
      enemy.transform.position.y - position.y
    )
  }
  return { enemy, player, entities, tick }
}

describe('Enemy wall navigation', () => {
  it('uses the direct path in free space and retains its route between frames', () => {
    const navigation = new EnemyNavigation(48, 48, room)
    navigation.update([])
    const plan = vi.spyOn(navigation, 'plan')
    const position = { x: 60, y: 176 }
    const destination = { x: 300, y: 176 }
    expect(navigation.travel(position, destination, 100)).toMatchObject({
      reached: false,
      used: 100,
    })
    expect(position).toEqual({ x: 160, y: 176 })
    expect(navigation.travel(position, destination, 200)).toMatchObject({
      reached: true,
      used: 140,
    })
    expect(position).toEqual(destination)
    expect(plan).toHaveBeenCalledTimes(1)
  })

  it('investigates around a thin wall and returns along a safe route', () => {
    const wall = new Wall(190, 120, 2, 150)
    wall.collider.enabled = false
    const { enemy, player, tick } = setup({}, [wall])
    player.transform.position.set(304, 180)
    tick(0)
    wall.collider.enabled = true
    player.transform.position.set(3000, 3000)
    let deviated = false
    let arrived = false
    for (let frame = 0; frame < 150; frame++) {
      tick(0.1)
      deviated ||= Math.abs(enemy.transform.position.y - 176) > 1
      arrived ||= enemy.activity === 'return'
    }
    expect(deviated).toBe(true)
    expect(arrived).toBe(true)
    expect(enemy.activity).toBe('guard')
    expect(enemy.transform.position).toMatchObject({ x: 60, y: 176 })
  })

  it.each([50, 80])('checks the whole body against a %s-pixel doorway', (gap) => {
    const navigation = new EnemyNavigation(48, 48, room)
    const walls = [
      new Wall(190, 0, 20, 200 - gap / 2),
      new Wall(190, 200 + gap / 2, 20, 200 - gap / 2),
    ]
    navigation.update(walls)
    const path = navigation.plan({ x: 60, y: 176 }, { x: 300, y: 176 })
    if (gap === 50) {
      expect(path).toBeNull()
    } else {
      expect(path).toEqual([{ x: 300, y: 176 }])
    }
  })

  it('does not escape the room to bypass a sealed partition or stay in investigation forever', () => {
    const wall = new Wall(190, 0, 20, 400)
    wall.collider.enabled = false
    const { enemy, player, tick } = setup({}, [wall])
    player.transform.position.set(304, 180)
    tick(0)
    wall.collider.enabled = true
    player.transform.position.set(3000, 3000)
    tick(1)
    expect(enemy.lastSeenPosition).toBeNull()
    tick(1)
    expect(enemy.activity).toBe('guard')
    expect(enemy.transform.position).toMatchObject({ x: 60, y: 176 })
  })

  it('rebuilds a cached route when a wall moves, disables, or becomes a trigger', () => {
    const wall = new Wall(190, 120, 20, 150)
    const navigation = new EnemyNavigation(48, 48, room)
    const position = { x: 60, y: 176 }
    const destination = { x: 300, y: 176 }
    navigation.update([wall])
    navigation.travel(position, destination, 10)
    expect(position.y).not.toBe(176)
    wall.transform.position.y = 300
    expect(navigation.update([wall])).toBe(true)
    expect(navigation.plan(position, destination)).toEqual([destination])
    wall.collider.enabled = false
    expect(navigation.update([wall])).toBe(true)
    wall.collider.enabled = true
    wall.collider.isTrigger = true
    expect(navigation.update([wall])).toBe(false)
    expect(navigation.plan(position, destination)).toEqual([destination])
  })

  it('routes around rotated walls and movement blockers that allow sight', () => {
    const wall = new Wall(180, 140, 20, 120)
    wall.collider.followRotation = true
    wall.collider.blocksHits = false
    wall.transform.rotation = Math.PI / 4
    const { enemy, player, tick } = setup({}, [wall])
    player.transform.position.set(304, 180)
    let deviated = false
    for (let frame = 0; frame < 100; frame++) {
      tick(0.1)
      deviated ||= Math.abs(enemy.transform.position.y - 176) > 1
    }
    expect(deviated).toBe(true)
    expect(enemy.transform.position.x).toBeCloseTo(300)
    expect(enemy.transform.position.y).toBeCloseTo(176)
  })

  it('invalidates the route after a teleport instead of following a stale segment', () => {
    const wall = new Wall(190, 120, 20, 150)
    const navigation = new EnemyNavigation(48, 48, room)
    navigation.update([wall])
    const position = { x: 60, y: 176 }
    navigation.travel(position, { x: 300, y: 176 }, 10)
    position.x = 300
    position.y = 300
    const result = navigation.travel(position, { x: 300, y: 176 }, 20)
    expect(result.blocked).toBe(false)
    expect(position).toEqual({ x: 300, y: 280 })
  })

  it('caches an unreachable route until the target or wall layout changes', () => {
    const wall = new Wall(190, 0, 20, 400)
    const navigation = new EnemyNavigation(48, 48, room)
    navigation.update([wall])
    const plan = vi.spyOn(navigation, 'plan')
    const position = { x: 60, y: 176 }
    for (let frame = 0; frame < 10; frame++) {
      expect(navigation.travel(position, { x: 300, y: 176 }, 10).blocked).toBe(true)
    }
    expect(plan).toHaveBeenCalledTimes(1)
    wall.collider.enabled = false
    navigation.update([wall])
    expect(navigation.travel(position, { x: 300, y: 176 }, 10).blocked).toBe(false)
    expect(plan).toHaveBeenCalledTimes(2)
  })
})

describe('Enemy room and wall-to-wall patrol', () => {
  it('stays in its room while chasing a visible player through an open boundary', () => {
    const { enemy, player, tick } = setup()
    player.transform.position.set(504, 180)
    tick(10)
    const boundary = 400 - 24 - Math.hypot(48, 48) / 2
    expect(enemy.transform.position.x).toBeCloseTo(boundary)
    expect(enemy.activity).toBe('chase')
    player.transform.position.set(3000, 3000)
    tick(1)
    expect(enemy.lastSeenPosition).toBeNull()
    expect(enemy.activity).toBe('return')
    tick(10)
    expect(enemy.transform.position).toMatchObject({ x: 60, y: 176 })
  })

  it('uses wall-to-wall patrol areas as the home room by default', () => {
    const enemy = new Enemy(60, 176, {
      behavior: { mode: 'patrol', area: room, route: 'wall-to-wall' },
    })
    expect(enemy.config.room).toEqual(room)
    expect(Object.isFrozen(enemy.config.room)).toBe(true)
  })

  it('crosses between opposite walls, detours around furniture, and never leaves its room', () => {
    const wall = new Wall(190, 120, 20, 150)
    const { enemy, tick } = setup(
      {
        behavior: { mode: 'patrol', area: room, route: 'wall-to-wall', speed: 100 },
      },
      [wall]
    )
    let left = false
    let right = false
    let top = false
    let bottom = false
    let distance = 0
    for (let frame = 0; frame < 1000; frame++) {
      distance += tick(0.1)
      left ||= enemy.transform.position.x < 20
      right ||= enemy.transform.position.x > 332
      top ||= enemy.transform.position.y < 20
      bottom ||= enemy.transform.position.y > 332
    }
    expect({ left, right, top, bottom }).toEqual({
      left: true,
      right: true,
      top: true,
      bottom: true,
    })
    expect(distance).toBeGreaterThan(9000)
  })

  it('skips unreachable wall stops and continues patrol in its connected room section', () => {
    const wall = new Wall(190, 0, 20, 400)
    const { enemy, tick } = setup(
      {
        behavior: { mode: 'patrol', area: room, route: 'wall-to-wall' },
      },
      [wall]
    )
    let distance = 0
    for (let frame = 0; frame < 100; frame++) {
      distance += tick(0.1)
      expect(enemy.transform.position.x + 48).toBeLessThan(190)
    }
    expect(distance).toBeGreaterThan(500)
  })

  it('preserves walking distance across routed corners and repeated laps on a slow frame', () => {
    const options: EnemyOptions = {
      behavior: { mode: 'patrol', area: room, route: 'wall-to-wall' },
    }
    const slow = setup(options, [new Wall(190, 120, 20, 150)])
    const fast = setup(options, [new Wall(190, 120, 20, 150)])
    slow.tick(100)
    for (let frame = 0; frame < 1000; frame++) {
      fast.tick(0.1)
    }
    expect(slow.enemy.transform.position.x).toBeCloseTo(fast.enemy.transform.position.x)
    expect(slow.enemy.transform.position.y).toBeCloseTo(fast.enemy.transform.position.y)
    expect(slow.enemy.transform.rotation).toBeCloseTo(fast.enemy.transform.rotation)
  })

  it('does not adopt a search patrol in another room', () => {
    const { enemy, player, tick } = setup({
      search: { after: 'nearest-patrol', patrolAreas: [{ x: 500, y: 0, width: 400, height: 400 }] },
    })
    player.transform.position.set(304, 180)
    tick(0)
    player.transform.position.set(3000, 3000)
    tick(5)
    expect(enemy.activePatrolArea).toBeNull()
    expect(enemy.activity).toBe('hold')
  })

  it.each([
    { x: NaN, y: 0, width: 400, height: 400 },
    { x: 0, y: 0, width: 50, height: 400 },
    { x: 0, y: 0, width: 400, height: Infinity },
    { x: 100, y: 100, width: 400, height: 400 },
  ])('rejects rooms or spawns that cannot contain the body: %j', (invalidRoom) => {
    expect(() => setup({ room: invalidRoom })).toThrow(RangeError)
  })
})
