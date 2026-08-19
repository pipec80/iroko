# Design System Documentation

## 1. Overview & Creative North Star: "The Precision Curator"

This design system is built to transform the often-cluttered world of Fintech and Retail Analytics into a high-end editorial experience. We are moving away from the "generic SaaS dashboard" look of heavy borders and flat grey boxes. Instead, our Creative North Star is **The Precision Curator**.

The aesthetic is "Clean & Solid," utilizing the warmth of a paper-like background (`#FBF9F1`) contrasted against sharp, technical data visualization. We achieve a premium feel through **Intentional Asymmetry**—where large, bold headlines provide a narrative for the high-density technical data below. The layout should feel like a well-composed financial journal: authoritative, breathable, and unapologetically professional.

---

## 2. Colors & Surface Architecture

The palette avoids the sterile whites of typical software. We use tonal depth to guide the user's eye rather than structural lines.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to section off content. Boundaries between the sidebar, header, and main content must be defined solely by background color shifts. 
*   *Example:* A `surface_container_low` sidebar sitting directly against a `surface` background.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked physical materials. Use the following hierarchy to create depth:
1.  **Base Layer:** `surface` (#fdf9f2) - The canvas.
2.  **Sectioning:** `surface_container_low` (#f7f3ec) - Used for large background areas like sidebars or secondary content zones.
3.  **Component Level:** `surface_container_highest` (#e6e2db) - Used for bento-style KPI cards and interactive surfaces.
4.  **Interactive Floating:** `surface_container_lowest` (#ffffff) - Reserved for elements that need to "pop" off the page, such as active input fields or dropdown menus.

### The "Glass & Gradient" Rule
To prevent the UI from feeling "flat," use subtle gradients on primary CTAs (transitioning from `primary` to `primary_container`). For floating overlays or modals, utilize **Glassmorphism**: 
*   **Fill:** `surface_variant` at 70% opacity.
*   **Effect:** Backdrop blur of 12px–20px. This allows the sophisticated background tones to bleed through, softening the interface.

---

## 3. Typography: The Editorial Contrast

This system relies on the interplay between a humanist Sans-Serif and a rigorous Monospace.

*   **Plus Jakarta Sans (The Voice):** Used for all UI labels, navigation, and headlines. It provides a modern, approachable feel that de-escalates the complexity of financial data.
*   **IBM Plex Mono (The Logic):** Used exclusively for numerical values, SKUs, timestamps, and data grid content. This font choice signals technical precision and ensures that columns of numbers align perfectly for easy scanning.

**Hierarchy Strategy:**
- **Display-LG/MD:** Use for high-level summary "Stories" (e.g., "Your revenue is up 12%").
- **Label-SM:** Use for data headers in grids, always in All-Caps with +0.05em letter spacing to ensure authority.

---

## 4. Elevation & Depth: Tonal Layering

We do not use elevation to "lift" objects; we use it to "layer" information.

### The Layering Principle
Depth is achieved by stacking surface tiers. Place a `surface_container_lowest` card on top of a `surface_container_highest` background to create a soft, natural lift.

### Ambient Shadows
Shadows should feel like natural ambient light, not digital drops. 
*   **Specs:** Blur: 24px–48px | Opacity: 4%–6% | Color: Derived from `on_surface` (a warm, dark tint). 
*   Avoid pure black (#000000) shadows at all costs.

### The "Ghost Border" Fallback
If a visual separator is mandatory for accessibility, use a **Ghost Border**:
*   **Stroke:** 1px.
*   **Color:** `outline_variant` at 15% opacity. 
*   This creates a "suggestion" of a boundary without breaking the editorial flow.

---

## 5. Components

### Bento KPI Cards
*   **Background:** `surface_container_highest`.
*   **Corner Radius:** `xl` (0.75rem).
*   **Padding:** 24px internal spacing.
*   **Constraint:** No borders. Use `IBM Plex Mono` for the primary metric.

### Buttons
*   **Primary:** Gradient from `primary` (#31666d) to `primary_container` (#92c7cf). Text: `on_primary`. Radius: `md`.
*   **Secondary:** Ghost style. No background fill, only a `Ghost Border` on hover. Text: `primary`.
*   **Tertiary:** Text-only with an underline on hover. Use for low-priority actions.

### High-Density Data Grids
*   **Row Separation:** Forbid divider lines. Use "Zebra Stripping" using `surface_container_low` on even rows.
*   **Typography:** All cell data must be `IBM Plex Mono` for tabular alignment.
*   **Header:** `surface_container_high` background with `label-md` text.

### Input Fields
*   **Background:** `surface_container_lowest`.
*   **Border:** `outline_variant` at 20% opacity.
*   **Active State:** Border shifts to `primary` (1px) with a subtle 4px `primary_fixed` outer glow.

### Chips (Filters/Selection)
*   **Style:** Pill-shaped (`full` roundedness).
*   **Unselected:** `surface_container_highest` background, `on_surface_variant` text.
*   **Selected:** `primary` background, `on_primary` text.

---

## 6. Do's and Don'ts

### Do
*   **Do** use whitespace as a separator. If you think you need a line, try adding 16px of padding instead.
*   **Do** lean into the "Warmth." Ensure the `#FBF9F1` background is the dominant color to maintain the retail-luxury feel.
*   **Do** use `IBM Plex Mono` for any value that can be calculated. It reinforces the "Fintech" expertise of the platform.

### Don't
*   **Don't** use 100% opaque borders. They clutter the high-density grid and make the UI look "cheap."
*   **Don't** use standard blue for links. Use the `primary` teal (#31666d) to maintain the custom brand identity.
*   **Don't** overcrowd the Bento cards. Each card should focus on one primary insight and two supporting metrics maximum.
*   **Don't** use drop shadows on buttons. Let the gradient provide the depth.