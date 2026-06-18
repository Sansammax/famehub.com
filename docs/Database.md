# FameHub LMS Database Architecture

FameHub uses **Sequelize** as the Object-Relational Mapper (ORM). It connects to a primary **PostgreSQL** instance in production and automatically falls back to local **SQLite** (`database.sqlite`) in development.

## Database Schema Model Relationships

The following entity relationship details describe our database layout:

```
+---------------+        +----------------+        +---------------+
|  Department   |        |      User      |        |    Course     |
+---------------+        +----------------+        +---------------+
| id (UUID)     |        | id (UUID)      |        | id (UUID)     |
| name          |<-------| email          |        | title         |
| description   |        | password       |        | description   |
+---------------+        | role           |        | code          |
                         | firstName      |        | maxStudents   |
                         | lastName       |        | coverImage    |
                         | phone          |        | isArchived    |
                         | profileImage   |        | departmentId  |
                         | isActive       |        | teacherId     |
                         | lastLogin      |        +---------------+
                         | departmentId   |
                         +----------------+
```

### Associations
1. **Department & User**: One-to-many relationship. A department has many users.
2. **Department & Course**: One-to-many relationship. A department has many courses.
3. **User (Teacher) & Course**: One-to-many relationship. A teacher instructs multiple courses.
4. **User (Student) & Course**: Many-to-many relationship through `CourseEnrollment` junction table (`studentId`, `courseId`).
5. **Course & Assignment**: One-to-many relationship. A course contains multiple assignments.
6. **Assignment & Submission**: One-to-many relationship. An assignment has many student submissions (`studentId`, `assignmentId`).
7. **Course & Quiz**: One-to-many relationship. A course contains multiple quizzes.
8. **Quiz & Question**: One-to-many relationship. A quiz contains multiple quiz questions.
9. **Quiz & Attempt**: One-to-many relationship. A quiz has many student attempts (`studentId`, `quizId`).
10. **User & RefreshToken**: One-to-many relationship. A user can have multiple refresh tokens for security session rotation (`userId`).
11. **Meeting & Attendance**: One-to-many relationship. A meeting session tracks multiple participant logs.

## Migration and Seeding
On server boot:
- The database is synchronized automatically using `sequelize.sync({ alter: true })`.
- If no users exist, it seeds default admin, teacher, student, departments, courses, assignments, quizzes, and questions. Refer to [Admin Guide](file:///e:/famehub.com/docs/AdminGuide.md) for credentials.
