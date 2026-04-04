
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** HomeBaseApp
- **Date:** 2026-03-30
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Sign in success navigates to dashboard
- **Test Code:** [TC001_Sign_in_success_navigates_to_dashboard.py](./TC001_Sign_in_success_navigates_to_dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/8b9e1c7d-c358-4f57-b092-56acea81d24b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Sign in validation error when email is blank
- **Test Code:** [TC002_Sign_in_validation_error_when_email_is_blank.py](./TC002_Sign_in_validation_error_when_email_is_blank.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/620c0ef2-e95c-41ef-97f8-54aa51b72e37
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Sign in validation error when password is blank
- **Test Code:** [TC003_Sign_in_validation_error_when_password_is_blank.py](./TC003_Sign_in_validation_error_when_password_is_blank.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/f7af6945-529c-4586-b6b3-06cbe7e556de
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Sign in shows error on invalid credentials
- **Test Code:** [TC005_Sign_in_shows_error_on_invalid_credentials.py](./TC005_Sign_in_shows_error_on_invalid_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/ef63205f-d525-4724-9337-18f39d1d30de
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Dashboard loads with core summary content
- **Test Code:** [TC007_Dashboard_loads_with_core_summary_content.py](./TC007_Dashboard_loads_with_core_summary_content.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/dc704fe4-4134-47e5-85ad-825c9ccda09c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Dashboard shopping list preview item can be marked complete
- **Test Code:** [TC008_Dashboard_shopping_list_preview_item_can_be_marked_complete.py](./TC008_Dashboard_shopping_list_preview_item_can_be_marked_complete.py)
- **Test Error:** Unable to mark a shopping list item complete because there are no items in the dashboard preview.

Observations:
- The Dashboard page is visible and selected in the bottom navigation.
- The 'Shopping list' preview displays the message 'Nothing on your list'.
- No shopping items, checkboxes, or toggle controls are present in the preview to mark complete.
- Inventory alerts show 'All stocked up ✓' and other dashboard widgets are rendered.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/c73497db-7692-4cd5-ad85-f52271317302
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Dashboard full shopping list modal updates preview after completing multiple items
- **Test Code:** [TC009_Dashboard_full_shopping_list_modal_updates_preview_after_completing_multiple_items.py](./TC009_Dashboard_full_shopping_list_modal_updates_preview_after_completing_multiple_items.py)
- **Test Error:** Unable to complete shopping list items because the full shopping list is empty.

Observations:
- Sign-in succeeded with shrimpyt.1@gmail.com and the dashboard page is visible.
- The dashboard shopping list preview reads 'Nothing on your list'.
- Clicked 'View all' to open the full shopping list; the full list shows "Your shopping list is empty".
- The page contains a shadow-DOM input with placeholder 'Add an item...' (input element present) but no list items are displayed to mark complete.
- No items exist to mark as complete, so the requested actions (complete multiple items and verify preview changes) cannot be performed.

Found elements relevant to this result: shopping list input (shadow) index 251, add control index 250, 'View all' was activated from the dashboard preview.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/66f3f184-e372-4e72-8eae-0822c259769a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Inventory list loads and supports adding a new item end-to-end
- **Test Code:** [TC012_Inventory_list_loads_and_supports_adding_a_new_item_end_to_end.py](./TC012_Inventory_list_loads_and_supports_adding_a_new_item_end_to_end.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/334ca7b0-d210-4f8f-b8fc-4b8b0276920e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Inventory item stock can be updated
- **Test Code:** [TC013_Inventory_item_stock_can_be_updated.py](./TC013_Inventory_item_stock_can_be_updated.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/66f58961-2c74-477c-a90b-6efd020cef37
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Add item form validates required fields
- **Test Code:** [TC014_Add_item_form_validates_required_fields.py](./TC014_Add_item_form_validates_required_fields.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/66f38eb5-e021-4ac4-b926-c79e0ca1b9ba
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Inventory item can be deleted after confirmation
- **Test Code:** [TC015_Inventory_item_can_be_deleted_after_confirmation.py](./TC015_Inventory_item_can_be_deleted_after_confirmation.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/5fa38964-9935-440f-8613-a2f33d7ab90b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 AI camera scanning modal can be opened from inventory and closed
- **Test Code:** [TC017_AI_camera_scanning_modal_can_be_opened_from_inventory_and_closed.py](./TC017_AI_camera_scanning_modal_can_be_opened_from_inventory_and_closed.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/8e434cbf-9c08-405f-a661-ae718f62e972
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 AI camera scanning flow: add selected identified items to inventory
- **Test Code:** [TC018_AI_camera_scanning_flow_add_selected_identified_items_to_inventory.py](./TC018_AI_camera_scanning_flow_add_selected_identified_items_to_inventory.py)
- **Test Error:** Unable to complete the image selection and AI analysis because the app's 'Choose Photo' action opens the device's native file picker, which cannot be accessed in this test environment.

Observations:
- The Scan Items modal is visible and shows 'Take Photo' and 'Choose Photo' options.
- The 'Choose Photo' control was clicked and is highlighted in the UI.
- No file-picker or uploaded-image UI appeared in the app DOM after clicking Choose Photo.
- Without an image selected, the AI analysis interface (identified items) did not appear and no items could be selected or added to inventory.
- The inventory list remains showing the pre-existing items (no new items added).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/5931c272-7e13-4704-a925-bcd66eab5932
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Manual spending entry can be added and appears in the monthly list with updated total
- **Test Code:** [TC020_Manual_spending_entry_can_be_added_and_appears_in_the_monthly_list_with_updated_total.py](./TC020_Manual_spending_entry_can_be_added_and_appears_in_the_monthly_list_with_updated_total.py)
- **Test Error:** Manual add spending entry could not be completed because the app does not provide a manual-entry form from the Spending tab.

Observations:
- The app is signed in and the Spending tab is visible showing 'No entries this month.'
- The add (+) control always opens a 'Scan Receipt' modal titled 'Scan Receipt.'
- The modal contains options 'Take Photo' and 'Choose from Library' and a 'Cancel' button, indicating receipt import only.
- No manual entry fields (store name, amount, category, date) or an 'Add manually' option were found on the Spending page or within the modal.
- Repeated attempts to close the modal did not reveal any manual-add alternative.

Because a manual add flow is not available, adding a spending entry manually and verifying it in the list and monthly total could not be performed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/da3c6be5-7725-4b4c-9521-e6e4ebee06ed
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021 Spending list and monthly total load for the current month
- **Test Code:** [TC021_Spending_list_and_monthly_total_load_for_the_current_month.py](./TC021_Spending_list_and_monthly_total_load_for_the_current_month.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/760819e1-5c25-40d7-a9a6-c3df2bb2a59c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023 Delete a spending entry via swipe and confirm it is removed
- **Test Code:** [TC023_Delete_a_spending_entry_via_swipe_and_confirm_it_is_removed.py](./TC023_Delete_a_spending_entry_via_swipe_and_confirm_it_is_removed.py)
- **Test Error:** Unable to complete the test because the Scan Receipt modal cannot be dismissed and it blocks the add-entry control. As a result, a spending entry could not be created or deleted.

Observations:
- The Spending screen shows a persistent "Scan Receipt" modal with a bottom bar containing "Cancel" and "Scan Receipt".
- Clicking the modal's "Cancel" control multiple times did not close the modal.
- The '+' add control is visible but overlaid/blocked by the modal, preventing the add-entry form from being opened.
- No spending entries are present for the month (page shows "No entries this month. Tap + to add one.").
- The user is signed in (trystan@tryolive.dev) and on the /spending page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/31ac098a-cc73-4810-bc2e-369b04bb0865
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC025 Receipt scan flow creates a spending entry after confirming extracted data
- **Test Code:** [TC025_Receipt_scan_flow_creates_a_spending_entry_after_confirming_extracted_data.py](./TC025_Receipt_scan_flow_creates_a_spending_entry_after_confirming_extracted_data.py)
- **Test Error:** The receipt scan modal could not be opened, so the receipt scanning workflow could not be completed.

Observations:
- The Spending page is visible with a 'Scan Receipt' control, but clicking it only showed a spinner or had no visible effect.
- The Scan Receipt control at index 246 was clicked 4 times and an alternate control at index 393 was clicked once; the upload/gallery or receipt review UI never appeared.
- No upload button, gallery picker, or extracted-store/total review dialog became visible.
- The page still shows 'Total spent $0.00' and 'No entries this month.'
- No explicit error message was shown on the page (only a spinner or no change).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/9b842387-e205-432b-a7ce-2f487006ace8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC027 Receipt scan modal opens and shows review UI after analysis
- **Test Code:** [TC027_Receipt_scan_modal_opens_and_shows_review_UI_after_analysis.py](./TC027_Receipt_scan_modal_opens_and_shows_review_UI_after_analysis.py)
- **Test Error:** The receipt import could not be completed because the device photo/gallery picker (and camera) is unavailable in this test environment, so an image could not be selected for analysis.

Observations:
- The Scan Receipt modal opened successfully and shows 'Import a receipt' with 'Take Photo' and 'Choose from Library' buttons.
- The 'Choose from Library' button was clicked multiple times, but no gallery or file picker UI appeared.
- No image selection or upload was possible from the modal, so the app remained on the import modal.
- Because no image was provided, the AI analysis and the review step (store details and total with confirm option) could not be reached.
- This environment likely blocks camera/file-picker access, which is expected for device-limited test environments.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/df072177-c96b-4c0e-895d-2406b1452f27
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC028 Confirming receipt scan adds a spending entry to the spending list
- **Test Code:** [TC028_Confirming_receipt_scan_adds_a_spending_entry_to_the_spending_list.py](./TC028_Confirming_receipt_scan_adds_a_spending_entry_to_the_spending_list.py)
- **Test Error:** The receipt OCR flow could not be completed because the test environment blocked selecting a receipt image from the device library. As a result, no receipt was uploaded, no OCR/AI analysis was run, and no spending entry was created or verified.

Observations:
- The Spending screen was visible and showed “No entries this month. Tap + to add one.” and Total spent $0.00.
- The Scan Receipt modal opened successfully and displayed “Import a receipt” with the options “Take Photo” and “Choose from Library.”
- The 'Choose from Library' option was clicked (two attempts) but no native file picker or image selection dialog appeared.
- No OCR/analysis UI or progress indicator was observed and no new spending entry appeared in the list.
- The inability to open the device file picker or camera in this test environment prevented completing the remaining steps of the flow.

Everything found: Spending screen (no entries), receipt import modal with Take Photo / Choose from Library options, repeated attempts to open library picker which produced no file selection dialog. The OCR/upload/entry creation steps could not be exercised due to environment limitations.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/470074bb-e141-4551-b3a0-744ca84cd393
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC029 Offline cached data can be viewed when returning to the dashboard after prior load
- **Test Code:** [TC029_Offline_cached_data_can_be_viewed_when_returning_to_the_dashboard_after_prior_load.py](./TC029_Offline_cached_data_can_be_viewed_when_returning_to_the_dashboard_after_prior_load.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/2ef29597-452a-49b4-96ed-4063cdd42877
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC030 Register for push notifications when permission is granted
- **Test Code:** [TC030_Register_for_push_notifications_when_permission_is_granted.py](./TC030_Register_for_push_notifications_when_permission_is_granted.py)
- **Test Error:** Unable to grant notification permission because the app does not show any notification control or confirmation message after signing in.

Observations:
- Successfully signed in; the Dashboard was accessible for the account trystan@tryolive.dev.
- Opened Settings → Profile & Household (page visible with Display name, Save name, Household invite code, household members, and Sign out).
- No visible UI text or controls mentioning 'notification', 'notifications', 'Enable notifications', 'Allow notifications', 'Notifications enabled', 'registered', or similar.
- No system notification permission prompt appeared and there was no in-app confirmation indicating notifications were registered.

Because no notification-related feature is present on the profile/settings or dashboard screens, the notification permission flow cannot be exercised in this environment.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/7762662c-c609-49d9-9045-43441bc72569
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC031 Handle denied push notification permission with guidance
- **Test Code:** [TC031_Handle_denied_push_notification_permission_with_guidance.py](./TC031_Handle_denied_push_notification_permission_with_guidance.py)
- **Test Error:** Could not verify denying notification permission because the app did not present a system notification permission prompt and no in-app notification controls or guidance were found.

Observations:
- The user was signed in successfully and the Profile & Household page is visible.
- Multiple searches (and scrolling) for "notification" / "notifications" returned no matches in the UI.
- No system-level notification permission prompt appeared after sign-in.
- The Profile & Household page shows display name, household invite code, household members, and a Sign out button, with no notification-related controls or instructions.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/3ac4e524-b15a-47cd-be59-15f31eae14e7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Sign in validation error when both fields are blank
- **Test Code:** [TC004_Sign_in_validation_error_when_both_fields_are_blank.py](./TC004_Sign_in_validation_error_when_both_fields_are_blank.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/945e3d86-2c8b-4cd2-8d99-419461706024
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Sign in form remains available after invalid credentials
- **Test Code:** [TC006_Sign_in_form_remains_available_after_invalid_credentials.py](./TC006_Sign_in_form_remains_available_after_invalid_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/7fc91e2c-771f-401b-b25a-f82b19d30261
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Dashboard low-stock alerts section is viewable
- **Test Code:** [TC010_Dashboard_low_stock_alerts_section_is_viewable.py](./TC010_Dashboard_low_stock_alerts_section_is_viewable.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/06015685-82f8-4458-8a7f-53c1fe285eb8
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Dashboard spending summary section is displayed
- **Test Code:** [TC011_Dashboard_spending_summary_section_is_displayed.py](./TC011_Dashboard_spending_summary_section_is_displayed.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/14622b1d-5c0a-429b-b223-c8efcf4947cd
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Inventory category filter can be cleared to show all items
- **Test Code:** [TC016_Inventory_category_filter_can_be_cleared_to_show_all_items.py](./TC016_Inventory_category_filter_can_be_cleared_to_show_all_items.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/bd717137-23ae-4e48-abeb-853b0d2415ac
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 AI camera scanning flow handles no or low-confidence results with retry or manual add option
- **Test Code:** [TC019_AI_camera_scanning_flow_handles_no_or_low_confidence_results_with_retry_or_manual_add_option.py](./TC019_AI_camera_scanning_flow_handles_no_or_low_confidence_results_with_retry_or_manual_add_option.py)
- **Test Error:** The camera/add control on the Inventory page could not be accessed, so AI analysis could not be started and the failure/manual-add UI could not be verified.

Observations:
- The Inventory page loaded successfully and the list of items is visible.
- No interactive element labeled 'Add', 'Camera', or 'Scan' was found in the page's interactive elements.
- A plus icon is visible in the page screenshot, but it is not exposed as a clickable interactive element in the page model.
- Because the camera/modal could not be opened, no photo could be selected and AI analysis could not be triggered.
- The no-/low-confidence failure state and the retry/manual-add option could not be reached for verification.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/eeb99b17-49d9-4a9f-b9bb-7a524bffc8a9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022 Navigate between months in spending history
- **Test Code:** [TC022_Navigate_between_months_in_spending_history.py](./TC022_Navigate_between_months_in_spending_history.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/d3a25e0c-1761-4f79-9d16-1b64ae598be3
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Manual add spending validates required fields
- **Test Code:** [TC024_Manual_add_spending_validates_required_fields.py](./TC024_Manual_add_spending_validates_required_fields.py)
- **Test Error:** The manual manual-add spending form could not be accessed, so validation could not be verified.

Observations:
- Signed in successfully and the Spending screen is visible.
- Tapping the + (add) control always opens the Scan Receipt modal instead of a manual add-spending form.
- The Scan Receipt modal shows 'Import a receipt' with options 'Take Photo' and 'Choose from Library' and a 'Cancel' control.
- No UI element for a manual add-spending form was found on the Spending page while the modal is displayed.
- Because the manual form could not be opened, it was not possible to submit the form or observe validation behavior.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73399d9c-9008-48a4-bbf0-9b23c4dd225e/554aa0d3-3d46-4d81-90ea-90f169383190
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **60.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---