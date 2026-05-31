from fastapi import FastAPI
from app.middleware.audit import AuditMiddleware
from app.routers import (
    audit,
    auth,
    costs,
    feedbacks,
    join_us_applications,
    materials,
    products,
    projects,
    public_ai,
    public_site_content,
    reports,
    upload,
    users,
    versions,
    workspace,
)

app = FastAPI(title="睿程生醫 API", version="0.1.0")

app.add_middleware(AuditMiddleware)

app.include_router(auth.router)
app.include_router(materials.router)
app.include_router(projects.router)
app.include_router(workspace.router)
app.include_router(feedbacks.router)
app.include_router(versions.router)
app.include_router(costs.router)
app.include_router(audit.router)
app.include_router(upload.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(public_site_content.router)
app.include_router(public_ai.router)
app.include_router(join_us_applications.router)


@app.get("/health")
def health():
    return {"status": "ok"}
