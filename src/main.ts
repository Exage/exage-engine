import './style.css'
import { Engine } from '@/engine'
import { GameScene } from '@/game/scenes/GameScene'

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const width = 1280
const height = 720
const engine = new Engine({ canvas, width, height })
engine.setScene(new GameScene(engine.input, engine.time, width, height))

engine.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.stop())
}
