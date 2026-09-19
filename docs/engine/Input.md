# Input

`Input` remembers which keyboard keys are held, pressed, or released. Game code reads this state instead of handling browser keyboard events directly.

`Engine` owns one instance, available as `engine.input`. The implementation is in [Input.ts](../../src/engine/input/Input.ts).

## Reading keyboard state

| Method              | Meaning                                    | Typical use                       |
| ------------------- | ------------------------------------------ | --------------------------------- |
| `isDown(code)`      | The key is currently held.                 | Continuous movement.              |
| `wasPressed(code)`  | The key became pressed during this frame.  | Trigger an action once per press. |
| `wasReleased(code)` | A held key was released during this frame. | React to the end of a press.      |

Use physical `KeyboardEvent.code` values: `KeyW`, `KeyA`, `KeyS`, `KeyD`, `Space`, or `Escape`. Do not use characters such as `w` or `d`. These codes identify key positions independently of the active keyboard layout.

Reading a state does not clear it. Multiple objects can read the same press during one frame.

## Example: holding D

The values below are read before `endFrame()`:

| What happened               | `isDown('KeyD')` | `wasPressed('KeyD')` | `wasReleased('KeyD')` |
| --------------------------- | ---------------- | -------------------- | --------------------- |
| No input yet                | `false`          | `false`              | `false`               |
| D was just pressed          | `true`           | `true`               | `false`               |
| Next frame, D is still held | `true`           | `false`              | `false`               |
| D was just released         | `false`          | `false`              | `true`                |
| Next frame                  | `false`          | `false`              | `false`               |

Internally, three sets store these states: `held`, `pressed`, and `released`. `endFrame()` clears only `pressed` and `released`; held keys remain held.

## Engine lifecycle

Creating an `Input` instance does not attach browser listeners. `engine.start()` calls `input.start()` to begin listening. Repeated starts do not attach duplicate listeners.

Browser events update Input between frames. The current Engine frame runs in this order:

```text
Time.update(timestamp)
Scene.update(dt)          ← Read Input here
Renderer.clear()
Scene.render(renderer)
Input.endFrame()
Request the next animation frame
```

Scene calls run when a scene is selected through `engine.setScene(scene)`. Gameplay reads Input before `endFrame()`, with cleanup following scene rendering.

Game objects should receive only the dependencies they need, such as `Input`, and should not call `start()`, `stop()`, or `endFrame()` themselves. Engine manages those methods.

`engine.stop()` calls `input.stop()`, which removes listeners and clears all keyboard state. Keyboard events while stopped are ignored. Starting again attaches the listeners with empty state. Engine also stops and clears Input if its frame fails.

## Using Input in gameplay

This standalone example shows how a future game object can read Input. It is not currently connected to a Scene or rendered on screen.

```ts
import type { Input } from '@/engine'

class MovementExample {
  x = 0
  private readonly speed = 200

  constructor(private readonly input: Input) {}

  update(dt: number): void {
    if (this.input.isDown('KeyD')) {
      this.x += this.speed * dt
    }

    if (this.input.wasPressed('Space')) {
      this.x = 0
    }
  }
}
```

Pass `engine.input` when constructing the object. Calling `update(dt)` once per frame moves it right while D is held and resets its position once when Space is pressed. `dt` is in seconds, so the movement speed is 200 logical pixels per second. Input itself does not calculate movement or delta time.

## Focus loss and special cases

- Losing window focus or hiding the document clears all three sets. This prevents stuck movement when a key is released in another tab.
- Clearing state does not generate release events: `wasReleased()` also becomes `false`.
- Returning to the page does not restore held keys. Release and press a key again to resume input. Engine separately resets Time to avoid including the inactive period in movement.
- Browser key-repeat events are ignored. Holding a key does not repeatedly set `wasPressed()`. Duplicate keydowns for an already held key are also ignored.
- A keyup only records a release if Input was tracking that key as held.
- A quick press and release between frames records both transitions: `wasPressed()` and `wasReleased()` are both `true`, while `isDown()` is `false`. If the key is pressed again before cleanup, all three are `true`. The sets record whether a transition occurred, not its count or order.

## Shortcuts

`bindShortcut(action, code, modifiers)` registers a named shortcut. For example, `input.bindShortcut('toggleColliders', 'KeyC', { metaKey: true })` captures Command+C. The optional modifier fields are `metaKey`, `ctrlKey`, `altKey`, and `shiftKey`; omitted fields must be false. Binding an existing action replaces its shortcut.

Read `wasShortcutPressed(action)` during update. Modifiers are captured at keydown, so quick taps still work when Command is released before the next frame. Matching keydowns prevent the browser default action. Repeats do not activate the action, and a fresh keydown works even if macOS omitted the previous keyup while Command was held. `endFrame()`, focus loss, and stopping Input clear pending shortcut presses. Bindings persist across stop/start.

## Current scope

Input handles keyboard events on `window`, rather than only on the Canvas. It does not filter text fields and only prevents default actions for registered shortcuts. Mouse movement and left clicks are tracked on the Canvas. Touch and gamepad support are not implemented.
