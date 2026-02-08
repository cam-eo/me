const mainNav = document.getElementById("main-nav");
const navItems = document.querySelector(".nav-items");
const period = document.querySelector(".period");
const navLetters = document.querySelectorAll(".nav-letter");
const navLetterSuffixes = document.querySelectorAll(".letter-suffix");
const aboutMeSuffix = document.getElementById("about-me-suffix");
const cvSuffix = document.getElementById("cv-suffix");
const myProjectsSuffix = document.getElementById("my-projects-suffix");
const navToggleButton = document.querySelector(".nav-hamburger");
const bodyElement = document.body;
let isNavOpen = false;
const sectionConfigs = [
  { id: "cv", letter: "c" },
  { id: "about", letter: "a" },
  { id: "projects", letter: "m" },
];
const sectionElements = sectionConfigs.map(({ id, letter }) => ({
  letter,
  element: document.getElementById(id),
}));

function clamp(min, v, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 *
 * @param {*} a - final value
 * @param {*} b - initial value
 * @param {*} t - Increment (0-1)
 * @returns
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

const MOBILE_BREAKPOINT = 768;

function setNavOpen(open) {
  isNavOpen = open;
  if (mainNav) {
    mainNav.classList.toggle("nav-open", open);
  }
  bodyElement.classList.toggle("nav-open", open);
  if (navToggleButton) {
    navToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    navToggleButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  
  // Clear inline pointer-events styles when opening nav so CSS can take over
  if (open) {
    navLetters.forEach((letter) => {
      letter.style.pointerEvents = "";
    });
  }
}

function handleScroll() {
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  const progress = Math.min(scrollY / viewportHeight, 1);

  const rootFontSize =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const isCompactViewport = window.innerWidth < 570;
  const widthFactor = isCompactViewport ? 0.14 : 0.2;
  const maxLargePx = isCompactViewport ? 8 * rootFontSize : 15 * rootFontSize;
  const bigPx = clamp(
    8 * rootFontSize,
    window.innerWidth * widthFactor,
    maxLargePx
  );
  const smallPx = 1.6 * rootFontSize;
  const camFontPx = lerp(bigPx, smallPx, progress);

  // Position navbar text vertically from center Desktop
  const targetCenterY = 26;
  const translateYPx = (targetCenterY - window.innerHeight / 2) * progress;

  const suffixOpacity = Math.max(0, (progress - 0.5) * 2);

  const periodOpacity = 1 - progress;

  if (!isMobile) {
    if (aboutMeSuffix) {
      aboutMeSuffix.style.width = `${progress * 6}rem`;
    }

    if (cvSuffix) {
      cvSuffix.style.width = `${progress * 1}rem`;
    }

    if (myProjectsSuffix) {
      myProjectsSuffix.style.width = `${progress * 10}rem`;
    }
  } else {
    if (aboutMeSuffix) {
      aboutMeSuffix.style.width = "";
    }

    if (cvSuffix) {
      cvSuffix.style.width = "";
    }

    if (myProjectsSuffix) {
      myProjectsSuffix.style.width = "";
    }
  }

  if (navItems) {
    navItems.style.transform = `translateY(${translateYPx}px)`;
    navItems.style.setProperty("--cam-font-size", `${camFontPx}px`);
  }

  if (mainNav) {
    const bgOpacity = Math.max(0, (progress - 0.5) * 2);
    mainNav.style.setProperty("--nav-bg-opacity", bgOpacity);
  }

  navLetters.forEach((letter) => {
    const suffix = letter.querySelector(".letter-suffix");

    if (!isMobile && suffix) {
      suffix.style.opacity = suffixOpacity;
      suffix.style.transform =
        suffixOpacity > 0 ? "translateX(0)" : "translateX(-0.5rem)";
    } else if (suffix) {
      suffix.style.opacity = "";
      suffix.style.transform = "";
    }

    // Only control pointer events when nav is closed on desktop
    if (!isNavOpen && !isMobile) {
      letter.style.pointerEvents = progress > 0.3 ? "auto" : "none";
    } else if (isMobile) {
      letter.style.pointerEvents = "";
    }
  });

  if (period) {
    period.style.opacity = isMobile ? "" : periodOpacity;
  }

  updateMobileCamTransform(scrollY, viewportHeight);
  updateActiveNav();
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

if (navToggleButton) {
  navToggleButton.addEventListener("click", () => {
    setNavOpen(!isNavOpen);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isNavOpen) {
    setNavOpen(false);
  }
});

function updateActiveNav() {
  const threshold = window.innerHeight * 0.35;
  let activeLetter = sectionElements[0]?.letter ?? null;

  sectionElements.forEach(({ element, letter }) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.top <= threshold) {
      activeLetter = letter;
    }
  });

  // Check if scroll animation is complete (desktop only)
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const progress = Math.min(scrollY / viewportHeight, 1);
  const isScrollComplete = progress > 0.5;
  const isDesktop = window.innerWidth > 768;

  navLetters.forEach((navLetter) => {
    const isActive = navLetter.dataset.letter === activeLetter;
    navLetter.classList.toggle("nav-active", isActive);
    
    // Only show underline on desktop when scroll animation is complete
    if (isDesktop && isScrollComplete) {
      navLetter.classList.toggle("show-underline", isActive);
    } else {
      navLetter.classList.remove("show-underline");
    }
    
    if (isActive) {
      navLetter.setAttribute("aria-current", "page");
    } else {
      navLetter.removeAttribute("aria-current");
    }
  });
}

function updateMobileCamTransform(scrollY, viewportHeight) {
  if (!navItems) return;
  navItems.style.setProperty("--cam-mobile-translate-x", "0px");
  navItems.style.setProperty("--cam-mobile-translate-y", "0px");
  navItems.style.setProperty("--cam-mobile-scale", "1");
  navItems.style.setProperty("--cam-mobile-opacity", "1");
}

document.querySelectorAll('.nav-letter[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    // Close nav immediately on mobile before scrolling
    if (isNavOpen) {
      setNavOpen(false);
    }

    const targetId = this.getAttribute("href");
    const targetSection = document.querySelector(targetId);

    if (targetSection) {
      // Small delay to allow nav close animation to start
      setTimeout(() => {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      history.pushState(null, null, targetId);
    }
  });
});
