(() => {
  const STORAGE_KEY = 'patzcom-language';
  const translations = {
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
    'About': '회사 소개',
    'About Us': '회사 소개',
    'Contact': '문의',
    'Contact Us': '문의하기',
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

  const languageNames = { ko: '한국어', en: 'English' };
  // Keep the existing English storefront as the first-visit default. The user's
  // choice is persisted so every later page, including product detail pages,
  // opens in the selected language.
  const getLanguage = () => localStorage.getItem(STORAGE_KEY) || 'en';

  function translateString(value) {
    if (!value.trim()) return value;
    return Object.entries(translations).reduce((result, [english, korean]) => {
      if (!result.includes(english)) return result;
      return result.split(english).join(korean);
    }, value);
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
