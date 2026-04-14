# 🎓 UniTrack: Smart Student Management

UniTrack is a premium, full-stack student productivity platform designed for the next generation of learners. Built with a high-performance **Spring Boot** backend and a futuristic **React 19** frontend, it offers a seamless, zero-clutter experience for managing academic life.

---

## ✨ Features at a Glance

UniTrack consolidates every aspect of a student's journey into a single, intuitive dashboard:

- 🏗️ **Unified Dashboard**: Real-time aggregation of attendance, assignments, and academic performance.
- 📅 **Intelligent Scheduling**: Dynamic timetable management with subject-specific tracking.
- 📝 **Assignment Tracker**: Track deadlines with status indicators and high-fidelity empty states.
- 📊 **Marks & GPA**: Manage exam scores and calculate performance metrics.
- ⏰ **Attendance Monitor**: Stay on top of your presence with visual status indicators.
- 💸 **Expense Tracker**: Keep your finances in check with categorized personal expense logging.
- ✅ **To-Do List**: Task management with local persistence and deadline alerts.
- 🛡️ **Secure Auth**: Traditional JWT-based registration/login paired with **Google OAuth 2.0** integration.
- 📧 **Verification System**: Automated OTP-based email verification with professional, branded templates.

---

## 🎨 Design Philosophy: "Premium Monochrome SaaS"

UniTrack isn't just a tool; it's an experience. The application features a custom-built design system focused on:

- **Monochrome Aesthetic**: A professional, strict black-and-white palette that minimizes distraction and looks stunning in both light and dark modes.
- **Glassmorphism**: Subtle `backdrop-blur` effects and semi-transparent layers for a modern, futuristic UI.
- **Micro-Animations**: Fluid transitions powered by **Framer Motion** and **Lucide React**.
- **Visual Effects**: Interactive custom background elements including **LightRays** and **Particle** systems for a "Pro" feel.

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

- **Core**: [Spring Boot 4.0.3](https://spring.io/projects/spring-boot) (Java 17)
- **Security**: [Spring Security](https://spring.io/projects/spring-security) with **JWT**
- **Persistence**: Spring Data JPA + **PostgreSQL**
- **Documentation**: [SpringDocs / Swagger](https://springdoc.org/)
- **Social Auth**: Google Identity Services
- **Mailing**: Spring Boot Mail Starter

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **Java 17+**
- **PostgreSQL 14+**
- **Maven 3.9+**

### 1. Database Setup

Create a PostgreSQL database named `unitrack`:

```sql
CREATE DATABASE unitrack;
```

### 2. Backend Configuration

Update `backend/src/main/resources/application.properties` with your credentials:

```properties
spring.datasource.username=your_username
spring.datasource.password=your_password
jwt.secret=your_secure_random_base64_string
google.client-id=your_google_client_id
```

### 3. Execution

**Terminal 1 (Backend)**:

```bash
cd backend
mvn spring-boot:run
```

**Terminal 2 (Frontend)**:

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 📂 Repository Structure

```text
UniTrack/
├── frontend/             # React Client
│   ├── src/components/   # Reusable UI Elements (Sidebar, Header, Cards)
│   ├── src/pages/        # Feature Modules (Dashboard, Assignments, etc.)
│   └── src/services/     # API Integration Layer (Axios)
└── backend/              # Spring Boot REST API
    ├── src/.../controller/ # REST Endpoints
    ├── src/.../service/    # Business Logic
    ├── src/.../security/   # JWT & OAuth 2.0 Logic
    └── src/.../entity/     # JPA Records
```

---

## 📮 API Documentation

UniTrack features a built-in Swagger UI for exploring the REST API. Once the backend is running, visit:
`http://localhost:8081/swagger-ui.html`

---

## 📜 License & Copyright

Built for academic excellence.
&copy; 2026 UniTrack Project Team. All Rights Reserved.
