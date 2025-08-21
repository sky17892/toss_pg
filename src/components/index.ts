import { requestPayment } from '../types/iamport';

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

  console.log('productName:', productName);
  console.log('totalPrice:', totalPrice);
  console.log('buyerName:', buyerName);
  console.log('buyerAddr:', buyerAddr);
  console.log('buyerPhone:', buyerPhone);
  console.log('buyerEmail:', buyerEmail);
  console.log('buyerPostcode:', buyerPostcode);

  const handlePayment = (
    name: string,
    price: string | number,
    buyerEmail: string,
    buyerName: string,
    buyerPhone: string,
    buyerAddr: string,
    buyerPostcode: string,
    productNo?: string | null,
    variantCode?: string | null
  ) => {
    const orderId = `ORDER-${Date.now()}`;
    const redirectBaseUrl = 'https://gurumauto.cafe24.com/myshop/order/list.html';

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
      m_redirect_url: redirectBaseUrl,
      custom_data: { product_no: productNo, variant_code: variantCode },
    };

    console.log('[결제 요청 데이터]', paymentData);

    IMP.request_pay(paymentData, function (rsp: any) {
      const resultDiv = document.getElementById('payment-result');
      if (!resultDiv) return;

      if (rsp.success) {
        console.log('[결제 성공 응답]', rsp);

        fetch('https://toss-pg.vercel.app/api/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid,
            totalPrice: rsp.paid_amount, // 실제 결제 금액을 서버로 전송
            productName: rsp.name,
            buyerName: rsp.buyer_name,
            buyerPhone: rsp.buyer_tel,
            buyerEmail: rsp.buyer_email,
            buyerAddr: rsp.buyer_addr,
            buyerPostcode: rsp.buyer_postcode,
            productNo: paymentData.custom_data?.product_no,
            variantCode: paymentData.custom_data?.variant_code,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`서버 응답 오류: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            console.log('[서버 검증 응답]', data);

            if (data.success) {
              resultDiv.innerHTML = `
                <h2 class="success">✅ 결제가 정상적으로 완료되었습니다.</h2>
                <p>주문번호: ${rsp.merchant_uid}</p>
                <p>결제 금액: ${rsp.paid_amount}원</p>
                <p>✨ 잠시 후 주문 내역 페이지로 이동합니다.</p>
              `;

              // 주문이 성공적으로 생성되었으므로, 3초 후 페이지 이동
              const redirectUrl = `${redirectBaseUrl}?order_id=${data.order_id}`;
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 3000);
            } else {
              resultDiv.innerHTML = `
                <h2 class="error">❌ 결제 검증 실패</h2>
                <p>메시지: ${data.message}</p>
              `;
            }
          })
          .catch((error) => {
            console.error('[서버 오류]', error);
            resultDiv.innerHTML = `
              <h2 class="error">❌ 서버 오류로 결제 검증 실패</h2>
              <p>${error.message}</p>
            `;
          });
      } else {
        console.error('[결제 실패 응답]', rsp);
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>실패 사유: ${rsp.error_msg}</p>
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

    if (!allowedOrigins.includes(event.origin)) {
      console.warn('허용되지 않은 도메인에서 온 메시지입니다.', event.origin);
      return;
    }

    if (!event.data || event.data.type !== 'orderInfo') return;

    const { productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode } = event.data;

    console.log('[postMessage 데이터]', event.data);

    if (!totalPrice || isNaN(parseInt(totalPrice, 10)) || parseInt(totalPrice, 10) <= 0) {
      location.href = 'https://toss-pg.vercel.app/';
      return;
    }

    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
  });
}
