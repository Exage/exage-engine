import { describe, expect, it, vi } from 'vitest'
import { Input, Time, Vector2 } from '@/engine'
import type { Renderer } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import { Projectile } from '@/game/entities/Projectile'
import { GameScene } from '@/game/scenes/GameScene'

describe('Shooting', () => {
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
