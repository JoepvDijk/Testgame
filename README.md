# Testgame
Testing a game
## Minimal Endless Runner

A lightweight 2D endless runner built with HTML5 Canvas and vanilla JavaScript.  
You control a square runner that jumps over incoming rectangular obstacles while the world scrolls left and gets faster over time.

## How to Run

1. Open `index.html` in any modern browser.
2. No build steps, installs, or servers are required.

## Controls

- `Space`: Start the game / jump
- `R`: Restart after game over
- `Restart` button: Click to restart after game over

## Gameplay Notes

- The player can only jump when grounded (double jump is disabled by default in code).
- Obstacles spawn at randomized intervals with a minimum spacing rule for fairness.
- Collision uses AABB (Axis-Aligned Bounding Box) checks.
- Score increases over time.
- Difficulty increases progressively as world speed rises and spawn delay trends shorter.
- High score is saved using `localStorage`.

## File Structure

- `index.html`: page layout and canvas/button elements
- `style.css`: minimal styling and responsive canvas presentation
- `game.js`: game loop, physics, spawning, collision, rendering, and reset logic
- `README.md`: run instructions and overview
