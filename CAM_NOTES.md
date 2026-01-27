# Tech Cloud Layout Logic

## Overview
The tech cloud uses a deterministic layout algorithm to place tokens in a free-form, organic-looking arrangement that remains stable across page refreshes.

## Step-by-Step Process

### 1. Token Sizing & Measurement
- Each token from `content/tech-bits.json` has a `size` property (e.g., `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`)
- The script maps these to CSS `--text-*` tokens
- Text dimensions are measured using an offscreen canvas with the same font family
- Tokens are sorted by `sizeRank` (largest first) so big words don't get trapped behind smaller ones

### 2. Deterministic Position Generation
- **No randomness**: Uses hash-based seeding for reproducibility
- **Hash function**: FNV1a hash of each token's text string
- **Base position**: Halton sequence (bases 2 and 3) provides well-distributed initial coordinates
- **Jitter**: Small offsets derived from the hash create organic spread:
  - `jitterX = (hashToUnit(hash + 17) - 0.5) * origin`
  - `jitterY = (hashToUnit(hash + 29) - 0.5) * origin`
  - `startAngle = hashToUnit(hash + 43) * Math.PI * 2`

### 3. Collision Detection & Resolution
- For each token, attempts up to 520 spiral steps using the golden angle (2.399963229728653)
- Each candidate position is:
  - Clamped to stay within padded container bounds
  - Checked against all previously placed tokens
  - Uses a configurable `gap` buffer to prevent overlaps
- If no valid position found in spiral, falls back to best clamped position

### 4. Dynamic Spacing
- Padding and gap scale with container size:
  - `pad = min(max(width, height) * 0.08, 60)`
  - `gap = min(max(width, height) * 0.02, 18)`
- Prevents overlap when container is larger
- Maintains spacing on smaller screens

### 5. Responsive Reflow
- On window resize, the same deterministic algorithm runs again
- Same hash seeds = same relative positions
- Layout adapts to new container dimensions without randomness

## Debugging Tips

- Inspect token properties in console: `w`, `h`, `hash`, `left`, `top`
- Check collision detection: temporarily log `intersects()` results
- Adjust spacing: modify `pad`, `gap`, or spiral step count/radius
- Verify measurements: ensure canvas font matches rendered font

## Key Functions

- `hashString()`: Generates deterministic hash from text
- `halton()`: Low-discrepancy sequence for base positions
- `measureText()`: Canvas-based text dimension measurement
- `intersects()`: Collision detection between bounding boxes
- `layoutTechCloud()`: Main layout orchestrator

---

## Fibonacci spiral tech cloud – increasing overall size

To make the spiral text larger and easier to read:

1. **Text size** – In `style.css`, bump the `:root` text tokens:
   - `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`, `--text-4xl`, `--text-5xl`
   - Example: `--text-sm: 1rem;` `--text-base: 1.2rem;` … up to `--text-5xl: 5rem;` (or higher).

2. **Canvas / container size** – In `style.css`:
   - `.tech-cloud { min-height: 800px; }` (or more) to give the spiral more room.
   - `.content-section { max-width: 1400px; }` if you want a wider section.

3. **Spiral scale** – In `script/tech-cloud.js`, inside `getSpiralPoint()`:
   - Change `const a = minDimension * 0.05;` to e.g. `0.07` or `0.1` so the spiral starts farther out and words sit in a larger ring.

4. **User zoom** – Use the new **−** and **+** buttons (top-left of the tech cloud) to zoom out/in; default zoom is 1.25×.
