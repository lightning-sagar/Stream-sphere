#!/bin/bash
npm install -g concurrently
npm install concurrently --save-dev

# Install npm dependencies
npm install

# Remove any existing virtual environment
rm -rf myenv

# Navigate to the recommendation_system directory
cd recommendation_system

# Create a new virtual environment
python -m venv myenv

# Activate the environment based on the OS
if [ "$(uname)" == "Darwin" ]; then
    # macOS
    source myenv/bin/activate
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    # Linux
    source myenv/bin/activate
elif [ "$(expr substr $(uname -s) 1 5)" == "MINGW" ]; then
    # Windows (using Git Bash)
    source myenv/Scripts/activate
fi

# Install Python dependencies
pip install -r requirements.txt

# Go back to the root directory
cd ..

# Run both Node.js (app.js) and FastAPI (new:app) concurrently
concurrently "nodemon app.js" "cd recommendation_system && uvicorn new:app --host "0.0.0.0" --port "8000" --reload"

