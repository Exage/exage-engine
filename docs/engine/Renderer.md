# Renderer

`Renderer` draws rectangles and text through Canvas 2D. It owns the Canvas and its rendering context, keeping direct Canvas calls out of gameplay.

Source: [Renderer.ts](../../src/engine/rendering/Renderer.ts).

## API

| Member                                  | Purpose                                                 |
| --------------------------------------- | ------------------------------------------------------- |
| `new Renderer(canvas, width, height)`   | Prepare a Canvas with logical dimensions.               |
| `width`, `height`                       | Readonly logical dimensions in pixels.                  |
| `clear()`                               | Refresh display density and clear the logical viewport. |
| `drawRect(x, y, width, height, color?)` | Draw a filled rectangle; default color is `#ffffff`.    |
| `drawText(text, x, y, options?)`        | Draw text anchored at its top left.                     |

Coordinates start at the top-left corner. X increases to the right and Y increases downward. Positions, rectangle dimensions, and font sizes use logical pixels.

Construction requires positive integer dimensions and throws a `RangeError` otherwise. If `canvas.getContext('2d')` is unavailable, it throws an error.

## Drawing example

This is a standalone drawing example, without an Engine loop. Do not create a second Renderer for a Canvas already owned by Engine.

```ts
import { Renderer } from '@/engine'

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const renderer = new Renderer(canvas, 1280, 720)
renderer.clear()
renderer.drawRect(100, 200, 40, 40, '#66ccff')
renderer.drawText('Hello', 16, 16, { fontSize: 20, color: '#ffffff' })
```

Clear before drawing a new frame. Later draws can cover earlier ones. `clear()` removes Canvas pixels; it does not paint a background color. The current application's background comes from CSS.

Engine's Renderer is private. The active [Scene](Scene.md) receives it during rendering and passes it to each entity's render method.

## Text options

| Option       | Default     | Meaning                      |
| ------------ | ----------- | ---------------------------- |
| `color`      | `#ffffff`   | Text fill color.             |
| `fontSize`   | `16`        | Font size in logical pixels. |
| `fontFamily` | `monospace` | Canvas font family.          |

Each call applies its own options and defaults. A previous call with a larger font does not change the next call's default size. Text uses left alignment and a top baseline. There is no automatic wrapping or multiline layout.

## Logical resolution and DPI

Logical resolution is the coordinate space used for drawing. The backing buffer is the physical pixel storage used by Canvas.

For a logical size of 1280 × 720:

| Device pixel ratio | Backing buffer | Drawing coordinates |
| ------------------ | -------------- | ------------------- |
| 1                  | 1280 × 720     | 1280 × 720          |
| 2                  | 2560 × 1440    | 1280 × 720          |

Renderer reads `window.devicePixelRatio` during construction and every `clear()`. Invalid or nonpositive values fall back to 1. Buffer dimensions are rounded and kept at least one pixel wide and high. The context transform uses the actual buffer-to-logical ratios, including fractional-density rounding.

The buffer is resized only when its dimensions change. Gameplay does not need to read DPI or multiply its coordinates by it.

## CSS size

Renderer sets a logical CSS width, automatic height, and the Canvas aspect ratio. It also sets `--canvas-aspect-ratio`, which [style.css](../../src/style.css) uses to fit the Canvas inside the viewport.

CSS can shrink the displayed Canvas without changing logical coordinates. Backing resolution is based on logical dimensions and DPI, not the measured CSS display size. There is currently no public API for changing logical resolution after construction.

Sprites, cameras, rotation and scale APIs, layers, WebGL, and multiple graphics backends are outside the current implementation. See [Architecture](../Architecture.md) for ownership rules.
