import { RequestPayment } from '../types/iamport';
import axios from 'axios';

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

  const handlePayment = async (
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
    const resultDiv = document.getElementById('payment-result');
    if (!resultDiv) return;

    try {
      resultDiv.innerHTML = `<p>주문 정보를 생성하고 있습니다...</p>`;

      await axios.post('https://toss-pg.vercel.app/api/create-cafe24-order', {
          merchant_uid: orderId,
          totalPrice: parseInt(String(price), 10),
          buyerName,
          buyerPhone,
          buyerEmail,
          buyerAddr,
          buyerPostcode,
          productNo,
          variantCode
      });
      console.log(`[${orderId}] 카페24에 '결제 대기' 주문 생성 요청 성공`);
    } catch (error) {
      console.error(`[${orderId}] '결제 대기' 주문 생성 요청 실패:`, (error as any).response?.data || (error as Error).message);
      resultDiv.innerHTML = `<h2 class="error">❌ 주문 생성 실패</h2><p>다시 시도해 주세요.</p>`;
      return;
    }

    const paymentData: RequestPayment = {
      pg: 'html5_inicis.MOI0559698',
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
      if (rsp.success) {
        console.log('[결제 성공 응답]', rsp);
        fetch('https://toss-pg.vercel.app/api/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid,
            totalPrice: rsp.paid_amount,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              resultDiv.innerHTML = `<h2 class="success">✅ 결제가 정상적으로 완료되었습니다.</h2><p>✨ 잠시 후 주문 내역 페이지로 이동합니다.</p>`;
              setTimeout(() => window.location.href = `${redirectBaseUrl}?order_id=${data.order_id}`, 3000);
            } else {
              resultDiv.innerHTML = `<h2 class="error">❌ 결제 검증 실패</h2><p>메시지: ${data.message}</p>`;
            }
          })
          .catch((error) => {
            console.error('[서버 오류]', error);
            resultDiv.innerHTML = `<h2 class="error">❌ 서버 오류로 결제 검증 실패</h2><p>${(error as Error).message}</p>`;
          });
      } else {
        console.error('[결제 실패 응답]', rsp);
        resultDiv.innerHTML = `
          <h2 class="error">❌ 결제에 실패했습니다</h2>
          <p>실패 사유: ${rsp.error_msg}</p>
          <p>✨ 잠시 후 주문 내역 페이지로 이동합니다.</p>
        `;
        fetch('https://toss-pg.vercel.app/api/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid,
            totalPrice: totalPrice,
          }),
        })
          .then(() => {
            setTimeout(() => window.location.href = `${redirectBaseUrl}?order_id=${rsp.merchant_uid}`, 3000);
          })
          .catch(error => {
            console.error('[서버 오류]', error);
          });
      }
    });
  };

  if (productName && totalPrice && !isNaN(parseInt(totalPrice, 10))) {
    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
    return;
  }

  window.addEventListener('message', (event) => {
    const allowedOrigins = ['https://gurumauto.cafe24.com', 'https://carpartment.store'];
    if (!allowedOrigins.includes(event.origin)) {
      console.warn('허용되지 않은 도메인에서 온 메시지입니다.', event.origin);
      return;
    }
    if (!event.data || event.data.type !== 'orderInfo') return;
    const { productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode } = event.data;
    if (!totalPrice || isNaN(parseInt(totalPrice, 10)) || parseInt(totalPrice, 10) <= 0) {
      location.href = 'https://toss-pg.vercel.app/';
      return;
    }
    handlePayment(productName, totalPrice, buyerEmail, buyerName, buyerPhone, buyerAddr, buyerPostcode);
  });
}
