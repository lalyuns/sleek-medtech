from fastapi import FastAPI
from app.middleware.audit import AuditMiddleware
from app.routers import audit, auth, costs, feedbacks, materials, products, projects, reports, upload, users, versions

app = FastAPI(title="睿程生醫 API", version="0.1.0")

app.add_middleware(AuditMiddleware)

app.include_router(auth.router)
app.include_router(materials.router)
app.include_router(projects.router)
app.include_router(feedbacks.router)
app.include_router(versions.router)
app.include_router(costs.router)
app.include_router(audit.router)
app.include_router(upload.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(products.router)


@app.get("/health")
def health():
    return {"status": "ok"}
