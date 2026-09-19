import { describe, expect, it, vi } from 'vitest'
import { BoxCollider, Entity, Input, Time, Vector2 } from '@/engine'
import type { Renderer } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import { Projectile } from '@/game/entities/Projectile'
import { GameScene } from '@/game/scenes/GameScene'

describe('Shooting', () => {
  it('hits a rotated wall but passes through empty corners of its enclosing rectangle', () => {
    const wall = new Entity()
    wall.transform.position.set(100, 100)
    wall.collider = new BoxCollider(wall, 100, 4)
    wall.collider.followRotation = true
    wall.transform.rotation = Math.PI / 4
    const miss = new Projectile(110, 130, 0)
    miss.update(0.01)
    expect(miss.contact(wall)).toBeNull()
    const hit = new Projectile(0, 102, 0)
    hit.update(0.3)
    expect(hit.contact(wall)).toBeGreaterThan(0.4)
    expect(hit.contact(wall)).toBeLessThan(0.5)
  })

  it.each([
    [true, false, false],
    [false, false, true],
    [true, true, true],
  ])(
    'respects wall colliders (enabled=%s, trigger=%s, enemy hit=%s)',
    (enabled, isTrigger, hit) => {
      const scene = new GameScene(new Input(), new Time(), 1280, 720)
      const enemy = new Enemy(3140, 996)
      scene.add(enemy)
      const wall = new Entity()
      wall.transform.position.set(3080, 990)
      wall.collider = new BoxCollider(wall, 1, 100)
      wall.collider.enabled = enabled
      wall.collider.isTrigger = isTrigger
      scene.add(wall)
      scene.projectiles.push(new Projectile(3020, 1020, 0))
      scene.update(0.2)
      expect(enemy.hit).toBe(hit)
      expect(scene.projectiles).toHaveLength(0)
    }
  )

  it('uses hitboxes independently of physical colliders and ignores disabled hitboxes', () => {
    const projectile = new Projectile(0, 24, 0)
    projectile.update(0.1)
    expect(projectile.contact(new Entity())).toBeNull()
    const enemy = new Enemy(30, 0)
    expect(enemy.collider).toBeNull()
    expect(projectile.contact(enemy)).toBeCloseTo(0.26)
    enemy.hitboxes[0]!.enabled = false
    expect(projectile.contact(enemy)).toBeNull()
  })

  it('stops targeting defeated enemies until their hitboxes are re-enabled', () => {
    const enemy = new Enemy(30, 0)
    enemy.hit = true
    const projectile = new Projectile(0, 24, 0)
    projectile.update(0.1)
    expect(projectile.contact(enemy)).toBeNull()
    expect(enemy.collider).toBeNull()
    expect(enemy.hitboxes[0]!.enabled).toBe(false)
    enemy.hit = false
    expect(projectile.contact(enemy)).toBeCloseTo(0.26)
  })

  it('detects targets crossed between frames and rejects off-path targets', () => {
    const projectile = new Projectile(0, 24, 0)
    projectile.update(0.1)
    expect(projectile.contact(new Enemy(30, 0))).toBeCloseTo(0.26)
    expect(projectile.contact(new Enemy(30, 100))).toBeNull()
    expect(projectile.contact(new Enemy(-100, 0))).toBeNull()
  })

  it('aims through an offset camera, hits only the nearest enemy, and renders it gray', () => {
    const input = new Input()
    const scene = new GameScene(input, new Time(), 1280, 720)
    scene.enemies.length = 0
    const near = new Enemy(3080, 996)
    const far = new Enemy(3140, 996)
    scene.enemies.push(far, near)
    scene.add(far)
    scene.add(near)
    scene.player.transform.position.set(3000, 1000)
    scene.update(0)
    input.pointer = new Vector2(900, 360)
    input.clicks.push(input.pointer.clone())
    scene.update(0.1)
    expect(scene.player.transform.rotation).toBe(0)
    expect(near.hit).toBe(true)
    expect(far.hit).toBe(false)
    expect(scene.projectiles).toHaveLength(0)
    input.endFrame()
    scene.update(0.1)
    expect(far.hit).toBe(false)
    const renderer = { drawRect: vi.fn() }
    near.render(renderer as unknown as Renderer)
    expect(renderer.drawRect).toHaveBeenCalledWith(3080, 996, 48, 48, '#777f89')
  })

  it('expires projectiles that do not hit targets', () => {
    const projectile = new Projectile(0, 0, Math.PI / 2)
    projectile.update(4)
    expect(projectile.expired).toBe(true)
    expect(projectile.transform.position.y).toBeCloseTo(4000)
  })
})
