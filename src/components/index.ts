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
    return;
  }

  // ✅ 1. URL 파라미터 방식 처리
  const params = new URLSearchParams(window.location.search);
  const productName = params.get('product');
  const totalPrice = params.get('price');

  if (productName && totalPrice && !isNaN(parseInt(totalPrice, 10))) {
    const orderId = `ORDER-${Date.now()}`;
    const paymentData: IamportPaymentOptions = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: orderId,
      name: productName,
      amount: parseInt(totalPrice, 1000),
      buyer_email: 'honggildong@example.com',
      buyer_name: '홍길동',
      buyer_tel: '01012345678',
      buyer_addr: '서울특별시 강남구 테헤란로 123',
      buyer_postcode: '06130',
      m_redirect_url: 'https://gurumauto.cafe24.com/'
    };

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

    return; // ✅ URL 방식으로 결제 진행했으면 리스너는 생략
  }

  // ✅ 2. 메시지(postMessage) 방식도 여전히 지원
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'orderInfo') return;

    const { productName, totalPrice } = event.data;

    if (!totalPrice || isNaN(parseInt(totalPrice, 10)) || parseInt(totalPrice, 10) <= 0) {
      console.warn('잘못된 주문 가격입니다. 홈으로 이동합니다.');
      location.href = 'https://toss-pg.vercel.app/';
      return;
    }

    const orderId = `ORDER-${Date.now()}`;
    const paymentData: IamportPaymentOptions = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: orderId,
      name: productName,
      amount: parseInt(totalPrice, 1000),
      buyer_email: 'honggildong@example.com',
      buyer_name: '홍길동',
      buyer_tel: '01012345678',
      buyer_addr: '서울특별시 강남구 테헤란로 123',
      buyer_postcode: '06130',
      m_redirect_url: 'https://gurumauto.cafe24.com/'
    };

    IMP.request_pay(paymentData, function (rsp: any) {
      const resultDiv = document.getElementById('payment-result');
      if (!resultDiv) return;

      if (rsp.success) {
        resultDiv.innerHTML = `
          <h2 class="success">✅ 결제가 정상적으로 완료되었습니다.</h2>
          <p>주문번호: ${rsp.merchant_uid}</p>
          <p>결제 금액: ${rsp.paid_amount}원</p>
        `;
      } else {
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>실패 사유: ${rsp.error_msg}</p>
        `;
      }
    });
  });
}
