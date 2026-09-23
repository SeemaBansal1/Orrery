# Orrery — Explore the Solar System

An interactive 3D atlas of the Solar System built with Three.js (r128) and WebGL.

## Run it
Open `index.html` in a current browser. It's a single self-contained file; it loads
Three.js and its post-processing add-ons from cdnjs / jsDelivr and fonts from Google Fonts,
so an internet connection is needed. For local development, serve the folder
(e.g. `python3 -m http.server`) and visit http://localhost:8000.

## Source layout
- `src/index.html` – page markup (CSS and JS are injected at build time)
- `src/style.css` – design tokens, glass UI, responsive layout
- `src/1_data.js` – planetary data, missions, tour script
- `src/2_shaders.js` – GLSL: noise, texture baking, planets, atmosphere, rings, Sun, stars, grid
- `src/3_scene.js` – renderer, GPU texture baking, scene objects, camera system, frame loop
- `src/4_ui.js` – info panel, visualisations, drawers, compare, explore HUD, tour, journey, search, input

## Rebuild
Edit files in `src/`, then run `python3 build.py` to regenerate `index.html`.

## Data
Planetary figures: NASA Planetary Fact Sheet. Moon counts: NASA, mid-2026.
Distances and sizes are compressed in the Realistic view; the Comparison view shows true relative sizes.
