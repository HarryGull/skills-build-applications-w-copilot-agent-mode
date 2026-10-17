# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the React app thin and route-driven. Each section fetches from the shared API client, renders loading/empty/error states, and stays focused on UI concerns without business logic.
- Logic tier decision: Build the Express API around route handlers and small service functions so validation, data access, and response shaping stay explicit and testable.
- Data tier decision: Use Mongoose schemas as the source of truth for required fields, relationships, and seeded defaults, then rely on Mongo memory and seeded fixtures for contract validation.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`, validate that the IDs refer to real records, and calculate `points` and `occurredAt` server-side instead of trusting client input.
- Team management approach: Require a team `name`, allow `mascot` and `members`, and keep membership arrays as ObjectIds so related users and lists remain consistent.
- Leaderboard approach: Aggregate team activity points by summing each activity’s `points`, sort descending, then assign 1-based ranking in the returned list.
- Workout suggestions approach: Match the requested user by email, inspect recent activity or goal, and return the best-fit workout(s) with a clear `reason` summarizing why the recommendation matches the user’s pattern.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`  
  Failure means the Mongoose validation and seed contract are incomplete or inconsistent with the required schema rules.
- API command: `npm run test:api --prefix octofit-tracker/backend`  
  Failure means the Express routes and service logic do not meet the `/api/*` contract for validation, persistence, ranking, and suggestions.
- Frontend command: `npm test --prefix octofit-tracker/frontend`  
  Failure means the React views are still showing placeholder content, missing loading/error handling, or not calling the correct API endpoints.
- Backend build command: `npm run build --prefix octofit-tracker/backend`  
  Failure means the TypeScript backend has compile errors or invalid types that prevent the API from building cleanly.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`  
  Failure means the React/Vite app has compile or type issues that block the user interface from building.

Current verified status: the data, API, and frontend suites are failing in their respective contract tests, so the implementation work should start at the data layer, then logic, then presentation in that order.
