# DroneOps Backend

Express, PostgreSQL, Prisma, JWT, and Socket.IO backend for the DroneOps operational platform.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Update `DATABASE_URL`.
3. Run `npm install`.
4. Start PostgreSQL and create the `droneops` database.
5. Run `npm run prisma:migrate`.
6. Run `npm run seed`.
7. Run `npm run dev`.

The API defaults to `http://localhost:5000/api/v1`.

## Implemented Modules

- Auth: signup, login, refresh token, logout, email verification token foundation.
- RBAC: operations manager, pilot, maintenance coordinator, safety officer, compliance officer, administrator.
- Fleet: drone registration, updates, lifecycle status, assignment checks.
- Missions: planning, assignment, start, complete, replay endpoint.
- Telemetry: REST ingestion, latest GPS data, mission replay data, Socket.IO live updates, alert emission.
- Geofencing: polygon storage and telemetry breach detection.
- Incidents: logging, update workflow, critical severity grounding.
- Maintenance: maintenance record creation and updates.
- Documents: metadata storage plus local evidence upload at `/uploads`.
- Reports: report storage and operational summary.
- Audit: operational action history for compliance review.

## Useful Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/drones`
- `POST /api/v1/missions`
- `POST /api/v1/telemetry`
- `GET /api/v1/telemetry/live`
- `GET /api/v1/missions/:id/replay`
- `POST /api/v1/documents/upload`
- `GET /api/v1/audit`
