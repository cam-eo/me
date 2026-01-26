const mainNav = document.getElementById("main-nav");
const navItems = document.querySelector(".nav-items");
const period = document.querySelector(".period");
const navLetters = document.querySelectorAll(".nav-letter");

function clamp(min, v, max) {
  return Math.min(max, Math.max(min, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function handleScroll() {
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  
  const progress = Math.min(scrollY / viewportHeight, 1);

  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const bigPx = clamp(8 * rootFontSize, window.innerWidth * 0.2, 15 * rootFontSize);
  const smallPx = 1.6 * rootFontSize;
  const camFontPx = lerp(bigPx, smallPx, progress);

  const targetCenterY = 56;
  const translateYPx = (targetCenterY - window.innerHeight / 2) * progress;
  
  const gap = 0.5 + progress * 8.5;
  
  const baseOpacity = 1 - progress;
  
  const fullOpacity = Math.max(0, (progress - 0.5) * 2);
  
  const periodOpacity = 1 - progress;
  
  if (navItems) {
    navItems.style.transform = `translateY(${translateYPx}px)`;
    navItems.style.gap = `${gap}rem`;
    navItems.style.setProperty("--cam-font-size", `${camFontPx}px`);
  }
  
  if (mainNav) {
    const bgOpacity = Math.max(0, (progress - 0.5) * 2);
    mainNav.style.setProperty('--nav-bg-opacity', bgOpacity);
  }
  
  navLetters.forEach(letter => {
    const base = letter.querySelector('.letter-base');
    const full = letter.querySelector('.letter-full');
    
    if (base) base.style.opacity = baseOpacity;
    if (full) full.style.opacity = fullOpacity;
    
    letter.style.pointerEvents = progress > 0.3 ? 'auto' : 'none';
  });
  
  if (period) {
    period.style.opacity = periodOpacity;
  }
}

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

window.addEventListener("scroll", requestScrollUpdate);

handleScroll();

document.querySelectorAll('.nav-letter[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    
    const targetId = this.getAttribute("href");
    const targetSection = document.querySelector(targetId);
    
    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      
      history.pushState(null, null, targetId);
    }
  });
});
