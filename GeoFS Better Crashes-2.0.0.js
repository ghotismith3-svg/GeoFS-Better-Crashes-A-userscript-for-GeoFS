// ==UserScript==
// @name         GeoFS Better Crashes
// @namespace    https://github.com/
// @version      2.1.0
// @description  Visual explosion + loud sound + exaggerated shake on crash in GeoFS. Includes a "Realistic" mode (hard cut to black + hidden native crash text) and a settings panel (Alt+N) with sliders and reset.
// @author       You
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// @license      CC0-4.0
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // DEFAULT VALUES AND CURRENT SETTINGS
    // ============================================================
    const DEFAULTS = Object.freeze({
        mode: "default", // "default" | "realistic"
        realisticCutMs: 235,
        realisticFlashMs: 24,
        defaultFlashMs: 60,
        explosionVolume: 3,
        shakeIntensity: 45, // max px offset; rotation scales alongside this
        fireTintDurationMs: 6000,
        debrisCount: 70
    });

    const SETTINGS = { ...DEFAULTS };

    // fixed ratio between offset (px) and rotation (degrees) from the original shake: 3.5/45
    const SHAKE_ROTATE_RATIO = 3.5 / 45;

    // ============================================================
    // STATE
    // ============================================================
    let wasCrashed = false;
    let audioUnlocked = false;
    let lastSpeedKnots = 0;

    const mutedMediaElements = new Map();
    let pageAudioMuted = false;

    // ============================================================
    // AUDIO: EXPLOSION
    // ============================================================
    const EXPLOSION_MP3_URL =
        "https://cdn.jsdelivr.net/gh/ghotismith3-svg/laexplosiondeimpacto@main/audiomass-output%20%281%29.mp3";

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -8;
    compressor.knee.value = 6;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const makeupGain = audioCtx.createGain();
    makeupGain.gain.value = 2.2;

    const speedGain = audioCtx.createGain();
    speedGain.gain.value = 1;

    // Tag this node so the separate "GeoFS Volume Boost" script (if installed)
    // knows to skip it and NOT apply the cockpit-view boost to explosion sound.
    speedGain.__bcNoBoost = true;

    compressor.connect(makeupGain).connect(speedGain).connect(audioCtx.destination);

    const explosionAudio = new Audio(EXPLOSION_MP3_URL);
    explosionAudio.crossOrigin = "anonymous";
    explosionAudio.preload = "auto";

    const explosionGain = audioCtx.createGain();
    explosionGain.gain.value = SETTINGS.explosionVolume;

    const explosionSource = audioCtx.createMediaElementSource(explosionAudio);
    explosionSource.connect(explosionGain).connect(compressor);

    function playExplosionSound() {
        const now = audioCtx.currentTime;

        explosionAudio.currentTime = 0;
        explosionAudio.play().catch((err) => console.warn("🔇 Explosion audio blocked:", err));

        const sub = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();

        sub.type = "triangle";
        sub.frequency.setValueAtTime(70, now);
        sub.frequency.exponentialRampToValueAtTime(24, now + 0.6);

        subGain.gain.setValueAtTime(3.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        sub.connect(subGain).connect(compressor);
        sub.start(now);
        sub.stop(now + 0.9);
    }

    // ============================================================
    // SCRIPT AUDIO / MUTING IN REALISTIC MODE
    // ============================================================
    function muteCrashAudio() {
        try {
            speedGain.gain.cancelScheduledValues(audioCtx.currentTime);
            speedGain.gain.setValueAtTime(0, audioCtx.currentTime);
        } catch (e) {}
        try {
            explosionAudio.pause();
        } catch (e) {}
    }

    function restoreCrashAudio() {
        try {
            speedGain.gain.cancelScheduledValues(audioCtx.currentTime);
            speedGain.gain.setValueAtTime(1, audioCtx.currentTime);
        } catch (e) {}
    }

    function mutePageAudio() {
        if (pageAudioMuted) return;
        pageAudioMuted = true;
        document.querySelectorAll("audio, video").forEach((el) => {
            if (el === explosionAudio) return;
            if (!mutedMediaElements.has(el)) {
                mutedMediaElements.set(el, { muted: el.muted, volume: el.volume });
            }
            el.muted = true;
        });
    }

    function restorePageAudio() {
        pageAudioMuted = false;
        mutedMediaElements.forEach((state, el) => {
            try {
                el.muted = state.muted;
                el.volume = state.volume;
            } catch (e) {}
        });
        mutedMediaElements.clear();
        restoreCrashAudio();
    }

    const mediaObserver = new MutationObserver(() => {
        if (!pageAudioMuted) return;
        document.querySelectorAll("audio, video").forEach((el) => {
            if (el === explosionAudio) return;
            if (!mutedMediaElements.has(el)) {
                mutedMediaElements.set(el, { muted: el.muted, volume: el.volume });
            }
            el.muted = true;
        });
    });
    mediaObserver.observe(document.documentElement, { childList: true, subtree: true });

    function unlockAudio() {
        if (audioUnlocked) return;
        audioCtx.resume();
        explosionAudio
            .play()
            .then(() => {
                explosionAudio.pause();
                explosionAudio.currentTime = 0;
            })
            .catch(() => {});
        audioUnlocked = true;
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
    }
    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    // ============================================================
    // FLASH
    // ============================================================
    const flash = document.createElement("div");
    flash.style.cssText = `
        position:fixed; inset:0; z-index:999998;
        background:#fff; opacity:0; pointer-events:none;
    `;
    document.body.appendChild(flash);

    function triggerFlash() {
        const duration = SETTINGS.mode === "realistic" ? SETTINGS.realisticFlashMs : SETTINGS.defaultFlashMs;
        flash.style.transition = "none";
        flash.style.opacity = "0.95";
        setTimeout(() => {
            flash.style.transition = SETTINGS.mode === "realistic" ? "opacity 0.06s ease-out" : "opacity 1.1s ease-out";
            flash.style.opacity = "0";
        }, duration);
    }

    // ============================================================
    // SHOCKWAVE
    // ============================================================
    const activeRings = [];

    function triggerShockwave() {
        const ring = document.createElement("div");
        ring.style.cssText = `
            position:fixed; top:50%; left:50%; z-index:999997;
            width:80px; height:80px; border-radius:50%;
            border:10px solid rgba(255,140,0,0.9);
            box-shadow:0 0 40px 10px rgba(255,80,0,0.6);
            pointer-events:none;
            transform:translate(-50%,-50%) scale(0);
            opacity:1;
            transition: transform 0.8s cubic-bezier(0.1,0.8,0.3,1), opacity 0.8s ease-out;
        `;
        document.body.appendChild(ring);
        activeRings.push(ring);
        requestAnimationFrame(() => {
            ring.style.transform = "translate(-50%,-50%) scale(9)";
            ring.style.opacity = "0";
        });
        setTimeout(() => {
            ring.remove();
            const idx = activeRings.indexOf(ring);
            if (idx !== -1) activeRings.splice(idx, 1);
        }, 850);
    }

    // ============================================================
    // PARTICLES
    // ============================================================
    const debrisCanvas = document.createElement("canvas");
    debrisCanvas.style.cssText = `position:fixed; inset:0; z-index:999996; pointer-events:none;`;
    document.body.appendChild(debrisCanvas);
    const debrisCtx = debrisCanvas.getContext("2d");

    function resizeCanvas() {
        debrisCanvas.width = window.innerWidth;
        debrisCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let particles = [];
    let particleLoopRunning = false;

    function spawnDebris() {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const count = SETTINGS.debrisCount;
        const colors = ["#ff8c00", "#ff4500", "#ffd700", "#8a8a8a", "#3a3a3a"];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 14;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: 2 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: 0.008 + Math.random() * 0.014,
                gravity: 0.35 + Math.random() * 0.25
            });
        }
        if (!particleLoopRunning) {
            particleLoopRunning = true;
            requestAnimationFrame(particleLoop);
        }
    }

    function particleLoop() {
        debrisCtx.clearRect(0, 0, debrisCanvas.width, debrisCanvas.height);
        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= p.decay;
            debrisCtx.globalAlpha = Math.max(p.life, 0);
            debrisCtx.fillStyle = p.color;
            debrisCtx.fillRect(p.x, p.y, p.size, p.size);
        });
        particles = particles.filter((p) => p.life > 0);
        debrisCtx.globalAlpha = 1;
        if (particles.length > 0) {
            requestAnimationFrame(particleLoop);
        } else {
            particleLoopRunning = false;
            debrisCtx.clearRect(0, 0, debrisCanvas.width, debrisCanvas.height);
        }
    }

    // ============================================================
    // FIRE TINT
    // ============================================================
    const fireTint = document.createElement("div");
    fireTint.style.cssText = `position:fixed; inset:0; z-index:999995; background:rgba(255,120,0,0); pointer-events:none;`;
    document.body.appendChild(fireTint);

    let fireTintIntervalId = null;
    let fireTintSafetyTimeout = null;

    function startFireTint() {
        stopFireTint();
        fireTint.style.transition = "none";
        fireTintIntervalId = setInterval(() => {
            const warm = Math.random();
            const g = Math.floor(60 + warm * 140);
            const alpha = 0.1 + Math.random() * 0.22;
            fireTint.style.background = `rgba(255,${g},0,${alpha})`;
        }, 90);
        fireTintSafetyTimeout = setTimeout(stopFireTint, SETTINGS.fireTintDurationMs);
    }

    function stopFireTint() {
        if (fireTintIntervalId) { clearInterval(fireTintIntervalId); fireTintIntervalId = null; }
        if (fireTintSafetyTimeout) { clearTimeout(fireTintSafetyTimeout); fireTintSafetyTimeout = null; }
        fireTint.style.transition = "background 0.6s ease-out";
        fireTint.style.background = "rgba(255,120,0,0)";
    }

    // ============================================================
    // BLACKOUT
    // ============================================================
    const blackout = document.createElement("div");
    blackout.style.cssText = `position:fixed; inset:0; z-index:1000000; background:#000; opacity:0; pointer-events:none;`;
    document.body.appendChild(blackout);

    function showBlackout() {
        blackout.style.transition = "opacity 0.06s ease-in";
        blackout.style.opacity = "1";
    }
    function hideBlackout() {
        blackout.style.transition = "opacity 0.8s ease-out";
        blackout.style.opacity = "0";
    }

    // ============================================================
    // HIDE NATIVE "YOU CRASHED" OVERLAY (Realistic mode only)
    // Invisible but still clickable (so "click to reset" still works)
    // ============================================================
    const nativeCrashOverlayStyle = document.createElement("style");
    nativeCrashOverlayStyle.id = "bc-hide-native-crash-overlay";
    nativeCrashOverlayStyle.textContent = `
        html.bc-realistic-mode .geofs-crashOverlay.geofs-crashed {
            opacity: 0 !important;
            color: transparent !important;
        }
    `;
    document.head.appendChild(nativeCrashOverlayStyle);

    function syncRealisticModeClass() {
        document.documentElement.classList.toggle("bc-realistic-mode", SETTINGS.mode === "realistic");
    }
    syncRealisticModeClass(); // set initial state on load

    // ============================================================
    // CAMERA SHAKE
    // ============================================================
    let shakeIntervalId = null;
    let shakeTarget = null;

    function triggerCameraShake() {
        const target = document.fullscreenElement || document.webkitFullscreenElement || document.body;
        shakeTarget = target;

        const totalFrames = 26;
        let frame = 0;
        const maxOffset = SETTINGS.shakeIntensity;
        const maxRotate = SETTINGS.shakeIntensity * SHAKE_ROTATE_RATIO;

        if (shakeIntervalId) clearInterval(shakeIntervalId);

        shakeIntervalId = setInterval(() => {
            frame++;
            const decay = 1 - frame / totalFrames;
            const x = (Math.random() - 0.5) * maxOffset * decay;
            const y = (Math.random() - 0.5) * maxOffset * decay;
            const r = (Math.random() - 0.5) * maxRotate * decay;
            target.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`;
            if (frame >= totalFrames) {
                clearInterval(shakeIntervalId);
                shakeIntervalId = null;
                target.style.transform = "";
            }
        }, 35);
    }

    function stopCameraShakeNow() {
        if (shakeIntervalId) { clearInterval(shakeIntervalId); shakeIntervalId = null; }
        if (shakeTarget) shakeTarget.style.transform = "";
    }

    // ============================================================
    // REALISTIC CUT
    // ============================================================
    function cutEffectsAndGoBlack() {
        muteCrashAudio();
        mutePageAudio();
        flash.style.transition = "none";
        flash.style.opacity = "0";
        activeRings.forEach((r) => r.remove());
        activeRings.length = 0;
        particles = [];
        debrisCtx.clearRect(0, 0, debrisCanvas.width, debrisCanvas.height);
        stopCameraShakeNow();
        stopFireTint();
        showBlackout();
    }

    // ============================================================
    // MAIN TRIGGER
    // ============================================================
    function triggerBetterCrash() {
        triggerFlash();
        triggerShockwave();
        spawnDebris();
        triggerCameraShake();
        playExplosionSound();

        console.log(`💥 [Better Crashes] Boom! (mode: ${SETTINGS.mode})`);

        if (SETTINGS.mode === "realistic") {
            setTimeout(cutEffectsAndGoBlack, SETTINGS.realisticCutMs);
        } else {
            startFireTint();
        }
    }

    // ============================================================
    // SETTINGS PANEL (v2.1.0)
    // ============================================================
    let panel = null;
    let panelPos = null; // {left, top} after first drag
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0, dragOriginLeft = 0, dragOriginTop = 0;

    function buildPanelStyles() {
        if (document.getElementById("bc-panel-style")) return;
        const style = document.createElement("style");
        style.id = "bc-panel-style";
        style.textContent = `
            #bc-panel {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(18,10,7,0.95); backdrop-filter: blur(14px);
                padding: 0; border-radius: 14px; z-index: 1000001;
                min-width: 340px; max-width: 92vw; max-height: 88vh; overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0,0,0,0.55);
                border: 1px solid rgba(255,140,60,0.28);
                font-family: 'Segoe UI', sans-serif; color: #fff;
            }
            #bc-panel-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 14px; cursor: move; user-select: none;
                background: linear-gradient(135deg, rgba(255,120,40,0.18), rgba(0,0,0,0));
                border-bottom: 1px solid rgba(255,140,60,0.2);
                border-radius: 14px 14px 0 0;
            }
            #bc-panel-header .bc-title { font-weight: 700; font-size: 14px; letter-spacing: 0.3px; }
            #bc-panel-header .bc-close-x {
                cursor: pointer; width: 22px; height: 22px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                background: rgba(255,255,255,0.08); font-size: 14px; line-height: 1;
            }
            #bc-panel-header .bc-close-x:hover { background: rgba(255,80,60,0.4); }
            #bc-panel-body { padding: 14px 16px 16px; }
            #bc-panel .bc-status {
                text-align:center; font-size: 12px; color: #ffb066; margin-bottom: 12px;
                padding: 6px; background: rgba(255,140,60,0.08); border-radius: 8px;
            }
            #bc-panel .bc-section-title {
                font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
                color: #ff9a5a; font-weight: 700; margin: 14px 0 6px;
                border-bottom: 1px solid rgba(255,140,60,0.15); padding-bottom: 4px;
            }
            #bc-panel .bc-section-title:first-of-type { margin-top: 0; }
            #bc-panel label { display: block; font-size: 11.5px; color: #e0b0a0; margin: 8px 0 3px; }
            #bc-panel input[type="range"] {
                width: 100%; accent-color: #ff7a30; height: 4px;
            }
            #bc-panel .bc-val { float: right; color: #ff9a5a; font-family: monospace; font-weight: 600; }
            #bc-panel .bc-row { display: flex; gap: 8px; margin-top: 4px; }
            #bc-panel button {
                flex: 1; padding: 8px 0; border: none; border-radius: 7px;
                font-weight: 600; cursor: pointer; font-size: 12.5px;
                transition: filter 0.15s;
            }
            #bc-panel button:hover { filter: brightness(1.15); }
            #bc-panel .bc-mode-btn { background: linear-gradient(135deg,#c04a1f,#5a1f0f); color: #fff; }
            #bc-panel .bc-reset-btn { background: rgba(255,255,255,0.08); color: #ddd; margin-top: 10px; }
        `;
        document.head.appendChild(style);
    }

    function modeLabel() {
        return SETTINGS.mode === "realistic" ? "Realistic 💀" : "Default 🔥";
    }

    function clampToViewport(left, top, w, h) {
        const maxLeft = window.innerWidth - w;
        const maxTop = window.innerHeight - h;
        return {
            left: Math.min(Math.max(left, 0), Math.max(maxLeft, 0)),
            top: Math.min(Math.max(top, 0), Math.max(maxTop, 0))
        };
    }

    function attachDragHandlers(header) {
        header.addEventListener("mousedown", (e) => {
            if (e.target.closest(".bc-close-x")) return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragOriginLeft = rect.left;
            dragOriginTop = rect.top;
            panel.style.transform = "none";
            panel.style.left = rect.left + "px";
            panel.style.top = rect.top + "px";
            e.preventDefault();
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            const rect = panel.getBoundingClientRect();
            const clamped = clampToViewport(dragOriginLeft + dx, dragOriginTop + dy, rect.width, rect.height);
            panel.style.left = clamped.left + "px";
            panel.style.top = clamped.top + "px";
            panelPos = clamped;
        });

        window.addEventListener("mouseup", () => { isDragging = false; });
    }

    function showPanel() {
        if (panel) { panel.remove(); panel = null; return; }

        buildPanelStyles();

        panel = document.createElement("div");
        panel.id = "bc-panel";
        panel.innerHTML = `
            <div id="bc-panel-header">
                <span class="bc-title">💥 Better Crashes</span>
                <span class="bc-close-x" id="bc-close-x">✕</span>
            </div>
            <div id="bc-panel-body">
                <div class="bc-status" id="bc-status">Current mode: ${modeLabel()}</div>

                <div class="bc-section-title">General</div>
                <div class="bc-row">
                    <button class="bc-mode-btn" id="bc-mode-btn">Switch to ${SETTINGS.mode === "realistic" ? "Default" : "Realistic"}</button>
                </div>

                <div class="bc-section-title">Visual</div>
                <label>Flash duration - Default (ms) <span class="bc-val" id="bc-dflash-val">${SETTINGS.defaultFlashMs}</span></label>
                <input type="range" id="bc-dflash" min="20" max="300" step="10" value="${SETTINGS.defaultFlashMs}">

                <label>Flash duration - Realistic (ms) <span class="bc-val" id="bc-rflash-val">${SETTINGS.realisticFlashMs}</span></label>
                <input type="range" id="bc-rflash" min="5" max="100" step="1" value="${SETTINGS.realisticFlashMs}">

                <label>Camera shake intensity (px) <span class="bc-val" id="bc-shake-val">${SETTINGS.shakeIntensity}</span></label>
                <input type="range" id="bc-shake" min="0" max="90" step="5" value="${SETTINGS.shakeIntensity}">

                <label>Debris count <span class="bc-val" id="bc-debris-val">${SETTINGS.debrisCount}</span></label>
                <input type="range" id="bc-debris" min="10" max="200" step="10" value="${SETTINGS.debrisCount}">

                <label>Fire tint duration - Default (s) <span class="bc-val" id="bc-tint-val">${(SETTINGS.fireTintDurationMs / 1000).toFixed(0)}</span></label>
                <input type="range" id="bc-tint" min="1" max="15" step="1" value="${SETTINGS.fireTintDurationMs / 1000}">

                <div class="bc-section-title">Realistic Mode</div>
                <label>Cut-to-black duration (ms) <span class="bc-val" id="bc-cut-val">${SETTINGS.realisticCutMs}</span></label>
                <input type="range" id="bc-cut" min="100" max="500" step="5" value="${SETTINGS.realisticCutMs}">

                <div class="bc-section-title">Audio</div>
                <label>Explosion volume <span class="bc-val" id="bc-vol-val">${SETTINGS.explosionVolume}</span></label>
                <input type="range" id="bc-vol" min="0" max="20" step="0.5" value="${SETTINGS.explosionVolume}">

                <button class="bc-reset-btn" id="bc-reset-btn">↺ Restore defaults</button>
            </div>
        `;
        document.body.appendChild(panel);

        if (panelPos) {
            panel.style.transform = "none";
            panel.style.left = panelPos.left + "px";
            panel.style.top = panelPos.top + "px";
        }

        const statusEl = panel.querySelector("#bc-status");
        const modeBtn = panel.querySelector("#bc-mode-btn");

        modeBtn.onclick = function () {
            SETTINGS.mode = SETTINGS.mode === "realistic" ? "default" : "realistic";
            syncRealisticModeClass();
            statusEl.textContent = `Current mode: ${modeLabel()}`;
            modeBtn.textContent = `Switch to ${SETTINGS.mode === "realistic" ? "Default" : "Realistic"}`;
            console.log(`💥 [Better Crashes] Mode changed to: ${SETTINGS.mode}`);
        };

        panel.querySelector("#bc-dflash").oninput = function () {
            SETTINGS.defaultFlashMs = parseFloat(this.value);
            panel.querySelector("#bc-dflash-val").textContent = this.value;
        };
        panel.querySelector("#bc-rflash").oninput = function () {
            SETTINGS.realisticFlashMs = parseFloat(this.value);
            panel.querySelector("#bc-rflash-val").textContent = this.value;
        };
        panel.querySelector("#bc-shake").oninput = function () {
            SETTINGS.shakeIntensity = parseFloat(this.value);
            panel.querySelector("#bc-shake-val").textContent = this.value;
        };
        panel.querySelector("#bc-debris").oninput = function () {
            SETTINGS.debrisCount = parseFloat(this.value);
            panel.querySelector("#bc-debris-val").textContent = this.value;
        };
        panel.querySelector("#bc-tint").oninput = function () {
            SETTINGS.fireTintDurationMs = parseFloat(this.value) * 1000;
            panel.querySelector("#bc-tint-val").textContent = this.value;
        };
        panel.querySelector("#bc-cut").oninput = function () {
            SETTINGS.realisticCutMs = parseFloat(this.value);
            panel.querySelector("#bc-cut-val").textContent = this.value;
        };
        panel.querySelector("#bc-vol").oninput = function () {
            SETTINGS.explosionVolume = parseFloat(this.value);
            explosionGain.gain.value = SETTINGS.explosionVolume;
            panel.querySelector("#bc-vol-val").textContent = this.value;
        };

        panel.querySelector("#bc-reset-btn").onclick = function () {
            Object.assign(SETTINGS, DEFAULTS);
            explosionGain.gain.value = SETTINGS.explosionVolume;
            syncRealisticModeClass();
            console.log("↺ [Better Crashes] Values restored to defaults.");
            panel.remove();
            panel = null;
            showPanel();
        };

        panel.querySelector("#bc-close-x").onclick = function () {
            panel.remove();
            panel = null;
        };

        attachDragHandlers(panel.querySelector("#bc-panel-header"));
    }

    document.addEventListener(
        "keydown",
        (e) => {
            const tag = document.activeElement?.tagName;
            if (e.key === "Escape" && panel) { panel.remove(); panel = null; return; }
            if (e.altKey && e.key.toLowerCase() === "n" && !e.ctrlKey && !e.shiftKey && !["INPUT", "TEXTAREA"].includes(tag)) {
                e.preventDefault();
                e.stopPropagation();
                showPanel();
            }
        },
        true
    );

    // ============================================================
    // CRASH DETECTION
    // ============================================================
    function isCrashed() {
        try { return !!unsafeWindow?.geofs?.aircraft?.instance?.crashed; } catch (e) { return false; }
    }
    function isCrashedFallback() {
        try { return !!window.geofs?.aircraft?.instance?.crashed; } catch (e) { return false; }
    }

    function getSpeedKnots() {
        try {
            const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
            const tas = win?.geofs?.aircraft?.instance?.trueAirSpeed;
            if (typeof tas !== "number" || !isFinite(tas)) return null;
            return tas * 1.94384;
        } catch (e) { return null; }
    }

    const REFERENCE_SPEED_KNOTS = 220;
    const MIN_SPEED_FACTOR = 0.35;
    const MAX_SPEED_FACTOR = 2.2;

    function speedToVolumeFactor(speedKnots) {
        if (speedKnots == null) return 1;
        const raw = speedKnots / REFERENCE_SPEED_KNOTS;
        return Math.min(MAX_SPEED_FACTOR, Math.max(MIN_SPEED_FACTOR, raw));
    }

    setInterval(() => {
        const speed = getSpeedKnots();
        if (speed != null) lastSpeedKnots = speed;

        const crashed = typeof unsafeWindow !== "undefined" ? isCrashed() : isCrashedFallback();

        if (crashed && !wasCrashed) {
            wasCrashed = true;
            const factor = speedToVolumeFactor(lastSpeedKnots);
            speedGain.gain.value = factor;
            console.log(`💥 [Better Crashes] Speed: ${lastSpeedKnots.toFixed(1)} kt | Volume factor: ${factor.toFixed(2)}x`);
            triggerBetterCrash();
        } else if (!crashed && wasCrashed) {
            wasCrashed = false;
            stopFireTint();
            hideBlackout();
            restorePageAudio();
        } else if (!crashed) {
            wasCrashed = false;
        }
    }, 200);
})();
