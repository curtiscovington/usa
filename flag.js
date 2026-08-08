const canvas = document.querySelector('#flag');
const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!context) throw new Error('Canvas 2D is not available');

const texture = document.createElement('canvas');
texture.width = 1900;
texture.height = 1000;
const textureContext = texture.getContext('2d');

function drawStar(target, cx, cy, radius) {
  target.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const length = point % 2 === 0 ? radius : radius * 0.382;
    const x = cx + Math.cos(angle) * length;
    const y = cy + Math.sin(angle) * length;
    if (point === 0) target.moveTo(x, y);
    else target.lineTo(x, y);
  }
  target.closePath();
  target.fill();
}

function buildFlagTexture() {
  const stripeHeight = texture.height / 13;
  for (let stripe = 0; stripe < 13; stripe += 1) {
    textureContext.fillStyle = stripe % 2 === 0 ? '#b22234' : '#f7f7f2';
    textureContext.fillRect(0, stripe * stripeHeight, texture.width, stripeHeight + 1);
  }

  const cantonWidth = texture.width * 0.4;
  const cantonHeight = stripeHeight * 7;
  const navy = textureContext.createLinearGradient(0, 0, cantonWidth, cantonHeight);
  navy.addColorStop(0, '#292a55');
  navy.addColorStop(0.52, '#3c3b6e');
  navy.addColorStop(1, '#25264d');
  textureContext.fillStyle = navy;
  textureContext.fillRect(0, 0, cantonWidth, cantonHeight);

  textureContext.save();
  textureContext.fillStyle = '#fff';
  textureContext.shadowColor = 'rgba(3, 7, 28, 0.32)';
  textureContext.shadowBlur = 7;
  textureContext.shadowOffsetY = 3;
  // Preserve true five-point proportions even when the full flag is adapted
  // to a portrait viewport.
  const radius = Math.min(texture.height * 0.0308, cantonWidth / 24);
  for (let row = 0; row < 9; row += 1) {
    const sixStars = row % 2 === 0;
    const count = sixStars ? 6 : 5;
    for (let column = 0; column < count; column += 1) {
      const xStep = sixStars ? column * 2 + 1 : column * 2 + 2;
      drawStar(
        textureContext,
        (xStep / 12) * cantonWidth,
        ((row + 1) / 10) * cantonHeight,
        radius,
      );
    }
  }
  textureContext.restore();

  const glow = textureContext.createRadialGradient(490, 260, 0, 490, 260, 760);
  glow.addColorStop(0, 'rgba(255,255,255,.11)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  textureContext.fillStyle = glow;
  textureContext.fillRect(0, 0, texture.width, texture.height);

  textureContext.globalAlpha = 0.09;
  textureContext.fillStyle = '#fff';
  for (let y = 1; y < texture.height; y += 3) textureContext.fillRect(0, y, texture.width, 0.42);
  textureContext.globalAlpha = 1;
}

buildFlagTexture();

let width = 1;
let height = 1;
let pixelRatio = 1;
let lastFrame = 0;
let pointerX = 0.68;
let pointerY = 0.5;
let pointerTargetX = pointerX;
let pointerTargetY = pointerY;
let interaction = 0;
let interactionTarget = 0;
let tiltX = 0;
let tiltY = 0;
let tiltTargetX = 0;
let tiltTargetY = 0;
let orientationRequested = false;

const dust = Array.from({ length: 30 }, (_, index) => ({
  x: ((index * 47) % 101) / 101,
  y: ((index * 71) % 103) / 103,
  size: 0.35 + ((index * 13) % 11) / 10,
  speed: 0.013 + ((index * 17) % 9) / 760,
  phase: index * 1.93,
}));

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
  height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const responsiveTextureWidth = Math.max(320, Math.round(texture.height * (width / height)));
  if (texture.width !== responsiveTextureWidth) {
    texture.width = responsiveTextureWidth;
    buildFlagTexture();
  }
}

function smoothstep(value) { return value * value * (3 - 2 * value); }

function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

function requestOrientation() {
  if (orientationRequested) return;
  orientationRequested = true;
  if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
    window.DeviceOrientationEvent.requestPermission().catch(() => {});
  }
}

function setPointer(event, active) {
  pointerTargetX = clamp(event.clientX / window.innerWidth, 0, 1);
  pointerTargetY = clamp(event.clientY / window.innerHeight, 0, 1);
  interactionTarget = active ? 1 : Math.max(interactionTarget, 0.42);
  requestOrientation();
}

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture?.(event.pointerId);
  setPointer(event, true);
});
canvas.addEventListener('pointermove', (event) => setPointer(event, event.buttons > 0));
canvas.addEventListener('pointerup', () => { interactionTarget = 0.22; });
canvas.addEventListener('pointercancel', () => { interactionTarget = 0; });
window.addEventListener('deviceorientation', (event) => {
  tiltTargetX = clamp((event.gamma || 0) / 35, -1, 1);
  tiltTargetY = clamp((event.beta || 0) / 45, -1, 1);
}, { passive: true });

