# 📋 Bill Matrix: Complete Subscription System Manual Verification Scratchpad & Testing Walkthrough

> **How to Use This Scratchpad**:
> - This document is your exhaustive, step-by-step master test suite.
> - Every Scenario and every Sub-Step has an interactive checklist box (`- [ ]`).
> - As you manually test each scenario, check off the box or reply with the sub-scenario number. We will tick off the verified items together until every single scenario is 100% validated.
> - You can copy and paste this entire document directly into your personal notes (Notion, Obsidian, Apple Notes, Google Keep, etc.).

---

## 🛠️ Developer Quick-Reference: Instant Database State Switcher

Run these single-line SQL commands in your database tool (or Supabase/pgAdmin/Drizzle Studio) to instantly switch your test business into any plan state:

```sql
-- 1. Switch to FREE TIER (Expired Trial)
UPDATE businesses 
SET subscription_plan = 'free', subscription_status = 'expired', trial_ends_at = NOW() - INTERVAL '1 day'
WHERE id = (SELECT business_id FROM users LIMIT 1);

-- 2. Switch to 14-DAY PRO TRIAL (Active)
UPDATE businesses 
SET subscription_plan = 'trial', subscription_status = 'trial', trial_ends_at = NOW() + INTERVAL '14 days'
WHERE id = (SELECT business_id FROM users LIMIT 1);

-- 3. Switch to ESSENTIALS PRO (₹399/mo Active)
UPDATE businesses 
SET subscription_plan = 'essentials', subscription_status = 'active', subscription_ends_at = NOW() + INTERVAL '30 days'
WHERE id = (SELECT business_id FROM users LIMIT 1);

-- 4. Switch to ENTERPRISE CA MAX (₹599/mo Active)
UPDATE businesses 
SET subscription_plan = 'professional', subscription_status = 'active', subscription_ends_at = NOW() + INTERVAL '365 days'
WHERE id = (SELECT business_id FROM users LIMIT 1);

-- 5. Switch to SUSPENDED (Blocked)
UPDATE businesses 
SET subscription_status = 'suspended'
WHERE id = (SELECT business_id FROM users LIMIT 1);
```

---

## 🧪 SCENARIO 1: Plan Tier & Lifecycle Status Engine

### Architecture & Implementation Detail
The entitlements engine (`lib/subscriptions/entitlements.ts`) is a pure, centralized authority. It evaluates the raw business columns (`subscription_plan`, `subscription_status`, `trial_ends_at`, `subscription_ends_at`) and computes an authoritative `PlanEntitlements` object. It guarantees zero broken layouts when a subscription expires by falling back gracefully to the Free tier rather than locking users out of their historical data.

### Verification Checklist

#### Sub-Scenario 1.1: New Business Sign-Up & 14-Day Trial Initialization
- [x] **Step 1.1.1**: Register a fresh account or create a new business profile in `/settings`. (Verified ✅)
- [x] **Step 1.1.2**: Check the database record: Verify `trial_ends_at` is set to exactly `NOW() + 14 days` and `subscription_status = 'trial'`. (Verified ✅)
- [x] **Step 1.1.3**: Navigate to `/settings?tab=billing`. Verify the status badge displays **"Trial Mode"** with the exact countdown (e.g., `14 days remaining`). (Verified ✅)
- [x] **Step 1.1.4**: Confirm that during active trial, all Essentials Pro features are unlocked (all 4 templates accessible, logo upload enabled, WhatsApp dispatch enabled, statutory reports exportable). (Verified ✅)

#### Sub-Scenario 1.2: Expired Trial Fallback to Free Starter Tier
- [x] **Step 1.2.1**: Execute SQL Snippet #1 above (or Admin Panel Override) to simulate an expired trial. (Verified ✅)
- [x] **Step 1.2.2**: Refresh `/settings?tab=billing`. (Verified ✅)
- [x] **Step 1.2.3**: Verify the tier badge updates to **"Free Tier"** / **"Plan Expired"**. (Verified ✅)
- [x] **Step 1.2.4**: Verify the usage meters display: (Verified ✅)
  - `Invoices: X / 30 Invoices this month`
  - `Customers: X / 30 Customers`
  - `Products: X / 30 Products`
  - `Team Members: 1 / 1 User (Owner Only)`

