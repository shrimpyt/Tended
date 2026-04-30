## 2024-05-01 - Input fields missing explicit ID association with labels
**Learning:** Found inputs in the manual item creation modal within `tended-web/app/inventory/page.tsx` that do not have their corresponding labels properly associated using `htmlFor` and `id` attributes. While they are visually proximal, screen readers won't reliably associate the label with the input.
**Action:** Always ensure `<label>` elements use the `htmlFor` attribute matching the `id` of their corresponding input for proper accessibility.
