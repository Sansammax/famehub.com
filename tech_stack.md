# FameHub Tech Stack & Architecture Document

Welcome to the **FameHub** project (also referenced as **Smart Live LMS**). This document provides a comprehensive analysis of the folder structure, technologies used, and details on how the codebase operates under the hood.

---

## 📂 Folder Structure Analysis

```text
famehub.com/
├── .vscode/                 # IDE Configuration files
├── dist/                    # Compiled production build output (Vite output)
├── node_modules/            # Node package dependencies
├── public/                  # Static assets served directly (Favicon, icons)
│   ├── favicon.svg          # Site icon
│   └── icons.svg            # SVG icons
├── src/                     # Source code directory
│   ├── assets/              # Assets processed by the bundler
│   │   ├── hero.png         # Main illustration/hero image
│   │   ├── javascript.svg   # JS branding icon
│   │   └── vite.svg         # Vite branding icon
│   ├── counter.js           # Vite demo counter script (Unused in main app)
│   ├── main.js              # Application core (State, Router, Components, Pages)
│   └── style.css            # Custom CSS styles, CSS variables, and layout overrides
├── index.html               # Main HTML entry page
├── package-lock.json        # Lockfile for node dependencies
├── package.json             # NPM project configuration
└── tech_stack.md            # [NEW] This tech stack documentation file
```

---

## 🛠️ Technology Stack

FameHub is built using a modern, fast, and lightweight frontend stack:

| Component | Technology | Version / Source | Description |
| :--- | :--- | :--- | :--- |
| **Core Structure** | **HTML5** | Native | Semantically structured entry point (`index.html`). |
| **App Logic & Router** | **Vanilla JavaScript** | ES Modules (ES6+) | Direct DOM manipulation, route definition, and client-side state logic inside `main.js`. |
| **Styling & Theme** | **CSS3** | Native | Variables, gradients, responsive rules, skeleton loaders, and micro-animations inside `style.css`. |
| **CSS Framework** | **Bootstrap** | `v5.3.3` (via CDN) | Grid layouts, utility classes, and components (buttons, dropdowns, cards). |
| **Iconography** | **Bootstrap Icons** | `v1.11.3` (via CDN) | Icon pack used for dashboards, sidebar navigation, and live room controls. |
| **Typography** | **Google Fonts** | Inter (via CDN) | Modern, highly legible sans-serif typeface. |
| **Build & Dev Tool** | **Vite** | `^8.0.1` | Instant server starts, hot module replacement (HMR), and optimized production builds. |

---

## ⚙️ How the Application Works

The application operates as a custom **Single Page Application (SPA)** written entirely in plain Vanilla Javascript, without heavy framework runtimes like React, Vue, or Angular.

Here is the operational breakdown:

### 1. State Management & Client-Side Routing
The application logic is driven by a simple global state and route manager in [main.js](file:///E:/famehub.com/src/main.js):
- **State Store**: A global `state` object keeps track of:
  - `user`: Configured with the current logged-in role (`'admin' | 'teacher' | 'student' | null`).
  - `currentRoute`: Stores the active view identifier.
- **Routing Engine**: A route registry maps key string paths to specialized render functions:
  ```javascript
  const routes = {
    login: renderLogin,
    admin: renderAdminDashboard,
    teacher: renderTeacherDashboard,
    student: renderStudentDashboard,
    live: renderLiveClassroom,
    course: renderCoursePage,
    analytics: renderAnalytics
  };
  ```
- **Navigation Handler**: The `navigate(route, data)` helper updates the state and invokes `renderApp()`, which clears and repopulates the `#app` container in the HTML DOM.

### 2. Component-Based Architecture
Layouts are split into reusable UI components that take state variables as inputs and return string template literals:
- **`Sidebar(role)`**: Displays navigation modules dynamically based on the current user's security level (Admin, Teacher, or Student).
- **`Topbar(title)`**: Contains contextual page headings, notification triggers, and user profile information.
- **`Layout(content, title)`**: Standardizes the responsive page framework by wrapping the side navigation and main content views.

### 3. Core Pages & Functions
- **Login Portal (`renderLogin`)**: Simulates user authentication. It features a dropdown to switch between Administrator, Teacher, and Student roles for demonstration.
- **Admin Dashboard (`renderAdminDashboard`)**: Provides metrics cards (Total Students, Active Teachers, etc.), user activity tables, and server health status indicators.
- **Teacher Dashboard (`renderTeacherDashboard`)**: Features quick-action items, recent assignment reviews, and an alert component showing upcoming classes.
- **Student Dashboard (`renderStudentDashboard`)**: Displays course progression bars and cards summarizing due dates/upcoming quizzes.
- **Live Classroom (`renderLiveClassroom`)**: A video-conferencing simulation including microphone/camera toggles, participant lists, and an active chat sidebar.
- **Course Page (`renderCoursePage`)**: An interactive syllabus detailing curriculum modules with expandable accordions and downloadable assets.
- **Analytics View (`renderAnalytics`)**: Renders customizable charts using pure CSS styling for bar heights instead of importing heavy graphical libraries.

---

## 🚀 Running the Project

Vite is utilized to run and build this application.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
To set up project dependencies, run the following command in the project root:
```bash
npm install
```

### Run Locally (Development Server)
To start the hot-reloading development server:
```bash
npm run dev
```
By default, the application will boot on `http://localhost:5173/` (or the next available port).

### Compile Production Build
To build optimized, minified assets into the `dist/` directory:
```bash
npm run build
```

### Preview Production Build
To spin up a local server hosting the compiled production build:
```bash
npm run preview
```
