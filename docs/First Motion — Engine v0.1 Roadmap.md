# First Motion — Engine v0.1

## Goal

Build the smallest usable foundation of the 2D engine.

By the end of v0.1, the engine should:

* run in a browser;
* render through HTML5 Canvas;
* have its own game loop;
* calculate delta time;
* process keyboard input;
* have basic 2D math;
* support entities and transforms;
* have a basic scene;
* move an entity independently of frame rate.

The final demo for v0.1 will be intentionally simple:

> A rectangle appears on the screen and can be moved with WASD.

The visual result is simple, but internally it should already use the engine architecture rather than directly manipulating Canvas from the game code.

---

# 1. Project Foundation

Create the base project using:

* TypeScript
* Vite
* HTML5 Canvas
* no game frameworks
* no rendering libraries
* no UI frameworks inside the engine

Initial structure:

```text
src/
├── engine/
│   ├── core/
│   ├── rendering/
│   ├── input/
│   ├── math/
│   ├── entities/
│   └── scene/
│
├── game/
│
└── main.ts
```

Create a single Canvas element in the application.

Example:

```html
<canvas id="game"></canvas>
```

### Done when

* `npm run dev` starts the project;
* the project opens in the browser;
* Canvas is visible;
* TypeScript compiles without errors.

---

# 2. Engine Core

Create the main `Engine` class.

The Engine is responsible for starting and stopping the application.

Initial public API:

```ts
const engine = new Engine({
  canvas,
  width: 1280,
  height: 720,
});

engine.start();
```

The Engine should not contain game-specific logic.

It should only coordinate engine systems.

### Responsibilities

* store the Canvas reference;
* initialize engine systems;
* start the game loop;
* stop the game loop;
* call update;
* call render.

### Done when

The application can be started through:

```ts
engine.start();
```

instead of manually calling browser APIs from `main.ts`.

---

# 3. Game Loop

Create the main game loop using:

```ts
requestAnimationFrame()
```

The basic loop:

```text
Frame starts
    ↓
Calculate time
    ↓
Update game
    ↓
Render game
    ↓
Request next frame
```

The loop should be owned by the Engine.

Do not put gameplay logic directly inside the loop.

### Done when

The Engine continuously produces frames until stopped.

---

# 4. Time and Delta Time

Create a small time system.

It should calculate the time between frames.

Example:

```ts
deltaTime = 0.016
```

approximately represents:

```text
16 ms
≈
60 FPS
```

Movement must use time:

```ts
position.x += speed * deltaTime;
```

Not:

```ts
position.x += speed;
```

Otherwise game speed will depend on FPS.

Useful values for the future:

```ts
Time.deltaTime
Time.elapsed
Time.fps
```

For v0.1 only `deltaTime` is required.

### Done when

An object moves at approximately the same speed at 30 FPS, 60 FPS and 120 FPS.

---

# 5. Renderer

Create a `Renderer` class.

The rest of the engine should not constantly access:

```ts
CanvasRenderingContext2D
```

directly.

Instead:

```ts
renderer.clear();

renderer.drawRect(
  x,
  y,
  width,
  height
);
```

For v0.1 implement only:

```text
clear()
drawRect()
```

Optional:

```text
drawText()
```

for debugging.

Do not add sprites yet.

Do not add cameras yet.

Do not add layers yet.

### Done when

A rectangle can be rendered through the Renderer without game code calling `ctx.fillRect()` directly.

---

# 6. Input System

Create the first input system.

For v0.1 support keyboard input only.

The API should distinguish between:

```ts
input.isDown("KeyW");
input.wasPressed("Space");
input.wasReleased("Escape");
```

Meaning:

```text
isDown
key is currently held

wasPressed
key was pressed during this frame

wasReleased
key was released during this frame
```

For movement, use:

```ts
if (input.isDown("KeyD")) {
  // move right
}
```

### Controls for the v0.1 demo

```text
W — Up
A — Left
S — Down
D — Right
```

### Done when

The engine detects keyboard input reliably and independently from game code.

---

# 7. Vector2

Create the first math primitive:

```ts
Vector2
```

Initial version:

