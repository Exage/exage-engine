import { describe, expect, it } from 'vitest'
import { Time } from '@/engine/core/Time'

describe('Time', () => {
  it('starts with zero timing and establishes a reference on the first frame', () => {
    const time = new Time()
    expect(time.deltaTime).toBe(0)
    expect(time.fps).toBe(0)
    time.update(5000)
    expect(time.deltaTime).toBe(0)
    expect(time.fps).toBe(0)
  })

  it.each([30, 60, 120])('accumulates one second at %i FPS', (fps) => {
    const time = new Time()
    time.update(0)
    let elapsed = 0
    for (let frame = 1; frame <= fps; frame++) {
      time.update((frame * 1000) / fps)
      elapsed += time.deltaTime
      expect(time.fps).toBeCloseTo(fps)
    }
    expect(elapsed).toBeCloseTo(1)
  })

  it('clamps the simulation step while reporting actual frame frequency', () => {
    const time = new Time()
    time.update(0)
    time.update(2000)
    expect(time.deltaTime).toBe(0.1)
    expect(time.fps).toBe(0.5)
    time.update(2020)
    expect(time.deltaTime).toBeCloseTo(0.02)
  })

  it('discards the previous reference on reset', () => {
    const time = new Time()
    time.update(0)
    time.update(20)
    time.reset()
    expect(time.deltaTime).toBe(0)
    expect(time.fps).toBe(0)
    time.update(10000)
    expect(time.deltaTime).toBe(0)
    time.update(10020)
    expect(time.deltaTime).toBeCloseTo(0.02)
  })

  it('does not report infinite FPS for equal timestamps', () => {
    const time = new Time()
    time.update(0)
    time.update(20)
    time.update(20)
    expect(time.deltaTime).toBe(0)
    expect(time.fps).toBe(0)
  })
})
