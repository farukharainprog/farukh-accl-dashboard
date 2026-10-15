# Farukh Businessman Wala ACCL Dashboard
### Rehan School Tuition Academy
*Created by FARUKH BUSINESSMAN WALA*

Official full-stack ACCL (Artificial Intelligence & Creative Leadership) curriculum tracking, real-time Pakistan Standard Time (Asia/Karachi) attendance recording, social media proof verification, and mentor evaluation platform.

---

## 🌟 Implemented Feature Checklist

- [x] **Branding & Visual Layout**:
  - Exact dashboard title: **"Farukh Businessman Wala ACCL Dashboard"**
  - Subtitle: **"Rehan School Tuition Academy"**
  - Footer credit: **"Created by FARUKH BUSINESSMAN WALA"**
  - Primary WhatsApp display number: **"0345 3967083"** ([https://wa.me/923453967083](https://wa.me/923453967083))
  - Second WhatsApp display number: **"03421336388"** ([https://wa.me/923421336388](https://wa.me/923421336388))
  - Polished blue-and-white theme matching the reference dashboard screenshots.
  - Owner-only logo upload/change option.
- [x] **Curriculum & Tasks Preservation**:
  - Full import of all 221 tasks from the original dashboard dump (Day 1 through Day 180).
  - Preserved original titles, categories, descriptions, and required submission proofs (Facebook Post, YouTube Content, LinkedIn Post, View Submission).
  - Accurate preservation of missing days (e.g. Day 15, Day 128) and repeated day tasks (e.g. Day 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 120, 127, 134, 141, 148, 155, 162, 169, 176, 180) without silent renumbering or fabrication.
  - Clearly labeled placeholder for **Book 2** ("Welcome to Foundation Level Book 2") with no fabricated tasks.
- [x] **Four-Tier Role-Based Security & Permissions**:
  - **Owner / Super Admin**: First-owner secure initialization, user role promotion, student activation/suspension, teacher application approvals, audit activity logs, task management, and academy settings.
  - **Admin**: Review submissions within assigned scope, cannot demote Owner or create Admins.
  - **Teacher**: Public "Become a Teacher" application (Pending Owner Approval). After approval and student assignment, teachers see only assigned students. Owner can toggle whether teacher has direct task approval rights or correction feedback rights.
  - **Student**: Register with email/Gmail, father name, WhatsApp, and password. Saved as **Pending Activation** until activated by Owner. Access restricted strictly to own submissions, attendance, and feedback.
- [x] **Real-Time Attendance Widget (Asia/Karachi)**:
  - Server-recorded timestamps in Pakistan Standard Time (`Asia/Karachi`).
  - Active Check-In and Check-Out buttons.
  - Live ticking timer showing elapsed session time while checked in.
  - Monthly attendance statistics: Days present this month, completed sessions, total hours.
  - Full attendance history view with explicit disclaimer: *"App-recorded attendance, not proof of physical presence."*
- [x] **Submissions & Review Workflow**:
  - Social proof inputs: Facebook, YouTube, LinkedIn, Instagram, Other link, and file uploads.
  - One valid proof link or code reflection is sufficient to submit (no forced empty fields).
  - URL format validation.
  - Multi-version tracking: Resubmitting after correction preserves prior versions and reviewer feedback in submission history.
  - Review queue with Approve (Green), Needs Correction (Amber), and Reject (Red) decisions with reviewer feedback notes.
- [x] **Group Learning & Batches**:
  - Cohort batches with teacher assignments, schedules, and live Zoom meeting links.
  - Student batch enrollment tracker ("My Batch Enrollments").
- [x] **Feedback & Scoreboard**:
  - Student feedback form with 1–5 star rating and category selection.
  - Feedback Scoreboard displaying reviews and academy leadership responses.
  - Real database-calculated student scoreboard (10 pts per approved task + 5 pts per attendance session).
- [x] **Admissions**:
  - "New Student Admission" form with Father's name, WhatsApp, email, and level.
  - "New Teacher Admission" section for mentor recruitment.

---

## 🚀 Running Locally

### 1. Prerequisites
- **Node.js**: v22.0.0 or higher (uses built-in SQLite engine `node:sqlite`).
- **npm** or **bun**.

### 2. Installation
```bash
# Clone or download the repository
cd applet

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration items in `.env`:
```env
PORT=3000
ACADEMY_TIMEZONE="Asia/Karachi"
JWT_SECRET="accl-farukh-businessman-wala-secret-key-2026"
FIRST_OWNER_SETUP_KEY="setup-owner-accl-key"
```

### 4. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` with Express backend API routes and Vite frontend dev server mounted.

### 5. Production Build & Run
```bash
# Build React application
npm run build

# Start production server
npm run start
```

---

## 🔑 Initial First-Owner Setup Guide

1. Navigate to `http://localhost:3000` (or your deployed URL).
2. On the welcome screen, click **"Initial Owner Setup"**.
3. Fill in:
   - **Full Name**: e.g., `FARUKH BUSINESSMAN WALA`
   - **Email / Gmail**: `owner@rehanschool.com`
   - **Password**: Create your secure master password.
   - **WhatsApp Number**: `0345 3967083`
4. Submit the form. The system will register you as the **Super Admin / Owner** with full control over user activations, teacher approvals, task manager, and academy settings.
5. Once an owner is registered, the first-owner setup tab is automatically locked for security.

---

## 🗄️ Database Schema & Storage

The application uses a persistent relational SQLite database (`academy.db`) managed via `node:sqlite`:

| Table | Description |
|---|---|
| `users` | User accounts (id, email, password_hash, salt, full_name, father_name, whatsapp, role, status, learning_level, can_approve, can_admit) |
| `tasks` | 221 Curriculum tasks (id, book, day_number, title, description, category, required_links, allows_text, allows_file, source_flag) |
| `submissions` | Student submissions (student_id, task_id, version, status, fb_link, yt_link, li_link, insta_link, other_link, file_url, student_notes, reviewer_feedback) |
| `submission_history` | Archived past versions and feedback iterations for every resubmitted task |
| `attendance_sessions` | Check-in / check-out timestamps in Asia/Karachi time, elapsed minutes, and date keys |
| `student_admissions` | Admission requests awaiting review and activation |
| `teacher_applications` | Applications from teachers and mentors awaiting Owner approval |
| `batches` | Cohort learning batches with schedules, Zoom links, and capacities |
| `batch_enrollments` | Student enrollments in learning batches |
| `student_feedback` | Reviews, star ratings, and administrator responses |
| `audit_logs` | Security audit trail of user approvals, role changes, task edits, and settings modifications |
| `academy_settings` | Dynamic key-value branding (titles, WhatsApp numbers, logo URL, approval workflows) |

---

## 🌐 Deploying to Low-Cost or Free Hosting

### Option A: Railway, Render, or Fly.io
1. Push your repository to GitHub.
2. Link your repository in Render / Railway / Fly.io.
3. Build Command: `npm run build`
4. Start Command: `npm run start`
5. Ensure a persistent volume is mounted for `academy.db` if you wish to retain database state across container redeployments.

### Option B: VPS (Ubuntu / Debian / DigitalOcean Droplet)
1. Install Node.js v22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
2. Run with PM2:
   ```bash
   npm install -g pm2
   npm run build
   pm2 start server.ts --name "accl-dashboard" --interpreter ./node_modules/.bin/tsx
   pm2 save
   pm2 startup
   ```

---

## 🧪 Tests & Verification Performed
- ✅ TypeScript compilation check (`tsc --noEmit`): 0 errors.
- ✅ Applet build compilation (`compile_applet`): Succeeded.
- ✅ Database auto-initialization & migration: Succeeded.
- ✅ Seeding of all 221 tasks from original dashboard dump: Verified Day 1 through Day 180.
- ✅ Asia/Karachi time calculations: Verified format `M/D/YYYY, H:MM:SS AM/PM PKT`.
- ✅ Multi-role permissions: Owner, Admin, Teacher (scoped to assigned students), Student (scoped to self).

---
© 2026 Created by **FARUKH BUSINESSMAN WALA** • Rehan School Tuition Academy
