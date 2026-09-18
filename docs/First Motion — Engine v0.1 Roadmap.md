# First Motion — Engine v0.1

## Goal

Build the smallest usable and understandable foundation of the 2D engine.

The purpose of v0.1 is not to create a complete game engine. It is to establish the core architecture that future systems can safely build upon.

By the end of v0.1, the engine should:

* run in a browser;
* render through HTML5 Canvas;
* have its own game loop;
* calculate delta time and FPS;
* process keyboard input;
* have basic 2D math;
* support transforms and entities;
* have a basic scene;
* handle browser focus loss safely;
* separate logical resolution from physical Canvas resolution;
* move an entity independently of frame rate.

The final playable demo for v0.1 is intentionally simple:

> A rectangle appears on the screen and can be moved with WASD.

The visual result is simple, but internally it must already use the engine architecture instead of directly manipulating Canvas or browser APIs from gameplay code.

---

# Architecture Decisions

These decisions are locked for First Motion v0.1.

They define how the first version should be implemented and do not expand the scope of the roadmap.

## 1. Explicit dependencies

Dependencies must be passed explicitly.

`Engine` owns the main engine systems:

```text
Input
Time
Renderer
```

Game objects receive only the dependencies they actually need.

For example:

```ts
new Player(input);
```

`Player` receives `Input` through its constructor.

`Player` does not receive `Engine`.

`Player` also does not receive `Time`.

Delta time is passed through:

```ts
update(dt)
```

This keeps game objects independent from the Engine itself and makes testing easier.

---

## 2. Entity + Scene architecture

For v0.1 use inheritance:

```text
Player
  ↓
Entity
```

This is enough for the first version.

Do not introduce:

```text
ECS
Component System
System architecture
```

yet.

Composition should only be reconsidered after multiple different entities exist and real duplication or architectural problems appear.

---

## 3. Renderer owns Canvas

`Renderer` is the only system allowed to keep and directly access:

```ts
HTMLCanvasElement
CanvasRenderingContext2D
```

Game code must never directly call:

```ts
ctx.fillRect(...)
ctx.clearRect(...)
```

Instead it uses the Renderer API:

```ts
renderer.drawRect(...);
```

The initialization flow is:

```text
main.ts
   ↓
Engine(canvas)
   ↓
Renderer(canvas)
```

After initialization, `Engine` does not need to keep its own Canvas reference.

Do not design multiple graphics backends yet.

Canvas 2D is the only renderer in v0.1.

---

## 4. Focus loss

Browser focus loss must be handled explicitly.

When the window loses focus:

* clear held keyboard states;
* clear transient input states.

When the application becomes active again:

* reset the previous time reference;
* do not include the inactive period in the next delta time.

A maximum delta clamp may also be used as a safety mechanism.

This prevents objects from suddenly moving large distances after returning to the tab.

---

## 5. Logical resolution

Game coordinates must be independent from the physical Canvas backing resolution.

The game uses a logical resolution such as:

```text
1280 × 720
```

All positions and dimensions use this coordinate system.

The Renderer internally handles:

```ts
devicePixelRatio
```

so rendering remains sharp on Retina and other high-DPI displays.

Gameplay code does not need to know about `devicePixelRatio`.

---

## 6. Units

Use consistent units throughout the engine.

```text
Time              seconds
Position          logical pixels
Dimensions        logical pixels
Velocity          logical pixels / second
Angles            radians
Scale             unitless
```

Example:

```ts
const speed = 200;
```

means:

```text
200 logical pixels per second
```

---

## 7. Diagonal movement

WASD movement must use a direction vector.

When moving diagonally, the direction must be normalized.

Therefore:

```text
D       → speed = 200
W       → speed = 200
W + D   → speed = 200
```

and not approximately:

```text
283
```

A zero movement vector must remain zero and must not be normalized.

---

# 1. Project Foundation

Create the base project using:

* TypeScript;
* Vite;
* HTML5 Canvas;
* no game frameworks;
* no rendering libraries;
* no UI frameworks inside the engine.

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
│   ├── entities/
│   └── scenes/
│
└── main.ts
```

Create one Canvas element:

```html
<canvas id="game"></canvas>
```

`main.ts` should remain small.

Its responsibility is application composition, not gameplay logic.

Eventually it should approximately do:

```ts
const canvas = document.querySelector<HTMLCanvasElement>("#game");

const engine = new Engine({
  canvas,
  width: 1280,
  height: 720,
});

