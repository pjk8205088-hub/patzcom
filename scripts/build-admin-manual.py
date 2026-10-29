from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether, HRFlowable, Image as RLImage)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'PATZCOM_관리자_운영_매뉴얼.pdf'
SCREEN_DIR = ROOT / 'tmp' / 'pdfs' / 'admin-manual' / 'screens'
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBold', r'C:\Windows\Fonts\malgunbd.ttf'))

INK = HexColor('#172033'); BLUE = HexColor('#3665f3'); PALE = HexColor('#eef3ff')
MUTED = HexColor('#5d687a'); LINE = HexColor('#d9dfeb'); GREEN = HexColor('#087e4c')
AMBER = HexColor('#a65c00'); RED = HexColor('#bd2020'); BG = HexColor('#f7f9fd')

styles = getSampleStyleSheet()
def st(name, **kw):
    base = styles['Normal']
    defaults = dict(fontName='Malgun', fontSize=9.2, leading=15, textColor=INK, spaceAfter=6)
    defaults.update(kw)
    return ParagraphStyle(name, parent=base, **defaults)
TITLE = st('Title', fontName='MalgunBold', fontSize=28, leading=38, alignment=TA_CENTER, spaceAfter=12)
SUBTITLE = st('Subtitle', fontSize=12, leading=19, alignment=TA_CENTER, textColor=MUTED, spaceAfter=14)
H1 = st('H1', fontName='MalgunBold', fontSize=19, leading=27, spaceBefore=8, spaceAfter=10)
H2 = st('H2', fontName='MalgunBold', fontSize=13.5, leading=20, textColor=INK, spaceBefore=9, spaceAfter=6)
H3 = st('H3', fontName='MalgunBold', fontSize=10.5, leading=16, textColor=BLUE, spaceBefore=6, spaceAfter=4)
BODY = st('Body')
SMALL = st('Small', fontSize=8, leading=12, textColor=MUTED)
NOTE = st('Note', fontSize=8.7, leading=14, textColor=INK, backColor=PALE, borderColor=HexColor('#bfd0ff'), borderWidth=.5, borderPadding=8, spaceBefore=5, spaceAfter=8)
WARN = st('Warn', fontSize=8.7, leading=14, textColor=INK, backColor=HexColor('#fff4dc'), borderColor=HexColor('#f0c778'), borderWidth=.5, borderPadding=8, spaceBefore=5, spaceAfter=8)
RISK = st('Risk', fontSize=8.7, leading=14, textColor=INK, backColor=HexColor('#fdeaea'), borderColor=HexColor('#e6a0a0'), borderWidth=.5, borderPadding=8, spaceBefore=5, spaceAfter=8)
CAP = st('Cap', fontName='MalgunBold', fontSize=8.2, leading=12, textColor=MUTED, spaceAfter=3)

def P(s, style=BODY): return Paragraph(s, style)
def bullets(items):
    return [P('• ' + x, BODY) for x in items]
