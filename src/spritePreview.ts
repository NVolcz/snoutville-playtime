import { getAssetUrl, spriteManifests } from './assetRegistry';
import type { SpriteAnimation, SpriteManifest } from './types';

const backgrounds = ['checkerboard', 'white', 'park', 'house'] as const;
const assetCacheBust = Date.now();
type PreviewBackground = (typeof backgrounds)[number];

interface PreviewState {
  manifest: SpriteManifest;
  animationName: string;
  frameIndex: number;
  playing: boolean;
  background: PreviewBackground;
  scale: number;
  showAnchor: boolean;
  showZones: boolean;
  timer: number | undefined;
}

export function mountSpritePreview(root: HTMLElement): () => void {
  const firstManifest = spriteManifests[0];

  if (!firstManifest) {
    root.innerHTML = '<p>No sprite manifests found.</p>';
    return () => undefined;
  }

  const state: PreviewState = {
    manifest: firstManifest,
    animationName: Object.keys(firstManifest.animations)[0] ?? 'idle',
    frameIndex: 0,
    playing: false,
    background: 'checkerboard',
    scale: firstManifest.defaultScale,
    showAnchor: true,
    showZones: true,
    timer: undefined
  };

  root.innerHTML = `
    <section class="panel sprite-preview-panel">
      <div class="panel-header">
        <div>
          <h2>Sprite Preview</h2>
          <p>Review sprites, animation frames, anchors, and interaction zones.</p>
        </div>
        <span class="badge" data-review-status></span>
      </div>

      <div class="controls-grid">
        <label>
          Sprite
          <select data-sprite-select></select>
        </label>
        <label>
          Animation
          <select data-animation-select></select>
        </label>
        <label>
          Background
          <select data-background-select></select>
        </label>
        <label>
          Scale
          <input data-scale-input type="range" min="0.2" max="1.5" step="0.05" />
        </label>
      </div>

      <div class="button-row">
        <button data-play-toggle type="button">Play</button>
        <button data-prev-frame type="button">Previous frame</button>
        <button data-next-frame type="button">Next frame</button>
        <label class="checkbox-label"><input data-anchor-toggle type="checkbox" checked /> Anchor</label>
        <label class="checkbox-label"><input data-zones-toggle type="checkbox" checked /> Zones</label>
      </div>

      <div class="preview-stage checkerboard" data-preview-stage>
        <img data-preview-image alt="Selected sprite frame" />
        <div class="anchor-marker" data-anchor-marker></div>
        <div data-zone-layer></div>
      </div>

      <dl class="metadata-grid">
        <div><dt>Frame</dt><dd data-frame-label></dd></div>
        <div><dt>Origin</dt><dd data-origin-label></dd></div>
        <div><dt>Notes</dt><dd data-notes-label></dd></div>
      </dl>
    </section>
  `;

  const spriteSelect = root.querySelector<HTMLSelectElement>('[data-sprite-select]')!;
  const animationSelect = root.querySelector<HTMLSelectElement>('[data-animation-select]')!;
  const backgroundSelect = root.querySelector<HTMLSelectElement>('[data-background-select]')!;
  const scaleInput = root.querySelector<HTMLInputElement>('[data-scale-input]')!;
  const playToggle = root.querySelector<HTMLButtonElement>('[data-play-toggle]')!;
  const prevFrame = root.querySelector<HTMLButtonElement>('[data-prev-frame]')!;
  const nextFrame = root.querySelector<HTMLButtonElement>('[data-next-frame]')!;
  const anchorToggle = root.querySelector<HTMLInputElement>('[data-anchor-toggle]')!;
  const zonesToggle = root.querySelector<HTMLInputElement>('[data-zones-toggle]')!;

  for (const manifest of spriteManifests) {
    const option = document.createElement('option');
    option.value = manifest.id;
    option.textContent = `${manifest.displayName} (${manifest.type})`;
    spriteSelect.append(option);
  }

  for (const background of backgrounds) {
    const option = document.createElement('option');
    option.value = background;
    option.textContent = background;
    backgroundSelect.append(option);
  }

  const stop = () => {
    if (state.timer !== undefined) {
      window.clearInterval(state.timer);
      state.timer = undefined;
    }
  };

  const start = () => {
    stop();
    const animation = getCurrentAnimation(state);
    const delay = 1000 / Math.max(animation.fps, 1);
    state.timer = window.setInterval(() => {
      advanceFrame(state, 1);
      render(root, state);
    }, delay);
  };

  spriteSelect.addEventListener('change', () => {
    const nextManifest = spriteManifests.find((manifest) => manifest.id === spriteSelect.value);
    if (!nextManifest) return;
    state.manifest = nextManifest;
    state.animationName = Object.keys(nextManifest.animations)[0] ?? 'idle';
    state.frameIndex = 0;
    state.scale = nextManifest.defaultScale;
    if (state.playing) start();
    render(root, state);
  });

  animationSelect.addEventListener('change', () => {
    state.animationName = animationSelect.value;
    state.frameIndex = 0;
    if (state.playing) start();
    render(root, state);
  });

  backgroundSelect.addEventListener('change', () => {
    state.background = backgroundSelect.value as PreviewBackground;
    render(root, state);
  });

  scaleInput.addEventListener('input', () => {
    state.scale = Number(scaleInput.value);
    render(root, state);
  });

  playToggle.addEventListener('click', () => {
    state.playing = !state.playing;
    state.playing ? start() : stop();
    render(root, state);
  });

  prevFrame.addEventListener('click', () => {
    state.playing = false;
    stop();
    advanceFrame(state, -1);
    render(root, state);
  });

  nextFrame.addEventListener('click', () => {
    state.playing = false;
    stop();
    advanceFrame(state, 1);
    render(root, state);
  });

  anchorToggle.addEventListener('change', () => {
    state.showAnchor = anchorToggle.checked;
    render(root, state);
  });

  zonesToggle.addEventListener('change', () => {
    state.showZones = zonesToggle.checked;
    render(root, state);
  });

  render(root, state);

  return stop;
}

