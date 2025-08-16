How to Run

I built this as a small task management API in Node.js with TypeScript and Express.
To run it locally, just install the dependencies with npm install, and then start the server in dev mode using npm run dev.

I also included tests — you can run them with npm test to check everything is working.
For consistency, I added linting and formatting scripts (npm run lint, npm run format).

Once it’s running, you can open the Swagger docs at http://localhost:3000/docs.
All task routes are under http://localhost:3000/api/tasks.


Assumptions I Made

I decided to keep things simple by storing tasks in memory using a Map. This means restarting the server clears everything, but it kept the project lightweight.

Each task is uniquely identified with a UUID. I added validation so that title, description, due date, and tags are required. Due dates have to be in the future, and I block circular dependencies (a task can’t depend on itself or form loops).

I also enforced some business rules, like not letting a task complete until its dependencies are done, and making state transitions strict so you can’t skip steps or archive high-priority tasks before they’re completed.

Trade-offs I Chose

I prioritized clarity over persistence, so instead of wiring up a database, I used in-memory storage.
I added Joi validation because I wanted strong runtime safety, even though it adds some overhead.
Error handling is structured with codes to make it easier for a client to consume, and I built a small DFS check for dependency cycles — simple and correct, but it wouldn’t scale infinitely.


If I Had More Time

The first thing I’d do is replace the in-memory store with a real database like Postgres or Mongo, and add migrations.
For performance, I’d cache dependency lookups in Redis.
I’d also add authentication, rate limiting, and proper health checks with logging and metrics.
And finally, I’d set up a proper CI/CD pipeline so every commit runs tests and linting automatically.


If This Needed to Scale

I’d move to database-backed storage, split responsibilities into smaller services, and scale horizontally behind a load balancer. For dependency checks, I’d use distributed caching and background jobs so heavy graph operations don’t block requests.


This project is intentionally lightweight, but the core design is robust. It enforces correct task states, validates inputs, and handles dependencies properly. With a bit more time, it could evolve into something production-ready.