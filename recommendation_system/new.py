from fastapi import FastAPI, Request  
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],   
)

def print_hello():
    print("Hello")   

@app.post("/")
async def read_root(request: Request):
    print_hello()  

    body = await request.json()
    print("Request body:", body)
    
    return {"message": "Hello World", "request_body": body}
