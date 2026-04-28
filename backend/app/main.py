from fastapi import FastAPI
from app.routers import auth, materials, projects, feedbacks, versions, costs

app = FastAPI(title="Sleek MedTech API", version="0.1.0")

app.include_router(auth.router)
app.include_router(materials.router)
app.include_router(projects.router)
app.include_router(feedbacks.router)
app.include_router(versions.router)
app.include_router(costs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
