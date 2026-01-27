(function () {
  "use strict";

  const techCloud = document.getElementById("tech-cloud");
  const canvas = document.getElementById("tech-cloud-canvas");

  if (!techCloud || !canvas) {
  console.warn("Tech cloud container or canvas missing — spiral will not render.");
} else {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn("Unable to get 2D context for tech cloud canvas.");
  } else {

    // Configuration
    // Overall size: increase --text-sm..--text-5xl in style.css for bigger text;
    // or .tech-cloud { min-height } and content-section max-width for a larger canvas.
    const GOLDEN_RATIO = 1.618033988749895;
    const SPIRAL_GROWTH = Math.log(GOLDEN_RATIO) / (Math.PI / 2); // Growth factor for golden spiral
    const MIN_ANGLE_STEP = 0.01; // Minimum angle increment for spiral calculation
    const WORD_SPACING = 1.9; // Multiplier for spacing between words
    const PROGRESSIVE_REVEAL_DELAY = 50; // ms between word reveals
    const WORDS_PER_REVEAL = 1; // Words to reveal per tick
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 4;
    const ZOOM_STEP = 0.25;

    // State
    let words = [];
    let placedWords = [];
    let visibleWordCount = 0;
    let rotationOffset = 0;
    let zoomLevel = 2.25;
    let isDragging = false;
    let dragStartAngle = 0;
    let dragStartRotation = 0;
    let animationFrameId = null;
    let revealIntervalId = null;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Get CSS variable value
    function getCSSVar(varName) {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
    }

    // Get font size in pixels from size token
    function getFontSize(sizeToken) {
      const sizeMap = {
        sm: getCSSVar("--text-sm"),
        base: getCSSVar("--text-base"),
        lg: getCSSVar("--text-lg"),
        xl: getCSSVar("--text-xl"),
        "2xl": getCSSVar("--text-2xl"),
        "3xl": getCSSVar("--text-3xl"),
        "4xl": getCSSVar("--text-4xl"),
        "5xl": getCSSVar("--text-5xl"),
      };
      const value = sizeMap[sizeToken] || sizeMap.base;
      return parseFloat(value);
    }

    // Setup canvas with proper DPR
    function setupCanvas() {
      const rect = techCloud.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Get computed styles as fallback
      const computedStyle = window.getComputedStyle(techCloud);
      const minHeight = parseFloat(computedStyle.minHeight) || 640;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;

      // Ensure we have valid dimensions
      // Use container width minus padding, or window width as fallback
      const width = Math.max(
        rect.width || window.innerWidth - paddingLeft - paddingRight,
        800
      );
      const height = Math.max(rect.height || minHeight, minHeight);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Reset transform and set up context
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    }

    // Golden spiral: r = a * e^(b*θ)
    // For golden spiral: b = ln(φ) / (π/2)
    function getSpiralPoint(angle) {
      // Scale starting radius based on canvas size
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const minDimension = Math.min(width, height);
      const a = minDimension * 0.07; // Start at 5% of smaller dimension
      const r = a * Math.exp(SPIRAL_GROWTH * angle);
      return {
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        radius: r,
        angle: angle,
      };
    }

    // Calculate tangent angle at a point on the spiral
    function getSpiralTangent(angle) {
      // For r = a * e^(b*θ), the tangent angle is θ + arctan(1/b)
      // Simplified: tangent ≈ angle + π/2 for golden spiral
      return angle + Math.PI / 2;
    }

    // Calculate arc length from angle0 to angle1 along spiral
    function getArcLength(angle0, angle1) {
      // Approximate arc length using integration
      // For r = a * e^(b*θ), ds = sqrt(r² + (dr/dθ)²) dθ
      const steps = Math.ceil((angle1 - angle0) / MIN_ANGLE_STEP);
      let length = 0;
      let prevPoint = getSpiralPoint(angle0);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const angle = angle0 + (angle1 - angle0) * t;
        const point = getSpiralPoint(angle);
        const dx = point.x - prevPoint.x;
        const dy = point.y - prevPoint.y;
        length += Math.sqrt(dx * dx + dy * dy);
        prevPoint = point;
      }

      return length;
    }

    // Find angle where word fits along spiral
    function findWordPlacement(startAngle, wordWidth) {
      const requiredLength = wordWidth * WORD_SPACING;
      let currentAngle = startAngle;
      let step = 0.1;

      while (true) {
        const testAngle = currentAngle + step;
        const arcLength = getArcLength(startAngle, testAngle);

        if (arcLength >= requiredLength) {
          // Binary search refinement
          let low = currentAngle;
          let high = testAngle;
          for (let i = 0; i < 10; i++) {
            const mid = (low + high) / 2;
            const midLength = getArcLength(startAngle, mid);
            if (midLength < requiredLength) {
              low = mid;
            } else {
              high = mid;
            }
          }
          return (low + high) / 2;
        }

        currentAngle = testAngle;
        // Increase step size if we're far from target
        if (arcLength < requiredLength * 0.5) {
          step *= 1.5;
        }
      }
    }

    // Wait for fonts to load
    async function waitForFonts() {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {
          // Font loading API not available, continue anyway
        }
      }
      // Additional wait to ensure fonts are rendered
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Load and process tech bits
    async function loadTechBits() {
      try {
        // Wait for fonts to load before measuring
        await waitForFonts();

        // Try both absolute and relative paths
        let response;
        try {
          response = await fetch("/content/tech-bits.json");
        } catch (e) {
          response = await fetch("content/tech-bits.json");
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        words = [];
        data.forEach((entry) => {
          const entryWords = entry.text.split(/\s+/).filter((w) => w.length > 0);
          entryWords.forEach((word) => {
            words.push({
              text: word,
              size: entry.size,
              fontSize: getFontSize(entry.size),
            });
          });
        });

        placeWords();
        console.log(`Placed ${placedWords.length} words along spiral`);
        startProgressiveReveal();
      } catch (error) {
        console.error("Failed to load tech bits:", error);
        // Show error on canvas
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        ctx.font = "24px sans-serif";
        ctx.fillStyle = getCSSVar("--foreground");
        ctx.fillText("Failed to load tech bits", width / 2, height / 2);
      }
    }

    // Place all words along the spiral
    function placeWords() {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const fontFamily = getCSSVar("--font-bold");

      // Ensure context is set up
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      placedWords = [];
      let currentAngle = 0;

      words.forEach((word) => {
        // Set font for measurement
        ctx.font = `${word.fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(word.text);
        const wordWidth = metrics.width;

        // Find placement angle
        const placementAngle = findWordPlacement(currentAngle, wordWidth);
        const point = getSpiralPoint(placementAngle);
        const tangentAngle = getSpiralTangent(placementAngle);
        const textAngle = tangentAngle + Math.PI / 2; // Perpendicular to curve

        placedWords.push({
          ...word,
          x: centerX + point.x,
          y: centerY + point.y,
          angle: textAngle,
          visible: false,
        });

        currentAngle = placementAngle;
      });
    }

    // Draw the spiral visualization
    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Save context
      ctx.save();

      // Apply zoom and global rotation (center of canvas)
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.rotate(rotationOffset);
      ctx.translate(-width / 2, -height / 2);

      // Draw visible words
      const fontFamily = getCSSVar("--font-bold");
      const foreground = getCSSVar("--foreground");

      placedWords.slice(0, visibleWordCount).forEach((word) => {
        ctx.save();
        ctx.translate(word.x, word.y);
        ctx.rotate(word.angle);
        ctx.font = `${word.fontSize}px ${fontFamily}`;
        ctx.fillStyle = foreground;
        ctx.fillText(word.text, 0, 0);
        ctx.restore();
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(draw);
    }

    // Progressive reveal
    function startProgressiveReveal() {
      if (reducedMotion) {
        // Show all immediately
        visibleWordCount = placedWords.length;
        return;
      }

      visibleWordCount = 0;
      if (revealIntervalId) clearInterval(revealIntervalId);

      revealIntervalId = setInterval(() => {
        visibleWordCount = Math.min(
          visibleWordCount + WORDS_PER_REVEAL,
          placedWords.length,
        );

        if (visibleWordCount >= placedWords.length) {
          clearInterval(revealIntervalId);
          revealIntervalId = null;
        }
      }, PROGRESSIVE_REVEAL_DELAY);
    }

    // Get angle from center to point
    function getAngleFromCenter(x, y) {
      const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
      const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
      return Math.atan2(y - centerY, x - centerX);
    }

    // Drag interaction
    function handlePointerDown(e) {
      e.preventDefault();
      isDragging = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      dragStartAngle = getAngleFromCenter(x, y);
      dragStartRotation = rotationOffset;

      canvas.style.cursor = "grabbing";
    }

    function handlePointerMove(e) {
      if (!isDragging) return;

      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const currentAngle = getAngleFromCenter(x, y);
      const deltaAngle = currentAngle - dragStartAngle;
      rotationOffset = dragStartRotation + deltaAngle;
    }

    function handlePointerUp(e) {
      if (!isDragging) return;

      e.preventDefault();
      isDragging = false;
      canvas.style.cursor = "grab";
    }

    function handlePointerCancel(e) {
      handlePointerUp(e);
    }

    // Zoom controls
    function zoomIn() {
      zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
    }
    function zoomOut() {
      zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
    }
    const zoomInBtn = document.getElementById("tech-cloud-zoom-in");
    const zoomOutBtn = document.getElementById("tech-cloud-zoom-out");
    if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut);

    // Event listeners
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);

    // Initialize
    function init() {
      // Wait a bit for DOM to be ready and container to have size
      setTimeout(() => {
        setupCanvas();
        loadTechBits();
        draw();
      }, 100);

      // Handle resize
      let resizeTimeout;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          setupCanvas();
          if (words.length > 0) {
            placeWords();
            if (reducedMotion) {
              visibleWordCount = placedWords.length;
            }
          }
        }, 250);
      });

      // Handle reduced motion changes
      window
        .matchMedia("(prefers-reduced-motion: reduce)")
        .addEventListener("change", (e) => {
          reducedMotion = e.matches;
          if (reducedMotion) {
            visibleWordCount = placedWords.length;
            if (revealIntervalId) {
              clearInterval(revealIntervalId);
              revealIntervalId = null;
            }
          } else {
            startProgressiveReveal();
          }
        });
    }

    // Start when DOM is ready and page is loaded
    function startInit() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          // Wait a bit more for layout
          setTimeout(init, 50);
        });
      } else {
        // Already loaded, but wait for layout
        setTimeout(init, 50);
      }
    }

    startInit();
  }
  }
})();
