import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

# Internal imports
from database import engine, Base
import models
import schemas
from routers import auth, parcels, routes, notifications, issues, users, stats

# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mail Routing API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(parcels.router, prefix="/api", tags=["Parcels"])
app.include_router(routes.router, prefix="/api", tags=["Routes"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(issues.router, prefix="/api", tags=["Issues"])
app.include_router(stats.router, prefix="/api", tags=["Stats"])

# Serve the static frontend files
app.mount("/assets", StaticFiles(directory="../client/dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the frontend application for any non-API routes"""
    return FileResponse("../client/dist/index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)