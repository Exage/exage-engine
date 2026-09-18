# Vector2

`Vector2` groups two numbers, `x` and `y`, and provides common operations on them. Game code can work with a position or direction as one value instead of repeatedly calculating both coordinates separately.

Source: [Vector2.ts](../src/engine/math/Vector2.ts).

## Position and direction

The same class can represent different things:

- **Position:** `(100, 200)` means a point 100 logical pixels right and 200 down from the top-left corner of the game area.
- **Direction:** `(1, 0)` points right; `(0, -1)` points up.
- **Displacement:** `(10, -5)` means moving 10 pixels right and 5 pixels up.

The class does not assign units or distinguish these meanings. The code using it decides what the numbers represent. It has no dependency on Input, Time, Renderer, or the browser.

```ts
import { Vector2 } from '@/engine'

const position = new Vector2(100, 200)
const displacement = new Vector2(10, -5)

position.add(displacement)
// position is now (110, 195).
```

## API

`new Vector2()` starts at `(0, 0)`. Both coordinates are public and can be read or assigned directly.

| Method             | What it does                                   | Example                                         |
| ------------------ | ---------------------------------------------- | ----------------------------------------------- |
| `set(x, y)`        | Replace both coordinates.                      | Setting `(3, 4)` replaces the previous values.  |
| `add(vector)`      | Add corresponding coordinates.                 | `(1, 2) + (3, 4)` → `(4, 6)`                    |
| `subtract(vector)` | Subtract corresponding coordinates.            | `(5, 7) - (2, 3)` → `(3, 4)`                    |
| `multiply(scalar)` | Multiply both coordinates by one number.       | `(2, -3) × 2` → `(4, -6)`                       |
| `clone()`          | Return an independent copy.                    | Editing the copy leaves the original unchanged. |
| `length()`         | Return the distance from `(0, 0)`.             | `(3, 4)` has length `5`.                        |
| `normalize()`      | Preserve direction and make length equal to 1. | `(3, 4)` → approximately `(0.6, 0.8)`           |

The table uses coordinate notation for illustration, not executable TypeScript. `multiply()` accepts a scalar, not another vector. Use finite numbers; the class does not validate coordinates or arguments.

## Operations change the original

`set()`, `add()`, `subtract()`, `multiply()`, and `normalize()` modify the instance and return that same instance. This allows chaining:

```ts
const vector = new Vector2()
vector.set(1, 2).multiply(3)
// vector is now (3, 6).
```

`add()` and `subtract()` read their argument without changing it, unless the argument is the same instance as the receiver. `length()` only reads the vector. `clone()` creates a new vector.

Use `clone()` when the original must stay unchanged:

```ts
const direction = new Vector2(1, 0)
const displacement = direction.clone().multiply(20)
// direction remains (1, 0); displacement is (20, 0).
```

Assigning `const copy = direction` would keep a reference to the same object, not create a copy.

## Why normalize movement?

Holding D gives direction `(1, 0)`, which has length 1. Holding W and D gives `(1, -1)`, which has length approximately 1.414. Using these values directly would make diagonal movement about 41% faster.

`normalize()` changes `(1, -1)` to approximately `(0.707, -0.707)`. It still points up and right, but now its length is 1, just like the direction for moving right alone.

A zero vector stays `(0, 0)` when normalized. It has no direction, and leaving it unchanged avoids division by zero.

Normalize a **direction**, not the player's position: normalizing a position would move that point to distance 1 from the origin.

## Movement with Input and delta time

This function illustrates future gameplay. Player and Scene are not implemented yet, and this example is not connected to the current Engine loop.

```ts
import { Vector2 } from '@/engine'
import type { Input } from '@/engine'

function move(position: Vector2, input: Input, dt: number): void {
  const direction = new Vector2()

  if (input.isDown('KeyW')) {
    direction.y -= 1
  }
  if (input.isDown('KeyS')) {
    direction.y += 1
  }
  if (input.isDown('KeyA')) {
    direction.x -= 1
  }
  if (input.isDown('KeyD')) {
    direction.x += 1
  }

  const speed = 200

  if (direction.length() > 0) {
    const displacement = direction.normalize().multiply(speed * dt)
    position.add(displacement)
  }
}
```

The steps are: read the keys, build a direction, normalize it, multiply it by the distance to travel this frame, and add that displacement to the position.

Here `displacement` refers to the same object as `direction`, which is safe because the original direction is no longer needed. At 200 logical pixels per second and `dt = 0.5` seconds, the displacement has length 100 pixels for both straight and diagonal movement. With no keys held, or with opposing keys cancelling each other, the position stays unchanged.

See [Input](Input.md) for keyboard states, [Time](Time.md) for delta time, and [Architecture](Architecture.md) for how future game objects will use these primitives.
