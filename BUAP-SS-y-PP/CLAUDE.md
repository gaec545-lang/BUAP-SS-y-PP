## SKILLS
Antes de escribir cualquier componente, lee los tres archivos SKILL.md en `.claude/skills/`. Contienen las reglas de diseño, animaciones y patrones de UI que definen la calidad visual de este proyecto. Aplicarlos no es opcional.

---

## Design Philosophy

### The Three Rules
1. **Breathing room over density.** When in doubt, add more whitespace. A card with 24px padding looks professional; a card with 8px padding looks like a homework assignment.
2. **One focal point per view.** Every screen has ONE element the user's eye should land on first. Design the hierarchy to guide there. Everything else supports that focal point.
3. **Restraint is sophistication.** Two colors, one font family, consistent spacing. The amateur instinct is to add more; the professional instinct is to remove.

### Anti-Patterns to Avoid
- Rainbow color schemes where each section uses a different accent color
- Shadows darker than `shadow-sm` on cards (heavy shadows look dated)
- Rounded corners larger than `rounded-xl` on containers (pill shapes everywhere screams "I just learned border-radius")
- Gradients on backgrounds (flat solid colors look more modern)
- More than 2 font weights on the same screen (400 for body, 600 for headings is enough)
- Icon + text + icon sandwich on every button (pick one: icon OR text, rarely both)
- Colored backgrounds on every section (alternate white and one subtle surface color, that's it)

---

## Tailwind Configuration Standards

### Custom Config Structure
```js
// tailwind.config.js — always extend, never replace defaults
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Project colors — semantic naming, not color naming
      colors: {
        primary: {
          50: '#EBF5FF',
          100: '#D6EBFF',
          200: '#ADD6FF',
          300: '#85C2FF',
          400: '#5CADFF',
          500: '#3399FF',  // base
          600: '#0066CC',  // hover/active
          700: '#004D99',
          800: '#003366',  // dark accent
          900: '#001A33',
        },
        surface: {
          DEFAULT: '#F8F9FA',
          card: '#FFFFFF',
          hover: '#F1F3F5',
          border: '#E9ECEF',
          divider: '#DEE2E6',
        },
        content: {
          primary: '#1A1A2E',
          secondary: '#6C757D',
          tertiary: '#ADB5BD',
          inverse: '#FFFFFF',
        },
        // Status colors — use sparingly, only for actual status indicators
        success: { light: '#D1FAE5', DEFAULT: '#198754', dark: '#0F5132' },
        warning: { light: '#FFF3CD', DEFAULT: '#FFC107', dark: '#664D03' },
        danger: { light: '#F8D7DA', DEFAULT: '#DC3545', dark: '#842029' },
        info: { light: '#CFF4FC', DEFAULT: '#0DCAF0', dark: '#055160' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Tighter scale for UI (not editorial)
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.5rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['2rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'badge': '6px',
        'input': '8px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'dropdown': '0 4px 16px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'modal': '0 20px 60px -12px rgb(0 0 0 / 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'progress': 'progress 1s ease-out forwards',
        'count-up': 'countUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        progress: { '0%': { width: '0%' }, '100%': { width: 'var(--progress-width)' } },
        countUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      transitionTimingFunction: {
        'bounce-sm': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
```

---

## Component Design Patterns

### Card Pattern (the most used component)
```jsx
// GOOD: Subtle, clean, professional
<div className="bg-white rounded-card border border-surface-border p-6 shadow-card
                hover:shadow-card-hover transition-shadow duration-200">
  {/* content */}
</div>

// BAD: Heavy shadow, thick border, over-rounded
<div className="bg-white rounded-3xl border-2 border-gray-300 p-4 shadow-lg">
  {/* content */}
</div>
```

### Status Badge Pattern
```jsx
// Use background tints, NOT solid colored backgrounds
// Solid color badges look like error messages; tinted badges look like status indicators
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge
                 text-xs font-medium bg-success-light text-success-dark">
  <span className="w-1.5 h-1.5 rounded-full bg-success" />
  Completado
</span>

// For "in progress" / "current" state — use the soft pulse animation
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge
                 text-xs font-medium bg-info-light text-info-dark">
  <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse-soft" />
  En curso
</span>

// For "pending" / "not started" — muted, no animation
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge
                 text-xs font-medium bg-gray-100 text-gray-500">
  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
  Pendiente
</span>
```

### Header / Navbar Pattern
```jsx
// Sticky header with subtle bottom border — NOT a heavy shadow
<header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-border">
  <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
    {/* Logo left, nav center or right */}
  </div>
</header>
```

### Sidebar Navigation Pattern
```jsx
// Active item: tinted background + bold text + left accent
<nav className="w-64 bg-white border-r border-surface-border p-4 space-y-1">
  {/* Active */}
  <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg
               bg-primary-50 text-primary-700 font-medium
               border-l-2 border-primary-500">
    <Icon size={18} />
    <span>Dashboard</span>
  </a>
  {/* Inactive */}
  <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg
               text-content-secondary hover:bg-surface-hover hover:text-content-primary
               transition-colors duration-150">
    <Icon size={18} />
    <span>Documentos</span>
  </a>
</nav>
```

### Empty State Pattern
```jsx
// When there's no data to show — never leave a blank area
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
    <FileText className="w-6 h-6 text-content-tertiary" />
  </div>
  <h3 className="text-lg font-semibold text-content-primary mb-1">
    Sin documentos pendientes
  </h3>
  <p className="text-sm text-content-secondary max-w-sm">
    Todos los documentos de esta etapa han sido generados y descargados.
  </p>
</div>
```

---

## Spacing System

Use a consistent spacing scale. The most common mistake is inconsistent padding/margins.

- **Between sections:** `space-y-8` or `gap-8` (32px)
- **Between cards in a grid:** `gap-6` (24px)
- **Inside a card (padding):** `p-6` (24px) for standard cards, `p-5` (20px) for compact cards
- **Between a heading and its content:** `mb-4` (16px)
- **Between a label and its input:** `mb-1.5` (6px)
- **Between list items:** `space-y-3` (12px) for tight lists, `space-y-4` (16px) for cards in list
- **Page padding (horizontal):** `px-6` for content area, `px-4` on mobile

### The 8px Grid Rule
All spacing should be multiples of 4px, preferring multiples of 8px for major structural spacing. Tailwind's default scale follows this (4=16px, 6=24px, 8=32px). Don't mix values like `p-[13px]` or `gap-[7px]` — they break the rhythm.

---

## Typography Hierarchy

### For Dashboard / Portal UIs
```
Page title:       text-2xl font-semibold text-content-primary     (20px, 600)
Section heading:  text-lg font-semibold text-content-primary      (16px, 600)
Card title:       text-base font-medium text-content-primary      (14px, 500)
Body text:        text-sm text-content-secondary                  (13px, 400)
Caption/meta:     text-xs text-content-tertiary                   (12px, 400)
Badge/label:      text-xs font-medium                             (12px, 500)
Monospace data:   text-sm font-mono text-content-primary          (13px, 400)
```

### Rules
- NEVER use `font-bold` (700) in a dashboard UI. Use `font-semibold` (600) for titles and `font-medium` (500) for emphasis. Bold is too heavy for interface text.
- NEVER use `text-black`. Use `text-content-primary` which is a near-black (#1A1A2E) that's softer on the eyes.
- Monospace font (`font-mono`) is ONLY for: matrícula numbers, folio codes, dates in tables, and technical identifiers. Never for regular text.

---

## Color Usage Rules

- **Primary color:** Buttons, active states, links, progress indicators. That's it. If more than 30% of the visible screen is your primary color, you're overusing it.
- **Surface colors:** The majority of the interface. White cards on a light gray (#F8F9FA) background is the default layout.
- **Status colors:** ONLY for actual status indicators (badges, progress, alerts). Never use red for a regular heading or green for a decorative border.
- **Text colors:** Three tiers maximum. Primary for headings and important text, secondary for body and descriptions, tertiary for metadata and captions.

### The 60-30-10 Rule
60% surface colors (whites, grays), 30% content colors (text in various weights), 10% accent/primary color. If your UI feels "too colorful," you've broken this ratio.

---

## Responsive Breakpoints

For portal/dashboard UIs, design for these widths:
- **1366px:** Standard laptop (your primary design target)
- **1024px:** Small laptop / large tablet
- **768px:** Tablet
- **Mobile:** Not a priority for internal tools, but don't let it completely break

The sidebar should collapse to an icon-only rail at `lg` breakpoint and to a hamburger menu at `md` breakpoint.

---

## Data Display Patterns

### Stats / KPI Row
```jsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-white rounded-card border border-surface-border p-5">
    <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1">
      Paso actual
    </p>
    <p className="text-2xl font-semibold text-content-primary">9 de 17</p>
    <p className="text-xs text-content-secondary mt-1">Inscripción formal</p>
  </div>
</div>
```

### Progress Stepper (horizontal)
```jsx
// Each step is a circle connected by a line
// Completed: solid primary circle + primary line
// Current: primary circle with pulse + gray line ahead
// Pending: gray circle + gray line
// CRITICAL: The stepper must be scrollable horizontally if steps > 6
```

### Table / List Hybrid
For data that needs structure but isn't a full spreadsheet, use a list of cards rather than a table:
```jsx
<div className="divide-y divide-surface-divider">
  {items.map(item => (
    <div key={item.id}
         className="flex items-center justify-between py-4 px-1
                    hover:bg-surface-hover rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <StatusBadge status={item.status} />
        <div>
          <p className="text-sm font-medium text-content-primary">{item.name}</p>
          <p className="text-xs text-content-secondary">{item.description}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-content-tertiary" />
    </div>
  ))}
</div>
```

---

## Critical Rules Summary

1. Use `shadow-card` not `shadow-lg`. Subtle shadows only.
2. Use `rounded-card` (12px) for cards, `rounded-button` (8px) for buttons. Never `rounded-full` on cards.
3. Use `border border-surface-border` on every card. Borderless cards floating on gray backgrounds look unfinished.
4. Every interactive element needs `transition-*` with `duration-150` or `duration-200`. Never instant state changes.
5. Use `backdrop-blur-md` on sticky headers and modals for the frosted glass effect.
6. Stagger animations when multiple elements enter: `style={{ animationDelay: `${index * 75}ms` }}`.
7. Never put more than 4 items in a horizontal row of stat cards. 2-3 is ideal.
8. Every page needs a clear page title at the top-left with breadcrumbs above it.
9. Loading states use skeleton placeholders (animated gray boxes), never spinners.
10. Icons are 16px for inline, 18px for nav items, 20px for card headers, 24px for empty states. Never larger.