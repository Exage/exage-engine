import { describe, expect, it, vi } from 'vitest'
import { BoxCollider, Entity, Input, Scene } from '@/engine'
import type { Renderer } from '@/engine'
import { Player } from '@/game/entities/Player'

function setup(keys: string[] = []) {
  const held = new Set(keys)
  const input = new Input()
  vi.spyOn(input, 'isDown').mockImplementation((code) => held.has(code))
  return { player: new Player(input), held }
}

describe('Player', () => {
  it('rotates the player and hitbox while keeping its movement collider axis-aligned', () => {
    const scene = new Scene()
    const player = new Player(new Input(), scene.collisions)
    scene.add(player)
    const wall = new Entity()
    wall.transform.position.set(42, -100)
    wall.collider = new BoxCollider(wall, 10, 300)
    scene.add(wall)
    player.aimAt(100, 100)
    expect(player.transform.rotation).toBe(Math.PI / 4)
    expect(player.collider.followRotation).toBe(false)
    expect(player.collider.shape.rotation).toBe(0)
    expect(player.collider.bounds).toEqual({ x: 0, y: 0, width: 40, height: 40 })
    expect(player.hitboxes[0]!.shape.rotation).toBe(Math.PI / 4)
  })

  it.each([
    ['KeyW', 0, -40],
    ['KeyS', 0, 40],
    ['KeyA', -40, 0],
    ['KeyD', 40, 0],
  ] as const)('moves with %s in logical pixels per second', (key, x, y) => {
    const { player } = setup([key])
    player.transform.position.set(100, 200)
    player.update(0.1)
    expect(player.transform.position.x).toBeCloseTo(100 + x)
    expect(player.transform.position.y).toBeCloseTo(200 + y)
  })

  it.each([30, 60, 120])('travels 400 pixels in one second at %i FPS in every direction', (fps) => {
    for (const keys of [
      ['KeyD'],
      ['KeyA'],
      ['KeyW'],
      ['KeyS'],
      ['KeyW', 'KeyD'],
      ['KeyW', 'KeyA'],
      ['KeyS', 'KeyD'],
      ['KeyS', 'KeyA'],
    ]) {
      const { player } = setup(keys)
      for (let frame = 0; frame < fps; frame++) {
        player.update(1 / fps)
      }
      expect(player.transform.position.length()).toBeCloseTo(400)
    }
  })

  it('cancels opposing keys and resets direction after release', () => {
    const { player, held } = setup(['KeyW', 'KeyS', 'KeyA', 'KeyD'])
    player.update(0.1)
    expect(player.transform.position.length()).toBe(0)
    held.delete('KeyA')
    player.update(0.1)
    expect(player.transform.position.x).toBe(40)
    expect(player.transform.position.y).toBe(0)
    held.clear()
    player.update(0.1)
    expect(player.transform.position.x).toBe(40)
    expect(player.transform.position.y).toBe(0)
    held.add('KeyW')
    player.update(0)
    expect(player.transform.position.y).toBe(0)
  })

  it('draws its rectangle through Renderer at its transform position', () => {
    const { player } = setup()
    const renderer = { drawRotatedRect: vi.fn() } as unknown as Renderer
    player.transform.position.set(123, 456)
    player.render(renderer)
    expect(renderer.drawRotatedRect).toHaveBeenCalledWith(123, 456, 40, 40, 0, '#66ccff')
  })
})