function getCurrentAnimation(state: PreviewState): SpriteAnimation {
  return state.manifest.animations[state.animationName] ?? Object.values(state.manifest.animations)[0] ?? { fps: 1, loop: true, frames: [] };
}

function advanceFrame(state: PreviewState, direction: number): void {
  const animation = getCurrentAnimation(state);
  const frameCount = animation.frames.length;
  if (frameCount === 0) return;
  state.frameIndex = (state.frameIndex + direction + frameCount) % frameCount;
}

function render(root: HTMLElement, state: PreviewState): void {
  const animation = getCurrentAnimation(state);
  const frame = animation.frames[state.frameIndex] ?? animation.frames[0];

  const spriteSelect = root.querySelector<HTMLSelectElement>('[data-sprite-select]')!;
  const animationSelect = root.querySelector<HTMLSelectElement>('[data-animation-select]')!;
  const backgroundSelect = root.querySelector<HTMLSelectElement>('[data-background-select]')!;
  const scaleInput = root.querySelector<HTMLInputElement>('[data-scale-input]')!;
  const image = root.querySelector<HTMLImageElement>('[data-preview-image]')!;
  const stage = root.querySelector<HTMLElement>('[data-preview-stage]')!;
  const anchorMarker = root.querySelector<HTMLElement>('[data-anchor-marker]')!;
  const zoneLayer = root.querySelector<HTMLElement>('[data-zone-layer]')!;

  spriteSelect.value = state.manifest.id;
  backgroundSelect.value = state.background;
  scaleInput.value = String(state.scale);

  animationSelect.innerHTML = '';
  for (const animationName of Object.keys(state.manifest.animations)) {
    const option = document.createElement('option');
    option.value = animationName;
    option.textContent = animationName;
    animationSelect.append(option);
  }
  animationSelect.value = state.animationName;

  if (frame) {
    image.hidden = false;
    image.src = `${getAssetUrl(frame)}?previewCacheBust=${assetCacheBust}`;
  } else {
    image.hidden = true;
    image.removeAttribute('src');
  }
  image.style.width = `${512 * state.scale}px`;
  image.style.height = `${512 * state.scale}px`;

  stage.className = `preview-stage ${state.background}`;

  const imageWidth = 512 * state.scale;
  const imageHeight = 512 * state.scale;
  const imageLeft = stage.clientWidth / 2 - imageWidth / 2;
  const imageTop = stage.clientHeight / 2 - imageHeight / 2;

  anchorMarker.style.display = state.showAnchor ? 'block' : 'none';
  anchorMarker.style.left = `${imageLeft + imageWidth * state.manifest.origin.x}px`;
  anchorMarker.style.top = `${imageTop + imageHeight * state.manifest.origin.y}px`;

  zoneLayer.innerHTML = '';
  if (state.showZones && state.manifest.interactionZones) {
    for (const zone of state.manifest.interactionZones) {
      const zoneElement = document.createElement('div');
      zoneElement.className = `interaction-zone ${zone.shape}`;
      zoneElement.style.width = `${zone.width * state.scale}px`;
      zoneElement.style.height = `${zone.height * state.scale}px`;
      const objectAnchorX = imageLeft + imageWidth * state.manifest.origin.x;
      const objectAnchorY = imageTop + imageHeight * state.manifest.origin.y;
      zoneElement.style.left = `${objectAnchorX + zone.x * state.scale - (zone.width * state.scale) / 2}px`;
      zoneElement.style.top = `${objectAnchorY + zone.y * state.scale - (zone.height * state.scale) / 2}px`;
      zoneLayer.append(zoneElement);
    }
  }

  root.querySelector<HTMLElement>('[data-review-status]')!.textContent = state.manifest.reviewStatus;
  root.querySelector<HTMLElement>('[data-frame-label]')!.textContent = `${state.frameIndex + 1} / ${animation.frames.length}`;
  root.querySelector<HTMLElement>('[data-origin-label]')!.textContent = `${state.manifest.origin.x}, ${state.manifest.origin.y}`;
  root.querySelector<HTMLElement>('[data-notes-label]')!.textContent = state.manifest.reviewNotes || '—';
  root.querySelector<HTMLButtonElement>('[data-play-toggle]')!.textContent = state.playing ? 'Pause' : 'Play';
}
