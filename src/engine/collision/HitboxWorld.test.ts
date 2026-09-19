import { describe, expect, it } from 'vitest'
import { BoxCollider, Entity, Hitbox, Scene } from '@/engine'
import type { HitboxOptions, OrientedBox } from '@/engine'

const shot: OrientedBox = { x: -2, y: 8, width: 4, height: 4, rotation: 0 }

function target(scene: Scene, x: number, options: Partial<HitboxOptions> = {}): Entity {
  const entity = new Entity()
  entity.transform.position.x = x
  entity.hitboxes.push(new Hitbox(entity, { id: 'body', width: 20, height: 20, ...options }))
  scene.add(entity)
  return entity
}

function wall(scene: Scene, x: number): Entity {
  const entity = new Entity()
  entity.transform.position.set(x, -100)
  entity.collider = new BoxCollider(entity, 1, 200)
  scene.add(entity)
  return entity
}

describe('Hitbox', () => {
  it('uses live owner transforms and allows rotation independent of a collider', () => {
    const entity = new Entity()
    entity.collider = new BoxCollider(entity, 20, 10)
    const hitbox = new Hitbox(entity, { id: 'body', width: 20, height: 10, offsetX: 5 })
    entity.transform.position.set(100, 200)
    entity.transform.rotation = Math.PI / 2
    expect(hitbox.shape).toEqual({ x: 105, y: 200, width: 20, height: 10, rotation: Math.PI / 2 })
    expect(hitbox.bounds.width).toBeCloseTo(10)
    expect(hitbox.bounds.height).toBeCloseTo(20)
    expect(entity.collider.shape.rotation).toBe(0)
    hitbox.followRotation = false
    expect(hitbox.shape.rotation).toBe(0)
    entity.transform.position.x = 300
    expect(hitbox.shape.x).toBe(305)
  })

  it('rotates offset body regions around a shared local pivot', () => {
    const entity = new Entity()
    const hitbox = new Hitbox(entity, {
      id: 'head',
      width: 10,
      height: 10,
      offsetX: 30,
      offsetY: 15,
      pivotX: 20,
      pivotY: 20,
    })
    entity.transform.rotation = Math.PI / 2
    expect(hitbox.shape.x).toBeCloseTo(15)
    expect(hitbox.shape.y).toBeCloseTo(30)
    hitbox.followRotation = false
    expect(hitbox.shape.x).toBe(30)
    expect(hitbox.shape.y).toBe(15)
  })

  it.each([{ id: '' }, { width: 0 }, { height: -1 }, { offsetX: Infinity }, { pivotY: NaN }])(
    'validates geometry and identifiers (%j)',
    (options) => {
      expect(
        () => new Hitbox(new Entity(), { id: 'body', width: 10, height: 10, ...options })
      ).toThrow(RangeError)
    }
  )
})

