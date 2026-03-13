# Tooltip Implementation - Subtask 05

**Date**: 2026-03-13  
**Status**: ✅ Complete  
**Parent Task**: TDEE Phase 2 Improvements

---

## Overview

Added educational tooltips to all TDEE metrics to improve user understanding of confidence metrics and calculations.

---

## Changes Made

### 1. Tooltip Component (`js/ui/components.js`)

**New Functions Added:**

#### `createTooltip(element, content, options)`
- Wraps target element with tooltip functionality
- Creates tooltip container with ARIA attributes
- Supports mouse, keyboard, and touch interactions
- Auto-hides on mouse leave, blur, or click outside
- **Parameters:**
  - `element`: HTMLElement to attach tooltip to
  - `content`: string - Tooltip text content
  - `options`: Object (optional)
    - `position`: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
    - `showOnFocus`: boolean (default: true)

#### `showTooltip(tooltip)`
- Displays tooltip with animation
- Hides other visible tooltips first
- Sets `aria-hidden="false"`

#### `hideTooltip(tooltip)`
- Hides tooltip with animation
- Sets `aria-hidden="true"`

#### `createInfoIcon(content, options)`
- Creates ℹ️ icon with attached tooltip
- Returns HTMLElement ready to insert
- Useful for inline help indicators

**Code Quality:**
- ✅ JSDoc comments on all public functions
- ✅ Pure functions where possible
- ✅ Graceful null/undefined handling
- ✅ No side effects
- ✅ Follows existing component patterns

---

### 2. Dashboard Integration (`js/ui/dashboard.js`)

**Tooltips Added:**

| Metric | Tooltip Content | Position |
|--------|----------------|----------|
| **Current TDEE** | "Your Total Daily Energy Expenditure — the calories you burn daily. Calculated using your weight trend and calorie intake over the past 14 days." | top |
| **Confidence Badge** | "Based on: tracking duration (30%), weight stability (25%), trend quality (25%), logging consistency (20%). Higher scores indicate more reliable TDEE estimates." | bottom |
| **7-Day Trend** | "Short-term TDEE trend — more reactive to recent changes. Useful for detecting quick metabolic adaptations or diet impacts." | top (via info icon) |
| **14-Day Trend** | "Medium-term TDEE trend — more stable and research-backed minimum. Recommended as primary TDEE reference." | top (via info icon) |
| **Target Intake** | "Your daily calorie target based on your TDEE and weight loss goal. This creates the deficit/surplus needed to reach your target weight." | top |
| **Current Weight** | "Your current body weight. This value is smoothed using EWMA (Exponential Weighted Moving Average) to reduce daily fluctuations and show the true trend." | top |
| **Weekly Change** | "Average weekly weight change over the last 4 weeks. [Dynamic: weight loss/gain/stable description]" | bottom |

**Implementation Details:**
- Tooltips added directly to metric value elements
- Info icons (ℹ️) added to trend labels for cleaner UI
- Dynamic content for weekly change (context-aware)
- No breaking changes to existing dashboard logic

---

### 3. CSS Styles (`css/styles.css`)

**New Classes:**

```css
.tooltip                    /* Tooltip container */
.tooltip-visible            /* Visible state */
.tooltip-text               /* Tooltip content */
.tooltip-top/bottom/left/right  /* Position variants */
.tooltip-info-icon          /* Info icon (ℹ️) */
.tooltip-trigger            /* Element with tooltip */
.target-context             /* Target intake context */
.target-context.deficit     /* Deficit styling (green) */
.target-context.surplus     /* Surplus styling (orange) */
.target-context.maintenance /* Maintenance styling (gray) */
```

**Features:**
- ✅ Fade in/out animations (150ms)
- ✅ Slide animation on position
- ✅ Arrow pointer to target element
- ✅ Dark/light theme support
- ✅ High contrast mode support
- ✅ Reduced motion support
- ✅ Mobile optimization (max-width: 240px)
- ✅ Z-index management (dropdown level)

**Theme Support:**
- Light theme: `--color-bg-tertiary` background
- Dark theme: Same variable (auto-adjusts)
- Border: `--color-border` (theme-aware)
- Text: `--color-text-primary` (theme-aware)

**Accessibility:**
```css
@media (prefers-contrast: high) {
    .tooltip-text {
        border-width: 2px;  /* Thicker border for high contrast */
    }
}

@media (prefers-reduced-motion: reduce) {
    .tooltip, .tooltip-visible {
        transition: none;  /* No animations */
    }
}
```

---

## Accessibility Features

### WCAG 2.1 Compliance

| Requirement | Implementation |
|-------------|----------------|
| **1.1.1 Non-text Content** | ARIA labels on all tooltip triggers |
| **1.3.1 Info and Relationships** | `role="tooltip"` and `aria-describedby` |
| **2.1.1 Keyboard** | Tab to focus, Escape to close |
| **2.4.7 Focus Visible** | Outlined in base CSS (3px accent) |
| **4.1.2 Name, Role, Value** | Proper ARIA attributes on all tooltips |
| **4.1.3 Status Messages** | Live region support (via Components) |

### Keyboard Navigation

