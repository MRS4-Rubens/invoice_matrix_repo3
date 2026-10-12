# Master Typography & Text Sizes Tracking Log (`textSizes.md`)

> **Log Purpose:** Modern centralized tracking of all font and text size refinements across the Bill Matrix suite.  
> **Version Tracking Protocol:** `Old Value -> Modified 1 (Date) -> Modified 2 (Date) -> Modified 3 (Date)`  
> **Rule for Future Modifications:** Whenever an element is re-adjusted, record the new value under the next `Modified N (Date)` column and keep earlier values intact for complete auditability.  
> **Last Updated:** `24 Sept 2026`

---

## 1. Credit Note Creation & Editing Form Page
- **File Path:** [`components/app/credit-notes/credit-note-form.tsx`](file:///d:/BM_Codes/BM_TS_Codes/BM_TS_v2.0.2C3.5/components/app/credit-notes/credit-note-form.tsx)
- **Latest Revision:** `Modified 1 (24 Sept 2026)`
- **Scope:** All 42 content and input elements promoted to the next integral pixel size (+1px) for improved contrast, ergonomics, and eye-catching clarity on desktop & laptop screens.
- **Untouched Exceptions:** Page Heading (`Issue GST Credit Note`, 24px / `text-2xl`) and Action Buttons (`Save as Draft` & `Finalize & Issue`, 14px / `text-sm font-semibold`) were preserved as requested.

| # | Section & UI Element | Selector / Tailwind Target | Old Value | Modified 1 (24 Sept 2026) | Modified 2 (Date) | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **1.1** | **Original Invoice Reference Card (Box 1)** | | | | | |
| 1 | Header Label (`ORIGINAL INVOICE REFERENCE :`) | `.card-header span` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 2 | Header Value (`INV-05/09/26/001`) | `.font-mono` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 3 | Data Strip Labels (`Customer:`, `Invoice Date:`, `Original Bill:`, `Tax Region:`) | `.data-strip span.font-medium` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 4 | Customer Name Value (`Neelkamal Books`) | `.font-semibold` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 5 | GSTIN Tag Value (`37ABCDE1234F1Z2`) | `.font-mono` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 6 | Invoice Date Value (`05/09/2026`) | `.font-medium` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 7 | Original Bill Value (`₹1,400.00`) | `.font-mono.font-semibold` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 8 | Tax Region Value (`Intra-State (CGST+SGST)`) | `.font-medium` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| **1.2** | **Credit Note Details - GST Rule 53 (Box 2)** | | | | | |
| 9 | Card Title (`CREDIT NOTE DETAILS (GST RULE 53)`) | `h2` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 10 | Mandatory Compliance Tag (`Mandatory for GST Compliance`) | `span.text-muted-foreground` | `11px` (`text-[11px]`) | **`12px` (`text-[12px]`)** | — | ✅ Verified |
| 11 | Reason Field Label (`Reason for Issuing Credit Note *`) | `label` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 12 | Reason Dropdown Select Value (`01 - Sales Return`) | `select` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 13 | Reason Helper Subtext (`This statutory reason code is submitted...`) | `p.text-muted-foreground` | `11px` (`text-[11px]`) | **`12px` (`text-[12px]`)** | — | ✅ Verified |
| 14 | Remarks Field Label (`Internal Notes / Remarks`) | `label` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 15 | Remarks Input Value / Placeholder (`e.g. 2 pens returned...`) | `input[type="text"]` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 16 | Remarks Helper Subtext (`Internal reference notes recorded...`) | `p.text-muted-foreground` | `11px` (`text-[11px]`) | **`12px` (`text-[12px]`)** | — | ✅ Verified |
| **1.3** | **Creditable Items Table (Box 3)** | | | | | |
| 17 | Table Card Title (`SELECT ITEMS & QUANTITIES TO CREDIT`) | `h2` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 18 | Table Subtitle (`Enter the quantity of each product...`) | `p.text-muted-foreground` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 19 | Column Headers (`#`, `ITEM DESCRIPTION`, `HSN/SAC`, `BILLED QTY`, `MAX CREDIT`, `CREDIT QTY`, `RATE (₹)`, `TAX (%)`, `LINE CREDIT`, `ACTION`) | `thead th` | `11px` (`text-[11px]`) | `12px` (`text-[12px]`) | **`12px` (`whitespace-nowrap text-center`)** | ✅ Verified |
| 20 | Row Index (`1`) | `tbody td:first-child` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 21 | Item Description Title (`Navodaya Books`) | `p.font-semibold` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 22 | Unit Subtext (`Unit: NOS`) | `span.font-normal` | `11px` (`text-[11px]`) | **`12px` (`text-[12px]`)** | — | ✅ Verified |
| 23 | HSN/SAC Code (`4802`) | `td font-mono` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 24 | Billed Quantity (`4`) [formerly Original Qty] | `td font-mono` | `14px` (`text-sm`) | `15px` (`text-[15px]`) | **`15px` (`text-center`)** | ✅ Verified |
| 25 | Max Credit Quantity (`3`) [formerly Max Creditable] | `td font-mono.font-semibold` | `14px` (`text-sm`) | `15px` (`text-[15px]`) | **`15px` (`text-center`)** | ✅ Verified |
| 26 | Credit Qty Input Box Text (`1`) | `input[type="number"]` | `14px` (`text-sm`) | `15px` (`text-[15px]`) | **`15px` (`text-center`)** | ✅ Verified |
| 27 | Rate (`₹350.00`) | `td font-mono` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 28 | Tax Percentage (`0%`) [formerly Tax Rate] | `td font-mono` | `12px` (`text-xs`) | `13px` (`text-[13px]`) | **`13px` (`text-center`)** | ✅ Verified |
| 29 | Line Credit Total (`₹350.00` / `₹1,050.00`) | `td font-mono.font-bold` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| **1.4** | **Financial & Accounting Impact (Bottom Left)** | | | | | |
| 30 | Impact Title (`FINANCIAL & ACCOUNTING IMPACT`) | `.callout-title` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 31 | Impact Explanatory Text (`Finalizing this credit note will reduce...`) | `.callout-body` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 32 | Metric Strip Labels (`Original Invoice:`, `Previously Credited:`, etc.) | `.metric-strip span` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 33 | Metric Value: Original Invoice (`₹1,400.00`) | `.font-mono` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 34 | Metric Value: Previously Credited (`-₹350.00`) | `.font-mono` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 35 | Metric Value: This Credit Note (`-₹350.00`) | `.font-mono.font-semibold` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 36 | Metric Value: Net Adjusted Balance (`₹700.00` / `₹0.00`) | `.font-mono.font-bold` | `12px` (`text-xs`) | **`14px` (`text-[14px]`)** | — | ✅ Verified |
| **1.5** | **Credit Amount Summary (Bottom Right)** | | | | | |
| 37 | Summary Header Left (`CREDIT AMOUNT SUMMARY`) | `.summary-header` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 38 | Summary Header Right (`VALUES (₹)`) | `.summary-header` | `12px` (`text-xs`) | **`13px` (`text-[13px]`)** | — | ✅ Verified |
| 39 | Breakdown Row Labels (`Taxable Credit:`, `CGST:`, `SGST:`) | `.summary-row label` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 40 | Breakdown Row Values (`₹350.00`, `₹0.00`, etc.) | `.summary-row value` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 41 | Grand Total Label (`Grand Total Credit:`) | `.total-row label` | `14px` (`text-sm`) | **`15px` (`text-[15px]`)** | — | ✅ Verified |
| 42 | Grand Total Value (`₹350.00` / `₹1,050.00`) | `.total-row value` | `18px` (`text-lg`) | **`20px` (`text-xl`)** | — | ✅ Verified |

---

## 2. Credit Note Printable View
- **File Path:** [`components/app/credit-notes/credit-note-print-view.tsx`](file:///d:/BM_Codes/BM_TS_Codes/BM_TS_v2.0.2C3.5/components/app/credit-notes/credit-note-print-view.tsx)
- **Previous Revisions:** `Modified 1 (23 Sept 2026)`
- **Scope:** Retail print density optimization, typography scaling for A4/A5 single-page fit, and high-contrast legal compliance.

| # | Section & UI Element | Selector / Target | Old Value | Modified 1 (23 Sept 2026) | Modified 2 (Date) | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | Company Name Header | `h1` | `16px` | **`18px` (`text-lg font-bold`)** | — | ✅ Verified |
| 2 | Statutory Badge (`CREDIT NOTE`) | `.badge` | `13px` | **`14px font-bold` (`text-sm`)** | — | ✅ Verified |
| 3 | Statutory Reference Subtitle (`Under Section 34...`) | `p.subtitle` | `9px` | **`10px` (`text-[10px]`)** | — | ✅ Verified |
| 4 | Metadata Box Text (Labels & Values) | `.meta-box` | `11px` | **`12px` (`text-xs`)** | — | ✅ Verified |
| 5 | Credit Note Number Value in Meta Box | `strong.cn-num` | `12px` | **`14px font-bold` (`text-sm`)** | — | ✅ Verified |
| 6 | Table Column Headers (`#`, `Item Description`, etc.) | `thead th` | `11px` | **`12px font-bold` (`text-xs`)** | — | ✅ Verified |
| 7 | Table Body Line Item Rows & Values | `tbody td` | `11px` | **`12px font-medium` (`text-xs`)** | — | ✅ Verified |
| 8 | Tax Rate Sub-labels (`(0.0%)`, `(9.0%)`) | `span.tax-sub` | `8px` | **`9px` (`text-[9px]`)** | — | ✅ Verified |
| 9 | Totals Summary Breakdown Labels & Values | `.totals-summary div` | `11px` | **`12px` (`text-xs`)** | — | ✅ Verified |
| 10 | Grand Total Credit Amount Label & Value | `.grand-total` | `14px` (`text-sm`) | **`14px font-black` (`text-sm uppercase`)** | — | ✅ Verified |
| 11 | Credit Amount in Words Line (Line 1) | `.amount-in-words` | `11px` | **`13px font-bold` (`text-[13px]`)** | — | ✅ Verified |
| 12 | Statutory Note Line (Line 2) | `.statutory-note` | `10px` | **`11.5px font-medium` (`text-[11.5px]`)** | — | ✅ Verified |
| 13 | Signatory Label (`For MARUTHI BOOKS & GIFTS:`) | `.signatory-for` | `11px` | **`12px font-bold` (`text-xs`)** | — | ✅ Verified |

---

## 3. Credit Note Detail Page Controls & Sidebar
- **File Path:** [`components/app/credit-notes/credit-note-detail.tsx`](file:///d:/BM_Codes/BM_TS_Codes/BM_TS_v2.0.2C3.5/components/app/credit-notes/credit-note-detail.tsx)
- **Previous Revisions:** `Modified 1 (23 Sept 2026)`
- **Scope:** Control bar ergonomics, action buttons, paper size switches, and sidebar settlement metrics.

| # | Section & UI Element | Selector / Target | Old Value | Modified 1 (23 Sept 2026) | Modified 2 (Date) | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | Paper Size Toggle Labels (`A4` / `A5`) | `button[data-size]` | `12px` | **`13px font-bold` (`text-[13px]`)** | — | ✅ Verified |
| 2 | Action Button Labels (`Print`, `PDF`) | `button.action-btn` | `12px` | **`14px font-semibold` (`text-sm`)** | — | ✅ Verified |
| 3 | Action Button Icons (`Printer`, `Download`) | `svg.icon` | `16px` | **`18px` (`size-[18px]`)** | — | ✅ Verified |
| 4 | Sidebar Settlement Metric Values | `.settlement-strip span` | `11px` | **`12px font-bold` (`text-xs`)** | — | ✅ Verified |
| 5 | Original Invoice Quick Link Button | `button.orig-inv-link` | `12px` | **`13px font-medium` (`text-[13px]`)** | — | ✅ Verified |

---

## 4. Invoice Detail Page Controls
- **File Path:** [`components/app/invoices/invoice-detail.tsx`](file:///d:/BM_Codes/BM_TS_Codes/BM_TS_v2.0.2C3.5/components/app/invoices/invoice-detail.tsx)
- **Previous Revisions:** `Modified 1 (23 Sept 2026)`

| # | Section & UI Element | Selector / Target | Old Value | Modified 1 (23 Sept 2026) | Modified 2 (Date) | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | Paper Size Toggle Labels (`A4` / `A5`) | `button[data-size]` | `12px` | **`13px font-bold` (`text-[13px]`)** | — | ✅ Verified |
| 2 | Action Button Labels (`Print`, `PDF`, `Issue CN`) | `button.action-btn` | `12px` | **`14px font-semibold` (`text-sm`)** | — | ✅ Verified |
| 3 | Action Button Icons (`Printer`, `Download`, etc.) | `svg.icon` | `16px` | **`18px` (`size-[18px]`)** | — | ✅ Verified |
