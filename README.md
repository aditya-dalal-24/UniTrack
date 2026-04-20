<p align="center">
  <img src="frontend/public/unitrack-logo.png" alt="UniTrack Logo" width="120" height="120" />
</p>

<h1 align="center">UniTrack</h1>

<p align="center">
  <strong>Smart Student Management Platform</strong>
</p>

<p align="center">
  <em>The ultimate companion for managing your academic life - attendance, tasks, expenses, grades, and more - all in one beautifully crafted interface.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.4.3-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=flat-square&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Google-OAuth2-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Framer_Motion-Animations-FF0050?style=flat-square&logo=framer&logoColor=white" />
  <img src="https://img.shields.io/badge/License-All_Rights_Reserved-red?style=flat-square" />
</p>

---

## Overview

UniTrack is a premium, full-stack student productivity platform built with a high-performance **Spring Boot** backend and a futuristic **React 19** frontend. It consolidates every aspect of a student's academic journey into a single, intuitive, zero-clutter experience.

> Built for the next generation of students.

---

## Features

### Core Modules

| Module                 | Description                                                                                                     |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Dashboard**          | Real-time aggregation of attendance, tasks, academic performance, and expense analytics with interactive charts |
| **Unified Tasks**      | Manage assignments and to-dos in a single tabbed interface with status tracking and deadline alerts             |
| **Attendance Monitor** | Subject-wise attendance tracking with visual status indicators, percentage calculations, and history graphs     |
| **Marks & GPA**        | Exam score management with automatic SGPA/CGPA computation and semester-wise breakdowns                         |
| **Fees & Financials**  | Track total and pending fees with payment status badges, receipt uploads, and due date alerts                   |
| **Expense Tracker**    | Categorized personal expense logging with monthly history charts and daily bill tracking                        |
| **Smart Scheduling**   | Dynamic timetable management with day-wise views and subject-specific time slots                                |
| **User Profile**       | Academic profiles with unique generated avatars, roll number tracking, and course/semester persistence          |

### Platform Features

| Feature                | Description                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------- |
| **Admin System**       | Hierarchical role management (Student → Admin → Super Admin) with protected escalation |
| **Google OAuth**       | One-click sign-in via Google Identity Services                                         |
| **Email Verification** | OTP-based email verification with SendGrid integration                                 |
| **Dark Mode**          | Full dark/light theme support with smooth transitions across all components            |
| **Responsive Design**  | Mobile-first layout that adapts seamlessly from phones to ultrawide monitors           |
| **Dynamic Sidebar**    | Fully rearrangeable navigation modules with drag-and-drop and local persistence        |
| **Micro-Animations**   | Fluid transitions and hover effects powered by Framer Motion                           |

---

## Role Management

UniTrack implements a robust, multi-tiered role system:

| Role          | Capabilities                                                 | Access Level      |
| :------------ | :----------------------------------------------------------- | :---------------- |
| `STUDENT`     | Manage personal attendance, marks, fees, tasks, and expenses | Student Dashboard |
| `ADMIN`       | View user statistics, monitor accounts, deactivate users     | Admin Panel       |
| `SUPER_ADMIN` | Full control — role assignment, promotions, user deletion    | Both Panels       |

> **Safety Layer**: The primary Super Admin (configured via environment variable) is protected from demotion or deactivation by other admins.

---

## Tech Stack

### Frontend

