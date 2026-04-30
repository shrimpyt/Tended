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

## 2026-04-12 - Accessibility of dynamic modal interactive components
**Learning:** Interactive elements such as custom toggle switches, quantity adjustment (+/-) buttons, and category chips within dynamic modals often miss ARIA roles/labels and distinct keyboard focus states, hindering accessibility for keyboard and screen-reader users.
**Action:** Always verify that interactive items in modal lists (like restock toggles or amount steppers) have their corresponding `role`, `aria-checked`, `aria-label` attributes and utilize `focus-visible` utility classes for clear visual keyboard navigation.

## 2026-04-30 - Accessible Custom Selection Chips
**Learning:** Custom selection chips (like category selectors or mode toggles) built with `<button>` elements frequently lack `aria-pressed` states to indicate selection to screen readers. They also often miss keyboard focus indicators (`focus-visible`).
**Action:** When building or reviewing custom chip components, always ensure `aria-pressed` is used to communicate the active state, and apply `focus-visible` utility classes for clear keyboard navigation.
