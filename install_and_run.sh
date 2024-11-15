#!/bin/bash
npm install
# Navigate to the recommendation_system directory
cd recommendation_system

# Install Python packages
pip install uvicorn numpy pandas python

# Go back to the root directory
cd ..

# Run nodemon and uvicorn concurrently
concurrently "nodemon app.js" "cd recommendation_system && uvicorn new:app --reload --port 4000
"