def table(rows, widths=None, header=True):
    data = [[P(str(c), SMALL if not (header and i == 0) else CAP) for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT')
    ts = [('GRID',(0,0),(-1,-1),.35,LINE), ('VALIGN',(0,0),(-1,-1),'TOP'),
          ('LEFTPADDING',(0,0),(-1,-1),7), ('RIGHTPADDING',(0,0),(-1,-1),7),
          ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6)]
    if header: ts += [('BACKGROUND',(0,0),(-1,0),HexColor('#edf2ff'))]
    t.setStyle(TableStyle(ts)); return t
def section(title, intro=None):
    a=[P(title,H1)]
    if intro: a.append(P(intro,BODY))
    a.append(HRFlowable(width='100%', thickness=.7, color=LINE, spaceAfter=7))
    return a
def step(n, title, text):
    return KeepTogether([P(f'{n}. {title}', H3), P(text, BODY)])
def screen(filename, caption):
    path = SCREEN_DIR / filename
    return [P(caption, CAP), RLImage(str(path), width=170*mm, height=102*mm), Spacer(1, 3*mm)]
def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun',7.3); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 10*mm, 'PATZCOM Seller Hub 운영 매뉴얼')
    canvas.drawRightString(192*mm, 10*mm, f'{doc.page}')
    canvas.restoreState()

story=[]
# Cover
story += [Spacer(1,42*mm), P('PATZCOM 관리자 운영 매뉴얼', TITLE), P('Seller Hub 상품 · 주문 · 결제 · 환불 · 배송 · 고객문의 · 보고서', SUBTITLE), Spacer(1,7*mm)]
cover = Table([[P('<b>문서 목적</b><br/>관리자가 PATZCOM 판매 운영을 일관되게 처리할 수 있도록, 화면 메뉴와 버튼별 기능 및 업무 순서를 한글로 정리한 실무 매뉴얼입니다.', BODY),
                P('<b>적용 범위</b><br/>/admin.html Seller Hub, /admin-classic.html 연동 도구, 고객 주문 및 PayPal 결제 흐름', BODY)]], colWidths=[80*mm,80*mm])
cover.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.6,HexColor('#bfd0ff')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
story += [cover, Spacer(1,10*mm), P('운영 원칙', H2)] + bullets([
    '상품 가격, 재고, 이미지, 배송 정보는 저장 전 한 번 더 확인합니다.',
    'PayPal 환불은 실제 금액 반환 작업입니다. 주문 번호, 환불 금액, 사유를 반드시 확인한 후 실행합니다.',
    'Sandbox test results는 테스트용 가상 거래이며 실제 매출, 정산, 운영 주문에는 포함되지 않습니다.',
    'eBay 동기화 및 이미지 보강은 PATZCOM 카탈로그를 대상으로 합니다. eBay 원본 리스팅 자체를 변경하지 않습니다.'
]) + [Spacer(1,6*mm), P('버전 1.0 · 2026년 10월 · 내부 운영용', SMALL), PageBreak()]

story += section('목차 및 빠른 시작', '처음 사용하는 관리자는 아래 순서를 따르면 주문부터 배송 완료까지 처리할 수 있습니다.')
story += [table([
 ['순서','해야 할 일','주요 메뉴'],
 ['1','신규 주문과 미결제를 확인','Orders > All orders / Awaiting payment'],
 ['2','결제 완료 주문의 배송 준비','Orders > Awaiting shipment'],
 ['3','운송장 입력 후 발송 처리','주문 상세 > Tracking number > Save'],
 ['4','상품 가격·재고·이미지 업데이트','Listings > Active > Edit'],
 ['5','문의 답변 및 종료','Messages > Inbox'],
 ['6','결제/환불/정산 검토','Payments > Summary / Refunds'],
 ['7','CSV 백업 및 운영 점검','Reports > Downloads'],
], [15*mm,82*mm,63*mm]), Spacer(1,6*mm), P('하루 운영 기본 프로세스', H2),
P('<b>주문 확인</b> → <b>결제 상태 확인</b> → <b>재고 확보</b> → <b>포장</b> → <b>운송장 입력</b> → <b>발송 저장</b> → <b>고객 알림 확인</b> → <b>정산·환불 확인</b>', NOTE),
P('관리자 진입: <b>https://www.patzcom.com/admin.html</b> (관리자 계정으로 로그인 후 사용). 상단의 전체 검색창은 상품명, SKU, item number, 주문 참조번호, 구매자 정보를 빠르게 찾는 데 사용합니다.', BODY), PageBreak()]

story += section('1. 화면 구조와 공통 버튼', 'Seller Hub는 상단 탭, 좌측 하위 메뉴, 중앙 작업 화면, 우측 슬라이드 상세 패널로 구성됩니다.')
story += screen('01-dashboard.png', '그림 1. Overview 화면 예시 — 상단 탭, 통합 검색, 작업 카드와 최근 주문')
story += [table([
 ['영역','기능','사용 방법'],
 ['상단 검색','상품·주문·구매자·item number 통합 검색','검색어 입력 후 Search. 주문 참조번호/PATZCOM 주문번호는 Orders로, 그 외는 Listings로 이동합니다.'],
 ['Overview','오늘 처리할 일과 매출 요약','Ship orders, Awaiting payment, Buyer messages, Restock 항목을 클릭하면 해당 작업 화면으로 이동합니다.'],
 ['Orders','주문·결제·배송·환불 관리','행의 Add tracking 또는 Manage를 눌러 주문 상세를 엽니다.'],
 ['Listings','상품 등록·수정·재고 관리','Create listing으로 신규 등록, Edit로 기존 상품 수정, 다중 선택으로 일괄 변경합니다.'],
 ['Payments','결제, 수수료, 순정산, 환불 현황','Summary, All transactions, Monthly statement, Refunds를 구분해 확인합니다.'],
 ['Reports','CSV 내려받기 및 테스트 이메일','운영 백업 전 필요한 보고서를 다운로드합니다.'],
 ['Messages','문의 확인·답변·종료','열지 않은 문의부터 처리하고, 회신 후 Mark closed를 사용합니다.'],
], [28*mm,47*mm,85*mm]), P('<b>Refresh</b>는 서버에 저장된 최신 정보를 다시 읽습니다. 저장 오류나 다른 관리자와 동시에 수정한 경우 먼저 Refresh를 실행한 후 내용을 재확인하십시오.', NOTE), PageBreak()]

story += section('2. 상품 등록하기', '신규 상품은 Listings > Active의 Create listing 또는 상단 + Create listing에서 등록합니다.')
story += screen('02-listings.png', '그림 2. Listings > Active 화면 예시 — 검색, Create listing, 상품 목록과 수정 작업')
story += [step('1','등록 화면 열기','Create listing 버튼을 누릅니다. 오른쪽에서 상품 편집 패널이 열립니다.'),
step('2','사진 넣기','Photos 영역에서 이미지 URL을 입력해 Add URL을 누르거나, Upload를 눌러 PC의 JPG, PNG, WEBP 파일을 선택합니다. 한 상품은 최대 30장까지 등록할 수 있습니다. 첫 번째 사진이 대표 이미지입니다.'),
step('3','기본 정보 입력','Title(최대 300자), Category, Brand, Custom label(SKU), Condition을 입력합니다. SKU는 같은 상품을 식별하는 내부 관리 번호입니다.'),
step('4','가격·재고 입력','Price는 USD 기준, Quantity는 실제 판매 가능한 수량입니다. Quantity가 0이면 상품은 품절 상태가 됩니다.'),
step('5','공개 상태 확인','Listing is active on storefront 체크가 켜져 있고 수량이 1 이상이면 홈페이지에 노출됩니다.'),
step('6','저장','List it을 눌러 등록합니다. 저장 후 목록에서 생성 결과와 대표 이미지, 가격, 수량을 확인합니다.')]
story += [P('등록 전 점검', H2), table([
 ['항목','확인 기준'],
 ['대표 이미지','이미지가 보이고 상품과 일치하는지, 첫 번째 이미지가 대표로 적절한지'],
 ['상품명','차종·연식·부품명·세트 구성·좌/우 또는 전/후 정보가 정확한지'],
 ['SKU / item number','중복·오타가 없는지'],
 ['가격','USD 금액과 할인 표시 기준이 맞는지'],
 ['재고','판매 가능한 실제 수량인지'],
 ['설명','호환 차량, 구성품, 주의사항이 충분한지'],
], [43*mm,117*mm]), PageBreak()]

story += section('3. 기존 상품 수정과 이미지 관리')
story += screen('03-edit-listing.png', '그림 3. Edit listing 화면 예시 — Photos, Title, SKU, 가격·수량, Description, Save changes')
story += [P('Listings > Active에서 상품명을 검색하거나 Category 필터를 적용한 뒤, 해당 행의 <b>Edit</b> 버튼을 누릅니다. 가격과 수량은 목록의 숫자 입력 칸에서도 바로 수정할 수 있으며, 값 변경 후 자동 저장됩니다.', BODY),
table([
 ['버튼 또는 입력','기능','주의사항'],
 ['Edit','상품 편집 패널 열기','상품명, 카테고리, 브랜드, SKU, 상태, 가격, 수량, 설명, 사진을 수정합니다.'],
 ['Add URL','외부 이미지 주소 추가','HTTPS 이미지 주소만 사용하고, 실제 표시 여부를 저장 후 상품 페이지에서 확인합니다.'],
 ['Upload','PC 사진 업로드','JPG/PNG/WEBP 지원. 업로드 후 Save changes 또는 List it을 눌러야 상품에 반영됩니다.'],
 ['사진의 ×','해당 사진 제거','저장 전에는 되돌릴 수 없으므로 대표 이미지가 남았는지 확인합니다.'],
 ['Current price','가격 즉시 수정','USD 소수 둘째 자리까지 확인합니다.'],
 ['Available qty','재고 즉시 수정','0으로 바꾸면 상품은 Out of stock 상태가 됩니다.'],
 ['View on storefront','고객 화면 열기','수정 후 이미지·제목·가격·재고가 정상 표시되는지 점검합니다.'],
], [34*mm,48*mm,78*mm]),
P('이미지가 보이지 않을 때: ① URL을 브라우저 새 창에서 열어 실제 파일인지 확인 ② URL이 HTTPS인지 확인 ③ 파일 형식이 JPG/PNG/WEBP인지 확인 ④ 대표 이미지가 삭제되지 않았는지 확인 ⑤ Save changes 후 storefront를 새로고침합니다.', WARN), PageBreak()]

story += section('4. 상품 일괄 수정과 공개 관리')
story += [P('목록 첫 칸의 체크박스로 여러 상품을 선택하면 일괄 작업 막대가 나타납니다. 선택 후 반드시 대상 수를 확인하십시오.', BODY),
table([
 ['버튼','처리 내용','입력 예시'],
 ['Edit price','선택 상품 가격 일괄 변경','새 가격 120 또는 증감률 -5%, +10%'],
 ['Edit quantity','선택 상품 재고 일괄 변경','새 재고 20'],
 ['End listings','스토어에서 숨김','고객 화면에서 판매 중지. 상품 데이터는 유지됩니다.'],
 ['Relist','종료 상품 재공개','수량이 최소 1 이상이어야 정상 판매됩니다.'],
 ['Clear','선택 해제','저장 작업 없이 선택만 해제합니다.'],
 ['Download','현재 목록 CSV 다운로드','가격·재고·상태 백업용으로 사용합니다.'],
], [35*mm,65*mm,60*mm]),
P('권장 절차: Download로 변경 전 백업 → 검색/필터로 대상 좁히기 → 체크박스 선택 → 변경 값 입력 → 목록에서 결과 확인 → storefront에서 1개 이상 확인.', NOTE),
P('주의: End listings는 고객 화면 노출을 끄는 작업입니다. 실수로 전체 선택하지 않도록 Results 수와 선택 수를 비교하십시오.', RISK), PageBreak()]

story += section('5. 주문 처리 프로세스', '주문은 결제 상태와 배송 상태를 분리해 관리합니다. 결제 완료와 발송 완료는 같은 의미가 아닙니다.')
story += screen('04-orders.png', '그림 4. Orders 화면 예시 — 배송 대기 주문, 결제 상태, 배송 상태와 주문 상세')
story += [P('<b>표준 흐름:</b> 고객 결제 → Orders에 주문 생성 → Payment가 Paid인지 확인 → 재고·호환성 확인 → Packing → 운송장 입력 → Shipped 저장 → 배송 완료 확인 후 Delivered', NOTE),
table([
 ['주문 메뉴','대상','처리 기준'],
 ['All orders','모든 주문','주문번호, 날짜, 상품, 금액, 결제, 배송 상태를 전체 확인합니다.'],
 ['Awaiting shipment','결제 완료·미발송','당일 배송 우선 처리 대상입니다.'],
 ['Packing','포장 중','재고 확인 및 포장 완료 전 단계입니다.'],
 ['Paid and shipped','운송장 등록·발송','배송 진행 중 주문입니다.'],
 ['Delivered','배송 완료','배송 완료 기록 확인용입니다.'],
 ['On hold','보류','환불 완료 전, 주소/호환성/분쟁 확인이 필요한 주문입니다.'],
 ['Awaiting payment','미결제','결제가 캡처되기 전 주문으로, 출고하지 않습니다.'],
], [37*mm,42*mm,81*mm]),
P('주문 검색창에는 주문 참조번호, 상품명, PayPal ID, 구매자 정보 등을 입력할 수 있습니다. 새 주문이 들어온 뒤에는 Refresh로 최신 상태를 읽습니다.', BODY), PageBreak()]

story += section('6. 주문 상세와 배송 처리')
story += [step('1','주문 열기','Orders에서 Add tracking 또는 Manage를 눌러 주문 상세 패널을 엽니다.'),
step('2','결제 확인','Payment 항목이 Paid인지, 주문 금액과 상품·수량이 맞는지 확인합니다. Awaiting payment는 출고하지 않습니다.'),
step('3','구매자·배송지 확인','Buyer와 Ship to의 이름, 주소, 우편번호를 검토합니다. 주소가 비어 있으면 Sync buyer details로 결제 제공업체 정보를 다시 읽습니다.'),
step('4','포장 상태 변경','Shipping status에서 Packing을 선택하고 Save합니다. 작업자가 재고와 포장을 확인한 뒤 진행합니다.'),
step('5','운송장 입력','Tracking number에 운송장 번호를 정확히 입력합니다. Shipped를 선택해 Save하면 발송 안내 이메일 흐름이 실행됩니다.'),
step('6','배송 완료 처리','배송사 배송 완료를 확인한 후 Delivered로 저장합니다.')]
story += [P('주문 상세에서 사용할 수 있는 버튼', H2), table([
 ['버튼','기능'],
 ['Sync buyer details','결제 제공업체에서 구매자·배송지를 다시 불러옵니다.'],
 ['Resend confirmation','결제 완료 안내 메일을 다시 보냅니다.'],
 ['Resend shipping notice','운송장이 포함된 발송 안내 메일을 다시 보냅니다.'],
 ['Sync fees','PayPal 결제 수수료와 정산 정보를 다시 확인합니다.'],
 ['Save','배송 상태와 운송장 번호를 저장합니다.'],
], [48*mm,112*mm]), PageBreak()]

story += section('7. PayPal 결제, 정산, 환불', '현재 운영 결제 흐름의 기준은 PayPal입니다. Stripe 항목은 화면에 남아 있을 수 있으나 실제 사용하지 않는 경우 PayPal만 기준으로 관리합니다.')
story += screen('05-payments.png', '그림 5. Payments 화면 예시 — 매출·수수료·환불·순정산 카드와 거래 목록')
story += [table([
 ['Payments 하위 메뉴','확인 내용','활용'],
 ['Summary','총 매출, 수수료, 환불, 순정산','하루 마감과 전체 현황 확인'],
 ['All transactions','주문별 결제 제공업체·상태·총액·수수료·환불·순지급','특정 주문의 결제 이력 검색'],
 ['Monthly statement','월별 주문 수·총매출·수수료·환불·순정산','월 마감 및 회계 자료'],
 ['Refunds','환불 날짜·주문·금액·사유·상태','환불 처리 확인 및 고객 문의 대응'],
 ['Sandbox test results','가상 테스트 결제·환불 기록','실제 매출/정산/운영 주문과 분리해 테스트 결과만 검토'],
], [40*mm,65*mm,55*mm]),
P('<b>환불 절차</b>: 주문 상세 → Settlement 영역 → 환불 금액 입력 → Reason 입력 → Refund 클릭 → 최종 확인 → 상태가 Refunded 또는 Partially refunded인지 확인합니다. 결제 제공업체로 실제 반환 요청이 전송되므로 주문, 금액, 사유를 반드시 재확인하십시오.', RISK),
P('Refund pending이 보이면 같은 환불을 다시 누르지 말고 <b>Check refund</b>를 사용합니다. 시스템은 중복 환불을 막기 위해 환불 요청 상태를 보관합니다.', WARN),
P('전액 환불 시 주문은 refunded, 일부 환불 시 partially_refunded가 됩니다. 배송 전 전액 환불이면 배송 상태가 On hold로 전환될 수 있으므로 출고 여부를 다시 확인합니다.', BODY), PageBreak()]

story += section('8. 고객 문의 관리')
story += screen('07-messages.png', '그림 6. Messages 화면 예시 — 읽지 않은 문의, 문의 상세, Reply by email과 Mark closed')
story += [P('고객의 Contact form 문의는 Messages > Inbox에 저장됩니다. 읽지 않은 메시지는 Unread에 별도로 표시됩니다.', BODY),
table([
 ['단계','작업','버튼 또는 메뉴'],
 ['1','신규 문의 확인','Messages > Unread'],
 ['2','내용·차량 정보 확인','문의 행 클릭'],
 ['3','답변 발송','Reply by email'],
 ['4','처리 상태 종료','Mark closed'],
 ['5','목록 최신화','Refresh'],
], [18*mm,72*mm,70*mm]),
P('회신 전에는 차량 연식, 모델, 트림, 엔진, 상품 SKU 또는 item number를 다시 확인합니다. 호환성 확답이 어려운 경우에는 차량 식별 정보(VIN 등)를 요청하고, 확정 전 구매를 유도하지 않습니다.', NOTE),
P('고객이 환불을 요청한 경우 문의만 닫지 말고 Orders에서 결제·배송·환불 상태를 함께 확인해 처리 기록이 남도록 합니다.', BODY), PageBreak()]

story += section('9. 보고서와 데이터 백업')
story += screen('06-reports.png', '그림 7. Reports 화면 예시 — Active listings, Orders, Settlement, Buyer messages 다운로드')
story += [P('Reports > Downloads에서는 CSV 파일을 내려받을 수 있습니다. Excel에서 열 때 한글 깨짐을 줄이기 위해 파일은 UTF-8 BOM 형식으로 생성됩니다.', BODY),
table([
 ['보고서','포함 내용','권장 사용 시점'],
 ['Active listings','상품번호, 상품명, SKU, 브랜드, 카테고리, 가격, 재고, 상태, URL','대량 수정 전후, 주간 카탈로그 백업'],
 ['Orders','주문, 결제 상태, 배송 상태, 운송장, 구매자, 주소, 금액, 상품','매일 출고·월말 주문 대사'],
 ['Settlement','결제일, 제공업체, capture ID, 총액, 수수료, 환불, 순정산','월말 회계 및 PayPal 정산 대사'],
 ['Buyer messages','문의일, 고객명, 이메일, 차량, 상태, 메시지','고객지원 백업 및 미처리 문의 점검'],
], [35*mm,78*mm,47*mm]),
P('권장 보관: 매일 Orders CSV, 매주 Active listings CSV, 매월 Settlement CSV를 날짜가 포함된 폴더에 저장합니다. 보고서는 백업용이며, 환불·출고의 실제 처리 상태는 관리자 화면과 PayPal에서도 함께 확인합니다.', NOTE), PageBreak()]

story += section('10. eBay 카탈로그·이미지 동기화 도구', '고급 연동 작업은 More tools 또는 /admin-classic.html에서 실행합니다. 이 도구는 PATZCOM 카탈로그를 관리하며 eBay 원본 리스팅 자체를 변경하지 않습니다.')
story += [table([
 ['기능','버튼','처리 내용'],
 ['JSON 가져오기','Import pasted JSON','정규화된 상품 JSON을 붙여 넣어 카탈로그를 가져옵니다. 중복 item은 자동으로 정리됩니다.'],
 ['URL 가져오기','Import from URL','GitHub raw JSON 또는 허용된 원격 데이터 원본에서 카탈로그를 읽습니다.'],
 ['eBay 이미지 보강','Sync all eBay images','정확한 eBay item number를 먼저 사용하고, 신뢰 가능한 이미지가 없을 때만 제목 검색을 보조로 사용합니다. 기존 PATZCOM 이미지는 유지합니다.'],
 ['eBay API 상태','eBay API setup / OAuth','토큰, 권한, Browse API 준비 상태를 확인합니다.'],
 ['통합 상태','Integration status','eBay·PayPal·스토어 흐름의 연결 준비 상태를 확인합니다.'],
], [41*mm,48*mm,71*mm]),
P('가져오기 전에는 Active listings CSV를 먼저 다운로드해 백업합니다. 대량 가져오기 후에는 상품 수, 가격, 대표 이미지, 카테고리, 샘플 상품 상세 페이지를 확인합니다.', WARN),
P('이미지 동기화의 우선순위는 item number 일치입니다. 비슷한 제목만으로 이미지가 바뀌면 차종이나 부품이 달라질 수 있으므로, 대량 작업 후 반드시 표본 검수합니다.', RISK), PageBreak()]

story += section('11. 상태값 해설과 예외 처리')
story += [table([
 ['영역','상태','의미와 조치'],
 ['상품','Active','스토어에 판매 가능 상태. 가격과 재고를 확인합니다.'],
 ['상품','Out of stock','공개 상태지만 재고 0. 재입고 후 Quantity를 1 이상으로 저장합니다.'],
 ['상품','Ended','스토어 노출 종료. 다시 판매하려면 Relist 후 수량을 확인합니다.'],
 ['주문','Awaiting payment','결제 미완료. 출고 금지.'],
 ['주문','Awaiting shipment','결제 완료·미발송. 출고 우선 대상.'],
 ['주문','Packing','포장 작업 중.'],
 ['주문','Shipped','운송장 입력 후 발송 처리.'],
 ['주문','Delivered','배송 완료 확인.'],
 ['주문','On hold','환불, 주소, 호환성, 분쟁 등을 확인할 때 보류.'],
 ['결제','refund_pending','환불 요청 확인 중. Check refund로 상태 확인, 중복 Refund 금지.'],
 ['결제','refunded','전액 환불 완료. 출고하지 않았는지 확인.'],
], [29*mm,43*mm,88*mm]),
P('<b>저장 오류 또는 화면 불일치</b>: ① Refresh ② 다시 로그인 ③ 같은 상품/주문을 다른 창에서 수정 중인지 확인 ④ CSV 백업과 현재 화면 비교 ⑤ 계속되면 오류 메시지와 대상 상품번호/주문번호를 함께 기록해 관리자에게 전달합니다.', WARN), PageBreak()]

story += section('12. 일일·주간·월간 운영 체크리스트')
story += [P('일일 운영', H2)] + bullets([
    'Orders > Awaiting shipment에서 결제 완료 미발송 주문을 확인한다.',
    '각 주문의 상품·수량·배송지·운송장을 확인하고 Shipped로 저장한다.',
    'Messages > Unread의 신규 문의에 답변하고 처리 완료 건은 Mark closed 한다.',
    'Payments > Summary에서 당일 결제와 환불 금액을 확인한다.',
    'Orders CSV를 내려받아 날짜별 운영 폴더에 보관한다.'
]) + [P('주간 운영', H2)] + bullets([
    'Active listings CSV를 백업하고 품절·종료 상품을 검토한다.',
    '대표 이미지가 없거나 깨진 상품을 점검하고 수정한다.',
    '상위 판매/고가 상품의 가격, 재고, 호환성 설명을 표본 점검한다.',
    '미해결 고객 문의와 On hold 주문을 검토한다.'
]) + [P('월간 운영', H2)] + bullets([
    'Payments > Monthly statement와 PayPal 정산 내역을 대사한다.',
    'Settlement CSV를 회계 자료로 보관한다.',
    'Refunds 목록에서 환불 사유와 금액을 검토한다.',
    'eBay API 및 PayPal 연결 상태를 확인하고, 필요 시 토큰·권한 만료 여부를 점검한다.'
]) + [PageBreak()]

story += section('13. 운영 안전 수칙')
story += [P('다음 작업은 실제 고객 경험 또는 실제 금액에 영향을 줄 수 있으므로, 실행 전 두 번 확인합니다.', BODY),
table([
 ['작업','실행 전 확인','실행 후 확인'],
 ['가격 일괄 변경','선택 상품 수, 증감률 부호, USD 가격','상품 1~3개를 storefront에서 확인'],
 ['재고 일괄 변경','대상 상품과 실제 재고','Out of stock/Active 상태 확인'],
 ['End listings','선택 수와 판매 중지 대상','고객 화면에서 노출 종료 확인'],
 ['운송장 저장','주문 번호·배송사·운송장 오탈자','Shipped 상태와 안내 이메일 기록'],
 ['환불','주문·금액·사유·이미 환불 여부','Refunded/Partially refunded와 PayPal 결과'],
 ['카탈로그 가져오기','사전 CSV 백업·원본 형식·상품 수','대표 이미지/가격/카테고리 표본 검수'],
], [31*mm,64*mm,65*mm]),
P('관리자 비밀번호, PayPal API 비밀키, eBay API 비밀키, 고객 개인정보를 CSV나 캡처 화면에 공유하지 마십시오. 외부 업체에 전달하는 보고서에서는 주문번호·이메일·배송지·결제 ID를 마스킹합니다.', RISK),
P('테스트 거래는 반드시 PayPal Sandbox에서만 수행합니다. Sandbox test results는 가상 자금 기록이며, 실제 주문·매출·정산·배송 기록과 혼합하지 않습니다.', NOTE), PageBreak()]

story += section('14. 빠른 문제 해결표')
story += [table([
 ['문제','우선 점검','해결 방법'],
 ['상품 사진이 안 보임','대표 이미지 URL, HTTPS, 파일 형식','이미지 URL 또는 Upload로 재등록 후 Save changes, storefront 새로고침'],
 ['상품이 목록에 없음','Active/Out of stock/Ended 필터, 검색어','Available 및 Quantity를 확인하고 필요 시 Relist'],
 ['수량이 0인데 판매 노출','수량·공개 상태·캐시','Quantity 0 저장 후 Refresh, 고객 화면 확인'],
 ['주문이 결제됐는데 배송지 없음','Payment provider 정보','주문 상세의 Sync buyer details 실행'],
 ['환불이 대기 중','refund_pending 표시','Refund를 다시 누르지 말고 Check refund로 확인'],
 ['정산 금액이 비어 있음','결제 수수료 동기화','주문 상세의 Sync fees를 실행 후 Payments 새로고침'],
 ['고객 문의가 안 보임','Messages > Inbox/Unread, Refresh','상태 필터 확인 후 Refresh'],
 ['대량 변경이 이상함','선택 수·사전 백업','즉시 Download CSV와 storefront 표본 비교, 필요한 개별 상품 수정'],
], [42*mm,53*mm,65*mm]),
P('문제가 지속될 때 기록할 정보: 발생 시각, 관리자 URL, 상품 item number 또는 주문 reference, 화면 오류 문구, 실행한 버튼, 스크린샷. 이 정보가 있으면 재현과 복구가 빨라집니다.', NOTE),
Spacer(1,12*mm), P('문의 및 운영 연락처', H2), P('고객 문의 수신: partscombined@gmail.com<br/>스토어: https://www.patzcom.com/', BODY)]

doc=SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=17*mm, bottomMargin=17*mm, title='PATZCOM 관리자 운영 매뉴얼', author='PATZCOM')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
