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
export interface RequestPayment {
  pg: 'html5_inicis';              // PG사 이름만 (html5_inicis, kcp 등)
  pay_method: 'card';       // 카드 결제만 사용
  merchant_uid: string;     // 주문 고유 번호
  name: string;             // 주문명
  amount: number;           // 결제 금액 (원)
  buyer_email?: string;
  buyer_name?: string;
  buyer_tel?: string;
  buyer_addr?: string;
  buyer_postcode?: string;
  m_redirect_url?: string;  // 결제 완료 후 리다이렉트 URL
  custom_data?: {
    product_no?: string | null;
    variant_code?: string | null;
    [key: string]: any;
  };
}
