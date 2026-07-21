# VoiceAgent — Complete UI Design Reference

> **For CLI agent / AI builder use.** This is the single source of truth for every page, component, state, transition, animation, micro-interaction, error state, and API integration point in the VoiceAgent frontend. Read it fully before generating any code. All decisions here are binding.

---

## Quick-read summary

| Stack     | Value                                        |
| --------- | -------------------------------------------- |
| Framework | React 18+ with Vite                          |
| Styling   | Tailwind CSS v4 + CSS custom properties      |
| Fonts     | Inter (body) + JetBrains Mono (labels/code)  |
| Voice SDK | `livekit-client`                             |
| State     | Zustand or React Context                     |
| HTTP      | Axios with interceptor for JWT               |
| Theme     | Dark mode only. Deep space palette.          |
| Mood      | Premium, technical, alive. Not SaaS-generic. |

---

## Table of Contents

1. [Design Token System](#1-design-token-system)
2. [Typography System](#2-typography-system)
3. [Animation & Motion Library](#3-animation--motion-library)
4. [Background System](#4-background-system)
5. [Component Library](#5-component-library)
6. [Page: Auth (Sign-up / Sign-in)](#6-page-auth-sign-up--sign-in)
7. [Page: Dashboard](#7-page-dashboard)
8. [Page: Voice Room (Active Session)](#8-page-voice-room-active-session)
9. [Page: Session History](#9-page-session-history)
10. [Page: Settings](#10-page-settings)
11. [Connection State Machine](#11-connection-state-machine)
12. [Complete Event → UI Mapping](#12-complete-event--ui-mapping)
13. [Page Transition System](#13-page-transition-system)
14. [Micro-interaction Catalog](#14-micro-interaction-catalog)
15. [Error State Handling](#15-error-state-handling)
16. [API Integration Points](#16-api-integration-points)
17. [Responsive Rules](#17-responsive-rules)
18. [Implementation Notes](#18-implementation-notes)

---

## 1. Design Token System

Define all tokens as CSS custom properties in `src/styles/theme.css`. Import this file in `src/main.tsx` before any component.

```css
:root {
  /* ─── Backgrounds ─────────────────────────────────────────── */
  --bg-page: #080b12; /* Root body. Deepest layer. Never use black. */
  --bg-surface: #0d1018; /* Cards, sidebars, modals. Second layer. */
  --bg-elevated: #161b27; /* Dropdowns, tooltips, popovers. Third layer. */
  --bg-input: #060912; /* All text inputs. Darker than surface. */
  --bg-overlay: rgba(4, 6, 14, 0.85); /* Modal backdrop. */

  /* ─── Text ────────────────────────────────────────────────── */
  --text-primary: #f0f4ff; /* Headings, key values. */
  --text-secondary: #e2e8f0; /* Body copy, standard labels. */
  --text-muted: #7a8aa0; /* Captions, hints, timestamps. */
  --text-ghost: #2d3748; /* Version labels, disabled text. */
  --text-placeholder: #4a5568; /* Input placeholder text. */

  /* ─── Brand / Accent ──────────────────────────────────────── */
  --blue: #3b82f6;
  --indigo: #6366f1;
  --violet: #a855f7;
  --blue-dim: rgba(59, 130, 246, 0.15);
  --indigo-dim: rgba(99, 102, 241, 0.12);
  --violet-dim: rgba(168, 85, 247, 0.12);

  --gradient-brand: linear-gradient(
    135deg,
    #3b82f6 0%,
    #6366f1 50%,
    #8b5cf6 100%
  );
  --gradient-text: linear-gradient(135deg, #3b82f6, #a855f7);
  --gradient-mesh:
    radial-gradient(
      ellipse at top left,
      rgba(59, 130, 246, 0.12) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at bottom right,
      rgba(168, 85, 247, 0.1) 0%,
      transparent 50%
    );

  /* ─── Status ──────────────────────────────────────────────── */
  --status-idle: #4a5568; /* Gray  */
  --status-warn: #f59e0b; /* Amber — connecting / warming up */
  --status-live: #22c55e; /* Green — connected and live */
  --status-error: #ef4444; /* Red   — failure state */
  --status-speaking: #6366f1; /* Indigo — agent speaking */
  --status-listening: #3b82f6; /* Blue  — user speaking */

  /* ─── Borders ─────────────────────────────────────────────── */
  --border-faint: rgba(99, 102, 241, 0.08);
  --border-subtle: rgba(99, 102, 241, 0.14);
  --border-default: rgba(99, 102, 241, 0.2);
  --border-hover: rgba(99, 102, 241, 0.38);
  --border-focus: rgba(99, 102, 241, 0.65);
  --border-error: rgba(239, 68, 68, 0.55);

  /* ─── Shadows ─────────────────────────────────────────────── */
  --shadow-card:
    0 48px 96px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.035) inset;
  --shadow-panel: 0 16px 48px rgba(0, 0, 0, 0.45);
  --shadow-focus:
    0 0 0 3px rgba(99, 102, 241, 0.18),
    0 0 24px rgba(99, 102, 241, 0.1);
  --shadow-focus-err: 0 0 0 3px rgba(239, 68, 68, 0.18);
  --shadow-glow-blue: 0 0 40px rgba(59, 130, 246, 0.3);
  --shadow-glow-indigo: 0 0 48px rgba(99, 102, 241, 0.35);
  --shadow-glow-violet: 0 0 40px rgba(168, 85, 247, 0.28);
  --shadow-orb-live:
    0 0 80px rgba(99, 102, 241, 0.55),
    0 0 160px rgba(59, 130, 246, 0.22);
  --shadow-orb-speak:
    0 0 100px rgba(99, 102, 241, 0.65),
    0 0 200px rgba(168, 85, 247, 0.25);
  --shadow-btn-primary: 0 8px 32px rgba(99, 102, 241, 0.5);
  --shadow-btn-danger: 0 8px 24px rgba(239, 68, 68, 0.42);

  /* ─── Radii ───────────────────────────────────────────────── */
  --r-xs: 6px;
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --r-xl: 20px;
  --r-2xl: 24px;
  --r-pill: 100px;
  --r-full: 50%;

  /* ─── Spacing (4px base) ──────────────────────────────────── */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-10: 40px;
  --sp-12: 48px;
  --sp-16: 64px;
  --sp-20: 80px;

  /* ─── Z-index layers ──────────────────────────────────────── */
  --z-base: 0;
  --z-nebula: 1;
  --z-content: 10;
  --z-sticky: 100;
  --z-modal: 1000;
  --z-toast: 2000;
}
```

### Glass surface mixin

Use this on every card, modal, and panel. Never use solid backgrounds on layered surfaces.

```css
.glass {
  background: rgba(10, 14, 26, 0.82);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-card);
}

/* Lighter glass for nested elements inside cards */
.glass-inner {
  background: rgba(6, 9, 18, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-faint);
}
```

---

## 2. Typography System

### Font loading

This line must be **the absolute first line** of `src/styles/global.css` — before `@import 'tailwindcss'` and every other rule. PostCSS will reject @import rules that come after non-@import rules.

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap");
@import "tailwindcss";
```

### Font assignment

```css
body {
  font-family: "Inter", "Segoe UI", sans-serif;
}
.font-mono {
  font-family: "JetBrains Mono", "Fira Code", monospace;
}
```

### Type scale

| Role              | Family         | Size         | Weight | Line-height | Letter-spacing | Color token          |
| ----------------- | -------------- | ------------ | ------ | ----------- | -------------- | -------------------- |
| Display / Hero    | Inter          | 2.4–3.2rem   | 700    | 1.05        | -0.04em        | shimmer gradient     |
| Page title        | Inter          | 1.8–2.2rem   | 700    | 1.1         | -0.03em        | `--text-primary`     |
| Section heading   | Inter          | 1.2–1.4rem   | 600    | 1.2         | -0.02em        | `--text-primary`     |
| Card heading      | Inter          | 1rem         | 600    | 1.3         | -0.01em        | `--text-primary`     |
| Body copy         | Inter          | 0.9–1rem     | 400    | 1.6         | 0              | `--text-secondary`   |
| Label (caps)      | JetBrains Mono | 0.65–0.75rem | 600    | 1.4         | +0.08em        | `--text-muted`       |
| Input text        | Inter          | 0.9rem       | 400    | 1           | 0              | `--text-primary`     |
| Placeholder       | Inter          | 0.9rem       | 400    | 1           | 0              | `--text-placeholder` |
| Timestamp         | JetBrains Mono | 0.65rem      | 400    | 1           | +0.03em        | `--text-ghost`       |
| Badge / pill text | JetBrains Mono | 0.7rem       | 600    | 1           | +0.05em        | contextual           |
| Button            | Inter          | 0.9rem       | 600    | 1           | +0.02em        | white or contextual  |
| Version string    | JetBrains Mono | 0.65rem      | 400    | 1           | +0.08em        | `--text-ghost`       |

### Shimmer heading (display headings only)

```css
.shimmer {
  background: linear-gradient(
    90deg,
    #f0f4ff 0%,
    #a5b4fc 22%,
    #f0f4ff 45%,
    #c4b5fd 68%,
    #f0f4ff 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 4s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: -200% center;
  }
  to {
    background-position: 200% center;
  }
}
```

### Gradient text (section labels, CTAs)

```css
.gradient-text {
  background: var(--gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 3. Animation & Motion Library

### Easing tokens

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1); /* entering elements */
--ease-in: cubic-bezier(0.4, 0, 1, 1); /* leaving elements */
--ease-inout: cubic-bezier(0.4, 0, 0.2, 1); /* state changes */
--ease-spring: cubic-bezier(
  0.34,
  1.56,
  0.64,
  1
); /* bouncy feedback */
```

### Duration tokens

```
--t-instant:  80ms    → color swaps, icon changes
--t-fast:    150ms    → hover states, border changes
--t-normal:  250ms    → tab switches, panel reveals
--t-slow:    380ms    → page entrance, modal open
--t-crawl:   550ms    → full-page transitions
```

### Complete keyframe library

Paste all of these into `src/styles/animations.css` and import it globally.

```css
/* ── Entrance / Exit ──────────────────────────────────────── */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fade-down {
  from {
    opacity: 0;
    transform: translateY(-18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slide-right {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes slide-left {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes scale-bounce {
  from {
    opacity: 0;
    transform: scale(0.88);
  }
  60% {
    transform: scale(1.03);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ── Orb & ambient ────────────────────────────────────────── */
@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes orb-spin-ccw {
  to {
    transform: rotate(-360deg);
  }
}
@keyframes orb-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.55;
  }
  50% {
    transform: scale(1.06);
    opacity: 0.92;
  }
}
@keyframes orb-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.038);
  }
}
@keyframes orb-error-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}
@keyframes ripple-out {
  from {
    transform: scale(1);
    opacity: 0.6;
  }
  to {
    transform: scale(1.75);
    opacity: 0;
  }
}
@keyframes connecting-sweep {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ── Audio bars ───────────────────────────────────────────── */
@keyframes bar-bounce {
  0%,
  100% {
    transform: scaleY(0.16);
  }
  50% {
    transform: scaleY(1);
  }
}
@keyframes bar-idle {
  0%,
  100% {
    transform: scaleY(0.2);
  }
  50% {
    transform: scaleY(0.35);
  }
}

/* ── Status indicators ────────────────────────────────────── */
@keyframes dot-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 currentColor;
  }
  50% {
    opacity: 0.4;
    box-shadow: 0 0 8px 2px transparent;
  }
}
@keyframes dot-ping {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* ── Background ───────────────────────────────────────────── */
@keyframes nebula-breathe {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(1.06);
  }
}
@keyframes particle-drift {
  0%,
  100% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0.2;
  }
  33% {
    transform: translateY(-28px) translateX(14px) scale(1.3);
    opacity: 0.72;
  }
  66% {
    transform: translateY(12px) translateX(-10px) scale(0.8);
    opacity: 0.44;
  }
}

/* ── Text / content ───────────────────────────────────────── */
@keyframes shimmer {
  from {
    background-position: -200% center;
  }
  to {
    background-position: 200% center;
  }
}
@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
@keyframes typewriter-reveal {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

/* ── Transcript bubbles ───────────────────────────────────── */
@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── Toast notifications ──────────────────────────────────── */
@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes toast-exit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.96);
  }
}

/* ── Pipeline connector ───────────────────────────────────── */
@keyframes dash-flow {
  from {
    stroke-dashoffset: 40;
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 0.3;
  }
}

/* ── Loading states ───────────────────────────────────────── */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes skeleton-sweep {
  from {
    background-position: -200% 0;
  }
  to {
    background-position: 200% 0;
  }
}
@keyframes progress-fill {
  from {
    width: 0%;
  }
  to {
    width: 80%;
  }
}

/* ── Input error ──────────────────────────────────────────── */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-5px);
  }
  40% {
    transform: translateX(5px);
  }
  60% {
    transform: translateX(-3px);
  }
  80% {
    transform: translateX(3px);
  }
}
```

---

## 4. Background System

Every page shares this same layered background. Intensity of nebula glows varies per page context.

### Layer stack (back to front)

```
Layer 1: --bg-page (#080b12) on <body>
Layer 2: <canvas> — static star field (120 random white dots, opacity 0.05–0.35, radius 0.2–1px)
Layer 3: Nebula glow divs — 3 positioned radial gradient circles
Layer 4: Floating particles — 12 small dots with particle-drift animation
Layer 5: Page content
```

### Nebula configuration per page

```
Auth page:
  Nebula A: top:-10% left:-5%   size:700px  color:rgba(59,130,246,0.12)  dur:8s
  Nebula B: bottom:-15% right:-10% size:800px color:rgba(168,85,247,0.10) dur:11s  delay:2s
  Nebula C: top:40% left:38%   size:500px  color:rgba(99,102,241,0.06)  dur:14s  delay:5s

Dashboard:
  Nebula A: top:-20% left:-10%  size:600px  color:rgba(59,130,246,0.08)  dur:12s
  Nebula B: bottom:-10% right:5% size:500px  color:rgba(99,102,241,0.07)  dur:15s  delay:4s
  (No Nebula C — calmer, more focused)

Voice Room (IDLE):
  Same as Auth page intensity.

Voice Room (CONNECTED):
  Nebula intensity scales up. opacity multiplier ×1.5 on all nebulas.

Voice Room (SPEAKING — agent):
  Add a 4th nebula centered behind the orb: rgba(99,102,241,0.18), 400px, 4s breathe cycle.

Voice Room (ERROR):
  Replace Nebula A with rgba(239,68,68,0.08). Dim others to 50%.
```

### Particle configuration

12 particles total. Spread across the page using percentage positions:

```javascript
const PARTICLES = [
  { x: 12, y: 18, size: 2,   color: 'indigo', dur: 5.5, delay: 0    },
  { x: 78, y: 8,  size: 1.5, color: 'blue',   dur: 7.0, delay: 0.8  },
  { x: 35, y: 72, size: 3,   color: 'violet', dur: 6.2, delay: 1.4  },
  { x: 90, y: 55, size: 1.5, color: 'blue',   dur: 8.0, delay: 0.2  },
  { x: 55, y: 85, size: 2.5, color: 'indigo', dur: 5.8, delay: 2.1  },
  { x: 5,  y: 45, size: 2,   color: 'violet', dur: 9.0, delay: 0.5  },
  { x: 68, y: 92, size: 1.5, color: 'blue',   dur: 6.5, delay: 1.7  },
  { x: 22, y: 38, size: 1,   color: 'indigo', dur: 7.5, delay: 3.2  },
  { x: 88, y: 28, size: 2,   color: 'violet', dur: 5.0, delay: 2.8  },
  { x: 47, y: 12, size: 1.5, color: 'blue',   dur: 8.5, delay: 0.9  },
  { x: 15, y: 82, size: 2,   color: 'indigo', dur: 6.8, delay: 1.2  },
  { x: 72, y: 65, size: 1,   color: 'violet', dur: 7.2, delay: 3.8  },
]
// color map: indigo=rgba(99,102,241,0.7)  blue=rgba(59,130,246,0.7)  violet=rgba(168,85,247,0.7)
```

---

## 5. Component Library

All components listed here are reusable and shared across pages.

---

### `<Button>`

```
Variants: primary | secondary | ghost | danger | icon-circle
Sizes:    sm (32px h) | md (40px h) | lg (48px h) | xl (56px h)
States:   default | hover | active/press | disabled | loading
```

**CSS per variant:**

```css
/* primary */
.btn-primary {
  background: var(--gradient-brand);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-weight: 600;
  letter-spacing: 0.02em;
  transition:
    box-shadow var(--t-fast),
    background-position var(--t-normal),
    transform var(--t-instant);
}
.btn-primary::before {
  /* sheen overlay */
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.14),
    transparent
  );
  border-radius: inherit;
  pointer-events: none;
}
.btn-primary:hover {
  box-shadow: var(--shadow-btn-primary);
  background-position: right center;
}
.btn-primary:active {
  transform: scale(0.97);
}
.btn-primary.loading {
  opacity: 0.75;
  cursor: wait;
}

/* secondary */
.btn-secondary {
  background: rgba(99, 102, 241, 0.1);
  color: var(--indigo);
  border: 1px solid var(--border-default);
  border-radius: var(--r-md);
}
.btn-secondary:hover {
  background: rgba(99, 102, 241, 0.18);
  border-color: var(--border-hover);
  color: #a5b4fc;
}

/* ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: none;
}
.btn-ghost:hover {
  color: var(--text-secondary);
  background: var(--indigo-dim);
}

/* danger */
.btn-danger {
  background: rgba(239, 68, 68, 0.12);
  color: var(--status-error);
  border: 1px solid rgba(239, 68, 68, 0.28);
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.22);
  box-shadow: var(--shadow-btn-danger);
}

/* icon-circle — used for mic, disconnect, volume controls */
.btn-icon-circle {
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--t-fast);
}
.btn-icon-circle:hover {
  border-color: var(--border-hover);
  background: var(--indigo-dim);
}
.btn-icon-circle:active {
  transform: scale(0.93);
}
/* active mute state */
.btn-icon-circle.muted {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
}

/* loading spinner inside any button */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
```

---

### `<Input>`

```
States: default | focus | error | disabled
With:   left icon (16px) | right action button (eye toggle)
```

```css
.input-field {
  height: 46px;
  padding: 0 16px 0 44px; /* 44px left = 14px gap + 16px icon */
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--r-md);
  color: var(--text-primary);
  font-family: "Inter", sans-serif;
  font-size: 0.9rem;
  outline: none;
  width: 100%;
  transition:
    border-color var(--t-fast),
    box-shadow var(--t-fast);
}
.input-field::placeholder {
  color: var(--text-placeholder);
}
.input-field:focus {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}
.input-field.error {
  border-color: var(--border-error);
  box-shadow: var(--shadow-focus-err);
  animation: shake 0.32s var(--ease-inout);
}
.input-field:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Left icon wrapper */
.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-placeholder);
  transition: color var(--t-fast);
  pointer-events: none;
}
/* Icon brightens on focus — parent must use :focus-within */
.input-wrapper:focus-within .input-icon {
  color: #7c85f5;
}
```

---

### `<StatusPill>`

Used in Voice Room top bar, dashboard session rows, history list.

```
States: IDLE | CONNECTING | WARMING_UP | CONNECTED | ERROR | SPEAKING | LISTENING
```

```css
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px 5px 9px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(currentColor, 0.25);
  background: rgba(currentColor, 0.08);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  user-select: none;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
```

| State        | Color var            | Dot animation                                   | Label            |
| ------------ | -------------------- | ----------------------------------------------- | ---------------- |
| `IDLE`       | `--status-idle`      | none                                            | `IDLE`           |
| `CONNECTING` | `--status-warn`      | `spin 1.2s linear infinite` (ring arc, not dot) | `CONNECTING...`  |
| `WARMING_UP` | `--status-warn`      | `dot-pulse 1s ease-in-out infinite`             | `WARMING UP`     |
| `CONNECTED`  | `--status-live`      | none — solid, crisp                             | `LIVE`           |
| `ERROR`      | `--status-error`     | none                                            | `ERROR`          |
| `SPEAKING`   | `--status-speaking`  | none                                            | `AGENT SPEAKING` |
| `LISTENING`  | `--status-listening` | none                                            | `LISTENING`      |

---

### `<Toast>`

```
Position: fixed; bottom: 24px; right: 24px; z-index: var(--z-toast)
Width: 340px max
Auto-dismiss: 4s for info/success, stays for error (requires manual close)
Stack: multiple toasts stack vertically with 8px gap
```

```css
.toast {
  width: 340px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  background: rgba(13, 17, 28, 0.94);
  backdrop-filter: blur(20px);
  border-left: 3px solid var(--toast-accent);
  border-top: 1px solid var(--border-subtle);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  animation: toast-enter 0.3s var(--ease-out) forwards;
}
.toast.exiting {
  animation: toast-exit 0.25s var(--ease-in) forwards;
}

/* Variant accents */
.toast.info {
  --toast-accent: var(--blue);
}
.toast.success {
  --toast-accent: var(--status-live);
}
.toast.warning {
  --toast-accent: var(--status-warn);
}
.toast.error {
  --toast-accent: var(--status-error);
}
```

Toast content: icon (16px) + title (0.85rem, 600) + optional message (0.8rem, muted) + optional close X button.

---

### `<TranscriptBubble>`

```
Props: role ('user' | 'agent'), text (string), timestamp (string), isTyping (bool)
```

```css
.bubble {
  padding: 12px 16px;
  border-radius: var(--r-md);
  border-left: 2px solid;
  animation: bubble-in 0.25s var(--ease-out);
  max-width: 100%;
  word-break: break-word;
  line-height: 1.55;
  font-size: 0.88rem;
}
.bubble.user {
  border-left-color: var(--status-live);
  background: rgba(34, 197, 94, 0.06);
  color: #86efac;
}
.bubble.agent {
  border-left-color: var(--indigo);
  background: rgba(99, 102, 241, 0.07);
  color: #a5b4fc;
}

/* Bubble header row: role label + timestamp */
.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.bubble-label {
  font-size: 0.72rem;
  font-weight: 600;
  font-family: "JetBrains Mono", mono;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.bubble.user .bubble-label {
  color: var(--status-live);
}
.bubble.agent .bubble-label {
  color: var(--indigo);
}
.bubble-ts {
  font-family: "JetBrains Mono", mono;
  font-size: 0.62rem;
  color: var(--text-ghost);
}

/* Typing indicator: 3 dots */
.typing-dots span {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  margin: 0 2px;
  animation: dot-pulse 1s ease-in-out infinite;
}
.typing-dots span:nth-child(2) {
  animation-delay: 0.18s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.36s;
}
```

---

### `<AudioVisualizer>`

7 bars. `transform-origin: bottom`. Heights guide when fully active: `[28, 40, 48, 36, 44, 32, 38]px`. Width: 3px, gap: 3px. Border-radius: 2px.

```css
.viz-bar {
  width: 3px;
  border-radius: 2px;
  transform-origin: bottom;
  transition: background 0.4s;
}
/* Modes */
.viz-bar.idle {
  animation: bar-idle 3.5s ease-in-out infinite;
  background: var(--text-ghost);
}
.viz-bar.listening {
  animation: bar-bounce 0.7s ease-in-out infinite;
  background: linear-gradient(to top, var(--blue), #60a5fa);
}
.viz-bar.speaking {
  animation: bar-bounce 0.85s ease-in-out infinite;
  background: linear-gradient(
    to top,
    var(--indigo),
    var(--violet)
  );
}
.viz-bar.warming {
  animation: bar-idle 2s ease-in-out infinite;
  background: linear-gradient(
    to top,
    var(--status-warn),
    #fcd34d
  );
}
```

Each bar gets a unique animation-delay staggered by `index × 0.08s` (listening mode) or `index × 0.12s` (speaking mode).

---

### `<SkeletonLoader>`

For dashboard stats and session list while data loads.

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 25%,
    rgba(99, 102, 241, 0.08) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-sweep 1.5s ease-in-out infinite;
  border-radius: var(--r-sm);
}
```

---

## 6. Page: Auth (Sign-up / Sign-in)

**Route:** `/` or `/auth`  
**No auth guard** — accessible without JWT.  
**Redirect:** If valid JWT exists in localStorage on mount, redirect to `/dashboard`.

### Layout specification

```
Viewport: 100vw × 100vh min
Display: flex, align-items: center, justify-content: center
Padding: 40px 24px
Gap between panels: 64px

LEFT PANEL:  flex:1  max-width:520px  flex-direction:column  align-items:center  gap:40px
RIGHT PANEL: width:440px  flex-shrink:0
```

```
┌───────────────────────────────────────────────────────────────────────────┐
│  [Background: stars + 3 nebulas + 12 particles]                           │
│                                                                            │
│  ┌─────────────────────────────────┐   ┌────────────────────────────────┐ │
│  │  LEFT PANEL                     │   │  RIGHT PANEL — glass card      │ │
│  │                                 │   │  440px wide, border-r: 24px    │ │
│  │  [tech-stack badge]             │   │  padding: 44px 40px            │ │
│  │  ● LiveKit · Pipecat · LangGraph│   │                                │ │
│  │                                 │   │  ┌──────────────────────────┐  │ │
│  │  [animated orb — 280px diam]    │   │  │ [logo mark 38px + label] │  │ │
│  │   ring-outer  (18s CW)          │   │  │ ■ VOICEAGENT (mono)      │  │ │
│  │   ring-mid    (12s CCW)         │   │  └──────────────────────────┘  │ │
│  │   ring-inner  (3s pulse)        │   │                                │ │
│  │   core        (2.5s breathe)    │   │  [mode toggle pill]            │ │
│  │     └─ 7 audio bars + mic icon  │   │  [ Create account | Sign in ]  │ │
│  │                                 │   │                                │ │
│  │  "Voice AI Agent"  ← shimmer    │   │  [page heading — 2 lines]      │ │
│  │  tagline text in muted          │   │  "Start talking to your"       │ │
│  │                                 │   │  "AI voice assistant" ← grad   │ │
│  │  [pipeline viz]                 │   │                                │ │
│  │  [ASR]──▶[LLM]──▶[TTS]         │   │  [form fields]                 │ │
│  │  Groq   LangGraph  Cartesia     │   │   Full name (signup only)      │ │
│  │  animated step cycling 1.4s     │   │   Email address                │ │
│  │                                 │   │   Password + eye toggle        │ │
│  │  [feature pills × 4]            │   │   "Forgot password?" (login)   │ │
│  │  ◎ Real-time voice interaction  │   │                                │ │
│  │  ⬡ LangGraph memory            │   │  [CTA button — full width]     │ │
│  │  ⚡ Interruption detection      │   │  "Create Account & Connect"    │ │
│  │  ⬟ MCP tool integration        │   │                                │ │
│  └─────────────────────────────────┘   │  ── OR CONTINUE WITH ──        │ │
│                                        │                                │ │
│                                        │  [Google] [GitHub] (50/50)     │ │
│                                        │                                │ │
│                                        │  "Already have an account?"    │ │
│                                        │  "Sign in" link                │ │
│                                        │                                │ │
│                                        │  v2.4.1 · ASR→LLM→TTS (mono)  │ │
│                                        └────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

### Orb — exact specification

The orb is a pure CSS structure. No canvas, no SVG. Five nested divs.

```
Div 1 — Ambient halo
  position: absolute; inset: -40px; border-radius: 50%
  background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 68%)
  No animation.

Div 2 — Outer ring (280px)
  position: absolute; inset: 0; border-radius: 50%
  Gradient border technique:
    background-image: linear-gradient(#080b12, #080b12),
                      linear-gradient(135deg, rgba(59,130,246,0.65), rgba(168,85,247,0.15), rgba(59,130,246,0.65))
    background-origin: border-box
    background-clip: padding-box, border-box
    border: 1px solid transparent
  animation: orb-spin 18s linear infinite
  Child dot: 6px circle at top center. background:#3b82f6. box-shadow:0 0 12px #3b82f6.

Div 3 — Mid ring (236px, i.e. inset:22px)
  Same gradient border technique with violet/indigo gradient (reversed).
  animation: orb-spin-ccw 12s linear infinite
  Child dot: 4px at bottom center. background:#a855f7. box-shadow:0 0 8px #a855f7.

Div 4 — Inner pulse ring (192px, i.e. inset:44px)
  border: 1px solid rgba(99,102,241,0.35)
  box-shadow: 0 0 24px rgba(99,102,241,0.14) inset
  animation: orb-pulse 3s ease-in-out infinite

Div 5 — Core (164px, i.e. inset:58px)
  background: radial-gradient(circle at 38% 35%,
    rgba(147,168,255,0.30) 0%,
    rgba(99,102,241,0.20) 30%,
    rgba(59,130,246,0.15) 60%,
    rgba(6,9,18,0.80) 100%)
  backdrop-filter: blur(8px)
  box-shadow: 0 0 60px rgba(99,102,241,0.40),
              0 0 120px rgba(59,130,246,0.15),
              0 0 8px rgba(147,168,255,0.28) inset
  animation: orb-breathe 2.5s ease-in-out infinite
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px

  Inside core:
    AudioVisualizer (7 bars, listening mode — always animating on auth page)
    MicIcon SVG — 18px, color: rgba(160,180,255,0.7)
```

### Pipeline visualizer — exact spec

Three node boxes + two SVG arrows. Nodes cycle every 1400ms (0→1→2→0...).

```
Node box: 62×62px, border-radius: 14px
Inactive: background: rgba(255,255,255,0.03), border: 1px solid rgba(255,255,255,0.08), text: #4a5568
Active:   background: rgba({stepColor},0.20), border: 1px solid {stepColor}70,
          box-shadow: 0 0 24px {stepGlow}, text: {stepColor}
          + mini 5-bar audio visualizer inside (2px bars, 12px container height)

ASR  color:#3b82f6  glow:rgba(59,130,246,0.55)   sub:"Groq Whisper"
LLM  color:#6366f1  glow:rgba(99,102,241,0.55)    sub:"LangGraph"
TTS  color:#a855f7  glow:rgba(168,85,247,0.55)    sub:"Cartesia"

Arrow SVG between each pair: width:32px height:12px
  <line x1=0 y1=6 x2=24 y2=6 stroke={prevColor if prev active, else #1e2a3a}
        stroke-width=1.5 stroke-dasharray="4 3"
        style="animation: dash-flow 2s linear infinite" />
  <polyline points="20,2 28,6 20,10" fill=none stroke={nextColor} stroke-width=1.5 />

All transitions: transition: all 0.4s var(--ease-inout)
```

### Feature pills — exact spec

```
Container: display:flex flex-direction:column gap:12px width:100% max-width:360px

Each pill:
  display:flex align-items:center gap:14px
  background: rgba(255,255,255,0.025)
  border: 1px solid var(--border-faint)
  border-radius: var(--r-md)
  padding: 12px 16px
  transition: border-color 150ms, background 150ms

  :hover → border-color: var(--border-hover), background: rgba(99,102,241,0.06)

  Icon box: 34×34px, border-radius:8px, background:rgba(99,102,241,0.15), color:#a5b4fc
  Label: font-size:0.875rem, font-weight:500, color:--text-secondary
  Sub:   font-family:mono, font-size:0.7rem, color:#4a5568, letter-spacing:0.04em, margin-top:2px
```

### Glass card — right panel exact spec

```
width: 440px (max-width on mobile: 100%)
border-radius: 24px
padding: 44px 40px
class: glass  (see §1)
animation: slide-left 0.45s var(--ease-out)

Inside top:
  Logo row: 38×38px gradient square (border-radius:10px, background:var(--gradient-brand))
            + "VOICEAGENT" in JetBrains Mono 600 0.8rem #6366f1, letter-spacing:0.06em
  Spacing: 20px below logo row

Mode toggle pill:
  Container: display:flex gap:2px padding:4px
             background:rgba(6,9,18,0.8) border:1px solid var(--border-subtle) border-radius:12px
  Each button: flex:1 padding:9px 12px border-radius:9px border:none cursor:pointer
               font:Inter 0.85rem 600 transition:all 200ms
  Active:   background:linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))
            color:#a5b4fc box-shadow:0 0 0 1px rgba(99,102,241,0.35)
  Inactive: background:transparent color:#4a5568

Page heading (below toggle, 28px gap):
  Line 1: "Start talking to your" — font:Inter 1.6rem 700 letter-spacing:-0.03em color:--text-primary
  Line 2: "AI voice assistant"    — same size, background:var(--gradient-text),
                                    -webkit-background-clip:text, -webkit-text-fill-color:transparent

Form: display:flex flex-direction:column gap:16px margin-top:28px
  Name field:    InputField with UserIcon  — visible only in signup mode
  Email field:   InputField with MailIcon  — always visible
  Password field:InputField with LockIcon + right EyeIcon toggle button

  Name field enters: animation:fade-up 0.3s var(--ease-out) when signup mode activates
  Name field exits:  height collapses to 0 with opacity fade, 250ms (login mode)

CTA button: margin-top:8px class:btn-primary height:48px font-size:0.95rem
  Signup label: "Create Account & Connect"
  Login label:  "Sign In & Connect"

OR divider: display:flex align-items:center gap:12px margin:24px 0
  Lines: flex:1, height:1px, background:rgba(99,102,241,0.12)
  Text: "OR CONTINUE WITH" — JetBrains Mono 0.72rem #4a5568 letter-spacing:0.06em

OAuth row: display:flex gap:10px
  Each button: flex:1 height:44px display:flex align-items:center justify-content:center gap:8px
               background:rgba(255,255,255,0.04) border:1px solid var(--border-default)
               border-radius:var(--r-md) color:--text-secondary font:Inter 0.85rem 500
               transition:all 200ms
               :hover → border-color:var(--border-hover) background:var(--indigo-dim)
               :active → scale(0.97)

Footer switch link: text-align:center margin-top:28px font-size:0.82rem color:--text-ghost
  Link: color:--indigo font-weight:600 no-underline
        :hover → color:#a5b4fc, transition:150ms

Version string: text-align:center margin-top:20px
  "v2.4.1 · ASR→LLM→TTS · Barge-in ready"
  JetBrains Mono 0.65rem color:--text-ghost letter-spacing:0.08em
```

### Auth page events — complete list

| Event                               | Exact UI Reaction                                                                                                                      | Duration         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Page load — no JWT                  | Left panel fades up (`fade-up 0.5s`). Card slides in from right (`slide-left 0.45s`).                                                  | 500ms            |
| Page load — JWT exists              | Immediate redirect to `/dashboard`. No render.                                                                                         | instant          |
| Click "Create account" tab          | Mode switches. Name field fades in (`fade-up 0.3s`). Heading text swaps. CTA label swaps. Footer text swaps. Form key resets.          | 300ms            |
| Click "Sign in" tab                 | Name field height collapses to 0 + opacity 0. "Forgot password?" link fades in. Heading swaps.                                         | 250ms            |
| Any input focus                     | Input border → `--border-focus`. Box shadow → `--shadow-focus`. Left icon color → `#7c85f5`.                                           | 150ms            |
| Any input blur                      | Border returns to `--border-default`. Icon returns to placeholder color.                                                               | 150ms            |
| Password eye button click           | Icon swaps (Eye ↔ EyeOff). Input type flips text/password.                                                                            | instant          |
| Password eye hover                  | Icon color → `#a5b4fc`.                                                                                                                | 150ms            |
| Feature pill hover                  | Border `--border-hover`. Background `rgba(99,102,241,0.06)`.                                                                           | 150ms            |
| Pipeline step advances              | Previous node dims (400ms). Next node lights up with glow (400ms). Arrow between them activates.                                       | 400ms            |
| CTA button hover                    | `box-shadow: var(--shadow-btn-primary)`. Gradient shifts right.                                                                        | 150ms            |
| CTA button press                    | `scale(0.97)`.                                                                                                                         | 80ms             |
| CTA button release                  | Springs back to `scale(1)` via `--ease-spring`.                                                                                        | 150ms            |
| CTA clicked (submitting)            | Button text replaced by `<spinner> Connecting…`. Width locked to prevent layout shift.                                                 | instant          |
| Signup API success                  | JWT stored. Toast "Account created! Connecting..." (success, 3s). Page transition to `/dashboard`.                                     | 380ms transition |
| Login API success                   | JWT stored. Page transition to `/dashboard`.                                                                                           | 380ms transition |
| API error 401 (login)               | Error text `"Incorrect email or password"` fades up below password field. Input borders → error state. Shake animation on both inputs. | 320ms shake      |
| API error 400 (signup, email taken) | Error text `"This email is already in use"` fades up below email field. Email input → error state + shake.                             | 320ms shake      |
| API error 422 (validation)          | Generic error: `"Please check your information and try again"`.                                                                        | 320ms            |
| OAuth button hover                  | Border brightens. Faint indigo tint appears.                                                                                           | 150ms            |
| OAuth button press                  | `scale(0.97)`.                                                                                                                         | 80ms             |
| Mode switch link click              | Same as clicking the mode toggle pill.                                                                                                 | 300ms            |
| Orb — always                        | All rings spinning. Bars always bouncing (auth page orb is always "live" to demonstrate the product).                                  | continuous       |

---

## 7. Page: Dashboard

**Route:** `/dashboard`  
**Auth guard:** Yes. Redirect to `/auth` if no JWT.  
**On mount:** Call `GET /auth/me` to hydrate user profile. Call sessions endpoint (if exists) for recent sessions list.

### Layout specification

```
Full viewport. Flex row.

SIDEBAR: 220px wide, full height, fixed position
  background: var(--bg-surface)
  border-right: 1px solid var(--border-faint)
  padding: 28px 16px
  display: flex, flex-direction: column

MAIN CONTENT: flex:1, overflow-y:auto
  padding: 40px 48px
  max-width: 1000px
  margin: 0 auto
```

```
┌─────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (220px)             │ MAIN (flex:1, max-w:1000px)           │
│                             │                                        │
│ ┌─────────────────────────┐ │ ┌────────────────────────────────────┐│
│ │ ■ VoiceAgent (logo+name)│ │ │ HEADER ROW                         ││
│ └─────────────────────────┘ │ │ "Good morning, Jane 👋"             ││
│                             │ │ subtitle: "Your AI is ready..."    ││
│ ─── (divider) ─────────── │ │ └────────────────────────────────────┘│
│                             │                                        │
│  ◉  Dashboard       ←active │ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  ✦  New Session             │ │STAT 1   │ │STAT 2   │ │STAT 3    │ │
│  ◷  History                 │ │Sessions │ │Talk time│ │Interrupts│ │
│  ⚙  Settings                │ │today: 3 │ │12m 40s  │ │handled: 7│ │
│                             │ └─────────┘ └─────────┘ └──────────┘ │
│ ─── (divider) ─────────── │                                        │
│                             │ ┌────────────────────────────────────┐│
│  [avatar] Jane Doe          │ │  START NEW SESSION (CTA card)      ││
│  jane@example.com           │ │  Dashed border gradient card       ││
│  [Logout — ghost button]    │ │  [mic icon 48px] heading + sub     ││
│                             │ └────────────────────────────────────┘│
└─────────────────────────────│                                        │
                              │ RECENT SESSIONS                        │
                              │ ┌────────────────────────────────────┐│
                              │ │ session row × n                    ││
                              │ │ or empty state                     ││
                              │ └────────────────────────────────────┘│
                              └────────────────────────────────────────┘
```

### Sidebar spec

```
Logo area (top):
  38px gradient square icon + "VoiceAgent" (JetBrains Mono 600 0.88rem #f0f4ff)
  margin-bottom: 32px

Nav items (flex-direction:column gap:4px):
  Each item: display:flex align-items:center gap:12px
             height:40px padding:0 12px border-radius:var(--r-md)
             font:Inter 0.875rem 500 color:--text-muted
             cursor:pointer transition:all 150ms

  Active item:
    background: rgba(99,102,241,0.14)
    border-left: 2px solid var(--indigo)
    color: var(--text-primary)
    padding-left: 10px  (compensate for border)

  Hover (non-active):
    background: var(--indigo-dim)
    color: var(--text-secondary)

  Icon: 18px, color inherits from text

Dividers: height:1px background:var(--border-faint) margin:16px 0

User section (bottom, margin-top:auto):
  Avatar circle: 36px, border-radius:50%
    Background: gradient from user's initials hash (or --gradient-brand as fallback)
    Initials: JetBrains Mono 600 0.75rem white
  Name: 0.85rem 500 --text-secondary
  Email: 0.72rem 400 --text-muted
  Logout button: margin-top:12px, class:btn-ghost, font-size:0.8rem
    :hover → color: var(--status-error)
```

### Stat cards spec

Three cards in a row. Each: `flex:1`.

```
Card: class:glass  padding:24px 28px  border-radius:var(--r-xl)
  animation: fade-up var(--t-slow) var(--ease-out)
  animation-delay: index × 100ms (staggered entrance)

Icon area: 40×40px circle, background:rgba({accentColor},0.15), color:{accentColor}
  Icon: 20px

Value: font:Inter 2rem 700 letter-spacing:-0.03em color:--text-primary  margin-top:16px
Label: font:JetBrains Mono 0.72rem 600 letter-spacing:0.07em color:--text-muted  text-transform:uppercase  margin-top:4px

Delta badge: inline pill, margin-top:8px
  Positive: background:rgba(34,197,94,0.12) color:#86efac border:1px solid rgba(34,197,94,0.2) border-radius:var(--r-pill) padding:3px 8px font:0.72rem mono
  Negative: same with error colors

Stat 1: Sessions today  | CalendarIcon | color:--blue    | e.g. "3"
Stat 2: Total talk time | ClockIcon    | color:--indigo  | e.g. "12m 40s"
Stat 3: Interrupts OK   | BoltIcon     | color:--violet  | e.g. "7"
```

### Start New Session CTA card

```
Full width. height:min 160px.
background: linear-gradient(135deg, rgba(59,130,246,0.09) 0%, rgba(168,85,247,0.06) 100%)
border: 1px dashed rgba(99,102,241,0.30)
border-radius: var(--r-xl)
display: flex; flex-direction:column; align-items:center; justify-content:center; gap:12px
padding: 40px
cursor: pointer
transition: all 200ms

:hover →
  border: 1px solid rgba(99,102,241,0.45)
  background: linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(168,85,247,0.09) 100%)
  box-shadow: var(--shadow-glow-indigo)
  .cta-mic → transform:scale(1.08)  transition:200ms

:active → scale(0.985)

Mic icon: 48px, color gradient rendered as SVG with fill=url(#gradient)
  Or: wrapper with gradient background circle (72×72px) containing white mic icon

Heading: "Start a new voice session"  Inter 1.1rem 600 --text-primary
Sub:     "Connect to your AI assistant instantly"  0.875rem --text-muted
```

### Recent sessions list

```
Section header: "Recent Sessions" Inter 0.9rem 600 --text-muted  text-transform:uppercase  letter-spacing:0.06em
                + optional "View all" link (right-aligned)  Inter 0.8rem --indigo

Each session row:
  display:flex align-items:center gap:16px
  padding:14px 16px border-radius:var(--r-md)
  border-bottom:1px solid var(--border-faint)
  cursor:pointer transition:background 150ms

  :hover →
    background: var(--bg-hover)
    .row-chevron → opacity:1 translateX(0)  (from opacity:0 translateX(4px))

  Left icon: 36×36px circle, gradient background, mic icon 16px white
  Content:
    Title: Inter 0.875rem 500 --text-primary  (first user utterance or "Voice Session #N")
    Meta row: duration badge + timestamp
      Duration: JetBrains Mono 0.72rem --text-muted  e.g. "3m 24s"
      Timestamp: JetBrains Mono 0.7rem --text-ghost  e.g. "Today, 2:34 PM"
  Status chip (right):
    COMPLETED:   background:rgba(34,197,94,0.10)  color:#86efac  border:rgba(34,197,94,0.2)
    INTERRUPTED: background:rgba(245,158,11,0.10) color:#fcd34d  border:rgba(245,158,11,0.2)
    FAILED:      background:rgba(239,68,68,0.10)  color:#fca5a5  border:rgba(239,68,68,0.2)
    Chip: border-radius:var(--r-pill) padding:4px 10px font:JetBrains Mono 0.68rem 600
  Chevron icon: 14px --text-ghost opacity:0 transition:all 150ms (appears on row hover)

Empty state (when sessions = []):
  Centered column: padding:60px 0
  SVG illustration: mic outline, 80px, stroke:var(--border-default)
  Heading: "No sessions yet"  Inter 1rem 600 --text-secondary
  Sub:     "Start your first conversation with the AI assistant."  0.875rem --text-muted
  CTA:     class:btn-primary  width:auto  "Start your first session"
```

### Dashboard events

| Event                      | UI Reaction                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Page mount                 | Stat cards stagger in (`fade-up`, 0ms/100ms/200ms delays). Recent sessions list fades up (300ms delay). |
| `GET /auth/me` resolves    | Greeting text populates with user name.                                                                 |
| `GET /auth/me` fails (401) | JWT cleared. Redirect to `/auth`. Toast: "Session expired."                                             |
| Session data loading       | Skeleton loaders (3 skeleton rows) shown in list area.                                                  |
| Nav item hover             | Background tints. Text brightens. 150ms.                                                                |
| Nav item click             | Active state applies immediately. Route transition begins.                                              |
| CTA card hover             | Border solidifies. Glow appears. Mic icon scales up. 200ms.                                             |
| CTA card click             | Press scale. Route → `/room`. 380ms transition.                                                         |
| Session row hover          | Background tints. Chevron slides in from right. 150ms.                                                  |
| Session row click          | Row background darkens briefly (press). Route → `/history/{id}`.                                        |
| Logout click               | Confirmation toast or inline confirm appears.                                                           |
| Logout confirmed           | JWT removed from localStorage. Redirect to `/auth`. 300ms.                                              |

---

## 8. Page: Voice Room (Active Session)

**Route:** `/room`  
**Auth guard:** Yes.  
**This is the most complex page.**  
**On mount:** Check mic permissions before showing Connect button.

### Layout specification

```
Full viewport. display:flex flex-direction:column.

TOP BAR: height:56px position:sticky top:0 z-index:var(--z-sticky)
  background: rgba(8,11,18,0.92)  backdrop-filter:blur(16px)
  border-bottom: 1px solid var(--border-faint)

BODY: flex:1 display:flex overflow:hidden

LEFT STAGE: flex:0.6  display:flex flex-direction:column align-items:center justify-content:center gap:32px
  padding: 40px 48px

RIGHT TRANSCRIPT: flex:0.4  border-left:1px solid var(--border-faint)
  display:flex flex-direction:column  overflow:hidden
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (56px sticky)                                                     │
│ [←Back] [Session: "Session #43"] [StatusPill]  ─────────  [Timer 01:32] │
├──────────────────────────┬───────────────────────────────────────────────┤
│ LEFT STAGE (60%)         │ RIGHT TRANSCRIPT (40%)                        │
│                          │                                               │
│  [CENTRAL ORB]           │ ┌────────────────────────────────────────────┐│
│  (state-driven,          │ │ TRANSCRIPT  ─────────────  [Clear] [Copy]  ││
│   see Orb States below)  │ ├────────────────────────────────────────────┤│
│                          │ │ ┌──────────────────────────────────────┐   ││
│  [State label]           │ │ │ 🧑 You          10:24:01             │   ││
│  "Listening…"            │ │ │ "Hello, what's the weather?"         │   ││
│                          │ │ └──────────────────────────────────────┘   ││
│  [Waveform strip]        │ │ ┌──────────────────────────────────────┐   ││
│  20 bars / 200px wide    │ │ │ 🤖 Agent        10:24:03             │   ││
│                          │ │ │ "It's 72°F and sunny in your area."  │   ││
│  [Pipeline strip]        │ │ └──────────────────────────────────────┘   ││
│  [ASR]·[LLM]·[TTS]      │ │ [typing indicator if agent composing]       ││
│                          │ ├────────────────────────────────────────────┤│
│  [Controls bar]          │ │ [Barge-in hint — only when SPEAKING]        ││
│  [🎙 Mute][⏹ End][🔈 Vol]│ └────────────────────────────────────────────┘│
│                          │                                               │
│ [Startup hint overlay]   │                                               │
│ (WARMING_UP only)        │                                               │
└──────────────────────────┴───────────────────────────────────────────────┘
```

### Top bar spec

```
Back button: btn-ghost, ChevronLeft icon 16px + "Dashboard" text 0.85rem
Session label: Inter 0.875rem 500 --text-muted, centered
StatusPill: right of center
Timer: JetBrains Mono 0.9rem 600 --text-primary, format "MM:SS"
  Starts counting from 00:00 on CONNECTED state. Pauses on IDLE/ERROR.
  Displayed on right edge.
```

### Central Orb — 7 visual states

The orb is always 260px diameter in the room view. Five nested div structure (same as auth page) plus two additional ripple divs for SPEAKING state.

---

#### State 1: IDLE

_No session active. Default view when page loads._

```
All ring animations: paused
Outer ring: opacity:0.25. No spinning.
Mid ring: opacity:0.20. No spinning.
Inner ring: opacity:0.15. No animation.
Core: background: radial-gradient(circle, rgba(30,42,58,0.8) 0%, rgba(8,11,18,0.9) 100%)
      box-shadow: none
      bars: all at min height (scaleY:0.16), color:--text-ghost, animation:bar-idle 3.5s infinite
      mic icon: color:#4a5568

State label (below orb): "Ready to connect"  Inter 0.9rem --text-ghost
Ambient halo: opacity:0.3

[Connect button] centered below state label:
  class:btn-primary  padding:14px 40px  font-size:1rem
  label: "Connect to Agent"
  margin-top:24px
```

---

#### State 2: CONNECTING

_Token request sent, `room.connect()` initiated._

```
Outer ring: starts spinning (orb-spin 18s). Faint indigo glow begins.
Mid ring: starts spinning (orb-spin-ccw 12s).
Inner ring: orb-pulse begins (3s).
Core: orb-breathe begins. Background shifts toward indigo slightly.
      bars: low-level pulsing animation

Sweeping arc overlay on outer ring:
  Absolute div, inset:0, border-radius:50%
  background: conic-gradient(from 0deg, rgba(99,102,241,0.5) 0deg, transparent 120deg)
  animation: connecting-sweep 1.2s linear infinite
  mask: the ring only (inner circle cut out via additional div)

State label: "Connecting…"  color:--status-warn  opacity pulses gently (0.7↔1, 1.2s)

Connect button: becomes disabled, label → spinner + "Connecting…"
```

---

#### State 3: WARMING_UP

_`RoomEvent.Connected` fired. Waiting for agent audio track (3–5 seconds)._

```
All rings spinning. Inner ring pulse continues.
Core gradient shifts: adds amber warmth:
  background: radial-gradient(circle at 38% 35%,
    rgba(245,158,11,0.20) 0%,
    rgba(99,102,241,0.18) 40%,
    rgba(59,130,246,0.12) 70%,
    rgba(6,9,18,0.80) 100%)

Core glow: 0 0 60px rgba(245,158,11,0.25), 0 0 100px rgba(99,102,241,0.20)
Bars: warming mode (gentle ripple, amber gradient)
Mic icon: color changes to rgba(245,158,11,0.6)

State label: "Agent warming up…"  color:--status-warn

[Startup hint panel] appears below orb (animation:fade-up 0.4s):
  Container: glass-inner border-radius:var(--r-lg) padding:16px 20px max-width:360px
  Row 1: ⚡ icon (amber) + "Agent pipeline warming up (3–5 sec)"  Inter 0.85rem 500 amber
  Row 2: "You'll hear 'Hi, I'm ready!' when live."  0.8rem --text-muted
  Progress bar: width:100% height:4px border-radius:2px background:var(--bg-elevated) margin-top:12px
    Inner fill: background:linear-gradient(90deg, --status-warn, --indigo)
    animation: progress-fill 4s var(--ease-out) forwards (runs once, stays at 80% until CONNECTED)

Timeout: If TrackSubscribed not received within 10s → ERROR state (see §15)
```

---

#### State 4: CONNECTED / QUIET

_Agent track subscribed. Session live. No audio flowing._

```
Startup hint: fades out (fade-in reverse, 0.3s), then removed from DOM.

All rings spinning. orb-breathe at normal pace.
Core gradient: full indigo-blue sphere:
  background: radial-gradient(circle at 38% 35%,
    rgba(147,168,255,0.30) 0%,
    rgba(99,102,241,0.22) 30%,
    rgba(59,130,246,0.15) 60%,
    rgba(6,9,18,0.80) 100%)
Core glow: 0 0 60px rgba(99,102,241,0.35)
Bars: idle mode (scaleY:0.2–0.35, very subtle)
Mic icon: color:rgba(160,180,255,0.7)
Status dot: solid green, no animation

State label: "Listening…"  color:--text-muted
```

---

#### State 5: USER SPEAKING (LISTENING)

_Local mic VAD detected speech. User is talking._

```
Outer ring: subtle outward pulse → scale oscillates 1 ↔ 1.03 (0.4s, repeating)
Core gradient shifts to blue emphasis:
  rgba(59,130,246,0.35) at center, blue tones throughout
Core glow: var(--shadow-glow-blue), intensified
Bars: listening mode — energetic bounce (0.7s), blue gradient, full height usage
Mic icon: color:#60a5fa, slightly brighter

State label: "Listening…"  color:--status-listening  subtle glow text-shadow:0 0 16px rgba(59,130,246,0.5)

Waveform strip below orb: bars animate actively
```

---

#### State 6: AGENT SPEAKING

_Agent DataChannel transcript (role:agent) received, or agent audio track frames flowing._

```
Ripple rings (2 additional divs, positioned absolute around core, same center):
  Div A: inset:44px (same as inner ring size) border-radius:50%
         border:1.5px solid rgba(99,102,241,0.5)
         animation: ripple-out 1.5s var(--ease-out) infinite
  Div B: same but animation-delay:0.65s (staggered second ripple)

Core gradient: indigo-violet emphasis:
  rgba(99,102,241,0.38) center → rgba(168,85,247,0.20) mid → dark edge
Core glow: var(--shadow-orb-live) (strongest glow state)
Bars: speaking mode — medium bounce (0.85s), indigo→violet gradient, glow on bars
Mic icon: color:rgba(168,180,255,0.6)

State label: "Speaking…"  color:--status-speaking

Transcript panel:
  New agent bubble appears with typing indicator first, then text fills in as stream arrives.

Barge-in hint (at bottom of transcript panel):
  Subtle strip: "Interrupt anytime — just speak"  JetBrains Mono 0.7rem --text-ghost
  animation:fade-in 0.4s, only visible during SPEAKING
```

---

#### State 7: INTERRUPTED (Barge-in)

_User DataChannel transcript received while agent was speaking._

```
Transition: NO smooth ease. Immediate snap (transition:all 0.12s only).
Ripple rings: stop immediately. Remove from DOM.
Core: snaps back to blue (listening) gradient.
Core glow: blue glow snaps in.
Bars: snap to listening mode animation.
Mic icon: snaps to blue.

State label: snaps to "Listening…" in blue.
Barge-in hint: disappears instantly.

Transcript: New user bubble appears with bubble-in animation.
```

---

#### State 8: ERROR

```
All ring animations: stop.
Core: background shifts to dark with red tint:
  rgba(239,68,68,0.12) center → rgba(8,11,18,0.95) edge
Core glow: 0 0 40px rgba(239,68,68,0.20)
Core: animation:orb-error-shake 0.5s runs once when error state enters
Bars: flat, color:--status-error at very low opacity
Mic icon: color:rgba(239,68,68,0.5)

State label: displays error.message  color:--status-error  font-size:0.85rem
  e.g. "Connection lost. Please reconnect."

[Retry button] appears:  class:btn-secondary  label:"Retry Connection"  margin-top:16px
  :hover → border brightens.

Nebula A in background: shifts to red tint.
```

---

### Startup hint panel spec

Already described in State 3. Additional detail:

```
Disappears when: connection reaches CONNECTED (TrackSubscribed fires)
Exit animation: fade-down 0.3s var(--ease-in), then height collapses to 0 over 250ms
Must not leave empty space — use CSS height transition on wrapper
```

### Waveform strip spec

```
Position: below state label, above pipeline strip
Width: 200px (centered). Height: 40px.
20 bars: width:2px, gap:2px, border-radius:2px, transform-origin:bottom
Bar heights when active: random between 4px and 36px, driven by Web Audio API.
Fallback: CSS animation with randomized heights and staggered delays.
Colors:
  IDLE: var(--text-ghost)
  LISTENING: linear-gradient(to top, var(--blue), #60a5fa)
  SPEAKING: linear-gradient(to top, var(--indigo), #818cf8)
  WARMING_UP: var(--status-warn)
```

### Pipeline status strip spec

```
Position: below waveform strip
Three pill badges in a row, gap:8px

Each badge:
  padding:5px 10px border-radius:var(--r-pill)
  font:JetBrains Mono 0.68rem 600 letter-spacing:0.05em
  display:flex align-items:center gap:5px
  transition:all 300ms

Inactive: background:var(--bg-elevated) color:--text-ghost border:var(--border-faint)
Active:   background:rgba({color},0.15) color:{color} border:1px solid rgba({color},0.4)
          box-shadow: 0 0 12px rgba({color},0.3)
          dot inside is animated (pulse for active, spin for processing)

Pipeline stage inferred from DataChannel events:
  User DataChannel transcript received → ASR just completed → LLM active
  Agent DataChannel transcript received → LLM done → TTS active
  Agent audio track active → TTS active
  Between events → last known stage stays lit
```

### Controls bar spec

```
Position: below pipeline strip. Centered horizontally. display:flex gap:16px align-items:center

1. Mute/Unmute button
   Size: 52×52px circle (btn-icon-circle)
   Icon: MicIcon (unmuted) / MicOffIcon (muted)
   Muted state: .muted class applied — red glow, red border, red icon
   Tooltip on hover: "Mute microphone" / "Unmute microphone"

2. Disconnect button (center, largest)
   Size: 64×64px circle (btn-icon-circle + btn-danger override)
   background: rgba(239,68,68,0.18) border:1px solid rgba(239,68,68,0.35)
   Icon: StopSquareIcon 24px color:--status-error
   :hover → box-shadow: var(--shadow-btn-danger)
   Disabled during IDLE/CONNECTING/WARMING_UP

3. Volume toggle button
   Size: 52×52px circle (btn-icon-circle)
   Icon: SpeakerIcon / SpeakerOffIcon
   Toggling mutes the agent audio output (not mic)
   Dimmed state when muted: low opacity icon
```

### Transcript panel spec

```
Header:
  display:flex justify-content:space-between align-items:center
  padding:16px 20px
  border-bottom:1px solid var(--border-faint)
  background:rgba(8,11,18,0.5)

  "TRANSCRIPT" — JetBrains Mono 0.72rem 600 --text-muted letter-spacing:0.08em
  Actions: "Clear" btn-ghost 0.75rem + "Copy" btn-ghost 0.75rem

Message list:
  flex:1 overflow-y:auto padding:16px 20px display:flex flex-direction:column gap:10px
  scroll-behavior:smooth
  Auto-scroll: useEffect watches transcripts array length, scrolls containerRef to bottom
  Scrollbar: hidden (scrollbar-width:none)

Each bubble: <TranscriptBubble> component (see §5)

Typing indicator bubble:
  Appears when agent DataChannel transcript is "streaming" (backend sends partial)
  Shows agent bubble with animated dots instead of text
  Replaced by real text when full message arrives

Barge-in hint strip:
  height:36px padding:0 20px
  display:flex align-items:center
  border-top:1px solid var(--border-faint)
  background:rgba(99,102,241,0.04)
  text: "Interrupt anytime — just speak"  JetBrains Mono 0.7rem --text-ghost
  Only visible when connection state is SPEAKING
  animation:fade-in 0.3s on appear, fade-in reverse on disappear
```

### Voice Room events — complete list

| Trigger                                             | Source                       | UI Action                                                                                                                      |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Page mount                                          | —                            | Check mic permissions. If denied → show mic permission error UI (not ERROR state).                                             |
| `navigator.mediaDevices` denied                     | Browser                      | Show inline permission banner (red) above controls: "Microphone access required." + "Open Settings" link.                      |
| Click "Connect to Agent"                            | User                         | `connection→CONNECTING`. Button disabled+spinner. Orb starts. `POST /api/token`.                                               |
| `/api/token` 200 OK                                 | REST                         | `room.connect(livekit_url, token)` called.                                                                                     |
| `/api/token` 4xx/5xx                                | REST                         | `connection→ERROR`. Toast error. Retry button appears.                                                                         |
| `/api/token` timeout                                | REST                         | Same as 4xx. Message: "Failed to reach the server."                                                                            |
| `room.connect()` success                            | LiveKit                      | `connection→WARMING_UP`. Startup hint appears (fade-up). Amber orb.                                                            |
| `room.connect()` throws                             | LiveKit                      | `connection→ERROR`. Message: "Failed to connect to the voice room."                                                            |
| `RoomEvent.TrackSubscribed`                         | LiveKit                      | `connection→CONNECTED`. Hint fades out+removed. Orb→indigo. Timer starts. Status dot→green.                                    |
| `RoomEvent.TrackSubscribed` not in 10s              | Timer                        | `room.disconnect()`. `connection→ERROR`. Message: "Agent took too long to respond."                                            |
| `RoomEvent.DataReceived` (role:user)                | LiveKit                      | Append user bubble. Auto-scroll. `speaking→LISTENING`. Orb→blue.                                                               |
| `RoomEvent.DataReceived` (role:agent)               | LiveKit                      | Append agent bubble (or update typing→text). `speaking→SPEAKING`. Orb ripples.                                                 |
| `RoomEvent.DataReceived` (role:user) while SPEAKING | LiveKit                      | Barge-in: instant snap to LISTENING. Ripples stop. Barge-in hint disappears. New user bubble appears.                          |
| Agent audio track frames start                      | Web Audio                    | Orb bars animate at speaking intensity. Visualizer shows frequency data if Web Audio API available.                            |
| Agent audio track frames stop                       | Web Audio                    | Orb bars settle to idle. No state change (wait for next DataChannel event).                                                    |
| User mic level exceeds threshold                    | Web Audio                    | Waveform strip animates. Orb edge subtle pulse.                                                                                |
| `RoomEvent.Disconnected` (user action)              | LiveKit                      | `connection→IDLE`. Timer stops. All animations settle. "Connect" button returns.                                               |
| `RoomEvent.Disconnected` (unexpected)               | LiveKit                      | `connection→ERROR`. Toast: "Connection lost. Please reconnect." Retry button.                                                  |
| `RoomEvent.Reconnecting`                            | LiveKit                      | Toast warning: "Connection interrupted, reconnecting…" (warning, persistent). Orb→CONNECTING style.                            |
| `RoomEvent.Reconnected`                             | LiveKit                      | Toast closes. Previous state restored. Toast success: "Reconnected."                                                           |
| Mute button click                                   | User                         | `isMuted←!isMuted`. Mic track disabled/enabled. Button style flips.                                                            |
| Volume button click                                 | User                         | Agent audio output muted/unmuted. Icon flips.                                                                                  |
| Disconnect button click                             | User                         | `room.disconnect()`. `connection→IDLE`. Timer resets. Transcript preserved until next session.                                 |
| Back button click                                   | User                         | If CONNECTED → show confirmation modal: "End session and leave?" [Cancel] [End Session]. If IDLE/ERROR → navigate immediately. |
| Session ends (server-side)                          | LiveKit `Disconnected` event | Toast: "Session ended." `connection→IDLE`.                                                                                     |

---

## 9. Page: Session History

**Route:** `/history`  
**Auth guard:** Yes.

### Layout

```
Full viewport. Sidebar same as Dashboard. Main area splits:

LEFT LIST (38%):
  overflow-y:auto padding:24px 16px
  border-right:1px solid var(--border-faint)

RIGHT VIEWER (62%):
  overflow-y:auto padding:32px 40px
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ [sidebar] │ MAIN                                                        │
│           │                                                             │
│           │ PAGE HEADER                                                 │
│           │ "Session History"  +  [Search input]  [Filter dropdown]     │
│           ├──────────────────────┬──────────────────────────────────── │
│           │ SESSION LIST (38%)   │ TRANSCRIPT VIEWER (62%)             │
│           │                      │                                      │
│           │ ┌──────────────────┐ │ [Selected session meta]             │
│           │ │ Session #43      │ │ "Session #43 · 3m 24s · Today 2pm" │
│           │ │ 3m 24s · Today   │ │ Status: Completed                   │
│           │ │ ● Completed  ←   │ │                                      │
│           │ └──────────────────┘ │ [Full transcript, scrollable]       │
│           │ ┌──────────────────┐ │  User bubble...                     │
│           │ │ Session #42      │ │  Agent bubble...                    │
│           │ │ 1m 12s · Ystrday │ │  ...                                │
│           │ │ ◑ Interrupted    │ │                                      │
│           │ └──────────────────┘ │ [Export .txt button]                │
│           │                      │ [Share transcript button]           │
```

### Session list spec

```
Search input: full width, height:40px, glass-inner background
  Filters list in real-time by first utterance text or date
  Debounce: 200ms

Filter dropdown: "All / Completed / Interrupted" — right of search
  Glass dropdown, --r-md border-radius

Each session card:
  padding:14px 16px border-radius:var(--r-md) margin-bottom:6px
  cursor:pointer transition:all 150ms

  Active (selected): background:rgba(99,102,241,0.14) border:1px solid var(--border-hover)
  Hover (non-active): background:var(--indigo-dim)

  Title: Inter 0.875rem 500 --text-primary  (first utterance, truncated with ellipsis)
  Duration: JetBrains Mono 0.72rem --text-muted
  Date: JetBrains Mono 0.7rem --text-ghost
  Status chip: same spec as dashboard session rows
```

### Transcript viewer spec

```
Meta bar: padding:0 0 20px 0 border-bottom:1px solid var(--border-faint) margin-bottom:20px
  Session name: Inter 1.1rem 600 --text-primary
  Meta: "Duration · Date · Time"  JetBrains Mono 0.75rem --text-muted
  Status chip: same style as list

Transcript body: same bubble components as Voice Room transcript panel (read-only)
  All bubbles rendered at once (no typing indicators in history view)

Footer actions: margin-top:32px display:flex gap:12px
  "Download .txt": btn-secondary
    Generates plain-text formatted transcript:
      "[10:24:01] You: Hello..."
      "[10:24:03] Agent: ..."
  "Copy to clipboard": btn-ghost + check icon on success

Empty state (no session selected):
  Centered: "Select a session" heading + "Choose a conversation from the list on the left." sub
  Faint mic SVG icon
```

### History events

| Event                             | UI Reaction                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| Page mount                        | Sessions load, list fades up.                                                        |
| Session card click                | Active styles apply. Right panel animates in (`scale-in 0.25s`). Transcript renders. |
| Search input changes              | List filters with 200ms debounce. Non-matching cards fade to opacity:0.3.            |
| Filter dropdown changes           | Same as search.                                                                      |
| Download .txt click               | File download triggers. Button shows ✓ icon for 2s.                                  |
| Copy click                        | Button shows ✓ icon for 2s.                                                          |
| Empty list (search found nothing) | "No sessions match your search" empty state appears.                                 |

---

## 10. Page: Settings

**Route:** `/settings`  
**Auth guard:** Yes.

### Layout

```
Sidebar same as Dashboard. Main area:
  padding: 40px 48px
  max-width: 720px

TAB BAR: horizontal, 4 tabs, underline style
CONTENT AREA: below tab bar, animation:fade-up 0.25s on tab switch
```

```
┌─────────────────────────────────────────────────────────────────┐
│ "Settings"                                                       │
│                                                                  │
│ [Profile]  [Audio]  [Agent]  [Account]                          │
│ ──────────────────────────────────────────────────────────────  │
│                                                                  │
│ ── Profile ──────────────────────────────────────────────────── │
│  [Avatar circle 80px — initials or upload]                       │
│  [Change photo button — btn-ghost]                               │
│  [Full Name input]                                               │
│  [Email input — read only, styled differently]                   │
│  [Save Changes — btn-primary]                                    │
│                                                                  │
│ ── Audio ────────────────────────────────────────────────────── │
│  Microphone: [Device selector dropdown]                          │
│  Speaker:    [Device selector dropdown]                          │
│  [Test Microphone — btn-secondary]                               │
│    → shows live waveform strip when active                       │
│                                                                  │
│ ── Agent ────────────────────────────────────────────────────── │
│  Voice:          [Cartesia voice dropdown]                        │
│  System Prompt:  [Textarea — multiline]                          │
│  Response Style: [Concise ●──── Detailed] slider                 │
│  [Save Agent Settings — btn-primary]                             │
│                                                                  │
│ ── Account ──────────────────────────────────────────────────── │
│  [Change Password section]                                       │
│  ─────────────────────────────────────────────────────────────  │
│  DANGER ZONE                                                     │
│  border:1px solid rgba(239,68,68,0.25) border-radius:--r-xl      │
│  padding:24px                                                    │
│  "Delete Account" — btn-danger                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Tab bar spec

```
display:flex gap:0 border-bottom:1px solid var(--border-faint) margin-bottom:32px

Each tab:
  padding:10px 20px cursor:pointer
  font:Inter 0.9rem 500
  color:--text-muted
  border-bottom:2px solid transparent
  transition:all 150ms

  :hover → color:--text-secondary border-bottom-color:var(--border-hover)
  Active  → color:--text-primary  border-bottom-color:var(--indigo)

Tab content switch: animation:fade-up 0.25s var(--ease-out)
```

### Settings form elements

```
Section heading: Inter 0.95rem 600 --text-primary margin-bottom:20px
  + optional sub: 0.8rem --text-muted

Form grid: max-width:480px display:flex flex-direction:column gap:20px

Read-only input:
  Same as .input-field but opacity:0.6 cursor:not-allowed background:var(--bg-elevated)
  Label "Cannot be changed" in --text-ghost below

Dropdown selects:
  Same visual style as input-field
  Chevron icon right-aligned
  Options appear in glass dropdown (--bg-elevated background)

Textarea:
  Same border/background as input-field
  min-height:120px resize:vertical
  padding:14px 16px (no left icon)
  font:Inter 0.9rem

Slider:
  Custom styled: track height:4px border-radius:2px background:var(--bg-elevated)
  Fill: var(--gradient-brand) from left edge to thumb
  Thumb: 18×18px circle, background:white, box-shadow:0 2px 8px rgba(0,0,0,0.4)

Danger zone:
  border:1px solid rgba(239,68,68,0.22)
  border-radius:var(--r-xl)
  padding:24px
  Heading: "Danger Zone"  Inter 0.9rem 600 --status-error
  Description: 0.85rem --text-muted margin-bottom:16px
  Button: btn-danger "Delete My Account"
  Click → confirmation modal (type email to confirm)
```

### Settings events

| Event                    | UI Reaction                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Tab click                | Active underline slides to new tab. Content fades up (0.25s).                       |
| Input focus              | Same as global input spec.                                                          |
| "Test Microphone" click  | Button → "Stop Test". Waveform strip appears below. Mic bars animate.               |
| "Test Microphone" stop   | Waveform strip fades out. Button resets.                                            |
| "Save Changes" click     | Button → spinner. On success: button flashes green ✓ "Saved" for 2s. Toast success. |
| "Save Changes" API error | Toast error. Input errors if field-specific.                                        |
| "Delete Account" click   | Confirmation modal: "Type your email to confirm" + "Delete Forever" btn-danger.     |
| Delete confirmed         | API call. JWT cleared. Redirect to `/auth`. Toast: "Account deleted."               |

---

## 11. Connection State Machine

### States

```
IDLE         → initial state. No connection. Connect button shown.
CONNECTING   → token fetch + room.connect() in progress.
WARMING_UP   → room connected, agent pipeline booting (3–5s).
CONNECTED    → agent audio track subscribed. Session live.
ERROR        → any unrecoverable failure.

Sub-states of CONNECTED:
  speaking.QUIET      → no audio in either direction
  speaking.LISTENING  → user mic is active (VAD detected)
  speaking.SPEAKING   → agent audio track is outputting
  speaking.INTERRUPTED → barge-in just occurred (transitions to LISTENING immediately)
```

### Transition diagram

```
IDLE ────[click Connect]───────────────────────────────────► CONNECTING
  ▲                                                               │
  │                                                         /api/token OK
  │                                                               │
  │                                                     room.connect() called
  │                                                               │
  │                                                               ▼
  │                                              RoomEvent.Connected ───► WARMING_UP
  │                                                               │
  │                                                       [TrackSubscribed]
  │                                                               │
  │                                                               ▼
  │                                     ┌───────────────────── CONNECTED ◄──────────────┐
  │                                     │                    (QUIET)                    │
  │                                     │              ┌──────┘      └──────┐           │
  │                              [user speaks]   [agent data event]         │           │
  │                                     │              │                    │           │
  │                                     ▼              ▼                    │           │
  │                                LISTENING       SPEAKING                 │           │
  │                                     │              │                    │           │
  │                              [VAD stops]    [user interrupts]           │           │
  │                                     └──────────────┘                   │           │
  │                                                                         │           │
  │                                                                    [audio ends]     │
  │                                                                         └───────────┘
  │
  │◄──[disconnect click]──────────────────────────── CONNECTED
  │◄──[RoomEvent.Disconnected (user click)]
  │
  │◄──────────────[Retry button click]──────────────── ERROR
  │                                                      ▲
  └──────[any failure: token, connect, timeout]──────────┘
```

### React state shape

```typescript
interface AppState {
  // Auth
  user: {
    id: string;
    name: string;
    email: string;
    voice_id: string;
  } | null;
  jwt: string | null;

  // Voice session
  connection:
    | "IDLE"
    | "CONNECTING"
    | "WARMING_UP"
    | "CONNECTED"
    | "ERROR";
  speaking: "QUIET" | "LISTENING" | "SPEAKING" | "INTERRUPTED";
  isMuted: boolean;
  isVolumeOff: boolean;
  error: string | null;
  transcripts: TranscriptMessage[];
  sessionDuration: number; // seconds, counts up from CONNECTED

  // UI
  toasts: Toast[];
}

interface TranscriptMessage {
  id: string; // uuid
  role: "user" | "agent";
  text: string;
  timestamp: string; // ISO string
  isTyping?: boolean; // true while agent is streaming partial text
}
```

---

## 12. Complete Event → UI Mapping

Every event the app must handle, in one authoritative table.

| #   | Event source      | Event                                         | connection before | connection after | speaking before | speaking after | UI actions                                                                                     |
| --- | ----------------- | --------------------------------------------- | ----------------- | ---------------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| 1   | User              | Click "Connect"                               | IDLE              | CONNECTING       | —               | —              | Button → spinner. Orb starts. Token request begins.                                            |
| 2   | REST `/api/token` | 200 OK                                        | CONNECTING        | CONNECTING       | —               | —              | `room.connect()` called immediately.                                                           |
| 3   | REST `/api/token` | 4xx / 5xx                                     | CONNECTING        | ERROR            | —               | —              | Toast error. Orb → error shake. Retry button.                                                  |
| 4   | REST `/api/token` | timeout (>8s)                                 | CONNECTING        | ERROR            | —               | —              | Toast: "Server unreachable." Retry button.                                                     |
| 5   | LiveKit           | `RoomEvent.Connected`                         | CONNECTING        | WARMING_UP       | —               | QUIET          | Startup hint appears. Orb → amber. Warmup timer starts (10s).                                  |
| 6   | LiveKit           | `RoomEvent.TrackSubscribed` (agent)           | WARMING_UP        | CONNECTED        | QUIET           | QUIET          | Hint disappears. Orb → indigo. Timer starts. Status dot → green.                               |
| 7   | Internal timer    | 10s elapsed in WARMING_UP, no TrackSubscribed | WARMING_UP        | ERROR            | —               | —              | `room.disconnect()`. Toast: "Agent took too long." Retry.                                      |
| 8   | LiveKit           | `RoomEvent.DataReceived` (role:user)          | any               | CONNECTED        | any             | LISTENING      | Append user bubble. Orb → blue. Auto-scroll. Barge-in: ripples stop if was SPEAKING.           |
| 9   | LiveKit           | `RoomEvent.DataReceived` (role:agent)         | CONNECTED         | CONNECTED        | QUIET/LISTENING | SPEAKING       | Append agent bubble (or typing → text). Orb ripples. Barge-in hint appears.                    |
| 10  | Web Audio         | Agent audio track amplitude > threshold       | CONNECTED         | —                | QUIET           | SPEAKING       | Orb bars animate at speaking intensity.                                                        |
| 11  | Web Audio         | Agent audio track amplitude drops to 0        | CONNECTED         | —                | SPEAKING        | QUIET          | Orb bars settle. (Wait for DataReceived to confirm state.)                                     |
| 12  | Web Audio         | Mic input > VAD threshold                     | CONNECTED         | —                | QUIET/SPEAKING  | LISTENING      | Waveform strip animates. Orb outer ring pulses.                                                |
| 13  | LiveKit           | `RoomEvent.Disconnected` (user initiated)     | CONNECTED         | IDLE             | any             | —              | Orb → IDLE. Timer stops. Controls reset. "Connect" button returns.                             |
| 14  | LiveKit           | `RoomEvent.Disconnected` (unexpected)         | CONNECTED         | ERROR            | any             | —              | Toast warning: "Connection lost." Retry button. Orb → error.                                   |
| 15  | LiveKit           | `RoomEvent.Reconnecting`                      | CONNECTED         | CONNECTING       | any             | —              | Toast persistent warning. Orb → amber/connecting style.                                        |
| 16  | LiveKit           | `RoomEvent.Reconnected`                       | CONNECTING        | CONNECTED        | —               | QUIET          | Toast closes. Orb → indigo. Session resumes.                                                   |
| 17  | User              | Click Mute                                    | CONNECTED         | —                | any             | —              | `isMuted←true`. Mic track disabled. Button → red muted style.                                  |
| 18  | User              | Click Unmute                                  | CONNECTED         | —                | any             | —              | `isMuted←false`. Mic track re-enabled. Button → normal.                                        |
| 19  | User              | Click Volume off                              | CONNECTED         | —                | any             | —              | Agent audio element muted. Volume icon → off.                                                  |
| 20  | User              | Click Disconnect                              | CONNECTED         | IDLE             | any             | —              | Confirmation if SPEAKING. `room.disconnect()`. Timer resets.                                   |
| 21  | User              | Click Retry                                   | ERROR             | CONNECTING       | —               | —              | Same flow as Click "Connect" (#1).                                                             |
| 22  | Auth              | JWT expires mid-session                       | any               | ERROR            | any             | —              | `room.disconnect()`. Toast: "Session expired, please log in again." Redirect `/auth` after 3s. |
| 23  | Auth              | `GET /auth/me` 401 on dashboard load          | any               | —                | —               | —              | JWT cleared. Redirect `/auth`. No error toast if initial load.                                 |
| 24  | Browser           | `NotAllowedError` on mic permission           | any               | ERROR            | —               | —              | Mic permission banner (not full error state).                                                  |
| 25  | Browser           | `NotFoundError` on mic                        | any               | ERROR            | —               | —              | Toast: "No microphone detected."                                                               |

---

## 13. Page Transition System

### Concept

All page transitions use a wrapper that applies enter/exit CSS classes as routes change. Use React Router v6 with a transition wrapper, or Framer Motion `AnimatePresence` if installed.

### Transition CSS

```css
/* Wrapper receives these classes automatically on route change */
.page-enter {
  opacity: 0;
  transform: translateY(14px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity var(--t-slow) var(--ease-out),
    transform var(--t-slow) var(--ease-out);
}
.page-exit {
  opacity: 1;
  transform: translateY(0);
}
.page-exit-active {
  opacity: 0;
  transform: translateY(-10px);
  transition:
    opacity var(--t-normal) var(--ease-in),
    transform var(--t-normal) var(--ease-in);
}
```

### Per-route transition overrides

| Route pair                 | Enter animation                      | Exit animation                                     | Notes                                    |
| -------------------------- | ------------------------------------ | -------------------------------------------------- | ---------------------------------------- |
| Any → `/auth`              | `fade-up 0.4s`                       | none                                               | Landing on auth is always a fresh state. |
| `/auth` → `/dashboard`     | `slide-right 0.38s` (dashboard)      | `slide-right reverse 0.25s` (auth slides left out) | Feels like advancing forward.            |
| `/dashboard` → `/room`     | `scale-bounce 0.45s` (room grows in) | room feels like it expands from the CTA card.      |
| `/room` → `/dashboard`     | `fade-up 0.35s`                      | Fade out `0.25s`                                   | Return is calmer.                        |
| `/dashboard` → `/history`  | `slide-left 0.3s`                    | —                                                  | Slide from right.                        |
| `/dashboard` → `/settings` | `slide-left 0.3s`                    | —                                                  | Same.                                    |
| Any tab change (settings)  | `fade-up 0.25s`                      | instant                                            | Tab content cross-fades.                 |

### Modal transitions

```
Modal backdrop: opacity 0 → 1, 0.3s, background rgba(4,6,14,0.85)
Modal content:  scale-bounce 0.35s
  Exit: scale 1 → 0.94, opacity 1 → 0, 0.22s var(--ease-in)

Drawer (mobile sidebar):
  Enter: translateX(-100%) → 0, 0.3s var(--ease-out)
  Exit:  translateX(0) → -100%, 0.25s var(--ease-in)
```

---

## 14. Micro-interaction Catalog

Every interactive state for every element type, with exact specs.

### Universal rules

```
All interactive elements: transition: all var(--t-fast)
Press (active): transform: scale(0.97) — large buttons
                transform: scale(0.93) — icon circle buttons
Release: spring back via --ease-spring, 150ms
Focus (keyboard): box-shadow: var(--shadow-focus) on inputs
                  outline: 2px solid rgba(99,102,241,0.5) on buttons
Disabled: opacity: 0.42, cursor: not-allowed, pointer-events: none
```

### Specific interactions

| Element                   | Interaction          | CSS/behavior                                                                                                          |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Nav sidebar item          | Hover                | `background: var(--indigo-dim); color: var(--text-secondary);` 150ms                                                  |
| Nav sidebar item          | Active state change  | Left border slides in via height animation: `height: 0 → 100%` over 150ms                                             |
| Nav sidebar item          | Click                | Brief `background: rgba(99,102,241,0.22)` flash before route change                                                   |
| Dashboard stat card       | Hover                | `box-shadow` intensifies by adding `var(--shadow-glow-indigo)` at low opacity. `transform: translateY(-2px)`. 200ms   |
| Dashboard session row     | Hover                | Row tints. Chevron slides in from `translateX(4px) opacity:0` → `translateX(0) opacity:1`. 150ms                      |
| Dashboard session row     | Click                | Row darkens briefly (`background: rgba(99,102,241,0.20)`) for 80ms before route transition                            |
| Start Session CTA card    | Hover                | Border solid (from dashed). Glow appears. Mic icon scales `1.08`. 200ms                                               |
| Start Session CTA card    | Click                | `scale(0.985)` 80ms then route transition                                                                             |
| Feature pill (auth)       | Hover                | Border → `--border-hover`. Background → `rgba(99,102,241,0.06)`. 150ms                                                |
| Pipeline node (auth)      | Step advance         | Node fades from inactive to active over 400ms. Previous node fades to inactive 400ms. Arrow stroke color transitions. |
| Auth mode toggle tab      | Click                | Active pill fills with gradient. Tab label brightens. Form fields animate in/out. 200ms                               |
| Auth input                | Focus                | Border → `--border-focus`. Icon → `#7c85f5`. Focus ring shadow appears. 150ms                                         |
| Auth input                | Blur                 | Returns to default. 150ms                                                                                             |
| Auth input (error)        | Validation fail      | Border → `--border-error`. `shake 0.32s` animation once. Error text fades up below.                                   |
| Password eye button       | Click                | Icon swaps instantly (no transition). Color: default `--text-muted`, hover `#a5b4fc`.                                 |
| CTA button (auth)         | Hover                | `box-shadow: var(--shadow-btn-primary)`. Gradient shifts `background-position: right center`. 150ms                   |
| CTA button (auth)         | Loading              | Text replaced by `<spinner> "Connecting…"`. Width locked. Cannot click.                                               |
| Orb state change          | Any                  | `transition: all 0.4s var(--ease-inout)` on core and all rings. Exception: barge-in snap uses `0.12s`.                |
| Orb ring dots             | Continuous           | Orbit along the ring edge as the ring rotates (they're children of the rotating div, so they orbit automatically)     |
| Controls mute button      | Active (muted)       | Red glow, red border, icon swap, all instant then sustain                                                             |
| Controls buttons          | Press                | `scale(0.93)` 80ms. Spring back `scale(1)` 150ms via `--ease-spring`                                                  |
| Disconnect button         | Hover                | Red glow grows: `box-shadow: var(--shadow-btn-danger)`                                                                |
| Transcript bubble         | Appears              | `bubble-in 0.25s var(--ease-out)` — slides up from 10px while scaling from 0.97                                       |
| Typing dots               | Pending agent        | Three dots pulse at 1s staggered (0 / 0.18s / 0.36s delay)                                                            |
| Toast                     | Appear               | `toast-enter 0.3s var(--ease-out)`                                                                                    |
| Toast                     | Dismiss              | `toast-exit 0.25s var(--ease-in)` — triggers at 4s for info/success, manual for error                                 |
| Tab (settings)            | Click                | Underline slides to new tab. Content cross-fades via `fade-up 0.25s`.                                                 |
| Settings save             | Success              | Button flashes green, icon → ✓, label → "Saved!" for 2s then resets. Toast success.                                   |
| Row selection (history)   | Click                | Active card gets indigo border + background. Right panel `scale-in 0.25s`.                                            |
| Danger zone               | Delete click         | Confirmation modal `scale-bounce 0.35s`. Input shake on wrong email.                                                  |
| Status dot (WARMING_UP)   | Continuous           | `dot-pulse 1s ease-in-out infinite` — opacity 1→0.4→1                                                                 |
| Status dot (CONNECTED)    | Static               | Solid green. No animation. Crispness signals stability.                                                               |
| Waveform strip            | State change         | Bars transition height and color over `transition: all 0.3s`. Immediate snap for barge-in.                            |
| Startup hint progress bar | WARMING_UP           | `progress-fill 4s var(--ease-out) forwards`. Starts once, holds at 80%.                                               |
| Startup hint              | Disappears           | `fade-down 0.3s var(--ease-in)` then height collapses to 0 with overflow:hidden, 250ms.                               |
| Scroll containers         | Scrollbar            | `scrollbar-width:none` / `::-webkit-scrollbar { display:none }`. Invisible always.                                    |
| Back button (room)        | Click when CONNECTED | Confirmation modal appears. Not immediate navigation.                                                                 |
| Error state               | Entry                | Orb `orb-error-shake 0.5s` once. Nebula shifts to red tint. Retry button fades up.                                    |

---

## 15. Error State Handling

### Authentication errors

| Error                      | Detection               | Exact message shown                                 | UI behavior                                                        |
| -------------------------- | ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| Wrong password             | `POST /auth/login` 401  | "Incorrect email or password."                      | Inline below password field. Red. Input shake. Do not clear email. |
| Email already registered   | `POST /auth/signup` 400 | "This email is already in use."                     | Inline below email field. Email input → error state. Shake.        |
| Expired JWT (initial load) | `GET /auth/me` 401      | none                                                | Silent redirect to `/auth`. Clear JWT.                             |
| Expired JWT (mid-session)  | Any request 401         | Toast: "Your session expired. Please log in again." | Room disconnects. 3s delay. Redirect `/auth`.                      |
| Validation error           | 422 any endpoint        | "Please check your information and try again."      | Generic inline below form.                                         |

### Connection errors

| Error                  | Detection                           | Message                                                            | Recovery                                  |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Token fetch failed     | `/api/token` 5xx or timeout         | "Failed to reach the server. Please try again later."              | Retry button.                             |
| LiveKit connect failed | `room.connect()` throws             | "Failed to connect to the voice room."                             | Retry button.                             |
| Connection dropped     | `RoomEvent.Disconnected` unexpected | "Connection lost. Please reconnect."                               | Retry button.                             |
| Reconnecting           | `RoomEvent.Reconnecting`            | Toast warning: "Connection interrupted, reconnecting…"             | Auto — no user action needed.             |
| Agent timeout          | 10s in WARMING_UP                   | "The agent took too long to respond. Please try connecting again." | Retry button. `room.disconnect()` called. |

### Hardware errors

| Error                     | Detection                  | Message                                                                   | UI                                                                                                                                          |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Mic permission denied     | `NotAllowedError`          | "Microphone access denied. Please allow access in your browser settings." | Red banner above controls. "How to fix" link opens browser help. Not a full ERROR state — Connect button still available but shows warning. |
| No microphone             | `NotFoundError`            | "No microphone detected. Please plug in a microphone and try again."      | Same banner style.                                                                                                                          |
| Web Audio API unsupported | `AudioContext` unavailable | No message to user.                                                       | Silently fall back to CSS-only audio visualization. Never crash.                                                                            |

### Error UI components

```
Inline error (below form fields):
  color: var(--status-error)
  font: Inter 0.8rem 400
  animation: fade-up 0.25s
  display: flex; align-items: center; gap: 6px
  Left: ⚠ icon 14px (same color)

Toast errors:
  class: toast error
  auto-dismiss: NO (stays until manually closed with X button)
  X button: position:absolute top:12px right:12px btn-ghost 14px

Mic permission banner:
  position: fixed or sticky below top bar
  background: rgba(239,68,68,0.10)
  border-bottom: 1px solid rgba(239,68,68,0.25)
  padding: 12px 24px
  display: flex; align-items: center; justify-content: space-between
  Text: MicOffIcon + error message
  Action: "Open Settings" → links to browser mic settings

Retry button:
  Appears below orb in ERROR state
  class: btn-secondary
  label: "Retry Connection"
  animation: fade-up 0.3s
```

---

## 16. API Integration Points

### Base client

```typescript
// src/api/client.ts
import axios from "axios";

const BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/auth";
    }
    return Promise.reject(err);
  },
);
```

### Auth service

```typescript
// src/api/auth.ts
export const AuthAPI = {
  signup: (body: {
    name: string;
    email: string;
    password: string;
  }) => api.post("/auth/signup", body).then((r) => r.data),

  login: (email: string, password: string) => {
    const form = new URLSearchParams({
      username: email,
      password,
    });
    return api
      .post("/auth/login", form, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      .then((r) => r.data); // returns { access_token, token_type }
  },

  me: () => api.get("/auth/me").then((r) => r.data),
};
```

### Voice service

```typescript
// src/api/voice.ts
export const VoiceAPI = {
  getToken: (roomName: string, participantName: string) =>
    api
      .post("/api/token", {
        room_name: roomName,
        participant_name: participantName,
      })
      .then((r) => r.data), // returns { token, livekit_url, room_name, participant_identity }
};
```

### Token storage

```
Store:   localStorage.setItem('access_token', token)
Read:    localStorage.getItem('access_token')
Clear:   localStorage.removeItem('access_token')
On load: Check existence → if found, call /auth/me to validate → if 401, clear and redirect
```

### LiveKit integration flow

```typescript
import { Room, RoomEvent, Track } from "livekit-client";

const room = new Room();

// Event wiring (inside useVoiceAgent hook)
room.on(RoomEvent.Connected, () => setConnection("WARMING_UP"));
room.on(RoomEvent.Disconnected, () => setConnection("IDLE")); // or ERROR if unexpected
room.on(RoomEvent.Reconnecting, () => showReconnectingToast());
room.on(RoomEvent.Reconnected, () =>
  dismissReconnectingToast(),
);

room.on(
  RoomEvent.TrackSubscribed,
  (track, pub, participant) => {
    if (track.kind === Track.Kind.Audio) {
      clearWarmupTimer();
      setConnection("CONNECTED");
      track.attach(); // attaches to invisible <audio> element in DOM
    }
  },
);

room.on(RoomEvent.DataReceived, (data) => {
  const msg = JSON.parse(new TextDecoder().decode(data));
  // msg shape: { type: "transcript", role: "user"|"agent", text: "..." }
  if (msg.type === "transcript") {
    appendTranscript(msg.role, msg.text);
    if (msg.role === "user") setSpeaking("LISTENING");
    if (msg.role === "agent") setSpeaking("SPEAKING");
  }
});

// Connect sequence
async function connect() {
  setConnection("CONNECTING");
  const { token, livekit_url } = await VoiceAPI.getToken(
    "main-room",
    user.name,
  );
  await room.connect(livekit_url, token);
  await room.localParticipant.setMicrophoneEnabled(true);
  startWarmupTimer(10_000); // fallback if TrackSubscribed never fires
}
```

---

## 17. Responsive Rules

### Breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

### Auth page

| Viewport  | Layout                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `>= lg`   | Two columns. Left branding 55%, right card 45%. Gap: 64px.                                                                     |
| `md – lg` | Two columns but left shrinks. Orb: 200px. Features: 2-column grid.                                                             |
| `< md`    | Single column. Left panel hidden entirely. Card full width. Top logo strip replaces left branding (compact: logo + name only). |

### Dashboard

| Viewport  | Sidebar                                                     | Main content                |
| --------- | ----------------------------------------------------------- | --------------------------- |
| `>= lg`   | 220px fixed                                                 | Remaining width             |
| `md – lg` | 60px icon-only (labels hidden, tooltips on hover)           | Remaining                   |
| `< md`    | Hidden. Bottom tab bar (4 icons, 56px height, fixed bottom) | Full width minus bottom bar |

### Voice Room

| Viewport  | Stage                   | Transcript                                                                                                   |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `>= lg`   | 60% left                | 40% right                                                                                                    |
| `md – lg` | Full width              | Transcript hidden behind "Transcript" tab toggle button (appears in top bar). Click to open as bottom sheet. |
| `< md`    | Full width. Orb: 200px. | Bottom sheet, toggle button in top bar. Controls bar: fixed bottom.                                          |

### History

| Viewport | List                                                                                        | Viewer    |
| -------- | ------------------------------------------------------------------------------------------- | --------- |
| `>= md`  | 38% left                                                                                    | 62% right |
| `< md`   | Full screen list. Tap session → viewer slides in full-screen (back button returns to list). |

### Settings

| Viewport | Layout                                                          |
| -------- | --------------------------------------------------------------- |
| `>= md`  | Page heading + tabs + content at comfortable width              |
| `< md`   | Tabs scroll horizontally. Content full width with more padding. |

### Global responsive rules

```
Padding: 48px desktop → 24px tablet → 16px mobile
Gap:     64px desktop → 32px tablet → 24px mobile
Font sizes: use clamp() for display headings:
  font-size: clamp(1.8rem, 4vw, 2.6rem)
Orb size: clamp(180px, 30vw, 280px) — scales with viewport
```

---

## 18. Implementation Notes

### Critical — never get these wrong

1. **Font @import order:** Google Fonts `@import url(...)` must be the literal first line of the CSS file. PostCSS rejects @import after any non-@import rules.

2. **Barge-in snap:** When a user DataChannel transcript arrives while `speaking=SPEAKING`, the transition must be instant (`transition: all 0.12s`, not the usual `0.4s`). The abruptness is intentional — it mirrors the real interruption.

3. **Never mute the mic while agent speaks.** The backend VAD requires the user's audio stream at all times. This is a hard constraint from the Pipecat pipeline.

4. **Do not strip acknowledgement words** from agent transcripts post-barge-in. The LLM is explicitly instructed to begin with "Gotcha", "Sure", "Of course" etc. These are part of the UX.

5. **Login uses `application/x-www-form-urlencoded`,** not JSON. This is a FastAPI OAuth2 requirement. Sending JSON will fail.

6. **`livekit_url` comes from the token response** — not from env vars. The backend may route different users to different LiveKit servers. Always use `data.livekit_url` from the `/api/token` response.

7. **Auth page orb is always animated** (bars always bouncing). This is intentional: the orb demonstrates the product before the user signs up.

### Performance notes

- Canvas star field: draw once on mount. Do not redraw on every frame.
- Nebula divs: use CSS animations, not JS. Do not animate in JS RAF loops.
- Web Audio: create `AudioContext` only after user gesture (connect button click). Required by browser autoplay policies.
- Transcript auto-scroll: use `scrollTop = scrollHeight` inside `useEffect`, not on every render. Watch `transcripts.length` as the dependency.
- Skeleton loaders: show for 300ms minimum even if data loads faster (prevents flash).

### Accessibility floor

- All interactive elements: visible focus ring (keyboard navigation).
- Color: never convey status by color alone — always pair with icon or text label.
- Orb animations: respect `prefers-reduced-motion`. If set, stop all CSS animations. Show static orb with color-coded background only.
- Status pill: `aria-live="polite"` so screen readers announce state changes.
- Transcript: `aria-live="assertive"` on the message list so new messages are announced.
- Mic mute button: `aria-pressed` attribute toggles with mute state.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Appendix A: Product identity strings

```
Product name:    VoiceAgent
Tagline:         Speak naturally. Get instant answers.
Sub-tagline:     Enterprise-grade ASR → LLM → TTS pipeline.
Tech stack line: LiveKit · Pipecat · LangGraph · MCP
Version label:   v2.4.1 · ASR→LLM→TTS · Barge-in ready
Greeting (agent):"Hi, I'm ready!"  ← do not recreate, backend sends this
```

## Appendix B: Icon set

Use a single icon library for consistency. Recommended: `lucide-react`.

```
MicIcon, MicOffIcon           — mute controls, feature pills, orb
BrainIcon                     — LangGraph feature
ZapIcon (BoltIcon)            — interruption, fast features
WrenchIcon                    — MCP tools
UserIcon                      — name input, user bubble
MailIcon                      — email input
LockIcon                      — password input
EyeIcon, EyeOffIcon           — password toggle
ChevronRightIcon              — session row arrow
ChevronLeftIcon               — back button
CalendarIcon                  — sessions stat
ClockIcon                     — time stat
SquareIcon                    — disconnect button
Volume2Icon, VolumeXIcon      — volume controls
CheckIcon                     — save success
XIcon                         — toast close, modal close
AlertTriangleIcon             — warnings
RefreshCwIcon                 — retry button
DownloadIcon                  — export transcript
CopyIcon                      — copy to clipboard
SettingsIcon                  — settings nav
HistoryIcon                   — history nav
LogOutIcon                    — logout
```

## Appendix C: File structure

```
src/
├── styles/
│   ├── global.css          ← @import fonts FIRST, then tailwind, then base resets
│   ├── animations.css      ← all @keyframes from §3
│   └── theme.css           ← all CSS custom properties from §1
├── api/
│   ├── client.ts           ← axios instance with JWT interceptor
│   ├── auth.ts             ← AuthAPI.login, .signup, .me
│   └── voice.ts            ← VoiceAPI.getToken
├── hooks/
│   ├── useAuth.ts          ← JWT management, user state, login/logout
│   └── useVoiceAgent.ts    ← LiveKit room, connection state, transcripts, speaking state
├── store/
│   └── appStore.ts         ← Zustand store (or React Context) for AppState
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Toast.tsx
│   │   ├── StatusPill.tsx
│   │   └── SkeletonLoader.tsx
│   ├── voice/
│   │   ├── Orb.tsx             ← the central animated orb, state-driven
│   │   ├── AudioVisualizer.tsx ← bar array, mode prop
│   │   ├── TranscriptBubble.tsx
│   │   ├── TranscriptPanel.tsx
│   │   ├── PipelineStrip.tsx
│   │   ├── WaveformStrip.tsx
│   │   ├── StartupHint.tsx
│   │   └── Controls.tsx
│   ├── auth/
│   │   ├── AuthCard.tsx        ← the right glass card
│   │   ├── PipelineViz.tsx     ← ASR→LLM→TTS visualizer
│   │   └── FeaturePills.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       ├── Background.tsx      ← canvas + nebulas + particles
│       └── PageTransition.tsx  ← route transition wrapper
├── pages/
│   ├── AuthPage.tsx
│   ├── DashboardPage.tsx
│   ├── VoiceRoomPage.tsx
│   ├── HistoryPage.tsx
│   └── SettingsPage.tsx
└── main.tsx
```

---

_End of document. Every design decision is documented here. When in doubt: darker backgrounds, more generous spacing, subtler borders, and more intentional motion._