# Mail Routing System - Project Requirements

This document outlines all dependencies used in the project, including both frontend and backend technologies.

## Backend Requirements (Python)

These Python packages are used in the FastAPI backend:

```
fastapi>=0.115.0
passlib[bcrypt]>=1.7.4
psycopg2-binary>=2.9.9
pydantic>=2.11.0
python-jose[cryptography]>=3.3.0
python-multipart>=0.0.9
sqlalchemy>=2.0.0
uvicorn>=0.24.0
email-validator>=2.1.0
```

## Frontend Requirements (Node.js)

These JavaScript/TypeScript packages are managed through package.json:

### Core Dependencies
- react
- react-dom
- @tanstack/react-query
- wouter (routing)
- @hookform/resolvers
- react-hook-form
- zod (validation)

### UI Libraries
- @radix-ui/react-* (various UI components)
- lucide-react (icons)
- clsx (class conditionals)
- tailwind-merge
- tailwindcss
- tailwindcss-animate
- framer-motion (animations)
- class-variance-authority

### Data Visualization
- recharts (for analytics charts)
- leaflet (for maps and route visualization)
- date-fns (date formatting)

### Database & Backend Communication
- drizzle-orm
- drizzle-zod
- @neondatabase/serverless

### Server
- express
- express-session
- passport
- passport-local
- bcrypt
- connect-pg-simple
- memorystore

### Build Tools
- typescript
- vite
- esbuild
- @types/* (TypeScript type definitions)

## Database

- PostgreSQL (relational database)
- Environment variables needed:
  - DATABASE_URL
  - PGPORT
  - PGPASSWORD
  - PGHOST
  - PGDATABASE
  - PGUSER

## Installation Instructions

### Frontend
```bash
# Install Node.js dependencies
npm install
```

### Backend
```bash
# Install Python dependencies
pip install -r python_backend/requirements.txt
```

### Running the Project
- Frontend/Node.js Backend: `npm run dev`
- Python Backend: `./start_python_backend.sh`