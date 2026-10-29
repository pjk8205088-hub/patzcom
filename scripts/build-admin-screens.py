from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT=Path(__file__).resolve().parents[1]/'tmp'/'pdfs'/'admin-manual'/'screens'
OUT.mkdir(parents=True,exist_ok=True)
FONT=r'C:\Windows\Fonts\malgun.ttf'; BOLD=r'C:\Windows\Fonts\malgunbd.ttf'
f=lambda n,b=False:ImageFont.truetype(BOLD if b else FONT,n)
BLUE='#3665f3'; INK='#172033'; MUTED='#5d687a'; LINE='#d9dfeb'; BG='#f7f9fd'; WHITE='#ffffff'; PALE='#eef3ff'; GREEN='#087e4c'; RED='#bd2020'
def base(title,active='Overview'):
    im=Image.new('RGB',(1500,900),BG);d=ImageDraw.Draw(im)
    d.rectangle((0,0,1500,82),fill=WHITE);d.line((0,81,1500,81),fill=LINE,width=2)
    d.text((34,23),'PATZCOM',font=f(32,True),fill=INK);d.text((190,29),'Seller Hub',font=f(18),fill=MUTED)
    d.rounded_rectangle((490,20,1120,62),18,outline=INK,width=2,fill=WHITE);d.text((520,31),'Search listings, orders, buyers or item numbers',font=f(15),fill=MUTED)
    d.rounded_rectangle((1160,20,1325,62),20,fill=BLUE);d.text((1190,31),'+ Create listing',font=f(15,True),fill=WHITE)
    d.rectangle((0,82,1500,132),fill=WHITE);tabs=['Overview','Orders','Listings','Marketing','Performance','Payments','Research','Reports','Messages'];x=30
    for t in tabs:
        col=INK if t==active else MUTED;d.text((x,98),t,font=f(15,True if t==active else False),fill=col);x+=120
    d.rounded_rectangle((28,160,260,850),18,fill=WHITE,outline=LINE,width=2)
    d.text((52,190),active.upper(),font=f(14,True),fill=MUTED)
    return im,d
def side(d,items,active):
    y=235
    for text in items:
        if text==active:d.rounded_rectangle((42,y-7,245,y+28),8,fill=PALE)
        d.text((56,y),text,font=f(15, text==active),fill=INK);y+=48
def card(d,box,title,value=None,sub=None,fill=WHITE):
    d.rounded_rectangle(box,14,fill=fill,outline=LINE,width=2);x,y=box[0]+22,box[1]+18;d.text((x,y),title,font=f(15,True),fill=MUTED)
    if value:d.text((x,box[1]+55),value,font=f(30,True),fill=INK)
    if sub:d.text((x,box[1]+102),sub,font=f(13),fill=MUTED)
def save(kind,active,sideitems,sideactive,content):
    im,d=base('',active);side(d,sideitems,sideactive);content(d);p=OUT/f'{kind}.png';im.save(p);return p
def table(d,x,y,text):
    d.rounded_rectangle((x,y,1470,y+80),8,fill=WHITE,outline=LINE,width=2)
    d.text((x+20,y+28),text,font=f(16),fill=INK)
def reportrow(d,x,y,a,b,c):
    d.line((x,y+55,1435,y+55),fill=LINE,width=1)
    d.text((x,y),a,font=f(16,True),fill=INK)
    d.text((x,y+28),b,font=f(13),fill=MUTED)
    d.rounded_rectangle((1260,y-3,1415,y+38),20,fill=WHITE,outline=BLUE,width=2)
    d.text((1300,y+9),c,font=f(13,True),fill=BLUE)
