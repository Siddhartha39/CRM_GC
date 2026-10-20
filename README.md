# 🌌 Galaxy Computers CRM — Kanpur Store Desk

Production-ready, responsive, full-stack Customer Relationship Management (CRM) web application tailored for **Galaxy Computers**, a computer and laptop retail & service center in Kanpur, India.

Built with **React + Vite**, **Tailwind CSS**, and backed by **Google Firebase Cloud Firestore** & **Firebase Authentication**.

---

## 🎨 Hand-Drawn Design System

The application features a unique, handcrafted, paper-based digital workspace design:
- **Warm Paper Canvas:** `#fdfbf7` with subtle dotted paper grid (`radial-gradient(#e5e0d8 1px, transparent 1px)`).
- **Pencil Black Outline:** `#2d2d2d` borders with hand-drawn wobbly curvature (`border-wobbly`, `border-wobbly-md`).
- **Hard-Offset Shadows:** `4px 4px 0 #2d2d2d` (standard) and `8px 8px 0 #2d2d2d` (emphasized).
- **Typography:** Google Fonts:
  - **Headings:** Kalam (weight 700)
  - **Body & Forms:** Patrick Hand (weight 400)
- **High Operational Usability:** Tables, forms, and workflows prioritize readability, high information density, and rapid daily calling without distorting operational data.

---

## 🚀 Key Features

### 1. Master Customer Database (`/leads`)
- Central customer registry with unique atomic sequential IDs (e.g. `GC-10001`).
- Real-time search across customer name, phone number, GC ID, and product requirements.
- Multi-dimensional filters for Lead Category (Hot, Warm, Cold), Status (New, Contacted, Follow-up, Converted, Lost, Do Not Contact), and sorting.
- Phone number normalization (Indian 10-digit standard) with duplicate customer warnings.
- One-click sample Kanpur data population for instant testing.

### 2. Hot, Warm, and Cold Lead Management
- **🔥 Hot Leads (`/leads/hot`):** Immediate/near-term buyer requirement with red status badges and urgent queues.
- **⚡ Warm Leads (`/leads/warm`):** Evaluation stage buyers comparing quotes or awaiting stock.
- **❄️ Cold Leads (`/leads/cold`):** Long-term pipeline with scheduled callbacks for future months.
- Lead categories are independent of follow-up dates and preserve historical progression.

### 3. Date-Wise Daily Follow-Up Engine (`/followups/*`)
- Fully calibrated to the **Asia/Kolkata (IST)** business timezone.
- **Today's Follow-ups (`/followups/today`):** Real-time calling queue due today.
- **Overdue Follow-ups (`/followups/overdue`):** Incomplete past-due tasks that remain prominently flagged until worked or rescheduled.
- **Upcoming Follow-ups (`/followups/upcoming`):** Dynamic forward pipeline (7, 15, 30 days).
- **Completed Follow-ups (`/followups/completed`):** Audit trail of resolved tasks.
- **Interactive Calendar (`/followups/calendar`):** Monthly grid with live task counts per day; click any date to open its scheduled calling list.

### 4. Permanent Customer Calling History & Call Completion Modal
- Complete customer calling timeline with hand-drawn connectors.
- Atomic multi-document writes: records call log, updates customer's latest feedback and lead category, creates or updates scheduled follow-up tasks, and writes to `auditLogs`.
- Call outcomes: *Interested, Call Back Later, No Requirement, No Answer, Busy, Not Interested (with Do Not Contact opt-out), Converted / Sale Completed, Wrong Number*.
- **Data Integrity:** Historical call feedback is strictly append-only and never overwritten by subsequent calls.

### 5. Excel (.xlsx, .xls) & CSV Bulk Import/Export Hub (`/import-export`)
- **Multi-Format Support:** Ingestion of `.xlsx`, `.xls`, and `.csv` files up to 15MB via **SheetJS (`xlsx`)** and **Papa Parse**.
- **Multi-Worksheet Selector:** Automatically detects all sheets in an Excel workbook, allowing instant switching and sheet-level row counts.
- **Data Preview:** Interactive 15-row preview table displaying raw sheet headers and values before mapping.
- **15-Field Intelligent Auto-Mapping:** Automatic detection for:
  - Customer Name (`fullName`)
  - Mobile Number (`phone`)
  - Alternate Phone (`alternatePhone`)
  - Email (`email`)
  - City / Area (`city`)
  - Address (`address`)
  - Product Requirement (`requirement`)
  - Budget INR (`budget`)
  - Lead Category (`leadCategory`: Hot, Warm, Cold)
  - Lead Status (`leadStatus`: New, Contacted, Follow-up, Converted, Lost, Do Not Contact)
  - Last Call Date (`lastCallDate`)
  - Next Follow-up Date (`nextFollowUpDate`)
  - Latest Feedback / Notes (`latestFeedback`)
  - Customer Source (`source`)
  - Assigned Employee (`assignedTo`)
