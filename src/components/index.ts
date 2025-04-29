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
  }

  // ✅ 메시지 수신 후 결제 처리
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'orderInfo') return;

    const { productName, totalPrice } = event.data;
    const orderId = `ORDER-${Date.now()}`;

    const paymentData: IamportPaymentOptions = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: orderId,
      name: productName,
      amount: parseInt(totalPrice, 10),
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imp_uid: rsp.imp_uid, merchant_uid: rsp.merchant_uid })
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
            resultDiv.innerHTML = `
              <h2 class="error">❌ 서버 오류로 결제 검증 실패</h2>
              <p>${error}</p>
            `;
          });
      } else {
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>실패 사유: ${rsp.error_msg}</p>
        `;
      }
    });
  });

  const currentUrl = window.location.href;
  const isMainPage = currentUrl === 'https://gurumauto.cafe24.com/';
  const isSkinPage = currentUrl === 'https://gurumauto.cafe24.com/skin-skin2';
  const isOrderFormPage = currentUrl.startsWith('https://gurumauto.cafe24.com/order/orderform.html?basket_type=A0000&delvtype=A');
  const alreadyRedirected = sessionStorage.getItem('alreadyRedirected');

  // ✅ 1. 메인/스킨 페이지 → orderform으로 리디렉션
  if ((isMainPage || isSkinPage) && !alreadyRedirected) {
    sessionStorage.setItem('alreadyRedirected', 'true');
    alert('KG이니시스 결제를 위해 orderform 페이지로 이동합니다.');
    location.href = 'https://gurumauto.cafe24.com/order/orderform.html?basket_type=A0000&delvtype=A';
    return;
  }

  // ✅ 2. orderform 페이지에서는 상품 정보 수집 및 toss-pg에 전달
  if (isOrderFormPage) {
    const popupScript = document.createElement('script');
    popupScript.innerHTML = `
      window.addEventListener('load', () => {
        const productName = 'F1 자수와펜 FORMULA ONE TEAM BENZ AMG Wappen 벤츠 자수 와펜';
        const quantity = '1'; // 실제 DOM에서 추출 필요
        const totalPrice = '80000'; // 실제 가격 추출 로직 필요

        if (!productName || !totalPrice || parseInt(totalPrice, 10) <= 0) {
          alert('상품 정보가 부족하거나 금액이 잘못되었습니다.');
          return;
        }

        const payload = {
          type: 'orderInfo',
          productName: \`\${productName} 외 \${quantity}개\`,
          totalPrice
        };

        const newWin = window.open('https://toss-pg.vercel.app/', '_blank');
        if (newWin) {
          setTimeout(() => newWin.postMessage(payload, '*'), 1000); // 약간의 딜레이 필요
        } else {
          alert('팝업 차단 해제를 해주세요.');
        }
      });
    `;
    document.body.appendChild(popupScript);
  }
}
