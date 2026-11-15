import './threejs-override.js'
import { Game } from './Game/Game.js'
import { Intro } from './Game/World/Intro.js'
import { Reveal } from './Game/Reveal.js'
import consoleLog from './data/consoleLog.js'

if(import.meta.env.VITE_LOG)
    console.log(...consoleLog)

// Relay the same resource progress that fills the ring around the car.
const updateIntroProgress = Intro.prototype.updateProgress;
Intro.prototype.updateProgress = function(progress) {
    const result = updateIntroProgress.call(this, progress);
    window.dispatchEvent(new CustomEvent('portfolio-world-progress', { detail: { progress } }));
    return result;
};
// Share the exact material color used by the car's reveal ring.
const updateReveal = Reveal.prototype.update;
Reveal.prototype.update = function(...args) {
    const result = updateReveal.apply(this, args);
    const now = performance.now();
    if (this.step <= 0 && (!this.portfolioColorSentAt || now - this.portfolioColorSentAt >= 100)) {
        this.portfolioColorSentAt = now;
        window.dispatchEvent(new CustomEvent('portfolio-world-ring-color', { detail: { color: this.color.value.getStyle() } }));
    }
    return result;
};
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
