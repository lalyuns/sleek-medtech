from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
INPUT_PDF = Path("D:/Downloads/B13701230-cetranscript-202509300915.pdf")
IMAGE_PAGE_PDF = ROOT / "merged_grade_image_page.pdf"
OUTPUT_PDF = ROOT / "B13701230-cetranscript-merged.pdf"


def register_font() -> str:
    candidates = [
        Path("C:/Windows/Fonts/msjh.ttc"),
        Path("C:/Windows/Fonts/mingliu.ttc"),
        Path("C:/Windows/Fonts/NotoSansCJK-Regular.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            pdfmetrics.registerFont(TTFont("CJK", str(candidate)))
            return "CJK"
    return "Helvetica"


def draw_grade_page(path: Path) -> None:
    font = register_font()
    c = canvas.Canvas(str(path), pagesize=landscape(A4))
    width, height = landscape(A4)

    margin_x = 15
    top = height - 22

    c.setFillColor(colors.black)
    c.setFont(font, 16)
    c.drawString(margin_x, top, "學期成績")

    c.setFont(font, 9.5)
    note = (
        "114學年度第1學期成績於114/12/22 3:00PM起，開放有填答教學意見調查之科目可上網查成績。"
        "115/1/7 3:00PM起，開放全校學生全部科目均可上網查詢學期成績。"
        "114/12/22之前所有成績皆不開放查詢。"
    )
    c.drawString(margin_x, top - 28, note)

    headers = [
        "學年期",
        "課號",
        "課程識別碼",
        "班次",
        "通識領域",
        "學分",
        "課程名稱",
        "成績",
        "備註",
        "探索學分申請",
    ]
    rows = [
        ["114-1", "MATH2601", "201 27100", "", "", "3", "統計導論", "A+", "", "⌄"],
        ["114-1", "MATH1103", "201 49590", "", "", "4", "線性代數一", "C", "", "⌄"],
        ["114-1", "MGT2001", "700 20111", "05", "", "3", "☆統計學一上", "A+", "", "⌄"],
        ["114-1", "BA2011", "701 32100", "04", "", "3", "☆管理決策會計", "A-", "", "⌄"],
        ["114-1", "BA2004", "701 34500", "", "", "3", "資料庫管理", "A", "", "⌄"],
        ["114-1", "IM2002", "705 13200", "", "", "3", "☆管理學", "A+", "", "⌄"],
        ["114-1", "IM2009", "705 22200", "", "", "3", "☆演算法", "", "通過", "⌄"],
    ]

    table_x = margin_x
    table_y_top = top - 68
    table_w = width - 2 * margin_x
    header_h = 32
    row_h = 49
    col_widths = [58, 92, 86, 47, 74, 45, 116, 44, 90, 100]

    c.setFillColor(colors.HexColor("#1749c7"))
    c.roundRect(table_x, table_y_top - header_h, table_w, header_h, 5, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont(font, 9.5)
    x = table_x
    for header, col_w in zip(headers, col_widths):
        c.drawCentredString(x + col_w / 2, table_y_top - 20, header)
        x += col_w

    c.setStrokeColor(colors.HexColor("#9d9d9d"))
    c.setLineWidth(0.5)
    y = table_y_top - header_h
    c.setFillColor(colors.white)
    c.rect(table_x, y - row_h * len(rows), table_w, row_h * len(rows), fill=1, stroke=0)
    c.setFillColor(colors.black)

    for idx, row in enumerate(rows):
        row_top = y - idx * row_h
        c.line(table_x, row_top, table_x + table_w, row_top)
        x = table_x
        c.setFont(font, 9.5)
        for value, col_w in zip(row, col_widths):
            if value in {"⌄"}:
                c.setFont("Helvetica", 13)
                c.drawCentredString(x + col_w / 2, row_top - 30, value)
                c.setFont(font, 9.5)
            elif value:
                c.drawCentredString(x + col_w / 2, row_top - 30, value)
            x += col_w
    c.line(table_x, y - row_h * len(rows), table_x + table_w, y - row_h * len(rows))
    c.line(table_x, table_y_top - header_h, table_x, y - row_h * len(rows))
    c.line(table_x + table_w, table_y_top - header_h, table_x + table_w, y - row_h * len(rows))

    footer_y = y - row_h * len(rows) - 22
    c.setFillColor(colors.HexColor("#eef1f7"))
    c.rect(table_x, footer_y, table_w, 24, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#394150"))
    c.setFont(font, 9.5)
    c.drawRightString(table_x + table_w - 145, footer_y + 8, "實得學分數為：")
    c.drawString(table_x + table_w - 130, footer_y + 8, "22")
    c.drawString(table_x + table_w - 90, footer_y + 8, "平均成績：")
    c.drawString(table_x + table_w - 38, footer_y + 8, "3.67")

    c.showPage()
    c.save()


def merge_pdfs() -> None:
    draw_grade_page(IMAGE_PAGE_PDF)

    writer = PdfWriter()
    for page in PdfReader(str(INPUT_PDF)).pages:
        writer.add_page(page)
    for page in PdfReader(str(IMAGE_PAGE_PDF)).pages:
        writer.add_page(page)

    with OUTPUT_PDF.open("wb") as f:
        writer.write(f)


if __name__ == "__main__":
    merge_pdfs()
    print(OUTPUT_PDF)
