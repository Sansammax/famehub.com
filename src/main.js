import './style.css';

// Simple Router and State management
const state = {
  user: null, // role: 'admin' | 'teacher' | 'student' | null
  currentRoute: 'login'
};

const routes = {
  login: renderLogin,
  admin: renderAdminDashboard,
  teacher: renderTeacherDashboard,
  student: renderStudentDashboard,
  live: renderLiveClassroom,
  course: renderCoursePage,
  analytics: renderAnalytics
};

function navigate(route, data = null) {
  state.currentRoute = route;
  if(data) state.pageData = data;
  renderApp();
}

window.navigate = navigate;

// Reusable Components
const Sidebar = (role) => {
  const getNavItems = () => {
    switch(role) {
      case 'admin':
        return `
          <div class="nav-item">
            <a class="nav-link ${state.currentRoute === 'admin' ? 'active' : ''}" onclick="navigate('admin')">
              <i class="bi bi-grid-1x2"></i> Dashboard
            </a>
          </div>
          <div class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-people"></i> Users</a>
          </div>
          <div class="nav-item">
            <a class="nav-link ${state.currentRoute === 'course' ? 'active' : ''}" onclick="navigate('course')"><i class="bi bi-book"></i> Courses</a>
          </div>
          <div class="nav-item">
            <a class="nav-link ${state.currentRoute === 'analytics' ? 'active' : ''}" onclick="navigate('analytics')"><i class="bi bi-bar-chart"></i> Reports</a>
          </div>
          <div class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-gear"></i> Settings</a>
          </div>
        `;
      case 'teacher':
        return `
          <div class="nav-item">
            <a class="nav-link ${state.currentRoute === 'teacher' ? 'active' : ''}" onclick="navigate('teacher')">
              <i class="bi bi-grid-1x2"></i> Dashboard
            </a>
          </div>
          <div class="nav-item">
            <a class="nav-link" onclick="navigate('live')"><i class="bi bi-camera-video"></i> Live Class</a>
          </div>
          <div class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-file-earmark-text"></i> Assignments</a>
          </div>
          <div class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-people"></i> Students</a>
          </div>
        `;
      case 'student':
        return `
          <div class="nav-item">
            <a class="nav-link ${state.currentRoute === 'student' ? 'active' : ''}" onclick="navigate('student')">
              <i class="bi bi-grid-1x2"></i> Dashboard
            </a>
          </div>
          <div class="nav-item">
            <a class="nav-link" onclick="navigate('course')"><i class="bi bi-journal-album"></i> My Courses</a>
          </div>
          <div class="nav-item">
            <a class="nav-link" onclick="navigate('live')"><i class="bi bi-camera-video"></i> Join Class</a>
          </div>
          <div class="nav-item">
            <a class="nav-link" href="#"><i class="bi bi-calendar-event"></i> Schedule</a>
          </div>
        `;
      default: return '';
    }
  };

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <i class="bi bi-mortarboard-fill"></i> SmartLive
      </div>
      <nav class="sidebar-nav">
        ${getNavItems()}
      </nav>
      <div style="padding: 1.5rem; border-top: 1px solid var(--border-color);">
        <a class="nav-link text-danger p-0" style="background:none;" onclick="logout()">
          <i class="bi bi-box-arrow-right"></i> Logout
        </a>
      </div>
    </aside>
  `;
};

const Topbar = (title) => `
  <header class="topbar">
    <div class="d-flex align-items-center">
      <button class="btn btn-light d-md-none me-3" id="sidebarToggle">
        <i class="bi bi-list fs-4"></i>
      </button>
      <h2 class="text-h2 mb-0">${title}</h2>
    </div>
    <div class="d-flex align-items-center gap-4">
      <div class="position-relative">
        <i class="bi bi-bell fs-5 text-muted"></i>
        <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
      </div>
      <div class="d-flex align-items-center gap-2 cursor-pointer" data-bs-toggle="dropdown">
        <img src="https://ui-avatars.com/api/?name=${state.user.role}&background=4f46e5&color=fff" alt="Profile" class="avatar">
        <div class="d-none d-md-block">
          <div class="fw-semibold text-capitalize">${state.user.role} User</div>
          <div class="text-muted" style="font-size: 0.75rem;">${state.user.role}@smartlive.edu</div>
        </div>
      </div>
    </div>
  </header>
`;

const Layout = (content, title = 'Dashboard') => `
  <div class="app-container">
    ${Sidebar(state.user.role)}
    <main class="main-content">
      ${Topbar(title)}
      <div class="content-wrapper animate-fade-in">
        ${content}
      </div>
    </main>
  </div>
`;

// Pages
function renderLogin() {
  return `
    <div class="auth-page">
      <div class="auth-card animate-fade-in">
        <div class="text-center mb-4">
          <div class="text-primary mb-2">
            <i class="bi bi-mortarboard-fill" style="font-size: 3rem;"></i>
          </div>
          <h1 class="text-h1">Smart Live LMS</h1>
          <p class="text-muted">Virtual Classroom Platform</p>
        </div>
        <form onsubmit="handleLogin(event)">
          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <div class="input-group">
              <span class="input-group-text bg-light border-end-0"><i class="bi bi-envelope"></i></span>
              <input type="email" class="form-control border-start-0 ps-0" id="email" value="admin@smartlive.edu" required>
            </div>
          </div>
          <div class="mb-4">
            <div class="d-flex justify-content-between">
              <label class="form-label fw-semibold">Password</label>
              <a href="#" class="text-muted" style="font-size: 0.85rem;">Forgot Password?</a>
            </div>
            <div class="input-group">
              <span class="input-group-text bg-light border-end-0"><i class="bi bi-lock"></i></span>
              <input type="password" class="form-control border-start-0 ps-0" id="password" value="password" required>
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label fw-semibold">Login As</label>
            <select class="form-select" id="role">
              <option value="admin">Administrator</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary w-100 py-2 fs-5">Sign In</button>
        </form>
      </div>
    </div>
  `;
}

window.handleLogin = (e) => {
  e.preventDefault();
  const role = document.getElementById('role').value;
  state.user = { role };
  navigate(role);
};

window.logout = () => {
  state.user = null;
  navigate('login');
};

function renderAdminDashboard() {
  return Layout(`
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stat-card h-100 border-0">
          <div class="stat-icon bg-primary bg-opacity-10 text-primary">
            <i class="bi bi-people-fill"></i>
          </div>
          <div>
            <div class="text-muted fw-semibold mb-1">Total Students</div>
            <h3 class="fw-bold mb-0">12,450</h3>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card h-100 border-0">
          <div class="stat-icon bg-success bg-opacity-10 text-success">
            <i class="bi bi-person-video3"></i>
          </div>
          <div>
            <div class="text-muted fw-semibold mb-1">Active Teachers</div>
            <h3 class="fw-bold mb-0">342</h3>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card h-100 border-0">
          <div class="stat-icon bg-warning bg-opacity-10 text-warning">
            <i class="bi bi-journal-text"></i>
          </div>
          <div>
            <div class="text-muted fw-semibold mb-1">Total Courses</div>
            <h3 class="fw-bold mb-0">856</h3>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card h-100 border-0">
          <div class="stat-icon bg-danger bg-opacity-10 text-danger">
            <i class="bi bi-broadcast"></i>
          </div>
          <div>
            <div class="text-muted fw-semibold mb-1">Live Classes</div>
            <h3 class="fw-bold mb-0">24</h3>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card border-0 h-100">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold mb-0">Recent User Activity</h5>
              <button class="btn btn-light btn-sm">View All</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead>
                  <tr class="text-muted">
                    <th class="border-0">User</th>
                    <th class="border-0">Role</th>
                    <th class="border-0">Status</th>
                    <th class="border-0">Last Active</th>
                    <th class="border-0 text-end">Action</th>
                  </tr>
                </thead>
                <tbody class="border-top-0">
                  <tr>
                    <td>
                      <div class="d-flex align-items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name=JS&background=random" class="avatar" style="width:32px; height:32px">
                        <div>
                          <div class="fw-semibold">John Smith</div>
                          <div class="text-muted small">john@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge badge-success">Teacher</span></td>
                    <td><span class="text-success">● Active</span></td>
                    <td>2 mins ago</td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-light"><i class="bi bi-pencil"></i></button>
                      <button class="btn btn-sm btn-light text-danger"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div class="d-flex align-items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name=ED&background=random" class="avatar" style="width:32px; height:32px">
                        <div>
                          <div class="fw-semibold">Emily Doe</div>
                          <div class="text-muted small">emily@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge badge-primary">Student</span></td>
                    <td><span class="text-muted">○ Offline</span></td>
                    <td>1 hour ago</td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-light"><i class="bi bi-pencil"></i></button>
                      <button class="btn btn-sm btn-light text-danger"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card border-0 h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-4">System Health</h5>
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Server Load</span>
                <span class="fw-semibold">45%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-primary" style="width: 45%"></div>
              </div>
            </div>
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Storage</span>
                <span class="fw-semibold">82%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-warning" style="width: 82%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `, 'Admin Overview');
}

function renderTeacherDashboard() {
  return Layout(`
    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card border-0 bg-primary text-white h-100 placeholder-glow" style="background: linear-gradient(135deg, var(--primary), var(--primary-hover));">
          <div class="card-body p-4 d-flex flex-column justify-content-center">
            <h3 class="fw-bold mb-2">Welcome Back, Prof. ${state.user.role}!</h3>
            <p class="opacity-75 mb-4 mb-md-5">You have a live class starting in 15 minutes.</p>
            <div class="mt-auto">
              <div class="bg-white bg-opacity-25 rounded p-3 d-flex align-items-center justify-content-between">
                <div>
                  <div class="fw-semibold text-white">Advanced Mathematics 101</div>
                  <div class="small opacity-75"><i class="bi bi-clock"></i> 10:00 AM - 11:30 AM</div>
                </div>
                <button class="btn btn-light fw-bold px-4" onclick="navigate('live')">Start Class <i class="bi bi-play-fill"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card border-0 h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-3">Quick Actions</h5>
            <div class="d-grid gap-3">
              <button class="btn btn-light text-start py-3 d-flex align-items-center text-primary fw-semibold" onclick="navigate('course')">
                <i class="bi bi-plus-circle-fill me-3 fs-4"></i> Create New Course
              </button>
              <button class="btn btn-light text-start py-3 d-flex align-items-center fw-semibold">
                <i class="bi bi-cloud-arrow-up-fill text-success me-3 fs-4"></i> Upload Assignment
              </button>
              <button class="btn btn-light text-start py-3 d-flex align-items-center fw-semibold">
                <i class="bi bi-chat-dots-fill text-warning me-3 fs-4"></i> Message Students
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h4 class="fw-bold mb-3 mt-5">Recent Submissions</h4>
    <div class="row g-4">
      ${[1,2,3].map(i => \`
        <div class="col-md-4">
          <div class="card border-0">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between mb-3">
                <span class="badge badge-warning">Needs Grading</span>
                <span class="text-muted small">2 hrs ago</span>
              </div>
              <h6 class="fw-bold mb-1">Calculus Assignment #${i}</h6>
              <p class="text-muted small mb-3">Submitted by Emma Watson</p>
              <button class="btn btn-outline-primary btn-sm w-100">Review Now</button>
            </div>
          </div>
        </div>
      \`).join('')}
    </div>
  `, 'Teacher Dashboard');
}

function renderStudentDashboard() {
  return Layout(`
    <div class="row g-4 mb-4">
      <div class="col-12">
        <div class="card border-0" style="background: url('https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80') center/cover; min-height: 200px;">
          <div class="card-body p-5 d-flex flex-column justify-content-center text-white" style="background: rgba(0,0,0,0.5); border-radius: inherit;">
            <h2 class="fw-bold mb-2">Ready to learn?</h2>
            <p class="lead mb-4">Your next class is Computer Science 101.</p>
            <div>
              <button class="btn btn-primary btn-lg" onclick="navigate('live')"><i class="bi bi-camera-video-fill me-2"></i> Join Live Class</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">My Courses</h5>
          <a href="#" class="text-primary text-decoration-none fw-semibold">View All</a>
        </div>
        <div class="row g-3">
          ${['Computer Science 101', 'UI/UX Design Basics'].map(course => \`
            <div class="col-md-6">
              <div class="card border-0 h-100">
                <div class="card-body p-4">
                  <div class="d-flex align-items-center gap-3 mb-3">
                    <div class="stat-icon bg-primary bg-opacity-10 text-primary" style="width:40px;height:40px;">
                      <i class="bi bi-code-slash"></i>
                    </div>
                    <div>
                      <h6 class="fw-bold mb-0">${course}</h6>
                      <small class="text-muted">Prof. Smith</small>
                    </div>
                  </div>
                  <div>
                    <div class="d-flex justify-content-between small text-muted mb-1">
                      <span>Progress</span>
                      <span>65%</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                      <div class="progress-bar bg-primary" style="width: 65%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          \`).join('')}
        </div>
      </div>
      <div class="col-lg-4">
        <h5 class="fw-bold mb-3">Upcoming Tasks</h5>
        <div class="card border-0">
          <div class="card-body p-0">
            <ul class="list-group list-group-flush">
              <li class="list-group-item p-4 d-flex gap-3 align-items-start border-bottom-0">
                <div class="bg-warning bg-opacity-10 text-warning rounded p-2 text-center" style="min-width: 50px;">
                  <div class="fw-bold">12</div>
                  <div class="small">Oct</div>
                </div>
                <div>
                  <h6 class="fw-bold mb-1">Design System Essay</h6>
                  <p class="mb-0 text-muted small">Due at 11:59 PM</p>
                </div>
              </li>
              <li class="list-group-item p-4 d-flex gap-3 align-items-start border-bottom-0">
                <div class="bg-danger bg-opacity-10 text-danger rounded p-2 text-center" style="min-width: 50px;">
                  <div class="fw-bold">15</div>
                  <div class="small">Oct</div>
                </div>
                <div>
                  <h6 class="fw-bold mb-1">Midterm Quiz</h6>
                  <p class="mb-0 text-muted small">Starts at 10:00 AM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `, 'Student Dashboard');
}

function renderLiveClassroom() {
  return Layout(`
    <div class="classroom-container">
      <div class="d-flex flex-column h-100">
        <div class="bg-dark rounded-3 flex-grow-1 mb-3 position-relative overflow-hidden d-flex flex-column">
          <div class="position-absolute top-0 start-0 w-100 p-3 d-flex justify-content-between align-items-center" style="z-index: 10; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);">
            <div class="d-flex align-items-center gap-3">
              <span class="badge bg-danger d-flex align-items-center gap-2"><div class="spinner-grow spinner-grow-sm" role="status" style="width:8px;height:8px;"></div> LIVE</span>
              <span class="text-white fw-semibold">Advanced Mathematics 101</span>
            </div>
            <div class="text-white bg-dark bg-opacity-50 px-2 py-1 rounded small"><i class="bi bi-person-fill"></i> 42</div>
          </div>
          
          <div class="video-grid flex-grow-1 p-0 rounded-0" style="background: url('https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80') center/cover;">
             <!-- Main presentation / Teacher view -->
          </div>
        </div>
        
        <div class="bg-dark rounded-3 p-3 overflow-auto" style="height: 140px; display: flex; gap: 10px;">
          ${[1,2,3,4,5].map(i => \`
            <div class="video-tile" style="min-width: 160px; height: 100%; border: 2px solid ${i===1 ? 'var(--primary)' : 'transparent'}">
              <img src="https://i.pravatar.cc/150?img=${i+10}" class="w-100 h-100 object-fit-cover">
              <span class="user-name">${i===1 ? 'You' : 'Student ' + i}</span>
            </div>
          \`).join('')}
        </div>

        <div class="control-bar shadow">
          <button class="control-btn" id="micBtn" onclick="this.classList.toggle('active'); this.innerHTML = this.classList.contains('active') ? '<i class=\\'bi bi-mic-fill\\'></i>' : '<i class=\\'bi bi-mic-mute-fill\\'></i>'"><i class="bi bi-mic-mute-fill"></i></button>
          <button class="control-btn" id="camBtn" onclick="this.classList.toggle('active'); this.innerHTML = this.classList.contains('active') ? '<i class=\\'bi bi-camera-video-fill\\'></i>' : '<i class=\\'bi bi-camera-video-off-fill\\'></i>'"><i class="bi bi-camera-video-off-fill"></i></button>
          <button class="control-btn"><i class="bi bi-display"></i></button>
          <button class="control-btn"><i class="bi bi-emoji-smile"></i></button>
          <button class="control-btn"><i class="bi bi-hand-index-thumb"></i></button>
          <button class="control-btn danger px-4" style="border-radius: 24px; width: auto;" onclick="navigate(state.user.role)"><i class="bi bi-telephone-x-fill me-2"></i> Leave Component</button>
        </div>
      </div>

      <div class="chat-panel h-100">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="fw-bold mb-0">Class Chat</h6>
          <i class="bi bi-chat-dots text-muted"></i>
        </div>
        <div class="chat-messages">
          <div class="text-center mb-3">
            <span class="badge bg-light text-muted fw-normal">Class started at 10:00 AM</span>
          </div>
          <div class="message">
            <div class="d-flex align-items-end gap-2">
              <img src="https://i.pravatar.cc/150?img=12" class="rounded-circle" width="28" height="28">
              <div>
                <div class="message-sender">Prof. Davis <span class="badge bg-primary ms-1" style="font-size: 0.6rem;">Host</span></div>
                <div class="message-bubble">Welcome everyone! Please mute your mics until we start the Q&A session.</div>
              </div>
            </div>
          </div>
          <div class="message">
             <div class="d-flex align-items-end gap-2">
              <img src="https://i.pravatar.cc/150?img=4" class="rounded-circle" width="28" height="28">
              <div>
                <div class="message-sender">Alex Chen</div>
                <div class="message-bubble">Loud and clear!</div>
              </div>
            </div>
          </div>
          <div class="message self">
            <div class="message-sender">You</div>
            <div class="message-bubble">Can we get the slides for today's lecture?</div>
          </div>
        </div>
        <div class="chat-input bg-light border-0 m-2 rounded">
          <div class="input-group">
            <button class="btn btn-link text-muted"><i class="bi bi-paperclip"></i></button>
            <input type="text" class="form-control border-0 bg-transparent shadow-none" placeholder="Type a message...">
            <button class="btn btn-link text-primary"><i class="bi bi-send-fill"></i></button>
          </div>
        </div>
      </div>
    </div>
  `, 'Live Classroom');
}

function renderCoursePage() {
  return Layout(`
    <div class="row g-4 mb-4">
      <div class="col-12">
        <div class="card border-0">
          <div class="card-body p-4 p-md-5">
            <div class="row align-items-center">
              <div class="col-md-8">
                <span class="badge badge-primary mb-3">Engineering Dept.</span>
                <h2 class="fw-bold mb-3">UI/UX Design Masterclass</h2>
                <p class="text-muted lead mb-4">Learn the fundamentals of interface design, user research, and prototyping in modern tools.</p>
                <div class="d-flex gap-4 mb-4">
                  <div class="d-flex align-items-center gap-2"><i class="bi bi-clock text-primary"></i> 12 Weeks</div>
                  <div class="d-flex align-items-center gap-2"><i class="bi bi-person-video3 text-primary"></i> Advanced</div>
                  <div class="d-flex align-items-center gap-2"><i class="bi bi-star-fill text-warning"></i> 4.8 (120 reviews)</div>
                </div>
                <div class="progress mb-2" style="height: 10px;">
                  <div class="progress-bar bg-success" style="width: 35%"></div>
                </div>
                <div class="d-flex justify-content-between small text-muted">
                  <span>35% Completed</span>
                  <span>14/40 Lessons</span>
                </div>
              </div>
              <div class="col-md-4 text-center mt-4 mt-md-0 d-none d-md-block">
                <img src="https://illustrations.popsy.co/amber/student-going-to-school.svg" alt="Illustration" width="250">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-8">
        <h4 class="fw-bold mb-4">Course Content</h4>
        <div class="accordion border-0 rounded-4 overflow-hidden shadow-sm" id="courseAccordion">
          <!-- Module 1 -->
          <div class="accordion-item border-0 border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button fw-bold py-4 bg-white" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                Module 1: Introduction to User Experience
              </button>
            </h2>
            <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#courseAccordion">
              <div class="accordion-body p-0">
                <ul class="list-group list-group-flush">
                  <li class="list-group-item p-4 d-flex justify-content-between align-items-center bg-light">
                    <div class="d-flex align-items-center gap-3">
                      <i class="bi bi-check-circle-fill text-success fs-5"></i>
                      <div>
                        <h6 class="mb-0 fw-semibold">1.1 What is UX Design?</h6>
                        <small class="text-muted"><i class="bi bi-play-circle me-1"></i> 15 mins</small>
                      </div>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary">Review</button>
                  </li>
                  <li class="list-group-item p-4 d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3">
                      <i class="bi bi-play-circle text-primary fs-5"></i>
                      <div>
                        <h6 class="mb-0 fw-semibold">1.2 Design Thinking Process</h6>
                        <small class="text-muted"><i class="bi bi-play-circle me-1"></i> 22 mins</small>
                      </div>
                    </div>
                    <button class="btn btn-sm btn-primary">Continue</button>
                  </li>
                  <li class="list-group-item p-4 d-flex justify-content-between align-items-center opacity-75">
                    <div class="d-flex align-items-center gap-3">
                      <i class="bi bi-lock text-muted fs-5"></i>
                      <div>
                        <h6 class="mb-0 fw-semibold">1.3 User Psychology</h6>
                        <small class="text-muted"><i class="bi bi-file-earmark-text me-1"></i> Reading</small>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <!-- Module 2 -->
          <div class="accordion-item border-0">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed fw-bold py-4 bg-white" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                Module 2: Visual Design Foundations
              </button>
            </h2>
            <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#courseAccordion">
              <div class="accordion-body text-center p-5 text-muted">
                Complete Module 1 to unlock.
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-4">
        <h4 class="fw-bold mb-4">Resources</h4>
        <div class="card border-0 mb-4">
          <div class="card-body p-4">
            <ul class="list-group list-group-flush">
              <li class="list-group-item px-0 pt-0 border-0 mb-3 d-flex align-items-center gap-3">
                <div class="bg-danger bg-opacity-10 text-danger p-3 rounded"><i class="bi bi-file-earmark-pdf-fill fs-4"></i></div>
                <div class="flex-grow-1">
                  <h6 class="mb-0 fw-semibold">Course Syllabus</h6>
                  <small class="text-muted">1.2 MB</small>
                </div>
                <button class="btn btn-light rounded-circle"><i class="bi bi-download"></i></button>
              </li>
              <li class="list-group-item px-0 border-0 mb-3 d-flex align-items-center gap-3">
                <div class="bg-primary bg-opacity-10 text-primary p-3 rounded"><i class="bi bi-file-earmark-zip-fill fs-4"></i></div>
                <div class="flex-grow-1">
                  <h6 class="mb-0 fw-semibold">Design Assets Lab</h6>
                  <small class="text-muted">15 MB</small>
                </div>
                <button class="btn btn-light rounded-circle"><i class="bi bi-download"></i></button>
              </li>
            </ul>
          </div>
        </div>

        <div class="card border-0 bg-primary bg-opacity-10 text-primary">
          <div class="card-body p-4 text-center">
            <h5 class="fw-bold mb-3">Need Help?</h5>
            <p class="small mb-4">Contact your instructor or teaching assistant during office hours.</p>
            <button class="btn btn-primary w-100">Message Instructor</button>
          </div>
        </div>
      </div>
    </div>
  `, 'Course Curriculum');
}

function renderAnalytics() {
  return Layout(`
    <div class="row g-4 mb-4">
      <div class="col-md-8">
        <div class="card border-0 h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-4">Student Engagement</h5>
            <div class="d-flex gap-2 mb-4">
              <span class="badge bg-primary">Weekly</span>
              <span class="badge bg-light text-dark">Monthly</span>
              <span class="badge bg-light text-dark">Yearly</span>
            </div>
            <!-- Dummy Chart via CSS for pure Vanilla JS without Chart.js -->
            <div class="d-flex align-items-end justify-content-between h-50 mt-5 pt-5 pb-2 border-bottom" style="gap: 10px;">
              ${[40, 60, 45, 80, 65, 90, 75].map((h, i) => \`
                <div class="d-flex flex-column align-items-center w-100">
                  <div class="w-100 bg-primary rounded-top" style="height: ${h}px; transition: height 1s ease-out;" data-bs-toggle="tooltip" title="${h} Active Users"></div>
                  <div class="small text-muted mt-2">Day ${i+1}</div>
                </div>
              \`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-4">Top Courses</h5>
            <div class="d-flex align-items-center mb-4 gap-3">
              <div class="bg-primary rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px;">1</div>
              <div>
                <h6 class="mb-0 fw-semibold">Data Science 101</h6>
                <div class="text-muted small">1,245 Students</div>
              </div>
            </div>
            <div class="d-flex align-items-center mb-4 gap-3">
              <div class="bg-secondary rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px;">2</div>
              <div>
                <h6 class="mb-0 fw-semibold">Web Development</h6>
                <div class="text-muted small">980 Students</div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-3">
              <div class="bg-secondary rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px;">3</div>
              <div>
                <h6 class="mb-0 fw-semibold">Digital Marketing</h6>
                <div class="text-muted small">850 Students</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `, 'Analytics & Reports');
}

// App Initialization
function renderApp() {
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = routes[state.currentRoute]();
  
  // Re-initialize tooltips if needed
  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    });
  }

  // Sidebar Toggle Logic
  const sidebarToggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }
}

// Start
renderApp();
