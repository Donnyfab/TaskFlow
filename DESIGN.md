---
name: TaskFlow
description: A precise personal life OS for accountable planning, output, and reflection.
colors:
  canvas-dark: "#0A0A0A"
  canvas-ink: "#0D0D0D"
  surface-dark: "#111111"
  surface-raised: "#141414"
  surface-panel: "#1A1A1A"
  border-dark: "#242424"
  border-strong: "#333333"
  text-primary: "#EFEFEF"
  text-inverse: "#111111"
  text-muted: "#888888"
  text-dim: "#555555"
  accent-amber: "#E8A838"
  action-light: "#FFFFFF"
  danger: "#C25B54"
  success: "#74A574"
  canvas-light: "#F9F9F7"
  surface-light: "#FFFFFF"
  surface-light-raised: "#F2F2F0"
  border-light: "#E6E6E4"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 650
    lineHeight: 1.24
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.045em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 580
    lineHeight: 1.42
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.09em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "30px"
  page-x: "36px"
components:
  button-primary:
    backgroundColor: "{colors.action-light}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
    height: "38px"
    typography: "{typography.body}"
  button-secondary:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
    height: "38px"
    typography: "{typography.body}"
  card-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "11px 12px"
---

# Design System: TaskFlow

## 1. Overview

**Creative North Star: "The Command Ledger"**

TaskFlow should feel like a compact operating surface for people who already know what they are trying to improve. The visual language is restrained, dark, and precise: black canvas, near-black panels, fine borders, compact type, and state changes that happen quickly enough to stay out of the user's way.

The system rejects motivational theater. It should not look like Notion's soft minimalism, Todoist's chirpy productivity, pastel gamification, startup pink-and-blue gradients, gradient text, glowing cards, confetti-like streaks, or bouncy encouragement loops. Visual distinction is earned through hierarchy, spacing, opacity, and rare semantic accent use.

**Key Characteristics:**
- Dark monochromatic product shell with light-mode support on select task surfaces.
- System/SF typography for speed, density, and native product trust.
- Thin borders and tonal layers instead of decorative shadows.
- Amber appears only for meaningful semantic moments, especially achievement or AI-origin cues.
- Motion is brief and functional, never expressive for its own sake.

## 2. Colors

The palette is almost entirely neutral: a black-to-charcoal system with off-white text and one reserved amber signal.

