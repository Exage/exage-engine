# Time

`Time` measures the interval between animation frames. Game objects will use that interval to move a distance per second instead of a distance per frame.

Source: [Time.ts](../src/engine/core/Time.ts). Engine owns an instance at `engine.time`.

## API and units

| Member              | Meaning                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `update(timestamp)` | Accept a browser animation timestamp in milliseconds.                  |
| `deltaTime`         | Simulation interval in seconds, capped at `0.1`.                       |
| `fps`               | Instantaneous frames per second calculated from the uncapped interval. |
| `reset()`           | Clear the previous timestamp and set delta and FPS to zero.            |

Engine calls `update()` and `reset()`. Future gameplay receives the delta through `update(dt)` rather than owning or updating Time.

## Calculation

```text
interval = max(0, (timestamp - previousTimestamp) / 1000)
deltaTime = min(interval, 0.1)
fps = interval > 0 ? 1 / interval : 0
```

The first update after construction or reset only establishes a reference. Delta and FPS remain zero until the next update.

```ts
import { Time } from '@/engine'

const time = new Time()
time.update(1000)
// deltaTime: 0, fps: 0

time.update(1020)
// deltaTime: 0.02, fps: 50
```

Equal or decreasing timestamps produce zero delta and zero FPS rather than negative movement or infinite FPS. Every update stores the supplied timestamp as the next reference. Pass finite animation timestamps; Time does not validate arbitrary input values.

## Movement example

For a speed of 200 logical pixels per second:

```ts
position.x += 200 * dt
```

At 60 FPS, one frame moves approximately 3.33 pixels. At 30 FPS, one frame moves approximately 6.67 pixels. Over one second of regular frames, both travel approximately 200 pixels.

The Player and its movement are still planned; this is the formula that gameplay will use.

## Long frames and FPS

A two-second frame interval produces `deltaTime = 0.1` and `fps = 0.5`. The cap limits simulation movement after a stall, while FPS still reports the real interval. Consequently, `fps` is not always `1 / deltaTime`.

The cap deliberately discards simulation time during long stalls. Time does not catch up using extra simulation steps. FPS is an instantaneous value without smoothing, and there is no elapsed-time counter or fixed-step loop.

## Returning to the page

Engine resets Time on start, stop, blur, focus, and visibility changes while its listeners are active. After reset, the next frame establishes a fresh reference instead of including the inactive period in its delta.

Time itself does not listen to browser events. [Engine](Engine.md) handles those events; [Input](Input.md) separately clears keyboard state to prevent stuck keys.
