# PrepQuick — Advanced Quiz Platform

PrepQuick is a powerful, full-stack quiz application designed for creating, taking, and analyzing advanced assessments. Built with a modern vanilla JavaScript frontend and a robust Google Apps Script backend, it offers a seamless experience for both educators and students.

## 🚀 Key Features

- **Rich Question Ecosystem**: Supports 12+ question types including:
  - Single/Multiple Choice, True/False, Short Answer
  - Fill in the Blanks (Text & Inline)
  - Interactive Matching & Multi-Matching
  - Sequence Ordering & Drag & Drop Categorization
  - Range sliders for numeric inputs
- **Dynamic Quiz Engine**:
  - Filter questions by Topic, Category, and Difficulty.
  - Multiple Design Templates (Standard Design, QuizPro Dark, Editorial, Study Mode).
  - Adaptive Mode: Automatically adjusts difficulty based on performance.
- **Proctoring & Timing**:
  - Global quiz timers and individual question timers.
  - Configurable navigation (Free vs. Sequential).
  - Mark for Review and Hint features.
- **Analytics & Reporting**:
  - Real-time scoring and performance visualizer using [Chart.js](https://www.chartjs.org/).
  - Detailed attempt history and progress tracking.
  - Professional PDF Result Exports via [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/).
- **Admin Dashboard**:
  - Secure Admin panel to view global statistics.
  - Manage and clear global history.
- **Customization**:
  - Sleek Dark/Light mode support.
  - Fully responsive design using modern CSS.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3.
- **Backend**: Google Apps Script (GAS).
- **Data Storage**: Google Drive (CSV-based storage for questions and attempts).
- **Fonts**: Sora, JetBrains Mono, Libre Baskerville (Google Fonts).

---

## ⚙️ Project Structure

```text
QuizTaker/
├── Code.gs             # Google Apps Script Backend (Deployment script)
├── index.html          # Application Entry Point
├── css/
│   ├── main.css        # Core layout and styling
│   └── themes.css      # Dark/Light/Custom themes
├── js/
│   ├── api.js          # GAS Communication layer
│   ├── ui.js           # UI & Navigation orchestration
│   ├── quiz.js         # Runtime Quiz Engine
│   ├── result.js       # Result processing & PDF generation
│   ├── quiz-config.js  # Quiz setup and configuration UI
│   ├── filters.js      # Question filtering logic
│   ├── state.js        # Global app state management
│   ├── env.js          # API & Folder environment settings
│   └── dashboard.js    # Home page & Statistics
├── components/
│   └── question-types.js # Individual question renderers
└── README.md           # This file
```

---

## 🏗️ Setup & Installation

### 1. Backend Setup (Google Apps Script)
1.  Go to [script.google.com](https://script.google.com) and create a **New Project**.
2.  Copy the contents of `Code.gs` and paste it into the script editor.
3.  Create a folder in your Google Drive where you want to store your quiz data.
4.  Copy the **Folder ID** from the URL of that folder.
5.  In `Code.gs`, find line 15 and update `ROOT_FOLDER_ID`:
    ```javascript
    var ROOT_FOLDER_ID = "YOUR_DRIVE_FOLDER_ID_HERE";
    ```
6.  Click **Deploy** -> **New Deployment**.
    - **Type**: Web App
    - **Execute as**: Me
    - **Who has access**: Anyone
7.  Copy the **Web App URL** provided after deployment.

### 2. Frontend Configuration
1.  Open `js/env.js`.
2.  Replace the `scriptUrl` with your deployed Web App URL:
    ```javascript
    const ENV = {
      scriptUrl: "YOUR_WEB_APP_URL_HERE",
      // ... your predefined folders
    };
    ```
3.  Open `index.html` in your browser.

---

## 📊 Data Preparation (Google Drive)

PrepQuick reads data from CSV files within your Drive folder. Your folder structure should look like this:

```text
Root Folder/
├── Questions Data/
│   ├── Topic Name A/
│   │   └── questions.csv
│   └── Topic Name B/
├── Quiz Config Data/
│   └── quiz_config.csv
└── Result Data/        # Created automatically
```

### Question CSV Format
Column headers expected in your `.csv` files:
- `ID`: Unique identifier.
- `Question`: The question text (supports HTML).
- `Question Type`: `Multichoice`, `Fill in the Blanks`, `Matching`, etc.
- `Choice1`, `Choice2`, ...: Content for choices.
- `Correct Answer`: The target answer(s).
- `Category`: Topic grouping.
- `Difficulty`: `Easy`, `Medium`, or `Hard`.
- `Explanation`: Text shown in study mode or after submit.

---

## 🔒 Security Note

- The Admin Dashboard (`adminLogin`) uses base64 encoded credentials defined in `Code.gs`.
- Ensure you change the `ADMIN_CREDENTIALS` in `Code.gs` before production use.

## 📄 License
This project is for educational and professional practice use. 
✨ Built with passion by AR01H.
