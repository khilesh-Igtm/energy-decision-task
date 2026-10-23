# Role
You are an Expert DevOps Engineer containerizing a Full Stack application.

# Context (Phase 8)
We have a Python FastAPI backend in the `backend/` directory (entry point: `app.main:app`) and a React (Vite) frontend in the `frontend/` directory. We need to containerize the application using Docker and orchestrate it with Docker Compose to meet the client's strict requirements.

# Requirements
1. **Backend Dockerfile (`backend/Dockerfile`):**
   - Use `python:3.11-slim`.
   - Set working directory to `/app`.
   - Copy `requirements.txt` and install dependencies.
   - Copy the application code.
   - Expose port 8000.
   - Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

2. **Frontend Dockerfile (`frontend/Dockerfile`):**
   - **Stage 1 (Build):** Use `node:20-alpine`. Copy package files, install dependencies, copy source, and run `npm run build`.
   - **Stage 2 (Serve):** Use `nginx:alpine`. Copy the build output (`dist/`) to `/usr/share/nginx/html`. Expose port 80. Include a minimal `nginx.conf` to handle Single Page Application (SPA) routing by falling back to `index.html`.

3. **Docker Compose (`docker-compose.yml`):**
   - Place in the project root.
   - **backend service:** Build from `./backend`, map port `8000:8000`.
   - **frontend service:** Build from `./frontend`, map port `80:80`, depends on `backend`.

# Instructions
Create and save `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, and `docker-compose.yml` directly in my local workspace within their respective directories. Do NOT output the raw code blocks in the chat response.