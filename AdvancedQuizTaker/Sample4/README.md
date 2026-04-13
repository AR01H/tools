# QuizMaster Pro — Setup Guide

## Files Delivered
- `index.html` — Complete single-file React app (open in any browser)
- `Code.gs`    — Google Apps Script backend for Drive storage
- `README.md`  — This file

---

## How to Run Locally
Just open `index.html` in any modern browser. No build step needed.
- Data is stored in localStorage automatically
- Add `?admin` to the URL to access the Admin Panel

---

## Admin Panel Access
```
http://localhost/index.html?admin
```
- Manage questions (add/edit/delete/import CSV/export CSV)
- Manage quiz configs (all toggles, times, navigation modes)
- View all student results with score bars
- Reset data, connect Google Drive

---

## Google Apps Script Setup (for Drive storage)

1. Go to https://script.google.com and create a new project
2. Paste `Code.gs` content as the script
3. Change `ROOT_FOLDER_ID` at the top to your Google Drive folder ID
4. Click **Deploy → New Deployment**
   - Type: Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click Deploy → copy the Web App URL
6. In the app → Admin → Settings → paste the URL

---

## Google Drive Folder Structure

Create this structure in Drive, then grab the root folder ID from the URL:
```
YOUR_ROOT_FOLDER/
├── Quiz Config Data/
│     └── quiz_config.csv          ← uses Quiz_configuration_Sample.csv format
├── Questions Data/
│     ├── Quant/
│     │     ├── Arithmetic.csv     ← uses Questions_Sample.csv format
│     │     └── Numbers.csv
│     ├── English/
│     │     └── Grammar.csv
│     ├── Science/
│     │     └── Physics.csv
│     └── GK/
│           └── Geography.csv
└── Result Data/
      ├── Result_Data.csv           ← auto-created, uses Result_Data.csv format
      └── result_StudentName_*.csv  ← per-attempt files (auto-created)
```

---

## Question Types Supported
| Type | Description |
|------|-------------|
| Multichoice | Single correct answer (A/B/C/D) |
| Multi Multichoice | Multiple correct answers |
| Multichoice Anycorrect | Any of the correct options |
| True/False | TRUE or FALSE |
| Sequence | Arrange items in order |
| Short Answer | Free text input |
| Fill in the Blanks | Type the missing word |
| Inline Blank | Fill blank within sentence |
| Matching | Match left to right pairs |
| Multi Matching | Match items to multiple categories |
| Drag & Drop | (rendered as MCQ) |

---

## Quiz Config Fields
| Field | Description |
|-------|-------------|
| Quiz Time | Total time in seconds (0 = unlimited) |
| Question Time | Per-question time in seconds (0 = none) |
| Negative Marking | Deduct points for wrong answers |
| Partial Scoring | Award partial marks for partial correct |
| Allow Back | Can go to previous question |
| Mark for Review | Flag questions for later review |
| Instant Answer | Show correct answer immediately after answering |
| Show Hint | Display hint button |
| Auto Submit | Auto-submit when time expires |
| Pause/Resume | Allow pausing the quiz |
| Random Options | Shuffle answer choices |
| Final Result | Show result page at end |
| Question Wise Result | Show per-question analysis |

---

## Features
- ✅ 5 Themes (Dark, Light, Midnight, Ocean, Forest)
- ✅ All question types rendered correctly
- ✅ Full quiz engine: timers, flagging, navigation panel
- ✅ Pause/Resume support
- ✅ Instant answer feedback with solution
- ✅ Hint system
- ✅ Score calculation (negative marking, partial scoring)
- ✅ Result page: grade, donut chart, bar charts by category & difficulty
- ✅ Review mode: see your answers vs correct answers
- ✅ Answer key mode
- ✅ Share result / download as CSV
- ✅ Admin panel: full CRUD for questions, configs, results
- ✅ CSV import/export
- ✅ Data persisted in localStorage
- ✅ Google Drive backend via Apps Script
- ✅ Responsive design
- ✅ `?admin` URL param for admin access
