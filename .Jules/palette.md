# Palette Journal
## 2025-04-06 - Accessible Buttons
**Learning:** Adding `aria-label`s and focus states (`focus-visible:ring-2`) to icon-only buttons in the shopping list ensures better keyboard and screen-reader accessibility without compromising visual aesthetics.
**Action:** Implement `aria-label`s and `focus-visible` consistently across all similar components.

## 2026-04-08 - Custom Checkbox Component ARIA Attributes
**Learning:** Custom interactive components mimicking native HTML elements (like a `<button>` acting as a checkbox) frequently lack proper ARIA attributes, rendering them inaccessible to screen readers. In `CameraInventoryModal.tsx`, the item selection was a `<button>` toggling a checkmark visually without programmatic role or state.
**Action:** When building or modifying custom interactive components (like toggle switches, checkboxes, or radio buttons), always ensure they include the correct `role` (e.g., `role="checkbox"`), state attributes (e.g., `aria-checked`), and a descriptive `aria-label` to announce the specific action/item.

## 2026-04-11 - Accessibility of flip-quantity interactive components
**Learning:** Custom interactive components like flip-quantity elements in the dashboard item list lacked distinct focus states and ARIA labels. They did not communicate effectively what they do to screen readers.
**Action:** When creating custom flip-quantity components or similar numeric adjustment controls, always include descriptive `aria-label`s and ensure they have `focus-visible:ring-2 focus-visible:outline-none`.
