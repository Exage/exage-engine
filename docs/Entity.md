# Entity

`Entity` is the base class for an object in the game world. It groups a Transform with two methods that subclasses can override: one for gameplay updates and one for drawing.

Source: [Entity.ts](../src/engine/entities/Entity.ts).

## API

| Member             | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `transform`        | The object's position, rotation, and scale.  |
| `update(dt)`       | Update gameplay, with delta time in seconds. |
| `render(renderer)` | Draw using the supplied Renderer.            |

Each new Entity creates its own [Transform](Transform.md). Changing one entity's position does not change another entity's position unless game code explicitly shares their Transform or vectors.

The base `update()` and `render()` methods do nothing. Entity can be instantiated directly, and subclasses can override either method or both. A plain Entity does not move or draw anything.

## Example subclass

This example defines a rectangle that moves right at 200 logical pixels per second. It illustrates the lifecycle API; it is not connected to the current Engine loop.

```ts
import { Entity } from '@/engine'
import type { Renderer } from '@/engine'

class MovingRectangle extends Entity {
  override update(dt: number): void {
    this.transform.position.x += 200 * dt
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, 40, 40, '#66ccff')
  }
}

const rectangle = new MovingRectangle()
rectangle.transform.position.set(100, 200)
```

The render method uses logical coordinates from Transform. Rotation and scale are not automatically applied: this example only uses position.

## Dependencies and lifecycle

Entity does not own a game loop, subscribe to browser events, or retain a Renderer. It does not know about Engine, Input, or Time. A future Player subclass will receive Input explicitly through its constructor, call `super()`, and receive time through `update(dt)`.

Scene is the next planned container: it will call `update(dt)` and `render(renderer)` on its entities. The current Engine does not call these methods yet, and there is no entity registration API. Creating an Entity alone does not display it.

IDs, automatic removal, collision, physics, components, and parent-child relationships are not part of this base class. See [Architecture](Architecture.md) for the planned dependency chain and [Renderer](Renderer.md) for drawing methods.
