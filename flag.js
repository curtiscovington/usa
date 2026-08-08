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

function render(timestamp = 0) {
  resize();
  if (reducedMotion.matches && lastFrame > 0) return;
  lastFrame = timestamp;

  const time = reducedMotion.matches ? 0.6 : timestamp / 1000;
  const flagWidth = width * 1.02;
  const flagHeight = height * 1.02;
  const originX = (width - flagWidth) / 2;
  const originY = (height - flagHeight) / 2;
  const stripWidth = Math.max(3, Math.round(4 * pixelRatio));

  context.fillStyle = '#751726';
  context.fillRect(0, 0, width, height);

  for (let x = 0; x < flagWidth; x += stripWidth) {
    const u = x / flagWidth;
    const reach = 0.3 + smoothstep(Math.min(1, u * 1.15)) * 0.7;
    const broad = Math.sin(u * 11.4 - time * 1.35);
    const detail = Math.sin(u * 25.8 - time * 1.9 + 0.7);
    const drift = Math.sin(u * 5.6 - time * 0.72 - 0.4);
    const fold = broad * 0.72 + detail * 0.19 + drift * 0.09;
    const offsetY = fold * flagHeight * 0.006 * reach;
    const stretch = 1 + Math.cos(u * 11.4 - time * 1.35) * 0.008 * reach;

    const sourceX = (x / flagWidth) * texture.width;
    const sourceWidth = Math.min(texture.width - sourceX, (stripWidth / flagWidth) * texture.width + 2);
    const destinationX = originX + x;
    const destinationY = originY + offsetY - (flagHeight * (stretch - 1)) / 2;

    context.drawImage(texture, sourceX, 0, sourceWidth, texture.height, destinationX, destinationY, stripWidth + 1, flagHeight * stretch);

    const light = Math.cos(u * 11.4 - time * 1.35) * 0.115 + Math.cos(u * 25.8 - time * 1.9) * 0.033;
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

  if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
  if (!reducedMotion.matches) requestAnimationFrame(render);
}

window.addEventListener('resize', resize, { passive: true });
reducedMotion.addEventListener?.('change', () => { lastFrame = 0; requestAnimationFrame(render); });
requestAnimationFrame(render);
