# Huskdesk — Design System

## Brand tokens

| Token | Value | Usage |
|---|---|---|
| `--pink` | `#f29ad7` | Active nav item, feature strip, accent |
| `--lime` | `#dfff00` | Primary CTA, brand mark, accent-word highlight |
| `--lavender` | `#c7b6ff` | Workspace icons, focus ring, accent labels |
| `--ink` | `#111111` | Text on light backgrounds, button borders |
| `--bg` | `#fafaf7` | Page background (light) |
| `--surface` | `#ffffff` | Card backgrounds, sidebar, topbar |
| `--grid` | `#deded8` | Graph-paper grid lines |
| `--shadow` | `4px 4px 0 #171717` | Hard offset shadow (brutalist) |

---

## Fonts

- **Interface**: Inter → "Segoe UI" → system-ui → sans-serif (no external request)
- **Display/headings**: Sora → Inter → "Segoe UI" → sans-serif (no external request)
- Sora is used for `.display-title`, `.brand-name`, `.stat-number`, `.section-title-row h3`

No Google Fonts or external font requests are made. The fonts are loaded from system/browser fallback stacks.

---

## Dark theme

Applied via `[data-theme="dark"]` on `<html>`. Triggered by the theme toggle button, persisted in `localStorage` under `huskdesk-theme`.

Dark theme uses the same brand accent colors (`--pink`, `--lime`, `--lavender`) with adjusted surface, background, border, and text tokens.

---

## Grid background

A 24×24px graph-paper grid using CSS `background-image` with two linear-gradient layers:

```css
.grid-bg {
  background-image:
    linear-gradient(to right, var(--grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

Used on the popup shell and dashboard welcome panels.

---

## Visual direction: editorial brutalism

- Strong geometric headings, tight letter-spacing (`-0.055em`+)
- Outlined panels with 1–2px solid borders, not box-shadow blur
- Hard offset shadows: `4px 4px 0 currentColor` — no blur, no spread
- Selective use of accent colors as fills, not decorative gradients
- Small corner radii (`3px`, `7px`, `11px`) — no pill shapes
- Intentional asymmetry in the welcome panel (circle ring decoration, top-right offset)
- No glassmorphism, no generic gradients, no generic SaaS patterns

---

## Component catalog

### Buttons
| Class | Color | Use case |
|---|---|---|
| `.btn-primary` | `--lime` fill, hard shadow | Primary CTA |
| `.btn-secondary` | `--surface` fill | Secondary action |
| `.btn-quiet` | Transparent, border on hover | Tertiary / inline action |
| `.btn-danger` | Red fill | Destructive action (delete) |
| `.btn-danger-quiet` | Red text, no fill | Destructive inline action |

### Labels
| Class | Color | Use case |
|---|---|---|
| `.accent-label.accent-pink` | `--pink` | Feature callout |
| `.accent-label.accent-lime` | `--lime` | Status badge |
| `.accent-label.accent-lavender` | `--lavender` | Metadata badge |

### Cards
- `.surface-card` — bordered, rounded, light surface background
- `.feature-card` — thick border, hard offset shadow, used for hero/featured sections

### States
- **Empty state** (`.empty-state`) — dashed border, centered icon + text + CTA
- **Loading** — inline `—` or "Loading…" text, no spinner
- **Error** (`.dashboard-notice--error`) — red border/background notice
- **Success** (`.dashboard-notice--success`) — green border/background notice
- **Info** (`.dashboard-notice--info`) — lavender-bordered notice

---

## Layout

### Dashboard
- Sidebar (226px) + main content area using CSS Grid
- Sidebar collapses to horizontal scroll row at mobile (`< 640px`)
- 12-column grid inside dashboard main for flexible widget layout

### Popup
- Fixed 360px wide
- Stacked sections: header → hero → notice → workspace list → footer

---

## Accessibility

- All interactive elements have visible focus rings (3px `--lavender` outline)
- All buttons have `aria-label` when their visible label is insufficient (icon-only buttons)
- Current nav page announced via `aria-current="page"`
- Status messages use `role="status"` and `aria-live="polite"`
- Checkboxes in hibernation include `aria-label`
- `@media (prefers-reduced-motion: reduce)` disables all transitions and animations
- Semantic `<nav>` with `aria-label` for both navigation groups
- `<ul role="list">` used for workspace lists
- Main content area has `id="main-content"` and `tabIndex={-1}` for skip links

---

## Known limitations

- No system font download — Sora may not be available on all systems; Inter is the fallback
- No icon font used — icons are Unicode characters (▤, ◈, ◫, etc.) which may vary by OS
- No skip-to-main-content link is currently implemented in the popup
