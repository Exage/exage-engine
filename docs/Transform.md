# Transform

`Transform` groups an object's position, rotation, and scale. It describes where an object is and how it is oriented and sized.

Source: [Transform.ts](../src/engine/entities/Transform.ts).

## Properties

| Property   | Default             | Meaning                       | Unit           |
| ---------- | ------------------- | ----------------------------- | -------------- |
| `position` | `new Vector2(0, 0)` | Position in the game world.   | Logical pixels |
| `rotation` | `0`                 | Rotation angle.               | Radians        |
| `scale`    | `new Vector2(1, 1)` | Size multiplier on each axis. | Unitless       |

All properties are public and mutable. Each new Transform creates its own position and scale vectors, so changing one object's position does not move another object. Position and scale are also separate vectors within the same Transform.

## Example

```ts
import { Transform } from '@/engine'

const transform = new Transform()

transform.position.set(100, 200)
transform.position.x += 10
// Position is now (110, 200).

transform.rotation = Math.PI / 2
// Store a quarter turn (90 degrees) in radians.

transform.scale.set(2, 1)
// Store twice the original width and the original height.
```

In the current coordinate system, X increases rightward and Y increases downward. The example position is 110 logical pixels right and 200 down from the origin. See [Vector2](Vector2.md) for operations on position and scale.

Assigning the same Vector2 instance to multiple Transforms would share that vector. Use `clone()` when assigning an independent copy of an existing vector.

## Current behavior

Transform only stores data. It does not move an object automatically, draw anything, apply Canvas transformations, or validate assigned values. Renderer does not consume a Transform directly. There are no parent-child transforms or matrix calculations.

For v0.1, gameplay will actively use position. Rotation and scale are stored for the basic representation; changing them currently has no automatic visual effect.

The [Entity](Entity.md) class owns a Transform, making an object's position accessible through `entity.transform.position`. Player uses this position for movement and rendering. See [Architecture](Architecture.md) for the relationships.
