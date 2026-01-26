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
  const starCount = Math.floor((canvas.width * canvas.height) / 1000); // Density similar to image

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 0.5 + 0.5, // Size between 0.5 and 1.5
      opacity: Math.random() * 0.7 + 0.3, // Opacity between 0.3 and 1.0
      twinkleSpeed: Math.random() * 0.002 + 0.001,
      twinklePhase: Math.random() * Math.PI * 2,
      baseOpacity: Math.random() * 0.7 + 0.3,
    });
  }
}

// Draw stars
function drawStars(time) {
  const rootStyles = getComputedStyle(document.documentElement);

  // Read variables
  const backgroundColor = rootStyles.getPropertyValue("--background").trim();
  const foregroundColor = rootStyles.getPropertyValue("--foreground").trim();

  // Clear canvas with dark background
  ctx.fillStyle = backgroundColor;
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
    ctx.fillStyle = foregroundColor;
    ctx.opacity = currentOpacity;
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

// Initialize canvas
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
animate(0);

// ===== SCROLL ANIMATION LOGIC =====

const heroContainer = document.querySelector(".hero-container");
const heroTitle = document.querySelector(".hero-title");
const mainNav = document.getElementById("main-nav");

// Track scroll and update hero/nav transforms
function handleScroll() {
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  
  // Calculate progress (0 to 1) over the first viewport height
  const progress = Math.min(scrollY / viewportHeight, 1);
  
  // Calculate scale: from 1 to 0.15 (small but not invisible)
  const scale = 1 - progress * 0.85;
  
  // Calculate opacity: fade out hero as we scroll
  const heroOpacity = 1 - progress;
  
  // Calculate navigation opacity: fade in after 50% scroll
  const navOpacity = Math.max(0, (progress - 0.5) * 2);
  
  // Apply transforms to hero
  if (heroContainer && heroTitle) {
    heroTitle.style.transform = `scale(${scale})`;
    heroTitle.style.opacity = heroOpacity;
    
    // Hide hero container completely when fully scrolled
    if (progress >= 0.95) {
      heroContainer.style.pointerEvents = "none";
      heroContainer.style.opacity = "0";
    } else {
      heroContainer.style.opacity = "1";
    }
  }
  
  // Show/hide navigation based on scroll
  if (mainNav) {
    if (progress > 0.3) {
      mainNav.classList.add("visible");
    } else {
      mainNav.classList.remove("visible");
    }
  }
}

// Use requestAnimationFrame for smooth performance
let ticking = false;

function requestScrollUpdate() {
  if (!ticking) {
    requestAnimationFrame(() => {
      handleScroll();
      ticking = false;
    });
    ticking = true;
  }
}

// Listen to scroll events
window.addEventListener("scroll", requestScrollUpdate);

// Initial call to set correct state on page load
handleScroll();

// ===== SMOOTH SCROLL FOR NAVIGATION LINKS =====

// Add smooth scroll behavior to all navigation anchor links
document.querySelectorAll('#main-nav a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    
    const targetId = this.getAttribute("href");
    const targetSection = document.querySelector(targetId);
    
    if (targetSection) {
      // Smooth scroll to the target section
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      
      // Update URL without jumping
      history.pushState(null, null, targetId);
    }
  });
});
