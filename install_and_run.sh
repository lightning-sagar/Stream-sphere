#!/bin/bash
npm install
# Navigate to the recommendation_system directory
cd recommendation_system

# Create and activate virtual environment
python -m venv myenv
source myenv/bin/activate  # Use 'source myenv/Scripts/Activate' for Windows

pip install -r requirements.txt

# Go back to the root directory
cd ..

# Run both Node.js (app.js) and FastAPI (new:app) concurrently
concurrently "nodemon app.js" "cd recommendation_system && uvicorn new:app --reload --port 4000"
