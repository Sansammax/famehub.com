import './style.css';

// ─── Config & State ─────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';

const state = {
  user: null,
  currentRoute: 'login',
  pageData: null,
  activeMeetings: [],
  notifications: [],
  quizTimer: null
};

// ─── CSRF & HTML Escape Utilities ─────────────────────────────────────────────
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── API Helpers ──────────────────────────────────────────────────────────────
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const csrfToken = getCookie('csrfToken');
  if (csrfToken) headers['x-csrf-token'] = csrfToken;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function apiUpload(endpoint, formData) {
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const csrfToken = getCookie('csrfToken');
  if (csrfToken) headers['x-csrf-token'] = csrfToken;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Upload failed');
  return data;
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
let socket = null;
function connectWebSocket() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const wsUrl = `ws://localhost:5000/sockets?token=${token}`;
  socket = new WebSocket(wsUrl);
  socket.onopen = () => console.log('[WS] Connected');
  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NOTIFICATION') showToast(msg.data.message, 'info');
      else if (msg.type === 'DASHBOARD_STATS_UPDATE') refreshDashboardData();
      else if (msg.type === 'AI_TYPING_START') handleAiTypingStart();
      else if (msg.type === 'AI_CHUNK') handleAiChunk(msg.content);
      else if (msg.type === 'AI_TYPING_STOP') handleAiTypingStop(msg.response, msg.error);
    } catch (e) {}
  };
  socket.onclose = () => setTimeout(connectWebSocket, 4000);
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  state.notifications.unshift({ message, type, time: new Date() });
  let tc = document.getElementById('toast-container');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toast-container';
    Object.assign(tc.style, { position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '10px' });
    document.body.appendChild(tc);
  }
  const colors = { info: 'linear-gradient(135deg,#4f46e5,#4338ca)', success: 'linear-gradient(135deg,#10b981,#059669)', warning: 'linear-gradient(135deg,#f59e0b,#d97706)', error: 'linear-gradient(135deg,#ef4444,#dc2626)' };
  const t = document.createElement('div');
  t.className = 'lms-toast animate-fade-in';
  t.style.background = colors[type] || colors.info;
  t.innerHTML = `<div class="d-flex align-items-center gap-2" style="color:#fff;padding:0.9rem 1.2rem;border-radius:10px;min-width:300px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
    <i class="bi bi-bell-fill" style="font-size:1.2rem;flex-shrink:0;"></i>
    <span style="font-size:0.875rem;flex:1;">${message}</span>
    <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;opacity:0.8;cursor:pointer;font-size:1rem;padding:0;">✕</button>
  </div>`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 7000);
  const dot = document.getElementById('notification-dot');
  if (dot) dot.style.display = 'block';
}

// ─── Router ───────────────────────────────────────────────────────────────────
const routes = {
  login: renderLogin,
  admin: renderAdminDashboard,
  teacher: renderTeacherDashboard,
  student: renderStudentDashboard,
  live: renderLiveClassroom,
  courses: renderCourses,
  assignments: renderAssignments,
  quizzes: renderQuizzes,
  users: renderUsers,
  departments: renderDepartments,
  analytics: renderAnalytics,
  audit: renderAuditLogs
};

function navigate(route, data = null) {
  if (state.quizTimer) { clearInterval(state.quizTimer); state.quizTimer = null; }
  state.currentRoute = route;
  state.pageData = data;
  renderApp();
  refreshDashboardData();
}
window.navigate = navigate;

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar(role) {
  const link = (route, icon, label) =>
    `<div class="nav-item"><a class="nav-link ${state.currentRoute === route ? 'active' : ''}" role="button" tabindex="0" onclick="navigate('${route}')" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('${route}'); }"><i class="bi ${icon}"></i>${label}</a></div>`;

  const adminNav = `
    ${link('admin','bi-grid-1x2','Dashboard')}
    ${link('users','bi-people','Users')}
    ${link('departments','bi-building','Departments')}
    ${link('courses','bi-book','Courses')}
    ${link('assignments','bi-file-earmark-text','Assignments')}
    ${link('quizzes','bi-patch-question','Quizzes')}
    ${link('live','bi-camera-video','Live Classes')}
    ${link('analytics','bi-bar-chart-line','Analytics')}
    ${link('audit','bi-shield-check','Audit Logs')}`;

  const teacherNav = `
    ${link('teacher','bi-grid-1x2','Dashboard')}
    ${link('courses','bi-book','My Courses')}
    ${link('assignments','bi-file-earmark-text','Assignments')}
    ${link('quizzes','bi-patch-question','Quizzes')}
    ${link('live','bi-camera-video','Live Class')}
    ${link('analytics','bi-bar-chart-line','Reports')}`;

  const studentNav = `
    ${link('student','bi-grid-1x2','Dashboard')}
    ${link('courses','bi-journal-album','My Courses')}
    ${link('assignments','bi-file-earmark-check','Assignments')}
    ${link('quizzes','bi-patch-question','Quizzes')}
    ${link('live','bi-camera-video','Join Class')}`;

  const navMap = { admin: adminNav, teacher: teacherNav, student: studentNav };

  return `
  <aside class="sidebar" id="main-sidebar">
    <div class="sidebar-brand"><i class="bi bi-mortarboard-fill"></i> FameHub</div>
    <nav class="sidebar-nav">${navMap[role] || ''}</nav>
    <div style="padding:1.5rem;border-top:1px solid var(--border-color);">
      <a class="nav-link text-danger p-0" style="background:none;cursor:pointer;" role="button" tabindex="0" onclick="logout()" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); logout(); }">
        <i class="bi bi-box-arrow-right"></i> Logout
      </a>
    </div>
  </aside>`;
}

function Topbar(title) {
  const u = state.user;
  const initials = u ? `${(u.firstName||'')[0]||''}${(u.lastName||'')[0]||u.email[0]}`.toUpperCase() : '?';
  return `
  <header class="topbar">
    <div class="d-flex align-items-center gap-3">
      <button class="btn btn-sm btn-light d-md-none" onclick="document.getElementById('main-sidebar').classList.toggle('show')">
        <i class="bi bi-list fs-5"></i>
      </button>
      <h1 class="text-h2 mb-0">${title}</h1>
    </div>
    <div class="d-flex align-items-center gap-3">
      <div class="position-relative" style="cursor:pointer;" onclick="navigate('notifications')">
        <i class="bi bi-bell fs-5 text-muted"></i>
        <span id="notification-dot" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display:${state.notifications.length > 0 ? 'block' : 'none'};font-size:0.6rem;padding:0.3em 0.5em;">
          ${state.notifications.length > 9 ? '9+' : state.notifications.length || ''}
        </span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <div class="avatar d-flex align-items-center justify-content-center fw-bold" style="background:linear-gradient(135deg,var(--primary),var(--primary-hover));color:#fff;font-size:0.875rem;">${initials}</div>
        <div class="d-none d-md-block">
          <div style="font-weight:600;font-size:0.875rem;">${u?.firstName ? `${u.firstName} ${u.lastName||''}` : u?.email}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:capitalize;">${u?.role}</div>
        </div>
      </div>
    </div>
  </header>`;
}

function Layout(role, pageTitle, content) {
  return `
  <div class="app-container">
    ${Sidebar(role)}
    <main class="main-content">
      ${Topbar(pageTitle)}
      <div class="content-wrapper">${content}</div>
    </main>
  </div>`;
}

function StatCard(icon, label, value, color = 'primary', sub = '') {
  return `
  <div class="card stat-card animate-fade-in">
    <div class="stat-icon" style="background:${color}15;color:${color};">
      <i class="bi ${icon} fs-4"></i>
    </div>
    <div>
      <div class="text-muted small">${label}</div>
      <div class="text-h2">${value}</div>
      ${sub ? `<div class="text-muted" style="font-size:0.75rem;">${sub}</div>` : ''}
    </div>
  </div>`;
}

function SkeletonCard() {
  return `<div class="card p-4"><div class="skeleton mb-3" style="height:20px;width:60%;"></div><div class="skeleton mb-2" style="height:14px;width:90%;"></div><div class="skeleton" style="height:14px;width:70%;"></div></div>`;
}

function EmptyState(icon, title, sub) {
  return `<div class="empty-state"><i class="bi ${icon}"></i><h5>${title}</h5><p class="text-muted">${sub}</p></div>`;
}

function Badge(text, type = 'primary') {
  return `<span class="badge badge-${type}">${text}</span>`;
}

