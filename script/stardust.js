const canvas = document.getElementById("background-canvas");
const ctx = canvas.getContext("2d");

const heroCanvas = document.getElementById("hero-effects-canvas");
const heroCtx = heroCanvas.getContext("2d");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = Math.max(
    document.documentElement.scrollHeight,
    window.innerHeight,
  );
  generateStars();
  generateDust();

  heroCanvas.width = window.innerWidth;
  heroCanvas.height = window.innerHeight;
}

let stars = [];
let dust = [];
let dustOffscreenCanvas = null;
let dustOffscreenCtx = null;

let comets = [];
let lastCometSpawn = 0;
function getCometSpawnInterval() {
  return 3000 + Math.random() * 4000;
}

function generateStars() {
  stars = [];
  const starCount = Math.floor((canvas.width * canvas.height) / 1000);

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 0.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.002 + 0.001,
      twinklePhase: Math.random() * Math.PI * 2,
      baseOpacity: Math.random() * 0.7 + 0.3,
    });
  }
}

function generateDust() {
  dust = [];
  const rootStyles = getComputedStyle(document.documentElement);
  const foregroundColor = rootStyles.getPropertyValue("--foreground").trim();

  // Create offscreen canvas for dust texture
  dustOffscreenCanvas = document.createElement("canvas");
  dustOffscreenCanvas.width = canvas.width;
  dustOffscreenCanvas.height = canvas.height;
  dustOffscreenCtx = dustOffscreenCanvas.getContext("2d");

  // Generate dense dust particles - much denser than stars
  const dustCount = Math.floor((canvas.width * canvas.height) / 50); // ~20x denser

  // Parse foreground color to RGB for dust variations
  const tempDiv = document.createElement("div");
  tempDiv.style.color = foregroundColor;
  document.body.appendChild(tempDiv);
  const computedColor = getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);

  const rgbMatch = computedColor.match(/\d+/g);
  const baseR = rgbMatch ? parseInt(rgbMatch[0]) : 228;
  const baseG = rgbMatch ? parseInt(rgbMatch[1]) : 197;
  const baseB = rgbMatch ? parseInt(rgbMatch[2]) : 138;

  // Create fine dust particles
  for (let i = 0; i < dustCount; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;

    // Most particles are tiny (1-2 pixels), some slightly larger for clumps
    const isClump = Math.random() < 0.15; // 15% chance of being in a clump
    const size = isClump
      ? Math.random() * 1.5 + 0.5
      : Math.random() * 0.8 + 0.2;

    // Vary opacity - most are very faint, clumps slightly brighter
    const opacity = isClump
      ? Math.random() * 0.15 + 0.05
      : Math.random() * 0.08 + 0.02;

    // Slight color variation for organic feel
    const colorVariation = (Math.random() - 0.5) * 30;
    const r = Math.max(0, Math.min(255, baseR + colorVariation));
    const g = Math.max(0, Math.min(255, baseG + colorVariation));
    const b = Math.max(0, Math.min(255, baseB + colorVariation));

    dust.push({
      x,
      y,
      size,
      opacity,
      color: `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`,
    });
  }

  // Pre-render dust to offscreen canvas
  dustOffscreenCtx.fillStyle = "transparent";
  dustOffscreenCtx.fillRect(
    0,
    0,
    dustOffscreenCanvas.width,
    dustOffscreenCanvas.height,
  );

  dust.forEach((particle) => {
    dustOffscreenCtx.fillStyle = particle.color;
    dustOffscreenCtx.globalAlpha = particle.opacity;
    dustOffscreenCtx.beginPath();
    dustOffscreenCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    dustOffscreenCtx.fill();
  });

  dustOffscreenCtx.globalAlpha = 1.0;
}