save('01-dashboard','Overview',['Shortcuts','Awaiting shipment  3','Active listings  445','Out of stock  0','Unread messages  2'],'Shortcuts',lambda d:(d.text((300,172),'Overview',font=f(30,True),fill=INK),card(d,(300,230,570,380),'Sales','$12,480.00','30 days'),card(d,(600,230,870,380),'Orders','18','30 days'),card(d,(900,230,1170,380),'Active listings','445','Catalog'),card(d,(1200,230,1470,380),'Categories','24','Catalog'),card(d,(300,420,1470,810),'Recent orders','Order, date, item, total, payment, shipping','Use See all to open Orders')))
save('02-listings','Listings',['Listings','Active  445','Out of stock  0','Ended / Unsold  0','Drafts  0'],'Active',lambda d:(d.text((300,172),'Manage active listings (445)',font=f(27,True),fill=INK),d.rounded_rectangle((300,225,1470,290),12,fill=WHITE,outline=LINE,width=2),d.text((325,245),'Search by title, SKU, brand or item number',font=f(14),fill=MUTED),d.rounded_rectangle((1220,235,1415,278),20,fill=BLUE),d.text((1255,247),'Create listing',font=f(14,True),fill=WHITE),table(d,300,330,'PHOTO     TITLE / SKU                         PRICE       QTY       STATUS       ACTIONS'),table(d,300,410,'[image]  1:1 Full Replacement Door Handle     $95.00      12        Active       Edit'),table(d,300,490,'[image]  Rear Big Brake Kit                       $950.00       3        Active       Edit')))
def table(d,x,y,text): d.rounded_rectangle((x,y,1470,y+80),8,fill=WHITE,outline=LINE,width=2);d.text((x+20,y+28),text,font=f(16),fill=INK)
save('03-edit-listing','Listings',['Listings','Active  445','Out of stock  0','Ended / Unsold  0','Drafts  0'],'Active',lambda d:(d.text((300,172),'Edit listing',font=f(27,True),fill=INK),d.rounded_rectangle((930,160,1470,840),14,fill=WHITE,outline=BLUE,width=2),d.text((965,190),'Photos (3/30)',font=f(18,True),fill=INK),d.rounded_rectangle((965,235,1080,350),10,fill=PALE),d.rounded_rectangle((1095,235,1210,350),10,fill=PALE),d.rounded_rectangle((1225,235,1340,350),10,fill=PALE),d.text((965,385),'Title',font=f(13,True),fill=MUTED),d.rounded_rectangle((965,410,1435,455),8,fill=WHITE,outline=LINE,width=2),d.text((980,424),'1:1 Full Replacement Door Handles',font=f(14),fill=INK),d.text((965,480),'Category     Brand     Custom label (SKU)',font=f(13,True),fill=MUTED),d.rounded_rectangle((965,510,1435,555),8,fill=WHITE,outline=LINE,width=2),d.text((980,524),'Door Handles     PATZCOM     SKU-001',font=f(14),fill=INK),d.text((965,580),'Price (USD)        Quantity',font=f(13,True),fill=MUTED),d.rounded_rectangle((965,610,1180,655),8,fill=WHITE,outline=LINE,width=2),d.text((985,624),'95.00        12',font=f(14),fill=INK),d.rounded_rectangle((1255,770,1435,815),22,fill=BLUE),d.text((1300,783),'Save changes',font=f(14,True),fill=WHITE),d.text((330,225),'상품 정보를 입력하고 사진 URL 또는 Upload로 이미지를 추가합니다.',font=f(18),fill=INK),d.rounded_rectangle((330,280,860,660),14,fill=WHITE,outline=LINE,width=2),d.text((360,320),'Description',font=f(18,True),fill=INK),d.text((360,370),'호환 차량, 구성품, 설치 방법, 배송 정보를',font=f(17),fill=MUTED),d.text((360,405),'고객이 이해하기 쉽게 작성합니다.',font=f(17),fill=MUTED)))
save('04-orders','Orders',['Orders','All orders  18','Awaiting shipment  3','Packing  1','Paid and shipped  12','Delivered  2','On hold  0','Awaiting payment  0'],'Awaiting shipment',lambda d:(d.text((300,172),'Awaiting shipment (3)',font=f(27,True),fill=INK),table(d,300,240,'ORDER        DATE        ITEM                         TOTAL       PAYMENT     SHIPPING'),table(d,300,340,'PATZCOM-1001   Oct 30   Door Handles                 $95.00      Paid        Awaiting shipment'),table(d,300,440,'PATZCOM-1002   Oct 30   Brake Pad Set               $129.00     Paid        Awaiting shipment'),d.rounded_rectangle((1080,600,1470,820),14,fill=PALE,outline=LINE,width=2),d.text((1110,630),'Order detail',font=f(19,True),fill=INK),d.text((1110,690),'Manage · Sync buyer details',font=f(15),fill=MUTED),d.text((1110,730),'Tracking number · Save',font=f(15),fill=MUTED)))
save('05-payments','Payments',['Payments','Summary','All transactions  18','Monthly statement','Refunds  2','Sandbox test results'],'Summary',lambda d:(d.text((300,172),'Payments',font=f(27,True),fill=INK),card(d,(300,235,580,385),'Gross sales','$12,480.00','Paid orders'),card(d,(610,235,890,385),'Payment fees','-$372.00','PayPal fees'),card(d,(920,235,1200,385),'Refunds','-$190.00','Deducted from payout'),card(d,(1230,235,1470,385),'Net payout','$11,918.00','Gross - fees - refunds'),d.rounded_rectangle((300,430,1470,770),14,fill=WHITE,outline=LINE,width=2),d.text((330,465),'All transactions',font=f(19,True),fill=INK),d.text((330,530),'Date        Order        Provider       Status        Gross       Refunded       Net payout',font=f(15,True),fill=MUTED),d.text((330,590),'Oct 30      PATZCOM-1001  PayPal         Paid          $95.00       --              $92.15',font=f(15),fill=INK),d.text((330,650),'Oct 29      PATZCOM-0998  PayPal         Refunded      $190.00      -$190.00        $0.00',font=f(15),fill=RED)))
save('06-reports','Reports',['Reports','Downloads'],'Downloads',lambda d:(d.text((300,172),'Reports',font=f(27,True),fill=INK),d.rounded_rectangle((300,235,1470,700),14,fill=WHITE,outline=LINE,width=2),d.text((330,275),'Download reports',font=f(19,True),fill=INK),reportrow(d,330,340,'Active listings','Price, quantity and status','Download'),reportrow(d,330,430,'Orders','Payment and shipping status','Download'),reportrow(d,330,520,'Settlement','Gross, fees, refunds and net payout','Download'),reportrow(d,330,610,'Buyer messages','Customer support records','Download')))
def reportrow(d,x,y,a,b,c): d.line((x,y+55,1435,y+55),fill=LINE,width=1);d.text((x,y),a,font=f(16,True),fill=INK);d.text((x,y+28),b,font=f(13),fill=MUTED);d.rounded_rectangle((1260,y-3,1415,y+38),20,fill=WHITE,outline=BLUE,width=2);d.text((1300,y+9),c,font=f(13,True),fill=BLUE)
save('07-messages','Messages',['Messages','Inbox  2','Unread  2'],'Unread',lambda d:(d.text((300,172),'Messages (2)',font=f(27,True),fill=INK),d.rounded_rectangle((300,235,1470,430),14,fill=WHITE,outline=LINE,width=2),d.text((330,270),'●  Customer question about fitment',font=f(17,True),fill=INK),d.text((330,315),'Customer email · 2024 Kia Telluride',font=f(14),fill=MUTED),d.rounded_rectangle((300,460,1470,680),14,fill=WHITE,outline=LINE,width=2),d.text((330,500),'Message detail',font=f(19,True),fill=INK),d.text((330,555),'Reply by email                         Mark closed',font=f(16,True),fill=BLUE)))
print('\n'.join(str(p) for p in OUT.glob('*.png')))