describe('HitboxWorld', () => {
  it('returns the nearest named region, owning entity, contact fraction, and attack position', () => {
    const scene = new Scene()
    target(scene, 200)
    const enemy = target(scene, 100)
    const head = new Hitbox(enemy, { id: 'head', width: 5, height: 20, offsetX: -30 })
    enemy.hitboxes.push(head)
    const hit = scene.hitboxes.cast(shot, 300, 0)
    expect(hit?.kind).toBe('hitbox')
    expect(hit?.entity).toBe(enemy)
    expect(hit?.time).toBeCloseTo(68 / 300)
    expect(hit?.position).toMatchObject({ x: 68, y: 10 })
    expect(hit?.normalX).toBe(-1)
    if (hit?.kind === 'hitbox') {
      expect(hit.hitbox).toBe(head)
      expect(hit.hitbox.id).toBe('head')
    }
  })

  it('does not use hitboxes to block physical movement', () => {
    const scene = new Scene()
    target(scene, 50)
    const mover = new Entity()
    mover.collider = new BoxCollider(mover, 10, 10)
    scene.add(mover)
    scene.collisions.move(mover.collider, 200, 0)
    expect(mover.transform.position.x).toBe(200)
    expect(scene.hitboxes.cast(shot, 200, 0)?.kind).toBe('hitbox')
  })

  it('lets movement colliders and hit regions have different sizes', () => {
    const scene = new Scene()
    const enemy = target(scene, 100)
    enemy.collider = new BoxCollider(enemy, 100, 100, -50)
    enemy.collider.blocksHits = false
    expect(scene.hitboxes.cast(shot, 200, 0)?.time).toBeCloseTo(98 / 200)
    enemy.hitboxes[0]!.enabled = false
    expect(scene.hitboxes.cast(shot, 200, 0)).toBeNull()
    expect(enemy.collider.enabled).toBe(true)
  })

  it('returns walls before targets and targets before walls, regardless of insertion order', () => {
    const scene = new Scene()
    const enemy = target(scene, 100)
    const obstacle = wall(scene, 50)
    expect(scene.hitboxes.cast(shot, 200, 0)?.kind).toBe('blocker')
    expect(scene.hitboxes.cast(shot, 200, 0)?.entity).toBe(obstacle)
    scene.entities.reverse()
    expect(scene.hitboxes.cast(shot, 200, 0)?.entity).toBe(obstacle)
    obstacle.transform.position.x = 150
    expect(scene.hitboxes.cast(shot, 200, 0)?.entity).toBe(enemy)
  })

  it('prioritizes unrelated blockers at equal distance, but supports damageable walls', () => {
    const scene = new Scene()
    target(scene, 50)
    const obstacle = wall(scene, 50)
    expect(scene.hitboxes.cast(shot, 200, 0)?.kind).toBe('blocker')
    scene.entities.reverse()
    expect(scene.hitboxes.cast(shot, 200, 0)?.kind).toBe('blocker')
    obstacle.hitboxes.push(new Hitbox(obstacle, { id: 'wall', width: 1, height: 200 }))
    const hit = scene.hitboxes.cast(shot, 200, 0)
    expect(hit?.kind).toBe('hitbox')
    expect(hit?.entity).toBe(obstacle)
  })

  it('excludes the attacker and applies game-owned eligibility filters', () => {
    const scene = new Scene()
    const owner = target(scene, 0)
    owner.collider = new BoxCollider(owner, 20, 20)
    const ally = target(scene, 30)
    const enemy = target(scene, 80)
    const options = { ignore: owner, filter: (entity: Entity) => entity !== ally }
    expect(scene.hitboxes.cast(shot, 200, 0, options)?.entity).toBe(enemy)
    expect(scene.hitboxes.overlaps({ ...shot, width: 200 }, options)).toEqual(enemy.hitboxes)
  })

  it('observes live hitbox additions, disabling, removals, and scene removal', () => {
    const scene = new Scene()
    const enemy = target(scene, 50)
    const hitbox = enemy.hitboxes[0]!
    hitbox.enabled = false
    expect(scene.hitboxes.cast(shot, 200, 0)).toBeNull()
    hitbox.enabled = true
    expect(scene.hitboxes.cast(shot, 200, 0)?.entity).toBe(enemy)
    enemy.hitboxes.length = 0
    expect(scene.hitboxes.cast(shot, 200, 0)).toBeNull()
    enemy.hitboxes.push(hitbox)
    scene.entities.length = 0
    expect(scene.hitboxes.cast(shot, 200, 0)).toBeNull()
  })

  it.each(['enabled', 'isTrigger', 'blocksHits'] as const)('respects blocker flag %s', (flag) => {
    const scene = new Scene()
    const obstacle = wall(scene, 50)
    obstacle.collider![flag] = flag === 'isTrigger'
    expect(scene.hitboxes.cast(shot, 200, 0)).toBeNull()
  })

  it('sweeps rotated thin targets and rejects empty corners of their enclosing bounds', () => {
    const scene = new Scene()
    const enemy = target(scene, 100, { width: 100, height: 4 })
    enemy.transform.position.y = 100
    enemy.transform.rotation = Math.PI / 4
    const miss = { x: 108, y: 128, width: 4, height: 4, rotation: 0 }
    expect(scene.hitboxes.cast(miss, 10, 0)).toBeNull()
    const hit = scene.hitboxes.cast({ ...shot, y: 100 }, 1000, 0)
    expect(hit?.entity).toBe(enemy)
    expect(hit?.time).toBeGreaterThan(0.1)
    expect(hit?.time).toBeLessThan(0.2)
  })

  it('supports stationary overlap queries without treating touching edges as overlaps', () => {
    const scene = new Scene()
    const enemy = target(scene, 0)
    expect(scene.hitboxes.overlaps(shot)).toEqual(enemy.hitboxes)
    expect(scene.hitboxes.cast(shot, 0, 0)?.time).toBe(0)
    expect(scene.hitboxes.overlaps({ ...shot, x: 20 })).toEqual([])
    enemy.hitboxes[0]!.enabled = false
    expect(scene.hitboxes.overlaps(shot)).toEqual([])
  })
})
