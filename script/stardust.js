const canvas = document.getElementById("background-canvas");

const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = Math.max(
    document.documentElement.scrollHeight,
    window.innerHeight
  );
  generateStars();
}

let stars = [];

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

function drawStars(time) {
  const rootStyles = getComputedStyle(document.documentElement);

  const backgroundColor = rootStyles.getPropertyValue("--background").trim();
  const foregroundColor = rootStyles.getPropertyValue("--foreground").trim();

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    const twinkle =
      Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3;
    const currentOpacity = Math.max(
      0.2,
      Math.min(1, star.baseOpacity + twinkle),
    );

    ctx.fillStyle = foregroundColor;
    ctx.opacity = currentOpacity;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function animate(time) {
  drawStars(time);
  requestAnimationFrame(animate);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
animate(0);
