---
name: Bright Classroom
description: A clean, colorful classroom dashboard in the spirit of Google Classroom.
colors:
  canvas-light: "#f3f6fb"
  surface-light: "#ffffff"
  ink-light: "#1f1f1f"
  ink-2-light: "#555a61"
  rule-light: "#dadce0"
  accent-green: "#137333"
  canvas-dark: "#131417"
  surface-dark: "#1e1f22"
  raised-dark: "#26282c"
  ink-dark: "#e8eaed"
  ink-2-dark: "#aab0b8"
  rule-dark: "#34373c"
  accent-green-dark: "#6dd58c"
  class-banners:
    [
      "#1967d2",
      "#137333",
      "#8430ce",
      "#c5221f",
      "#007b83",
      "#b05a00",
      "#c2185b",
      "#3949ab",
    ]
typography:
  family: "Google Sans Flex Variable, Google Sans, Roboto, system-ui, sans-serif"
  title-page:
    fontSize: "46px"
    fontWeight: 540
    lineHeight: 1.1
  title-section:
    fontSize: "24px"
    fontWeight: 540
  title-item:
    fontSize: "19px"
    fontWeight: 600
  body:
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  small: "6px"
  control: "8px"
  button: "999px"
  panel: "16px"
  dialog: "24px"
spacing:
  base: "4px"
  control-height: "44px"
  control-height-compact: "36px"
  pad-card: "32px (16px on phones)"
  pad-dialog: "24px"
  section-gap: "32px"
---

# Design System: Bright Classroom

## Overview

**North Star: a friendly, colorful classroom dashboard**, modeled on Google Classroom. Each class has its own banner color so teachers find it at a glance; white cards sit on a cool, faintly tinted canvas; type is one clean sans. Keep the Class Connect name and checkmark mark.

All values live in `app/styles/tokens.css`; screens never introduce raw colors. Stylesheets in `app/styles/` load in this order: tokens, base, overlays, shell, then one file per area (home, attendance, history, activities, scanner, settings, help, auth).

## Colors

Light uses a cool `#f3f6fb` canvas, white surfaces, and Google-style grays (`--ink`, `--ink-2`, `--rule`). Dark uses neutral charcoal surfaces. Green, Teal, Blue, Indigo, Purple, Berry, Coral, and Amber change `--accent`, its tints, and a 3% canvas tint. Class banners take their color from their theme (see Components); `--class-*` colors remain for student avatars. All carry white text at 4.5:1 or better. Attendance status colors (`--status-*`) are independent of the theme: Present, Late, and Excused use solid fills when selected; Absent, the starting state, stays a calm tint. Every text pair meets WCAG AA in all 16 theme/accent combinations.

## Typography

Google Sans Flex (open source, OFL) for everything; `--font-display` is an alias kept for large titles and numbers. The scale steps by about 1.25: 12, 13, 15, 19, 24, 30, 37, 46 px, plus `--display-lg` (60) and `--display-xl` (76) for big numbers. Numbers use tabular figures. Eyebrow labels are 12px uppercase with 0.06em tracking.

Four weights, used the same way everywhere: `--weight-regular` (400) body, `--weight-medium` (540) display headings and message text, `--weight-semibold` (600) labels, buttons and small titles, `--weight-bold` (700) numbers and emphasis.

Headings use roles, not sizes: `--title-page` for the page banner (46px; 30px on phones), `--title-section` for card and dialog titles, `--title-item` for subsections and side panels, `--text-meta` for supporting text and `--text-caption` for tags. Headings, buttons and labels are sentence case.

## Layout

Space comes from a 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96; no other spacing values (1–2px hairlines aside). Cards pad by `--pad-card` (32px, 16px on phones) and dialogs by `--pad-dialog` (24px); stacked sections are 24px apart. The shell is a 248px sidebar (72px collapsed), and content up to 1200px. Home is a responsive grid of class cards (`minmax(280px, 1fr)`), one column on phones. Breakpoints are 1100px (tablet: roster rows become cards, Settings index becomes tabs) and 720px (phone: drawer navigation, stacked controls). Pages scroll vertically; only wide tables scroll inside their own container.

