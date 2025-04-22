#!/bin/bash

# Navigate to the Python backend directory
cd python_backend

# Start the FastAPI application with Uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload