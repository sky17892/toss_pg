import { TossPaymentOptions } from '../types/toss';

export function ListItemPage(): string {
  return `
    <div class="modal-content">     
      <button id="payment-button" class="payment-button">결제하기</button>      
    </div>
  `;
}

export function initHomePage(): void {
  const home = document.querySelector('#homeModal');
  if (!home) return;

  home.innerHTML = ListItemPage();
  home.classList.remove('hidden');

  const homeButton = home.querySelector<HTMLButtonElement>('#homeButton');
  if (homeButton) {
    homeButton.addEventListener('click', () => {
      home.classList.add('hidden');
      import('./index').then(mod => mod.initHomePage());
    });
  }

  const paymentButton = home.querySelector<HTMLButtonElement>('#payment-button');
  if (paymentButton) {
    paymentButton.addEventListener('click', () => {
      const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
      const orderId = `ORDER-${Date.now()}`;
      const amount = 1500;

      const options: TossPaymentOptions = {
        amount,
        orderId,
        orderName: '테스트 주문',
        customerName: '홍길동',
        successUrl: `${window.location.origin}/success`,
        failUrl: `${window.location.origin}/fail`,
      };

      if (window.TossPayments) {
        window.TossPayments.checkout(clientKey, options)
          .catch((error) => {
            console.error('결제 오류:', error);
            alert('결제 도중 오류가 발생했습니다.');
          });
      } else {
        console.error('토스페이먼츠 SDK가 아직 로드되지 않았습니다.');
      }
    });
  }
}