## Elevation & Depth

Panels and cards rest flat with a 1px rule. Class cards lift with `--shadow-float` on hover or focus; menus, pickers, messages, and dialogs use `--shadow-float` and `--shadow-dialog`.

## Shapes

Buttons are pills; inputs and the status control use 8px corners, at least 44px tall (status buttons 40px inside a 44px group). Panels and cards use 16px; dialogs 24px; small things (keys, text buttons, tab marks) 6px. Every control is 44px or, when compact, 36px. The selected navigation item is a tinted pill.

## Components

- **Class card:** colored banner (status pill, class name, time, period number in a circle) linking to attendance; body with today's count and status bar; footer with attendance and history icon links. The class in session gets a 2px ring in its banner color.
- **Page color:** the banner's color is set on `<main>` as `--page-color` (with `--page-tint` and `--page-ink`) and carries down the page in small doses: the roster header, active activity tab, prompt stage, and empty-state icons.
- **Roster rows:** a colored avatar per student (purple, teal, pink, indigo, brown; never a status hue) and a 4px edge in the status color for present, late, and excused.
- **Page banner:** every page except Home opens with a colored banner (white title, soft discs), the same height and title size everywhere. Attendance, History, and Activities use the selected class's color; other pages use `--accent-banner`. The scanner panel's header uses the same treatment. Manage classes shows each class's color as a numbered chip.
- **Scanner button:** a floating Bluetooth-blue (`--bluetooth`) circle, bottom right on every classroom page, that widens to show its label ("Connect scanner", "Scanner on · P3") on hover or keyboard focus. One tap connects; once on it pulses and opens Scanner setup. Toasts stack above it.
- **Class banners:** each class has a Google Classroom-style banner: one of ten illustrated themes (transparent white art in `public/banners/`, catalog in `lib/class-themes.ts`) over any of ten palette colors, or the teacher's own photo under a dark scrim. Defaults come from the period number. Chosen from **Customize** on the class page; saved to the account with migration 014, otherwise in this browser (`components/class-banners.tsx`). The banner color becomes the class's `--banner` and page color.
- **Status control:** four buttons (Present, Absent, Late, Excused) with the letter shown on very narrow screens. Arrow keys move focus without saving; Enter, Space, or a click saves. A single highlight slides (240ms) to the chosen status.
- **Status bar:** a proportional bar that always sits beside the same counts in text.
- **Buttons:** primary is a solid accent pill; secondary is an outlined pill; danger is a solid red pill for anything destructive; tertiary is an underlined text button. On a colored banner, secondary buttons turn white.
- **Dialogs:** every dialog starts with `DialogHead` (`components/ui.tsx`): the title at `--title-section` with × at the top right, and an optional line under it. Actions sit at the bottom right with the main action last. `Modal` wraps this for most dialogs.
- **Messages:** `.notice` is the one message block, in `error`, `warning` (amber), `success` or `info` (accent tint), optionally with an action button. Text under a field is `.field-error` or `.field-success`; help text is `.hint`. Toasts and the undo pill float; everything else uses these.
- **Choices:** `.segmented` is the one segmented control (Settings theme, login theme, roster import method): a track whose pressed option fills with the accent tint. Every dropdown is `CustomSelect`. `.chip` is a pressable quick choice.
- **Tags and badges:** `.badge.<status>` for attendance statuses; `.tag` for small labels beside a name (neutral, `.page` in the page color for notes, `.success` for ready).

Motion is 150ms color, border, and shadow transitions. A scanner check-in briefly tints its roster row. Reduced-motion preferences remove decorative motion. Every keyboard action has a 2px accent focus ring.

## Do's and Don'ts

- Do keep class, scanner, attendance, and editing state visible and explicit.
- Do use tokens and existing primitives instead of new colors or one-off components.
- Don't add raw px font sizes, font weights, radii, spacing or hex colors outside `tokens.css` (shadows and the theme swatches aside).
- Don't add a new message, dialog header, pill or segmented style; use the ones above.
- Don't use gradients, glass cards, or emoji icons.
- Don't recolor attendance states with the theme or rely on color alone for meaning.
