import { describe, expect, it } from 'vitest'
import { Camera2D } from '@/engine/rendering/Camera2D'

describe('Camera2D', () => {
  it('centers on the target and stops at every world boundary', () => {
    const camera = new Camera2D(1280, 720)
    camera.follow(3000, 1000, 6000, 2000)
    expect(camera.position).toMatchObject({ x: 2360, y: 640 })
    camera.follow(-100, -100, 6000, 2000)
    expect(camera.position).toMatchObject({ x: 0, y: 0 })
    camera.follow(7000, 3000, 6000, 2000)
    expect(camera.position).toMatchObject({ x: 4720, y: 1280 })
  })

  it('anchors worlds smaller than the viewport at the origin', () => {
    const camera = new Camera2D(1280, 720)
    camera.follow(100, 100, 200, 200)
    expect(camera.position).toMatchObject({ x: 0, y: 0 })
  })

  it.each([0, -1, Infinity, NaN])('rejects invalid viewport dimensions: %s', (size) => {
    expect(() => new Camera2D(size, 720)).toThrow(RangeError)
    expect(() => new Camera2D(1280, size)).toThrow(RangeError)
  })
})