- **Data Integrity & Security:**
  - Phone numbers preserved as text strings, preventing leading zero truncation or scientific notation corruption.
  - Robust date parsing: handles Excel serial numbers (e.g. `45234` -> `2023-11-04`), ISO timestamps, and `DD/MM/YYYY` formats.
  - Formula injection defense: strips leading `=`, `+`, `-`, `@` characters to neutralize CSV/Excel execution exploits.
- **Pre-Import Validation Dashboard:**
  - Live counts for Total Rows, Valid Rows, Database/Batch Duplicates, and Invalid Rows.
  - 3 Duplicate Handling Modes:
    1. **Skip Duplicates:** Protects existing leads, inserts only new customers.
    2. **Update Matching Customers:** Enriches existing matching customer records with new requirements/follow-ups while strictly preserving call logs and historical timelines.
    3. **Add New Only:** Strict mode.
  - **1-Click Rejected Rows CSV:** Downloads a spreadsheet containing all skipped/failed rows with exact error reasons.
- **Safe Batch Writes:** Firestore `writeBatch` execution in chunks of 150 records with live progress percentage indicators.
- **Sample Templates:** Built-in generators for downloadable sample Excel (`.xlsx`) and CSV (`.csv`) workbooks pre-filled with Kanpur computer store customer examples.
- **Export Hub:** Download customer databases (filtered by category) and calling logs in both `.csv` and `.xlsx` formats.

### 6. Analytics & Reports (`/reports` & `/`)
- Real-time store KPIs: Total Leads, Hot/Warm/Cold distribution, calls logged today, overdue follow-ups, conversion rates.
- Interactive Recharts visualizations with paper-matching styling:
  - Lead Category breakdown (Pie chart)
  - Lead sources (Walk-in vs Google Maps vs Referral bar chart)
  - Call outcomes distribution
  - Executive calling performance

### 7. Authentication & Security Rules
- Firebase Authentication with persistent sessions and protected routes.
- Role-based permissions (**Admin** and **Employee**).
- First registered account automatically granted Administrator role.
- Production-grade Firestore Security Rules (`firestore.rules`) enforcing document schemas and immutable call logs.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend Framework | React 18 + Vite |
| Database & Backend | Google Cloud Firestore (Modular SDK v10) |
| Authentication | Firebase Authentication |
| Styling | Tailwind CSS + Custom Hand-Drawn Tokens |
| Charts | Recharts |
| Date Utilities | date-fns (Asia/Kolkata timezone support) |
| Excel & Spreadsheet Engine | SheetJS (`xlsx`) + Papa Parse |
| Icons | Lucide React |
| Notifications | Sonner Toaster |

---

## ⚙️ Firebase Configuration

The application uses Firebase Authentication and Cloud Firestore. For security best practices, sensitive keys are managed via environment variables rather than exposed in public documentation.

Configure your environment variables in `.env` (refer to `.env.example`):

```bash
# Copy example configuration
cp .env.example .env
```

Your `.env` file should contain:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="galaxycrm-4577f.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="galaxycrm-4577f"
VITE_FIREBASE_STORAGE_BUCKET="galaxycrm-4577f.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

> **Security Note:** Firebase Web API keys are client-side project identifiers. Actual database security is enforced by the **Firestore Security Rules** (`firestore.rules`) and user authentication, preventing unauthorized reads or writes.

---

## 🚦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🔒 Deploying Firestore Security Rules & Indexes

To deploy the included rules and composite indexes to your Firebase project:

```bash
# Login to Firebase
firebase login

# Deploy rules and indexes
firebase deploy --only firestore
```

---

## 📋 Acceptance Criteria Verified

- [x] Firebase modular SDK initialized cleanly with provided project `galaxycrm-4577f`.
- [x] Hand-drawn visual design system with Kalam (700) headings, Patrick Hand (400) body, paper dots background, and hard shadows.
- [x] Customer creation with atomic sequential IDs (`GC-10001`).
- [x] Indian mobile phone number normalization and duplicate detection.
- [x] Hot, Warm, Cold views with custom priority guidance.
- [x] Date-wise daily follow-up system with Asia/Kolkata timezone handling.
- [x] Permanent chronological call history timeline (past calls are immutable).
- [x] Atomic call logging with customer status sync and task scheduling.
- [x] CSV Import with column mapping and CSV export.
- [x] Real-time dashboard analytics with Recharts graphs.
- [x] Production build passes with zero errors (`npm run build`).
