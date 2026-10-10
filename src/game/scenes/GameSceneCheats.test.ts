import { afterEach, describe, expect, it, vi } from 'vitest'
import { Input, Time, Vector2 } from '@/engine'
import type { Renderer } from '@/engine'
import { Projectile } from '@/game/entities/Projectile'
import { GameScene } from '@/game/scenes/GameScene'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function setup(environment: 'development' | 'production' = 'development') {
  vi.stubEnv('VITE_ENVIRONMENT', environment)
  const target = new EventTarget()
  vi.stubGlobal('window', target)
  vi.stubGlobal('document', new EventTarget())
  const input = new Input()
  const scene = new GameScene(input, new Time(), 800, 600)
  input.start()
  scene.player.transform.position.set(3000, 1004)
  scene.enemies[0]!.transform.position.set(3500, 1000)
  const frame = (dt = 0): void => {
    scene.update(dt)
    input.endFrame()
  }
  const key = (code: string, metaKey = false, repeat = false): Event => {
    const event = Object.assign(new Event('keydown', { cancelable: true }), {
      code,
      metaKey,
      repeat,
    })
    target.dispatchEvent(event)
    target.dispatchEvent(Object.assign(new Event('keyup'), { code }))
    frame()
    return event
  }
  return { input, scene, frame, key }
}

