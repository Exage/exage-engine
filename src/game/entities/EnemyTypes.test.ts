import { afterEach, describe, expect, it, vi } from 'vitest'
import { boxPenetration, HitboxWorld, Input } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import type { EnemyOptions } from '@/game/entities/EnemyConfig'
import { Player } from '@/game/entities/Player'
import { Wall } from '@/game/entities/Wall'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function setup(options: EnemyOptions) {
  const enemy = new Enemy(200, 200, { weapon: null, ...options })
  const player = new Player(new Input())
  player.transform.position.set(2000, 2000)
  const world = new HitboxWorld([enemy, player])
  return { enemy, player, world }
}

describe('Enemy types', () => {
  it('idle waits, detects by distance from any side, pursues, and respects cover', () => {
    const { enemy, player, world } = setup({ type: 'idle', vision: { range: 400 } })
    enemy.attack(2, player, world)
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 200 })
    player.transform.position.set(0, 204)
    enemy.attack(0.25, player, world)
    expect(enemy.playerVisible).toBe(true)
    expect(enemy.transform.position.x).toBeCloseTo(140)
    const wall = new Wall(80, 0, 20, 500)
    expect(enemy.canSee(player, new HitboxWorld([enemy, player, wall]))).toBe(false)
  })

  it('patrol visits all four sides of its rectangular room by default', () => {
    const room = { x: 0, y: 0, width: 600, height: 400 }
    const { enemy, player, world } = setup({ type: 'patrol', room, vision: { range: 0 } })
    const corners = new Set<string>()
    for (let frame = 0; frame < 300; frame++) {
      enemy.attack(0.1, player, world)
      const { x, y } = enemy.transform.position
      if ((x < 30 || x > 520) && (y < 30 || y > 320)) {
        corners.add(`${x < 30 ? 'left' : 'right'}-${y < 30 ? 'top' : 'bottom'}`)
      }
      expect(x).toBeGreaterThanOrEqual(room.x)
      expect(y).toBeGreaterThanOrEqual(room.y)
      expect(x + enemy.width).toBeLessThanOrEqual(room.width)
      expect(y + enemy.height).toBeLessThanOrEqual(room.height)
    }
    expect(corners.size).toBe(4)
  })

  it.each([true, false])('random walks diagonally, pauses (looks=%s), then resumes', (looks) => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(looks ? 0 : 0.9)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75)
      .mockReturnValue(0.5)
    const { enemy, player, world } = setup({ type: 'random', vision: { range: 0 } })
    enemy.attack(1, player, world)
    expect(enemy.activity).toBe('wander')
    expect(enemy.transform.position.x - 200).toBeCloseTo(100 / Math.sqrt(2))
    expect(enemy.transform.position.y - 200).toBeCloseTo(100 / Math.sqrt(2))
    enemy.attack(1, player, world)
    const paused = enemy.transform.position.clone()
    const angle = enemy.transform.rotation
    enemy.attack(0.5, player, world)
    expect(enemy.transform.position).toEqual(paused)
    expect(enemy.activity).toBe(looks ? 'look' : 'rest')
    expect(enemy.transform.rotation === angle).toBe(!looks)
    enemy.attack(1, player, world)
    expect(enemy.activity).toBe('wander')
    expect(enemy.transform.position).not.toEqual(paused)
  })

  it('random stops at walls, remains inside its room, and resumes wandering after search', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const room = { x: 0, y: 0, width: 400, height: 400 }
    const { enemy, player } = setup({ type: 'random', room, vision: { angleDegrees: 360 } })
    const wall = new Wall(300, 160, 2, 200)
    const world = new HitboxWorld([enemy, player, wall])
    player.transform.position.set(204, 104)
    enemy.attack(0, player, world)
    expect(enemy.playerVisible).toBe(true)
    player.transform.position.set(2000, 2000)
    enemy.attack(1, player, world)
    expect(enemy.lastSeenPosition).toBeNull()
    for (let frame = 0; frame < 200; frame++) {
      enemy.attack(0.1, player, world)
      expect(boxPenetration(enemy.hitboxes[0]!.shape, wall.collider.shape)).toBeNull()
      expect(enemy.transform.position.x + enemy.width).toBeLessThanOrEqual(400)
      expect(enemy.transform.position.y + enemy.height).toBeLessThanOrEqual(400)
    }
    expect(['wander', 'rest', 'look']).toContain(enemy.activity)
  })

  it('fat survives the first hit and bleeds out without resetting the timer on more hits', () => {
    const { enemy } = setup({ type: 'fat' })
    expect(enemy.width).toBe(64)
    enemy.receiveHit()
    expect(enemy.hit).toBe(false)
    expect(enemy.health).toBe(2)
    expect(enemy.hitboxes[0]!.enabled).toBe(true)
    enemy.update(1.5)
    enemy.receiveHit()
    expect(enemy.health).toBe(1)
    expect(enemy.bleedRemaining).toBeCloseTo(1)
    enemy.update(0.9)
    expect(enemy.hit).toBe(false)
    enemy.update(0.1)
    expect(enemy.hit).toBe(true)
    expect(enemy.hitboxes[0]!.enabled).toBe(false)
  })

  it('fat dies immediately after three hits and drops its weapon with its remaining ammo', () => {
    const { enemy } = setup({ type: 'fat', weapon: { ammo: 7 } })
    const weapon = enemy.weapon!
    enemy.receiveHit()
    enemy.receiveHit()
    expect(enemy.hit).toBe(false)
    enemy.receiveHit()
    expect(enemy.hit).toBe(true)
    expect(enemy.weapon).toBeNull()
    expect(weapon.owner).toBeNull()
    expect(weapon.ammo).toBe(7)
  })

  it('dog charges faster than the player and kills on contact without firing', () => {
    const { enemy, player, world } = setup({ type: 'dog', weapon: { ammo: 50 } })
    player.transform.position.set(600, 194)
    expect(enemy.attack(0.5, player, world)).toBeNull()
    expect(enemy.transform.position.x).toBeCloseTo(525)
    expect(player.controlsEnabled).toBe(true)
    expect(enemy.weapon).toBeNull()
    enemy.attack(0.2, player, world)
    expect(player.controlsEnabled).toBe(false)
  })

  it('dog respects walls and resumes its route after investigating a lost sighting', () => {
    const room = { x: 0, y: 0, width: 800, height: 600 }
    const { enemy, player } = setup({ type: 'dog', room, vision: { angleDegrees: 360 } })
    player.transform.position.set(600, 194)
    const wall = new Wall(400, 0, 20, 600)
    const blockedWorld = new HitboxWorld([enemy, player, wall])
    enemy.attack(1, player, blockedWorld)
    expect(enemy.playerVisible).toBe(false)
    expect(player.controlsEnabled).toBe(true)
    expect(boxPenetration(enemy.hitboxes[0]!.shape, wall.collider.shape)).toBeNull()
    const world = new HitboxWorld([enemy, player])
    enemy.attack(0, player, world)
    expect(enemy.playerVisible).toBe(true)
    player.transform.position.set(2000, 2000)
    enemy.attack(1, player, world)
    expect(enemy.lastSeenPosition).toBeNull()
    enemy.attack(10, player, world)
    expect(enemy.activity).toBe('patrol')
  })

  it('dog contact honors development invulnerability', () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'development')
    const { enemy, player, world } = setup({ type: 'dog' })
    player.invulnerable = true
    player.transform.position.set(200, 200)
    enemy.attack(0, player, world)
    expect(player.controlsEnabled).toBe(true)
  })
})