function drawBackground() {
  const rootStyles = getComputedStyle(document.documentElement);
  const backgroundColor = rootStyles.getPropertyValue("--background").trim();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawDust() {
  if (!dustOffscreenCanvas) return;

  ctx.drawImage(dustOffscreenCanvas, 0, 0);
}

function drawStars(time) {
  const rootStyles = getComputedStyle(document.documentElement);
  const foregroundColor = rootStyles.getPropertyValue("--foreground").trim();

  stars.forEach((star) => {
    const twinkle = prefersReducedMotion
      ? 0
      : Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3;
    const currentOpacity = Math.max(
      0.2,
      Math.min(1, star.baseOpacity + twinkle),
    );

    ctx.fillStyle = foregroundColor;
    ctx.globalAlpha = currentOpacity;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1.0;
}

function getHeroCenter() {
  const navItems = document.querySelector(".nav-items");
  if (!navItems)
    return { x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 200 };

  const rect = navItems.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    radius: Math.max(rect.width, rect.height) / 2 + 100,
  };
}

function createComet() {
  const center = getHeroCenter();
  const angle = Math.random() * Math.PI * 2;
  const distance = center.radius + 200 + Math.random() * 300;

  const startX = center.x + Math.cos(angle) * distance;
  const startY = center.y + Math.sin(angle) * distance;

  const endAngle = angle + Math.PI + (Math.random() - 0.5) * 1.5;
  const endDistance = center.radius + 200 + Math.random() * 300;
  const endX = center.x + Math.cos(endAngle) * endDistance;
  const endY = center.y + Math.sin(endAngle) * endDistance;

  const midAngle = (angle + endAngle) / 2 + (Math.random() - 0.5) * 0.8;
  const midDistance = center.radius * 0.6 + Math.random() * center.radius * 0.4;
  const controlX = center.x + Math.cos(midAngle) * midDistance;
  const controlY = center.y + Math.sin(midAngle) * midDistance;

  const useCubic = Math.random() > 0.5;
  let control2X, control2Y;
  if (useCubic) {
    const midAngle2 = (angle + endAngle) / 2 - (Math.random() - 0.5) * 0.8;
    const midDistance2 =
      center.radius * 0.5 + Math.random() * center.radius * 0.3;
    control2X = center.x + Math.cos(midAngle2) * midDistance2;
    control2Y = center.y + Math.sin(midAngle2) * midDistance2;
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const foregroundColor = rootStyles.getPropertyValue("--foreground").trim();

  const tempDiv = document.createElement("div");
  tempDiv.style.color = foregroundColor;
  document.body.appendChild(tempDiv);
  const computedColor = getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);

  const rgbMatch = computedColor.match(/\d+/g);
  const baseR = rgbMatch ? parseInt(rgbMatch[0]) : 228;
  const baseG = rgbMatch ? parseInt(rgbMatch[1]) : 197;
  const baseB = rgbMatch ? parseInt(rgbMatch[2]) : 138;

  const brilliantR = Math.min(255, baseR + 50);
  const brilliantG = Math.min(255, baseG + 40);
  const brilliantB = Math.min(255, baseB + 20);
  const brilliantColor = `rgb(${brilliantR}, ${brilliantG}, ${brilliantB})`;
  const headColor = `rgb(255, ${Math.min(255, baseG + 80)}, ${Math.min(255, baseB + 60)})`;

  return {
    startX,
    startY,
    endX,
    endY,
    controlX,
    controlY,
    control2X: useCubic ? control2X : null,
    control2Y: useCubic ? control2Y : null,
    useCubic,
    progress: 0,
    speed: 0.003 + Math.random() * 0.002,
    color: brilliantColor,
    headColor,
    twinkles: [],
  };
}

function updateComets(time) {
  if (prefersReducedMotion) {
    comets = [];
    return;
  }

  const spawnInterval = getCometSpawnInterval();
  if (time - lastCometSpawn > spawnInterval && comets.length < 3) {
    comets.push(createComet());
    lastCometSpawn = time;
  }

  comets = comets.filter((comet) => {
    comet.progress += comet.speed;

    if (Math.random() < 0.3) {
      const t = comet.progress + (Math.random() - 0.5) * 0.1;
      if (t > 0 && t < 1) {
        const point = getBezierPoint(comet, t);
        comet.twinkles.push({
          x: point.x,
          y: point.y,
          opacity: 0.8,
          size: Math.random() * 1.5 + 0.5,
          decay: 0.02,
        });
      }
    }

    comet.twinkles = comet.twinkles.filter((twinkle) => {
      twinkle.opacity -= twinkle.decay;
      return twinkle.opacity > 0;
    });

    return comet.progress < 1;
  });
}

function getBezierPoint(comet, t) {
  if (comet.useCubic && comet.control2X !== null) {
    const mt = 1 - t;
    const x =
      mt * mt * mt * comet.startX +
      3 * mt * mt * t * comet.controlX +
      3 * mt * t * t * comet.control2X +
      t * t * t * comet.endX;
    const y =
      mt * mt * mt * comet.startY +
      3 * mt * mt * t * comet.controlY +
      3 * mt * t * t * comet.control2Y +
      t * t * t * comet.endY;
    return { x, y };
  } else {
    const mt = 1 - t;
    const x =
      mt * mt * comet.startX + 2 * mt * t * comet.controlX + t * t * comet.endX;
    const y =
      mt * mt * comet.startY + 2 * mt * t * comet.controlY + t * t * comet.endY;
    return { x, y };
  }
}

function drawComets() {
  if (prefersReducedMotion) return;

  heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

  comets.forEach((comet) => {
    // Draw tail with gradient
    const currentPoint = getBezierPoint(comet, comet.progress);
    const tailLength = 0.15; // 15% of path behind head
    const tailStart = Math.max(0, comet.progress - tailLength);

    // Create gradient for tail
    const gradient = heroCtx.createLinearGradient(
      getBezierPoint(comet, tailStart).x,
      getBezierPoint(comet, tailStart).y,
      currentPoint.x,
      currentPoint.y,
    );

    gradient.addColorStop(
      0,
      `rgba(${comet.color.match(/\d+/g).join(", ")}, 0)`,
    );
    gradient.addColorStop(
      0.5,
      `rgba(${comet.color.match(/\d+/g).join(", ")}, 0.4)`,
    );
    gradient.addColorStop(1, comet.headColor);

    // Draw tail path
    heroCtx.strokeStyle = gradient;
    heroCtx.lineWidth = 2;
    heroCtx.lineCap = "round";
    heroCtx.beginPath();

    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = tailStart + (comet.progress - tailStart) * (i / steps);
      const point = getBezierPoint(comet, t);
      if (i === 0) {
        heroCtx.moveTo(point.x, point.y);
      } else {
        heroCtx.lineTo(point.x, point.y);
      }
    }
    heroCtx.stroke();

    // Draw head (bright spark)
    heroCtx.fillStyle = comet.headColor;
    heroCtx.globalAlpha = 1.0;
    heroCtx.beginPath();
    heroCtx.arc(currentPoint.x, currentPoint.y, 3, 0, Math.PI * 2);
    heroCtx.fill();

    // Add glow around head
    const glowGradient = heroCtx.createRadialGradient(
      currentPoint.x,
      currentPoint.y,
      0,
      currentPoint.x,
      currentPoint.y,
      8,
    );
    glowGradient.addColorStop(
      0,
      `rgba(${comet.headColor.match(/\d+/g).join(", ")}, 0.6)`,
    );
    glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    heroCtx.fillStyle = glowGradient;
    heroCtx.beginPath();
    heroCtx.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
    heroCtx.fill();

    // Draw twinkles along path
    comet.twinkles.forEach((twinkle) => {
      heroCtx.fillStyle = comet.color;
      heroCtx.globalAlpha = twinkle.opacity;
      heroCtx.beginPath();
      heroCtx.arc(twinkle.x, twinkle.y, twinkle.size, 0, Math.PI * 2);
      heroCtx.fill();
    });

    heroCtx.globalAlpha = 1.0;
  });
}

function animate(time) {
  drawBackground();
  drawDust();
  drawStars(time);
  updateComets(time);
  drawComets();
  requestAnimationFrame(animate);
}

let resizeTimeout = null;
function scheduleResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resizeCanvas();
    resizeTimeout = null;
  }, 250);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const resizeObserver = new ResizeObserver(scheduleResize);
resizeObserver.observe(document.body);

animate(0);
