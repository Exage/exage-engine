# Getting Started

The project currently runs an empty Canvas through its own Engine loop. Time, keyboard Input, and basic Renderer APIs are implemented. A movable Player, Scene, and debug overlay are still planned.

## Requirements

Use Node.js 22.13 or later within the 22.x line, or Node.js 24.x, with npm. These versions satisfy the declared engine ranges of the installed Vite, Vitest, and ESLint packages. A browser with Canvas 2D support is required.

## Install and run

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The page shows a dark Canvas fitted inside the viewport. The console logs `[Exage Engine] Started`. No rectangle or visible response to WASD is expected yet.

## Application setup

[index.html](../index.html) provides `<canvas id="game">` and loads [src/main.ts](../src/main.ts). The entry point imports CSS, checks that the Canvas exists, creates Engine, and starts it:

```ts
import './style.css'
import { Engine } from '@/engine'

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const engine = new Engine({ canvas, width: 1280, height: 720 })
engine.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.stop())
}
```

`@/` maps to `src/`. Use it for project imports. The dimensions define logical game coordinates; Renderer handles display density internally.

## Build and preview

```sh
npm run build
npm run preview
```

Build checks TypeScript and writes the production site to `dist/`. Preview serves that build locally; run build again after source changes before checking the updated production output.

## Development commands

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run typecheck`    | Check TypeScript without emitting files.       |
| `npm run test:run`     | Run the test suite once.                       |
| `npm test`             | Start Vitest in its default development mode.  |
| `npm run lint`         | Check ESLint rules with zero warnings allowed. |
| `npm run lint:fix`     | Apply available lint fixes.                    |
| `npm run format:check` | Check repository formatting.                   |
| `npm run format`       | Rewrite repository files using Prettier.       |

## Environment configuration

[vite.config.mjs](../vite.config.mjs) defines `VITE_ENVIRONMENT`. By default it is `production` in production mode and `development` otherwise. Only those two values are accepted.

The [devLog](../src/utils/devLog.ts) helper uses this value to suppress its output in production. Engine's startup message currently uses `console.log` directly and is not suppressed by that helper.

## Where to go next

- [Engine](Engine.md): startup, shutdown, and the frame loop.
- [Time](Time.md): delta time, FPS, and focus recovery.
- [Input](Input.md): held keys and per-frame transitions.
- [Vector2](Vector2.md): positions, directions, and normalized movement.
- [Transform](Transform.md): object position, rotation, and scale.
- [Renderer](Renderer.md): drawing, text, and display density.
- [Architecture](Architecture.md): current structure and dependency rules.
- [First Motion roadmap](First%20Motion%20%E2%80%94%20Engine%20v0.1%20Roadmap.md): planned work and completion criteria.