```ts
class Vector2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
}
```

For v0.1 we do not need a large math library.

Optional basic methods:

```text
set()
add()
subtract()
multiply()
clone()
```

More advanced operations can come later.

### Done when

2D positions can be represented with:

```ts
new Vector2(100, 200);
```

instead of unrelated `x` and `y` variables scattered through the code.

---

# 8. Transform

Create a `Transform`.

It represents where an object exists in the world.

Initial structure:

```ts
class Transform {
  position = new Vector2();
  rotation = 0;
  scale = new Vector2(1, 1);
}
```

For v0.1 only position is required for gameplay.

Rotation and scale can exist as placeholders for future versions.

### Done when

Game objects store their location through:

```ts
entity.transform.position
```

---

# 9. Entity

Create the base `Entity` class.

An Entity represents an object that exists inside the game world.

Examples for future versions:

```text
Player
Enemy
Coin
Door
Bullet
Tree
NPC
```

Basic API:

```ts
class Entity {
  transform = new Transform();

  update(dt: number) {}

  render(renderer: Renderer) {}
}
```

For v0.1 create one game-specific entity:

```ts
Player
```

The Player should extend Entity.

### Done when

The moving rectangle is no longer implemented directly inside `main.ts`.

It exists as:

```text
Player
    ↓
Entity
    ↓
Transform
    ↓
Vector2
```

---

# 10. Scene

Create the first `Scene`.

A Scene represents a container for game objects.

For v0.1 there will only be one:

```text
GameScene
```

Basic structure:

```ts
class Scene {
  entities: Entity[] = [];

  update(dt: number) {}

  render(renderer: Renderer) {}
}
```

The Scene should:

* store entities;
* update entities;
* render entities;
* allow entities to be added.

Example:

```ts
scene.add(player);
```

Do not implement SceneManager yet.

Do not implement SceneStack yet.

Those belong to later versions.

### Done when

The Engine does not know what a Player is.

It only communicates with a Scene.

---

# 11. First Playable Test

Build the first complete engine test.

Expected result:

```text
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                ████                  │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

The rectangle represents the Player.

Controls:

```text
WASD
```

The Player movement must use:

```ts
speed * deltaTime
```

Expected internal flow:

```text
Browser
   ↓
Engine
   ↓
Game Loop
   ↓
Scene
   ↓
Player Entity
   ↓
Input + Transform
   ↓
Renderer
   ↓
Canvas
```

---

# 12. Debug Information

Add a minimal development/debug display.

For example:

```text
FPS: 60
Delta: 0.016
Entities: 1
Player: 435, 210
```

This can initially be rendered through the Renderer.

No advanced debug system is required yet.

### Done when

Basic runtime information can be inspected without opening the debugger every time.

---

# v0.1 Architecture

At the end of First Motion, the project should approximately look like:

```text
Engine
│
├── GameLoop
├── Time
├── Renderer
├── Input
│
└── Scene
     │
     └── Entity
          │
          └── Transform
                │
                └── Vector2
```

Game-specific code:

```text
GameScene
    ↓
Player
```

---

# Out of Scope for v0.1

Do not implement these systems yet:

```text
Sprites
Animations
Camera
Physics
Collisions
Audio
Tilemaps
SceneManager
SceneStack
Level loading
JSON levels
GameState
Save system
Particles
ECS
Event Bus
Gamepad
Level Editor
WebGL
Networking
```

They are intentionally excluded.

The purpose of v0.1 is not to create a complete engine.

The purpose is to create a small, understandable foundation that we can safely extend.

---

# Definition of Done

**First Motion v0.1 is complete when:**

1. The engine starts in the browser.
2. Canvas rendering works.
3. The engine owns the game loop.
4. Delta time is calculated.
5. Keyboard input works.
6. `Vector2` exists.
7. `Transform` exists.
8. `Entity` exists.
9. `Scene` exists.
10. `Player` is implemented as an Entity.
11. Player movement uses WASD.
12. Movement is frame-rate independent.
13. Rendering goes through `Renderer`.
14. The Engine does not contain Player-specific logic.
15. The project has no unnecessary game-engine dependencies.
