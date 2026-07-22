"""Generate the TownHub business outreach handout as a US Letter PDF."""

from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "townhub-business-outreach-handout.pdf"
APPLY_URL = "https://townhub.io/list-your-business"

NAVY = HexColor("#17357A")
BLUE = HexColor("#2563EB")
ORANGE = HexColor("#F97316")
INK = HexColor("#172033")
MUTED = HexColor("#536174")
LIGHT = HexColor("#F4F7FC")
WHITE = colors.white


def paragraph(canvas, text, x, y_top, width, style):
    item = Paragraph(text, style)
    _, height = item.wrap(width, 1000)
    item.drawOn(canvas, x, y_top - height)
    return y_top - height


def bullet_list(canvas, items, x, y_top, width, style):
    y = y_top
    for item in items:
        canvas.setFillColor(BLUE)
        canvas.circle(x + 3, y - 7, 2.2, fill=1, stroke=0)
        y = paragraph(canvas, item, x + 11, y, width - 11, style) - 5
    return y


def plan_card(canvas, x, y_top, width, name, price, yearly, description, features, recommended=False):
    height = 235
    canvas.setFillColor(WHITE)
    canvas.setStrokeColor(BLUE if recommended else HexColor("#D7DFEC"))
    canvas.setLineWidth(1.5 if recommended else 0.75)
    canvas.roundRect(x, y_top - height, width, height, 12, fill=1, stroke=1)
    if recommended:
        canvas.setFillColor(ORANGE)
        label = "RECOMMENDED"
        label_width = stringWidth(label, "Helvetica-Bold", 7) + 16
        canvas.roundRect(x + width - label_width - 12, y_top - 22, label_width, 15, 7.5, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.drawCentredString(x + width - label_width / 2 - 12, y_top - 17, label)
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawString(x + 15, y_top - 25, name)
    canvas.setFont("Helvetica-Bold", 24)
    canvas.drawString(x + 15, y_top - 56, price)
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(x + 65, y_top - 51, "/mo")
    canvas.drawString(x + 15, y_top - 70, f"or {yearly}/yr - 14-day trial")
    canvas.setStrokeColor(HexColor("#E3E9F2"))
    canvas.line(x + 15, y_top - 82, x + width - 15, y_top - 82)
    body = ParagraphStyle("plan-body", fontName="Helvetica", fontSize=8.3, leading=10.4, textColor=INK)
    canvas.setFillColor(INK)
    y = paragraph(canvas, description, x + 15, y_top - 92, width - 30, body) - 7
    feature_style = ParagraphStyle("plan-features", fontName="Helvetica", fontSize=8.4, leading=10.5, textColor=INK)
    bullet_list(canvas, features, x + 15, y, width - 30, feature_style)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = __import__("reportlab.pdfgen.canvas", fromlist=["Canvas"]).Canvas(str(OUTPUT), pagesize=letter)
    page_w, page_h = letter
    canvas.setTitle("TownHub - Business Outreach Handout")
    canvas.setAuthor("TownHub")
    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.4, leading=12.5, textColor=INK)
    small = ParagraphStyle("small", parent=body, fontSize=8.1, leading=10.3, textColor=MUTED)

    canvas.setFillColor(NAVY)
    canvas.rect(0, page_h - 1.66 * inch, page_w, 1.66 * inch, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(0.55 * inch, page_h - 0.52 * inch, "TownHub | Clay, West Virginia")
    canvas.setFont("Helvetica-Bold", 25)
    canvas.drawString(0.55 * inch, page_h - 0.93 * inch, "Put your business where Clay looks first.")
    canvas.setFillColor(HexColor("#DCE8FF"))
    canvas.setFont("Helvetica", 10.2)
    canvas.drawString(0.55 * inch, page_h - 1.22 * inch, "A simple local storefront for your hours, menu or services, customer requests, and optional ordering.")

    intro_y = page_h - 1.95 * inch
    canvas.setFillColor(INK)
    paragraph(canvas, "<b>More dependable than a social post.</b> TownHub gives independent Clay businesses one polished place customers can use to browse, call, request an appointment, or order when your business is ready.", 0.55 * inch, intro_y, 7.4 * inch, body)

    cards_y = page_h - 2.75 * inch
    plan_card(canvas, 0.55 * inch, cards_y, 3.57 * inch, "Business Showcase", "$20", "$200", "Your public page for hours, photos, products, menu, or services. Customers can browse, call, or request an appointment. Online ordering is not included.", ["Business page & catalog", "Appointment requests", "Mobile business schedule", "Email notifications", "Analytics"])
    plan_card(canvas, 4.38 * inch, cards_y, 3.57 * inch, "Business Ordering", "$40", "$400", "Everything in Business Showcase, plus pickup and delivery ordering. You manage orders from your TownHub dashboard.", ["Pickup and delivery ordering", "Order management dashboard", "SMS & email notifications", "Appointments & mobile schedule", "Analytics"], recommended=True)

    lower_y = page_h - 6.28 * inch
    canvas.setFillColor(LIGHT)
    canvas.roundRect(0.55 * inch, lower_y - 1.32 * inch, 4.65 * inch, 1.32 * inch, 12, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(0.76 * inch, lower_y - 0.25 * inch, "What TownHub does - and what stays yours")
    reassurance = [
        "You control your business, fulfillment, and delivery choices.",
        "Appointment requests are yours to review and confirm.",
        "No setup fee. No TownHub platform transaction fee.",
        "Stripe processing fees still apply to eligible card payments.",
    ]
    bullet_list(canvas, reassurance, 0.76 * inch, lower_y - 0.45 * inch, 4.2 * inch, small)

    qr_widget = qr.QrCodeWidget(APPLY_URL)
    bounds = qr_widget.getBounds()
    size = 1.21 * inch
    drawing = Drawing(size, size, transform=[size / (bounds[2] - bounds[0]), 0, 0, size / (bounds[3] - bounds[1]), 0, 0])
    drawing.add(qr_widget)
    renderPDF.draw(drawing, canvas, 5.54 * inch, lower_y - 1.22 * inch)
    canvas.setFillColor(NAVY)
    cta_x = 6.56 * inch
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(cta_x, lower_y - 0.32 * inch, "Start your trial")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.7)
    canvas.drawString(cta_x, lower_y - 0.49 * inch, "Scan to apply, or visit")
    canvas.setFillColor(BLUE)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(cta_x, lower_y - 0.64 * inch, "townhub.io/")
    canvas.drawString(cta_x, lower_y - 0.77 * inch, "list-your-business")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.3)
    canvas.drawString(cta_x, lower_y - 0.98 * inch, "Questions? Email Ronnie at")
    canvas.drawString(cta_x, lower_y - 1.10 * inch, "Ronnie@LaneTechWV.com")

    canvas.setStrokeColor(HexColor("#D7DFEC"))
    canvas.line(0.55 * inch, 0.55 * inch, page_w - 0.55 * inch, 0.55 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.4)
    canvas.drawString(0.55 * inch, 0.36 * inch, "TownHub is a local business discovery and commerce platform. It is not a POS replacement or a TownHub-managed delivery fleet.")
    canvas.save()


if __name__ == "__main__":
    build()
