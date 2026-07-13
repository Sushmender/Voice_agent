# Design System & Aesthetics

The Voice Agent is an enterprise-grade AI application. The UI must feel premium, responsive, and trustworthy. We enforce a "Dark Mode First" aesthetic with vibrant accents and smooth micro-interactions.

## 1. Color Palette

Use these specific hex codes to ensure consistency with the established brand identity.

### Backgrounds
- **Base Background:** `#0d0f14` (Deepest blue/black, use for `<body>`)
- **Surface / Card:** `#161b27` (Slightly lighter, for main UI containers)
- **Input Background:** `#0d1018`
- **Borders:** `#1e2a3a` (Subtle dividers and input borders)

### Typography
- **Primary Text:** `#f0f4ff` (Headings, primary values)
- **Secondary Text:** `#e2e8f0` (Body text, standard labels)
- **Tertiary Text:** `#7a8aa0` (Muted labels, placeholders, timestamps)

### Accents & Status
- **Primary Brand (Blue):** `#3b82f6`
- **Primary Gradient:** `linear-gradient(135deg, #3b82f6, #6366f1)` (Use for primary CTA buttons and active visualizers)
- **Success (Green):** `#22c55e` (Connected state dot, User transcript text)
- **Warning (Orange/Yellow):** `#f59e0b` (Warming up / Connecting state dot)
- **Error/Danger (Red):** `#ef4444` (Disconnected button, Error messages)

## 2. Typography

- **Font Family:** `Inter`, `Segoe UI`, sans-serif.
- **Headings:** Font weight 700, tight letter-spacing (`-0.3px`).
- **Labels:** Uppercase, font weight 600, wide letter-spacing (`0.6px`), small font size (`0.75rem`).
- **Body:** Font weight 400 or 500, line height 1.5 or 1.6.

## 3. Micro-Interactions & Animations

An interface that feels "alive" builds trust with voice agents. Implement the following CSS animations:

### A. The "Warming Up" Pulse
When the agent is booting, the status dot should pulse to indicate background activity.
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
/* Apply to the yellow status dot with 1s infinite duration */
```

### B. The Audio Visualizer Bounce
When the agent is connected, display a CSS bar visualizer. Ensure each bar has a slightly different animation delay to simulate audio frequencies.
```css
@keyframes bounce {
  0%, 100% { height: 4px; }
  50% { height: 32px; }
}
/* Apply to a flex row of bars, delays: 0s, 0.1s, 0.2s, 0.3s, 0.4s... */
```

### C. Button Interactions
All clickable elements must respond immediately to interaction.
- **Hover:** Slight brightness increase or border color change.
- **Active (Click):** `transform: scale(0.97)` to give physical click feedback.

## 4. UI Elements

### The Main Card
The primary interface should be centered on the screen within a "Card" component.
- **Border Radius:** `20px`
- **Padding:** `40px 48px`
- **Box Shadow:** `0 24px 64px rgba(0,0,0,0.5)` (Provides deep depth against the dark background)

### The Transcript Box
- Must have a subtle background (`#0d1018`) and an inset border (`1px solid #1e2a3a`).
- **User Messages:** Colored `#22c55e` (Green) or prefixed with "🧑 You:".
- **Agent Messages:** Colored `#6366f1` (Indigo/Blue) or prefixed with "🤖 Agent:".
- Must auto-scroll smoothly when new messages arrive.
