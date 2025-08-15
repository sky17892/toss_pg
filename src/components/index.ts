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
    console.log(import.meta.env.VITE_IMP_USER_CODE);
    IMP.init(IMP_USER_CODE);
  } else {
    console.error('포트원 가맹점 식별 코드가 설정되지 않았습니다.');
    return;
  }

  // ✅ URL 파라미터에서 상품 및 구매자 정보 추출
  const params = new URLSearchParams(window.location.search);
  const productName = params.get('product') || '상품명 미입력';
  const totalPrice = params.get('price') || '0';
  const buyerEmail = params.get('email') || 'test@example.com';
  const buyerName = params.get('name') || '이름없음';
  const buyerTel = params.get('tel') || '01000000000';
  const buyerAddr = params.get('addr') || '주소없음';
  const buyerPostcode = params.get('postcode') || '00000';

  // ✅ 결제 처리 함수
  const handlePayment = (
    name: string,
    price: string | number,
    buyer_email: string,
    buyer_name: string,
    buyer_tel: string,
    buyer_addr: string,
    buyer_postcode: string
  ) => {
    const orderId = `ORDER-${Date.now()}`;

    const paymentData: IamportPaymentOptions = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: orderId,
      name,
      amount: parseInt(String(price), 10) * 1000, // 가격 변환
      buyer_email,
      buyer_name,
      buyer_tel,
      buyer_addr,
      buyer_postcode,
      m_redirect_url: 'https://gurumauto.cafe24.com/',
    };

    IMP.request_pay(paymentData, function (rsp: any) {
      const resultDiv = document.getElementById('payment-result');
      if (!resultDiv) return;

      if (rsp.success) {
        console.log('결제 성공:', rsp);

        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              resultDiv.innerHTML = `
                <h2 class="success">✅ 결제가 정상적으로 완료되었습니다.</h2>
                <p>주문번호: ${rsp.merchant_uid}</p>
                <p>결제 금액: ${rsp.paid_amount}원</p>
              `;

              // ✅ POST로 전달할 form 생성
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = 'http://carpartment.store/adm/insert.php';

              const fields = {
                imp_uid: rsp.imp_uid,
                merchant_uid: rsp.merchant_uid,
                paid_amount: rsp.paid_amount,
                buyer_email,
                buyer_name,
                buyer_tel,
                buyer_addr,
                buyer_postcode
              };

              Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(value);
                form.appendChild(input);
              });

              document.body.appendChild(form);
              form.submit();
            } else {
              resultDiv.innerHTML = `
                <h2 class="error">❌ 결제 검증 실패</h2>
                <p>메시지: ${data.message}</p>
              `;
            }
          })
          .catch((error) => {
            console.error('서버 통신 실패:', error);
            resultDiv.innerHTML = `
              <h2 class="error">❌ 서버 오류로 결제 검증 실패</h2>
              <p>${error}</p>
            `;
          });
      } else {
        console.error('결제 실패:', rsp);
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>실패 사유: ${rsp.error_msg}</p>
        `;
      }
    });
  };

  // ✅ URL 파라미터로 결제 시작
  if (!isNaN(parseInt(totalPrice, 10)) && parseInt(totalPrice, 10) > 0) {
    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerTel, buyerAddr, buyerPostcode);
    return;
  }

  // ✅ postMessage 방식 결제
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'orderInfo') return;

    const {
      productName: msgProductName,
      totalPrice: msgTotalPrice,
      buyerEmail: msgBuyerEmail,
      buyerName: msgBuyerName,
      buyerTel: msgBuyerTel,
      buyerAddr: msgBuyerAddr,
      buyerPostcode: msgBuyerPostcode
    } = event.data;

    if (!msgTotalPrice || isNaN(parseInt(msgTotalPrice, 10)) || parseInt(msgTotalPrice, 10) <= 0) {
      console.warn('잘못된 주문 가격입니다. 홈으로 이동합니다.');
      location.href = 'https://toss-pg.vercel.app/';
      return;
    }

    handlePayment(
      msgProductName || '상품명 미입력',
      msgTotalPrice,
      msgBuyerEmail || 'test@example.com',
      msgBuyerName || '이름없음',
      msgBuyerTel || '01000000000',
      msgBuyerAddr || '주소없음',
      msgBuyerPostcode || '00000'
    );
  });
}
