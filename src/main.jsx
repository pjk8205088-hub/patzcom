import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const categories = [
  { title: 'New Arrivals', desc: '이번 주 새로 들어온 감각적인 아이템' },
  { title: 'Best Sellers', desc: '많이 찾는 인기 상품 모음' },
  { title: 'Daily Wear', desc: '매일 입기 좋은 기본 라인' },
];

const products = [
  { name: 'Linen Overshirt', price: '₩89,000', tag: 'New' },
  { name: 'Structured Tote', price: '₩64,000', tag: 'Hot' },
  { name: 'Weekend Knit', price: '₩72,000', tag: 'Today' },
  { name: 'Everyday Sandal', price: '₩58,000', tag: 'Best' },
];

function App() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Atelier Market</p>
          <h1>새로운 계절을 가장 빠르게 담는 쇼핑몰 홈</h1>
          <p className="lede">
            심플한 탐색, 선명한 상품 진열, 그리고 바로 구매로 이어지는 첫 화면을
            준비했습니다.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#products">상품 보기</a>
            <a className="button button-secondary" href="#categories">카테고리</a>
          </div>
          <dl className="stats">
            <div><dt>24h</dt><dd>빠른 반응형 초기 구조</dd></div>
            <div><dt>Railway</dt><dd>배포용 start 스크립트 포함</dd></div>
            <div><dt>GitHub</dt><dd>연결 후 바로 배포 가능</dd></div>
          </dl>
        </div>
        <div className="hero-panel">
          <div className="panel-card panel-card-large">
            <span>Featured Look</span>
            <strong>Soft texture, clean utility, instant shopping flow.</strong>
          </div>
          <div className="panel-grid">
            <div className="panel-card">Free shipping over ₩70,000</div>
            <div className="panel-card accent">New drops every Friday</div>
          </div>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="section-heading">
          <p className="eyebrow">Categories</p>
          <h2>탐색은 짧게, 선택은 쉽게</h2>
        </div>
        <div className="category-grid">
          {categories.map((item) => (
            <article className="category-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="products">
        <div className="section-heading">
          <p className="eyebrow">Products</p>
          <h2>첫 출시용 상품 리스트</h2>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.name}>
              <div className="product-image" />
              <div className="product-meta">
                <span>{product.tag}</span>
                <h3>{product.name}</h3>
                <strong>{product.price}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