// ─── Login ────────────────────────────────────────────────────────────────────
function renderLogin() {
  return `
  <div class="auth-page">
    <div class="auth-card">
      <div class="text-center mb-4">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--primary),var(--primary-hover));border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
          <i class="bi bi-mortarboard-fill text-white fs-3"></i>
        </div>
        <h2 class="fw-bold mb-1">FameHub LMS</h2>
        <p class="text-muted small">Enterprise Learning Management System</p>
      </div>
      <form id="login-form">
        <div class="mb-3">
          <label class="form-label fw-500" for="login-email">Email Address</label>
          <input type="email" id="login-email" class="form-control" placeholder="admin@famehub.edu" value="admin@famehub.edu" required>
        </div>
        <div class="mb-4">
          <label class="form-label fw-500" for="login-password">Password</label>
          <input type="password" id="login-password" class="form-control" placeholder="••••••••" value="password" required>
        </div>
        <button type="submit" id="login-btn" class="btn btn-primary w-100 py-2">Sign In</button>
        <div id="login-error" class="alert alert-danger mt-3 d-none"></div>
      </form>
      <div class="mt-4 p-3 rounded" style="background:var(--bg-color);font-size:0.8rem;">
        <div class="fw-600 mb-2">Demo Accounts</div>
        <div class="d-flex flex-column gap-1">
          <a onclick="document.getElementById('login-email').value='admin@famehub.edu'" style="cursor:pointer;" class="text-primary">admin@famehub.edu</a>
          <a onclick="document.getElementById('login-email').value='teacher@famehub.edu'" style="cursor:pointer;" class="text-success">teacher@famehub.edu</a>
          <a onclick="document.getElementById('login-email').value='student@famehub.edu'" style="cursor:pointer;" class="text-warning">student@famehub.edu</a>
        </div>
        <div class="text-muted mt-1">Password: <code>password</code></div>
      </div>
    </div>
  </div>`;
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function renderAdminDashboard() {
  return Layout('admin', 'Admin Dashboard', `
    <div class="row g-4 mb-4" id="stat-cards">
      ${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}
    </div>
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card p-4">
          <h5 class="card-title mb-3"><i class="bi bi-graph-up me-2 text-primary"></i>Attendance Trend (7 Days)</h5>
          <div id="attendance-chart" style="height:220px;"></div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card p-4 h-100">
          <h5 class="card-title mb-3"><i class="bi bi-pie-chart me-2 text-primary"></i>User Breakdown</h5>
          <div id="user-breakdown"></div>
        </div>
      </div>
    </div>
    <div class="row g-4 mt-0">
      <div class="col-md-6">
        <div class="card p-4">
          <h5 class="card-title mb-3"><i class="bi bi-file-earmark-check me-2 text-success"></i>Submissions</h5>
          <div id="submissions-summary"></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card p-4">
          <h5 class="card-title mb-3"><i class="bi bi-patch-question me-2 text-warning"></i>Quiz Performance</h5>
          <div id="quiz-summary"></div>
        </div>
      </div>
    </div>
    <div class="row g-4 mt-2">
      <div class="col-12">
        <div class="card p-4 animate-fade-in">
          <h5 class="card-title mb-3"><i class="bi bi-cpu-fill me-2 text-primary"></i>AI Engine Telemetry & Token Usage</h5>
          <div id="admin-ai-telemetry"><div class="text-muted small">Loading AI telemetry...</div></div>
        </div>
      </div>
    </div>
  `);
}

// ─── Teacher Dashboard ─────────────────────────────────────────────────────────
function renderTeacherDashboard() {
  return Layout('teacher', 'Teacher Dashboard', `
    <div class="row g-4 mb-4" id="teacher-stat-cards">
      ${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}
    </div>
    <div class="card p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="card-title mb-0"><i class="bi bi-book me-2 text-primary"></i>My Courses</h5>
        <button class="btn btn-primary btn-sm" onclick="navigate('courses')"><i class="bi bi-plus me-1"></i>New Course</button>
      </div>
      <div id="teacher-courses-list"><div class="text-center py-4 text-muted">Loading...</div></div>
    </div>
  `);
}

// ─── Student Dashboard ─────────────────────────────────────────────────────────
function renderStudentDashboard() {
  return Layout('student', 'Student Dashboard', `
    <div class="row g-4 mb-4" id="student-stat-cards">
      ${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}
    </div>
    <div class="row g-4">
      <div class="col-md-6">
        <div class="card p-4">
          <h5 class="card-title mb-3"><i class="bi bi-journal-album me-2 text-primary"></i>My Courses</h5>
          <div id="student-courses-list"></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card p-4">
          <h5 class="card-title mb-3"><i class="bi bi-trophy me-2 text-warning"></i>Recent Quiz Results</h5>
          <div id="student-quiz-results"></div>
        </div>
      </div>
    </div>
    <div class="row g-4 mt-2">
      <div class="col-lg-6">
        <div class="card p-4 h-100 animate-fade-in">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0"><i class="bi bi-cpu-fill me-2 text-primary"></i>AI Study Recommendations</h5>
            <button class="btn btn-outline-primary btn-sm" onclick="loadAIRecommendations()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
          </div>
          <div id="student-ai-recommendations"><div class="text-muted small">Loading recommendations...</div></div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card p-4 h-100 animate-fade-in">
          <h5 class="card-title mb-3"><i class="bi bi-file-earmark-slides me-2 text-success"></i>AI Lecture Summaries & Notes</h5>
          <div id="student-ai-summaries"><div class="text-muted small">Loading lecture summaries...</div></div>
        </div>
      </div>
    </div>

    <!-- Floating AI Chat widget -->
    <div id="ai-chat-widget">
      <button class="ai-chat-toggle" onclick="toggleAIChat()">
        <i class="bi bi-robot"></i>
        <span>AI Companion</span>
      </button>
      <div class="ai-chat-window">
        <div class="ai-chat-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <span class="ai-status-pulse"></span>
            <strong>AI Study Companion</strong>
          </div>
          <button class="btn-close btn-close-white btn-sm" onclick="toggleAIChat()"></button>
        </div>
        <div class="p-2 border-bottom" style="background:var(--bg-color);">
          <select id="ai-chat-course-context" class="form-select form-select-sm">
            <option value="">General Chat</option>
          </select>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages-box">
          <div class="ai-chat-msg assistant">
            <div class="ai-chat-msg-bubble">
              Hi! I am your AI Study Companion. Feel free to ask any questions about your courses or subjects.
            </div>
          </div>
        </div>
        <div class="ai-typing-indicator d-none" id="ai-chat-typing">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
        <form id="ai-chat-input-form" onsubmit="sendAIChatMessage(event)">
          <div class="input-group">
            <input type="text" id="ai-chat-input" class="form-control form-control-sm" placeholder="Ask AI..." required>
            <button class="btn btn-primary btn-sm" type="submit" id="ai-chat-send-btn"><i class="bi bi-send"></i></button>
          </div>
        </form>
      </div>
    </div>
  `);
}

// ─── Users Page ───────────────────────────────────────────────────────────────
function renderUsers() {
  return Layout('admin', 'User Management', `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div class="d-flex gap-2 flex-wrap">
        <input type="search" id="user-search" class="form-control" placeholder="Search name or email..." style="width:240px;" oninput="filterUsers()">
        <select id="user-role-filter" class="form-select" style="width:140px;" onchange="filterUsers()">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
        <select id="user-status-filter" class="form-select" style="width:140px;" onchange="filterUsers()">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="openUserModal()"><i class="bi bi-plus me-1"></i>Add User</button>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover lms-table mb-0">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="users-table-body"><tr><td colspan="6" class="text-center py-4">Loading...</td></tr></tbody>
        </table>
      </div>
      <div class="p-3 border-top d-flex justify-content-between align-items-center" id="user-pagination"></div>
    </div>

    <!-- User Modal -->
    <div class="modal fade" id="user-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title" id="user-modal-title">Add User</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <form id="user-form">
              <input type="hidden" id="user-form-id">
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label">First Name</label><input type="text" id="user-firstName" class="form-control" required></div>
                <div class="col-md-6"><label class="form-label">Last Name</label><input type="text" id="user-lastName" class="form-control"></div>
                <div class="col-12"><label class="form-label">Email</label><input type="email" id="user-email" class="form-control" required></div>
                <div class="col-12 user-password-field"><label class="form-label">Password</label><input type="password" id="user-password" class="form-control" placeholder="Min. 6 characters"></div>
                <div class="col-md-6"><label class="form-label">Role</label>
                  <select id="user-role" class="form-select">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div class="col-md-6"><label class="form-label">Department</label>
                  <select id="user-department" class="form-select"><option value="">None</option></select>
                </div>
                <div class="col-md-6"><label class="form-label">Phone</label><input type="tel" id="user-phone" class="form-control"></div>
                <div class="col-md-6 d-flex align-items-end"><div class="form-check"><input type="checkbox" id="user-isActive" class="form-check-input" checked><label class="form-check-label" for="user-isActive">Active</label></div></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="saveUser()"><i class="bi bi-check2 me-1"></i>Save</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ─── Departments Page ─────────────────────────────────────────────────────────
function renderDepartments() {
  return Layout('admin', 'Departments', `
    <div class="d-flex justify-content-end mb-4">
      <button class="btn btn-primary" onclick="openDeptModal()"><i class="bi bi-plus me-1"></i>Add Department</button>
    </div>
    <div class="row g-4" id="departments-grid">
      <div class="col-12 text-center py-5 text-muted">Loading departments...</div>
    </div>

    <div class="modal fade" id="dept-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title" id="dept-modal-title">Add Department</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <form id="dept-form">
              <input type="hidden" id="dept-form-id">
              <div class="mb-3"><label class="form-label">Name</label><input type="text" id="dept-name" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Description</label><textarea id="dept-description" class="form-control" rows="3"></textarea></div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="saveDepartment()">Save</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ─── Courses Page ─────────────────────────────────────────────────────────────
function renderCourses() {
  const isAdmin = state.user?.role === 'admin';
  const isTeacher = state.user?.role === 'teacher';
  const canCreate = isAdmin || isTeacher;
  return Layout(state.user?.role, 'Courses', `
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <div class="d-flex gap-2">
        <input type="search" id="course-search" class="form-control" placeholder="Search courses..." style="width:240px;" oninput="loadCourses()">
        <select id="course-filter-archived" class="form-select" style="width:150px;" onchange="loadCourses()">
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      </div>
      ${canCreate ? `<button class="btn btn-primary" onclick="openCourseModal()"><i class="bi bi-plus me-1"></i>New Course</button>` : ''}
    </div>
    <div class="row g-4" id="courses-grid">
      ${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}
    </div>

    <!-- Course Modal -->
    <div class="modal fade" id="course-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title" id="course-modal-title">New Course</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <form id="course-form">
              <input type="hidden" id="course-form-id">
              <div class="row g-3">
                <div class="col-12"><label class="form-label">Course Title</label><input type="text" id="course-title" class="form-control" required></div>
                <div class="col-12"><label class="form-label">Description</label><textarea id="course-description" class="form-control" rows="3"></textarea></div>
                <div class="col-md-6"><label class="form-label">Department</label><select id="course-department" class="form-select"><option value="">None</option></select></div>
                ${isAdmin ? `<div class="col-md-6"><label class="form-label">Teacher</label><select id="course-teacher" class="form-select"><option value="">Select teacher...</option></select></div>` : ''}
                <div class="col-md-6"><label class="form-label">Max Students</label><input type="number" id="course-maxStudents" class="form-control" value="50"></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="saveCourse()">Save Course</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Enroll Modal -->
    <div class="modal fade" id="enroll-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title">Enroll Students</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <label class="form-label">Select Students to Enroll</label>
            <div id="enroll-student-list" style="max-height:300px;overflow-y:auto;" class="border rounded p-2"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="saveEnrollment()">Enroll</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ─── Assignments Page ─────────────────────────────────────────────────────────
function renderAssignments() {
  const isStudent = state.user?.role === 'student';
  const canCreate = !isStudent;
  return Layout(state.user?.role, 'Assignments', `
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <div>
        <select id="assignment-course-filter" class="form-select d-inline-block" style="width:220px;" onchange="loadAssignments()">
          <option value="">All Courses</option>
        </select>
      </div>
      ${canCreate ? `<button class="btn btn-primary" onclick="openAssignmentModal()"><i class="bi bi-plus me-1"></i>New Assignment</button>` : ''}
    </div>
    <div id="assignments-list" class="row g-4">
      ${SkeletonCard()}${SkeletonCard()}
    </div>

    <!-- Assignment Create Modal -->
    <div class="modal fade" id="assignment-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title">New Assignment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <form id="assignment-form">
              <div class="row g-3">
                <div class="col-12"><label class="form-label">Course</label><select id="new-assignment-course" class="form-select" required><option value="">Select course...</option></select></div>
                <div class="col-12"><label class="form-label">Title</label><input type="text" id="new-assignment-title" class="form-control" required></div>
                <div class="col-12"><label class="form-label">Description</label><textarea id="new-assignment-description" class="form-control" rows="3"></textarea></div>
                <div class="col-md-6"><label class="form-label">Due Date</label><input type="datetime-local" id="new-assignment-due" class="form-control" required></div>
                <div class="col-md-6"><label class="form-label">Max Marks</label><input type="number" id="new-assignment-marks" class="form-control" value="100"></div>
                <div class="col-12"><label class="form-label">Attachment (PDF, DOCX, etc.)</label><input type="file" id="new-assignment-file" class="form-control" accept=".pdf,.doc,.docx,.ppt,.pptx"></div>
                <div class="col-12"><div class="form-check"><input type="checkbox" id="new-assignment-late" class="form-check-input"><label class="form-check-label" for="new-assignment-late">Allow late submissions</label></div></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="createAssignment()">Post Assignment</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Modal -->
    <div class="modal fade" id="submit-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title">Submit Assignment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <p id="submit-assignment-desc" class="text-muted mb-3"></p>
            <label class="form-label">Upload your work (PDF, DOCX, etc.)</label>
            <input type="file" id="submit-assignment-file" class="form-control">
            <div class="progress mt-3 d-none" id="upload-progress-bar"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width:100%"></div></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-success" id="submit-btn" onclick="submitAssignment()"><i class="bi bi-upload me-1"></i>Submit</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Grade Modal -->
    <div class="modal fade" id="grade-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content lms-modal">
          <div class="modal-header">
            <h5 class="modal-title">Grade Submission & AI Evaluation</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div id="grade-student-info" class="mb-3"></div>
            <div class="row">
              <!-- Left Column: AI Assistant Panel -->
              <div class="col-lg-6 border-end">
                <div class="p-3 bg-light rounded h-100">
                  <h6 class="fw-bold mb-3 text-primary"><i class="bi bi-cpu-fill me-1"></i>AI Assessment</h6>
                  <div class="mb-3">
                    <label class="form-label small">Student's Submission Text (for AI analysis)</label>
                    <textarea id="ai-grade-student-submission" class="form-control" rows="4" placeholder="Paste the student's submission text or paper content here..."></textarea>
                  </div>
                  <div class="d-grid mb-3">
                    <button class="btn btn-outline-primary" id="ai-evaluate-btn" onclick="runAIEvaluation()"><i class="bi bi-magic me-1"></i>Run AI Evaluation</button>
                  </div>
                  <div id="ai-evaluation-results" class="d-none animate-fade-in">
                    <div class="row g-2 mb-3">
                      <div class="col-6">
                        <div class="p-3 border rounded text-center">
                          <div class="text-muted small">Suggested Marks</div>
                          <h3 class="fw-bold text-success" id="ai-suggested-marks">0</h3>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="p-3 border rounded text-center">
                          <div class="text-muted small">Plagiarism Score</div>
                          <h3 class="fw-bold text-danger" id="ai-plagiarism-score">0%</h3>
                        </div>
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small fw-bold">Weak Sections Identified</label>
                      <div id="ai-weak-sections" class="d-flex flex-wrap gap-1"></div>
                    </div>
                    <div>
                      <label class="form-label small fw-bold">Detailed Critique</label>
                      <div class="p-3 bg-white rounded border small" id="ai-detailed-feedback" style="max-height: 150px; overflow-y: auto;"></div>
                    </div>
                  </div>
                  <div id="ai-evaluation-loading" class="d-none text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="text-muted small mt-2">AI is evaluating the submission...</div>
                  </div>
                </div>
              </div>
              <!-- Right Column: Final Marking Panel -->
              <div class="col-lg-6">
                <div class="p-3 h-100">
                  <h6 class="fw-bold mb-3"><i class="bi bi-pencil-square me-1"></i>Final Marking & Feedback</h6>
                  <div class="mb-3">
                    <label class="form-label">Marks</label>
                    <input type="number" id="grade-marks" class="form-control" placeholder="0">
                    <span class="text-muted small" id="grade-max-marks-label">/ 100</span>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Feedback to Student</label>
                    <textarea id="grade-feedback" class="form-control" rows="6" placeholder="Write final grading feedback..."></textarea>
                  </div>
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-success btn-sm" id="ai-apply-suggested-btn" onclick="applyAISuggestions()" style="display:none;"><i class="bi bi-check-all"></i> Apply AI Suggestions</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="submitGrade()"><i class="bi bi-check2 me-1"></i>Save Grade</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ─── Quizzes Page ─────────────────────────────────────────────────────────────
function renderQuizzes() {
  const isStudent = state.user?.role === 'student';
  const canCreate = !isStudent;
  return Layout(state.user?.role, 'Quizzes', `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <select id="quiz-course-filter" class="form-select d-inline-block" style="width:220px;" onchange="loadQuizzes()">
        <option value="">All Courses</option>
      </select>
      ${canCreate ? `<button class="btn btn-primary" onclick="openQuizModal()"><i class="bi bi-plus me-1"></i>Create Quiz</button>` : ''}
    </div>
    <div id="quizzes-list" class="row g-4">${SkeletonCard()}${SkeletonCard()}</div>

    <!-- Quiz Create Modal -->
    <div class="modal fade" id="quiz-create-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title">Create Quiz</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="row g-3 mb-4">
              <div class="col-md-6"><label class="form-label">Course</label><select id="new-quiz-course" class="form-select" required><option value="">Select course...</option></select></div>
              <div class="col-md-6"><label class="form-label">Quiz Title</label><input type="text" id="new-quiz-title" class="form-control" required></div>
              <div class="col-12"><label class="form-label">Description</label><textarea id="new-quiz-description" class="form-control" rows="2"></textarea></div>
              <div class="col-md-3"><label class="form-label">Duration (min)</label><input type="number" id="new-quiz-duration" class="form-control" value="30"></div>
              <div class="col-md-3"><label class="form-label">Total Marks</label><input type="number" id="new-quiz-totalMarks" class="form-control" value="100"></div>
              <div class="col-md-3"><label class="form-label">Passing Marks</label><input type="number" id="new-quiz-passingMarks" class="form-control" value="40"></div>
              <div class="col-md-3 d-flex align-items-end"><div class="form-check"><input type="checkbox" id="new-quiz-publish" class="form-check-input"><label class="form-check-label" for="new-quiz-publish">Publish now</label></div></div>
            </div>
            <div class="card p-3 mb-4" style="background:#e0e7ff;border-color:var(--primary);">
              <h6 class="fw-bold text-primary mb-2"><i class="bi bi-cpu-fill me-1"></i>AI Question Generator</h6>
              <div class="mb-2">
                <textarea id="ai-quiz-content" class="form-control" rows="3" placeholder="Paste study materials, lecture transcripts, or textbook chapters here. AI will draft questions for you."></textarea>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted small">Generates multiple choice, multi-select, and true/false questions.</span>
                <button class="btn btn-primary btn-sm" id="ai-generate-quiz-btn" onclick="generateAIQuizQuestions()"><i class="bi bi-magic me-1"></i>Generate Questions</button>
              </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0">Questions</h6>
              <button class="btn btn-sm btn-outline-primary" onclick="addQuizQuestion()"><i class="bi bi-plus me-1"></i>Add Question</button>
            </div>
            <div id="quiz-questions-builder" class="d-flex flex-column gap-3"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" onclick="saveQuiz()"><i class="bi bi-save me-1"></i>Save Quiz</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quiz Take Modal -->
    <div class="modal fade" id="quiz-take-modal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content lms-modal">
          <div class="modal-header">
            <h5 class="modal-title" id="quiz-take-title">Taking Quiz</h5>
            <div class="quiz-timer ms-auto me-3" id="quiz-countdown"></div>
          </div>
          <div class="modal-body" id="quiz-take-body"></div>
          <div class="modal-footer">
            <button class="btn btn-success" onclick="submitQuizAttempt()"><i class="bi bi-send me-1"></i>Submit Quiz</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quiz Results Modal -->
    <div class="modal fade" id="quiz-results-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title">Quiz Results</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body" id="quiz-results-body"></div>
        </div>
      </div>
    </div>
  `);
}

// ─── Analytics Page ─────────────────────────────────────────────────────────
function renderAnalytics() {
  return Layout(state.user?.role, 'Analytics & Reports', `
    <div class="row g-4 mb-4" id="analytics-stat-cards">
      ${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}${SkeletonCard()}
    </div>
    <div class="card p-4">
      <h5 class="card-title mb-3"><i class="bi bi-graph-up-arrow me-2 text-primary"></i>Attendance Trend</h5>
      <div id="analytics-attendance-chart" style="height:200px;"></div>
    </div>
  `);
}

// ─── Audit Logs Page ──────────────────────────────────────────────────────────
function renderAuditLogs() {
  return Layout('admin', 'Audit Logs', `
    <div class="d-flex gap-2 flex-wrap mb-4">
      <input type="search" id="audit-email-filter" class="form-control" placeholder="Filter by email..." style="width:220px;" oninput="loadAuditLogs()">
      <input type="text" id="audit-action-filter" class="form-control" placeholder="Filter by action..." style="width:200px;" oninput="loadAuditLogs()">
      <input type="date" id="audit-from" class="form-control" style="width:160px;" onchange="loadAuditLogs()">
      <input type="date" id="audit-to" class="form-control" style="width:160px;" onchange="loadAuditLogs()">
    </div>
    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover lms-table mb-0">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
          <tbody id="audit-table-body"><tr><td colspan="6" class="text-center py-4">Loading...</td></tr></tbody>
        </table>
      </div>
      <div class="p-3 border-top" id="audit-pagination"></div>
    </div>
  `);
}

// ─── Live Classroom (preserved from Phase 2) ──────────────────────────────────
function renderLiveClassroom() {
  const role = state.user?.role;
  return Layout(role, 'Live Classroom', `
    <div class="d-flex gap-3 mb-4 flex-wrap">
      <input type="text" id="meeting-name-input" class="form-control" style="max-width:320px;" placeholder="e.g. Advanced Math 101 - Lecture 5" value="Live Class Session">
      ${role === 'teacher' || role === 'admin'
        ? `<button class="btn btn-primary" id="start-class-btn" onclick="startClass()"><i class="bi bi-camera-video me-1"></i>Start Class</button>`
        : `<button class="btn btn-success" id="join-class-btn" onclick="openJoinModal()"><i class="bi bi-box-arrow-in-right me-1"></i>Join Class</button>`}
    </div>
    <div id="meetings-list">
      <div class="card p-4">
        <h5 class="card-title mb-3"><i class="bi bi-record-circle text-danger me-2"></i>Active Sessions</h5>
        <div id="active-meetings-container"><div class="text-muted py-3 text-center">Loading active sessions...</div></div>
      </div>
    </div>
    <div class="card mt-4 p-4">
      <h5 class="card-title mb-3"><i class="bi bi-collection-play me-2 text-primary"></i>Recordings</h5>
      <div id="recordings-list"><div class="text-muted text-center py-3">Loading recordings...</div></div>
    </div>

    <!-- Join modal -->
    <div class="modal fade" id="join-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content lms-modal">
          <div class="modal-header"><h5 class="modal-title">Join Class</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <label class="form-label">Select Session to Join</label>
            <div id="join-sessions-list"></div>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ─── Render App ───────────────────────────────────────────────────────────────
function renderApp() {
  const root = document.getElementById('app');
  const route = state.currentRoute;

  if (route === 'login') {
    root.innerHTML = renderLogin();
    setTimeout(() => {
      const form = document.getElementById('login-form');
      if (form) form.addEventListener('submit', handleLogin);
    }, 50);
    return;
  }

  const renderer = routes[route];
  if (renderer) {
    root.innerHTML = renderer();
    setTimeout(() => bootstrapPage(route), 50);
  }
}

async function bootstrapPage(route) {
  switch (route) {
    case 'admin': await loadAdminDashboard(); break;
    case 'teacher': await loadTeacherDashboard(); break;
    case 'student': await loadStudentDashboard(); break;
    case 'users': await loadUsers(); await loadDepartmentsForSelect('user-department'); break;
    case 'departments': await loadDepartmentsGrid(); break;
    case 'courses': await loadCourses(); await loadDepartmentsForSelect('course-department'); if (state.user?.role==='admin') await loadTeachersForSelect('course-teacher'); break;
    case 'assignments': await populateCourseFilterForAssignments(); await loadAssignments(); break;
    case 'quizzes': await populateCourseFilterForQuizzes(); await loadQuizzes(); break;
    case 'analytics': await loadAnalytics(); break;
    case 'audit': await loadAuditLogs(); break;
    case 'live': await loadActiveMeetings(); await loadRecordings(); break;
  }
}

async function refreshDashboardData() {
  const route = state.currentRoute;
  if (route === 'admin') await loadAdminDashboard();
  else if (route === 'teacher') await loadTeacherDashboard();
  else if (route === 'student') await loadStudentDashboard();
}

// ─── Login Handler ────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errDiv = document.getElementById('login-error');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
  errDiv.classList.add('d-none');
  try {
    const data = await apiRequest('/auth/login', 'POST', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    localStorage.setItem('token', data.token);
    state.user = data.user;
    connectWebSocket();
    navigate(data.user.role === 'admin' ? 'admin' : data.user.role === 'teacher' ? 'teacher' : 'student');
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.classList.remove('d-none');
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
}

function logout() {
  localStorage.removeItem('token');
  state.user = null;
  state.notifications = [];
  if (socket) socket.close();
  navigate('login');
}
window.logout = logout;

// ─── Dashboard Data Loaders ───────────────────────────────────────────────────
async function loadAdminDashboard() {
  try {
    const data = await apiRequest('/analytics/dashboard');
    const statCards = document.getElementById('stat-cards');
    if (!statCards) return;
    statCards.innerHTML = `
      ${StatCard('bi-people-fill','Total Users', data.stats.totalUsers, '#4f46e5')}
      ${StatCard('bi-book-fill','Active Courses', data.stats.totalCourses, '#10b981')}
      ${StatCard('bi-file-earmark-text-fill','Assignments', data.stats.totalAssignments, '#f59e0b')}
      ${StatCard('bi-patch-question-fill','Published Quizzes', data.stats.totalQuizzes, '#ef4444')}`;

    // User breakdown
    const ub = data.userBreakdown;
    document.getElementById('user-breakdown').innerHTML = `
      <div class="mb-3">${ProgressBar('Students', ub.students, ub.students+ub.teachers+ub.admins, '#4f46e5')}</div>
      <div class="mb-3">${ProgressBar('Teachers', ub.teachers, ub.students+ub.teachers+ub.admins, '#10b981')}</div>
      ${ProgressBar('Admins', ub.admins, ub.students+ub.teachers+ub.admins, '#f59e0b')}`;

    // Submissions
    const subs = data.submissions;
    document.getElementById('submissions-summary').innerHTML = `
      <div class="d-flex justify-content-between mb-2"><span>Graded</span><strong class="text-success">${subs.graded}</strong></div>
      <div class="progress mb-3" style="height:8px;"><div class="progress-bar bg-success" style="width:${subs.graded+subs.pending>0?Math.round(subs.graded/(subs.graded+subs.pending)*100):0}%"></div></div>
      <div class="d-flex justify-content-between mb-2"><span>Pending Review</span><strong class="text-warning">${subs.pending}</strong></div>
      <div class="progress" style="height:8px;"><div class="progress-bar bg-warning" style="width:${subs.graded+subs.pending>0?Math.round(subs.pending/(subs.graded+subs.pending)*100):0}%"></div></div>`;

    // Quiz stats
    const qs = data.quizStats;
    document.getElementById('quiz-summary').innerHTML = `
      <div class="d-flex justify-content-between mb-2"><span>Passed</span><strong class="text-success">${qs.passed}</strong></div>
      <div class="d-flex justify-content-between mb-2"><span>Failed</span><strong class="text-danger">${qs.failed}</strong></div>
      <div class="mt-3">${ProgressBar('Pass Rate', qs.passed, qs.passed+qs.failed, '#10b981')}</div>`;

    // Attendance chart (simple bar chart using CSS)
    if (data.attendanceTrend) {
      document.getElementById('attendance-chart').innerHTML = renderBarChart(data.attendanceTrend);
    }
    await loadAITelemetry();
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

async function loadTeacherDashboard() {
  try {
    const data = await apiRequest('/analytics/teacher');
    const sc = document.getElementById('teacher-stat-cards');
    if (!sc) return;
    sc.innerHTML = `
      ${StatCard('bi-book','My Courses', data.courses.length, '#4f46e5')}
      ${StatCard('bi-file-earmark-text','Assignments Posted', data.totalAssignments, '#10b981')}
      ${StatCard('bi-patch-question','Quizzes Created', data.totalQuizzes, '#f59e0b')}`;

    const coursesList = document.getElementById('teacher-courses-list');
    if (!coursesList) return;
    if (!data.courses.length) {
      coursesList.innerHTML = EmptyState('bi-book', 'No courses yet', 'Create your first course to get started');
      return;
    }
    coursesList.innerHTML = `<div class="row g-3">` +
      data.courses.map(c => `
        <div class="col-md-6">
          <div class="card p-3 h-100" style="border-left:4px solid var(--primary);">
            <div class="fw-bold mb-1">${c.title}</div>
            <div class="text-muted small mb-2">${c.enrolled} students enrolled</div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="navigate('assignments')">Assignments</button>
              <button class="btn btn-sm btn-outline-primary" onclick="navigate('quizzes')">Quizzes</button>
            </div>
          </div>
        </div>`).join('') + `</div>`;
  } catch (err) { console.error(err); }
}

async function loadStudentDashboard() {
  try {
    const data = await apiRequest('/analytics/student');
    const sc = document.getElementById('student-stat-cards');
    if (!sc) return;
    sc.innerHTML = `
      ${StatCard('bi-journal-album','Enrolled Courses', data.stats.enrollments, '#4f46e5')}
      ${StatCard('bi-upload','Submissions', data.stats.submissions, '#10b981')}
      ${StatCard('bi-award','Avg Marks', `${data.averageMarks}%`, '#f59e0b')}
      ${StatCard('bi-check-circle','Quizzes Passed', data.quizzesPassed, '#6366f1')}`;

    const coursesList = document.getElementById('student-courses-list');
    if (coursesList) {
      coursesList.innerHTML = `<div class="d-flex flex-column gap-2">
        <button class="btn btn-outline-primary w-100" onclick="navigate('courses')"><i class="bi bi-book me-2"></i>View All Courses</button>
        <button class="btn btn-outline-success w-100" onclick="navigate('assignments')"><i class="bi bi-file-earmark-check me-2"></i>View Assignments</button>
      </div>`;
    }

    const qResults = document.getElementById('student-quiz-results');
    if (qResults) {
      if (!data.recentAttempts?.length) {
        qResults.innerHTML = EmptyState('bi-patch-question', 'No quiz attempts yet', 'Take your first quiz!');
      } else {
        qResults.innerHTML = data.recentAttempts.map(a => `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <div class="fw-500 small">${a.quiz?.title || 'Quiz'}</div>
              <div class="text-muted" style="font-size:0.75rem;">${new Date(a.submittedAt).toLocaleDateString()}</div>
            </div>
            <div class="text-end">
              <div class="fw-bold">${a.score}/${a.quiz?.totalMarks}</div>
              ${Badge(a.passed ? 'Passed' : 'Failed', a.passed ? 'success' : 'danger')}
            </div>
          </div>`).join('');
      }
    }

    // Load actual enrolled courses & setup AI chat options
    const coursesRes = await apiRequest('/courses?studentId=' + state.user.id);
    const coursesList = document.getElementById('student-courses-list');
    const courseContextDropdown = document.getElementById('ai-chat-course-context');
    if (coursesRes.courses && coursesRes.courses.length > 0) {
      if (coursesList) {
        coursesList.innerHTML = coursesRes.courses.map(c => `
          <div class="p-2 border rounded mb-2 d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-bold small">${c.title}</div>
              <div class="text-muted" style="font-size:0.75rem;">${c.department?.name || 'General'}</div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="navigate('courses')">View</button>
          </div>`).join('');
      }
      if (courseContextDropdown) {
        courseContextDropdown.innerHTML = '<option value="">General Chat</option>' + 
          coursesRes.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
      }
    } else {
      if (coursesList) coursesList.innerHTML = '<div class="text-muted small">Not enrolled in any courses.</div>';
    }

    // Load recommendations & summaries
    await loadAIRecommendations();
    await loadAISummaries();
  } catch (err) { console.error(err); }
}

// ─── Users ────────────────────────────────────────────────────────────────────
let userPage = 1;
async function loadUsers() {
  const search = document.getElementById('user-search')?.value || '';
  const role = document.getElementById('user-role-filter')?.value || '';
  const isActive = document.getElementById('user-status-filter')?.value || '';
  const params = new URLSearchParams({ page: userPage, limit: 15, search });
  if (role) params.append('role', role);
  if (isActive) params.append('isActive', isActive);

  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></td></tr>';

  try {
    const data = await apiRequest(`/users?${params}`);
    if (!data.users.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No users found.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="avatar d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;font-size:0.8rem;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;border-radius:50%;">
              ${(u.firstName?.[0]||'') + (u.lastName?.[0]||u.email[0])}</div>
            <div>${u.firstName ? `<div class="fw-500">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName||'')}</div>` : ''}</div>
          </div>
        </td>
        <td class="text-muted small">${escapeHtml(u.email)}</td>
        <td>${Badge(u.role, u.role==='admin'?'danger':u.role==='teacher'?'primary':'success')}</td>
        <td class="text-muted small">${escapeHtml(u.department?.name || '—')}</td>
        <td>${Badge(u.isActive?'Active':'Inactive', u.isActive?'success':'warning')}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-primary" onclick="openUserModal('${u.id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')"><i class="bi bi-person-slash"></i></button>
          </div>
        </td>
      </tr>`).join('');

    const pag = document.getElementById('user-pagination');
    if (pag) {
      pag.innerHTML = `<span class="text-muted small">Showing ${data.users.length} of ${data.total}</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" onclick="userPage=Math.max(1,userPage-1);loadUsers()" ${userPage<=1?'disabled':''}>‹ Prev</button>
          <button class="btn btn-outline-secondary disabled">Page ${data.page} of ${data.pages}</button>
          <button class="btn btn-outline-secondary" onclick="userPage++;loadUsers()" ${userPage>=data.pages?'disabled':''}>Next ›</button>
        </div>`;
    }
  } catch (err) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${err.message}</td></tr>`; }
}
window.filterUsers = () => { userPage = 1; loadUsers(); };

async function openUserModal(id = null) {
  const modalEl = document.getElementById('user-modal');
  if (!modalEl) return;
  document.getElementById('user-modal-title').textContent = id ? 'Edit User' : 'Add User';
  document.getElementById('user-form-id').value = id || '';
  document.querySelector('.user-password-field').style.display = id ? 'none' : 'block';

  if (id) {
    try {
      const data = await apiRequest(`/users/${id}`);
      const u = data.user;
      document.getElementById('user-firstName').value = u.firstName || '';
      document.getElementById('user-lastName').value = u.lastName || '';
      document.getElementById('user-email').value = u.email;
      document.getElementById('user-role').value = u.role;
      document.getElementById('user-phone').value = u.phone || '';
      document.getElementById('user-isActive').checked = u.isActive;
      if (u.departmentId) document.getElementById('user-department').value = u.departmentId;
    } catch (err) { showToast(err.message, 'error'); }
  } else {
    document.getElementById('user-form').reset();
    document.getElementById('user-isActive').checked = true;
  }
  new bootstrap.Modal(modalEl).show();
}
window.openUserModal = openUserModal;

async function saveUser() {
  const id = document.getElementById('user-form-id').value;
  const body = {
    firstName: document.getElementById('user-firstName').value,
    lastName: document.getElementById('user-lastName').value,
    email: document.getElementById('user-email').value,
    role: document.getElementById('user-role').value,
    phone: document.getElementById('user-phone').value,
    departmentId: document.getElementById('user-department').value || null,
    isActive: document.getElementById('user-isActive').checked
  };
  if (!id) body.password = document.getElementById('user-password').value;
  try {
    if (id) await apiRequest(`/users/${id}`, 'PUT', body);
    else await apiRequest('/users', 'POST', body);
    bootstrap.Modal.getInstance(document.getElementById('user-modal'))?.hide();
    showToast(id ? 'User updated.' : 'User created.', 'success');
    await loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}
window.saveUser = saveUser;

async function deleteUser(id) {
  if (!confirm('Deactivate this user?')) return;
  try {
    await apiRequest(`/users/${id}`, 'DELETE');
    showToast('User deactivated.', 'success');
    await loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}
window.deleteUser = deleteUser;

// ─── Departments ──────────────────────────────────────────────────────────────
async function loadDepartmentsGrid() {
  const grid = document.getElementById('departments-grid');
  if (!grid) return;
  try {
    const data = await apiRequest('/departments');
    if (!data.departments.length) {
      grid.innerHTML = `<div class="col-12">${EmptyState('bi-building', 'No departments yet', 'Create your first department')}</div>`;
      return;
    }
    grid.innerHTML = data.departments.map(d => `
      <div class="col-md-4">
        <div class="card p-4 h-100 animate-fade-in">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-icon" style="background:#e0e7ff;color:#4f46e5;"><i class="bi bi-building fs-4"></i></div>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-primary" onclick="openDeptModal('${d.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteDept('${d.id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          <h5 class="fw-bold mb-1">${escapeHtml(d.name)}</h5>
          <p class="text-muted small mb-3">${escapeHtml(d.description || 'No description')}</p>
          <div class="text-muted small"><i class="bi bi-people me-1"></i>${d.members?.length || 0} members</div>
        </div>
      </div>`).join('');
  } catch (err) { grid.innerHTML = `<div class="col-12 text-danger">${err.message}</div>`; }
}

async function loadDepartmentsForSelect(selectId) {
  try {
    const data = await apiRequest('/departments');
    const sel = document.getElementById(selectId);
    if (!sel) return;
    data.departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id; opt.textContent = d.name;
      sel.appendChild(opt);
    });
  } catch {}
}

function openDeptModal(id = null) {
  document.getElementById('dept-modal-title').textContent = id ? 'Edit Department' : 'Add Department';
  document.getElementById('dept-form-id').value = id || '';
  if (!id) document.getElementById('dept-form').reset();
  new bootstrap.Modal(document.getElementById('dept-modal')).show();
}
window.openDeptModal = openDeptModal;

async function saveDepartment() {
  const id = document.getElementById('dept-form-id').value;
  const body = { name: document.getElementById('dept-name').value, description: document.getElementById('dept-description').value };
  try {
    if (id) await apiRequest(`/departments/${id}`, 'PUT', body);
    else await apiRequest('/departments', 'POST', body);
    bootstrap.Modal.getInstance(document.getElementById('dept-modal'))?.hide();
    showToast('Department saved.', 'success');
    await loadDepartmentsGrid();
  } catch (err) { showToast(err.message, 'error'); }
}
window.saveDepartment = saveDepartment;

async function deleteDept(id) {
  if (!confirm('Delete this department?')) return;
  try {
    await apiRequest(`/departments/${id}`, 'DELETE');
    showToast('Department deleted.', 'success');
    await loadDepartmentsGrid();
  } catch (err) { showToast(err.message, 'error'); }
}
window.deleteDept = deleteDept;

// ─── Courses ──────────────────────────────────────────────────────────────────
async function loadCourses() {
  const grid = document.getElementById('courses-grid');
  if (!grid) return;
  const search = document.getElementById('course-search')?.value || '';
  const archived = document.getElementById('course-filter-archived')?.value || 'false';
  const role = state.user?.role;

  grid.innerHTML = [1,2,3].map(()=>SkeletonCard()).join('');
  try {
    const params = new URLSearchParams({ search, archived });
    if (role === 'student') params.append('studentId', state.user.id);
    const data = await apiRequest(`/courses?${params}`);

    if (!data.courses.length) {
      grid.innerHTML = `<div class="col-12">${EmptyState('bi-book', 'No courses found', role==='student'?'You are not enrolled in any courses.':'Create your first course.')}</div>`;
      return;
    }

    grid.innerHTML = data.courses.map(c => {
      const isAdmin = role === 'admin';
      const isTeacher = role === 'teacher';
      return `
      <div class="col-md-4">
        <div class="card h-100 animate-fade-in course-card">
          <div style="height:120px;background:linear-gradient(135deg,#4f46e5,#818cf8);border-radius:var(--border-radius) var(--border-radius) 0 0;display:flex;align-items:center;justify-content:center;">
            <i class="bi bi-book fs-1 text-white opacity-75"></i>
          </div>
          <div class="p-4">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="fw-bold mb-0" style="font-size:1rem;">${escapeHtml(c.title)}</h5>
              ${c.isArchived ? Badge('Archived','warning') : ''}
            </div>
            <p class="text-muted small mb-3">${escapeHtml(c.description || 'No description')}</p>
            <div class="d-flex justify-content-between text-muted small mb-3">
              <span><i class="bi bi-person me-1"></i>${c.teacher ? `${escapeHtml(c.teacher.firstName)} ${escapeHtml(c.teacher.lastName||'')}` : 'Unassigned'}</span>
              <span><i class="bi bi-building me-1"></i>${escapeHtml(c.department?.name || 'General')}</span>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              ${isAdmin||isTeacher ? `
                <button class="btn btn-sm btn-outline-primary" onclick="openCourseModal('${c.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-success" onclick="openEnrollModal('${c.id}')"><i class="bi bi-person-plus me-1"></i>Enroll</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="viewCourseStudents('${c.id}','${c.title}')"><i class="bi bi-people"></i></button>
                ${isAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="archiveCourse('${c.id}')"><i class="bi bi-archive"></i></button>` : ''}` : ''}
              ${role === 'student' ? `
                <button class="btn btn-sm btn-primary" onclick="navigate('assignments')"><i class="bi bi-file-earmark-text me-1"></i>Assignments</button>
                <button class="btn btn-sm btn-outline-primary" onclick="navigate('quizzes')"><i class="bi bi-patch-question me-1"></i>Quizzes</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) { grid.innerHTML = `<div class="col-12 text-danger">${err.message}</div>`; }
}
window.loadCourses = loadCourses;

async function loadTeachersForSelect(selectId) {
  try {
    const data = await apiRequest('/users?role=teacher&limit=100');
    const sel = document.getElementById(selectId);
    if (!sel) return;
    data.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id; opt.textContent = `${u.firstName} ${u.lastName||''} (${u.email})`;
      sel.appendChild(opt);
    });
  } catch {}
}

function openCourseModal(id = null) {
  document.getElementById('course-modal-title').textContent = id ? 'Edit Course' : 'New Course';
  document.getElementById('course-form-id').value = id || '';
  if (!id) document.getElementById('course-form').reset();
  new bootstrap.Modal(document.getElementById('course-modal')).show();
}
window.openCourseModal = openCourseModal;

async function saveCourse() {
  const id = document.getElementById('course-form-id').value;
  const body = {
    title: document.getElementById('course-title').value,
    description: document.getElementById('course-description').value,
    departmentId: document.getElementById('course-department')?.value || null,
    teacherId: document.getElementById('course-teacher')?.value || null,
    maxStudents: document.getElementById('course-maxStudents')?.value || 50
  };
  try {
    if (id) await apiRequest(`/courses/${id}`, 'PUT', body);
    else await apiRequest('/courses', 'POST', body);
    bootstrap.Modal.getInstance(document.getElementById('course-modal'))?.hide();
    showToast('Course saved.', 'success');
    await loadCourses();
  } catch (err) { showToast(err.message, 'error'); }
}
window.saveCourse = saveCourse;

async function archiveCourse(id) {
  if (!confirm('Archive this course? Students will lose access.')) return;
  try {
    await apiRequest(`/courses/${id}`, 'DELETE');
    showToast('Course archived.', 'success');
    await loadCourses();
  } catch (err) { showToast(err.message, 'error'); }
}
window.archiveCourse = archiveCourse;

