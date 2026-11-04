(() => {
  const STORAGE_KEY = 'patzcom-language';
  const translations = {
    'Product details': '상품 상세정보',
    'This product was imported from an eBay active listings report and remapped into the PATZCOM storefront format.': '이 상품은 eBay 판매 중인 상품 보고서를 바탕으로 PATZCOM에 등록되었습니다.',
    'Images were not included in the Seller Hub active listings CSV export, so this product uses the PATZCOM image fallback until richer image data is provided.': '판매 보고서에 이미지가 포함되지 않아 추가 이미지 정보가 제공될 때까지 기본 이미지가 표시됩니다.',
    'imported from eBay Seller Hub active listings report.': '은 eBay 판매 중인 상품 보고서에서 가져왔습니다.',
    'Item number:': '상품번호:', 'Available quantity:': '구매 가능 수량:',
    'Vendor:': '판매사:', 'Type:': '분류:', 'Weight:': '무게:',
    'SKU:': '상품코드:', 'Shipping': '배송', 'Returns': '반품',
    'Installation: 1:1 replacement': '설치: 1:1 교체',
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
    'MINI': '미니', 'VOLVO': '볼보',
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
    'OPTIMA': '옵티마', 'ELANTRA': '엘란트라', 'TUCSON': '투싼',
    'STINGER': '스팅어', 'SORENTO': '쏘렌토', 'SPORTAGE': '스포티지',
    'CARNIVAL': '카니발', 'PALISADE': '팰리세이드', 'SANTA FE': '싼타페',
    'SONATA': '쏘나타', 'VELOSTER': '벨로스터', 'ODYSSEY': '오딧세이',
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
