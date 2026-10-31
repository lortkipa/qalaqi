export function setupImmersive() {
  document.body.classList.add("immersive");
  document.body.insertAdjacentHTML(
    "beforeend",
    `
  <nav class="drive-bar" aria-label="Simulator toolbar"><div class="drive-brand">რ <span>RUSTAVI <small>DRIVE / PRACTICE</small></span></div><div class="drive-actions"><button id="route-drawer" aria-expanded="false">☷ Routes</button><button id="exam-drawer" aria-expanded="false">Examiner</button><button id="drive-help">Controls</button><button id="sound-toggle" aria-pressed="false">Sound off</button><button id="fullscreen-toggle">⛶ Fullscreen</button></div></nav>
  <div class="mirror-shell rear"><div id="mirror-rear" class="mirror-glass"></div><span>REAR VIEW</span></div>
  <div class="mirror-shell left"><div id="mirror-left" class="mirror-glass"></div><span>LEFT MIRROR</span></div>
  <div class="mirror-shell right"><div id="mirror-right" class="mirror-glass"></div><span>RIGHT MIRROR</span></div>
  <div class="windshield-trim" aria-hidden="true"><div class="pillar left-pillar"></div><div class="pillar right-pillar"></div></div>
  <div class="wheel-wrap" aria-hidden="true"><div id="visual-wheel"><div class="wheel-spoke one"></div><div class="wheel-spoke two"></div><div class="wheel-spoke three"></div><div class="wheel-center">რ</div></div></div>
  <div class="drive-hint">W / S · accelerator / brake &nbsp; A / D · steer &nbsp; Q / E · signals &nbsp; R · reverse &nbsp; B · belt &nbsp; C · camera</div>
  <div class="live-instructor"><span>GIORGI · PASSENGER INSTRUCTOR</span><p id="live-instruction">Fasten your seat belt before moving.</p></div>
  <div class="route-disclaimer">Illustrative routes · Official Rustavi geometry not yet verified</div>
  <div id="pause-overlay" class="hidden"><b>Drive paused</b><span>Press P or the play button to continue</span></div>
  <div class="touch-extras"><button id="touch-left">↰ Signal</button><button id="touch-reverse">D / R</button><button id="touch-right">Signal ↱</button></div>`,
  );
  const $ = (id) => document.getElementById(id);
  $("route-drawer").onclick = () => {
    const open = document.body.classList.toggle("routes-open");
    $("route-drawer").setAttribute("aria-expanded", String(open));
  };
  $("exam-drawer").onclick = () => {
    const open = document.body.classList.toggle("exam-open");
    $("exam-drawer").setAttribute("aria-expanded", String(open));
  };
  $("drive-help").onclick = () => $("help").click();
  $("fullscreen-toggle").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      $("fullscreen-toggle").textContent = "Fullscreen unavailable";
    }
  };
  document.addEventListener(
    "fullscreenchange",
    () =>
      ($("fullscreen-toggle").textContent = document.fullscreenElement
        ? "⛶ Exit fullscreen"
        : "⛶ Fullscreen"),
  );
  let audio,
    oscillator,
    gain,
    enabled = false;
  $("sound-toggle").onclick = async () => {
    try {
      if (!audio) {
        audio = new AudioContext();
        oscillator = audio.createOscillator();
        gain = audio.createGain();
        oscillator.type = "triangle";
        gain.gain.value = 0;
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
      }
      await audio.resume();
      enabled = !enabled;
      $("sound-toggle").textContent = enabled ? "Sound on" : "Sound off";
      $("sound-toggle").setAttribute("aria-pressed", String(enabled));
    } catch {
      $("sound-toggle").textContent = "Audio unavailable";
    }
  };
  return {
    update({ speed, steering, active, paused, view }) {
      $("visual-wheel").style.transform = `rotate(${-steering * 470}deg)`;
      document.body.classList.toggle("follow-view", view === 1);
      $("pause-overlay").classList.toggle("hidden", !paused || !active);
      if (audio) {
        gain.gain.setTargetAtTime(
          enabled && active && !paused ? 0.035 : 0,
          audio.currentTime,
          0.1,
        );
        oscillator.frequency.setTargetAtTime(
          32 + Math.abs(speed) * 3.5,
          audio.currentTime,
          0.15,
        );
      }
    },
  };
}
