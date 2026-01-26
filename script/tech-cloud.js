const techCloud = document.getElementById("tech-cloud");
const sizeOrder = {
  sm: 1,
  base: 2,
  lg: 3,
  xl: 4,
  "2xl": 5,
  "3xl": 6,
  "4xl": 7,
  "5xl": 8,
};

const sizeVarMap = {
  sm: "--text-sm",
  base: "--text-base",
  lg: "--text-lg",
  xl: "--text-xl",
  "2xl": "--text-2xl",
  "3xl": "--text-3xl",
  "4xl": "--text-4xl",
  "5xl": "--text-5xl",
};

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function toPx(value, rootFontSize) {
  if (value.endsWith("rem")) return parseFloat(value) * rootFontSize;
  if (value.endsWith("px")) return parseFloat(value);
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : rootFontSize;
}

function getSizePx(sizeKey) {
  const rootStyle = getComputedStyle(document.documentElement);
  const rootFontSize = parseFloat(rootStyle.fontSize) || 16;
  const cssVar = sizeVarMap[sizeKey] || sizeVarMap.base;
  const rawValue = rootStyle.getPropertyValue(cssVar).trim();
  return toPx(rawValue, rootFontSize);
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function hashToUnit(hash) {
  return (hash % 4294967295) / 4294967295;
}

function halton(index, base) {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

function measureText(text, sizePx, fontFamily) {
  measureCtx.font = `${sizePx}px ${fontFamily}`;
  const metrics = measureCtx.measureText(text);
  return {
    width: metrics.width,
    height: sizePx * 1.05,
  };
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function intersects(candidate, placed, gap) {
  for (let i = 0; i < placed.length; i += 1) {
    const other = placed[i];
    const overlapX = Math.abs(candidate.x - other.x) < (candidate.w + other.w) / 2 + gap;
    const overlapY = Math.abs(candidate.y - other.y) < (candidate.h + other.h) / 2 + gap;
    if (overlapX && overlapY) return true;
  }
  return false;
}

/** Places tech tokens in a deterministic, free-form layout. */
function layoutTechCloud(container, items) {
  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width, 240);
  const height = Math.max(rect.height, 240);
  const pad = Math.min(Math.max(width, height) * 0.08, 60);
  const gap = Math.min(Math.max(width, height) * 0.02, 18);
  const maxX = width - pad;
  const maxY = height - pad;
  const minX = pad;
  const minY = pad;
  const placed = [];
  const origin = Math.min(width, height) * 0.08;
  const goldenAngle = 2.399963229728653;

  items.forEach((item, index) => {
    const baseX = minX + halton(index + 1, 2) * (maxX - minX);
    const baseY = minY + halton(index + 1, 3) * (maxY - minY);
    const jitterX = (hashToUnit(item.hash + 17) - 0.5) * origin;
    const jitterY = (hashToUnit(item.hash + 29) - 0.5) * origin;
    const startAngle = hashToUnit(item.hash + 43) * Math.PI * 2;
    const maxSteps = 520;
    let placedBox = null;

    for (let step = 0; step < maxSteps; step += 1) {
      const angle = startAngle + step * goldenAngle;
      const radius = step * 4;
      const x = clampValue(baseX + jitterX + Math.cos(angle) * radius, minX + item.w / 2, maxX - item.w / 2);
      const y = clampValue(baseY + jitterY + Math.sin(angle) * radius, minY + item.h / 2, maxY - item.h / 2);
      const candidate = { x, y, w: item.w, h: item.h };
      if (!intersects(candidate, placed, gap)) {
        placedBox = candidate;
        break;
      }
    }

    if (!placedBox) {
      placedBox = {
        x: clampValue(baseX + jitterX, minX + item.w / 2, maxX - item.w / 2),
        y: clampValue(baseY + jitterY, minY + item.h / 2, maxY - item.h / 2),
        w: item.w,
        h: item.h,
      };
    }

    placed.push(placedBox);
    item.el.style.left = `${placedBox.x}px`;
    item.el.style.top = `${placedBox.y}px`;
  });
}

async function initTechCloud() {
  if (!techCloud || !measureCtx) return;
  const response = await fetch("content/tech-bits.json");
  const tokens = await response.json();
  await document.fonts.ready;
  const fontFamily = getComputedStyle(techCloud).fontFamily || "sans-serif";
  const items = tokens
    .map((token) => {
      const sizeKey = token.size || "base";
      const sizePx = getSizePx(sizeKey);
      const metrics = measureText(token.text, sizePx, fontFamily);
      const el = document.createElement("span");
      el.className = "tech-cloud-item";
      el.dataset.size = sizeKey;
      el.textContent = token.text;
      techCloud.appendChild(el);
      return {
        el,
        text: token.text,
        size: sizeKey,
        sizeRank: sizeOrder[sizeKey] || sizeOrder.base,
        w: metrics.width,
        h: metrics.height,
        hash: hashString(token.text),
      };
    })
    .sort((a, b) => {
      if (b.sizeRank !== a.sizeRank) return b.sizeRank - a.sizeRank;
      return a.text.localeCompare(b.text);
    });

  layoutTechCloud(techCloud, items);

  let resizeId = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(() => {
      layoutTechCloud(techCloud, items);
    });
  });
}

initTechCloud();
