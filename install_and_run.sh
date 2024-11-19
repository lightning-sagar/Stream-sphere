#!/bin/bash
npm install
rm -rf myenv

# Navigate to the recommendation_system directory
cd recommendation_system

# Deactivate the current environment if active
deactivate
# Remove the current environment folder (myenv)
rm -rf myenv
# Create a new environment
python -m venv myenv
# Activate the environment again
source myenv/bin/activate   # Linux/macOS
# or
.\myenv\Scripts\Activate     # Windows
# Install the dependencies
pip install -r requirements.txt


pip install -r requirements.txt

# Go back to the root directory
cd ..

# Run both Node.js (app.js) and FastAPI (new:app) concurrently
concurrently "nodemon app.js" "cd recommendation_system && uvicorn new:app --reload --port 4000"
