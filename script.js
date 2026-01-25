function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const canvas = document.getElementById("background-canvas");

const ctx = canvas.getContext("2d");

// Set canvas size to window size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  generateStars();
}

let stars = [];

// Generate stars with varying properties
function generateStars() {
  stars = [];
  const starCount = Math.floor((canvas.width * canvas.height) / 3000); // Density similar to image

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1 + 0.5, // Size between 0.5 and 1.5
      opacity: Math.random() * 0.7 + 0.3, // Opacity between 0.3 and 1.0
      twinkleSpeed: Math.random() * 0.002 + 0.001,
      twinklePhase: Math.random() * Math.PI * 2,
      baseOpacity: Math.random() * 0.7 + 0.3,
    });
  }
}

// Draw stars
function drawStars(time) {
  // Clear canvas with dark background
  ctx.fillStyle = "#0d0a09";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each star
  stars.forEach((star) => {
    // Subtle twinkling effect
    const twinkle =
      Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3;
    const currentOpacity = Math.max(
      0.2,
      Math.min(1, star.baseOpacity + twinkle),
    );

    // Color with slight warm tint (matching the image)
    ctx.fillStyle = `rgba(255, 248, 240, ${currentOpacity})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Animation loop
function animate(time) {
  drawStars(time);
  requestAnimationFrame(animate);
}

// Initialize
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
animate(0);