#### Sub-Scenario 1.3: Active Paid Subscription (Essentials Pro & Enterprise)
- [x] **Step 1.3.1**: Execute SQL Snippet #3 or Real Checkout + Admin Approval Flow (Verified ✅ - Real Checkout UTR: 128453236772 for ₹399 Approved)
- [x] **Step 1.3.2**: Refresh `/settings?tab=billing`. (Verified ✅)
- [x] **Step 1.3.3**: Verify the tier badge displays **"Essentials Pro (Active)"** with 31 days remaining and active UTR. (Verified ✅)
- [x] **Step 1.3.4**: Verify the usage meters display **"Unlimited"** for Invoices, Customers, Products, and 3 Team Seats. (Verified ✅)

#### Sub-Scenario 1.4: Suspended Business Account
- [x] **Step 1.4.1**: Execute SQL Snippet #5 or Admin Panel Override to set `subscription_status = 'suspended'`. (Verified ✅)
- [x] **Step 1.4.2**: Navigate to `/invoices/new`. (Verified ✅)
- [x] **Step 1.4.3**: Try saving a draft or finalizing. Verify the server action halts with `ACCOUNT_SUSPENDED` and displays: *"Your account has been suspended. Please contact platform support."* (Verified ✅)

---

## 🧪 SCENARIO 2: Monthly Invoice Quota (30 / Month Limit)

### Architecture & Implementation Detail
The invoice quota counts finalized and draft invoices created **within the current calendar month** (`startOfMonth` to `endOfMonth` in Indian Standard Time). This time-window approach gives merchants a predictable monthly budget (e.g. Oct 1 to Oct 31) that automatically resets on the 1st of every month without requiring background cron jobs.

### Verification Checklist

