# GeoFS-Better-Crashes-A-userscript-for-GeoFS-
# GeoFS Better Crashes  A userscript for [GeoFS](https://www.geo-fs.com/) that makes crashing actually feel like something happened.
# GeoFS Better Crashes

A userscript for [GeoFS](https://www.geo-fs.com/) that makes crashing actually feel like something happened. When your aircraft goes down, you get a screen flash, an expanding shockwave ring, flying debris particles, an exaggerated camera shake, and a loud explosion sound synced to your impact speed.

## Features

- **Two crash modes**, switchable anytime:
  - **Default** — flash, shockwave, debris, camera shake, and a lingering fire tint over the screen.
  - **Realistic** — everything hits at once, then cuts hard to black and mutes all page audio, simulating a real loss-of-consciousness moment.
- **Speed-scaled explosion volume** — a slow ground scrape sounds a lot different than slamming in at 300 knots.
- **In-game settings panel** (press `Alt+N`) with sliders for flash duration, shake intensity, debris count, fire tint duration, cut-to-black timing, and explosion volume — plus a one-click reset to defaults.
- Draggable panel, closes with `Esc` or the `✕` button.
- No dependencies, no external frameworks — pure vanilla JS.

## Installation

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) (recommended), Violentmonkey, or Greasemonkey.
2. Install the script (via the raw `.user.js` file in this repo, or drag-and-drop it into your userscript manager's dashboard).
3. Load into [geo-fs.com](https://www.geo-fs.com/) and crash responsibly.

## Usage

- The explosion effects trigger automatically whenever GeoFS registers a crash.
- Press `Alt+N` in-game to open the settings panel and tweak the experience to your liking.

## License

Public domain / [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Do whatever you want with this — use it, modify it, redistribute it, no attribution required. Credit is appreciated but not necessary.

## Credits

Explosion sound: *"audiomass-output (1).mp3"* by [EvanBoyerman](https://freesound.org/people/EvanBoyerman/) on Freesound, used under Creative Commons Attribution-NonCommercial 3.0.
