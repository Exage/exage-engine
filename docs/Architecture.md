# Architecture

The project separates reusable engine systems from application setup and future gameplay. The current implementation provides a browser loop, timing, keyboard input, and Canvas 2D rendering.

## Current structure

```text
index.html                  Canvas element and application entry script
src/
  main.ts                   Creates and starts Engine; handles hot-reload cleanup
  style.css                 Page and Canvas layout
  engine/
    index.ts                Public engine exports
    core/
      Engine.ts             Owns systems and coordinates frames
      Time.ts               Calculates delta time and FPS
    input/
      Input.ts              Tracks keyboard state
    math/
      Vector2.ts            Mutable 2D vectors and direction normalization
    entities/
      Entity.ts             Base game object with update and render methods
      Transform.ts          Position, rotation, and scale of a game object
    scene/
      Scene.ts              Updates and renders entities in insertion order
    rendering/
      Renderer.ts           Owns Canvas and performs drawing
  utils/
    devLog.ts               Development-only logging helper
```

Tests live alongside their implementations. `src/game/`, Player, and GameScene have not been implemented yet.

## Ownership

```text
main.ts
  → Engine
      ├── Time
      ├── Input
      ├── Renderer
      │     ├── HTMLCanvasElement
      │     └── CanvasRenderingContext2D
      └── Active Scene (optional)
            └── Entities
```

`main.ts` locates the Canvas and passes it into Engine. Engine creates Renderer and does not store its own Canvas reference. Renderer alone retains the Canvas and context for rendering.

Engine publicly exposes readonly references to Time and Input. Its Renderer is private. Each Engine instance owns its own system instances; there is no global engine singleton.

## Dependency boundaries

- Engine code must not import game code or `main.ts`. ESLint enforces this for imports covered by its configured restrictions.
- Application and future game code can import the public engine API from `@/engine`.
- Internal project imports should prefer the `@/` alias, which maps to `src/` in TypeScript and Vite.
- Future game objects should receive only required dependencies, such as Input through a constructor and delta time through `update(dt)`.
- Gameplay should draw through Renderer instead of using Canvas APIs directly.

Public exports currently include `Engine`, `EngineOptions`, `Time`, `Input`, `Vector2`, `Transform`, `Entity`, `Scene`, `Renderer`, and `TextOptions`.

`Vector2` stores public `x` and `y` coordinates, both zero by default. `set(x, y)`, `add(vector)`, `subtract(vector)`, `multiply(scalar)`, and `normalize()` mutate the instance and return it for chaining. `clone()` creates an independent copy; `length()` returns its Euclidean length. Normalizing a zero vector leaves it unchanged. Clone a direction before scaling it if its original value must be preserved.

## Frame coordination

Browser keyboard events update Input. On an animation callback, Engine updates Time, updates the selected Scene, clears Renderer, renders that Scene, ends the Input frame, and requests the next callback. Scene forwards update and render calls to its entities. Select a scene through `engine.setScene(scene)`; pass `null` to detach it.

Engine manages startup, shutdown, and timing resets on focus changes. Input manages its keyboard and focus-loss listeners. Renderer checks display density when clearing. The individual systems do not need to know about Player or other game-specific types.

See [Engine](Engine.md), [Input](Input.md), [Time](Time.md), and [Renderer](Renderer.md) for exact APIs and lifecycle behavior. [Vector2](Vector2.md) explains positions, directions, and movement math. [Transform](Transform.md) groups position, rotation, and scale. [Entity](Entity.md) owns a Transform and provides overridable update and render methods.

## Units

| Value                                | Unit                                             |
| ------------------------------------ | ------------------------------------------------ |
| Timestamp passed to Time             | Milliseconds from the browser animation callback |
| Delta time passed to future gameplay | Seconds                                          |
| Drawing coordinates and dimensions   | Logical pixels                                   |
| Future movement speed                | Logical pixels per second                        |
| Transform rotation                   | Radians                                          |
| Transform scale                      | Unitless                                         |

DPI and physical Canvas pixels remain a Renderer concern.

## Planned extension

With `Vector2`, `Transform`, and `Entity` implemented, Scene is also available; the remaining game classes are `Player` and `GameScene`. The intended relationship is:

```text
Engine → Scene → Entity
                  ↑
                Player
```

Player will inherit from Entity and receive Input explicitly. Engine updates and renders its active Scene without knowing about Player. [Scene](Scene.md) forwards those calls to its entities. Application setup constructs a Scene and attaches it through `engine.setScene(scene)`.

First Motion uses this small inheritance-based design. ECS, components, physics, collisions, cameras, sprites, and multiple rendering backends remain outside v0.1. See the [roadmap](First%20Motion%20%E2%80%94%20Engine%20v0.1%20Roadmap.md) for the complete scope.