### Primary
- **Command Black** (#0A0A0A): The default app and landing canvas. It should feel quiet and serious, not theatrical.
- **Paper White Action** (#FFFFFF): Primary action fill on dark surfaces and high-emphasis inverse content.
- **Accountability Amber** (#E8A838): Reserved for achievement, completion, and AI-origin emphasis. Keep it rare enough to retain meaning.

### Secondary
- **Completion Green** (#74A574): Success or kept-commitment state in the Forge product surface.
- **Consequence Red** (#C25B54): Error, danger, missed-commitment, or destructive-action state.

### Neutral
- **Surface Black** (#111111): Sidebar, mobile sheets, policy cards, and secondary panels.
- **Raised Charcoal** (#141414): Product panels that need separation on the dark canvas.
- **Panel Charcoal** (#1A1A1A): Higher tonal layer for sheets, loading blocks, and compact overlays.
- **Steel Border** (#242424): Default dark-mode divider and card border.
- **Strong Border** (#333333): Focus, hover, or higher-emphasis border on dark surfaces.
- **Primary Text** (#EFEFEF): Main copy on dark surfaces.
- **Muted Text** (#888888): Secondary metadata, helper copy, and inactive navigation.
- **Dim Text** (#555555): Disabled, placeholder, skeleton-adjacent, or low-emphasis text.
- **Light Canvas** (#F9F9F7): Light-mode Forge canvas and utility task surfaces.
- **Light Surface** (#FFFFFF): Light-mode form and panel surface.
- **Light Raised** (#F2F2F0): Light-mode raised stat cards and quiet panels.
- **Light Border** (#E6E6E4): Light-mode dividers.

### Named Rules

**The Rare Amber Rule.** Amber must not become decoration. Use it for completion, AI-sourced content, or a genuinely meaningful state, and keep it below roughly 5-10% of any screen.

**The Monochrome First Rule.** If hierarchy can be solved with weight, size, opacity, spacing, or a border, do that before adding color.

## 3. Typography

**Display Font:** System/SF stack with Segoe UI and system-ui fallback.
**Body Font:** System/SF stack with Helvetica Neue fallback.
**Label/Mono Font:** No dedicated mono role is established.

**Character:** Typography is native, compact, and work-focused. The system favors a tight product scale over expressive display typography; headings are confident but not oversized.

### Hierarchy
- **Display** (650, 1.875rem, 1.24): Page-level product headings and mission titles. Keep letter spacing tight but readable.
- **Headline** (700, 1.625rem, 1): Numeric stats and high-emphasis dashboard values, with tabular numerals when values need comparison.
- **Title** (580, 1.1875rem, 1.42): Card titles, commitment titles, and compact section names.
- **Body** (400, 0.875rem, 1.6): Main prose, descriptions, and form content. Keep long prose around 65-75ch.
- **Label** (700, 0.6875rem, 0.09em): Short metadata labels and overline-style markers. Use sparingly; do not put an eyebrow above every section.

### Named Rules

**The Native Product Type Rule.** Use system/SF typography for authenticated product UI. Inter and Syne exist in older marketing surfaces, but product screens should prioritize native density and clarity.

**The Label Restraint Rule.** Uppercase labels are for compact metadata, not decorative cadence. If a label repeats what the user already sees, remove it.

## 4. Elevation

TaskFlow is flat by default. Depth comes from tonal layers, one-pixel borders, sticky headers with backdrop blur, and modest structural shadows only for overlays or mobile sheets. Product cards should not look like floating marketing cards.

### Shadow Vocabulary
- **Overlay Deep** (`0 14px 34px rgba(0,0,0,0.38)`): Profile dropdowns and anchored menus on dark surfaces.
- **Mobile Sheet** (`0 12px 28px rgba(0,0,0,0.22)`): Mobile navigation trigger or sheet elements that need physical separation.
- **Modal Deep** (`0 18px 40px rgba(0,0,0,0.38)`): Full-screen mobile panel or temporary overlay.

### Named Rules

**The Flat-By-Default Rule.** Resting product surfaces use borders and tonal contrast. Shadows are reserved for overlays, temporary sheets, or hover/focus states that need physical stacking.

## 5. Components

### Buttons

- **Shape:** Compact rounded rectangle, usually 8px radius with a 38px minimum height.
- **Primary:** In dark mode, primary actions use white fill with near-black text, or product-surface inverse tokens (`var(--button)` / `var(--button-text)`). Padding is typically 9px 16px.
- **Hover / Focus:** Hover changes background or border within 140-180ms. Focus should strengthen the border or add a clear ring without glow-heavy decoration.
- **Secondary / Ghost:** Transparent or tonal backgrounds with one-pixel borders. Ghost nav actions use low-opacity white overlays on hover.

### Chips

- **Style:** Pill or compact rounded markers, usually 999px for badges and 6-8px for functional chips.
- **State:** Selected or active chips should shift text contrast and background opacity; avoid saturated fills for inactive states.

### Cards / Containers

- **Corner Style:** Product cards use 10-12px radii; marketing and policy cards can reach 16-18px.
- **Background:** Dark product surfaces use #111111, #141414, or #1A1A1A. Light product surfaces use #FFFFFF or #F2F2F0.
- **Shadow Strategy:** Flat by default. Use overlays from the Elevation section only when the component actually floats.
- **Border:** One-pixel borders are part of the component grammar. Use #242424 / #333333 in dark mode and #E6E6E4 / #D0D0CE in light mode.
- **Internal Padding:** Compact product cards use 16px; larger form or commitment cards use 20px.

### Inputs / Fields

- **Style:** 8px radius, one-pixel border, tonal surface background, and 11px 12px internal padding.
- **Focus:** Border strengthens from default to strong border. Avoid blue browser-default focus styling; provide a visible system-consistent state.
- **Error / Disabled:** Error text uses consequence red. Disabled states reduce opacity to roughly 45% and keep cursor/default behavior honest.

### Navigation

- **Style:** Sidebar navigation is compact, 200px wide when expanded, with 14px labels and muted inactive text.
- **Active State:** Active links use brighter text and a thin active line in the current implementation. Keep active states precise and quiet.
- **Hover State:** Low-opacity neutral overlays, around rgba(255,255,255,0.035-0.06) in dark mode.
- **Mobile Treatment:** Mobile navigation uses sticky top bars and sheets, with backdrop blur and structural shadows only where needed.

### Forge Product Surface

Forge is the most resolved product vocabulary in the current codebase. It defines the preferred authenticated UI language: constrained content width, sticky header, compact labels, thin rules, stat grids, flat tonal cards, skeleton blocks, and reduced-motion fallbacks.

## 6. Do's and Don'ts

### Do:

- **Do** keep TaskFlow in a command-center posture: dark, compact, precise, and accountable.
- **Do** use #0A0A0A, #111111, #141414, #242424, #EFEFEF, #888888, and #555555 as the core dark product scale.
- **Do** reserve #E8A838 for completion, achievement, or AI-origin signals; pair it with structure or labels rather than color alone.
- **Do** use one-pixel borders, tonal layers, and restrained opacity changes before adding decorative color or shadows.
- **Do** include default, hover, focus, active, disabled, loading, and error states for interactive components.
- **Do** preserve reduced-motion alternatives; state transitions should be functional and fast.

### Don't:

- **Don't** make TaskFlow look like Notion's soft minimalism, Todoist's chirpy productivity, pastel gamification, startup pink-and-blue gradients, or glowing SaaS cards.
- **Don't** use gradient text.
- **Don't** use confetti-like streaks, bouncy encouragement loops, or motion that celebrates rather than orients.
- **Don't** use cards inside cards or decorative card grids as a default layout answer.
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe.
- **Don't** let amber become a generic brand color. Its rarity is the signal.