| Technology                                                     | Purpose                         |
| :------------------------------------------------------------- | :------------------------------ |
| [React 19](https://reactjs.org/) + [Vite](https://vitejs.dev/) | UI framework & build tool       |
| [Tailwind CSS](https://tailwindcss.com/)                       | Utility-first styling           |
| [Framer Motion](https://www.framer.com/motion/)                | Animations & transitions        |
| [Recharts](https://recharts.org/)                              | Theme-aware data visualizations |
| [Lucide React](https://lucide.dev/)                            | Icon system                     |
| React Context API                                              | Global state management         |

### Backend

| Technology                                                                                           | Purpose                        |
| :--------------------------------------------------------------------------------------------------- | :----------------------------- |
| [Spring Boot 3.4.3](https://spring.io/projects/spring-boot) (Java 17)                                | REST API framework             |
| [Spring Security](https://spring.io/projects/spring-security) + JWT                                  | Authentication & RBAC          |
| [Spring Data JPA](https://spring.io/projects/spring-data-jpa) + PostgreSQL                           | ORM & persistence              |
| [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html) | Health checks & monitoring     |
| [SpringDoc OpenAPI](https://springdoc.org/)                                                          | API documentation (Swagger UI) |
| [SendGrid](https://sendgrid.com/)                                                                    | Transactional email delivery   |
| [Docker](https://www.docker.com/)                                                                    | Containerized deployment       |

---

## Design Philosophy

UniTrack follows a **"Premium Monochrome SaaS"** design language:

- **Monochrome Palette** — Professional black-and-white base for maximum focus
- **Glassmorphism** — Subtle `backdrop-blur` effects and semi-transparent layers
- **Micro-Animations** — Fluid transitions on every interaction via Framer Motion
- **Responsive Charts** — Axes, tooltips, and colors adapt dynamically to your theme
- **Interactive Backgrounds** — LightRay and Particle systems for a high-end "Pro" feel
- **Generated Avatars** — Unique, deterministic user avatars based on user ID

---

## Quick Start

### Docker (Recommended)

The fastest way to get UniTrack running. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Clone the repository
git clone https://github.com/your-username/UniTrack.git
cd UniTrack

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials (JWT secret, Google Client ID, etc.)

# 3. Launch the full stack
docker compose up --build
```

| Service      | URL                                                                            |
| :----------- | :----------------------------------------------------------------------------- |
| Frontend     | [http://localhost:3000](http://localhost:3000)                                 |
| Backend API  | [http://localhost:8081/api](http://localhost:8081/api)                         |
| Swagger Docs | [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html) |
| PostgreSQL   | `localhost:5432`                                                               |

---

### Manual Setup

If you prefer running services individually:

#### 1 — Database

```sql
CREATE DATABASE unitrack;
```

#### 2 — Backend

Update `backend/src/main/resources/application.properties` with your database credentials:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/unitrack
spring.datasource.username=your_username
spring.datasource.password=your_password
jwt.secret=your_secure_base64_key
google.client-id=your_google_client_id
```

```bash
cd backend && mvn spring-boot:run
```

#### 3 — Frontend

```bash
cd frontend && npm install && npm run dev
```

---

## Environment Variables

| Variable                | Required | Description                                      |
| :---------------------- | :------- | :----------------------------------------------- |
| `SPRING_DATASOURCE_URL` | Yes      | PostgreSQL JDBC URL                              |
| `DB_USERNAME`           | Yes      | Database username                                |
| `DB_PASSWORD`           | Yes      | Database password                                |
| `JWT_SECRET`            | Yes      | Base64-encoded secret key for JWT signing        |
| `GOOGLE_CLIENT_ID`      | Yes      | Google OAuth2 client ID                          |
| `SENDGRID_API_KEY`      | No       | SendGrid API key for email verification          |
| `SUPER_ADMIN_EMAIL`     | No       | Email of the protected super admin account       |
| `CORS_ALLOWED_ORIGINS`  | No       | Comma-separated list of allowed frontend origins |

---

## Project Structure

```
UniTrack/
├── docker-compose.yml          # Full-stack orchestration
├── .env.example                # Environment variable template
│
├── frontend/                   # React 19 + Vite Client
│   ├── public/                 # Static assets & logo
│   ├── src/
│   │   ├── components/         # Reusable UI (Sidebar, Topbar, StatsCard, UserAvatar)
│   │   ├── contexts/           # Auth context & theme provider
│   │   ├── constants/          # Enums & configuration
│   │   ├── layout/             # Layout wrappers (SidebarLayout, AdminLayout)
│   │   ├── pages/              # Student modules
│   │   │   ├── Dashboard.jsx       # Main dashboard with charts
│   │   │   ├── Tasks.jsx           # Unified assignments & to-dos
│   │   │   ├── Schedule.jsx        # Timetable management
│   │   │   ├── Marks.jsx           # GPA & exam scores
│   │   │   ├── Fees.jsx            # Fee tracking & payments
│   │   │   ├── Expenses.jsx        # Personal expense tracker
│   │   │   ├── Profile.jsx         # User profile editor
│   │   │   └── admin/              # Admin panel pages
│   │   └── services/           # API integration layer
│   └── package.json
│
└── backend/                    # Spring Boot 3.4 REST API
    ├── Dockerfile              # Production-optimized container
    ├── pom.xml                 # Maven dependencies
    └── src/main/java/.../
        ├── controller/         # 13 REST controllers
        ├── service/            # Business logic layer
        ├── entity/             # 19 JPA entities
        ├── repository/         # Data access layer
        ├── dto/                # Request/Response DTOs
        ├── security/           # JWT filter, UserDetailsService
        └── exception/          # Global exception handling
```

---

## API Overview

UniTrack exposes a comprehensive REST API secured with JWT Bearer tokens:

| Endpoint Group | Base Path         | Methods                                      |
| :------------- | :---------------- | :------------------------------------------- |
| Authentication | `/api/auth`       | Login, Register, Google OAuth, OTP Verify    |
| Dashboard      | `/api/dashboard`  | Aggregated student overview                  |
| Tasks          | `/api/tasks`      | CRUD for unified tasks (assignments + todos) |
| Attendance     | `/api/attendance` | Mark, update, and query attendance records   |
| Marks          | `/api/marks`      | CRUD for exam scores with GPA calculation    |
| Fees           | `/api/fees`       | Fee records and payment status tracking      |
| Expenses       | `/api/expenses`   | Expense logging with category management     |
| Timetable      | `/api/timetable`  | Slot-based schedule management               |
| Subjects       | `/api/subjects`   | Subject registry with semester filtering     |
| Profile        | `/api/profile`    | User profile read/update                     |
| Admin          | `/api/admin`      | User management and platform statistics      |

> Full interactive API documentation available at `/swagger-ui.html` when the backend is running.

---

## Deployment

UniTrack is deployed using a split architecture:

| Component | Platform             | URL                             |
| :-------- | :------------------- | :------------------------------ |
| Frontend  | Render (Static Site) | `https://your-app.onrender.com` |
| Backend   | Render (Web Service) | `https://your-api.onrender.com` |
| Database  | Render (PostgreSQL)  | Internal connection             |

### Performance Optimizations

The backend is optimized for Render's free tier with the following tuning:

- **JVM Flags**: `TieredStopAtLevel=1`, `UseParallelGC`, `-noverify` for fast cold starts
- **Lazy Initialization**: Spring beans and JPA repositories load on-demand
- **Connection Pooling**: HikariCP tuned with minimal idle connections
- **Frontend Pre-warming**: Aggressive health-check pings during page load
- **External Pinger**: Cron-job.org keeps the backend alive every 10 minutes

---

## License & Copyright

Built for academic excellence.

© 2026 UniTrack Project Team. All Rights Reserved.
