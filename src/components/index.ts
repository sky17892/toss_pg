import { RequestPayment } from '../types/iamport';

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

  // ✅ 실결제용 가맹점 채널 키
  IMP.init('channel-key-3d6834cb-3b1c-402b-ac80-ad309d7ee253');

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
    buyerPostcode: string,
    productNo?: string | null,
    variantCode?: string | null
  ) => {
    const orderId = `ORDER-${Date.now()}`;
    const redirectBaseUrl = 'https://gurumauto.cafe24.com/myshop/order/list.html';

    const paymentData: RequestPayment = {
      pg: 'html5_inicis',          // ✅ PG사 이름만
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
            totalPrice: rsp.paid_amount,
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
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              resultDiv.innerHTML = `
                <h2 class="success">✅ 결제가 정상적으로 완료되었습니다.</h2>
                <p>주문번호: ${rsp.merchant_uid}</p>
                <p>결제 금액: ${rsp.paid_amount}원</p>
                <p>✨ 잠시 후 주문 내역 페이지로 이동합니다.</p>
              `;
              setTimeout(() => {
                window.location.href = `${redirectBaseUrl}?order_id=${data.order_id}`;
              }, 3000);
            } else {
              resultDiv.innerHTML = `<h2 class="error">❌ 결제 검증 실패</h2><p>${data.message}</p>`;
            }
          })
          .catch((err) => {
            console.error('[서버 오류]', err);
            resultDiv.innerHTML = `<h2 class="error">❌ 서버 오류</h2><p>${err.message}</p>`;
          });
      } else {
        console.error('[결제 실패 응답]', rsp);
        resultDiv.innerHTML = `<h2 class="error">❌ 결제 실패</h2><p>사유: ${rsp.error_msg}</p>`;
      }
    });
  };

  if (productName && totalPrice && !isNaN(parseInt(totalPrice, 10))) {
    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
    return;
  }

  // postMessage로 주문 정보 받을 때
  window.addEventListener('message', (event) => {
    const allowedOrigins = [
      'https://gurumauto.cafe24.com',
      'https://carpartment.store'
    ];
    if (!allowedOrigins.includes(event.origin)) return;

    if (!event.data || event.data.type !== 'orderInfo') return;

    const { productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode } = event.data;
    if (!totalPrice || isNaN(parseInt(totalPrice, 10)) || parseInt(totalPrice, 10) <= 0) return;

    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
  });
}
