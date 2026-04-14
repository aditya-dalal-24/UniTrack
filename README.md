# 🎓 UniTrack: Smart Student Management

UniTrack is a premium, full-stack student productivity platform designed for the next generation of learners. Built with a high-performance **Spring Boot** backend and a futuristic **React 19** frontend, it offers a seamless, zero-clutter experience for managing academic life.

---

## ✨ Features at a Glance

UniTrack consolidates every aspect of a student's journey into a single, intuitive dashboard:

### 💼 Core Management Suites
- **🛡️ Hierarchical Admin System**: Comprehensive user management console with tiered permissions (Student, Admin, Super Admin).
- **💸 Fees & Financials**: Real-time tracking of total and pending fees with high-fidelity status badges and payment history summary.
- **📝 Assignments & Deadlines**: End-to-end task tracking for college assignments with status indicators and deadline alerts.
- **👤 User Profiles**: Personalized academic profiles featuring **Unique Avatars**, **Roll Number tracking**, and **Course/Semester** persistence.

### 📅 Academic Productivity
- **🏗️ Unified Dashboard**: Real-time aggregation of attendance, assignments, and academic performance.
- **📅 Intelligent Scheduling**: Dynamic timetable management with subject-specific tracking.
- **📊 Marks & GPA**: Manage exam scores and calculate performance metrics with real-time SGPA/CGPA updates.
- **⏰ Attendance Monitor**: Stay on top of your presence with visual status indicators, subject analysis graphs, and integrated Holiday/Exam calendars.

### 🛠️ Personal Tools
- **⚡ Dynamic Sidebar**: Fully rearrangeable navigation modules with local persistence and draggable layouts.
- **💸 Expense Tracker**: Keep your finances in check with categorized personal expense logging and pie chart breakdowns.
- **✅ To-Do List**: Task management with local persistence and deadline alerts.

---

## 👥 Role Management System

UniTrack features a robust, multi-tiered role system to ensure platform security and administrative flexibility:

| Role | Capabilities | Access |
| :--- | :--- | :--- |
| **STUDENT** | Manage personal attendance, marks, fees, and assignments. | Student Dashboard |
| **ADMIN** | View user statistics, monitor active/inactive users, and deactivate accounts. | Admin Panel |
| **SUPER_ADMIN** | Full administrative control, including role assignment and promoting other users to Admin/Super Admin. | Both Panels |

> [!TIP]
> **Administrative Safety**: The primary Super Admin (configured in `application.properties`) is protected by a safety layer that prevents demotion or deactivation by other admins, ensuring the platform remains controllable.

---

## 🎨 Design Philosophy: "Premium Monochrome SaaS"

UniTrack is built with a custom-built design system focused on a high-fidelity user experience:

- **Monochrome Aesthetic**: A professional black-and-white palette for maximum focus and a stunning dark mode experience.
- **Glassmorphism**: Subtle `backdrop-blur` effects and semi-transparent layers for a modern, futuristic UI.
- **Micro-Animations**: Fluid transitions powered by **Framer Motion** and **Lucide React**.
- **Responsive Charts**: Theme-aware data visualizations using **Recharts** (Axes and tooltips adapt dynamically to your theme).
- **Advanced Visuals**: Interactive background elements including **LightRays** and **Particle** systems for a high-end "Pro" feel.

---

## 🛠️ Tech Stack

### 💻 Frontend
- **Framework**: [React 19](https://reactjs.org/) (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **State Management**: React Hooks & Context API

### ⚙️ Backend
- **Core**: [Spring Boot 3.4.x](https://spring.io/projects/spring-boot) (Java 17)
- **Security**: [Spring Security](https://spring.io/projects/spring-security) with **JWT** & RBAC
- **Persistence**: Spring Data JPA + **PostgreSQL**
- **Documentation**: [SpringDocs / Swagger](https://springdoc.org/)
- **Social Auth**: Google Identity Services
- **Mailing**: Spring Boot Mail Starter (SMTP)

---

## 🚀 Getting Started

### 1. Database Setup
Create a PostgreSQL database named `unitrack`:
```sql
CREATE DATABASE unitrack;
```

### 2. Backend Configuration
Update `backend/src/main/resources/application.properties`:
```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/unitrack
spring.datasource.username=your_username
spring.datasource.password=your_password

# Authentication
jwt.secret=your_secure_random_base64_string
google.client-id=your_google_client_id

# Platform Roles
app.super-admin-email=dalal.aditya.2456@gmail.com
```

### 3. Execution
**Terminal 1 (Backend)**:
```bash
cd backend && mvn spring-boot:run
```
**Terminal 2 (Frontend)**:
```bash
cd frontend && npm install && npm run dev
```

---

## 📂 Repository Structure

```text
UniTrack/
├── frontend/             # React Client
│   ├── src/components/   # Reusable UI (Sidebar, AdminSidebar, UserAvatar)
│   ├── src/layout/       # Layout wrappers (AdminLayout, SidebarLayout)
│   ├── src/pages/        # Student Modules (Dashboard, Fees, Assignments)
│   ├── src/pages/admin/  # Admin Modules (AdminDashboard, AdminUsers)
│   └── src/services/     # API Integration Layer
└── backend/              # Spring Boot REST API
    ├── src/.../controller/ # REST Endpoints (Auth, Admin, Fees, Assignments)
    ├── src/.../service/    # Business Logic & Validation
    └── src/.../entity/     # JPA Records (User, FeeRecord, Assignment)
```

---

## 📜 License & Copyright
Built for academic excellence.
&copy; 2026 UniTrack Project Team. All Rights Reserved.
