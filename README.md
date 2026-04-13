# UniTrack

UniTrack is a student productivity and management platform with a React frontend and a Spring Boot backend. The backend is the core of the system: it handles authentication, user-scoped academic data, dashboard aggregation, and persistence in PostgreSQL.

## Overview

UniTrack helps a student manage:

- authentication and account creation
- profile information
- attendance records
- assignments
- todos
- subjects
- timetable slots
- marks and GPA summaries
- fee tracking
- personal expense tracking
- a consolidated dashboard

## Tech Stack

### Frontend

- React 19
- Vite
- Axios
- React Router
- Tailwind CSS
- Recharts

### Backend

- Java 17
- Spring Boot 4
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Validation
- PostgreSQL
- JWT (`jjwt`)
- Lombok

## Repository Structure

```text
.
|-- backend/   Spring Boot REST API
`-- frontend/  React + Vite client
```

## Backend Architecture

The backend follows a conventional layered Spring Boot structure:

- `controller/`: REST endpoints under `/api/**`
- `service/`: business logic and user-scoped operations
- `repository/`: JPA repositories for persistence
- `entity/`: JPA domain models
- `dto/request/` and `dto/response/`: API contracts
- `security/`: JWT generation, validation, and request filtering
- `config/`: Spring Security and CORS configuration
- `exception/`: centralized exception handling

Most records are tied directly to a `User`, which keeps data isolated per authenticated account.

## Backend Feature Modules

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`

The backend uses JWT bearer tokens for stateless authentication. All routes except `/api/auth/**` require a valid token.

### Dashboard

- `GET /api/dashboard`

Returns aggregated summary data across attendance, fees, assignments, expenses, marks, and todos.

### Student Data Modules

- `GET/PUT /api/profile`
- `GET/POST/DELETE /api/attendance`
- `GET/POST/PUT/DELETE /api/assignments`
- `GET/POST/PUT/DELETE /api/todos`
- `GET/POST/DELETE /api/subjects`
- `GET/POST/PUT/DELETE /api/timetable`
- `GET/POST/PUT/DELETE /api/marks`
- `GET/POST/PUT/DELETE /api/fees`
- `GET/POST/DELETE /api/expenses`
- `GET/POST/DELETE /api/expenses/categories`

## Core Domain Model

Primary backend entities include:

- `User`
- `Profile`
- `AttendanceRecord`
- `Subject`
- `TimetableSlot`
- `Assignment`
- `Todo`
- `Marks`
- `Fees`
- `Expense`
- `ExpenseCategory`

Enums currently used in the backend include:

- `AttendanceStatus`
- `AssignmentStatus`
- `FeesStatus`

## API Base URL

Local frontend integration expects the backend at:

```text
http://localhost:8081/api
```

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.9+
- PostgreSQL 14+
- Node.js 20+
- npm 10+

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd UniTrack
```

### 2. Configure PostgreSQL

Create a PostgreSQL database for the backend. The current backend configuration targets a database named `unitrack`.

### 3. Configure backend properties

The repository currently stores backend settings in `backend/src/main/resources/application.properties`.

For local development, configure at least:

- `server.port`
- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `jwt.secret`
- `jwt.expiration`
- optional mail settings if email features are added later

Spring Boot also allows overriding these via environment variables, for example:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
JWT_SECRET
JWT_EXPIRATION
```

### 4. Start the backend

```bash
cd backend
mvn spring-boot:run
```

The backend runs on `http://localhost:8081` by default.

### 5. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## Frontend to Backend Integration

The frontend API client is defined in `frontend/src/services/api.js` and uses:

- `VITE_API_BASE_URL`, if provided
- otherwise `http://localhost:8081/api`

JWT tokens are stored in local storage and automatically attached as `Authorization: Bearer <token>` headers.

## Development Notes

### Database behavior

- JPA is configured with `spring.jpa.hibernate.ddl-auto=update`
- schema changes are managed implicitly by Hibernate
- no dedicated migration tool such as Flyway or Liquibase is currently configured

### CORS behavior

The backend currently allows requests from:

```text
http://localhost:5173
```

If the frontend runs on another origin, update `SecurityConfig` accordingly.

## Testing

Backend tests can be run with:

```bash
cd backend
mvn test
```

Current repository status:

- backend test execution succeeds
- test coverage is minimal and currently contains only a context load test

## Backend Analysis

### What is working well

- clear Spring Boot layering with controllers, services, repositories, DTOs, and entities
- consistent user-scoped data ownership across most modules
- JWT-based stateless authentication is already integrated end to end
- dashboard aggregation provides a useful summary layer over multiple modules
- frontend API service matches the backend route structure cleanly

### Current risks and gaps

- sensitive configuration is committed in `application.properties`; this should be moved out of source control for any shared or production environment
- exception handling is too coarse right now: generic `RuntimeException` responses become `500 Internal Server Error`, which can mask validation or business-rule failures
- database schema management relies on `ddl-auto=update`; this is convenient for development but not ideal for controlled production deployments
- automated testing is very limited
- CORS is currently hardcoded to a single local frontend origin
- helper batch scripts in `frontend/` reference older hardcoded paths and should not be treated as portable startup scripts without review

## Recommended Next Improvements

1. Move database, JWT, and mail secrets to environment-specific configuration.
2. Add Flyway or Liquibase migrations.
3. Replace generic runtime exceptions with structured domain and validation exceptions.
4. Add service and controller tests for each module.
5. Externalize CORS origins by environment.
6. Add OpenAPI/Swagger documentation for the REST API.

## Useful Commands

```bash
# backend
cd backend
mvn spring-boot:run
mvn test

# frontend
cd frontend
npm install
npm run dev
npm run build
```

## License

No license file is currently present in this repository.