describe('Development cheats', () => {
  it('uses a separate shortcut, pauses simulation, and supports keyboard navigation', () => {
    const { scene, input, frame, key } = setup()
    key('KeyX')
    key('Enter')
    expect(scene.player.invulnerable).toBe(false)
    expect(key('KeyX', true).defaultPrevented).toBe(true)
    key('KeyX', true, true)
    const position = scene.player.transform.position.clone()
    const enemyPosition = scene.enemies[1]!.transform.position.clone()
    const shot = new Projectile(4000, 1500, 0)
    scene.projectiles.push(shot)
    vi.spyOn(input, 'isDown').mockImplementation((code) => code === 'KeyD')
    input.pointer = new Vector2(0, 0)
    input.clicks.push(new Vector2(0, 0))
    frame(1)
    expect(scene.player.transform.position).toEqual(position)
    expect(scene.player.transform.rotation).toBe(0)
    expect(scene.enemies[1]!.transform.position).toEqual(enemyPosition)
    expect(shot.transform.position.x).toBe(4000)
    expect(scene.projectiles).toEqual([shot])
    key('Enter')
    expect(scene.player.invulnerable).toBe(true)
    key('ArrowUp')
    key('Space')
    expect(scene.player.hiddenFromEnemies).toBe(true)
    key('ArrowDown')
    key('Enter')
    expect(scene.player.invulnerable).toBe(false)
    key('Escape')
    expect(scene.player.transform.position).toEqual(position)
    frame(0.1)
    expect(scene.player.transform.position.x).toBeCloseTo(position.x + 40)
    expect(shot.transform.position.x).toBeGreaterThan(4000)
    input.stop()
  })

  it('handles mouse rows and close after resize without firing into the world', () => {
    const { scene, input, frame, key } = setup()
    key('KeyX', true)
    scene.resize(1000, 700)
    const renderer = {
      setCamera: vi.fn(),
      drawRect: vi.fn(),
      drawText: vi.fn(),
      drawRotatedRect: vi.fn(),
    }
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawText).toHaveBeenCalledWith('DEV / CHEATS', 300, 226, expect.anything())
    input.pointer = new Vector2(310, 304)
    input.clicks.push(input.pointer.clone())
    frame()
    expect(scene.player.invulnerable).toBe(true)
    // A stationary mouse must not override subsequent keyboard selection.
    key('ArrowDown')
    key('Enter')
    expect(scene.player.hiddenFromEnemies).toBe(true)
    input.clicks.push(new Vector2(310, 360))
    frame()
    expect(scene.player.hiddenFromEnemies).toBe(false)
    input.clicks.push(new Vector2(690, 240))
    frame()
    expect(scene.projectiles).toHaveLength(0)
    renderer.drawText.mockClear()
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawText.mock.calls.some(([text]) => text === 'DEV / CHEATS')).toBe(false)
    input.stop()
  })

  it('survives enemy hits when enabled, restores damage when disabled, and keeps cheats on restart', () => {
    const { scene, input, frame, key } = setup()
    const hitPlayer = (): void => {
      const { x, y } = scene.player.transform.position
      scene.projectiles.push(new Projectile(x + 20, y + 20, 0, { owner: scene.enemies[0]! }))
      frame()
    }
    key('KeyX', true)
    key('Enter')
    key('KeyX', true)
    hitPlayer()
    expect(scene.isGameOver).toBe(false)
    expect(scene.player.controlsEnabled).toBe(true)
    expect(scene.projectiles).toHaveLength(0)
    key('KeyX', true)
    key('Enter')
    key('Escape')
    hitPlayer()
    expect(scene.isGameOver).toBe(true)
    key('KeyX', true)
    key('Enter')
    key('Escape')
    key('KeyR')
    expect(scene.isGameOver).toBe(false)
    expect(scene.player.invulnerable).toBe(true)
    hitPlayer()
    expect(scene.isGameOver).toBe(false)
    input.stop()
  })

  it('breaks live detection but preserves last-seen investigation, then restores detection', () => {
    const { scene, input, frame, key } = setup()
    const guard = scene.enemies[0]!
    const patroller = scene.enemies[1]!
    frame()
    expect(guard.playerVisible).toBe(true)
    key('KeyX', true)
    key('ArrowDown')
    key('Enter')
    key('Escape')
    const guardPosition = guard.transform.position.clone()
    const patrolPosition = patroller.transform.position.clone()
    frame(2)
    expect(guard.playerVisible).toBe(false)
    expect(guard.canSee(scene.player, scene.hitboxes)).toBe(false)
    expect(guard.transform.position.x).toBeLessThan(guardPosition.x)
    expect(guard.activity).toBe('investigate')
    expect(patroller.transform.position).not.toEqual(patrolPosition)
    expect(scene.projectiles).toHaveLength(0)
    key('KeyX', true)
    key('Enter')
    key('Escape')
    frame(0.1)
    expect(guard.playerVisible).toBe(true)
    expect(guard.transform.position.x).toBeLessThan(guardPosition.x)
    expect(scene.projectiles.some((shot) => shot.owner === guard)).toBe(true)
    input.stop()
  })

  it('does not grant invulnerability to an invisible player', () => {
    const { scene, input, frame, key } = setup()
    key('KeyX', true)
    key('ArrowDown')
    key('Enter')
    key('Escape')
    scene.projectiles.push(new Projectile(3020, 1024, 0, { owner: scene.enemies[0]! }))
    frame()
    expect(scene.isGameOver).toBe(true)
    input.stop()
  })

  it('ignores the menu shortcut and both cheat flags in production', () => {
    const { scene, input, frame, key } = setup('production')
    expect(key('KeyX', true).defaultPrevented).toBe(false)
    key('Enter')
    expect(scene.player.invulnerable).toBe(false)
    scene.player.invulnerable = true
    scene.player.hiddenFromEnemies = true
    expect(scene.enemies[0]!.canSee(scene.player, scene.hitboxes)).toBe(true)
    scene.projectiles.push(new Projectile(3020, 1024, 0, { owner: scene.enemies[0]! }))
    frame()
    expect(scene.isGameOver).toBe(true)
    const renderer = {
      setCamera: vi.fn(),
      drawRect: vi.fn(),
      drawText: vi.fn(),
      drawRotatedRect: vi.fn(),
    }
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawText.mock.calls.some(([text]) => /cheats/i.test(text))).toBe(false)
    input.stop()
  })
})
