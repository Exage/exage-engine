import { describe, expect, it, vi } from 'vitest'
import { CollisionWorld, HitboxWorld, Input } from '@/engine'
import type { Renderer } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import type { EnemyOptions } from '@/game/entities/EnemyConfig'
import { Player } from '@/game/entities/Player'
import { Projectile } from '@/game/entities/Projectile'
import { Wall } from '@/game/entities/Wall'

function setup(options: EnemyOptions = {}) {
  const enemy = new Enemy(-24, -24, options)
  const player = new Player(new Input())
  player.transform.position.set(180, -20)
  const world = new HitboxWorld([enemy, player])
  return { enemy, player, world }
}

describe('Enemy perception and configuration', () => {
  it('uses defaults, merges nested overrides, and centers independent hitboxes', () => {
    const defaultEnemy = new Enemy(0, 0)
    expect(defaultEnemy.config).toMatchObject({
      width: 48,
      height: 48,
      vision: { range: 600, angleDegrees: 120 },
      movement: { speed: 240, stopDistance: 400 },
      weapon: { shotInterval: 1.2, initialDelay: 1.2, projectileSpeed: 450 },
    })
    const options = {
      width: 80,
      height: 60,
      hitbox: { width: 30, height: 20 },
      vision: { range: 1000 },
      weapon: { shotInterval: 0.4 },
    }
    const enemy = new Enemy(100, 200, options)
    expect(enemy.hitboxes[0]!.shape).toEqual({
      x: 125,
      y: 220,
      width: 30,
      height: 20,
      rotation: 0,
    })
    expect(enemy.config.vision).toEqual({ range: 1000, angleDegrees: 120 })
    expect(enemy.config.weapon.initialDelay).toBe(0.4)
    options.vision.range = 10
    expect(enemy.config.vision.range).toBe(1000)
    expect(defaultEnemy.config.vision.range).toBe(600)
    const offset = new Enemy(100, 200, { hitbox: { width: 20, offsetX: -10, offsetY: 5 } })
    expect(offset.hitboxes[0]!.shape).toMatchObject({ x: 90, y: 205, width: 20, height: 48 })
    const renderer = { drawRotatedRect: vi.fn() }
    enemy.render(renderer as unknown as Renderer)
    expect(renderer.drawRotatedRect).toHaveBeenCalledWith(100, 200, 80, 60, 0, '#ef4444')
    const miss = new Projectile(0, 205, 0)
    miss.update(0.2)
    expect(miss.contact(enemy)).toBeNull()
    const hit = new Projectile(0, 230, 0)
    hit.update(0.2)
    expect(hit.contact(enemy)).not.toBeNull()
  })

  it.each([
    [600, 0, true],
    [601, 0, false],
    [200, 60, true],
    [200, -60, true],
    [200, 61, false],
    [200, -61, false],
    [200, 180, false],
    [0, 0, true],
  ])('checks center distance %s and angle %s: visible=%s', (distance, degrees, visible) => {
    const { enemy, player, world } = setup()
    const angle = (degrees * Math.PI) / 180
    player.transform.position.set(Math.cos(angle) * distance - 20, Math.sin(angle) * distance - 20)
    expect(enemy.canSee(player, world)).toBe(visible)
  })

  it('supports wider sight, full circles, disabled sight, and angles crossing PI', () => {
    const { enemy, player, world } = setup({
      facingAngleDegrees: 180,
      vision: { angleDegrees: 90 },
    })
    player.transform.position.set(-220, -21)
    expect(enemy.canSee(player, world)).toBe(true)
    const wide = setup({ vision: { range: 1000, angleDegrees: 360 } })
    wide.player.transform.position.set(-920, -20)
    expect(wide.enemy.canSee(wide.player, wide.world)).toBe(true)
    for (const vision of [{ range: 0 }, { angleDegrees: 0 }]) {
      const disabled = setup({ vision })
      expect(disabled.enemy.canSee(disabled.player, disabled.world)).toBe(false)
    }
  })

  it('ignores other enemies but respects walls, including rotated and disabled blockers', () => {
    const { enemy, player } = setup()
    const wall = new Wall(100, -50, 10, 100)
    wall.collider.followRotation = true
    wall.transform.rotation = Math.PI / 4
    const other = new Enemy(50, -24)
    const world = new HitboxWorld([enemy, other, wall, player])
    expect(enemy.attack(2, player, world)).toBeNull()
    expect(enemy.playerVisible).toBe(false)
    wall.collider.enabled = false
    expect(enemy.attack(0, player, world)).not.toBeNull()
    expect(enemy.playerVisible).toBe(true)
    wall.collider.enabled = true
    wall.collider.isTrigger = true
    expect(enemy.canSee(player, world)).toBe(true)
    wall.collider.isTrigger = false
    wall.collider.blocksHits = false
    expect(enemy.canSee(player, world)).toBe(true)
  })

  it('never turns toward unseen targets and stops tracking when sight is lost', () => {
    const { enemy, player, world } = setup()
    player.transform.position.set(-220, -20)
    expect(enemy.attack(2, player, world)).toBeNull()
    expect(enemy.transform.rotation).toBe(0)
    player.transform.position.set(180, 80)
    expect(enemy.attack(0, player, world)).not.toBeNull()
    expect(enemy.playerVisible).toBe(true)
    expect(enemy.transform.rotation).toBeCloseTo(Math.atan2(100, 200))
    const direction = enemy.transform.rotation
    const renderer = { drawRotatedRect: vi.fn() }
    enemy.render(renderer as unknown as Renderer)
    expect(renderer.drawRotatedRect.mock.calls[0]).toEqual([-24, -24, 48, 48, direction, '#ff785a'])
    const barrel = renderer.drawRotatedRect.mock.calls[1]!
    expect(barrel[0] + barrel[2] / 2).toBeCloseTo(Math.cos(direction) * 24)
    expect(barrel[1] + barrel[3] / 2).toBeCloseTo(Math.sin(direction) * 24)
    expect(barrel[4]).toBe(direction)
    player.transform.position.set(-220, -20)
    expect(enemy.attack(2, player, world)).toBeNull()
    expect(enemy.playerVisible).toBe(false)
    expect(enemy.transform.rotation).toBe(direction)
    renderer.drawRotatedRect.mockClear()
    enemy.render(renderer as unknown as Renderer)
    expect(renderer.drawRotatedRect.mock.calls[0]).toEqual([-24, -24, 48, 48, direction, '#ef4444'])
    enemy.hit = true
    player.transform.position.set(180, 80)
    expect(enemy.attack(2, player, world)).toBeNull()
    expect(enemy.canSee(player, world)).toBe(false)
  })

  it('applies initial delay, firing interval, and projectile speed', () => {
    const { enemy, player, world } = setup({
      weapon: { initialDelay: 0.5, shotInterval: 0.25, projectileSpeed: 800 },
    })
    expect(enemy.attack(0.25, player, world)).toBeNull()
    expect(enemy.playerVisible).toBe(true)
    const shot = enemy.attack(0.25, player, world)!
    expect(shot.owner).toBe(enemy)
    shot.update(0.1)
    expect(shot.transform.position.x).toBeCloseTo(80)
    expect(enemy.attack(0.125, player, world)).toBeNull()
    expect(enemy.attack(0.125, player, world)).not.toBeNull()
  })

  it('renders sight status and omits defeated or blind enemies', () => {
    const { enemy, player, world } = setup()
    const renderer = { drawSector: vi.fn() }
    enemy.renderVision(renderer as unknown as Renderer)
    expect(renderer.drawSector.mock.calls[0]?.at(-1)).toBe('#facc15')
    enemy.attack(0, player, world)
    enemy.renderVision(renderer as unknown as Renderer)
    expect(renderer.drawSector.mock.calls[1]?.at(-1)).toBe('#ff785a')
    enemy.hit = true
    enemy.renderVision(renderer as unknown as Renderer)
    setup({ vision: { range: 0 } }).enemy.renderVision(renderer as unknown as Renderer)
    expect(renderer.drawSector).toHaveBeenCalledTimes(2)
  })

  it('approaches at a constant diagonal speed and stops at 400 pixels without overshooting', () => {
    const { enemy, player, world } = setup()
    player.transform.position.set(280, 380)
    enemy.attack(0.25, player, world)
    expect(enemy.transform.position.x).toBeCloseTo(-24 + 36)
    expect(enemy.transform.position.y).toBeCloseTo(-24 + 48)
    const shot = enemy.attack(2, player, world)!
    expect(enemy.transform.position.x).toBeCloseTo(36)
    expect(enemy.transform.position.y).toBeCloseTo(56)
    expect(shot.transform.position).toMatchObject({ x: 60, y: 80 })
    enemy.attack(1, player, world)
    expect(enemy.transform.position.x).toBeCloseTo(36)
    expect(enemy.transform.position.y).toBeCloseTo(56)
    player.transform.position.set(340, 460)
    enemy.attack(1, player, world)
    expect(enemy.transform.position.x).toBeCloseTo(96)
    expect(enemy.transform.position.y).toBeCloseTo(136)
  })

  it('stays still for nearby, unseen, occluded, and defeated targets', () => {
    const { enemy, player, world } = setup()
    for (const [x, y] of [
      [180, -20],
      [-520, -20],
      [680, -20],
    ]) {
      player.transform.position.set(x!, y!)
      enemy.attack(1, player, world)
      expect(enemy.transform.position).toMatchObject({ x: -24, y: -24 })
    }
    player.transform.position.set(480, -20)
    const wall = new Wall(100, -50, 20, 100)
    enemy.attack(1, player, new HitboxWorld([enemy, player, wall]))
    expect(enemy.transform.position).toMatchObject({ x: -24, y: -24 })
    enemy.attack(0.1, player, world)
    const position = enemy.transform.position.clone()
    enemy.attack(1, player, new HitboxWorld([enemy, player, wall]))
    expect(enemy.transform.position).toEqual(position)
    enemy.hit = true
    enemy.attack(1, player, world)
    expect(enemy.transform.position).toEqual(position)
  })

  it('stops its body at a thin wall even when its sight ray clears the edge', () => {
    const { enemy, player } = setup()
    player.transform.position.set(580, -20)
    const wall = new Wall(60, 10, 2, 100)
    const entities = [enemy, player, wall]
    const world = new HitboxWorld(entities)
    expect(enemy.canSee(player, world)).toBe(true)
    enemy.attack(2, player, world, new CollisionWorld(entities))
    expect(enemy.transform.position.x).toBeCloseTo(12)
    expect(enemy.transform.position.y).toBeCloseTo(-24)
    expect(enemy.playerVisible).toBe(true)
  })

  it('supports movement overrides and disabled movement', () => {
    const { enemy, player, world } = setup({ movement: { speed: 100, stopDistance: 100 } })
    enemy.attack(0.5, player, world)
    expect(enemy.transform.position.x).toBeCloseTo(26)
    enemy.attack(2, player, world)
    expect(enemy.transform.position.x).toBeCloseTo(76)
    const stationary = setup({ movement: { speed: 0 } })
    stationary.player.transform.position.set(480, -20)
    stationary.enemy.attack(2, stationary.player, stationary.world)
    expect(stationary.enemy.transform.position.x).toBe(-24)
    expect(stationary.enemy.config.movement.stopDistance).toBe(400)
  })

  it.each<EnemyOptions>([
    { width: 0 },
    { height: -1 },
    { hitbox: { width: 0 } },
    { hitbox: { offsetX: NaN } },
    { facingAngle: Infinity },
    { facingAngleDegrees: NaN },
    { facingAngleDegrees: Infinity },
    { vision: { range: -1 } },
    { vision: { angleDegrees: 361 } },
    { vision: { angleDegrees: NaN } },
    { weapon: { shotInterval: 0 } },
    { weapon: { initialDelay: -1 } },
    { weapon: { projectileSpeed: Infinity } },
    { movement: { speed: -1 } },
    { movement: { speed: Infinity } },
    { movement: { stopDistance: -1 } },
    { movement: { stopDistance: NaN } },
  ])('rejects invalid settings: %j', (options) => {
    expect(() => new Enemy(0, 0, options)).toThrow(RangeError)
  })
})
