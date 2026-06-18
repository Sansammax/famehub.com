# FameHub Administrator Guide

This guide highlights admin credentials, seed data, and instructions for managing users, departments, and course enrollments.

## Seeded Default Accounts
Upon the first database synchronization, the platform seeds three default accounts for testing:

| Role | Username (Email) | Password |
|---|---|---|
| **Admin** | `admin@famehub.edu` | `password` |
| **Teacher** | `teacher@famehub.edu` | `password` |
| **Student** | `student@famehub.edu` | `password` |

## Administrative Controls

### 1. User Management
The administrator can manage platform users by navigating to the Users tab or hitting `/api/users`:
- **Create User**: Add new emails, set initial passwords, assign roles (`admin`, `teacher`, `student`), and map them to department IDs.
- **Activate/Deactivate**: Disable login credentials instantly by setting `isActive` to false.
- **Password Reset**: Admins can force reset user passwords.

### 2. Department Management
- Create departments (e.g. `Computer Science`, `Engineering`) to group teachers and students together.
- Update department metadata and delete obsolete ones.

### 3. Course Management & Enrollment
- **Create Course**: Build course containers and assign the primary instructor (Teacher).
- **Assign Students**: Search active students and enroll them into specific course IDs.
- **Archive Course**: Set `isArchived` flag to hide inactive courses from active dashboards without deleting database record history.