#### Sub-Scenario 2.1: Usage Meter Progress Tracking
- [x] **Step 2.1.1**: Set account to Free Tier (SQL Snippet #1 or Admin Override). (Verified ✅)
- [x] **Step 2.1.2**: Note the current count on `/settings?tab=billing` (e.g. `0 / 30`). (Verified ✅)
- [x] **Step 2.1.3**: Navigate to `/invoices/new`, create and save a new invoice. (Verified ✅)
- [x] **Step 2.1.4**: Return to `/settings?tab=billing`. Verify the counter incremented by 1 (e.g. `1 / 30`). (Verified ✅)
- [x] **Step 2.1.5**: Check the progress bar: updates live to `3%` and `29 remaining`. (Verified ✅)

#### Sub-Scenario 2.2: Reaching the Quota Limit (Invoice #30)
- [x] **Step 2.2.1**: Set invoice count for the current month to 29 in DB. (Verified ✅ - Meter showed 29/30 & 1 remaining)
- [x] **Step 2.2.2**: Finalize invoice #30. Verify it succeeds without errors. (Verified ✅ - INV-05/10/26/002 finalized)
- [x] **Step 2.2.3**: Check `/settings?tab=billing`. Verify the meter shows `30 / 30 Invoices this month` with 100% filled bar. (Verified ✅)

#### Sub-Scenario 2.3: Hard Paywall Enforcement on Invoice #31
- [x] **Step 2.3.1**: With 30 invoices already recorded this month, go to `/invoices/new`. (Verified ✅)
- [x] **Step 2.3.2**: Fill in customer and item details, then click **"Save Draft"** or **"Finalize Invoice"**. (Verified ✅)
- [x] **Step 2.3.3**: Verify the server action blocks creation and returns error code `INVOICE_QUOTA_EXCEEDED`. (Verified ✅)
- [x] **Step 2.3.4**: Verify the user-facing alert message displays: (Verified ✅)
  > *"You have reached the free limit of 30 invoices for this month. Upgrade to Essentials Pro for unlimited invoices."*
- [x] **Step 2.3.5**: Verify the **UpgradePromptModal** automatically pops up presenting Essentials Pro (₹399/mo). (Verified ✅)

#### Sub-Scenario 2.4: Historical Invoices Immutability
- [x] **Step 2.4.1**: While at the 30-invoice limit, open any previously finalized invoice (`/invoices/[id]`). (Verified ✅)
- [x] **Step 2.4.2**: Verify you can still view, print, download PDF, and issue credit notes for existing invoices. Past invoices are **never locked or deleted**. (Verified ✅)

---

## 🧪 SCENARIO 3: Catalog Quotas (30 Customers & 30 Products)

### Architecture & Implementation Detail
Free tier merchants can add up to 30 unique customers and 30 unique catalog products. When customer #31 or product #31 is attempted, `canAddCustomer` or `canAddProduct` checks the total count in Drizzle ORM and throws a structured paywall error before inserting into PostgreSQL.

### Verification Checklist

#### Sub-Scenario 3.1: Customer Limit Enforcement (30 Max)
- [x] **Step 3.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 3.1.2**: Go to `/customers`. Check the count (29). (Verified ✅)
- [x] **Step 3.1.3**: When customer count is 29, click **"Add Customer"** (`/customers/new`). (Verified ✅)
- [x] **Step 3.1.4**: Enter customer name, state, and click **"Save Customer"** (Customer 30 created). (Verified ✅)
- [x] **Step 3.1.5**: Verify customer #31 submission is blocked with error message: (Verified ✅)
  > *"You have reached the free limit of 30 customers. Upgrade to Essentials Pro for unlimited customer accounts."*
- [x] **Step 3.1.6**: Verify the `UpgradePromptModal` appears automatically. (Verified ✅)

#### Sub-Scenario 3.2: Product Catalog Limit Enforcement (30 Max)
- [x] **Step 3.2.1**: Go to `/products`. Check the count. (Verified ✅)
- [x] **Step 3.2.2**: When product count is 30, click **"Add Product"** (`/products/new`). (Verified ✅)
- [x] **Step 3.2.3**: Enter product name, price, HSN, and click **"Save Product"**. (Verified ✅)
- [x] **Step 3.2.4**: Verify submission is blocked with error message: (Verified ✅)
  > *"Product limit reached (30/30). Upgrade to Essentials Pro for unlimited products."*
- [x] **Step 3.2.5**: Verify the `UpgradePromptModal` appears. (Verified ✅)

#### Sub-Scenario 3.3: Unlimited Catalog on Essentials Pro
- [x] **Step 3.3.1**: Switch account to Essentials Pro (SQL Snippet #3). (Verified ✅)
- [x] **Step 3.3.2**: Add customer #31 and product #31. (Verified ✅)
- [x] **Step 3.3.3**: Verify both are created and saved successfully with zero errors. (Verified ✅)

---

## 🧪 SCENARIO 4: Invoice Print Templates & Auto-Dissolve Logic

### Architecture & Implementation Detail
- **Template 1 (Classic Slate)**: 100% Free for all users forever.
- **Templates 2, 3, 4**: Reserved for Essentials Pro & Enterprise:
  - *Template 2*: Traditional Book Depot Layout (Bilingual, Gujarati/Hindi styling).
  - *Template 3*: Pre-Printed Carbon Pad Style (Authentic manual bill book aesthetics).
  - *Template 4*: Modern Book Depot Replica (Refined commercial stationery).
- **Auto-Dissolve Header Space**: When an invoice has no logo (Free tier), the logo DOM node completely dissolves, allowing the business legal name and address to span 100% of the header width with zero awkward holes.

### Verification Checklist

#### Sub-Scenario 4.1: Template Selection Gating in Settings
- [x] **Step 4.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 4.1.2**: Navigate to `/settings?tab=invoice-settings`. (Verified ✅)
- [x] **Step 4.1.3**: Scroll to **"Template & Calculation Preferences"** -> **"Default Print Template"**. (Verified ✅)
- [x] **Step 4.1.4**: Inspect the dropdown. Verify: (Verified ✅)
  - `Template 1 (Classic Slate)`
  - `Template 2 (Traditional Book Depot) 👑 PRO`
  - `Template 3 (Pre-Printed Carbon Pad) 👑 PRO`
  - `Template 4 (Modern Book Depot Replica) 👑 PRO`
- [x] **Step 4.1.5**: Click on `Template 2 (Traditional Book Depot) 👑 PRO`. (Verified ✅)
- [x] **Step 4.1.6**: Verify the dropdown immediately snaps back to `Template 1 (Classic Slate)`. (Verified ✅)
- [x] **Step 4.1.7**: Verify the `UpgradePromptModal` opens with: (Verified ✅)
  - Title: *"Unlock Premium Print Templates"*
  - Feature: *"All 4 Traditional & Book Depot Templates"*
  - Description: *"Upgrade to Essentials Pro (₹399/mo) to unlock authentic Book Depot, Carbon Pad, and Modern GST invoice print templates."*

#### Sub-Scenario 4.2: Template Selection Gating in Live Creation Preview
- [x] **Step 4.2.1**: Go to `/invoices/new`, add any product line item, and click **"Preview Invoice"**. (Verified ✅)
- [x] **Step 4.2.2**: Locate the template dropdown in the preview modal top toolbar. (Verified ✅)
- [x] **Step 4.2.3**: Try selecting `Template 3 (Pre-Printed Carbon Pad) 👑 PRO`. (Verified ✅)
- [x] **Step 4.2.4**: Verify the selection resets to `Template 1` and the Upgrade Paywall modal appears. (Verified ✅)

#### Sub-Scenario 4.3: Auto-Dissolve Header Space Verification
- [x] **Step 4.3.1**: In the preview modal of `Template 1` on Free tier (where no logo is uploaded): (Verified ✅)
- [x] **Step 4.3.2**: Inspect the top header block. (Verified ✅)
- [x] **Step 4.3.3**: Verify there is **NO empty square, NO missing image placeholder, and NO broken alignment**. (Verified ✅)
- [x] **Step 4.3.4**: Verify the Business Name, GSTIN, and Address cleanly expand to occupy the header space naturally. (Verified ✅)

#### Sub-Scenario 4.4: Unrestricted Template Access on Essentials Pro
- [x] **Step 4.4.1**: Switch account to Essentials Pro (SQL Snippet #3). (Verified ✅)
- [x] **Step 4.4.2**: Return to the Invoice Preview modal. (Verified ✅)
- [x] **Step 4.4.3**: Notice all `👑 PRO` badges are gone from the dropdown. (Verified ✅)
- [x] **Step 4.4.4**: Switch between Template 1, Template 2, Template 3, and Template 4. Verify each distinct design renders properly. (Verified ✅)

---

## 🧪 SCENARIO 5: Business Logo Upload & Brand Assets Gating

### Architecture & Implementation Detail
Free tier accounts cannot upload custom brand logos. The dropzone in `/settings?tab=general` shows a locked amber banner explaining the benefits of Essentials Pro. Server-side validation in `uploadBusinessLogo` rejects any direct API upload attempts.

### Verification Checklist

#### Sub-Scenario 5.1: Locked Dropzone UI in Settings
- [x] **Step 5.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 5.1.2**: Navigate to `/settings?tab=general`. (Verified ✅)
- [x] **Step 5.1.3**: Look at the **"Business Logo & Brand Assets"** card. (Verified ✅)
- [x] **Step 5.1.4**: Verify the header contains an amber badge: `🔒 Essentials Pro & Enterprise`. (Verified ✅)
- [x] **Step 5.1.5**: Verify the dropzone has an amber tinted border, a padlock icon, and reads: (Verified ✅)
  > *"Custom Brand Logo Upload is Locked. Free tier accounts use our clean, auto-dissolving header layout on invoices. Upgrade to Essentials Pro to unlock high-resolution logo uploads on all printed & PDF templates."*

#### Sub-Scenario 5.2: Dropzone Click & Drag-and-Drop Interception
- [x] **Step 5.2.1**: Click inside the locked dropzone. (Verified ✅)
- [x] **Step 5.2.2**: Verify the OS file browser dialog does **NOT** open. (Verified ✅)
- [x] **Step 5.2.3**: Verify the `UpgradePromptModal` pops open titled **"Unlock Custom Brand Logo"**. (Verified ✅)
- [x] **Step 5.2.4**: Drag an image file from your desktop and drop it onto the card. (Verified ✅)
- [x] **Step 5.2.5**: Verify the file is rejected and the paywall modal opens. (Verified ✅)

#### Sub-Scenario 5.3: Logo Upload & Live Simulation on Essentials Pro
- [x] **Step 5.3.1**: Switch account to Essentials Pro (SQL Snippet #3). (Verified ✅)
- [x] **Step 5.3.2**: Refresh `/settings?tab=general`. (Verified ✅)
- [x] **Step 5.3.3**: Verify the dropzone is active with an indigo border: *"Click to upload or drag and drop your logo"*. (Verified ✅)
- [x] **Step 5.3.4**: Upload a PNG image. (Verified ✅)
- [x] **Step 5.3.5**: Verify the **Live Invoice Simulation** card on the right displays the logo scaled proportionally without distortion. (Verified ✅)
- [x] **Step 5.3.6**: Click **"Save & Apply Logo"**. Verify the success toast appears: *"Business logo uploaded and saved successfully!"*. (Verified ✅)
- [x] **Step 5.3.7**: Open any invoice in preview. Verify your custom logo now appears at the top. (Verified ✅)

---

## 🧪 SCENARIO 6: Discreet Free Tier Watermark Engine

### Architecture & Implementation Detail
Free tier invoices include a clean, non-intrusive watermark centered below the signature line:
`Generated via Bill Matrix (Free Tier) — www.billmatrix.in`.
Upgrading to Essentials Pro or Enterprise removes this watermark completely for 100% white-label invoices.

### Verification Checklist

#### Sub-Scenario 6.1: Watermark in In-App Preview
- [x] **Step 6.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 6.1.2**: Open any invoice (`/invoices/[id]` or preview in `/invoices/new`). (Verified ✅)
- [x] **Step 6.1.3**: Scroll to the bottom of the invoice below the Terms & Conditions and signature line. (Verified ✅)
- [x] **Step 6.1.4**: Verify the watermark appears: (Verified ✅)
  ```text
  Generated via Bill Matrix (Free Tier) — www.billmatrix.in
  ```

#### Sub-Scenario 6.2: Watermark in Print / Save as PDF
- [x] **Step 6.2.1**: Click the Print icon or press `Ctrl + P` to trigger the browser print dialog. (Verified ✅)
- [x] **Step 6.2.2**: Inspect the print preview (both A4 and A5 layout). (Verified ✅)
- [x] **Step 6.2.3**: Verify the watermark is positioned cleanly at the bottom without overlapping any tax or bank details. (Verified ✅)

#### Sub-Scenario 6.3: 100% White-Label on Essentials Pro
- [x] **Step 6.3.1**: Switch account to Essentials Pro (SQL Snippet #3). (Verified ✅)
- [x] **Step 6.3.2**: Refresh the invoice detail page (`/invoices/[id]`). (Verified ✅)
- [x] **Step 6.3.3**: Scroll to the bottom and trigger the print dialog (`Ctrl + P`). (Verified ✅)
- [x] **Step 6.3.4**: Verify the watermark is **100% completely gone**. (Verified ✅)

---

## 🧪 SCENARIO 7: 1-Click WhatsApp Direct Share with Dynamic UPI Links

### Architecture & Implementation Detail
Uses the official WhatsApp Click-to-Chat protocol (`https://wa.me/{phone}?text={encodedText}`). Operates 100% client-side with zero external Meta Cloud fees. It formats customer name, invoice number, issue date, due date, formatted amount in ₹ INR, merchant UPI ID for instant scan & pay, and digital bill link.

### Verification Checklist

#### Sub-Scenario 7.1: WhatsApp Button Gating on Free Tier
- [x] **Step 7.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 7.1.2**: Open any finalized invoice (`/invoices/[id]`). (Verified ✅)
- [x] **Step 7.1.3**: Check the top-right toolbar. (Verified ✅)
- [x] **Step 7.1.4**: Locate the **"WhatsApp"** button with the green WhatsApp icon. (Verified ✅)
- [x] **Step 7.1.5**: Verify an amber `PRO` badge is attached to the button. (Verified ✅)
- [x] **Step 7.1.6**: Click the button. (Verified ✅)
- [x] **Step 7.1.7**: Verify WhatsApp does **not** open. Instead, the `UpgradePromptModal` appears titled **"Unlock 1-Click WhatsApp Invoicing"**. (Verified ✅)

#### Sub-Scenario 7.2: Active WhatsApp Share on Essentials Pro
- [x] **Step 7.2.1**: Switch account to Essentials Pro (SQL Snippet #3). (Verified ✅)
- [x] **Step 7.2.2**: Refresh `/invoices/[id]`. (Verified ✅)
- [x] **Step 7.2.3**: Verify the `PRO` badge on the WhatsApp button has disappeared and the button is active. (Verified ✅)
- [x] **Step 7.2.4**: Click **"WhatsApp"**. (Verified ✅)
- [x] **Step 7.2.5**: Verify a new browser tab opens pointing to `https://wa.me/` (or `https://web.whatsapp.com/send`). (Verified ✅)

#### Sub-Scenario 7.3: Message Content & UPI Formatting Verification
- [x] **Step 7.3.1**: Inspect the pre-filled text in the WhatsApp tab. Verify the structure: (Verified ✅)
  ```text
  *Namaste <Customer Name>*,
  Here are your invoice details from *<Your Business>*:

  📄 *Invoice No:* INV-...
  📅 *Date:* ...
  💰 *Amount Due:* ₹...
  ⏳ *Due Date:* ...
  📱 *Pay via UPI:* merchant@upi
  🔗 *View Digital Bill:* http://...

  Thank you for your business! 🙏
  ```
- [x] **Step 7.3.2**: Verify that if customer phone was entered as `9876543210`, the link properly normalizes to `wa.me/919876543210`. (Verified ✅)

---

## 🧪 SCENARIO 8: Statutory Excel Exports Gating (GSTR-1, ITR 44AD, HSN)

### Architecture & Implementation Detail
- **Client Guard**: All 4 statutory export cards in `/reports` show `[👑 PRO]` lock badges and direct clicks to the `UpgradePromptModal`.
- **Backend Guard**: Direct HTTP requests to `/api/reports/export?...` are intercepted by `canExportStatutoryReport(business)` and rejected with HTTP `403 Forbidden`.

### Verification Checklist

#### Sub-Scenario 8.1: Reports Center UI on Free Tier
- [x] **Step 8.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 8.1.2**: Navigate to `/reports`. (Verified ✅)
- [x] **Step 8.1.3**: Look at the **"Official Statutory & Tax Filing Center"** containing: (Verified ✅)
  - GSTR-1 Outward Supplies
  - Sales Register (Detailed)
  - HSN / SAC Wise Summary
  - ITR Ready & CA Sales Report
- [x] **Step 8.1.4**: Verify each card header displays an amber `[👑 PRO]` pill. (Verified ✅)
- [x] **Step 8.1.5**: Verify every download button displays: **"Unlock Excel Export [👑 PRO] →"**. (Verified ✅)

#### Sub-Scenario 8.2: Download Button Click Interception
- [x] **Step 8.2.1**: Click **"Unlock Excel Export [👑 PRO] →"** on the GSTR-1 card. (Verified ✅)
- [x] **Step 8.2.2**: Verify no `.xlsx` file is downloaded. (Verified ✅)
- [x] **Step 8.2.3**: Verify the `UpgradePromptModal` pops open titled **"Unlock Statutory Tax Exports"** detailing official GSTN offline utility formats and CA audit workbooks. (Verified ✅)

#### Sub-Scenario 8.3: Direct API URL Protection (HTTP 403 Forbidden)
- [x] **Step 8.3.1**: Paste this raw URL directly into your browser tab: (Verified ✅)
  ```text
  http://localhost:3000/api/reports/export?type=gstr1&startDate=2026-10-01&endDate=2026-10-31
  ```
- [x] **Step 8.3.2**: Press Enter. (Verified ✅)
- [x] **Step 8.3.3**: Verify the response is blocked with HTTP status **403 Forbidden**: (Verified ✅)
  ```json
  {
    "success": false,
    "error": "Statutory Excel exports (GSTR-1, ITR 44AD, Sales Register) require Essentials Pro or Enterprise tier."
  }
  ```

#### Sub-Scenario 8.4: Real Statutory Download on Essentials Pro
- [x] **Step 8.4.1**: Switch account to Essentials Pro (SQL Snippet #3). (Verified ✅)
- [x] **Step 8.4.2**: Refresh `/reports`. (Verified ✅)
- [x] **Step 8.4.3**: Verify the `[👑 PRO]` badges are gone and buttons read: (Verified ✅)
  - `Download GSTR-1 Package (.xlsx)`
  - `Download Sales Register (.xlsx)`
  - `Download HSN Summary (.xlsx)`
  - `Download ITR Report (.xlsx)`
- [x] **Step 8.4.4**: Click **"Download GSTR-1 Package (.xlsx)"**. (Verified ✅)
- [x] **Step 8.4.5**: Open the downloaded Excel file. Verify worksheets exist: `b2b`, `b2cl`, `b2cs`, `hsn`, `doc`. (Verified ✅)

---

## 🧪 SCENARIO 9: Checkout, Payment Verification & Admin Approval Lifecycle

### Architecture & Implementation Detail
Indian SMB merchants pay via dynamic UPI QR scan and enter the 12-digit bank UTR reference number. The transaction enters pending state until the admin verifies the payment in `/admin` and clicks **"Approve & Activate"**, which atomically updates the business plan and ends-at date.

### Verification Checklist

#### Sub-Scenario 9.1: Upgrade Navigation from Paywalls
- [x] **Step 9.1.1**: Set account to Free Tier. (Verified ✅)
- [x] **Step 9.1.2**: Trigger any paywall modal (e.g. from Logo Upload or Template 2). (Verified ✅)
- [x] **Step 9.1.3**: Click the CTA button: **"Upgrade to Essentials Pro (₹399/mo)"** or select **Enterprise / CA Max (₹599/mo)**. (Verified ✅)
- [x] **Step 9.1.4**: Verify you are redirected to `/checkout`. (Verified ✅)
- [x] **Step 9.1.5**: Verify the total amount is correctly set to **₹399.00** (or **₹599.00** for Enterprise). (Verified ✅)

#### Sub-Scenario 9.2: Payment Proof (UTR) Submission
- [x] **Step 9.2.1**: On the checkout page, enter a test 12-digit UTR (e.g. `1323245087496`). (Verified ✅)
- [x] **Step 9.2.2**: Click **"Submit Payment Verification"**. (Verified ✅)
- [x] **Step 9.2.3**: Verify the checkout form transitions to: (Verified ✅)
  > *"Payment Under Verification — Pending Admin Approval"*
- [x] **Step 9.2.4**: Return to `/settings?tab=billing`. Verify the status shows **Pending Verification**. (Verified ✅)

#### Sub-Scenario 9.3: Admin Console Approval
- [x] **Step 9.3.1**: Open `/admin` in your browser. (Verified ✅)
- [x] **Step 9.3.2**: Locate the pending request under **"Pending Subscription Requests"**. (Verified ✅)
- [x] **Step 9.3.3**: Verify the business name, requested plan, and UTR number match. (Verified ✅)
- [x] **Step 9.3.4**: Click **"Approve & Activate Subscription"**. (Verified ✅)
- [x] **Step 9.3.5**: Verify the row moves to the **"Approved"** section. (Verified ✅)

#### Sub-Scenario 9.4: Instant Feature Unlock Across Entire App
- [x] **Step 9.4.1**: Return to your main application tab and refresh. (Verified ✅)
- [x] **Step 9.4.2**: Verify: (Verified ✅)
  - `/settings?tab=billing` shows **Active Subscription** (`Enterprise / CA Max` or `Essentials Pro`) with `31 days remaining`.
  - `/settings?tab=general` Logo Upload dropzone is **unlocked**.
  - `/settings?tab=invoice-settings` Templates 2, 3, 4 are **unlocked**.
  - `/reports` Statutory Excel export buttons are **unlocked**.
  - `/invoices/[id]` WhatsApp button is **unlocked**.
  - Invoice print watermark is **removed**.

---

## 🎯 Final Developer Sign-Off Summary

| Feature / Gate | Free Starter | Essentials Pro / Enterprise | Verification Status |
| :--- | :--- | :--- | :--- |
| **Monthly Invoices** | Capped at 30/mo | Unlimited | ✅ 100% Fully Verified |
| **Customer Contacts** | Capped at 30 | Unlimited | ✅ 100% Fully Verified |
| **Catalog Products** | Capped at 30 | Unlimited | ✅ 100% Fully Verified |
| **Print Templates** | Template 1 only | All 4 Templates | ✅ 100% Fully Verified |
| **Logo Upload** | Locked (Auto-dissolve) | Custom Upload | ✅ 100% Fully Verified |
| **Watermark** | Subtle free branding | 100% Removed | ✅ 100% Fully Verified |
| **WhatsApp Dispatch** | Locked | Active with UPI | ✅ 100% Fully Verified |
| **Statutory Excel Exports** | Locked (Screen only) | Certified `.xlsx` | ✅ 100% Fully Verified |
| **Admin Activation** | Manual review | Instant unlock | ✅ 100% Fully Verified |
