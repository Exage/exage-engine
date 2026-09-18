import { describe, expect, it } from 'vitest'
import { Vector2 } from '@/engine/math/Vector2'

describe('Vector2', () => {
  it('creates a zero vector by default and supports chained mutations', () => {
    const vector = new Vector2()
    const operand = new Vector2(3, -4)
    expect([vector.x, vector.y, vector.length()]).toEqual([0, 0, 0])

    expect(vector.set(1, 2)).toBe(vector)
    expect(vector.add(operand)).toBe(vector)
    expect([vector.x, vector.y]).toEqual([4, -2])
    expect(vector.subtract(new Vector2(2, 1))).toBe(vector)
    expect([vector.x, vector.y]).toEqual([2, -3])
    expect(vector.multiply(-2)).toBe(vector)
    expect([vector.x, vector.y]).toEqual([-4, 6])
    expect([operand.x, operand.y]).toEqual([3, -4])
    vector.multiply(0)
    expect(vector.length()).toBe(0)
  })

  it('clones without sharing mutable coordinates', () => {
    const original = new Vector2(3, 4)
    const copy = original.clone()
    expect(copy).not.toBe(original)
    expect(copy).toEqual(original)
    expect(original.length()).toBe(5)
    copy.set(10, 20)
    expect([original.x, original.y]).toEqual([3, 4])
  })

  it('keeps a normalized zero vector finite and unchanged', () => {
    const vector = new Vector2()
    expect(vector.normalize()).toBe(vector)
    expect([vector.x, vector.y, vector.length()]).toEqual([0, 0, 0])
  })

  it.each([
    [1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [-3, -4],
  ])('preserves direction and equal movement speed for (%i, %i)', (x, y) => {
    const direction = new Vector2(x, y)
    const length = direction.length()
    expect(direction.normalize()).toBe(direction)
    expect(direction.length()).toBeCloseTo(1)
    expect(direction.x).toBeCloseTo(x / length)
    expect(direction.y).toBeCloseTo(y / length)
    const displacement = direction.clone().multiply(200 * 0.5)
    expect(displacement.length()).toBeCloseTo(100)
    expect(direction.length()).toBeCloseTo(1)
  })
})
