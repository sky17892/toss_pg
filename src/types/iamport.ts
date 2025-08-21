// 아임포트 타입 선언
declare global {
  interface Window {
    IMP: {
      init: (accountId: string) => void;
      request_pay: (
        params: RequestPayment,
        callback: (rsp: any) => void
      ) => void;
    };
  }
}

/**
 * 아임포트 결제 요청 파라미터 타입
 */
export interface IamportPaymentOptions {
  pg: string; // 'html5_inicis.MID' 형태 (실결제 MID 포함)
  pay_method: 'card'; // 카드 결제만 사용
  merchant_uid: string; // 주문 고유 번호
  name: string; // 주문명
  amount: number; // 결제 금액 (원)
  buyer_email?: string;
  buyer_name?: string;
  buyer_tel?: string;
  buyer_addr?: string;
  buyer_postcode?: string;
  m_redirect_url?: string; // 결제 완료 후 리다이렉트 URL

  // 새로 추가된 custom_data 속성
  custom_data?: {
    product_no?: string | null;
    variant_code?: string | null;
    [key: string]: any; // 다른 임의의 데이터도 허용
  };
}

// ============================
// 아임포트 결제 호출 예시
// ============================

export function RequestPayment() {
  // 아임포트 초기화 (실결제용 가맹점 식별코드)
  window.IMP.init("channel-key-3d6834cb-3b1c-402b-ac80-ad309d7ee253");

  // 결제 요청
  window.IMP.request_pay(
    {
      pg: "html5_inicis.MOI0559698", // PG사 + 실결제 MID
      pay_method: "card", // 카드 결제만 사용
      merchant_uid: "string", // 주문 고유 번호
      name: "string", // 주문명
      amount: 0, // 결제 금액 (원)
      buyer_email: "string", // 선택값
      buyer_name: "string", // 선택값
      buyer_tel: "string", // 선택값
      buyer_addr: "string", // 선택값
      buyer_postcode: "string", // 선택값
      m_redirect_url: "string", // 결제 완료 후 리다이렉트 URL (선택값)
      custom_data: {
      product_no: "string | null",
      variant_code: "string | null"
    }
  },
    (rsp) => {
      if (rsp.success) {
        // 결제 성공
        console.log("✅ 결제 성공:", rsp);

        // TODO: 서버에 결제 검증 요청 (signKey 사용)
        // fetch("/api/payment/verify", { method: "POST", body: JSON.stringify(rsp) })
      } else {
        // 결제 실패
        console.error("❌ 결제 실패:", rsp);
      }
    }
  );
}
