import './threejs-override.js'
import { Game } from './Game/Game.js'
import consoleLog from './data/consoleLog.js'

if(import.meta.env.VITE_LOG)
    console.log(...consoleLog)

const game = new Game()
if(import.meta.env.VITE_GAME_PUBLIC)
    window.game = game

game.ready.then(() => {
 const grid = game.world.grid;
 const show = grid.show.bind(grid);
 grid.show = (...args) => {
  const result = show(...args);
  requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event('portfolio-world-ready'))));
  return result;
 };
}).catch(() => window.dispatchEvent(new Event('portfolio-world-error')));
