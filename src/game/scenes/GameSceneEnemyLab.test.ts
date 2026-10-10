import { afterEach, describe, expect, it, vi } from 'vitest'
import { boxPenetration, Input, Time, Vector2 } from '@/engine'
import { Projectile } from '@/game/entities/Projectile'
import { Wall } from '@/game/entities/Wall'
import { Weapon } from '@/game/entities/Weapon'
import { enemyTestLevel } from '@/game/levels/enemyTestLevel'
import { GameScene } from '@/game/scenes/GameScene'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setup() {
  const target = new EventTarget()
  vi.stubGlobal('window', target)
  vi.stubGlobal('document', new EventTarget())
  const input = new Input()
  const scene = new GameScene(input, new Time(), 1000, 720)
  input.start()
  const frame = (dt = 0): void => {
    scene.update(dt)
    input.endFrame()
  }
  const tap = (code: string): void => {
    target.dispatchEvent(Object.assign(new Event('keydown'), { code }))
    target.dispatchEvent(Object.assign(new Event('keyup'), { code }))
    frame()
  }
  tap('F2')
  return { input, scene, frame, tap }
}

describe('Enemy AI lab', () => {
  it('switches levels, creates five types and weapon racks, teleports safely, and resets all state', () => {
    const { scene, input, tap } = setup()
    expect(scene.isTestingEnemies).toBe(true)
    expect(scene.enemies.map((enemy) => enemy.config.type)).toEqual([
      'idle',
      'patrol',
      'random',
      'fat',
      'dog',
    ])
    expect(scene.weapons.filter((weapon) => weapon.owner === null)).toHaveLength(11)
    const originalWeapons = [...scene.weapons]
    for (const [index, station] of enemyTestLevel.stations!.entries()) {
      tap(`Digit${index + 1}`)
      expect(scene.player.transform.position).toMatchObject(station.entry)
      expect(scene.collisions.overlaps(scene.player.collider)).toEqual([])
    }
    scene.enemies[3]!.receiveHit()
    scene.player.weapon!.fire()
    scene.projectiles.push(new Projectile(0, 0, 0))
    tap('KeyR')
    expect(scene.enemies[3]!.health).toBe(3)
    expect(scene.enemies[3]!.bleedRemaining).toBeNull()
    expect(scene.player.weapon!.ammo).toBe(24)
    expect(scene.projectiles).toHaveLength(0)
    expect(scene.weapons.every((weapon) => !originalWeapons.includes(weapon))).toBe(true)
    expect(scene.entities.filter((entity) => entity instanceof Weapon)).toEqual(scene.weapons)
    tap('F2')
    expect(scene.isTestingEnemies).toBe(false)
    expect(scene.enemies).toHaveLength(2)
    input.stop()
  })

  it('keeps all room enemies clear of walls, allows patrol weapon pickup, and keeps the corridor safe', () => {
    const { scene, input, frame } = setup()
    const walls = scene.entities.filter((entity): entity is Wall => entity instanceof Wall)
    const corners = new Set<string>()
    const patrolRoom = scene.enemies[1]!.config.room!
    for (let count = 0; count < 500; count++) {
      frame(0.05)
      const patrolPosition = scene.enemies[1]!.transform.position
      const x = patrolPosition.x - patrolRoom.x
      const y = patrolPosition.y - patrolRoom.y
      if ((x < 30 || x > 540) && (y < 30 || y > 560)) {
        corners.add(`${x < 30 ? 'left' : 'right'}-${y < 30 ? 'top' : 'bottom'}`)
      }
      for (const enemy of scene.enemies) {
        for (const wall of walls) {
          expect(boxPenetration(enemy.hitboxes[0]!.shape, wall.collider.shape)).toBeNull()
        }
        const room = enemy.config.room!
        const position = enemy.transform.position
        expect(position.x).toBeGreaterThanOrEqual(room.x)
        expect(position.y).toBeGreaterThanOrEqual(room.y)
        expect(position.x + enemy.width).toBeLessThanOrEqual(room.x + room.width)
        expect(position.y + enemy.height).toBeLessThanOrEqual(room.y + room.height)
      }
    }
    expect(corners.size).toBe(4)
    expect(scene.enemies[1]!.weapon?.ammo).toBe(8)
    expect(scene.isGameOver).toBe(false)
    input.stop()
  })

  it('drops with RMB, fires only when armed, and swaps with E without restoring ammo', () => {
    const { scene, input, frame, tap } = setup()
    const starter = scene.player.weapon!
    input.clicks.push(new Vector2(900, 500))
    frame()
    expect(starter.ammo).toBe(23)
    scene.projectiles.length = 0
    input.rightClicks.push(new Vector2(900, 500))
    frame()
    expect(scene.player.weapon).toBeNull()
    expect(starter.owner).toBeNull()
    input.clicks.push(new Vector2(900, 500))
    frame()
    expect(scene.projectiles).toHaveLength(0)
    frame(0.4)
    tap('KeyE')
    expect(scene.player.weapon).toBe(starter)
    expect(starter.ammo).toBe(23)
    const rifle = scene.weapons.find((weapon) => !weapon.owner && weapon.config.kind === 'rifle')!
    scene.player.transform.position.set(
      rifle.transform.position.x - 20,
      rifle.transform.position.y - 20
    )
    tap('KeyE')
    expect(scene.player.weapon).toBe(rifle)
    expect(starter.owner).toBeNull()
    expect(starter.ammo).toBe(23)
    input.stop()
  })

  it('freezes bleeding and blocks weapon actions while paused, then resumes', () => {
    const { scene, input, frame, tap } = setup()
    const fat = scene.enemies[3]!
    fat.receiveHit()
    tap('Escape')
    input.rightClicks.push(new Vector2(0, 0))
    frame(5)
    expect(fat.bleedRemaining).toBe(2.5)
    expect(scene.player.weapon).not.toBeNull()
    tap('Escape')
    frame(2.5)
    expect(fat.hit).toBe(true)
    expect(scene.player.weapon).not.toBeNull()
    input.stop()
  })

  it('applies fat damage through projectiles and dog contact through game over', () => {
    const { scene, input, frame } = setup()
    const fat = scene.enemies[3]!
    const point = fat.transform.position
    scene.projectiles.push(new Projectile(point.x + 32, point.y + 32, 0, { owner: scene.player }))
    frame()
    expect(fat.health).toBe(2)
    expect(fat.hit).toBe(false)
    frame(2.5)
    expect(fat.hit).toBe(true)
    const dog = scene.enemies[4]!
    scene.player.transform.position.set(dog.transform.position.x, dog.transform.position.y)
    frame()
    expect(scene.isGameOver).toBe(true)
    expect(scene.player.controlsEnabled).toBe(false)
    expect(scene.player.weapon).toBeNull()
    input.stop()
  })
})
