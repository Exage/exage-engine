/** Mutable 2D vector. Operations modify this instance unless stated otherwise. */
export class Vector2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}

  set(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  add(vector: Vector2): this {
    this.x += vector.x
    this.y += vector.y
    return this
  }

  subtract(vector: Vector2): this {
    this.x -= vector.x
    this.y -= vector.y
    return this
  }

  /** Multiply both coordinates by a scalar. */
  multiply(scalar: number): this {
    this.x *= scalar
    this.y *= scalar
    return this
  }

  /** Create an independent copy without changing this instance. */
  clone(): Vector2 {
    return new Vector2(this.x, this.y)
  }

  length(): number {
    return Math.hypot(this.x, this.y)
  }

  /** Preserve direction with unit length; leave a zero vector unchanged. */
  normalize(): this {
    const length = this.length()

    if (length > 0) {
      this.x /= length
      this.y /= length
    }

    return this
  }
}
