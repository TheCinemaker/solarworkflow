# Claude Handover & Project Status - Solar Workflow

Welcome to the **Solar Workflow** project! This is a premium, mobile-first solar installation and electrician workflow management app built with **React**, **Tailwind CSS**, and **Supabase**.

This document serves as your guide to understand the current state, architecture, database schemas, styling rules, and immediate next tasks.

---

## 1. Project Overview & Architecture

The app is designed to replace paper/Google Sheets tracking for electricians out in the field. It has a beautiful, iOS-like Apple glassmorphic design system. 

### Key Technologies:
- **Frontend**: React (Vite), Tailwind CSS (plus custom variables in `src/index.css` for styling).
- **Backend/Auth**: Supabase (PostgreSQL, Auth, Storage).
- **Hosting**: Netlify (automatic continuous deployment via GitHub).

### Directory Structure:
- `src/components/`: Modular elements (Modals, Form inputs, navigation bars).
- `src/layouts/`: Layout wraps like `MainLayout.jsx` (which contains the bottom navigation and top header).
- `src/pages/`: Page containers (Dashboard, ProjectList, ProjectDetails, Timesheet, Finance, Issues).
- `src/lib/`: Lib helper config files (specifically `supabase.js`).
- `supabase/`: Database schema alterations and scripts.

---

## 2. Style Guide & Design Rules (CRITICAL)

The client is **extremely selective** about visual aesthetics. We've iterated multiple times to lock in a premium feel. Please respect the following constraints when adding components or styling:

### A. Color Palette & Glassmorphic variables (from `src/index.css`)
- **App Background**: `#07090f` (very deep navy/black).
- **Cards/Panels Background**: `var(--s1)` (which represents translucent white `rgba(255,255,255,0.06)`).
- **Borders**: `1px solid var(--b1)` (translucent white `rgba(255,255,255,0.09)`).
- **Blur/Glass effect**: `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`.
- **Text colors**: `var(--t1)` (White), `var(--t2)` (Light gray), `var(--t3)` (Muted gray/blue).

### B. Form Inputs and Modals (Approved Layout)
Inputs must look super thin, sleek, and high-end:
- **Inputs & Textareas**: 
  - `padding: 7px 12px` (strictly thin, compact vertical padding).
  - `borderRadius: 10px`.
  - `fontSize: 13px`.
  - Background: `var(--s1)`, Border: `1px solid var(--b1)`.
- **Input Labels**:
  - `fontSize: 13px`.
  - `fontWeight: 600`.
  - Text transform: `uppercase`.
  - Letter spacing: `0.05em`.
  - Margin bottom: `6px` (spacing between label and input).
- **Form spacing**: Use `space-y-3` inside `<form>` containers to keep elements airy but clean.
- **Modals**: Background must use translucent black `rgba(7, 9, 15, 0.75)` with a backdrop blur of `16px`, and the card border radius must be `20px` or `24px` with a drop shadow.

---

## 3. Database Schema (Supabase)

We recently updated the database tables to support the new modular forms. The user runs migrations manually in the SQL Editor. The latest file is located at `supabase/add_serial_numbers.sql`.

### Tables Overview:
1. **`projects`**:
   - `id`: UUID (Primary Key).
   - `serial_number`: `TEXT` (User-facing Project ID, e.g. `PRJ-01`).
   - `name`: `TEXT` (Project name).
   - `address`: `TEXT` (Location address).
   - `client_name`: `TEXT`.
   - `client_phone`: `TEXT`.
   - `deadline`: `DATE` (synced with Befejezési dátum).
   - `start_time`: `TEXT` (Stores Start Date as text string).
   - `end_time`: `TEXT` (Stores End Date as text string).
   - `important_info`: `TEXT` (e.g. key placement or door codes).
   - `tasks`: `TEXT` (Newline-separated task list).
   - `created_at`: `TIMESTAMPTZ`.

2. **`profiles`** (Users and roles):
   - `id`: UUID (FK to auth.users).
   - `full_name`: `TEXT`.
   - `role`: `TEXT` (either `'admin'` or `'worker'`).
   - `serial_number`: `TEXT` (Worker employee ID, e.g. `EMP-01`).

---

## 4. Current State: What Was Completed

1. **"Zero-Data" Clean Slate**: The app is completely empty and shows friendly "Empty states" if there is no data in Supabase. All static mock data (like Nagy Villa, Molnár ház, faked revenues) has been purged.
2. **Apple Dashboard Restructuring**: Purged fake battery/cellular top status bars. Cleaned up dead navigation links and aligned everything to the custom CSS classes.
3. **Modals Redesigned**: `NewProjectModal.jsx` and `NewWorkerModal.jsx` are fully functioning, hook directly to Supabase, and implement the approved compact styling.
4. **Dashboard List**: Displays real database projects dynamically, appending the user-facing serial number next to the tag (e.g., `⚡ Projekt · PRJ-01`).
5. **Realtime Database Synchronization**: Configured full Supabase Realtime subscriptions in `Dashboard.jsx`, `ProjectList.jsx`, and `ProjectDetails.jsx`. Updates (like a worker checking a task or uploading a photo on the field) reflect instantly on the Admin's screen without reloading.
8. **Daily Timesheets (Munkalapok)**: Fully implemented a premium daily work logging system inside `Timesheet.jsx` featuring dynamic project associations, automated decimal work hour calculations from time inputs (start/end times), and an isolated workflow tied to the logged-in user profile.
9. **Full Realtime Sync for Timesheets**: Handled real-time updates for worklogs using Supabase postgres changes subscription, so new worker logs appear instantly on the Admin's listing.

---

## 5. Next Steps & Todo list for Claude (Where you should pick up)

### Task A: Role-Based Views (Admin vs. Worker)
- **Problem**: Workers shouldn't see financial stats, editable forms, or admin actions.
- **Action**: Check `user.role` from `profiles` after logging in. In `Dashboard.jsx` and `MainLayout.jsx`, dynamically hide:
  - Admin tools (e.g. "Új Projekt", "Új Dolgozó" buttons).
  - Financial page (`/finance`) access.
  - Workers' profiles edits.

### [COMPLETED] Task B: Wire Up Project Details & Checklist
- **Done**: Rendered `tasks` as checklist checkboxes with Supabase saving and dynamic progress bar tracking.

### [COMPLETED] Task C: Timesheet & Daily Logging
- **Done**: Workers can log daily hours, dates, descriptions, and times dynamically with auto-calculated hours.

### [COMPLETED] Task D: Checkpoint Photo Tracking (Supabase Storage)
- **Done**: Implemented direct file uploads and photo gallery rendering with project UUID folder isolation.

---

Good luck! Let's build a stunning, lightning-fast application together! 🚀☀️
