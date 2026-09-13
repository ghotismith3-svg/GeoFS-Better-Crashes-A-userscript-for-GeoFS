# GeoFS Better Crashes

A userscript for [GeoFS](https://www.geo-fs.com/) that makes crashing actually feel like something happened. When your aircraft goes down, you get a screen flash, an expanding shockwave ring, flying debris, camera shake, and more—all customizable. OPEN DASHBOARD WITH ALT+N

## Features

- **Two crash modes**, switchable anytime:
  - **Default** — flash, shockwave, debris, camera shake, and a lingering fire tint over the screen.
  - **Realistic** — everything hits at once, then cuts hard to black and mutes all page audio, simulating a real loss-of-consciousness moment.
- **Speed-scaled explosion volume** — a slow ground scrape sounds a lot different than slamming in at 300 knots.
- **In-game settings panel** (press `Alt+N`) with sliders for flash duration, shake intensity, debris count, fire tint duration, cut-to-black timing, and explosion volume — plus a one-click reset.
- Draggable panel, closes with `Esc` or the `✕` button.
- No dependencies, no external frameworks — pure vanilla JavaScript.

## Installation

### Recommended Setup

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)
   - [Greasemonkey](https://www.greasespot.net/) (Firefox)

2. Install the script:
   - **Option A:** Click the raw `.user.js` file in this repo and your userscript manager will prompt you to install.
   - **Option B:** Copy the contents of the `.user.js` file and paste into a new userscript in your manager's dashboard.
   - **Option C:** Install from [Greasy Fork](https://greasyfork.org/) (when available).

3. Load [geo-fs.com](https://www.geo-fs.com/) and crash responsibly!

## Usage

- The explosion effects trigger **automatically** whenever GeoFS registers a crash.
- Press **`Alt+N`** in-game to open the settings panel and tweak the experience to your liking.
- All settings persist across sessions.

## Customization

The in-game settings panel lets you adjust:
- Flash duration
- Camera shake intensity
- Debris particle count
- Fire tint duration
- Cut-to-black timing (Realistic mode)
- Explosion volume
- One-click reset to defaults

## License

License
CC BY 4.0 — see LICENSE. Use it, fork it, build on it — just credit the source.

## Credits

- Explosion sound: *"audiomass-output (1).mp3"* by [EvanBoyerman](https://freesound.org/people/EvanBoyerman/) on [Freesound](https://freesound.org/), used under Creative Commons Attribution-NonCommercial 3.0.

## Troubleshooting

**Script not working?**
- Confirm your userscript manager is enabled.
- Check that you're on [geo-fs.com](https://www.geo-fs.com/).
- Ensure the script is set to run on the GeoFS domain.

**Sounds not playing?**
- Check your browser volume and GeoFS volume settings.
- Ensure your userscript manager hasn't blocked media permissions.

## Feedback & Contributions

Found a bug? Have a suggestion? Feel free to open an [issue](https://github.com/ghotismith3-svg/GeoFS-Better-Crashes-A-userscript-for-GeoFS/issues) on GitHub.

Interested in contributing? Pull requests are welcome!

---

Enjoy the crash! ✈️💥