engine.start();
```

## Done when

* `npm install` completes successfully;
* `npm run dev` starts Vite;
* the application opens in the browser;
* Canvas is visible;
* TypeScript compiles without errors;
* no unnecessary game-engine dependencies exist.

---

# 2. Engine Core

Create the main:

```ts
Engine
```

class.

The Engine coordinates the engine systems.

It must not contain gameplay-specific logic.

Initial public API:

```ts
const engine = new Engine({
  canvas,
  width: 1280,
  height: 720,
});

engine.start();
```

The Engine creates and owns:

```text
Renderer
Input
Time
```

The Engine also holds the active Scene.

Conceptually:

```text
Engine
├── Renderer
├── Input
├── Time
└── Scene
```

## Responsibilities

The Engine should:

* initialize engine systems;
* create `Renderer`;
* create `Input`;
* create `Time`;
* own the active Scene;
* start the application;
* stop the application;
* control the main game loop;
* update time;
* update the Scene;
* render the Scene;
* finish the Input frame.

It must not know what a `Player` is.

## Done when

The application can be started through:

```ts
engine.start();
```

and `main.ts` does not manually run the game loop.

---

# 3. Game Loop

Create the main game loop using:

```ts
requestAnimationFrame()
```

The Engine owns the loop.

Basic concept:

```text
requestAnimationFrame
        ↓
calculate time
        ↓
update
        ↓
render
        ↓
finish frame
        ↓
requestAnimationFrame
```

Gameplay logic must not be implemented directly inside the loop.

The loop only coordinates systems.

---

# 4. Frame Lifecycle

The order of operations during a frame must be explicitly defined.

Each frame follows this lifecycle:

```text
1. Browser events have updated Input
          ↓
2. Time calculates deltaTime
          ↓
3. Scene.update(dt)
          ↓
4. Scene.render(renderer)
          ↓
5. Input.endFrame()
          ↓
6. Request next animation frame
```

Conceptually:

```ts
time.update(timestamp);

scene.update(time.deltaTime);

renderer.clear();

scene.render(renderer);

input.endFrame();

requestAnimationFrame(loop);
```

`Input.endFrame()` clears only transient states:

```text
pressedThisFrame
releasedThisFrame
```

It must not clear keys that are still being held.

## Done when

The order of update, rendering and input cleanup is deterministic and documented.

---

# 5. Time and Delta Time

Create an Engine-owned:

```ts
Time
```

instance.

Time calculates the amount of time between frames.

Example:

```ts
deltaTime = 0.016;
```

which approximately means:

```text
16 milliseconds
≈
60 FPS
```

Movement must use time:

```ts
position.x += speed * deltaTime;
```

Never:

```ts
position.x += speed;
```

because that makes movement dependent on FPS.

The Time system should expose at least:

```ts
time.deltaTime;
time.fps;
```

Future values may include:

```ts
time.elapsed;
```

but they are not required for v0.1.

## FPS

For the first version FPS may be calculated simply:

```ts
fps = 1 / deltaTime;
```

Smoothing can be added later.

## Resume behavior

If the page was inactive, the next frame must not receive the entire inactive duration as delta time.

The time reference must be reset after returning.

A maximum delta clamp can also be used as additional protection.

For example:

```ts
deltaTime = Math.min(deltaTime, 0.1);
```

The exact clamp value may be adjusted later.

## Done when

Movement stays approximately consistent at:

```text
30 FPS
60 FPS
120 FPS
```

and returning to the browser tab does not cause a large movement jump.

---

# 6. Renderer

Create:

```ts
Renderer
```

The Renderer owns:

```ts
HTMLCanvasElement
CanvasRenderingContext2D
```

No gameplay object may store or directly access the Canvas rendering context.

Game code uses:

```ts
renderer.clear();

renderer.drawRect(
  x,
  y,
  width,
  height
);
```

For v0.1 implement:

```text
clear()
drawRect()
drawText()
```

`drawText()` is included because v0.1 contains a debug overlay.

Do not implement yet:

```text
Sprites
Camera transforms
Layers
Shaders
WebGL
Multiple rendering backends
```

---

# 7. Logical Resolution and High-DPI Rendering

Engine configuration contains logical dimensions:

```ts
width: 1280,
height: 720
```

Gameplay operates entirely inside this coordinate system.

For example:

```ts
player.transform.position.x = 640;
```

means the logical center of a `1280` pixel wide game area.

The Renderer internally calculates the Canvas backing resolution using:

```ts
window.devicePixelRatio
```

Conceptually:

```text
Logical size
1280 × 720

