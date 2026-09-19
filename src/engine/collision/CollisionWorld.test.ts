import { describe, expect, it } from 'vitest'
import { BoxCollider, Entity, Scene, overlaps, sweepAABB } from '@/engine'

function box(scene: Scene, x: number, y: number, width = 10, height = 10): BoxCollider {
  const entity = new Entity()
  entity.transform.position.set(x, y)
  entity.collider = new BoxCollider(entity, width, height)
  scene.add(entity)
  return entity.collider
}

describe('BoxCollider', () => {
  it('can follow rotation at runtime while keeping the same center and local dimensions', () => {
    const scene = new Scene()
    const collider = box(scene, 100, 200, 40, 20)
    collider.entity.transform.rotation = Math.PI / 2
    expect(collider.bounds).toEqual({ x: 100, y: 200, width: 40, height: 20 })
    collider.followRotation = true
    expect(collider.shape.rotation).toBe(Math.PI / 2)
    expect(collider.bounds.x).toBeCloseTo(110)
    expect(collider.bounds.y).toBeCloseTo(190)
    expect(collider.bounds.width).toBeCloseTo(20)
    expect(collider.bounds.height).toBeCloseTo(40)
    collider.followRotation = false
    expect(collider.shape.rotation).toBe(0)
  })

  it('uses the actual rotated shape instead of its enclosing rectangle for overlaps', () => {
    const scene = new Scene()
    const bar = box(scene, 0, 0, 100, 4)
    bar.followRotation = true
    bar.entity.transform.rotation = Math.PI / 4
    const corner = box(scene, 20, 25, 4, 4)
    expect(overlaps(bar.bounds, corner.bounds)).toBe(true)
    expect(bar.overlaps(corner)).toBe(false)
    expect(corner.overlaps(bar)).toBe(false)
    corner.entity.transform.position.set(48, 0)
    expect(bar.overlaps(corner)).toBe(true)
    expect(corner.overlaps(bar)).toBe(true)
  })

  it('follows its owner and offsets independently of visual rotation and scale', () => {
    const entity = new Entity()
    const collider = new BoxCollider(entity, 20, 30, -10, -15)
    entity.transform.position.set(100, 200)
    entity.transform.rotation = Math.PI / 4
    entity.transform.scale.set(2, 2)
    expect(collider.bounds).toEqual({ x: 90, y: 185, width: 20, height: 30 })
    entity.transform.position.x += 5
    expect(collider.bounds.x).toBe(95)
  })

  it.each([0, -1, NaN, Infinity])('rejects invalid dimensions: %s', (size) => {
    expect(() => new BoxCollider(new Entity(), size, 10)).toThrow(RangeError)
    expect(() => new BoxCollider(new Entity(), 10, size)).toThrow(RangeError)
  })

  it('distinguishes overlaps from touching and ignores itself or disabled boxes', () => {
    const scene = new Scene()
    const a = box(scene, 0, 0)
    const b = box(scene, 10, 0)
    expect(a.overlaps(b)).toBe(false)
    b.entity.transform.position.x = 9
    expect(a.overlaps(b)).toBe(true)
    expect(a.overlaps(a)).toBe(false)
    b.enabled = false
    expect(a.overlaps(b)).toBe(false)
  })
})

