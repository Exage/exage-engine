import { describe, expect, it } from 'vitest'
import { HitboxWorld, Input } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import type { EnemyOptions } from '@/game/entities/EnemyConfig'
import { Player } from '@/game/entities/Player'
import { Wall } from '@/game/entities/Wall'

function setup(options: EnemyOptions = {}, walls: Wall[] = []) {
  const enemy = new Enemy(0, 0, {
    vision: { angleDegrees: 360 },
    movement: { speed: 100 },
    weapon: { initialDelay: 0 },
    ...options,
  })
  const player = new Player(new Input())
  player.transform.position.set(204, 4)
  const entities = [enemy, player, ...walls]
  const world = new HitboxWorld(entities)
  const tick = (dt: number) => enemy.attack(dt, player, world, entities)
  const hide = () => player.transform.position.set(2000, 2000)
  return { enemy, player, entities, world, tick, hide }
}

describe('Enemy investigation and search destinations', () => {
  it('runs to the last observed center without tracking a hidden player, then returns home', () => {
    const { enemy, player, tick, hide } = setup()
    expect(tick(0)).not.toBeNull()
    expect(enemy.lastSeenPosition).toEqual({ x: 224, y: 24 })
    hide()
    expect(tick(1)).toBeNull()
    expect(enemy.activity).toBe('investigate')
    expect(enemy.transform.position).toMatchObject({ x: 100, y: 0 })
    player.transform.position.set(-2000, -2000)
    expect(tick(5)).toBeNull()
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 0 })
    expect(enemy.lastSeenPosition).toBeNull()
    expect(enemy.activity).toBe('return')
    tick(2)
    expect(enemy.activity).toBe('guard')
    expect(enemy.transform.position).toMatchObject({ x: 0, y: 0 })
    expect(enemy.transform.rotation).toBe(0)
  })

  it('investigates when a wall hides the player and reacquires sight during the search', () => {
    const wall = new Wall(180, -100, 10, 400)
    wall.collider.enabled = false
    const { enemy, player, tick } = setup({}, [wall])
    tick(0)
    wall.collider.enabled = true
    player.transform.position.set(304, 104)
    expect(tick(0.5)).toBeNull()
    expect(enemy.activity).toBe('investigate')
    expect(enemy.lastSeenPosition).toEqual({ x: 224, y: 24 })
    expect(Math.hypot(enemy.transform.position.x, enemy.transform.position.y)).toBeCloseTo(50)
    expect(enemy.transform.position.y).toBeLessThan(0)
    wall.collider.enabled = false
    tick(0)
    expect(enemy.activity).toBe('chase')
    expect(enemy.lastSeenPosition).toEqual({ x: 324, y: 124 })
  })

  it('can reacquire the player at the investigation destination instead of returning', () => {
    const { enemy, player, tick, hide } = setup({ vision: { range: 220, angleDegrees: 360 } })
    tick(0)
    hide()
    tick(1)
    player.transform.position.set(404, 4)
    tick(1)
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 0 })
    expect(enemy.activity).toBe('chase')
    expect(enemy.lastSeenPosition).toEqual({ x: 424, y: 24 })
  })

  it('walks to the nearest wall, turns away, and holds without adding a collider', () => {
    const wall = new Wall(400, -100, 10, 400)
    const { enemy, tick, hide } = setup({ search: { after: 'nearest-wall' } }, [wall])
    tick(0)
    hide()
    tick(2)
    expect(enemy.activity).toBe('relocate')
    tick(10)
    expect(enemy.transform.position.x).toBeCloseTo(400 - 24 - Math.hypot(48, 48) / 2 - 8)
    expect(enemy.transform.position.y).toBeCloseTo(0)
    expect(enemy.transform.rotation).toBeCloseTo(Math.PI)
    expect(enemy.activity).toBe('hold')
    const position = enemy.transform.position.clone()
    tick(10)
    expect(enemy.transform.position).toEqual(position)
    expect(enemy.collider).toBeNull()
  })

  it('adopts a permitted zone outside its cone and patrols there', () => {
    const area = { x: 150, y: 100, width: 248, height: 148 }
    const { enemy, tick, hide } = setup({
      vision: { angleDegrees: 60 },
      search: { after: 'nearest-patrol', patrolAreas: [area] },
    })
    tick(0)
    hide()
    tick(2)
    expect(enemy.activePatrolArea).toEqual(area)
    tick(Math.hypot(50, 100) / 100 + 0.5)
    expect(enemy.transform.position.x).toBeCloseTo(200)
    expect(enemy.transform.position.y).toBeCloseTo(100)
    expect(enemy.activity).toBe('patrol')
  })

  it('falls back to a wall when zone B is forbidden instead of returning to zone A', () => {
    const areaA = { x: 0, y: 100, width: 148, height: 148 }
    const areaB = { x: 150, y: -50, width: 148, height: 148, allowSearchPatrol: false }
    const wall = new Wall(400, -100, 10, 400)
    const { enemy, tick, hide } = setup(
      {
        behavior: { mode: 'patrol', area: areaA },
        search: { after: 'nearest-patrol', patrolAreas: [areaA, areaB] },
      },
      [wall]
    )
    tick(0)
    hide()
    tick(2)
    expect(enemy.activePatrolArea).toBeNull()
    expect(enemy.activity).toBe('relocate')
    tick(10)
    expect(enemy.transform.position.x).toBeCloseTo(400 - 24 - Math.hypot(48, 48) / 2 - 8)
    expect(enemy.transform.position.y).toBeCloseTo(0)
    expect(enemy.activity).toBe('hold')
  })

  it('uses wall fallback with no zones and holds safely if no wall is in range', () => {
    const wall = new Wall(1000, -100, 10, 400)
    const { enemy, tick, hide } = setup(
      {
        search: { after: 'nearest-patrol', wallSearchRange: 100 },
      },
      [wall]
    )
    tick(0)
    hide()
    tick(2)
    expect(enemy.activity).toBe('hold')
    tick(20)
    expect(enemy.transform.position).toMatchObject({ x: 200, y: 0 })
  })

  it('abandons a wall destination when it sees a player again', () => {
    const wall = new Wall(400, -100, 10, 400)
    const { enemy, player, tick, hide } = setup({ search: { after: 'nearest-wall' } }, [wall])
    tick(0)
    hide()
    tick(2)
    tick(0.1)
    player.transform.position.set(104, 104)
    tick(0)
    expect(enemy.activity).toBe('chase')
    expect(enemy.lastSeenPosition).toEqual({ x: 124, y: 124 })
    hide()
    tick(0.1)
    expect(enemy.activity).toBe('investigate')
    expect(enemy.transform.position.x).toBeLessThan(210)
  })

  it('freezes investigation when defeated and supports zero movement speed', () => {
    const { enemy, tick, hide } = setup()
    tick(0)
    hide()
    tick(0.5)
    enemy.hit = true
    tick(5)
    expect(enemy.activity).toBe('defeated')
    expect(enemy.lastSeenPosition).toBeNull()
    expect(enemy.transform.position).toMatchObject({ x: 50, y: 0 })
    const stationary = setup({ movement: { speed: 0 } })
    stationary.tick(0)
    stationary.hide()
    stationary.tick(10)
    expect(stationary.enemy.activity).toBe('investigate')
    expect(stationary.enemy.transform.position).toMatchObject({ x: 0, y: 0 })
  })

  it('copies search zones, including eligibility, without changing the input', () => {
    const area = { x: 0, y: 0, width: 148, height: 148, allowSearchPatrol: false }
    const { enemy } = setup({ search: { after: 'nearest-patrol', patrolAreas: [area] } })
    area.x = 1000
    area.allowSearchPatrol = true
    expect(enemy.config.search.patrolAreas[0]).toMatchObject({ x: 0, allowSearchPatrol: false })
    expect(Object.isFrozen(enemy.config.search.patrolAreas[0])).toBe(true)
  })

  it.each<EnemyOptions['search']>([
    { speed: -1 },
    { speed: NaN },
    { wallSearchRange: Infinity },
    { wallClearance: -1 },
    { patrolAreas: [{ x: 0, y: 0, width: 10, height: 100 }] },
  ])('rejects invalid search settings: %j', (search) => {
    expect(() => setup({ search })).toThrow(RangeError)
  })
})