devicePixelRatio
2

Physical Canvas buffer
2560 × 1440
```

Gameplay still sees:

```text
1280 × 720
```

The Renderer hides this difference.

## Done when

* game coordinates use logical pixels;
* high-DPI displays remain sharp;
* gameplay code does not use `devicePixelRatio`.

---

# 8. Input System

Create the first:

```ts
Input
```

system.

For v0.1 support keyboard input only.

Input is an Engine-owned instance.

The API must distinguish three states:

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
key became pressed during this frame

wasReleased
key became released during this frame
```

Example:

```text
Frame 1
Space pressed

isDown       true
wasPressed   true


Frame 2
Space still held

isDown       true
wasPressed   false
```

For movement:

```ts
if (input.isDown("KeyD")) {
  // move right
}
```

## Input frame state

Internally Input may maintain sets similar to:

```text
held
pressed
released
```

At the end of each frame:

```ts
input.endFrame();
```

clears:

```text
pressed
released
```

but leaves `held` intact.

## Focus loss

When the browser window loses focus:

```text
held       cleared
pressed    cleared
released   cleared
```

This prevents stuck movement keys.

## v0.1 controls

```text
W — Up
A — Left
S — Down
D — Right
```

## Done when

* keyboard input works reliably;
* held and one-frame states behave differently;
* focus loss cannot leave a key permanently held;
* gameplay code does not access browser keyboard events directly.

---

# 9. Vector2

Create the first math primitive:

```ts
Vector2
```

Initial implementation:

```ts
class Vector2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
}
```

Recommended basic operations for v0.1:

```text
set()
add()
subtract()
multiply()
clone()
length()
normalize()
```

Do not build a large math library yet.

The primary purpose of `Vector2` is to represent:

```text
position
direction
movement
scale
```

Example:

```ts
const position = new Vector2(100, 200);
```

instead of unrelated:

```ts
let x = 100;
let y = 200;
```

---

# 10. Direction Normalization

Player movement must construct a direction vector from keyboard state.

Conceptually:

```ts
const direction = new Vector2();

if (input.isDown("KeyW")) direction.y -= 1;
if (input.isDown("KeyS")) direction.y += 1;
if (input.isDown("KeyA")) direction.x -= 1;
if (input.isDown("KeyD")) direction.x += 1;
```

If the direction is not zero:

```ts
direction.normalize();
```

Then movement is:

```ts
position += direction * speed * dt;
```

This ensures equal speed in every direction.

## Done when

Moving diagonally is not faster than moving horizontally or vertically.

---

# 11. Transform

Create:

```ts
Transform
```

A Transform represents where an Entity exists in the game world.

Initial structure:

```ts
class Transform {
  position = new Vector2();

  rotation = 0;

  scale = new Vector2(1, 1);
}
```

Units:

```text
position → logical pixels
rotation → radians
scale    → unitless
```

For v0.1 gameplay only `position` needs to be actively used.

`rotation` and `scale` exist as part of the basic Transform representation but do not require advanced functionality yet.

## Done when

Game objects store position through:

```ts
entity.transform.position
```

---

# 12. Entity

Create the base:

```ts
Entity
```

class.

An Entity is an object that exists inside the game world.

Possible future examples:

```text
Player
Enemy
Coin
Door
Bullet
Tree
NPC
```

Basic structure:

```ts
class Entity {
  transform = new Transform();

  update(dt: number) {}

  render(renderer: Renderer) {}
}
```

For v0.1 create:

```ts
Player
```

as:

```ts
class Player extends Entity
```

Player receives Input explicitly:

```ts
class Player extends Entity {
  constructor(
    private readonly input: Input
  ) {
    super();
  }
}
```

It receives time only through:

```ts
update(dt)
```

It does not know about:

```text
Engine
Time
Canvas
CanvasRenderingContext2D
```

---

# 13. Player

Create the first game-specific Entity:

```ts
Player
```

The Player is represented visually by a rectangle.

Its responsibilities for v0.1 are only:

* read keyboard input;
* calculate movement direction;
* normalize movement direction;
* update its Transform position;
* render itself as a rectangle.

Example speed:

```ts
speed = 200;
```

meaning:

```text
200 logical pixels per second
```

Movement concept:

```ts
position += normalizedDirection * speed * dt;
```

Do not add:

```text
Health
Inventory
Animation
Physics
Collision
Weapons
```

yet.

## Done when

The rectangle is implemented entirely as a Player Entity instead of variables in `main.ts`.

---

# 14. Scene

