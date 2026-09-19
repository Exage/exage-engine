import { describe, expect, it, vi } from 'vitest'
import { Entity } from '@/engine/entities/Entity'
import type { Renderer } from '@/engine/rendering/Renderer'
import { Scene } from '@/engine/scene/Scene'

describe('Scene', () => {
  it('updates and renders entities in insertion order with shared frame arguments', () => {
    const scene = new Scene()
    const calls: string[] = []
    const renderer = { drawRect: vi.fn() } as unknown as Renderer

    class MovingEntity extends Entity {
      constructor(private readonly name: string) {
        super()
      }

      override update(dt: number): void {
        calls.push(`update ${this.name}`)
        this.transform.position.x += 200 * dt
      }

      override render(target: Renderer): void {
        expect(target).toBe(renderer)
        calls.push(`render ${this.name}`)
        target.drawRect(this.transform.position.x, 0, 10, 10)
      }
    }

    const first = new MovingEntity('first')
    const second = new MovingEntity('second')
    scene.add(first)
    scene.add(second)
    scene.update(0.02)
    scene.render(renderer)
    expect(calls).toEqual(['update first', 'update second', 'render first', 'render second'])
    expect(renderer.drawRect).toHaveBeenNthCalledWith(1, 4, 0, 10, 10)
    expect(renderer.drawRect).toHaveBeenNthCalledWith(2, 4, 0, 10, 10)
    expect(scene.entities).toEqual([first, second])
    expect(new Scene().entities).toEqual([])

    first.zIndex = 10
    calls.length = 0
    scene.update(0.02)
    scene.render(renderer)
    expect(calls).toEqual(['update first', 'update second', 'render second', 'render first'])
    expect(scene.entities).toEqual([first, second])
  })
})
