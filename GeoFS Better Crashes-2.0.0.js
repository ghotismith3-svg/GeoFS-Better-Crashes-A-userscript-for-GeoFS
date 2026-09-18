// ==UserScript==
// @name         GeoFS Better Crashes
// @namespace    https://github.com/
// @version      2.1.2
// @description  Visual explosion + loud sound + exaggerated shake on crash in GeoFS. Includes a "Realistic" mode and a settings panel (Alt+U) with sliders and reset.
// @author       You
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// @license      CC0-4.0
// ==/UserScript==

(function () {
    "use strict";

    const DEFAULTS = Object.freeze({
        mode: "default", realisticCutMs: 235, realisticFlashMs: 24,
        defaultFlashMs: 60, explosionVolume: 3, shakeIntensity: 45,
        fireTintDurationMs: 6000, debrisCount: 70
    });
    const settings = { ...DEFAULTS };
    const rotateRatio = 3.5 / 45;
    let wasCrashed = false, audioUnlocked = false, lastSpeedKnots = 0;
    let pageAudioMuted = false, shakeTimer = null, shakeTarget = null;
    let panel = null, panelPosition = null, dragging = false;
    const mutedMedia = new Map(), rings = [], particles = [];
    const explosionUrl = "https://cdn.jsdelivr.net/gh/ghotismith3-svg/laexplosiondeimpacto@main/audiomass-output%20%281%29.mp3";
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -8; compressor.knee.value = 6;
    compressor.ratio.value = 6; compressor.attack.value = .003; compressor.release.value = .25;
    const makeup = audioContext.createGain(); makeup.gain.value = 2.2;
    const speedGain = audioContext.createGain(); speedGain.gain.value = 1; speedGain.__bcNoBoost = true;
    compressor.connect(makeup).connect(speedGain).connect(audioContext.destination);
    const explosion = new Audio(explosionUrl); explosion.crossOrigin = "anonymous"; explosion.preload = "auto";
    const explosionGain = audioContext.createGain(); explosionGain.gain.value = settings.explosionVolume;
    audioContext.createMediaElementSource(explosion).connect(explosionGain).connect(compressor);

    function playExplosion() {
        const now = audioContext.currentTime;
        explosion.currentTime = 0;
        explosion.play().catch(e => console.warn("🔇 Explosion audio blocked:", e));
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(70, now);
        oscillator.frequency.exponentialRampToValueAtTime(24, now + .6);
        gain.gain.setValueAtTime(3.5, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .9);
        oscillator.connect(gain).connect(compressor); oscillator.start(now); oscillator.stop(now + .9);
    }
    function muteCrashAudio() {
        try { speedGain.gain.cancelScheduledValues(audioContext.currentTime); speedGain.gain.setValueAtTime(0, audioContext.currentTime); } catch (_) {}
        try { explosion.pause(); } catch (_) {}
    }
    function restoreCrashAudio() {
        try { speedGain.gain.cancelScheduledValues(audioContext.currentTime); speedGain.gain.setValueAtTime(1, audioContext.currentTime); } catch (_) {}
    }
    function mutePageAudio() {
        if (pageAudioMuted) return; pageAudioMuted = true;
        document.querySelectorAll("audio,video").forEach(el => {
            if (el === explosion) return;
            if (!mutedMedia.has(el)) mutedMedia.set(el, { muted: el.muted, volume: el.volume });
            el.muted = true;
        });
    }
    function restorePageAudio() {
        pageAudioMuted = false;
        mutedMedia.forEach((state, el) => { try { el.muted = state.muted; el.volume = state.volume; } catch (_) {} });
        mutedMedia.clear(); restoreCrashAudio();
    }
    new MutationObserver(() => {
        if (!pageAudioMuted) return;
        document.querySelectorAll("audio,video").forEach(el => {
            if (el === explosion) return;
            if (!mutedMedia.has(el)) mutedMedia.set(el, { muted: el.muted, volume: el.volume });
            el.muted = true;
        });
    }).observe(document.documentElement, { childList: true, subtree: true });
    function unlockAudio() {
        if (audioUnlocked) return; audioContext.resume();
        explosion.play().then(() => { explosion.pause(); explosion.currentTime = 0; }).catch(() => {});
        audioUnlocked = true; document.removeEventListener("click", unlockAudio); document.removeEventListener("keydown", unlockAudio);
    }
    document.addEventListener("click", unlockAudio); document.addEventListener("keydown", unlockAudio);

    const flash = Object.assign(document.createElement("div"), { style: "position:fixed;inset:0;z-index:999998;background:#fff;opacity:0;pointer-events:none" });
    const tint = Object.assign(document.createElement("div"), { style: "position:fixed;inset:0;z-index:999995;background:rgba(255,120,0,0);pointer-events:none" });
    const blackout = Object.assign(document.createElement("div"), { style: "position:fixed;inset:0;z-index:1000000;background:#000;opacity:0;pointer-events:none" });
    const canvas = Object.assign(document.createElement("canvas"), { style: "position:fixed;inset:0;z-index:999996;pointer-events:none" });
    document.body.append(flash, tint, blackout, canvas);
    const ctx = canvas.getContext("2d");
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; } resize(); addEventListener("resize", resize);
    function flashScreen() { const ms = settings.mode === "realistic" ? settings.realisticFlashMs : settings.defaultFlashMs; flash.style.transition = "none"; flash.style.opacity = .95; setTimeout(() => { flash.style.transition = settings.mode === "realistic" ? "opacity .06s ease-out" : "opacity 1.1s ease-out"; flash.style.opacity = 0; }, ms); }
    function shockwave() {
        const ring = document.createElement("div");
        ring.style.cssText = "position:fixed;top:50%;left:50%;z-index:999997;width:80px;height:80px;border-radius:50%;border:10px solid rgba(255,140,0,.9);box-shadow:0 0 40px 10px rgba(255,80,0,.6);pointer-events:none;transform:translate(-50%,-50%) scale(0);opacity:1;transition:transform .8s cubic-bezier(.1,.8,.3,1),opacity .8s ease-out";
        document.body.appendChild(ring); rings.push(ring); requestAnimationFrame(() => { ring.style.transform = "translate(-50%,-50%) scale(9)"; ring.style.opacity = 0; });
        setTimeout(() => { ring.remove(); const i = rings.indexOf(ring); if (i >= 0) rings.splice(i, 1); }, 850);
    }
    let particleLoop = false;
    function debris() {
        const colors = ["#ff8c00", "#ff4500", "#ffd700", "#8a8a8a", "#3a3a3a"];
        for (let i = 0; i < settings.debrisCount; i++) { const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 14; particles.push({ x: innerWidth / 2, y: innerHeight / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, size: 2 + Math.random() * 6, color: colors[Math.floor(Math.random() * colors.length)], life: 1, decay: .008 + Math.random() * .014, gravity: .35 + Math.random() * .25 }); }
        if (!particleLoop) { particleLoop = true; requestAnimationFrame(drawParticles); }
    }
    function drawParticles() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life -= p.decay; ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1); ctx.globalAlpha = 1; if (particles.length) requestAnimationFrame(drawParticles); else { particleLoop = false; ctx.clearRect(0, 0, canvas.width, canvas.height); } }
    let tintTimer = null, tintSafety = null;
    function stopTint() { if (tintTimer) clearInterval(tintTimer); if (tintSafety) clearTimeout(tintSafety); tintTimer = tintSafety = null; tint.style.transition = "background .6s ease-out"; tint.style.background = "rgba(255,120,0,0)"; }
    function startTint() { stopTint(); tint.style.transition = "none"; tintTimer = setInterval(() => { const g = Math.floor(60 + Math.random() * 140); tint.style.background = `rgba(255,${g},0,${.1 + Math.random() * .22})`; }, 90); tintSafety = setTimeout(stopTint, settings.fireTintDurationMs); }
    function shake() { const target = document.fullscreenElement || document.webkitFullscreenElement || document.body; shakeTarget = target; let frame = 0; if (shakeTimer) clearInterval(shakeTimer); shakeTimer = setInterval(() => { frame++; const decay = 1 - frame / 26, x = (Math.random() - .5) * settings.shakeIntensity * decay, y = (Math.random() - .5) * settings.shakeIntensity * decay, r = (Math.random() - .5) * settings.shakeIntensity * rotateRatio * decay; target.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`; if (frame >= 26) { clearInterval(shakeTimer); shakeTimer = null; target.style.transform = ""; } }, 35); }
    function stopShake() { if (shakeTimer) clearInterval(shakeTimer); shakeTimer = null; if (shakeTarget) shakeTarget.style.transform = ""; }
    function realisticCut() { muteCrashAudio(); mutePageAudio(); flash.style.opacity = 0; rings.splice(0).forEach(r => r.remove()); particles.length = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); stopShake(); stopTint(); blackout.style.transition = "opacity .06s ease-in"; blackout.style.opacity = 1; }
    function triggerCrash() { flashScreen(); shockwave(); debris(); shake(); playExplosion(); console.log(`💥 [Better Crashes] Boom! (mode: ${settings.mode})`); if (settings.mode === "realistic") setTimeout(realisticCut, settings.realisticCutMs); else startTint(); }

    const nativeStyle = document.createElement("style"); nativeStyle.textContent = "html.bc-realistic-mode .geofs-crashOverlay.geofs-crashed{opacity:0!important;color:transparent!important}"; document.head.appendChild(nativeStyle);
    function syncMode() { document.documentElement.classList.toggle("bc-realistic-mode", settings.mode === "realistic"); } syncMode();
    const panelStyle = document.createElement("style"); panelStyle.textContent = "#bc-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(18,10,7,.95);backdrop-filter:blur(14px);padding:16px;border-radius:14px;z-index:1000001;min-width:340px;max-width:92vw;max-height:88vh;overflow-y:auto;box-shadow:0 10px 30px #0008;border:1px solid #ff8c3c47;font:12px 'Segoe UI',sans-serif;color:#fff}#bc-panel h3{margin:0 0 12px}#bc-panel label{display:block;color:#e0b0a0;margin:8px 0 3px}#bc-panel input{width:100%;accent-color:#ff7a30}#bc-panel button{width:100%;padding:8px;margin-top:10px;border:0;border-radius:7px;background:#8b3218;color:#fff;font-weight:600;cursor:pointer}#bc-panel .value{float:right;color:#ff9a5a;font-family:monospace}"; document.head.appendChild(panelStyle);
    function showPanel() {
        if (panel) { panel.remove(); panel = null; return; }
        document.body.style.transform = "";
        panel = document.createElement("div"); panel.id = "bc-panel";
        panel.innerHTML = `<h3>💥 Better Crashes <span style="float:right;cursor:pointer" id="bc-close">✕</span></h3><div id="bc-status">Current mode: ${settings.mode}</div><button id="bc-mode">Switch to ${settings.mode === "realistic" ? "Default" : "Realistic"}</button><label>Default flash (ms)<span class=value id=v-d>${settings.defaultFlashMs}</span></label><input id=d type=range min=20 max=300 step=10 value=${settings.defaultFlashMs}><label>Realistic flash (ms)<span class=value id=v-r>${settings.realisticFlashMs}</span></label><input id=r type=range min=5 max=100 value=${settings.realisticFlashMs}><label>Shake intensity (px)<span class=value id=v-s>${settings.shakeIntensity}</span></label><input id=s type=range min=0 max=90 step=5 value=${settings.shakeIntensity}><label>Debris count<span class=value id=v-b>${settings.debrisCount}</span></label><input id=b type=range min=10 max=200 step=10 value=${settings.debrisCount}><label>Fire tint duration (s)<span class=value id=v-t>${settings.fireTintDurationMs / 1000}</span></label><input id=t type=range min=1 max=15 value=${settings.fireTintDurationMs / 1000}><label>Cut-to-black (ms)<span class=value id=v-c>${settings.realisticCutMs}</span></label><input id=c type=range min=100 max=500 step=5 value=${settings.realisticCutMs}><label>Explosion volume<span class=value id=v-v>${settings.explosionVolume}</span></label><input id=vol type=range min=0 max=20 step=.5 value=${settings.explosionVolume}><button id=reset>↺ Restore defaults</button>`;
        document.body.appendChild(panel);
        const bind = (id, key, valueId, convert = Number) => panel.querySelector(`#${id}`).oninput = e => { settings[key] = convert(e.target.value); panel.querySelector(`#${valueId}`).textContent = e.target.value; if (key === "explosionVolume") explosionGain.gain.value = settings[key]; };
        bind("d", "defaultFlashMs", "v-d"); bind("r", "realisticFlashMs", "v-r"); bind("s", "shakeIntensity", "v-s"); bind("b", "debrisCount", "v-b"); bind("t", "fireTintDurationMs", "v-t", v => Number(v) * 1000); bind("c", "realisticCutMs", "v-c"); bind("vol", "explosionVolume", "v-v");
        panel.querySelector("#bc-mode").onclick = () => { settings.mode = settings.mode === "realistic" ? "default" : "realistic"; syncMode(); showPanel(); showPanel(); };
        panel.querySelector("#bc-close").onclick = () => { panel.remove(); panel = null; };
        panel.querySelector("#reset").onclick = () => { Object.assign(settings, DEFAULTS); explosionGain.gain.value = settings.explosionVolume; syncMode(); panel.remove(); panel = null; showPanel(); };
    }
    document.addEventListener("keydown", e => { const tag = document.activeElement?.tagName; if (e.key === "Escape" && panel) { panel.remove(); panel = null; } else if (e.altKey && e.code === "KeyU" && !e.ctrlKey && !e.shiftKey && !["INPUT", "TEXTAREA"].includes(tag)) { e.preventDefault(); e.stopPropagation(); showPanel(); } }, true);

    function gameWindow() { return typeof unsafeWindow !== "undefined" ? unsafeWindow : window; }
    function crashed() { try { return !!gameWindow().geofs?.aircraft?.instance?.crashed; } catch (_) { return false; } }
    function speed() { try { const value = gameWindow().geofs?.aircraft?.instance?.trueAirSpeed; return typeof value === "number" && isFinite(value) ? value * 1.94384 : null; } catch (_) { return null; } }
    function volumeFactor(knots) { return knots == null ? 1 : Math.min(2.2, Math.max(.35, knots / 220)); }
    setInterval(() => { const currentSpeed = speed(); if (currentSpeed != null) lastSpeedKnots = currentSpeed; const state = crashed(); if (state && !wasCrashed) { wasCrashed = true; speedGain.gain.value = volumeFactor(lastSpeedKnots); triggerCrash(); } else if (!state && wasCrashed) { wasCrashed = false; stopTint(); blackout.style.transition = "opacity .8s ease-out"; blackout.style.opacity = 0; restorePageAudio(); } else if (!state) wasCrashed = false; }, 200);
})();