Create:

```ts
Scene
```

A Scene is a container for Entities.

For v0.1 there is only one Scene:

```text
GameScene
```

Basic structure:

```ts
class Scene {
  entities: Entity[] = [];

  add(entity: Entity) {}

  update(dt: number) {}

  render(renderer: Renderer) {}
}
```

The Scene should:

* store Entities;
* add Entities;
* update all Entities;
* render all Entities.

Example:

```ts
scene.add(player);
```

The Scene does not need to know how the Engine's game loop works.

---

# 15. Dependency Chain

The dependency flow should be explicit.

Conceptually:

```text
main.ts
   ↓
Engine
   │
   ├── Input
   ├── Time
   ├── Renderer
   │
   └── GameScene
          │
          └── Player(Input)
```

The important rule is:

```text
Player does NOT know about Engine
```

`GameScene` may receive the dependencies needed to create its game objects.

For example:

```ts
const gameScene = new GameScene(input);
```

and internally:

```ts
const player = new Player(input);
```

The exact Scene construction API may evolve later, but dependency direction must remain clear.

---

# 16. Engine ↔ Scene Relationship

The Engine must not know about Player-specific behavior.

Engine communicates only with Scene:

```ts
scene.update(dt);
scene.render(renderer);
```

Scene communicates with its Entities:

```ts
entity.update(dt);
entity.render(renderer);
```

Therefore:

```text
Engine
   ↓
Scene
   ↓
Entity
   ↓
Player
```

not:

```text
Engine
   ↓
Player
```

## Done when

No Player-specific code exists inside `Engine`.

---

# 17. First Playable Test

Combine all implemented systems.

Expected visual result:

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

Player movement uses:

```ts
speed * deltaTime
```

and normalized direction.

Expected internal flow:

```text
Browser
   ↓
Input events
   ↓
Engine
   ↓
Time
   ↓
Scene.update(dt)
   ↓
Player.update(dt)
   ↓
Transform
   ↓
Scene.render(renderer)
   ↓
Player.render(renderer)
   ↓
Renderer
   ↓
Canvas
```

---

# 18. Debug Information

Add a minimal debug overlay.

Display:

```text
FPS: 60
Delta: 0.016
Entities: 1
Player: 435, 210
```

This information should be rendered through:

```ts
renderer.drawText(...)
```

The debug display should not directly access Canvas.

Do not build a full debug framework yet.

No inspector or editor is required.

## Done when

Basic engine runtime information can be inspected directly inside the application.

---

# 19. Browser Focus Test

Explicitly test browser focus behavior.

Test scenario:

```text
1. Hold D
2. Switch to another browser tab
3. Release D while outside the game
4. Return to the game
```

Expected result:

```text
Player is not moving
```

Second test:

```text
1. Leave the tab inactive for several seconds
2. Return
```

Expected result:

```text
Player does not jump across the screen
```

---

# 20. Frame-Rate Independence Test

Verify that movement is approximately consistent under different frame rates.

For example:

```text
Speed = 200 px/s

Run for 1 second
```

Expected approximate movement:

```text
30 FPS  → 200 px
60 FPS  → 200 px
120 FPS → 200 px
```

Minor timing differences are acceptable.

Large differences indicate a problem in delta-time handling.

---

# v0.1 Architecture

At the end of First Motion, the architecture should approximately be:

```text
Engine
│
├── Time
├── Input
├── Renderer
│
└── Scene
     │
     └── Entity
          │
          ├── Transform
          │    └── Vector2
          │
          └── Player
```

Dependency flow:

```text
Engine
 ├── owns Time
 ├── owns Input
 ├── owns Renderer
 │
 └── runs Scene
          │
          └── contains Player
                     │
                     └── receives Input
```

Rendering flow:

```text
Player
   ↓
Renderer API
   ↓
CanvasRenderingContext2D
   ↓
Canvas
```

Time flow:

```text
requestAnimationFrame(timestamp)
             ↓
            Time
             ↓
       deltaTime
             ↓
      Scene.update(dt)
             ↓
      Entity.update(dt)
```

---

# Expected Project Structure

By the end of v0.1 the project may approximately look like:

```text
src/
├── engine/
│   │
│   ├── core/
│   │   ├── Engine.ts
│   │   └── Time.ts
│   │
│   ├── rendering/
│   │   └── Renderer.ts
│   │
│   ├── input/
│   │   └── Input.ts
│   │
│   ├── math/
│   │   └── Vector2.ts
│   │
│   ├── entities/
│   │   ├── Entity.ts
│   │   └── Transform.ts
│   │
│   └── scene/
│       └── Scene.ts
│
├── game/
│   │
│   ├── entities/
│   │   └── Player.ts
│   │
│   └── scenes/
│       └── GameScene.ts
│
└── main.ts
```

