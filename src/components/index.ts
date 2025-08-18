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

  const params = new URLSearchParams(window.location.search);
  const productName = params.get('product');
  const totalPrice = params.get('price');
  const buyerName = params.get('name') || '구매자';
  const buyerAddr = params.get('raddr1') || '';
  const buyerPhone = [
    params.get('rphone2_1') || '',
    params.get('rphone2_2') || '',
    params.get('rphone2_3') || ''
  ].join('');
  const buyerEmail = (params.get('oemail1') || '') + '@' + (params.get('oemail2') || '');
  const buyerPostcode = params.get('rzipcode1') || '';

  const handlePayment = (
    name: string,
    price: string | number,
    buyerEmail: string,
    buyerName: string,
    buyerPhone: string,
    buyerAddr: string,
    buyerPostcode: string
  ) => {
    const orderId = `ORDER-${Date.now()}`;

    const paymentData: IamportPaymentOptions = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: orderId,
      name,
      amount: parseInt(String(price), 10),
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_tel: buyerPhone,
      buyer_addr: buyerAddr,
      buyer_postcode: buyerPostcode,
      m_redirect_url: 'https://gurumauto.cafe24.com/',
    };

    IMP.request_pay(paymentData, function (rsp: any) {
      const resultDiv = document.getElementById('payment-result');
      if (!resultDiv) return;

      if (rsp.success) {
        // 결제 성공 정보를 서버리스 함수로 전송
        fetch('/api/process-payment', { // Vercel 배포 시, 상대 경로로 접근
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imp_uid: rsp.imp_uid,
                merchant_uid: rsp.merchant_uid,
                productName: name,
                totalPrice: price,
                buyerName: buyerName
            }),
          })
          .then(response => {
            if (!response.ok) {
              throw new Error('서버리스 함수 오류');
            }
            return response.json();
          })
          .then(data => {
            if (data.success) {
              resultDiv.innerHTML = `
                <h2 class="success">✅ 결제가 완료되었으며, 주문이 생성되었습니다.</h2>
                <p>주문번호: ${rsp.merchant_uid}</p>
              `;
            } else {
              resultDiv.innerHTML = `
                <h2 class="error">❌ 주문 처리 실패</h2>
                <p>메시지: ${data.message}</p>
              `;
            }
          })
          .catch(error => {
            console.error('서버리스 통신 오류:', error);
            resultDiv.innerHTML = `
              <h2 class="error">❌ 서버 통신 오류</h2>
              <p>${error.message}</p>
            `;
          });
      } else {
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>사유: ${rsp.error_msg}</p>
        `;
      }
    });
  };

  if (productName && totalPrice && !isNaN(parseInt(totalPrice, 10))) {
    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
    return;
  }

  window.addEventListener('message', (event) => {
    const allowedOrigins = [
      'https://gurumauto.cafe24.com',
      'https://carpartment.store'
    ];
    if (!allowedOrigins.includes(event.origin) || !event.data || event.data.type !== 'orderInfo') return;
    const { productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode } = event.data;
    if (!totalPrice || isNaN(parseInt(totalPrice, 10)) || parseInt(totalPrice, 10) <= 0) {
      location.href = 'https://toss-pg.vercel.app/';
      return;
    }
    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
  });
}