function render(timestamp = 0) {
  resize();
  if (reducedMotion.matches && lastFrame > 0) return;
  lastFrame = timestamp;

  const time = reducedMotion.matches ? 0.6 : timestamp / 1000;
  pointerX += (pointerTargetX - pointerX) * 0.065;
  pointerY += (pointerTargetY - pointerY) * 0.065;
  interaction += (interactionTarget - interaction) * 0.055;
  interactionTarget *= 0.985;
  tiltX += (tiltTargetX - tiltX) * 0.025;
  tiltY += (tiltTargetY - tiltY) * 0.025;

  const gust = Math.pow(Math.max(0, Math.sin(time * 0.18 - 0.5)), 9);
  const pulse = 0.82 + Math.sin(time * 0.29) * 0.11 + gust * 0.4;
  const flagWidth = width * 1.02;
  const flagHeight = height * 1.02;
  const originX = (width - flagWidth) / 2 + tiltX * width * 0.006;
  const originY = (height - flagHeight) / 2 + tiltY * height * 0.004;
  const stripWidth = Math.max(3, Math.round(4 * pixelRatio));

  context.fillStyle = '#751726';
  context.fillRect(0, 0, width, height);

  for (let x = 0; x < flagWidth; x += stripWidth) {
    const u = x / flagWidth;
    const reach = 0.3 + smoothstep(Math.min(1, u * 1.15)) * 0.7;
    const broad = Math.sin(u * 11.4 - time * 1.35);
    const detail = Math.sin(u * 25.8 - time * 1.9 + 0.7);
    const drift = Math.sin(u * 5.6 - time * 0.72 - 0.4);
    const touchDistance = Math.abs(u - pointerX);
    const touchEnvelope = Math.exp(-touchDistance * touchDistance * 42) * interaction;
    const touchWave = Math.sin(touchDistance * 34 - time * 5.2) * touchEnvelope;
    const fold = (broad * 0.7 + detail * 0.2 + drift * 0.1) * pulse + touchWave * 0.5;
    const offsetY = fold * flagHeight * 0.012 * reach + (pointerY - 0.5) * flagHeight * 0.01 * touchEnvelope;
    const stretch = 1 + Math.cos(u * 11.4 - time * 1.35) * 0.01 * reach * pulse + touchWave * 0.005;

    const sourceX = (x / flagWidth) * texture.width;
    const sourceWidth = Math.min(texture.width - sourceX, (stripWidth / flagWidth) * texture.width + 2);
    const destinationX = originX + x;
    const destinationY = originY + offsetY - (flagHeight * (stretch - 1)) / 2;

    context.drawImage(texture, sourceX, 0, sourceWidth, texture.height, destinationX, destinationY, stripWidth + 1, flagHeight * stretch);

    const daylightSweep = Math.exp(-Math.pow(u - ((time * 0.032) % 1.5 - 0.22), 2) * 54) * 0.05;
    const light = Math.cos(u * 11.4 - time * 1.35) * 0.105 * pulse + Math.cos(u * 25.8 - time * 1.9) * 0.028 + daylightSweep;
    if (light > 0) {
      context.globalCompositeOperation = 'screen';
      context.fillStyle = `rgba(229, 235, 255, ${light})`;
    } else {
      context.globalCompositeOperation = 'multiply';
      context.fillStyle = `rgba(14, 16, 42, ${-light * 1.35})`;
    }
    context.fillRect(destinationX, destinationY, stripWidth + 1, flagHeight * stretch);
    context.globalCompositeOperation = 'source-over';
  }

  const bloom = context.createRadialGradient(width * .31, height * .28, 0, width * .31, height * .28, Math.max(width, height) * .8);
  bloom.addColorStop(0, 'rgba(255,255,255,.07)');
  bloom.addColorStop(.58, 'rgba(255,255,255,0)');
  bloom.addColorStop(1, 'rgba(4,7,27,.16)');
  context.fillStyle = bloom;
  context.fillRect(0, 0, width, height);

  const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width,height) * .24, width / 2, height / 2, Math.max(width,height) * .73);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(4,5,20,.24)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'screen';
  for (const mote of dust) {
    const x = ((mote.x + time * mote.speed) % 1.08) * width;
    const y = (mote.y + Math.sin(time * 0.15 + mote.phase) * 0.012) * height;
    const alpha = (0.012 + Math.sin(time * 0.42 + mote.phase) * 0.007) * (0.55 + gust * 0.45);
    context.fillStyle = `rgba(220, 232, 255, ${Math.max(0, alpha)})`;
    context.beginPath();
    context.arc(x, y, mote.size * pixelRatio, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
  if (!reducedMotion.matches) requestAnimationFrame(render);
}

window.addEventListener('resize', resize, { passive: true });
reducedMotion.addEventListener?.('change', () => { lastFrame = 0; requestAnimationFrame(render); });
requestAnimationFrame(render);
