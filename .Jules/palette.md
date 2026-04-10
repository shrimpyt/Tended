# Palette Journal
## 2025-04-06 - Accessible Buttons
**Learning:** Adding `aria-label`s and focus states (`focus-visible:ring-2`) to icon-only buttons in the shopping list ensures better keyboard and screen-reader accessibility without compromising visual aesthetics.
**Action:** Implement `aria-label`s and `focus-visible` consistently across all similar components.

## 2026-04-08 - Custom Checkbox Component ARIA Attributes
**Learning:** Custom interactive components mimicking native HTML elements (like a `<button>` acting as a checkbox) frequently lack proper ARIA attributes, rendering them inaccessible to screen readers. In `CameraInventoryModal.tsx`, the item selection was a `<button>` toggling a checkmark visually without programmatic role or state.
**Action:** When building or modifying custom interactive components (like toggle switches, checkboxes, or radio buttons), always ensure they include the correct `role` (e.g., `role="checkbox"`), state attributes (e.g., `aria-checked`), and a descriptive `aria-label` to announce the specific action/item.

## 2024-05-18 - Dashboard Action Buttons Accessibility
**Learning:** Icon-only action buttons in list views (like the +/- quantity adjusters and delete buttons in the dashboard) often lack proper semantic labels and visual focus states, making them difficult for screen reader users and keyboard navigators to identify or interact with.
**Action:** When adding or reviewing list-item action buttons, always ensure an `aria-label` is present detailing the specific action and target item, and add clear `focus-visible` utility classes (e.g., `focus-visible:ring-2 focus-visible:outline-none`) to provide an explicit keyboard focus ring.