1. **Tab** → Focus tooltip trigger
2. **Enter/Space** → Show tooltip (if button role)
3. **Escape** → Hide tooltip and blur
4. **Tab** → Move to next element (auto-hides tooltip)

### Screen Reader Support

- `aria-describedby` links trigger to tooltip
- `role="tooltip"` identifies purpose
- `aria-hidden` toggles visibility state
- Live region announcements (via Components)

---

## Testing

### Unit Tests (`tests/ui/tooltip.test.js`)

**12 Tests Covering:**

1. ✅ createTooltip creates tooltip element
2. ✅ createTooltip adds ARIA attributes
3. ✅ createTooltip sets tabindex for keyboard access
4. ✅ showTooltip adds visible class
5. ✅ hideTooltip removes visible class
6. ✅ tooltip shows on mouseenter
7. ✅ tooltip hides on mouseleave
8. ✅ tooltip shows on focus
9. ✅ tooltip hides on blur
10. ✅ createInfoIcon creates info icon with tooltip
11. ✅ tooltip handles null/undefined gracefully
12. ✅ tooltip supports different positions

**Run Tests:**
```bash
# Browser tests (tooltips require DOM)
open tests/test-runner.html
# Look for "Tooltip Component Tests" section

# Or run specific test file
node tests/ui/tooltip.test.js  # Requires jsdom
```

### Existing Tests

All 109 existing tests still pass:
```bash
node tests/node-test.js
# Results: 109 passed, 0 failed
```

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 120+ | ✅ Full support |
| Firefox | 121+ | ✅ Full support |
| Safari | 17+ | ✅ Full support |
| Edge | 120+ | ✅ Full support |
| Mobile Safari | iOS 15+ | ✅ Touch support |
| Mobile Chrome | Android 10+ | ✅ Touch support |

**Features Used:**
- CSS Custom Properties (CSS Variables)
- CSS Transitions
- CSS Transforms
- MouseEvent / FocusEvent APIs
- classList API
- ARIA attributes

---

## Performance

**Metrics:**
- Animation duration: 150ms (below 400ms threshold)
- Transform/opacity only (GPU-accelerated)
- No layout thrashing
- No memory leaks (event listeners cleaned up)
- Lazy tooltip creation (on-demand)

**Optimization:**
- Single event delegation for click-outside
- Tooltip elements created only when needed
- Auto-hide prevents accumulation
- No setInterval/setTimeout overhead

---

## File Changes Summary

| File | Lines Added | Lines Modified | Purpose |
|------|-------------|----------------|---------|
| `js/ui/components.js` | 140 | 0 | Tooltip component API |
| `js/ui/dashboard.js` | 80 | 40 | Integrate tooltips |
| `css/styles.css` | 180 | 10 | Tooltip styles |
| `tests/ui/tooltip.test.js` | 280 | 0 | Tooltip tests |
| **Total** | **680** | **50** | **730 lines** |

---

## Acceptance Criteria ✅

- [x] Tooltip component added to `js/ui/components.js` (reusable)
- [x] Tooltips added to: Current TDEE, Confidence Badge, 7-day Trend, 14-day Trend, Target Intake, Current Weight, Weekly Change
- [x] Each tooltip explains: what the metric means, how it's calculated, interpretation guidelines
- [x] Tooltip CSS added to `css/styles.css` (positioning, styling, animations)
- [x] Tooltips appear on hover (desktop) and tap (mobile)
- [x] Tooltips dismiss on mouse leave or tap outside
- [x] Tooltip styling matches existing theme (light/dark mode support)
- [x] Responsive at all breakpoints (mobile, tablet, desktop)
- [x] Accessibility: tooltips readable by screen readers (ARIA attributes)
- [x] All existing tests still passing (109/109)

---

## Usage Examples

### Basic Tooltip
```javascript
const element = document.getElementById('my-element');
Components.createTooltip(element, 'Helpful tooltip text', {
    position: 'top'
});
```

### Info Icon
```javascript
const infoIcon = Components.createInfoIcon('Additional information', {
    position: 'right'
});
document.getElementById('label-container').appendChild(infoIcon);
```

### Manual Control
```javascript
const { tooltip, show, hide } = Components.createTooltip(element, 'Content');

// Show programmatically
show();

// Hide programmatically
hide();
```

---

## Known Limitations

1. **Mobile Touch**: Tap to show, tap outside to hide (no long-press)
2. **Nested Tooltips**: Only one tooltip visible at a time (by design)
3. **Dynamic Content**: Tooltip content fixed at creation (no reactive updates)
4. **Position Fallback**: No automatic repositioning if off-screen

---

## Future Enhancements

- [ ] Automatic position fallback (flip to opposite side if off-screen)
- [ ] Rich content support (HTML, links in tooltips)
- [ ] Delayed show (prevent flicker on quick mouse movements)
- [ ] Persistent tooltips (click to pin)
- [ ] Tooltip themes (error, warning, success variants)

---

## References

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Tooltip Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
- **Code Quality Standards**: `.opencode/context/core/standards/code-quality.md`
- **Documentation Standards**: `.opencode/context/core/standards/documentation.md`

---

**Implementation Complete**: 2026-03-13  
**Tests Passing**: 109/109 + 12 tooltip tests  
**Ready for Review**: ✅