The exact file organization can change if implementation reveals a clearer structure.

The architectural boundaries matter more than the folder names.

---

# Out of Scope for v0.1

Do not implement:

```text
Sprites
Sprite Sheets
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
Entity Factory
GameState
Save system
Particles
ECS
Component System
Event Bus
Gamepad
Mouse input
Touch input
Level Editor
WebGL
Shaders
Multiple rendering backends
Networking
Prefab system
Serialization
```

If one of these becomes convenient during implementation, it should still remain outside v0.1 unless it is strictly necessary to complete the current goals.

---

# Definition of Done

First Motion v0.1 is complete when:

1. The project runs through Vite.
2. The engine runs in a browser.
3. HTML5 Canvas rendering works.
4. `Engine` owns the main game loop.
5. `Engine` owns `Time`, `Input`, and `Renderer`.
6. `Renderer` exclusively owns Canvas and `CanvasRenderingContext2D`.
7. Game code does not directly access Canvas APIs.
8. Delta time is calculated in seconds.
9. FPS is available for debugging.
10. Browser inactivity does not create a huge resume delta.
11. Window blur clears keyboard state.
12. Keyboard input supports `isDown`.
13. Keyboard input supports `wasPressed`.
14. Keyboard input supports `wasReleased`.
15. Transient Input states are cleared through a defined frame lifecycle.
16. Logical resolution is independent from Canvas backing resolution.
17. `devicePixelRatio` is handled internally by Renderer.
18. Game coordinates use logical pixels.
19. Velocity uses logical pixels per second.
20. Angles use radians.
21. Scale is unitless.
22. `Vector2` exists.
23. Movement directions can be normalized.
24. Diagonal WASD movement has the same speed as horizontal and vertical movement.
25. `Transform` exists.
26. `Entity` exists.
27. `Player` extends `Entity`.
28. `Player` receives `Input` explicitly.
29. `Player` receives time only through `update(dt)`.
30. `Player` does not know about `Engine`.
31. `Scene` exists.
32. `GameScene` contains the Player.
33. Scene updates its Entities.
34. Scene renders its Entities.
35. Engine communicates with Scene instead of Player.
36. Player movement uses WASD.
37. Player movement is frame-rate independent.
38. Player is rendered through Renderer.
39. A minimal debug overlay displays runtime information.
40. The project contains no unnecessary game-engine dependencies.

---

# Final v0.1 Result

The visible result:

```text
┌──────────────────────────────────────────┐
│ FPS: 60                                  │
│ Delta: 0.016                             │
│ Entities: 1                              │
│ Player: 420, 315                         │
│                                          │
│                                          │
│                    ████                  │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

The important result underneath:

```text
Browser
   ↓
Engine
   ├── Time
   ├── Input
   ├── Renderer
   │
   └── GameScene
          ↓
        Player
          ↓
      Transform
          ↓
       Vector2
```

At this point First Motion is complete.

The engine does not yet have a real world, graphics, collisions or multiple scenes.

But it has a clean execution model and a stable architectural foundation for the next version.

---

# Русский перевод

# First Motion — Движок v0.1

## Цель

Создать минимальную, рабочую и понятную основу собственного 2D-движка.

Цель v0.1 — не написать полноценный игровой движок, а заложить архитектурный фундамент, на который затем можно безопасно добавлять остальные системы.

К концу v0.1 движок должен:

* запускаться в браузере;
* рисовать через HTML5 Canvas;
* иметь собственный игровой цикл;
* рассчитывать delta time и FPS;
* обрабатывать клавиатуру;
* иметь базовую 2D-математику;
* поддерживать Transform и Entity;
* иметь базовую Scene;
* правильно переживать потерю браузером фокуса;
* разделять логическое разрешение игры и физическое разрешение Canvas;
* перемещать объект независимо от FPS.

Финальная демонстрация намеренно простая:

> На экране находится прямоугольник, которым можно двигать через WASD.

Визуально это почти ничего, но внутри прямоугольник уже должен работать через архитектуру движка.

---

# Архитектурные решения

Эти решения фиксируются для First Motion v0.1.

## 1. Явные зависимости

Основными системами владеет:

```text
Engine
```

Он создаёт:

```text
Input
Time
Renderer
```

Игровые объекты получают только то, что им действительно необходимо.

Например:

```ts
new Player(input);
```

`Player` получает `Input`.

Но он не получает:

```text
Engine
Time
Canvas
```

Время передаётся через:

```ts
update(dt)
```

---

## 2. Entity + Scene

Для v0.1 используем:

```text
Player extends Entity
```

Этого достаточно.

Пока не вводим:

```text
ECS
Components
Systems
```

К композиции вернёмся, когда появится несколько типов объектов и станет видно реальное дублирование.

---

## 3. Canvas принадлежит Renderer

Только:

```text
Renderer
```

хранит:

```ts
HTMLCanvasElement
CanvasRenderingContext2D
```

Игровой код не вызывает:

```ts
ctx.fillRect(...)
```

Он вызывает:

```ts
renderer.drawRect(...)
```

Инициализация:

```text
main.ts
   ↓