describe('CollisionWorld', () => {
  it('sweeps two rotated boxes using their faces rather than enclosing bounds', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 10, 100, 4)
    const wall = box(scene, 0, 0, 100, 4)
    for (const collider of [mover, wall]) {
      collider.followRotation = true
      collider.entity.transform.rotation = Math.PI / 4
    }
    expect(overlaps(mover.bounds, wall.bounds)).toBe(true)
    expect(mover.overlaps(wall)).toBe(false)
    expect(scene.collisions.cast(mover, 0, -20)?.time).toBeCloseTo((10 - 4 * Math.sqrt(2)) / 20)
    scene.collisions.move(mover, 0, -20)
    expect(mover.overlaps(wall)).toBe(false)
  })

  it('stops a rotated mover at its corner, then allows movement away from the wall', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 0, 40, 40)
    mover.followRotation = true
    mover.entity.transform.rotation = Math.PI / 4
    const wall = box(scene, 100, -100, 1, 400)
    scene.collisions.move(mover, 1000, 0)
    expect(mover.entity.transform.position.x).toBeCloseTo(80 - 20 * Math.sqrt(2))
    expect(mover.overlaps(wall)).toBe(false)
    scene.collisions.move(mover, -10, 0)
    expect(mover.entity.transform.position.x).toBeCloseTo(70 - 20 * Math.sqrt(2))
  })

  it('slides along a thin rotated wall without tunneling or sticking on later frames', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 50)
    const wall = box(scene, -100, 98, 400, 4)
    wall.followRotation = true
    wall.entity.transform.rotation = Math.PI / 4
    scene.collisions.move(mover, 200, 0)
    expect(mover.entity.transform.position.x).toBeGreaterThan(100)
    expect(mover.entity.transform.position.y).toBeGreaterThan(100)
    expect(mover.overlaps(wall)).toBe(false)
    const previous = mover.entity.transform.position.clone()
    scene.collisions.move(mover, 10, 0)
    expect(mover.entity.transform.position.x).toBeCloseTo(previous.x + 5)
    expect(mover.entity.transform.position.y).toBeCloseTo(previous.y + 5)
    expect(mover.overlaps(wall)).toBe(false)
  })

  it('separates an initial overlap with a rotated obstacle', () => {
    const scene = new Scene()
    const mover = box(scene, 45, 0)
    const wall = box(scene, 0, 0, 100, 4)
    wall.followRotation = true
    wall.entity.transform.rotation = Math.PI / 4
    expect(mover.overlaps(wall)).toBe(true)
    scene.collisions.move(mover, 0, 0)
    expect(mover.overlaps(wall)).toBe(false)
  })

  it.each([
    [100, 0, 1000, 0, 90, 0],
    [-100, 0, -1000, 0, -90, 0],
    [0, 100, 0, 1000, 0, 90],
    [0, -100, 0, -1000, 0, -90],
  ])('blocks fast movement toward (%s, %s)', (x, y, dx, dy, endX, endY) => {
    const scene = new Scene()
    const mover = box(scene, 0, 0)
    box(scene, x, y)
    scene.collisions.move(mover, dx, dy)
    expect(mover.entity.transform.position).toMatchObject({ x: endX, y: endY })
    expect(scene.collisions.overlaps(mover)).toEqual([])
  })

  it('catches thin obstacles on a diagonal path between frames', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 0)
    box(scene, 50, 40, 1, 20)
    scene.collisions.move(mover, 100, 100)
    expect(mover.entity.transform.position).toMatchObject({ x: 40, y: 100 })
  })

  it('slides along a wall, stays blocked across frames, and can move away', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 0)
    box(scene, 50, -100, 1, 400)
    scene.collisions.move(mover, 100, 30)
    expect(mover.entity.transform.position).toMatchObject({ x: 40, y: 30 })
    scene.collisions.move(mover, 100, 30)
    expect(mover.entity.transform.position).toMatchObject({ x: 40, y: 60 })
    scene.collisions.move(mover, -20, 30)
    expect(mover.entity.transform.position).toMatchObject({ x: 20, y: 90 })
  })

  it('stops at a corner regardless of obstacle registration order', () => {
    for (const reverse of [false, true]) {
      const scene = new Scene()
      const mover = box(scene, 0, 0)
      box(scene, 50, -100, 10, 300)
      box(scene, -100, 50, 300, 10)
      if (reverse) {
        scene.entities.reverse()
      }
      scene.collisions.move(mover, 100, 100)
      expect(mover.entity.transform.position).toMatchObject({ x: 40, y: 40 })
    }
  })

  it('chooses the nearest obstacle and observes live additions and removals', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 0)
    box(scene, 100, 0)
    const near = box(scene, 30, 0)
    expect(scene.collisions.cast(mover, 200, 0)?.collider).toBe(near)
    scene.entities.splice(scene.entities.indexOf(near.entity), 1)
    expect(scene.collisions.cast(mover, 200, 0)?.time).toBeCloseTo(0.45)
  })

  it('queries triggers without blocking and ignores disabled colliders', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 0)
    const trigger = box(scene, 20, 0)
    trigger.isTrigger = true
    const disabled = box(scene, 10, 0)
    disabled.enabled = false
    scene.collisions.move(mover, 20, 0)
    expect(mover.entity.transform.position.x).toBe(20)
    expect(scene.collisions.overlaps(mover)).toEqual([trigger])
    mover.enabled = false
    expect(scene.collisions.overlaps(mover)).toEqual([])
  })

  it('recovers a simple initial overlap and handles collider offsets', () => {
    const scene = new Scene()
    const mover = box(scene, 0, 0)
    box(scene, 8, 0)
    scene.collisions.move(mover, 0, 0)
    expect(mover.entity.transform.position.x).toBe(-2)
    const offset = new BoxCollider(mover.entity, 10, 10, -5, 0)
    mover.entity.collider = offset
    scene.collisions.move(offset, 100, 0)
    expect(mover.entity.transform.position.x).toBe(3)
  })

  it('lets disabled movers and triggers move freely', () => {
    for (const property of ['enabled', 'isTrigger'] as const) {
      const scene = new Scene()
      const mover = box(scene, 0, 0)
      mover[property] = property === 'isTrigger'
      box(scene, 20, 0)
      scene.collisions.move(mover, 50, 0)
      expect(mover.entity.transform.position.x).toBe(50)
    }
  })
})

describe('sweepAABB', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 }

  it('rejects targets off the path or behind the movement', () => {
    expect(sweepAABB(a, { ...a, x: 50, y: 50 }, 100, 0)).toBeNull()
    expect(sweepAABB(a, { ...a, x: -50 }, 100, 0)).toBeNull()
    expect(sweepAABB(a, { ...a, x: 50 }, 0, 0)).toBeNull()
  })

  it('reports initial overlap and exact end-of-segment contact', () => {
    expect(sweepAABB(a, a, 0, 0)?.time).toBe(0)
    expect(sweepAABB(a, { ...a, x: 50 }, 40, 0)).toEqual({
      time: 1,
      normalX: -1,
      normalY: 0,
    })
  })

  it('does not block a path that only grazes a corner', () => {
    expect(sweepAABB(a, { ...a, x: 20, y: 0 }, 20, 20)).toBeNull()
  })
})
