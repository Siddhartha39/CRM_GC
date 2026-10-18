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

### 5. CSV Bulk Import & Export (`/import-export`)
- **Import:** Powered by PapaParse with interactive column mapping, sample preview, duplicate phone detection, and row-level validation.
- **Export:** Instant CSV downloads of filtered customer records and calling history.

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
| CSV Engine | Papa Parse |
| Icons | Lucide React |
| Notifications | Sonner Toaster |

---

## ⚙️ Firebase Configuration

The application is pre-configured with project `galaxycrm-4577f` in `src/lib/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBSUb1QhQjoXYIFSwOIeFosTwMazJygjJ8",
  authDomain: "galaxycrm-4577f.firebaseapp.com",
  projectId: "galaxycrm-4577f",
  storageBucket: "galaxycrm-4577f.firebasestorage.app",
  messagingSenderId: "164533149482",
  appId: "1:164533149482:web:3c3d7952deb365d2708853",
  measurementId: "G-5CRL2LTT5L"
};
```

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
