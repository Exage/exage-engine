import { afterEach, describe, expect, it, vi } from 'vitest'
import { Input, Time, Vector2 } from '@/engine'
import type { Renderer } from '@/engine'
import { Projectile } from '@/game/entities/Projectile'
import { GameScene } from '@/game/scenes/GameScene'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function setup(environment: 'development' | 'production' = 'production') {
  vi.stubEnv('VITE_ENVIRONMENT', environment)
  const target = new EventTarget()
  vi.stubGlobal('window', target)
  vi.stubGlobal('document', new EventTarget())
  const input = new Input()
  const scene = new GameScene(input, new Time(), 800, 600)
  input.start()
  scene.player.transform.position.set(3000, 1000)
  const frame = (dt = 0): void => {
    scene.update(dt)
    input.endFrame()
  }
  const key = (type: 'keydown' | 'keyup', code: string, repeat = false, metaKey = false): void => {
    target.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { code, repeat, metaKey })
    )
  }
  const tap = (code: string, metaKey = false): void => {
    key('keydown', code, false, metaKey)
    key('keyup', code)
    frame()
  }
  const renderer = {
    setCamera: vi.fn(),
    drawRect: vi.fn(),
    drawText: vi.fn(),
    drawRotatedRect: vi.fn(),
  }
  return { input, scene, frame, key, tap, renderer }
}

describe('Escape pause', () => {
  it.each(['development', 'production'] as const)(
    'freezes simulation and discards paused clicks in %s',
    (environment) => {
      const { input, scene, frame, key, tap } = setup(environment)
      const shot = new Projectile(4000, 1500, 0)
      scene.projectiles.push(shot)
      const updatePlayer = vi.spyOn(scene.player, 'update')
      const updateEnemy = vi.spyOn(scene.enemies[0]!, 'update')
      const attack = vi.spyOn(scene.enemies[0]!, 'attack')
      const position = scene.player.transform.position.clone()
      const camera = scene.camera.position.clone()
      key('keydown', 'KeyD')
      key('keydown', 'Escape')
      input.pointer = new Vector2(0, 0)
      input.clicks.push(new Vector2(0, 0))
      frame(1)
      key('keydown', 'Escape', true)
      input.clicks.push(new Vector2(0, 0))
      frame(10)
      expect(updatePlayer).not.toHaveBeenCalled()
      expect(updateEnemy).not.toHaveBeenCalled()
      expect(attack).not.toHaveBeenCalled()
      expect(scene.player.transform.position).toEqual(position)
      expect(scene.player.transform.rotation).toBe(0)
      expect(scene.camera.position).toEqual(camera)
      expect(shot.transform.position.x).toBe(4000)
      expect(shot.expired).toBe(false)
      expect(scene.projectiles).toEqual([shot])

      key('keyup', 'Escape')
      input.clicks.push(new Vector2(0, 0))
      tap('Escape')
      expect(scene.player.transform.position).toEqual(position)
      expect(scene.projectiles).toEqual([shot])
      frame(0.1)
      expect(updatePlayer).toHaveBeenCalledWith(0.1)
      expect(updateEnemy).toHaveBeenCalledWith(0.1)
      expect(attack).toHaveBeenCalled()
      expect(scene.player.transform.position.x).toBeCloseTo(position.x + 40)
      expect(shot.transform.position.x).toBeCloseTo(4100)
      expect(scene.projectiles).toEqual([shot])
      input.stop()
    }
  )

  it('renders the pause overlay in screen coordinates after resizing and hides it on resume', () => {
    const { scene, input, tap, renderer } = setup()
    tap('Escape')
    scene.resize(1000, 700)
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawRect).toHaveBeenLastCalledWith(0, 0, 1000, 700, 'rgba(0, 0, 0, 0.65)')
    expect(renderer.drawText).toHaveBeenCalledWith('Paused', 500, 318, expect.anything())
    expect(renderer.drawText).toHaveBeenLastCalledWith('Press [Esc] to resume', 500, 366, {
      fontSize: 16,
      align: 'center',
      color: '#9aaec4',
    })
    expect(renderer.setCamera).toHaveBeenLastCalledWith(null)
    expect(renderer.setCamera.mock.invocationCallOrder.at(-1)).toBeLessThan(
      renderer.drawRect.mock.invocationCallOrder.at(-1)!
    )
    tap('Escape')
    renderer.drawText.mockClear()
    scene.render(renderer as unknown as Renderer)
    expect(renderer.drawText.mock.calls.some(([text]) => text === 'Paused')).toBe(false)
    input.stop()
  })

  it('preserves manual pause when Escape closes the development cheat menu', () => {
    const { scene, input, frame, key, tap } = setup('development')
    tap('Escape')
    const position = scene.player.transform.position.clone()
    key('keydown', 'KeyD')
    tap('KeyX', true)
    tap('Escape')
    frame(0.1)
    expect(scene.player.transform.position).toEqual(position)
    tap('Escape')
    frame(0.1)
    expect(scene.player.transform.position.x).toBeCloseTo(position.x + 40)
    input.stop()
  })
})
