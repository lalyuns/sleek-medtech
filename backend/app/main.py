from fastapi import FastAPI
from app.middleware.audit import AuditMiddleware
from app.routers import auth, materials, projects, feedbacks, versions, costs, audit, upload

app = FastAPI(title="Sleek MedTech API", version="0.1.0")

app.add_middleware(AuditMiddleware)

app.include_router(auth.router)
app.include_router(materials.router)
app.include_router(projects.router)
app.include_router(feedbacks.router)
app.include_router(versions.router)
app.include_router(costs.router)
app.include_router(audit.router)
app.include_router(upload.router)


@app.get("/health")
def health():
    return {"status": "ok"}
