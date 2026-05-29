import json
from typing import Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.product import Product, ProductStatus
from app.models.public_site_content import PublicSiteContent
from app.schemas.public_ai import PublicAiChatIn, PublicAiChatOut

router = APIRouter(prefix="/api/v1/public-ai", tags=["public-ai"])


PUBLIC_AI_INSTRUCTIONS = """
你是睿程生醫股份有限公司官網的 AI 助理，預設名稱是「小睿」。
你的角色是公司對外負責人與合作窗口，代表公司向訪客說明公開資訊、合作方式、產品訂購方向與內部系統申請流程。
若官網公開內容提供 AI 助理名稱與角色，請依該設定自稱；可以明確說自己是 AI 助理，但不要自稱 ChatGPT、OpenAI 或透露模型供應商細節。
回答時請自然使用第一人稱，例如「我是小睿，可以協助您了解...」。
請只根據提供的「官網公開內容」回答，不要猜測未提供的產品規格、價格、材料參數、醫療建議、法規結論或內部專案內容。
回答請使用繁體中文，語氣要像可靠、親切、專業的公司負責人：清楚、有禮貌、主動引導下一步，但不要過度推銷。
如果訪客詢問材料詳細參數、STL 模型版本、BOM 成本、報告、稽核紀錄、臨床判斷或內部資料，請說明這些不在公開官網揭露，需要透過 LINE Bot 或內部系統權限審核後查看。
如果訪客想訂購產品，請引導到 /order；如果想看展示，請引導到 /showcase；如果想加入團隊，請引導到 /join-us；如果想申請內部系統權限，請引導到 LINE Bot 或 #access。
不要編造不存在的頁面、電話、Email、價格或承諾。
如果問題超出官網公開內容，請坦白說明目前公開資訊不足，並建議透過 LINE Bot 留下需求。
"""


@router.post("/chat", response_model=PublicAiChatOut)
def chat_with_public_site_ai(body: PublicAiChatIn, db: Session = Depends(get_db)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key is not configured",
        )

    context = _build_public_context(db)
    prompt = (
        "官網公開內容如下：\n"
        f"{context}\n\n"
        "訪客問題：\n"
        f"{body.question.strip()}"
    )

    payload = {
        "model": settings.OPENAI_MODEL,
        "instructions": PUBLIC_AI_INSTRUCTIONS.strip(),
        "input": prompt,
        "max_output_tokens": 650,
    }

    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=24) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") or str(exc)
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {detail}") from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail=f"Unable to reach OpenAI API: {exc.reason}") from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="OpenAI API request timed out") from exc

    answer = _extract_response_text(response_data).strip()
    if not answer:
        raise HTTPException(status_code=502, detail="OpenAI API returned an empty answer")

    action_label, action_href = _infer_action(body.question, answer)
    return PublicAiChatOut(
        answer=answer,
        source="openai",
        action_label=action_label,
        action_href=action_href,
    )


def _build_public_context(db: Session) -> str:
    record = db.query(PublicSiteContent).filter(PublicSiteContent.slug == "default").first()
    content = record.content if record and isinstance(record.content, dict) else {}
    products = (
        db.query(Product)
        .filter(
            Product.status == ProductStatus.active,
            Product.is_public == True,
            Product.is_deleted == False,
        )
        .order_by(Product.product_id)
        .limit(20)
        .all()
    )

    landing = content.get("landing", {}) if isinstance(content.get("landing"), dict) else {}
    catalog = content.get("catalog", {}) if isinstance(content.get("catalog"), dict) else {}
    order = content.get("order", {}) if isinstance(content.get("order"), dict) else {}
    join = content.get("join", {}) if isinstance(content.get("join"), dict) else {}

    lines = [
        f"公司名稱：{content.get('brand', '睿程生醫股份有限公司')}",
        f"AI 助理名稱：{landing.get('aiAssistantName') or '小睿'}",
        f"AI 助理角色：{landing.get('aiAssistantRole') or '睿程生醫官網的 AI 助理與對外合作窗口'}",
        f"首頁主標題：{landing.get('heroShortTitle') or landing.get('heroTitle') or ''}",
        f"首頁說明：{landing.get('heroDisplaySubtitle') or landing.get('heroSubtitle') or ''}",
        f"核心敘述：{landing.get('statementText') or ''}",
        f"LINE Bot 區塊：{landing.get('lineBotTitle') or ''}。{landing.get('lineBotText') or ''}",
        f"展示頁：{landing.get('showcasePageTitle') or ''}。{landing.get('showcasePageIntro') or ''}",
        f"產品目錄：{catalog.get('pageTitle') or ''}。{catalog.get('intro') or ''}",
        f"訂購頁：{order.get('heroTitle') or ''}。{order.get('heroIntro') or ''}",
        f"加入我們：{join.get('heroTitle') or ''}。{join.get('heroSubtitle') or ''}",
        "公開網站與內部系統分工：公開官網提供公司介紹、展示、產品方向、訂購入口與 LINE Bot 申請入口；內部系統才提供模型版本、材料參數、BOM、報告、稽核與溯源資料。",
    ]

    for index, item in enumerate(_visible_items(content.get("featuredStories")), start=1):
        lines.append(
            f"首頁展示卡片 {index}：{item.get('title', '')}。{item.get('text', '')}。"
            f"重點：{'、'.join(item.get('points', []) if isinstance(item.get('points'), list) else [])}"
        )

    for index, model in enumerate(_visible_items(content.get("publicConceptModels")), start=1):
        lines.append(f"公開 3D 模型 {index}：{model.get('title', '')}。{model.get('description', '')}")

    for index, image in enumerate(_visible_items(content.get("publicImageGallery")), start=1):
        lines.append(f"公開圖片展示 {index}：{image.get('title', '')}。{image.get('text', '')}")

    for index, product in enumerate(products, start=1):
        lines.append(
            f"公開產品 {index}：{product.name}。類型：{product.product_type}。"
            f"說明：{product.description or ''}。"
            f"使用部位：{product.body_region or ''}。臨床用途：{product.clinical_use or ''}。"
            f"適應症：{product.indication or ''}。長者提示：{product.senior_note or ''}。"
            f"可訂購：{'是' if product.order_enabled else '否'}。"
        )

    return "\n".join(line for line in lines if line.strip())


def _visible_items(value):
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict) and item.get("hidden") is not True]


def _extract_response_text(response_data: dict) -> str:
    if response_data.get("output_text"):
        return str(response_data["output_text"])

    text_parts = []
    for item in response_data.get("output", []):
        for content in item.get("content", []):
            if "text" in content:
                text_parts.append(str(content["text"]))
    return "\n".join(text_parts)


def _infer_action(question: str, answer: str) -> Tuple[Optional[str], Optional[str]]:
    text = f"{question} {answer}".lower()
    if any(term in text for term in ["訂", "購", "order", "報價", "產品"]):
        return "前往訂購頁", "/order"
    if any(term in text for term in ["3d", "stl", "模型", "展示"]):
        return "前往展示頁", "/showcase"
    if any(term in text for term in ["加入", "實習", "人才", "履歷", "職缺"]):
        return "前往加入我們", "/join-us"
    if any(term in text for term in ["line", "帳號", "權限", "申請", "登入"]):
        return "查看申請方式", "#access"
    return None, None
