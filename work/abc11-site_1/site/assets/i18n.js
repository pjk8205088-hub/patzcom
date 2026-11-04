(() => {
  const STORAGE_KEY = 'patzcom-language';
  const translations = {
    'Seller Hub': '판매자 관리', 'View storefront': '쇼핑몰 보기', 'More tools': '추가 도구', 'Sell an item': '상품 등록', 'Sign out': '로그아웃',
    'Overview': '개요', 'Marketing': '마케팅', 'Performance': '성과', 'Research': '상품 분석', 'Shortcuts': '바로가기',
    'All orders': '전체 주문', 'Awaiting shipment': '배송 대기', 'Packing': '포장 중', 'Paid and shipped': '결제·배송 완료', 'Delivered': '배송 완료', 'On hold': '보류', 'Awaiting payment': '결제 대기',
    'Active listings': '판매 중인 상품', 'Active': '판매 중', 'Out of stock': '품절', 'Ended / Unsold': '판매 종료', 'Ended': '종료', 'Drafts': '임시 저장',
    'Promotions': '프로모션', 'Coupons': '쿠폰', 'Summary': '요약', 'Sales': '매출', 'Inventory health': '재고 현황',
    'All transactions': '전체 거래', 'Monthly statement': '월별 정산', 'Refunds': '환불', 'Sandbox test results': '샌드박스 테스트 결과',
    'Catalog insights': '상품 분석', 'Pricing': '가격 분석', 'Downloads': '다운로드', 'Inbox': '받은 메시지', 'Unread': '읽지 않음',
    'Tasks': '할 일', 'Ship orders': '주문 배송', 'Buyer messages': '구매자 메시지', 'Restock out-of-stock listings': '품절 상품 재고 보충',
    'Recent orders': '최근 주문', 'See all': '전체 보기', 'Today': '오늘', 'days': '일', 'Download': '다운로드', 'Refresh': '새로고침',
    'Photos': '사진', 'Title': '상품명', 'Brand': '브랜드', 'Custom label (SKU)': '사용자 지정 상품코드(SKU)',
    'Condition': '상태', 'Price (USD)': '가격(USD)', 'Quantity': '수량', 'Description': '상품 설명', 'Upload': '업로드', 'Add URL': 'URL 추가',
    'New': '새 상품', 'Used': '중고', 'Cancel': '취소', 'List it': '상품 등록', 'No photos yet': '등록된 사진이 없습니다',
    'Listing is active on storefront': '쇼핑몰에서 판매 중', 'Edit listing': '상품 수정', 'Edit price': '가격 수정', 'Edit quantity': '수량 수정',
    'Relist': '재등록', 'End listings': '판매 종료', 'Clear': '선택 해제', 'per page': '페이지당', 'selected': '개 선택',
    'Order': '주문', 'Date': '날짜', 'Item': '상품', 'Total': '합계', 'Payment': '결제', 'Ship to': '배송지', 'Tracking': '운송장', 'Actions': '작업',
    'Add tracking': '운송장 등록', 'Manage': '관리', 'No orders yet.': '주문이 없습니다.', 'No listings match.': '일치하는 상품이 없습니다.',
    'Address not captured': '배송지 정보 없음', 'Sync buyer details': '구매자 정보 동기화', 'Resend confirmation': '주문 확인 메일 재발송',
    'Resend shipping notice': '배송 안내 메일 재발송', 'Gross': '총액', 'Payment fee': '결제 수수료', 'Refunded to buyer': '구매자 환불액',
    'Net payout': '실수령액', 'Sync fees': '수수료 동기화', 'Refund': '환불', 'Reason': '사유', 'Shipping status': '배송 상태',
    'Tracking number': '운송장 번호', 'Close': '닫기', 'Save': '저장', 'Search order, item, PayPal ID': '주문·상품·PayPal ID 검색',
    'Search by title, SKU, brand or item number': '상품명·SKU·브랜드·상품번호 검색',
    'Search listings, orders, buyers or item numbers': '상품·주문·구매자·상품번호 검색',
    'Search all products': '모든 상품 검색', 'No messages.': '메시지가 없습니다.', 'Mark closed': '처리 완료', 'Reply by email': '이메일 답장',
    'Download reports': '보고서 다운로드', 'Email notifications': '이메일 알림', 'Send test email': '테스트 메일 보내기',
    'Product details': '상품 상세정보',
    'This product was imported from an eBay active listings report and remapped into the PATZCOM storefront format.': '이 상품은 eBay 판매 중인 상품 보고서를 바탕으로 PATZCOM에 등록되었습니다.',
    'Images were not included in the Seller Hub active listings CSV export, so this product uses the PATZCOM image fallback until richer image data is provided.': '판매 보고서에 이미지가 포함되지 않아 추가 이미지 정보가 제공될 때까지 기본 이미지가 표시됩니다.',
    'imported from eBay Seller Hub active listings report.': '은 eBay 판매 중인 상품 보고서에서 가져왔습니다.',
    'Item number:': '상품번호:', 'Available quantity:': '구매 가능 수량:',
    'Vendor:': '판매사:', 'Type:': '분류:', 'Weight:': '무게:',
    'Part type:': '부품 종류:', 'Drive type:': '구동방식:', 'Drivetrain:': '구동방식:',
    'Body type:': '차체형식:', 'Placement on vehicle:': '차량 장착 위치:',
    'Material:': '재질:', 'Finish:': '마감:', 'Manufacturer:': '제조사:',
    'Manufacturer part number:': '제조사 품번:', 'Country/Region of Manufacture:': '제조 국가/지역:',
    'Transmission:': '변속기:', 'Fuel type:': '연료 종류:', 'Engine type:': '엔진 형식:',
    'Fitment type:': '장착 방식:', 'Features:': '주요 특징:', 'Color:': '색상:',
    'SKU:': '상품코드:', 'Shipping': '배송', 'Returns': '반품',
    'Installation: 1:1 replacement': '설치: 1:1 교체',
    'Free FedEx International Priority shipping, clear return guidance, and support for fitment questions before you place an order.': '무료 FedEx 국제 우선 배송, 명확한 반품 안내와 주문 전 차량 호환성 상담을 제공합니다.',
    'Marketplace view': '마켓플레이스 보기', 'Vehicle fitment': '차량 호환 정보',
    'Checkout stack': '결제 구성', 'Built for': '적용 부품:',
    'Use the compatibility box to confirm year, make, model, trim and engine before checkout.': '결제 전에 차량 호환성 입력란에서 연식·제조사·모델·트림·엔진을 확인하세요.',
    'White product detail layout with a left media column, right buy box, and support panels below.': '왼쪽 상품 이미지, 오른쪽 구매 영역과 하단 안내 패널로 구성된 상품 상세 화면입니다.',
    'PayPal first, Stripe ready': 'PayPal 우선 결제',
    'Keep the public checkout flow simple while seller tools and API sync evolve behind the scenes.': '고객 결제 과정은 간단하게 유지하며 판매자 도구와 API 동기화를 지원합니다.',
    'Explore all products': '모든 상품 둘러보기',
    'Category': '카테고리',
    'A sales-focused storefront for automotive parts and performance upgrades.': '자동차 부품과 성능 업그레이드 제품을 판매하는 전문 쇼핑몰입니다.',
    'Checkout: PayPal first · Stripe cards planned': '결제: PayPal 우선 · 카드 결제 준비 중',
    'Info': '안내',
    'Mon–Fri 09:00–18:00 (ET)': '월~금 09:00~18:00 (미국 동부 시간)',
    'All rights reserved.': '모든 권리 보유.',
    'Body Moldings & Trims': '차체 몰딩 및 장식',
    'Brake Calipers & Brackets': '브레이크 캘리퍼 및 브래킷',
    'Brake Disc Rotors': '브레이크 디스크 로터',
    'Brake Hoses, Lines & Fittings': '브레이크 호스·라인·피팅',
    'Brake Pads': '브레이크 패드',
    'Door Handles': '도어 핸들',
    'ECUs & Computer Modules': 'ECU 및 컴퓨터 모듈',
    'Exhaust Pipes & Tips': '배기 파이프 및 팁',
    'Exhaust System Kits': '배기 시스템 키트',
    'Fuel Doors & Components': '연료 주입구 커버 및 부품',
    'Leaf & Coil Springs': '판스프링 및 코일스프링',
    'Lift Coilover Suspension Kit': '리프트 코일오버 서스펜션 키트',
    'Lowering Springs': '다운 스프링',
    'Manifolds & Headers': '매니폴드 및 헤더',
    'Other Brake Parts': '기타 브레이크 부품',
    'Other Exterior Parts & Accessories': '기타 외장 부품 및 액세서리',
    'Shift Knobs': '변속 손잡이',
    'Shock & Strut Mounts': '쇼크 및 스트럿 마운트',
    'Shocks, Struts & Assemblies': '쇼크·스트럿 및 어셈블리',
    'Sway Bars, Links & Bushings': '스태빌라이저 바·링크·부싱',
    'Switches & Controls': '스위치 및 제어 장치',
    'Big Brake Kits': '대형 브레이크 키트',
    'Heavy-Duty Durability': '고강도 내구성 부품',
    'Rear Sway Bar': '후방 스태빌라이저 바',
    'Strut Tower Bars': '스트럿 타워 바',
    'Other': '기타',
    'Welcome to PATZCOM': 'PATZCOM에 오신 것을 환영합니다',
    'Featured parts': '추천 부품',
    'Help & Contact': '도움말 및 문의',
    'Daily Deals': '오늘의 특가',
    'Shop by category ▾': '카테고리별 쇼핑 ▾',
    'Search for anything': '상품을 검색하세요',
    'All categories': '전체 카테고리',
    'Search': '검색',
    'Contact seller': '판매자 문의',
    '♡ Save store': '♡ 스토어 저장',
    'Categories': '카테고리',
    'Shop by vehicle': '차량별 쇼핑',
    'Browse all vehicles →': '모든 차량 보기 →',
    'FIND YOUR NEXT UPGRADE': '다음 업그레이드를 찾아보세요',
    'Featured categories': '추천 카테고리',
    'All categories →': '전체 카테고리 →',
    'PICKS FROM OUR CATALOG': '카탈로그 추천 상품',
    'Featured items': '추천 상품',
    'View all products →': '모든 상품 보기 →',
    'Explore all products →': '모든 상품 둘러보기 →',
    'parts in the catalog': '개 카탈로그 상품',
    'items': '개 상품',
    'available - ready to ship': '개 재고 있음 - 바로 배송 가능',
    'Shipping shown separately': '배송비 별도',
    'Imported from eBay': 'eBay에서 가져온 상품',
    'All products': '모든 상품',
    'results': '개 결과',
    'Search all products': '모든 상품 검색',
    'Sort products': '상품 정렬',
    'Sort: Best match': '정렬: 관련도순',
    'Sort: highest price': '정렬: 높은 가격순',
    'Sort: lowest price': '정렬: 낮은 가격순',
    'Include description': '상품 설명 포함',
    'Buy it now': '지금 구매',
    'In stock': '재고 있음',
    'On sale': '할인 상품',
    'No products match these filters.': '조건에 맞는 상품이 없습니다.',
    'Clear filters': '필터 지우기',
    'Home': '홈',
    'About Us': '회사 소개',
    'Contact Us': '문의하기',
    'About': '회사 소개',
    'Contact': '문의',
    'Shop': '쇼핑',
    'Sale': '세일',
    'Feedback': '피드백',
    'Cart': '장바구니',
    'Your cart is empty.': '장바구니가 비어 있습니다.',
    'Continue shopping →': '쇼핑 계속하기 →',
    'Payment options': '결제 옵션',
    'Primary checkout': '기본 결제',
    'Card checkout ready': '카드 결제 가능',
    'Buyer protection': '구매자 보호',
    'Secure checkout': '안전한 결제',
    'PayPal first': 'PayPal 우선',
    'Stripe cards ready': 'Stripe 카드 결제 가능',
    'FedEx shipping': 'FedEx 배송',
    '30-day returns': '30일 반품',
    'Taxes may apply. Final total is shown at checkout.': '세금이 부과될 수 있습니다. 최종 결제 금액은 결제 단계에서 표시됩니다.',
    'Shipping shown separately · Domestic delivery prioritized · Buyer location may affect options': '배송비는 별도입니다 · 국내 배송 우선 · 구매자 위치에 따라 옵션이 달라질 수 있습니다',
    'Check compatibility before checkout': '결제 전 차량 호환성을 확인하세요',
    'Year': '연식',
    'Make': '제조사',
    'Model': '모델',
    'Trim': '트림',
    'Engine': '엔진',
    'Add vehicle': '차량 추가',
    'Qty': '수량',
    'Add to cart': '장바구니에 담기',
    'Buy it now': '지금 구매',
    'Shipping, returns and buyer notes': '배송·반품 및 구매 안내',
    'Shipping Information': '배송 안내',
    'Item condition': '상품 상태',
    'PRODUCT INFORMATION': '상품 정보',
    'COMPONENTS:': '구성품:',
    'WARRANTY:': '보증:',
    'Brand New, straight from the factory': '공장에서 출고된 새 상품',
    'Send message': '메시지 보내기',
    'Sending...': '보내는 중...',
    'Privacy Policy': '개인정보처리방침',
    'Shipping & Returns': '배송 및 반품',
    'About PATZCOM': 'PATZCOM 소개',
    'Login': '로그인',
    'Logout': '로그아웃',
    'Admin': '관리자',
    'Listings': '리스팅',
    'Inventory': '재고',
    'Orders': '주문',
    'Messages': '메시지',
    'Payments': '결제',
    'Reports': '보고서',
    'Create listing': '상품 등록',
    'Edit': '수정',
    'Save changes': '변경사항 저장',
  };

  const vehicleTerms = {
    'MERCEDES-BENZ': '메르세데스-벤츠', 'VOLKSWAGEN': '폭스바겐',
    'CHEVROLET': '쉐보레', 'HYUNDAI': '현대', 'GENESIS': '제네시스',
    'SSANGYONG': '쌍용', 'RENAULT': '르노', 'TOYOTA': '토요타',
    'KIA': '기아', 'HONDA': '혼다', 'JAGUAR': '재규어',
    'TESLA': '테슬라', 'BMW': 'BMW', 'AUDI': '아우디',
    'FORD': '포드', 'JEEP': '지프', 'NISSAN': '닛산',
    'INFINITI': '인피니티', 'PORSCHE': '포르쉐', 'LEXUS': '렉서스',
    'MINI': '미니', 'VOLVO': '볼보', 'CHEVY': '쉐보레',
    'LINCOLN': '링컨', 'MASERATI': '마세라티', 'ROLLS-ROYCE': '롤스로이스',
  };
  const productTerms = {
    'REAR-SECTION': '후방 배기구간', 'AXLE-BACK': '액슬백', 'CAT-BACK': '캣백',
    'EXHAUST': '배기 시스템', 'MUFFLER': '머플러', 'DUAL': '듀얼',
    'FRONT': '전방', 'REAR': '후방', 'LEFT': '왼쪽', 'RIGHT': '오른쪽',
    'BRAKE': '브레이크', 'CALIPER': '캘리퍼', 'ROTOR': '로터',
    'SPRING': '스프링', 'LIFTING': '리프트', 'LOWERING': '다운',
    'COILOVER': '코일오버', 'SUSPENSION': '서스펜션',
    'STRUT': '스트럿', 'TOWER': '타워', 'BAR': '바', 'BRACE': '보강바',
    'CARBON FIBER': '카본 파이버', 'CARBON': '카본',
    'COVER': '커버', 'HANDLE': '핸들', 'KIT': '키트',
    'PERFORMANCE': '퍼포먼스', 'RACING': '레이싱',
    'REPLACEMENT': '교체용', 'GENUINE': '정품', 'NEW': '신품',
    'FOR': '용', 'WITH': '포함', 'PAIR': '한 쌍',
    'SHIP TODAY': '오늘 발송', 'MADE IN KOREA': '한국산',
    'STAINLESS STEEL': '스테인리스강', 'TITANIUM': '티타늄',
    'STABILIZER': '스태빌라이저', 'DOWNPIPE': '다운파이프',
    'MIDPIPE': '중간 배기관', 'MANIFOLD': '매니폴드', 'HEADER': '헤더',
    'EMBLEM': '엠블럼', 'MIRROR': '사이드미러', 'WINDOW': '창문',
    'FUEL DOOR': '연료 주입구 커버', 'GAS CAP': '연료캡',
    'CONTROL': '제어', 'REMOTE': '리모컨', 'PANEL': '패널',
    'ASSEMBLY': '어셈블리', 'PADS': '패드', 'CALIPERS': '캘리퍼',
    'ROTORS': '로터', 'BLACK': '검정', 'GLOSSY': '유광',
    'SET': '세트', 'ONLY': '단품', 'INCLUDED': '포함',
    'ADJUSTABLE': '조절식', 'AUTHENTIC': '정품', 'AWD': '사륜구동',
    'FWD': '전륜구동', 'RWD': '후륜구동', 'COUPE': '쿠페', 'SEDAN': '세단',
    '4WD': '사륜구동', '2WD': '이륜구동', 'ALL-WHEEL DRIVE': '사륜구동',
    'FRONT-WHEEL DRIVE': '전륜구동', 'REAR-WHEEL DRIVE': '후륜구동',
    'AUTOMATIC': '자동변속기', 'MANUAL': '수동변속기', 'DCT': '듀얼클러치 변속기',
    'GASOLINE': '가솔린', 'PETROL': '가솔린', 'DIESEL': '디젤',
    'HYBRID': '하이브리드', 'ELECTRIC': '전기', 'TURBO': '터보',
    'FACELIFT': '페이스리프트', 'ELECTRIFIED': '전동화', 'ELECTRONIC': '전자식',
    'CHASSIS': '차체', 'REINFORCEMENT': '보강', 'SWAY BAR': '스웨이바',
    'SWAYBAR': '스웨이바', 'UNDERBAR': '언더바', 'UNDERBARS': '언더바',
    'ANTI-ROLL': '안티롤', 'LINKS': '링크', 'SUPPORT': '서포트',
    'FENDER': '펜더', 'GARNISH': '가니시', 'LETTERING': '레터링',
    'SHIFT KNOB': '기어 노브', 'VALVETRONIC': '가변 배기', 'VARIABLE': '가변식',
    'PIPE': '파이프', 'DISCS': '디스크', 'PISTON': '피스톤',
    'SLOTTED': '슬롯형', 'DRILLED': '타공형', 'FLOATING': '플로팅',
    'SOLID': '솔리드', 'LIGHTWEIGHT': '경량', 'RIGIDITY': '강성',
    'TUNING': '튜닝', 'UPGRADE': '업그레이드', 'OEM TYPE': '순정형',
    'NON-TURBO': '자연흡기', 'T-GDI': '터보 GDI', 'GDI': 'GDI',
    'VENDOR': '판매사', 'TYPE': '분류', 'WEIGHT': '무게', 'CATEGORY': '카테고리',
    'ITEM NUMBER': '상품번호', 'AVAILABLE QUANTITY': '구매 가능 수량',
    'PART TYPE': '부품 종류', 'DRIVE TYPE': '구동방식', 'DRIVETRAIN': '구동방식',
    'BODY TYPE': '차체형식', 'PLACEMENT': '장착 위치', 'MATERIAL': '재질',
    'FINISH': '마감', 'TRANSMISSION': '변속기', 'FUEL TYPE': '연료 종류',
    'OPTIMA': '옵티마', 'ELANTRA': '엘란트라', 'TUCSON': '투싼',
    'STINGER': '스팅어', 'SORENTO': '쏘렌토', 'SPORTAGE': '스포티지',
    'CARNIVAL': '카니발', 'PALISADE': '팰리세이드', 'SANTA FE': '싼타페',
    'SONATA': '쏘나타', 'VELOSTER': '벨로스터', 'ODYSSEY': '오딧세이',
    'AZERA': '아제라', 'GRANDEUR': '그랜저', 'CADENZA': '카덴자',
    'FORTE': '포르테', 'KOUP': '쿱', 'SEDONA': '세도나', 'TELLURIDE': '텔루라이드',
    'IONIQ': '아이오닉', 'TIBURON': '티뷰론', 'TUSCANI': '투스카니',
    'AVANTE': '아반떼', 'ACCENT': '엑센트', 'KONA': '코나',
    'STARIA': '스타리아', 'STAREX': '스타렉스', 'VERACRUZ': '베라크루즈',
    'EQUUS': '에쿠스', 'NEXO': '넥쏘', 'TERRACAN': '테라칸',
    'CRETA': '크레타', 'SANTAFE': '싼타페', 'IONIQ5': '아이오닉 5',
    'IONIQ6': '아이오닉 6', 'I30N': 'i30 N', 'CALLIGRAPHY': '캘리그래피',
    'I30': 'i30', 'I40': 'i40', 'PORTER': '포터', 'MIGHTY': '마이티',
    'COUNTY': '카운티', 'AERO': '에어로', 'SOLATI': '쏠라티',
    'CASPER': '캐스퍼', 'EXCEL': '엑셀', 'SCOUPE': '스쿠프',
    'PONY': '포니', 'DYNASTY': '다이너스티', 'CENTENNIAL': '에쿠스',
    'GENERATION': '세대', 'GRAND': '그랜드', 'SPORT': '스포츠',
    'PRESTIGE': '프레스티지', 'N-LINE': 'N 라인',
    'MUSTANG': '머스탱', 'EXPLORER': '익스플로러', 'AVIATOR': '에비에이터',
    'WRANGLER': '랭글러', 'CHEROKEE': '체로키', 'TRAVERSE': '트래버스',
    'COLORADO': '콜로라도', 'TAHOE': '타호', 'LEVANTE': '르반떼',
    'CAYENNE': '카이엔', 'ACCORD': '어코드',
  };

  const languageNames = { ko: '한국어', en: 'English' };
  // Keep the existing English storefront as the first-visit default. The user's
  // choice is persisted so every later page, including product detail pages,
  // opens in the selected language.
  const getLanguage = () => localStorage.getItem(STORAGE_KEY) || 'en';

  function translateString(value) {
    if (!value.trim()) return value;
    const exact = translations[value.trim()];
    if (exact) return value.replace(value.trim(), exact);
    let result = Object.entries({...vehicleTerms,...productTerms}).sort((a,b)=>b[0].length-a[0].length).reduce((text, [english, korean]) =>
      text.replace(new RegExp(`\\b${english}\\b`, 'gi'), korean), value);
    return Object.entries(translations).filter(([english]) => english.length > 7).sort((a,b) => b[0].length-a[0].length).reduce((result, [english, korean]) => {
      if (!result.includes(english)) return result;
      return result.split(english).join(korean);
    }, result);
  }

  function applyTranslations() {
    const korean = getLanguage() === 'ko';
    document.documentElement.lang = korean ? 'ko' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (key) node.textContent = korean ? (translations[key] || key) : key;
    });
    if (!korean) {
      document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => node.setAttribute('placeholder', node.getAttribute('data-i18n-placeholder')));
    } else {
      document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => node.setAttribute('placeholder', translations[node.getAttribute('data-i18n-placeholder')] || node.getAttribute('data-i18n-placeholder')));
    }
    if (korean) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (node.parentElement?.closest('script,style,textarea,[data-no-translate]')) return;
        const next = translateString(node.nodeValue || '');
        if (next !== node.nodeValue) node.nodeValue = next;
      });
      document.querySelectorAll('img[alt], input[placeholder], textarea[placeholder], [aria-label], meta[name="description"]').forEach((node) => {
        const attributes = node.matches('meta') ? ['content'] : ['alt','placeholder','aria-label'];
        attributes.forEach((attribute) => {
          const original = node.getAttribute(attribute);
          if (original) node.setAttribute(attribute, translateString(original));
        });
      });
      document.title = translateString(document.title);
    }
    const button = document.querySelector('.language-switcher');
    if (button) {
      const markup = `<span class="language-option ${korean ? 'active' : ''}" data-lang="ko">한국어</span><span class="language-divider">|</span><span class="language-option ${!korean ? 'active' : ''}" data-lang="en">English</span>`;
      if (button.innerHTML !== markup) button.innerHTML = markup;
      button.setAttribute('aria-label', korean ? '언어 선택' : 'Choose language');
    }
  }

  function mountSwitcher() {
    if (document.querySelector('.language-switcher')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-switcher';
    button.addEventListener('click', (event) => {
      const target = event.target.closest('[data-lang]');
      if (!target) return;
      localStorage.setItem(STORAGE_KEY, target.dataset.lang);
      location.reload();
    });
    const anchor = document.querySelector('.top-links.right, .hdr-top, header, body');
    anchor?.append(button);
    applyTranslations();
  }

  window.PATZCOM_I18N = { apply: applyTranslations, setLanguage: (lang) => { localStorage.setItem(STORAGE_KEY, lang); location.reload(); }, getLanguage };
  document.addEventListener('DOMContentLoaded', mountSwitcher);
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; applyTranslations(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