let enrollCourseId = null;
async function openEnrollModal(courseId) {
  enrollCourseId = courseId;
  const list = document.getElementById('enroll-student-list');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-2">Loading students...</div>';
  new bootstrap.Modal(document.getElementById('enroll-modal')).show();
  try {
    const data = await apiRequest('/users?role=student&limit=100');
    list.innerHTML = data.users.map(u => `
      <div class="form-check">
        <input type="checkbox" class="form-check-input enroll-checkbox" id="enroll-${u.id}" value="${u.id}">
        <label class="form-check-label" for="enroll-${u.id}">${u.firstName} ${u.lastName||''} (${u.email})</label>
      </div>`).join('') || '<p class="text-muted">No students found.</p>';
  } catch (err) { list.innerHTML = `<p class="text-danger">${err.message}</p>`; }
}
window.openEnrollModal = openEnrollModal;

async function saveEnrollment() {
  const checked = [...document.querySelectorAll('.enroll-checkbox:checked')].map(c => c.value);
  if (!checked.length) { showToast('Select at least one student.', 'warning'); return; }
  try {
    await apiRequest(`/courses/${enrollCourseId}/enroll`, 'POST', { studentIds: checked });
    bootstrap.Modal.getInstance(document.getElementById('enroll-modal'))?.hide();
    showToast(`${checked.length} student(s) enrolled.`, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}
window.saveEnrollment = saveEnrollment;

async function viewCourseStudents(courseId, courseTitle) {
  try {
    const data = await apiRequest(`/courses/${courseId}/students`);
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade show" style="display:block;background:rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content lms-modal">
            <div class="modal-header"><h5 class="modal-title">Students — ${courseTitle}</h5><button type="button" class="btn-close" onclick="this.closest('.modal').parentElement.remove()"></button></div>
            <div class="modal-body" style="max-height:400px;overflow-y:auto;">
              ${!data.students.length ? EmptyState('bi-people','No students enrolled','Use the enroll button to add students.') :
                data.students.map(s => `<div class="d-flex align-items-center gap-2 py-2 border-bottom"><div class="avatar d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;font-size:0.8rem;background:#e0e7ff;color:#4f46e5;border-radius:50%;">${(s.firstName?.[0]||s.email[0]).toUpperCase()}</div><div><div class="fw-500">${s.firstName} ${s.lastName||''}</div><div class="text-muted small">${s.email}</div></div></div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) { showToast(err.message, 'error'); }
}
window.viewCourseStudents = viewCourseStudents;

// ─── Assignments ──────────────────────────────────────────────────────────────
async function populateCourseFilterForAssignments() {
  try {
    const data = await apiRequest('/courses');
    const sel = document.getElementById('assignment-course-filter');
    const sel2 = document.getElementById('new-assignment-course');
    if (!sel) return;
    data.courses.forEach(c => {
      [sel, sel2].forEach(s => { if(s){ const o=document.createElement('option'); o.value=c.id; o.textContent=c.title; s.appendChild(o); }});
    });
  } catch {}
}

async function loadAssignments() {
  const courseId = document.getElementById('assignment-course-filter')?.value || '';
  const list = document.getElementById('assignments-list');
  if (!list) return;
  list.innerHTML = [1,2].map(()=>`<div class="col-md-6">${SkeletonCard()}</div>`).join('');
  try {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    const data = await apiRequest(`/assignments?${params}`);
    state.assignments = data.assignments;
    if (!data.assignments.length) {
      list.innerHTML = `<div class="col-12">${EmptyState('bi-file-earmark-text','No assignments found','No assignments posted for your courses yet.')}</div>`;
      return;
    }
    list.innerHTML = data.assignments.map(a => {
      const isStudent = state.user?.role === 'student';
      const sub = a.mySubmission;
      const isOverdue = new Date(a.dueDate) < new Date();
      const statusBadge = sub ? Badge(sub.status==='graded'?`Graded: ${sub.marks}/${a.maxMarks}`:'Submitted', sub.status==='graded'?'success':'primary')
        : isOverdue ? Badge('Overdue','danger') : Badge('Pending','warning');

      return `
      <div class="col-md-6">
        <div class="card p-4 h-100 animate-fade-in">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="fw-bold mb-0" style="font-size:1rem;">${escapeHtml(a.title)}</h5>
            ${statusBadge}
          </div>
          <p class="text-muted small mb-3">${escapeHtml(a.description || 'No description provided')}</p>
          <div class="d-flex justify-content-between text-muted small mb-3">
            <span><i class="bi bi-book me-1"></i>${escapeHtml(a.course?.title || '—')}</span>
            <span><i class="bi bi-calendar me-1"></i>Due: ${new Date(a.dueDate).toLocaleDateString()}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="badge badge-primary">${a.maxMarks} marks</span>
            <div class="d-flex gap-2">
              ${isStudent && !sub ? `<button class="btn btn-sm btn-primary" onclick="openSubmitModal('${a.id}','${a.title}')"><i class="bi bi-upload me-1"></i>Submit</button>` : ''}
              ${isStudent && sub?.fileUrl ? `<a href="http://localhost:5000${sub.fileUrl}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="bi bi-download"></i></a>` : ''}
              ${!isStudent ? `<button class="btn btn-sm btn-outline-primary" onclick="viewSubmissions('${a.id}','${a.title}')"><i class="bi bi-people me-1"></i>Submissions</button>` : ''}
              ${a.fileUrl ? `<a href="http://localhost:5000${a.fileUrl}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="bi bi-paperclip"></i></a>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) { list.innerHTML = `<div class="col-12 text-danger">${err.message}</div>`; }
}
window.loadAssignments = loadAssignments;

function openAssignmentModal() {
  new bootstrap.Modal(document.getElementById('assignment-modal')).show();
}
window.openAssignmentModal = openAssignmentModal;

async function createAssignment() {
  const file = document.getElementById('new-assignment-file')?.files[0];
  const courseId = document.getElementById('new-assignment-course').value;
  const title = document.getElementById('new-assignment-title').value;
  const dueDate = document.getElementById('new-assignment-due').value;
  if (!courseId || !title || !dueDate) { showToast('Please fill all required fields.', 'warning'); return; }

  const fd = new FormData();
  fd.append('courseId', courseId);
  fd.append('title', title);
  fd.append('description', document.getElementById('new-assignment-description').value);
  fd.append('dueDate', dueDate);
  fd.append('maxMarks', document.getElementById('new-assignment-marks').value);
  fd.append('allowLateSubmission', document.getElementById('new-assignment-late').checked);
  if (file) fd.append('file', file);

  try {
    await apiUpload('/assignments', fd);
    bootstrap.Modal.getInstance(document.getElementById('assignment-modal'))?.hide();
    showToast('Assignment posted!', 'success');
    await loadAssignments();
  } catch (err) { showToast(err.message, 'error'); }
}
window.createAssignment = createAssignment;

let currentSubmitAssignmentId = null;
function openSubmitModal(assignmentId, title) {
  currentSubmitAssignmentId = assignmentId;
  document.getElementById('submit-assignment-desc').textContent = `Submitting for: ${title}`;
  new bootstrap.Modal(document.getElementById('submit-modal')).show();
}
window.openSubmitModal = openSubmitModal;

async function submitAssignment() {
  const file = document.getElementById('submit-assignment-file')?.files[0];
  if (!file) { showToast('Please select a file.', 'warning'); return; }
  document.getElementById('upload-progress-bar').classList.remove('d-none');
  document.getElementById('submit-btn').disabled = true;
  const fd = new FormData();
  fd.append('file', file);
  try {
    await apiUpload(`/assignments/${currentSubmitAssignmentId}/submit`, fd);
    bootstrap.Modal.getInstance(document.getElementById('submit-modal'))?.hide();
    showToast('Assignment submitted successfully!', 'success');
    await loadAssignments();
  } catch (err) { showToast(err.message, 'error'); }
  finally { document.getElementById('upload-progress-bar')?.classList.add('d-none'); document.getElementById('submit-btn').disabled = false; }
}
window.submitAssignment = submitAssignment;

let currentGradeSubmissionId = null;
let currentGradeMaxMarks = 100;
async function viewSubmissions(assignmentId, title) {
  const assignment = (state.assignments || []).find(a => a.id === assignmentId);
  state.currentGradingAssignment = assignment;
  try {
    const data = await apiRequest(`/assignments/${assignmentId}/submissions`);
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade show" style="display:block;background:rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content lms-modal">
            <div class="modal-header"><h5 class="modal-title">Submissions — ${title}</h5><button type="button" class="btn-close" onclick="this.closest('.modal').parentElement.remove()"></button></div>
            <div class="modal-body" style="max-height:500px;overflow-y:auto;">
              ${!data.submissions.length ? EmptyState('bi-inbox','No submissions yet','Students haven\'t submitted yet.') :
                `<table class="table lms-table">
                  <thead><tr><th>Student</th><th>Submitted</th><th>Status</th><th>Marks</th><th>Action</th></tr></thead>
                  <tbody>${data.submissions.map(s=>`
                    <tr>
                      <td>${s.student?.firstName||''} ${s.student?.lastName||''}<div class="text-muted small">${s.student?.email||''}</div></td>
                      <td class="text-muted small">${new Date(s.submittedAt).toLocaleString()}</td>
                      <td>${Badge(s.status, s.status==='graded'?'success':s.status==='late'?'danger':'warning')}</td>
                      <td>${s.marks !== null ? s.marks : '—'}</td>
                      <td>
                        ${s.fileUrl ? `<a href="http://localhost:5000${s.fileUrl}" target="_blank" class="btn btn-sm btn-outline-secondary me-1"><i class="bi bi-download"></i></a>` : ''}
                        <button class="btn btn-sm btn-primary" onclick="document.querySelector('.modal.show:not(.lms-modal .modal)').parentElement.remove();openGradeModal('${s.id}',${s.marks||0},'${s.student?.email||''}')"><i class="bi bi-pencil"></i></button>
                      </td>
                    </tr>`).join('')}
                  </tbody></table>`}
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) { showToast(err.message, 'error'); }
}
window.viewSubmissions = viewSubmissions;

function openGradeModal(submissionId, currentMarks, studentEmail) {
  currentGradeSubmissionId = submissionId;
  const assignment = state.currentGradingAssignment;
  const maxMarks = assignment ? assignment.maxMarks : 100;

  document.getElementById('grade-student-info').innerHTML = `<div class="fw-500">Grading submission by: <span class="text-primary">${studentEmail}</span></div>`;
  document.getElementById('grade-marks').value = currentMarks !== null ? currentMarks : '';
  document.getElementById('grade-feedback').value = '';
  document.getElementById('grade-max-marks-label').textContent = `/ ${maxMarks}`;
  document.getElementById('ai-grade-student-submission').value = '';

  // Reset AI panel
  document.getElementById('ai-evaluation-results').classList.add('d-none');
  document.getElementById('ai-evaluation-loading').classList.add('d-none');
  document.getElementById('ai-apply-suggested-btn').style.display = 'none';

  new bootstrap.Modal(document.getElementById('grade-modal')).show();
}
window.openGradeModal = openGradeModal;

async function submitGrade() {
  const marks = parseFloat(document.getElementById('grade-marks').value);
  const feedback = document.getElementById('grade-feedback').value;
  try {
    await apiRequest(`/assignments/submissions/${currentGradeSubmissionId}/grade`, 'PUT', { marks, feedback });
    bootstrap.Modal.getInstance(document.getElementById('grade-modal'))?.hide();
    showToast('Grade saved.', 'success');
    await loadAssignments();
  } catch (err) { showToast(err.message, 'error'); }
}
window.submitGrade = submitGrade;

// ─── Quizzes ──────────────────────────────────────────────────────────────────
async function populateCourseFilterForQuizzes() {
  try {
    const data = await apiRequest('/courses');
    const sels = ['quiz-course-filter', 'new-quiz-course'];
    sels.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      data.courses.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.title; sel.appendChild(o); });
    });
  } catch {}
}

async function loadQuizzes() {
  const courseId = document.getElementById('quiz-course-filter')?.value || '';
  const list = document.getElementById('quizzes-list');
  if (!list) return;
  list.innerHTML = [1,2].map(()=>`<div class="col-md-6">${SkeletonCard()}</div>`).join('');
  try {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    const data = await apiRequest(`/quizzes?${params}`);
    if (!data.quizzes.length) {
      list.innerHTML = `<div class="col-12">${EmptyState('bi-patch-question','No quizzes found','Create your first quiz!')}</div>`;
      return;
    }
    const isStudent = state.user?.role === 'student';
    list.innerHTML = data.quizzes.map(q => {
      const attempt = q.myAttempt;
      const statusBadge = isStudent
        ? (attempt?.status === 'submitted' ? Badge(attempt.passed?`Passed (${attempt.score})`:`Failed (${attempt.score})`, attempt.passed?'success':'danger')
           : attempt?.status === 'in_progress' ? Badge('In Progress','warning')
           : Badge('Not Started','primary'))
        : Badge(q.isPublished ? 'Published' : 'Draft', q.isPublished ? 'success' : 'warning');

      return `
      <div class="col-md-6">
        <div class="card p-4 h-100 animate-fade-in">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="fw-bold mb-0" style="font-size:1rem;">${escapeHtml(q.title)}</h5>
            ${statusBadge}
          </div>
          <p class="text-muted small mb-3">${escapeHtml(q.description || 'No description')}</p>
          <div class="d-flex gap-3 text-muted small mb-3">
            <span><i class="bi bi-clock me-1"></i>${q.duration} min</span>
            <span><i class="bi bi-award me-1"></i>${q.totalMarks} marks</span>
            <span><i class="bi bi-book me-1"></i>${escapeHtml(q.course?.title || '—')}</span>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            ${isStudent && q.isPublished && !attempt ? `<button class="btn btn-sm btn-primary" onclick="startQuiz('${q.id}','${q.title}',${q.duration})"><i class="bi bi-play me-1"></i>Start Quiz</button>` : ''}
            ${isStudent && attempt?.status === 'in_progress' ? `<button class="btn btn-sm btn-warning" onclick="startQuiz('${q.id}','${q.title}',${q.duration})"><i class="bi bi-arrow-resume me-1"></i>Resume</button>` : ''}
            ${isStudent && attempt?.status === 'submitted' ? `<button class="btn btn-sm btn-outline-primary" onclick="viewMyResult('${attempt.id}')"><i class="bi bi-bar-chart me-1"></i>View Result</button>` : ''}
            ${!isStudent ? `
              <button class="btn btn-sm btn-outline-primary" onclick="viewQuizResults('${q.id}','${q.title}')"><i class="bi bi-people me-1"></i>Results</button>
              ${!q.isPublished ? `<button class="btn btn-sm btn-success" onclick="publishQuiz('${q.id}')"><i class="bi bi-send me-1"></i>Publish</button>` : ''}
              <button class="btn btn-sm btn-outline-danger" onclick="deleteQuiz('${q.id}')"><i class="bi bi-trash"></i></button>
            ` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) { list.innerHTML = `<div class="col-12 text-danger">${err.message}</div>`; }
}
window.loadQuizzes = loadQuizzes;

let quizQCount = 0;
function openQuizModal() {
  quizQCount = 0;
  document.getElementById('quiz-questions-builder').innerHTML = '';
  new bootstrap.Modal(document.getElementById('quiz-create-modal')).show();
}
window.openQuizModal = openQuizModal;

function addQuizQuestion() {
  quizQCount++;
  const builder = document.getElementById('quiz-questions-builder');
  const qId = `q_${quizQCount}`;
  const div = document.createElement('div');
  div.className = 'card p-3';
  div.id = `question-block-${qId}`;
  div.innerHTML = `
    <div class="d-flex justify-content-between mb-2">
      <span class="fw-bold text-primary">Question ${quizQCount}</span>
      <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('question-block-${qId}').remove()"><i class="bi bi-trash"></i></button>
    </div>
    <div class="mb-2"><label class="form-label small">Question Text</label><textarea class="form-control q-text" rows="2" placeholder="Enter question..."></textarea></div>
    <div class="row g-2 mb-2">
      <div class="col-md-4">
        <label class="form-label small">Type</label>
        <select class="form-select q-type" onchange="updateQuestionOptions(this,'${qId}')">
          <option value="mcq">Multiple Choice (MCQ)</option>
          <option value="multi">Multi-Select</option>
          <option value="truefalse">True / False</option>
        </select>
      </div>
      <div class="col-md-2"><label class="form-label small">Marks</label><input type="number" class="form-control q-marks" value="1"></div>
    </div>
    <div class="q-options-area" id="options-${qId}">
      ${renderMCQOptions()}
    </div>`;
  builder.appendChild(div);
}
window.addQuizQuestion = addQuizQuestion;

function renderMCQOptions() {
  return `<label class="form-label small">Options (check correct)</label>
    ${[0,1,2,3].map(i=>`<div class="d-flex align-items-center gap-2 mb-1">
      <input type="radio" name="correct_opt_new" value="${i}" class="q-correct">
      <input type="text" class="form-control form-control-sm q-option-text" placeholder="Option ${i+1}">
    </div>`).join('')}`;
}

function renderTrueFalseOptions() {
  return `<label class="form-label small">Correct Answer</label>
    <div class="d-flex gap-3">
      <div class="form-check"><input type="radio" class="form-check-input q-correct" name="correct_tf_new" value="0"><label class="form-check-label">True</label></div>
      <div class="form-check"><input type="radio" class="form-check-input q-correct" name="correct_tf_new" value="1"><label class="form-check-label">False</label></div>
    </div>`;
}

function renderMultiOptions() {
  return `<label class="form-label small">Options (check all correct)</label>
    ${[0,1,2,3].map(i=>`<div class="d-flex align-items-center gap-2 mb-1">
      <input type="checkbox" class="q-correct" value="${i}">
      <input type="text" class="form-control form-control-sm q-option-text" placeholder="Option ${i+1}">
    </div>`).join('')}`;
}

function updateQuestionOptions(sel, qId) {
  const area = document.getElementById(`options-${qId}`);
  const type = sel.value;
  if (type === 'truefalse') area.innerHTML = renderTrueFalseOptions();
  else if (type === 'multi') area.innerHTML = renderMultiOptions();
  else area.innerHTML = renderMCQOptions();
}
window.updateQuestionOptions = updateQuestionOptions;

async function saveQuiz() {
  const courseId = document.getElementById('new-quiz-course').value;
  const title = document.getElementById('new-quiz-title').value;
  if (!courseId || !title) { showToast('Course and title are required.', 'warning'); return; }

  const questionBlocks = document.querySelectorAll('#quiz-questions-builder > .card');
  if (!questionBlocks.length) { showToast('Add at least one question.', 'warning'); return; }

  const questions = [];
  for (const block of questionBlocks) {
    const text = block.querySelector('.q-text')?.value || '';
    const type = block.querySelector('.q-type')?.value || 'mcq';
    const marks = parseInt(block.querySelector('.q-marks')?.value || '1');
    const optionEls = block.querySelectorAll('.q-option-text');
    const options = [...optionEls].map(el => el.value).filter(v => v);

    let correctAnswers = [];
    if (type === 'truefalse') {
      const checked = block.querySelector('.q-correct:checked');
      if (checked) correctAnswers = [parseInt(checked.value)];
    } else if (type === 'multi') {
      correctAnswers = [...block.querySelectorAll('.q-correct:checked')].map(c => parseInt(c.value));
    } else {
      const checked = block.querySelector('.q-correct:checked');
      if (checked) correctAnswers = [parseInt(checked.value)];
    }

    if (text) questions.push({ questionText: text, type, options: type==='truefalse' ? ['True','False'] : options, correctAnswers, marks });
  }

  const payload = {
    courseId,
    title,
    description: document.getElementById('new-quiz-description').value,
    duration: parseInt(document.getElementById('new-quiz-duration').value || '30'),
    totalMarks: parseInt(document.getElementById('new-quiz-totalMarks').value || '100'),
    passingMarks: parseInt(document.getElementById('new-quiz-passingMarks').value || '40'),
    isPublished: document.getElementById('new-quiz-publish').checked,
    questions
  };

  try {
    await apiRequest('/quizzes', 'POST', payload);
    bootstrap.Modal.getInstance(document.getElementById('quiz-create-modal'))?.hide();
    showToast('Quiz created!', 'success');
    await loadQuizzes();
  } catch (err) { showToast(err.message, 'error'); }
}
window.saveQuiz = saveQuiz;

async function publishQuiz(id) {
  try {
    await apiRequest(`/quizzes/${id}`, 'PUT', { isPublished: true });
    showToast('Quiz published!', 'success');
    await loadQuizzes();
  } catch (err) { showToast(err.message, 'error'); }
}
window.publishQuiz = publishQuiz;

async function deleteQuiz(id) {
  if (!confirm('Delete this quiz?')) return;
  try {
    await apiRequest(`/quizzes/${id}`, 'DELETE');
    showToast('Quiz deleted.', 'success');
    await loadQuizzes();
  } catch (err) { showToast(err.message, 'error'); }
}
window.deleteQuiz = deleteQuiz;

let currentQuizAttemptId = null;
let currentQuizId = null;
async function startQuiz(quizId, title, duration) {
  currentQuizId = quizId;
  document.getElementById('quiz-take-title').textContent = title;
  const modal = new bootstrap.Modal(document.getElementById('quiz-take-modal'));
  modal.show();

  const body = document.getElementById('quiz-take-body');
  body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';

  try {
    // Start the attempt
    const startRes = await apiRequest(`/quizzes/${quizId}/attempt`, 'POST', { answers: {} });
    currentQuizAttemptId = startRes.attempt.id;

    // Fetch quiz with questions
    const quizRes = await apiRequest(`/quizzes/${quizId}`);
    const quiz = quizRes.quiz;

    // Render questions
    body.innerHTML = quiz.questions.map((q, i) => `
      <div class="mb-4 p-3 rounded" style="background:var(--bg-color);">
        <div class="fw-bold mb-2">Q${i+1}. ${q.questionText} <span class="badge badge-primary ms-2">${q.marks} mark${q.marks>1?'s':''}</span></div>
        <div class="d-flex flex-column gap-2">
          ${(q.options || []).map((opt, oi) => `
            <label class="d-flex align-items-center gap-2 p-2 rounded hover-bg" style="cursor:pointer;">
              <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="q_${q.id}" value="${oi}" class="quiz-answer" data-qid="${q.id}" data-type="${q.type}">
              <span>${opt}</span>
            </label>`).join('')}
        </div>
      </div>`).join('');

    // Start timer
    let seconds = duration * 60;
    const timerEl = document.getElementById('quiz-countdown');
    if (state.quizTimer) clearInterval(state.quizTimer);
    state.quizTimer = setInterval(() => {
      seconds--;
      const m = Math.floor(seconds / 60).toString().padStart(2,'0');
      const s = (seconds % 60).toString().padStart(2,'0');
      if (timerEl) {
        timerEl.textContent = `${m}:${s}`;
        if (seconds <= 60) timerEl.style.color = '#ef4444';
      }
      if (seconds <= 0) {
        clearInterval(state.quizTimer);
        submitQuizAttempt();
      }
    }, 1000);
  } catch (err) { body.innerHTML = `<div class="alert alert-danger">${err.message}</div>`; }
}
window.startQuiz = startQuiz;

async function submitQuizAttempt() {
  if (state.quizTimer) { clearInterval(state.quizTimer); state.quizTimer = null; }
  const answers = {};
  document.querySelectorAll('.quiz-answer').forEach(el => {
    if (el.checked) {
      const qid = el.dataset.qid;
      const type = el.dataset.type;
      const val = parseInt(el.value);
      if (type === 'multi') {
        if (!answers[qid]) answers[qid] = [];
        answers[qid].push(val);
      } else {
        answers[qid] = [val];
      }
    }
  });
  try {
    const res = await apiRequest(`/quizzes/${currentQuizId}/attempt`, 'POST', { answers, submit: true });
    bootstrap.Modal.getInstance(document.getElementById('quiz-take-modal'))?.hide();
    const icon = res.passed ? '🎉' : '😞';
    showToast(`${icon} Quiz submitted! Score: ${res.score} — ${res.passed ? 'PASSED' : 'FAILED'}`, res.passed ? 'success' : 'warning');
    await loadQuizzes();
  } catch (err) { showToast(err.message, 'error'); }
}
window.submitQuizAttempt = submitQuizAttempt;

async function viewQuizResults(quizId, title) {
  const modal = new bootstrap.Modal(document.getElementById('quiz-results-modal'));
  modal.show();
  const body = document.getElementById('quiz-results-body');
  body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
  try {
    const data = await apiRequest(`/quizzes/${quizId}/results`);
    const s = data.stats;
    body.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-3 text-center"><div class="text-h2">${s.total}</div><div class="text-muted small">Attempts</div></div>
        <div class="col-3 text-center"><div class="text-h2 text-success">${s.passed}</div><div class="text-muted small">Passed</div></div>
        <div class="col-3 text-center"><div class="text-h2 text-danger">${s.failed}</div><div class="text-muted small">Failed</div></div>
        <div class="col-3 text-center"><div class="text-h2 text-primary">${s.avgScore}</div><div class="text-muted small">Avg Score</div></div>
      </div>
      <div style="max-height:350px;overflow-y:auto;">
        <table class="table lms-table">
          <thead><tr><th>Student</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>${data.attempts.map(a=>`
            <tr>
              <td>${a.student?.firstName||''} ${a.student?.lastName||''}</td>
              <td class="fw-bold">${a.score}</td>
              <td>${Badge(a.passed?'Passed':'Failed', a.passed?'success':'danger')}</td>
              <td class="text-muted small">${a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) { body.innerHTML = `<div class="alert alert-danger">${err.message}</div>`; }
}
window.viewQuizResults = viewQuizResults;

async function viewMyResult(attemptId) {
  try {
    const data = await apiRequest(`/quizzes/attempts/${attemptId}`);
    const a = data.attempt;
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade show" style="display:block;background:rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content lms-modal text-center p-4">
            <button class="btn-close ms-auto" onclick="this.closest('.modal').parentElement.remove()"></button>
            <div style="font-size:3rem;">${a.passed ? '🎉' : '😞'}</div>
            <h4 class="fw-bold mt-2">${a.quiz?.title}</h4>
            <div class="text-h1 my-3" style="color:${a.passed?'var(--success)':'var(--danger)'};">${a.score} / ${a.quiz?.totalMarks}</div>
            <div>${Badge(a.passed?'PASSED':'FAILED', a.passed?'success':'danger')}</div>
            <p class="text-muted mt-3 mb-0">Submitted: ${new Date(a.submittedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) { showToast(err.message, 'error'); }
}
window.viewMyResult = viewMyResult;

// ─── Analytics ────────────────────────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const role = state.user?.role;
    let data;
    if (role === 'admin') data = await apiRequest('/analytics/dashboard');
    else if (role === 'teacher') data = await apiRequest('/analytics/teacher');
    else data = await apiRequest('/analytics/student');

    const sc = document.getElementById('analytics-stat-cards');
    if (!sc) return;

    if (role === 'admin') {
      sc.innerHTML = `
        ${StatCard('bi-people','Total Users', data.stats.totalUsers, '#4f46e5')}
        ${StatCard('bi-book','Active Courses', data.stats.totalCourses, '#10b981')}
        ${StatCard('bi-file-earmark-text','Assignments', data.stats.totalAssignments, '#f59e0b')}
        ${StatCard('bi-patch-question','Published Quizzes', data.stats.totalQuizzes, '#6366f1')}`;

      if (data.attendanceTrend) {
        const chartEl = document.getElementById('analytics-attendance-chart');
        if (chartEl) chartEl.innerHTML = renderBarChart(data.attendanceTrend);
      }
    } else if (role === 'teacher') {
      sc.innerHTML = `
        ${StatCard('bi-book','My Courses', data.courses.length, '#4f46e5')}
        ${StatCard('bi-file-earmark-text','Assignments', data.totalAssignments, '#10b981')}
        ${StatCard('bi-patch-question','Quizzes', data.totalQuizzes, '#f59e0b')}`;
    } else {
      sc.innerHTML = `
        ${StatCard('bi-journal-album','Enrollments', data.stats.enrollments, '#4f46e5')}
        ${StatCard('bi-upload','Submissions', data.stats.submissions, '#10b981')}
        ${StatCard('bi-award','Avg Marks', `${data.averageMarks}%`, '#f59e0b')}
        ${StatCard('bi-check-circle','Quizzes Passed', data.quizzesPassed, '#6366f1')}`;
    }
  } catch (err) { console.error(err); }
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
let auditPage = 1;
async function loadAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  const params = new URLSearchParams({
    page: auditPage, limit: 25,
    userEmail: document.getElementById('audit-email-filter')?.value || '',
    action: document.getElementById('audit-action-filter')?.value || '',
    from: document.getElementById('audit-from')?.value || '',
    to: document.getElementById('audit-to')?.value || ''
  });
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
  try {
    const data = await apiRequest(`/audit-logs?${params}`);
    if (!data.logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No audit logs found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.logs.map(l => `
      <tr>
        <td class="text-muted small">${new Date(l.createdAt).toLocaleString()}</td>
        <td class="text-primary small">${l.userEmail}</td>
        <td><span class="badge badge-primary">${l.action}</span></td>
        <td class="text-muted small">${l.entity || '—'}</td>
        <td class="text-muted small">${l.details ? JSON.stringify(l.details).substring(0,60) + '...' : '—'}</td>
        <td class="text-muted small">${l.ipAddress || '—'}</td>
      </tr>`).join('');

    const pag = document.getElementById('audit-pagination');
    if (pag) {
      pag.innerHTML = `<span class="text-muted small">Total: ${data.total}</span>
        <div class="btn-group btn-group-sm ms-auto">
          <button class="btn btn-outline-secondary" onclick="auditPage=Math.max(1,auditPage-1);loadAuditLogs()" ${auditPage<=1?'disabled':''}>‹ Prev</button>
          <button class="btn btn-outline-secondary disabled">Page ${data.page}/${data.pages}</button>
          <button class="btn btn-outline-secondary" onclick="auditPage++;loadAuditLogs()" ${auditPage>=data.pages?'disabled':''}>Next ›</button>
        </div>`;
    }
  } catch (err) { tbody.innerHTML = `<tr><td colspan="6" class="text-danger">${err.message}</td></tr>`; }
}
window.loadAuditLogs = loadAuditLogs;

// ─── Live Classroom ───────────────────────────────────────────────────────────
async function loadActiveMeetings() {
  const container = document.getElementById('active-meetings-container');
  if (!container) return;
  try {
    const data = await apiRequest('/live/meetings');
    state.activeMeetings = data.meetings || [];
    if (!state.activeMeetings.length) {
      container.innerHTML = EmptyState('bi-camera-video-off','No active sessions','Start a class to see it here.');
      return;
    }
    container.innerHTML = state.activeMeetings.map(m => `
      <div class="d-flex align-items-center justify-content-between p-3 rounded mb-2" style="background:var(--bg-color);">
        <div>
          <div class="fw-600"><span class="text-danger me-2">●</span>${m.name}</div>
          <div class="text-muted small">${m.meetingId} · Started ${new Date(m.startedAt).toLocaleTimeString()}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="joinMeeting('${m.meetingId}','${m.name}')">Join</button>
      </div>`).join('');
  } catch (err) { container.innerHTML = EmptyState('bi-camera-video','Ready','Start or join a live class.'); }
}

async function loadRecordings() {
  const list = document.getElementById('recordings-list');
  if (!list) return;
  try {
    const data = await apiRequest('/live/recordings');
    if (!data.recordings.length) {
      list.innerHTML = EmptyState('bi-collection-play','No recordings','Recordings from past classes appear here.');
      return;
    }
    list.innerHTML = data.recordings.map(r => `
      <div class="d-flex align-items-center justify-content-between p-3 rounded mb-2" style="background:var(--bg-color);">
        <div>
          <div class="fw-600">${r.name}</div>
          <div class="text-muted small">${new Date(r.startTime).toLocaleString()}</div>
        </div>
        <a href="${r.playbackUrl}" target="_blank" class="btn btn-outline-primary btn-sm"><i class="bi bi-play me-1"></i>Play</a>
      </div>`).join('');
  } catch {}
}

async function startClass() {
  const name = document.getElementById('meeting-name-input')?.value || 'Live Class';
  const btn = document.getElementById('start-class-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Starting...';
  try {
    const data = await apiRequest('/live/create', 'POST', { name });
    const joinData = await apiRequest('/live/join', 'POST', { meetingId: data.meeting.meetingId, role: 'moderator' });
    window.open(joinData.joinUrl, '_blank');
    await loadActiveMeetings();
  } catch (err) { showToast(err.message, 'error'); }
  btn.disabled = false; btn.innerHTML = '<i class="bi bi-camera-video me-1"></i>Start Class';
}
window.startClass = startClass;

async function openJoinModal() {
  await loadActiveMeetings();
  const list = document.getElementById('join-sessions-list');
  if (!list) return;
  if (!state.activeMeetings.length) {
    list.innerHTML = '<p class="text-muted">No active sessions right now.</p>';
  } else {
    list.innerHTML = state.activeMeetings.map(m => `
      <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-2">
        <div><div class="fw-500">${m.name}</div><div class="text-muted small">${m.meetingId}</div></div>
        <button class="btn btn-sm btn-primary" onclick="joinMeeting('${m.meetingId}','${m.name}')">Join</button>
      </div>`).join('');
  }
  new bootstrap.Modal(document.getElementById('join-modal')).show();
}
window.openJoinModal = openJoinModal;

async function joinMeeting(meetingId, name) {
  try {
    const data = await apiRequest('/live/join', 'POST', { meetingId, role: 'attendee' });
    window.open(data.joinUrl, '_blank');
    bootstrap.Modal.getInstance(document.getElementById('join-modal'))?.hide();
  } catch (err) { showToast(err.message, 'error'); }
}
window.joinMeeting = joinMeeting;

// ─── Chart Helpers ─────────────────────────────────────────────────────────────
function renderBarChart(data) {
  const max = Math.max(...data.map(d => d.count), 1);
  return `<div class="d-flex align-items-end gap-2" style="height:100%;padding-top:1rem;">
    ${data.map(d => `
      <div class="d-flex flex-column align-items-center flex-1 gap-1">
        <span class="text-muted" style="font-size:0.7rem;">${d.count}</span>
        <div style="width:100%;height:${Math.max(10,Math.round((d.count/max)*160))}px;background:linear-gradient(180deg,var(--primary),var(--primary-hover));border-radius:4px 4px 0 0;transition:height 0.5s ease;"></div>
        <span class="text-muted" style="font-size:0.7rem;">${d.date}</span>
      </div>`).join('')}
  </div>`;
}

function ProgressBar(label, value, total, color) {
  const pct = total > 0 ? Math.round((value/total)*100) : 0;
  return `<div class="d-flex justify-content-between mb-1">
    <span class="small">${label}</span><span class="small fw-bold">${value} (${pct}%)</span></div>
    <div class="progress mb-2" style="height:8px;"><div class="progress-bar" style="width:${pct}%;background:${color};"></div></div>`;
}

// ─── App Init ─────────────────────────────────────────────────────────────────
async function init() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const data = await apiRequest('/auth/me');
      state.user = data.user;
      connectWebSocket();
      const roleHome = state.user.role === 'admin' ? 'admin' : state.user.role === 'teacher' ? 'teacher' : 'student';
      navigate(roleHome);
    } catch {
      localStorage.removeItem('token');
      navigate('login');
    }
  } else {
    navigate('login');
  }
}

init();

// ─── AI Helper Functions ───────────────────────────────────────────────────────
async function loadAIRecommendations() {
  const container = document.getElementById('student-ai-recommendations');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
  try {
    const res = await apiRequest('/ai/recommendations', 'POST');
    if (res.success && res.recommendations) {
      const rec = res.recommendations;
      container.innerHTML = `
        <div class="mb-3">
          <div class="fw-bold small text-muted mb-1">Focus Areas (Weak Topics)</div>
          <div class="d-flex flex-wrap gap-1">
            ${(rec.weakTopics || []).map(t => `<span class="badge bg-warning text-dark">${t}</span>`).join('') || '<span class="text-muted small">None identified yet</span>'}
          </div>
        </div>
        <div class="mb-3">
          <div class="fw-bold small text-muted mb-1">Suggested Practice Lessons & Quizzes</div>
          <ul class="list-unstyled mb-0" style="font-size:0.875rem;">
            ${(rec.nextLessons || []).map(l => `<li><i class="bi bi-book-half text-primary me-2"></i>${l}</li>`).join('')}
            ${(rec.practiceQuizzes || []).map(q => `<li><i class="bi bi-patch-question text-success me-2"></i>${q}</li>`).join('')}
          </ul>
        </div>
        <div>
          <div class="fw-bold small text-muted mb-1">Suggested Study Plan</div>
          <div class="p-2 border rounded bg-light small"><i class="bi bi-calendar-check text-indigo me-2"></i>${rec.schedule || 'Follow your regular study plan.'}</div>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="text-danger small">Failed to load study recommendations.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="text-danger small">${err.message}</div>`;
  }
}
window.loadAIRecommendations = loadAIRecommendations;

async function loadAISummaries() {
  const container = document.getElementById('student-ai-summaries');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
  try {
    const data = await apiRequest('/live/recordings');
    if (!data.recordings || !data.recordings.length) {
      container.innerHTML = '<div class="text-muted small py-3">No lecture recordings available yet.</div>';
      return;
    }
    container.innerHTML = data.recordings.map(r => `
      <div class="p-2 border rounded mb-2 d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold small">${r.name}</div>
          <div class="text-muted" style="font-size:0.75rem;">${new Date(r.startTime).toLocaleString()}</div>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="viewAISummary('${r.meetingId}')"><i class="bi bi-cpu"></i> View AI Summary</button>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-danger small">${err.message}</div>`;
  }
}
window.loadAISummaries = loadAISummaries;

async function viewAISummary(meetingId) {
  const modalId = 'ai-summary-detail-modal';
  let modalEl = document.getElementById(modalId);
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.innerHTML = `
    <div class="modal fade show" style="display:block;background:rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content lms-modal">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-cpu-fill me-2 text-primary"></i>AI Lecture Summary & Notes</h5>
            <button type="button" class="btn-close" onclick="this.closest('.modal').parentElement.remove()"></button>
          </div>
          <div class="modal-body" id="ai-summary-modal-body">
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <div class="text-muted small mt-2">AI is summarizing the lecture transcript. This might take a few seconds...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modalEl);

  try {
    const res = await apiRequest('/ai/summarize-recording', 'POST', { meetingId });
    const sBody = document.getElementById('ai-summary-modal-body');
    if (res.success && res.summary) {
      const s = res.summary;
      sBody.innerHTML = `
        <div class="mb-4">
          <h6 class="fw-bold text-primary mb-2">Lecture Abstract</h6>
          <p class="small text-muted mb-0">${s.summary}</p>
        </div>
        <div class="mb-4">
          <h6 class="fw-bold text-success mb-2">Key Concepts Covered</h6>
          <div class="d-flex flex-wrap gap-1">
            ${(s.concepts || []).map(c => `<span class="badge bg-success-light text-success border border-success me-1 mb-1">${c}</span>`).join('')}
          </div>
        </div>
        <div class="mb-4">
          <h6 class="fw-bold text-warning mb-2">Revision Questions</h6>
          <ul class="list-unstyled mb-0" style="font-size:0.875rem;">
            ${(s.questions || []).map(q => `<li><i class="bi bi-question-circle text-warning me-2"></i>${q}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h6 class="fw-bold text-indigo mb-2">Revision & Lecture Notes</h6>
          <div class="p-3 bg-light rounded border small" style="white-space: pre-wrap; font-family: monospace;">${s.notes || ''}</div>
        </div>
      `;
    } else {
      sBody.innerHTML = '<div class="alert alert-danger">Failed to generate summary.</div>';
    }
  } catch (err) {
    document.getElementById('ai-summary-modal-body').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}
window.viewAISummary = viewAISummary;

function toggleAIChat() {
  const widget = document.getElementById('ai-chat-widget');
  if (widget) widget.classList.toggle('expanded');
}
window.toggleAIChat = toggleAIChat;

async function sendAIChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('ai-chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  const courseId = document.getElementById('ai-chat-course-context')?.value || null;
  input.value = '';

  const messagesBox = document.getElementById('ai-chat-messages-box');
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'ai-chat-msg user animate-fade-in';
  userMsgDiv.innerHTML = `<div class="ai-chat-msg-bubble">${escapeHtml(msg)}</div>`;
  messagesBox.appendChild(userMsgDiv);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  const assistantMsgDiv = document.createElement('div');
  assistantMsgDiv.className = 'ai-chat-msg assistant animate-fade-in';
  assistantMsgDiv.innerHTML = `<div class="ai-chat-msg-bubble" id="current-ai-response-bubble">...</div>`;
  messagesBox.appendChild(assistantMsgDiv);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'AI_STREAM_REQUEST',
      data: { message: msg, courseId }
    }));
  } else {
    const currentBubble = document.getElementById('current-ai-response-bubble');
    if (currentBubble) {
      currentBubble.textContent = 'Error: Chat offline. Reconnecting...';
      currentBubble.removeAttribute('id');
    }
  }
}
window.sendAIChatMessage = sendAIChatMessage;

let activeAiBubble = null;
function handleAiTypingStart() {
  const indicator = document.getElementById('ai-chat-typing');
  if (indicator) indicator.classList.remove('d-none');
  
  const bubble = document.getElementById('current-ai-response-bubble');
  if (bubble) {
    bubble.textContent = '';
    activeAiBubble = bubble;
  }
}
window.handleAiTypingStart = handleAiTypingStart;

function handleAiChunk(content) {
  const bubble = activeAiBubble || document.getElementById('current-ai-response-bubble');
  if (bubble) {
    bubble.textContent += content;
    const box = document.getElementById('ai-chat-messages-box');
    if (box) box.scrollTop = box.scrollHeight;
  }
}
window.handleAiChunk = handleAiChunk;

function handleAiTypingStop(response, error) {
  const indicator = document.getElementById('ai-chat-typing');
  if (indicator) indicator.classList.add('d-none');
  
  const bubble = activeAiBubble || document.getElementById('current-ai-response-bubble');
  if (bubble) {
    if (error) {
      bubble.textContent = `Error: ${error}`;
      bubble.style.color = 'var(--danger)';
    } else if (response && bubble.textContent === '') {
      bubble.textContent = response;
    }
    bubble.removeAttribute('id');
  }
  activeAiBubble = null;
}
window.handleAiTypingStop = handleAiTypingStop;

function addQuizQuestionWithData(qData) {
  quizQCount++;
  const builder = document.getElementById('quiz-questions-builder');
  const qId = `q_${quizQCount}`;
  const div = document.createElement('div');
  div.className = 'card p-3 animate-fade-in';
  div.id = `question-block-${qId}`;
  
  let optionsHtml = '';
  if (qData.type === 'truefalse') {
    optionsHtml = `<label class="form-label small">Correct Answer</label>
      <div class="d-flex gap-3">
        <div class="form-check"><input type="radio" class="form-check-input q-correct" name="correct_tf_${qId}" value="0" ${qData.correctAnswers.includes(0)?'checked':''}><label class="form-check-label">True</label></div>
        <div class="form-check"><input type="radio" class="form-check-input q-correct" name="correct_tf_${qId}" value="1" ${qData.correctAnswers.includes(1)?'checked':''}><label class="form-check-label">False</label></div>
      </div>`;
  } else if (qData.type === 'multi') {
    optionsHtml = `<label class="form-label small">Options (check all correct)</label>
      ${[0,1,2,3].map(i=>`<div class="d-flex align-items-center gap-2 mb-1">
        <input type="checkbox" class="q-correct" value="${i}" ${qData.correctAnswers.includes(i)?'checked':''}>
        <input type="text" class="form-control form-control-sm q-option-text" placeholder="Option ${i+1}" value="${qData.options[i] || ''}">
      </div>`).join('')}`;
  } else {
    optionsHtml = `<label class="form-label small">Options (check correct)</label>
      ${[0,1,2,3].map(i=>`<div class="d-flex align-items-center gap-2 mb-1">
        <input type="radio" name="correct_opt_${qId}" value="${i}" class="q-correct" ${qData.correctAnswers.includes(i)?'checked':''}>
        <input type="text" class="form-control form-control-sm q-option-text" placeholder="Option ${i+1}" value="${qData.options[i] || ''}">
      </div>`).join('')}`;
  }

  div.innerHTML = `
    <div class="d-flex justify-content-between mb-2">
      <span class="fw-bold text-primary">Question ${quizQCount} (AI Generated)</span>
      <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('question-block-${qId}').remove()"><i class="bi bi-trash"></i></button>
    </div>
    <div class="mb-2"><label class="form-label small">Question Text</label><textarea class="form-control q-text" rows="2" placeholder="Enter question...">${qData.questionText}</textarea></div>
    <div class="row g-2 mb-2">
      <div class="col-md-4">
        <label class="form-label small">Type</label>
        <select class="form-select q-type" onchange="updateQuestionOptions(this,'${qId}')">
          <option value="mcq" ${qData.type==='mcq'?'selected':''}>Multiple Choice (MCQ)</option>
          <option value="multi" ${qData.type==='multi'?'selected':''}>Multi-Select</option>
          <option value="truefalse" ${qData.type==='truefalse'?'selected':''}>True / False</option>
        </select>
      </div>
      <div class="col-md-2"><label class="form-label small">Marks</label><input type="number" class="form-control q-marks" value="${qData.marks || 1}"></div>
    </div>
    <div class="q-options-area" id="options-${qId}">
      ${optionsHtml}
    </div>`;
  builder.appendChild(div);
}
window.addQuizQuestionWithData = addQuizQuestionWithData;

async function generateAIQuizQuestions() {
  const courseId = document.getElementById('new-quiz-course').value;
  const textContent = document.getElementById('ai-quiz-content').value.trim();
  if (!courseId) { showToast('Please select a course first.', 'warning'); return; }
  if (!textContent) { showToast('Please paste text content for the quiz.', 'warning'); return; }

  const btn = document.getElementById('ai-generate-quiz-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating...';

  try {
    const data = await apiRequest('/ai/generate-quiz', 'POST', { courseId, textContent });
    if (data.success && data.quiz && data.quiz.questions) {
      data.quiz.questions.forEach(q => {
        addQuizQuestionWithData(q);
      });
      showToast(`Successfully generated ${data.quiz.questions.length} questions!`, 'success');
      document.getElementById('ai-quiz-content').value = '';
    } else {
      showToast('Failed to generate questions.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-magic me-1"></i>Generate Questions';
  }
}
window.generateAIQuizQuestions = generateAIQuizQuestions;

async function runAIEvaluation() {
  const submissionText = document.getElementById('ai-grade-student-submission').value.trim();
  if (!submissionText) { showToast('Please enter the student\'s submission text first.', 'warning'); return; }

  const assignment = state.currentGradingAssignment;
  const assignmentDescription = assignment ? assignment.description : 'Analyze the assignment submission.';
  const maxMarks = assignment ? assignment.maxMarks : 100;
  const submissionId = currentGradeSubmissionId;

  const resultsDiv = document.getElementById('ai-evaluation-results');
  const loadingDiv = document.getElementById('ai-evaluation-loading');
  const applyBtn = document.getElementById('ai-apply-suggested-btn');
  const runBtn = document.getElementById('ai-evaluate-btn');

  resultsDiv.classList.add('d-none');
  loadingDiv.classList.remove('d-none');
  runBtn.disabled = true;

  try {
    const res = await apiRequest('/ai/evaluate-assignment', 'POST', {
      submissionId,
      studentSubmission: submissionText,
      assignmentDescription,
      maxMarks
    });

    if (res.success && res.feedback) {
      const f = res.feedback;
      document.getElementById('ai-suggested-marks').textContent = f.suggestedMarks;
      document.getElementById('ai-plagiarism-score').textContent = Math.round(f.plagiarismScore * 100) + '%';
      
      const weakDiv = document.getElementById('ai-weak-sections');
      if (weakDiv) {
        weakDiv.innerHTML = (f.weakSections || []).map(s => `<span class="badge bg-danger-light text-danger border border-danger mb-1 me-1">${s}</span>`).join('') || '<span class="text-muted small">None identified</span>';
      }
      
      document.getElementById('ai-detailed-feedback').textContent = f.feedback;
      
      state.suggestedGrade = f.suggestedMarks;
      state.suggestedFeedback = f.feedback;
      
      resultsDiv.classList.remove('d-none');
      if (applyBtn) applyBtn.style.display = 'block';
    } else {
      showToast('AI failed to evaluate the assignment.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loadingDiv.classList.add('d-none');
    runBtn.disabled = false;
  }
}
window.runAIEvaluation = runAIEvaluation;

function applyAISuggestions() {
  if (state.suggestedGrade !== undefined) {
    document.getElementById('grade-marks').value = state.suggestedGrade;
  }
  if (state.suggestedFeedback) {
    document.getElementById('grade-feedback').value = state.suggestedFeedback;
  }
  showToast('AI suggestions copied to grade sheet.', 'success');
}
window.applyAISuggestions = applyAISuggestions;

async function loadAITelemetry() {
  const container = document.getElementById('admin-ai-telemetry');
  if (!container) return;
  try {
    const res = await apiRequest('/ai/metrics');
    if (res.success && res.metrics) {
      const m = res.metrics;
      const totalTokens = m.promptTokens + m.completionTokens;
      const cost = totalTokens * 0.000002;

      container.innerHTML = `
        <div class="ai-telemetry-grid">
          <div class="ai-telemetry-stat">
            <div class="text-muted small">Total AI Requests</div>
            <h3>${m.totalRequests}</h3>
          </div>
          <div class="ai-telemetry-stat">
            <div class="text-muted small">Prompt Tokens</div>
            <h3>${m.promptTokens}</h3>
          </div>
          <div class="ai-telemetry-stat">
            <div class="text-muted small">Completion Tokens</div>
            <h3>${m.completionTokens}</h3>
          </div>
          <div class="ai-telemetry-stat">
            <div class="text-muted small">Total Cost (USD)</div>
            <h3 class="text-success">$${cost.toFixed(4)}</h3>
          </div>
          <div class="ai-telemetry-stat">
            <div class="text-muted small">Active AI Provider</div>
            <h3 class="text-primary" style="text-transform:uppercase;">${m.provider}</h3>
          </div>
        </div>
        
        <div class="table-responsive mt-3">
          <table class="table table-sm lms-table">
            <thead>
              <tr>
                <th>Action Feature</th>
                <th>Request Count</th>
                <th>Prompt Tokens</th>
                <th>Completion Tokens</th>
                <th>Total Tokens</th>
              </tr>
            </thead>
            <tbody>
              ${(m.usageByAction || []).map(a => `
                <tr>
                  <td><strong>${a.action}</strong></td>
                  <td>${a.count}</td>
                  <td>${a.promptTokens}</td>
                  <td>${a.completionTokens}</td>
                  <td>${a.promptTokens + a.completionTokens}</td>
                </tr>`).join('') || '<tr><td colspan="5" class="text-center py-2 text-muted">No telemetry logs recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="text-danger small">Failed to load telemetry data.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="text-danger small">${err.message}</div>`;
  }
}
window.loadAITelemetry = loadAITelemetry;
