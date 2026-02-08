(function () {
  "use strict";

  // Configuration
  const ROWS = 10;
  const CARD_GAP = 3; // px between cards (must match style.css)
  const FLIP_DURATION = 150; // ms per flip animation
  const DEFAULT_CARD_WIDTH = 40; // fallback if CSS var missing
  const DISPLAY_DURATION = 10000; // ms to display before flipping to next set
  const FLIP_STAGGER_MAX = 800; // max random delay for staggered flip

  // State
  let words = [];
  let columns = 0;
  let cells = [];
  let currentGrid = [];
  let nextGrid = [];
  let isAnimating = false;
  let hasStarted = false;
  let reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const container = document.getElementById("tech-board");

  if (!container) {
    console.warn("Tech board container not found");
    return;
  }

  // Shuffle array (Fisher-Yates)
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Pack words into grid, row by row
  function packWords(wordList, cols, rows) {
    const totalCells = cols * rows;
    const grid = new Array(totalCells).fill(" ");
    const shuffled = shuffle(wordList);

    let cellIndex = 0;
    let wordIndex = 0;
    let currentRow = 0;
    let colInRow = 0;

    while (currentRow < rows && wordIndex < shuffled.length) {
      const word = shuffled[wordIndex].toUpperCase();
      const wordLen = word.length;
      const remaining = cols - colInRow;

      // Need wordLen + 1 for word + trailing space (unless end of row)
      if (wordLen + 1 <= remaining) {
        // Place word
        for (let i = 0; i < wordLen; i++) {
          grid[currentRow * cols + colInRow] = word[i];
          colInRow++;
        }
        // Place space after word
        if (colInRow < cols) {
          grid[currentRow * cols + colInRow] = " ";
          colInRow++;
        }
        wordIndex++;
      } else if (wordLen <= remaining) {
        // Word fits exactly or without trailing space
        for (let i = 0; i < wordLen; i++) {
          grid[currentRow * cols + colInRow] = word[i];
          colInRow++;
        }
        wordIndex++;
        // Move to next row
        currentRow++;
        colInRow = 0;
      } else {
        // Word doesn't fit, move to next row
        currentRow++;
        colInRow = 0;
      }
    }

    return grid;
  }

  // Create a single flip card element
  function createFlipCard(index) {
    const card = document.createElement("div");
    card.className = "flip-card";
    card.dataset.index = index;

    card.innerHTML = `
      <div class="flip-card-inner">
        <div class="flip-card-top">
          <span class="flip-char-current"></span>
        </div>
        <div class="flip-card-bottom">
          <span class="flip-char-current"></span>
        </div>
        <div class="flip-card-flap-top">
          <span class="flip-char-next"></span>
        </div>
        <div class="flip-card-flap-bottom">
          <span class="flip-char-next"></span>
        </div>
      </div>
    `;

    return card;
  }

  // Set character on a card (no animation)
  function setCardChar(card, char) {
    const currentSpans = card.querySelectorAll(".flip-char-current");
    currentSpans.forEach((span) => (span.textContent = char));
    card.dataset.char = char;
  }

  // Animate flip from current to next character
  function flipCard(card, fromChar, toChar) {
    return new Promise((resolve) => {
      if (fromChar === toChar || reducedMotion) {
        setCardChar(card, toChar);
        resolve();
        return;
      }

      const inner = card.querySelector(".flip-card-inner");
      const currentSpans = card.querySelectorAll(".flip-char-current");
      const nextSpans = card.querySelectorAll(".flip-char-next");

      // Set current and next characters
      currentSpans.forEach((span) => (span.textContent = fromChar));
      nextSpans.forEach((span) => (span.textContent = toChar));

      // Add flipping class to trigger animation
      inner.classList.add("flipping");

      setTimeout(() => {
        inner.classList.remove("flipping");
        setCardChar(card, toChar);
        resolve();
      }, FLIP_DURATION);
    });
  }

  // Calculate columns so full grid fits: columns * cardWidth + (columns - 1) * gap <= width
  function getCardWidth() {
    const computedStyle = getComputedStyle(container);
    const widthValue = parseFloat(computedStyle.getPropertyValue("--card-width"));
    return Number.isFinite(widthValue) ? widthValue : DEFAULT_CARD_WIDTH;
  }

  function calculateColumns() {
    const containerWidth = container.clientWidth || window.innerWidth;
    const cardWidth = getCardWidth();
    const widthPerColumn = cardWidth + CARD_GAP;
    return Math.max(
      1,
      Math.floor((containerWidth + CARD_GAP) / widthPerColumn)
    );
  }

  // Build the grid of flip cards
  function buildGrid() {
    columns = calculateColumns();
    const totalCells = columns * ROWS;

    container.innerHTML = "";
    container.style.setProperty("--columns", columns);
    container.style.setProperty("--flip-duration", `${FLIP_DURATION}ms`);

    cells = [];
    for (let i = 0; i < totalCells; i++) {
      const card = createFlipCard(i);
      setCardChar(card, " ");
      container.appendChild(card);
      cells.push(card);
    }

    currentGrid = new Array(totalCells).fill(" ");
  }

  // Flip all cards from currentGrid to nextGrid with random order
  async function flipToNextGrid() {
    if (isAnimating) return;
    isAnimating = true;

    const indices = shuffle([...Array(cells.length).keys()]);
    const flipPromises = [];

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const fromChar = currentGrid[idx];
      const toChar = nextGrid[idx];

      // Random stagger delay
      const delay = Math.random() * FLIP_STAGGER_MAX;

      flipPromises.push(
        new Promise((resolve) => {
          setTimeout(async () => {
            await flipCard(cells[idx], fromChar, toChar);
            resolve();
          }, delay);
        })
      );
    }

    await Promise.all(flipPromises);

    // Update current grid
    currentGrid = [...nextGrid];
    isAnimating = false;
  }

  // Main animation loop
  async function runLoop() {
    while (true) {
      // Prepare next set
      nextGrid = packWords(words, columns, ROWS);

      // Flip to next set
      await flipToNextGrid();

      // Wait before preparing next
      await new Promise((resolve) => setTimeout(resolve, DISPLAY_DURATION));
    }
  }

  // Load words from tech-bits.json
  async function loadWords() {
    try {
      let response;
      try {
        response = await fetch("./content/tech-bits.json");
      } catch (e) {
        response = await fetch("./content/tech-bits.json");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      words = data.filter((w) => typeof w === "string" && w.length > 0);

      if (words.length === 0) {
        console.warn("No words loaded from tech-bits.json");
        words = ["HELLO", "WORLD"];
      }
    } catch (error) {
      console.error("Failed to load tech bits:", error);
      words = ["HELLO", "WORLD"];
    }
  }

  // Start the board when in view
  function setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            hasStarted = true;
            runLoop();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
  }

  // Handle resize
  function handleResize() {
    const newColumns = calculateColumns();
    if (newColumns !== columns) {
      columns = newColumns;
      buildGrid();
      // If already started, flip to a new set
      if (hasStarted && !isAnimating) {
        nextGrid = packWords(words, columns, ROWS);
        flipToNextGrid();
      }
    }
  }

  // Initialize
  async function init() {
    await loadWords();
    buildGrid();
    setupIntersectionObserver();

    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    });

    // Handle reduced motion changes
    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", (e) => {
        reducedMotion = e.matches;
      });
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
