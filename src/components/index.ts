import { IamportPaymentOptions } from '../types/iamport';

export function ListItemPage(): string {
  return `
    <div class="modal-content">
      <div id="payment-result" class="payment-result" style="margin-top: 20px;"></div>
    </div>
  `;
}

export function initHomePage(): void {
  const home = document.querySelector('#homeModal');
  if (!home) return;

  home.innerHTML = ListItemPage();
  home.classList.remove('hidden');

  // 포트원 SDK 확인
  if (!window.IMP) {
    console.error('포트원 SDK가 로드되지 않았습니다.');
    return;
  }

  const IMP = window.IMP;
  const IMP_USER_CODE = import.meta.env.VITE_IMP_USER_CODE;

  if (IMP_USER_CODE) {
    IMP.init(IMP_USER_CODE);
  } else {
    console.error('포트원 가맹점 식별 코드가 설정되지 않았습니다.');
  }

  // 💡 Cafe24 페이지로부터 상품 정보 받기
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'orderInfo') return;

    const { productName, totalPrice } = event.data;

    if (!totalPrice || isNaN(parseInt(totalPrice, 10)) || parseInt(totalPrice, 10) <= 0) {
      console.warn('잘못된 주문 가격입니다. 홈으로 이동합니다.');
      location.href = 'https://toss-pg.vercel.app/';  // 다른 URL로 변경 가능
      return;
    }

    const orderId = `ORDER-${Date.now()}`;
    const paymentData: IamportPaymentOptions = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: orderId,
      name: productName, // ✅ 상품명 반영
      amount: parseInt(totalPrice, 10), // ✅ 금액 반영
      buyer_email: 'honggildong@example.com',
      buyer_name: '홍길동',
      buyer_tel: '01012345678',
      buyer_addr: '서울특별시 강남구 테헤란로 123',
      buyer_postcode: '06130',
      m_redirect_url: 'https://gurumauto.cafe24.com/'
    };

    // 🧨 포트원 결제창 호출
    IMP.request_pay(paymentData, function (rsp: any) {
      const resultDiv = document.getElementById('payment-result');
      if (!resultDiv) return;

      if (rsp.success) {
        console.log("결제 성공:", rsp);

        fetch('/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            resultDiv.innerHTML = `
              <h2 class="success">✅ 결제가 정상적으로 완료되었습니다.</h2>
              <p>주문번호: ${rsp.merchant_uid}</p>
              <p>결제 금액: ${rsp.paid_amount}원</p>
            `;
          } else {
            resultDiv.innerHTML = `
              <h2 class="error">❌ 결제 검증 실패</h2>
              <p>메시지: ${data.message}</p>
            `;
          }
        })
        .catch(error => {
          console.error('서버 통신 실패:', error);
          resultDiv.innerHTML = `
            <h2 class="error">❌ 서버 오류로 결제 검증 실패</h2>
            <p>${error}</p>
          `;
        });
      } else {
        console.error("결제 실패:", rsp);
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>실패 사유: ${rsp.error_msg}</p>
        `;
      }
    });
  });

  const validReferrerPrefix = 'https://gurumauto.cafe24.com/order/orderform.html?basket_type=A0000&delvtype=A';
  const referrer = document.referrer;

  if (!referrer.startsWith(validReferrerPrefix)) {
    alert('잘못된 접근입니다. 주문서 페이지에서만 결제가 가능합니다.');
    console.warn('잘못된 접근입니다. 주문서 페이지가 아닙니다.');
    location.href = 'https://gurumauto.cafe24.com/';
    return;
  }else{
    alert('kg이니시스 결제가 가능합니다.');
    location.href = 'https://toss-pg.vercel.app/';
  }

  //const productName = productEl?.textContent?.trim() || '상품명 없음';
  const popupScript = document.createElement('script');
popupScript.innerHTML = `
  window.addEventListener('load', () => {    

    const productEl = document.querySelector('.prdName .ec-product-name');
    const productName = 'F1 자수와펜 FORMULA ONE TEAM BENZ AMG Wappen 벤츠 자수 와펜' || '상품명 없음';

    const quantity = Array.from(document.querySelectorAll('.description li'))
      .find(li => li.textContent.includes('수량'))?.textContent.match(/\\d+/)?.[0] || '1';

    const totalPriceElement = '80000원';
    const totalPrice = totalPriceElement.replace(/[^0-9]/g, '') || '0';

    if (!productName || !totalPrice || parseInt(totalPrice, 10) <= 0) {
      alert('상품 정보가 부족하거나 금액이 잘못되었습니다.');
      console.warn('상품 정보가 부족하거나 금액이 잘못되었습니다.');
      return;
    }

    const payload = {
      type: 'orderInfo',
      productName: \`\${productName} 외 \${quantity}개\`,
      totalPrice
    };

    window.opener?.postMessage(payload, '*');
    window.parent?.postMessage(payload, '*');
  });
`;
document.body.appendChild(popupScript);
}
