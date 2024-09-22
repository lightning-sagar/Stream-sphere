from fastapi import FastAPI, Request , HTTPException
from fastapi.middleware.cors import CORSMiddleware
# import recommend from app.py
from app import recommend
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],   
)


@app.post("/")
async def read_root(request: Request):
    body = await request.json()
    print(body)  
    title = body.get('title')   
    print(title)   
    if not title:
        raise HTTPException(status_code=400, detail="Title is required in the request body")

    recommended_ids = recommend(title)
    print(recommended_ids)  # Debugging: Print the recommended IDs
    
    # Return the recommendations
    return {"message": "Recommendations fetched successfully", "recommended_ids": recommended_ids}