Engine(canvas)
   ↓
Renderer(canvas)
```

После создания Renderer самому Engine Canvas больше хранить не требуется.

---

## 4. Потеря фокуса

При потере браузером фокуса:

* очищаем удерживаемые клавиши;
* очищаем временные состояния ввода.

После возвращения:

* сбрасываем предыдущую временную отметку;
* не учитываем время нахождения игры в фоне.

При необходимости ограничиваем максимальный `deltaTime`.

---

## 5. Логическое разрешение

Мир игры может работать, например, в:

```text
1280 × 720
```

Это логические размеры.

Физический Canvas при Retina-экране может иметь:

```text
2560 × 1440
```

Но игровой код продолжает работать с:

```text
1280 × 720
```

За `devicePixelRatio` отвечает Renderer.

---

## 6. Единицы

Фиксируем:

```text
время       секунды
позиция     логические пиксели
размеры     логические пиксели
скорость    логические пиксели / секунду
углы        радианы
scale       безразмерное число
```

---

## 7. Диагональное движение

Направление WASD нормализуем.

Поэтому:

```text
D       → 200 px/s
W       → 200 px/s
W + D   → 200 px/s
```

а не примерно:

```text
283 px/s
```

---

# 1. Основа проекта

Используем:

* TypeScript;
* Vite;
* HTML5 Canvas;
* без игровых фреймворков;
* без библиотек рендера;
* без UI-фреймворка внутри движка.

Структура:

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
│   ├── entities/
│   └── scenes/
│
└── main.ts
```

В HTML:

```html
<canvas id="game"></canvas>
```

### Готово, когда

* работает `npm install`;
* работает `npm run dev`;
* приложение открывается;
* Canvas отображается;
* TypeScript собирается без ошибок.

---

# 2. Engine Core

Создаём:

```ts
Engine
```

Он координирует системы движка.

Стартовый API:

```ts
const engine = new Engine({
  canvas,
  width: 1280,
  height: 720,
});

engine.start();
```

Engine владеет:

```text
Renderer
Input
Time
Scene
```

Он:

* создаёт системы;
* запускает Game Loop;
* обновляет время;
* обновляет Scene;
* запускает отрисовку;
* завершает Input frame.

Engine ничего не знает конкретно о Player.

---

# 3. Game Loop

Используем:

```ts
requestAnimationFrame()
```

Основной цикл:

```text
новый кадр
    ↓
время
    ↓
update
    ↓
render
    ↓
завершение кадра
    ↓
новый requestAnimationFrame
```

Gameplay внутрь Game Loop напрямую не помещаем.

---

# 4. Жизненный цикл кадра

Каждый кадр выполняется в одном порядке:

```text
1. Input уже получил события браузера
       ↓
2. Time рассчитывает deltaTime
       ↓
3. Scene.update(dt)
       ↓
4. Scene.render(renderer)
       ↓
5. Input.endFrame()
       ↓
6. Следующий animation frame
```

Пример:

```ts
time.update(timestamp);

scene.update(time.deltaTime);

renderer.clear();

scene.render(renderer);

input.endFrame();

requestAnimationFrame(loop);
```

`Input.endFrame()` очищает только:

```text
pressedThisFrame
releasedThisFrame
```

Удерживаемые клавиши остаются.

---

# 5. Time и Delta Time

Создаём:

```ts
Time
```

Он принадлежит Engine.

Основные значения v0.1:

```ts
time.deltaTime;
time.fps;
```

Пример:

```ts
deltaTime = 0.016;
```

Это приблизительно:

```text
16 ms
≈
60 FPS
```

Движение:

```ts
position.x += speed * deltaTime;
```

FPS на первом этапе можно считать как:

```ts
fps = 1 / deltaTime;
```

Сглаживание добавим позже.

При возврате из фоновой вкладки временная точка сбрасывается.

При желании используется дополнительный clamp:

```ts
deltaTime = Math.min(deltaTime, 0.1);
```

---

# 6. Renderer

Создаём:

```ts
Renderer
```

Только он работает напрямую с:

```ts
CanvasRenderingContext2D
```

Для v0.1:

```ts
renderer.clear();
renderer.drawRect(...);
renderer.drawText(...);
```

Пока нет:

```text
Sprites
Camera
Layers
Shaders
WebGL
```

---

# 7. Логическое разрешение и DPI

Конфигурация:

```ts
width: 1280,
height: 720
```

означает логическое разрешение.

Renderer самостоятельно учитывает:

```ts
window.devicePixelRatio
```

Например:

```text
логика
1280 × 720

DPR = 2

Canvas buffer
2560 × 1440
```

Но Player всё ещё работает в координатах:

```text
0...1280
0...720
```

---

# 8. Input System

Создаём:

```ts
Input
```

Пока только клавиатура.

API:

```ts
input.isDown("KeyW");
input.wasPressed("Space");
input.wasReleased("Escape");
```

Состояния:

```text
held
pressed
released
```

После кадра:

```ts
input.endFrame();
```

очищает `pressed` и `released`.

При потере фокуса очищаем всё.

Управление:

```text
W — вверх
A — влево
S — вниз
D — вправо
```

---

# 9. Vector2

Создаём:

```ts
Vector2
```

База:

```ts
class Vector2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
}
```

Базовые операции:

```text
set()
add()
subtract()
multiply()
clone()
length()
normalize()
```

Большую математическую библиотеку пока не создаём.

---

# 10. Нормализация движения

Строим направление:

```ts
const direction = new Vector2();

if (input.isDown("KeyW")) direction.y -= 1;
if (input.isDown("KeyS")) direction.y += 1;
if (input.isDown("KeyA")) direction.x -= 1;
if (input.isDown("KeyD")) direction.x += 1;
```

Если направление не нулевое:

```ts
direction.normalize();
```

Перемещение:

```text
position += direction × speed × dt
```

---

# 11. Transform

Создаём:

```ts
Transform
```

Структура:

```ts
class Transform {
  position = new Vector2();
  rotation = 0;
  scale = new Vector2(1, 1);
}
```

Единицы:

```text
position → logical pixels
rotation → radians
scale    → unitless
```

В v0.1 активно используется в основном `position`.

---

# 12. Entity

Создаём:

```ts
Entity
```

База:

```ts
class Entity {
  transform = new Transform();

  update(dt: number) {}

  render(renderer: Renderer) {}
}
```

Будущие Entity:

```text
Player
Enemy
Coin
Door
Bullet
NPC
```

Но в v0.1 нужен только Player.

---

# 13. Player

Создаём:

```ts
Player extends Entity
```

Player получает Input:

```ts
constructor(
  private readonly input: Input
)
```

Он отвечает только за:

* ввод;
* направление;
* движение;
* изменение Transform;
* отрисовку прямоугольника.

Скорость:

```ts
speed = 200;
```

означает:

```text
200 logical px/s
```

Пока нет:

```text
здоровья
оружия
анимаций
коллизий
физики
инвентаря
```

---

# 14. Scene

Создаём:

```ts
Scene
```

В v0.1 всего одна:

```text
GameScene
```

Scene:

* хранит Entity;
* добавляет Entity;
* обновляет Entity;
* рисует Entity.

API:

```ts
scene.add(player);
```

Engine работает только со Scene.

---

# 15. Цепочка зависимостей

Фиксируем:

```text
main.ts
   ↓
Engine
   │
   ├── Input
   ├── Time
   ├── Renderer
   │
   └── GameScene
          ↓
      Player(Input)
```

Player не получает Engine.

Например:

```ts
new GameScene(input);
```

а GameScene создаёт:

```ts
new Player(input);
```

---

# 16. Engine и Scene

Engine вызывает:

```ts
scene.update(dt);
scene.render(renderer);
```

Scene вызывает:

```ts
entity.update(dt);
entity.render(renderer);
```

Зависимости идут:

```text
Engine
  ↓
Scene
  ↓
Entity
  ↓
Player
```

а не напрямую:

```text
Engine → Player
```

---

# 17. Первый игровой тест

На экране:

```text
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                ████                  │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

WASD двигает Player.

Движение использует:

```text
normalizedDirection × speed × deltaTime
```

---

# 18. Debug Information

Добавляем:

```text
FPS: 60
Delta: 0.016
Entities: 1
Player: 435, 210
```

Рисуем через:

```ts
renderer.drawText(...)
```

Никакой отдельной большой Debug System пока нет.

---

# 19. Проверка потери фокуса

Тест:

```text
зажать D
↓
переключиться на другую вкладку
↓
отпустить D
↓
вернуться
```

Player не должен продолжать двигаться.

Также после длительного нахождения вкладки в фоне Player не должен совершать резкий скачок.

---

# 20. Проверка независимости от FPS

При скорости:

```text
200 px/s
```

за одну секунду ожидаем примерно:

```text
30 FPS  → 200 px
60 FPS  → 200 px
120 FPS → 200 px
```

---

# Архитектура v0.1

```text
Engine
│
├── Time
├── Input
├── Renderer
│
└── Scene
     │
     └── Entity
          │
          ├── Transform
          │    └── Vector2
          │
          └── Player
```

---

# Структура проекта

```text
src/
├── engine/
│   ├── core/
│   │   ├── Engine.ts
│   │   └── Time.ts
│   │
│   ├── rendering/
│   │   └── Renderer.ts
│   │
│   ├── input/
│   │   └── Input.ts
│   │
│   ├── math/
│   │   └── Vector2.ts
│   │
│   ├── entities/
│   │   ├── Entity.ts
│   │   └── Transform.ts
│   │
│   └── scene/
│       └── Scene.ts
│
├── game/
│   ├── entities/
│   │   └── Player.ts
│   │
│   └── scenes/
│       └── GameScene.ts
│
└── main.ts
```

---

# Не входит в v0.1

Пока не реализуем:

```text
Sprites
Sprite Sheets
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
Entity Factory
GameState
Save system
Particles
ECS
Components
Systems
Event Bus
Gamepad
Mouse
Touch
Level Editor
WebGL
Shaders
Multiple rendering backends
Networking
Prefabs
Serialization
```

---

# Definition of Done

First Motion v0.1 завершён, когда:

1. Проект запускается через Vite.
2. Движок работает в браузере.
3. Canvas работает.
4. Game Loop принадлежит Engine.
5. Engine владеет Time, Input и Renderer.
6. Renderer полностью управляет Canvas.
7. Игровой код не использует Canvas API напрямую.
8. Delta Time считается в секундах.
9. FPS доступен для debug-информации.
10. Возвращение из фоновой вкладки не создаёт огромный delta.
11. Потеря фокуса очищает состояние клавиатуры.
12. Работает `isDown`.
13. Работает `wasPressed`.
14. Работает `wasReleased`.
15. Есть определённый Frame Lifecycle.
16. Логическое разрешение отделено от Canvas buffer.
17. Renderer учитывает `devicePixelRatio`.
18. Координаты используют logical pixels.
19. Скорость измеряется в logical pixels / second.
20. Углы измеряются в радианах.
21. Scale безразмерный.
22. Есть Vector2.
23. Направления можно нормализовать.
24. Диагональное движение не быстрее обычного.
25. Есть Transform.
26. Есть Entity.
27. Player наследует Entity.
28. Player явно получает Input.
29. Player получает время только через `update(dt)`.
30. Player не знает про Engine.
31. Есть Scene.
32. Есть GameScene.
33. GameScene содержит Player.
34. Scene обновляет Entity.
35. Scene рисует Entity.
36. Engine работает со Scene, а не с Player.
37. Player управляется WASD.
38. Движение не зависит от FPS.
39. Player рисуется через Renderer.
40. Есть минимальный Debug Overlay.
41. Нет лишних зависимостей от игровых движков.

---

# Результат First Motion v0.1

На экране:

```text
┌──────────────────────────────────────────┐
│ FPS: 60                                  │
│ Delta: 0.016                             │
│ Entities: 1                              │
│ Player: 420, 315                         │
│                                          │
│                    ████                  │
│                                          │
└──────────────────────────────────────────┘
```

Под ним уже работает:

```text
Browser
   ↓
Engine
   ├── Time
   ├── Input
   ├── Renderer
   │
   └── GameScene
          ↓
        Player
          ↓
      Transform
          ↓
       Vector2
```

На этом **First Motion v0.1** считается завершённым.

Следующая версия уже сможет строить настоящий игровой мир поверх этого фундамента.
