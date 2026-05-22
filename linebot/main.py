from fastapi import FastAPI, Request, HTTPException
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import os

app = FastAPI()

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET")

line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# --- 睿程生醫專屬 FAQ 資料庫 ---
# 將多行文字整理乾淨，並設定對應的觸發關鍵字
main_menu_text = (
    "歡迎造訪睿程生醫常見問題中心。\n\n"
    "請於對話框輸入「數字」以了解相對應之技術與業務規範：\n\n"
    "1 【品牌定位與核心技術】\n"
    "適用對象：投資機構、社會大眾、尋求客製化模型之患者\n\n"
    "2 【產品檢索與需求申請】\n"
    "適用對象：臨床醫師、醫療採購人員、欲申請平台權限之訪客\n\n"
    "3️ 【臨床協作與系統支援】\n"
    "適用對象：已授權之合作醫師、合約製造廠商、系統技術排除\n\n"
    "您亦可直接於此對話框輸入您的具體需求，系統將即時派發予專屬產品專員為您解答。"
)

faq_data = {
    # 觸發主選單的關鍵字（請確保與 LINE 官方帳號圖文選單設定的文字一模一樣）
    "常見 FAQ": main_menu_text,
    "常見FAQ": main_menu_text, # 多加一個沒有空格的版本防呆
    "0": main_menu_text, # 讓用戶輸入 0 也能回到主選單
    
    "申請平台帳密": [
        "您好！感謝您對睿程生醫 3D 醫療網站的興趣。\n\n請長按複製下方的表單格式，填寫完畢後直接回傳對話框。我們的專員收到後，將盡快為您審核並開通專屬帳號與密碼。",
        "申請人姓名：\n所屬醫療機構/企業全銜：\n職稱：\n聯繫電話：\n電子郵件："
    ],

    "1": (
        "【1 品牌定位與核心技術 FAQ】\n\n"
        "Q1: 睿程生醫的核心產品線與技術優勢為何？\n"
        "答：本公司核心技術源自骨科臨床第一線需求，專注於「高精度 3D 醫療影像重建」、「手術輔助導引器材（PSI）」、「生物拓樸結構優化」與「客製化骨固定系統」之研發，旨在協助臨床端提升手術成功率並優化患者預後。\n\n"
        "Q2: 非醫療背景之投資人，如何理解睿程生醫的技術壁壘？\n"
        "答：數位展示平台採用高直覺度的互動視覺介面，非醫學專業之訪客與投資人，亦可透過線上 3D 模型進行自由旋轉、微觀結構放大與術前術後三維對照，直觀評估複雜工程技術所轉化之臨床實質價值。\n\n"
        "Q3: 臨床患者是否可申請客製化個人 3D 解剖模型？\n"
        "答：可以。本公司提供「患者專屬 3D 解剖模型客製化服務」，依據醫療影像（CT/MRI）數據進行三維重建還原實體模型，用以協助醫病溝通與術後精準復健。\n\n"
        "回覆 0 返回 FAQ 主選單。"
    ),

    "2": (
        "【2 產品檢索與需求申請 FAQ】\n\n"
        "Q1: 瀏覽產品目錄或進行詢價前，是否必須完成帳號註冊？\n"
        "答：不需要。為提供便捷的評估流程，外部訪客免登入即可直接存取「公開產品型錄」，檢視各項產品套組、適應症說明及法規遵循文件（如 TFDA/FDA 認證進度），並可隨時線上提交臨床需求。\n\n"
        "Q2: 臨床醫療人員如何快速定位符合特定適應症的醫療器材？\n"
        "答：系統內建「情境導向式智能檢索引擎」，用戶可依據【解剖部位（如：下顎骨）】、【臨床用途】或【特定適應症】等複合式標籤進行精準篩選，系統將自動推播相符的醫材模組。\n\n"
        "Q3: 提交「臨床需求申請表」後，後續的審核與開通流程需要多少時間？\n"
        "答：送出表單後，基於資訊安全與個資合規，系統此時不會自動建立內部帳號。您的需求將即時匯入後台管理系統，由管理員進行資格人工審核與初步估價。團隊將於收到申請後第一時間（通常為 1 至 3 個工作日內）由專人主動與您聯繫對接。\n\n"
        "回覆 0 返回 FAQ 主選單。"
    ),

    "3": (
        "【3 臨床協作與系統支援 FAQ】\n\n"
        "Q1: 合作醫師如何在系統上審閱設計並提供修改意見？\n"
        "答：醫療團隊獲授權登入後即可進入「受控專案工作台（Project Workspace）」，於雲端進行流暢的 3D 模型審閱。系統支援「3D 空間座標標註（Spatial Annotation）」與文字回饋，所有臨床反饋皆採版本化管理，確保研發團隊精準遵循醫囑進行迭代。\n\n"
        "Q2: 外包製造廠商登入系統後之權限範圍與安全機制為何？\n"
        "答：為確保核心智慧財產權與數據安全，廠商帳號預設配置為「受限唯讀權限（Read-Only Access）」。廠商僅能查閱獲授權專案之 3D 結構、製造版本與工程參數。系統實施嚴格資訊隔離，廠商無法接觸成本結構，亦無編輯或覆寫檔案之權限。\n\n"
        "Q3: 平台目前支援哪些 3D 模型格式與後台處理機制？\n"
        "答：平台核心支援 STL 格式之 3D 模型。上傳後系統會自動解析模型體積、產生專屬雜湊值（Hash 值）以確保檔案唯一性，並強制綁定特定生醫材料參數（如：醫療級鈦合金），以利精準估算製造成本。\n\n"
        "Q4: 網頁 3D 模型讀取不流暢或系統連線異常該如何處理？\n"
        "答：平台採用免安裝的 WebGL (Three.js) 技術開發，直接透過標準網頁瀏覽器（建議使用 Chrome 或 Edge 最新版本）即可進行操作。若遇到讀取延遲，請優先確認網路連線穩定度並確認瀏覽器已開啟「硬體加速」。如異常持續，請在此發送您的平台帳號與問題截圖，我們將安排技術人員為您排除。\n\n"
        "回覆 0 返回 FAQ 主選單。"
    )
}

@app.post("/callback")
async def callback(request: Request):
    signature = request.headers.get("X-Line-Signature")
    body = await request.body()
    body_str = body.decode("utf-8")

    try:
        handler.handle(body_str, signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature. 請確認你的金鑰是否正確。")

    return "OK"

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_text = event.message.text.strip()
    
    # 判斷用戶輸入的文字是否有在我們的資料庫中
    if user_text in faq_data:
        reply_data = faq_data[user_text]
        
        # 判斷是單則訊息還是多則訊息
        if isinstance(reply_data, list):
            # 如果是列表，就把裡面的每一段文字都變成一則 LINE 訊息
            messages_to_send = [TextSendMessage(text=text) for text in reply_data]
        else:
            # 如果只是一般文字，就包裝成單則訊息
            messages_to_send = [TextSendMessage(text=reply_data)]
            
    else:
        # 如果沒有，就觸發預設的人工客服通知
        messages_to_send = [
            TextSendMessage(text="已收到您的訊息！系統已通知內部人員。\n\n目前客服較為忙碌，請稍候，我們將盡快由專員親自為您解答與服務。")
        ]
    
    # 將準備好的訊息陣列，一次回傳給用戶
    line_bot_api.reply_message(
        event.reply_token,
        messages_to_send
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)