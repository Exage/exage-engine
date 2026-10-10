import { describe, expect, it } from 'vitest'
import { boxPenetration, HitboxWorld, Input } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import type { EnemyOptions } from '@/game/entities/EnemyConfig'
import { Player } from '@/game/entities/Player'
import { Wall } from '@/game/entities/Wall'

function setup(options: EnemyOptions = {}) {
  const enemy = new Enemy(0, 0, {
    behavior: { mode: 'patrol', area: { x: 0, y: 0, width: 248, height: 148 }, speed: 100 },
    ...options,
  })
  const player = new Player(new Input())
  player.transform.position.set(2000, 2000)
  const entities = [enemy, player]
  return { enemy, player, world: new HitboxWorld(entities) }
}

describe('Enemy patrol and guard behavior', () => {
  it('keeps the hitbox aligned with the body through patrol turns and movement', () => {
    const { enemy, player } = setup({
      width: 80,
      height: 40,
      behavior: { mode: 'patrol', area: { x: 0, y: 0, width: 280, height: 140 } },
    })
    const world = new HitboxWorld([enemy])
    enemy.attack(2, player, world)
    expect(enemy.hitboxes[0]!.shape).toEqual({
      x: 200,
      y: 0,
      width: 80,
      height: 40,
      rotation: Math.PI / 2,
    })
    const probe = { x: 240, y: -10, width: 2, height: 2, rotation: 0 }
    expect(world.cast(probe, 0, 0)?.entity).toBe(enemy)
    enemy.attack(0.5, player, world)
    expect(enemy.hitboxes[0]!.shape).toMatchObject({ x: 200, y: 50, rotation: Math.PI / 2 })
    expect(world.cast(probe, 0, 0)).toBeNull()
    expect(world.cast({ ...probe, y: 40 }, 0, 0)?.entity).toBe(enemy)
  })

  it.each([0, 80])('ignores a player overlapping or blocking the route at x=%s', (x) => {
    const { enemy, player, world } = setup({ vision: { range: 0 } })
    player.transform.position.set(x, 0)
    enemy.attack(1, player, world)
    expect(enemy.collider).toBeNull()
    expect(enemy.transform.position).toMatchObject({ x: 100, y: 0 })
    expect(player.transform.position).toMatchObject({ x, y: 0 })
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 0 })
  })

  it('ignores the player collider during pursuit with a short stopping distance', () => {
    const { enemy, player, world } = setup({ movement: { stopDistance: 0 } })
    player.transform.position.set(104, 4)
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 100, y: 0 })
    expect(player.transform.position).toMatchObject({ x: 104, y: 4 })
  })

  it('walks clockwise within the rectangle and turns its vision at each corner', () => {
    const { enemy, player, world } = setup()
    for (const [dt, x, y, angle] of [
      [1, 100, 0, 0],
      [1, 200, 0, Math.PI / 2],
      [1, 200, 100, Math.PI],
      [2, 0, 100, -Math.PI / 2],
      [1, 0, 0, 0],
    ]) {
      expect(enemy.attack(dt!, player, world)).toBeNull()
      expect(enemy.transform.position.x).toBeCloseTo(x!)
      expect(enemy.transform.position.y).toBeCloseTo(y!)
      expect(enemy.transform.rotation).toBeCloseTo(angle!)
      expect(enemy.playerVisible).toBe(false)
    }
  })

  it.each([false, true])('completes a rectangle next to outer walls (room=%s)', (withRoom) => {
    const area = { x: 720, y: 240, width: 400, height: 400 }
    const enemy = new Enemy(820, 340, {
      room: withRoom ? area : undefined,
      behavior: { mode: 'patrol', area },
      vision: { range: 0 },
    })
    const player = new Player(new Input())
    const walls = [
      new Wall(700, 220, 440, 20),
      new Wall(700, 240, 20, 400),
      new Wall(1120, 240, 20, 400),
      new Wall(700, 640, 440, 20),
    ]
    const world = new HitboxWorld([enemy, player, ...walls])
    const corners = new Set<string>()
    for (let frame = 0; frame < 200; frame++) {
      enemy.attack(0.1, player, world)
      const { x, y } = enemy.transform.position
      if ((x < 750 || x > 1040) && (y < 270 || y > 560)) {
        corners.add(`${x < 750 ? 'left' : 'right'}-${y < 270 ? 'top' : 'bottom'}`)
      }
      for (const wall of walls) {
        expect(boxPenetration(enemy.hitboxes[0]!.shape, wall.collider.shape)).toBeNull()
      }
    }
    expect(corners.size).toBe(4)
  })

  it('preserves walking distance across corners and multiple laps on a slow frame', () => {
    const slow = setup()
    const fast = setup()
    slow.enemy.attack(62.5, slow.player, slow.world)
    for (let frame = 0; frame < 625; frame++) {
      fast.enemy.attack(0.1, fast.player, fast.world)
    }
    expect(slow.enemy.transform.position).toMatchObject({ x: 200, y: 50 })
    expect(slow.enemy.transform.position).toEqual(fast.enemy.transform.position)
    expect(slow.enemy.transform.rotation).toBe(fast.enemy.transform.rotation)
  })

  it('enters the route at the nearest corner from an arbitrary spawn', () => {
    const { enemy, player, world } = setup({
      behavior: { mode: 'patrol', area: { x: 100, y: 0, width: 248, height: 148 } },
    })
    enemy.attack(1.5, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 150, y: 0 })
  })

  it('leaves the area to chase, shoots, then returns to the route after losing sight', () => {
    const { enemy, player, world } = setup({
      movement: { speed: 240, stopDistance: 40 },
      weapon: { initialDelay: 0 },
    })
    player.transform.position.set(504, 4)
    expect(enemy.attack(1, player, world)?.owner).toBe(enemy)
    expect(enemy.playerVisible).toBe(true)
    expect(enemy.transform.position).toMatchObject({ x: 240, y: 0 })
    player.transform.position.set(2000, 2000)
    expect(enemy.attack(0.5, player, world)).toBeNull()
    expect(enemy.playerVisible).toBe(false)
    expect(enemy.transform.position).toMatchObject({ x: 360, y: 0 })
    expect(enemy.activity).toBe('investigate')
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 500, y: 0 })
    enemy.attack(3.1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 10 })
    expect(enemy.transform.rotation).toBeCloseTo(Math.PI / 2)
  })

  it('keeps the next waypoint through repeated sightings without walking back to the previous corner', () => {
    const { enemy, player, world } = setup()
    enemy.attack(0.5, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 50, y: 0 })
    for (const expectedX of [60, 70]) {
      player.transform.position.set(enemy.transform.position.x + 4, 4)
      enemy.attack(0.1, player, world)
      expect(enemy.playerVisible).toBe(true)
      player.transform.position.set(2000, 2000)
      enemy.attack(0, player, world)
      enemy.attack(0.1, player, world)
      expect(enemy.transform.position).toMatchObject({ x: expectedX, y: 0 })
      expect(enemy.transform.rotation).toBe(0)
    }
  })

  it('resumes the saved waypoint after pursuit even when another corner is closer', () => {
    const { enemy, player, world } = setup({
      vision: { angleDegrees: 360 },
      movement: { stopDistance: 0 },
    })
    enemy.attack(0.8, player, world)
    player.transform.position.set(84, 224)
    enemy.attack(0.25, player, world)
    expect(enemy.playerVisible).toBe(true)
    expect(enemy.transform.position).toMatchObject({ x: 80, y: 60 })
    player.transform.position.set(2000, 2000)
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 80, y: 220 })
    const distanceToSavedCorner = Math.hypot(120, 220)
    enemy.attack(distanceToSavedCorner / 100 + 0.1, player, world)
    expect(enemy.transform.position.x).toBeCloseTo(200)
    expect(enemy.transform.position.y).toBeCloseTo(10)
    expect(enemy.transform.rotation).toBeCloseTo(Math.PI / 2)
  })

  it('detects and fires at a player revealed by a patrol turn in the same update', () => {
    const { enemy, player, world } = setup({ weapon: { initialDelay: 0 } })
    player.transform.position.set(204, 504)
    expect(enemy.canSee(player, world)).toBe(false)
    expect(enemy.attack(2, player, world)?.owner).toBe(enemy)
    expect(enemy.playerVisible).toBe(true)
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 0 })
  })

  it('waits as a guard, investigates a lost player, and returns to its post', () => {
    const { enemy, player, world } = setup({ behavior: { mode: 'guard' } })
    enemy.attack(10, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 0, y: 0 })
    expect(enemy.transform.rotation).toBe(0)
    player.transform.position.set(504, 4)
    expect(enemy.attack(0.25, player, world)).not.toBeNull()
    expect(enemy.transform.position).toMatchObject({ x: 60, y: 0 })
    player.transform.position.set(2000, 2000)
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 300, y: 0 })
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 500, y: 0 })
    enemy.attack(5, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 0, y: 0 })
  })

  it('detours around walls during patrol and keeps its waypoint progress', () => {
    const { enemy, player } = setup()
    const wall = new Wall(120, -100, 2, 400)
    const entities = [enemy, player, wall]
    const world = new HitboxWorld(entities)
    let crossed = false
    for (let frame = 0; frame < 120; frame++) {
      enemy.attack(0.1, player, world)
      expect(boxPenetration(enemy.hitboxes[0]!.shape, wall.collider.shape)).toBeNull()
      crossed ||= enemy.transform.position.x >= 200
    }
    expect(crossed).toBe(true)
    expect(enemy.collider).toBeNull()
    expect(wall.collider.enabled).toBe(true)
  })

  it('does not patrol when defeated, paused, or configured with zero walking speed', () => {
    const { enemy, player, world } = setup()
    enemy.attack(0, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 0, y: 0 })
    enemy.hit = true
    enemy.attack(10, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 0, y: 0 })
    const stopped = setup({
      behavior: { mode: 'patrol', area: { x: 0, y: 0, width: 248, height: 148 }, speed: 0 },
    })
    stopped.enemy.attack(10, stopped.player, stopped.world)
    expect(stopped.enemy.transform.position).toMatchObject({ x: 0, y: 0 })
  })

  it('copies shared patrol areas and resolves the default walking speed', () => {
    const area = { x: 0, y: 0, width: 248, height: 148 }
    const { enemy } = setup({ behavior: { mode: 'patrol', area } })
    area.x = 1000
    expect(enemy.config.behavior).toEqual({
      mode: 'patrol',
      area: { x: 0, y: 0, width: 248, height: 148 },
      speed: 100,
      route: 'perimeter',
    })
    expect(Object.isFrozen(enemy.config.behavior)).toBe(true)
    if (enemy.config.behavior.mode === 'patrol') {
      expect(Object.isFrozen(enemy.config.behavior.area)).toBe(true)
    }
  })

  it.each([
    { x: NaN },
    { y: Infinity },
    { width: 48 },
    { height: 48 },
    { width: -1 },
    { height: Infinity },
  ])('rejects invalid patrol areas: %j', (override) => {
    expect(() =>
      setup({
        behavior: {
          mode: 'patrol',
          area: { x: 0, y: 0, width: 248, height: 148, ...override },
        },
      })
    ).toThrow(RangeError)
  })

  it.each([-1, NaN, Infinity])('rejects invalid walking speed: %s', (speed) => {
    expect(() =>
      setup({
        behavior: {
          mode: 'patrol',
          area: { x: 0, y: 0, width: 248, height: 148 },
          speed,
        },
      })
    ).toThrow(RangeError)
  })
})
