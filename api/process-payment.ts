// api/process-payment.ts
import axios from 'axios';

const IMP_API_KEY = process.env.IMP_API_KEY;
const IMP_API_SECRET = process.env.IMP_API_SECRET;
const CAFE24_ACCESS_TOKEN = process.env.CAFE24_ACCESS_TOKEN;
const CAFE24_STORE_URL = process.env.CAFE24_STORE_URL;

// req와 res에 대한 타입 정의를 제거했습니다.
export default async (req: any, res: any) => {
    const logTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(`[${logTime}] 서버리스 함수 호출 시작`);

    const {
        imp_uid,
        merchant_uid,
        productName,
        totalPrice,
        buyerName,
        buyerPhone,
        buyerEmail,
        buyerAddr,
        buyerPostcode,
        productNo,
        variantCode
    } = req.body;

    if (!imp_uid || !merchant_uid) {
        console.error(`[${logTime}] 필수 정보 누락: imp_uid=${imp_uid}, merchant_uid=${merchant_uid}`);
        return res.status(400).json({ success: false, message: '필수 정보 누락' });
    }

    try {
        const getToken = await axios({
            url: "https://api.iamport.kr/users/getToken",
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: {
                imp_key: IMP_API_KEY,
                imp_secret: IMP_API_SECRET
            }
        });
        const { access_token } = getToken.data.response;
        console.log(`[${logTime}] 포트원 액세스 토큰 발급 완료`);

        const getPaymentData = await axios({
            url: `https://api.iamport.kr/payments/${imp_uid}`,
            method: "get",
            headers: { "Authorization": access_token }
        });
        const paymentData = getPaymentData.data.response;
        console.log(`[${logTime}] 포트원 결제 정보 조회 완료: merchant_uid=${paymentData.merchant_uid}`);

        if (paymentData.amount !== parseInt(String(totalPrice), 10)) {
            console.error(`[${logTime}] 결제 금액 불일치: API=${paymentData.amount}, 요청=${totalPrice}`);
            return res.status(400).json({ success: false, message: '결제 금액 불일치' });
        }

        const cafe24OrderPayload = {
            "shop_no": 1,
            "order": {
                "member_id": "guest",
                "items": [{
                    "product_no": productNo || paymentData.custom_data?.product_no,
                    "variant_code": variantCode || paymentData.custom_data?.variant_code,
                    "quantity": 1
                }],
                "payment_method_code": "card",
                "payment_amount": paymentData.amount,
                "paid_at": paymentData.paid_at,
                "buyer_name": buyerName,
                "buyer_phone": buyerPhone,
                "buyer_email": buyerEmail,
                "receiver_name": buyerName,
                "receiver_phone": buyerPhone,
                "receiver_address1": buyerAddr,
                "receiver_zipcode": buyerPostcode,
                "paid_by_bank_code": paymentData.pg_provider,
                "payment_type": "P",
                "payment_gateway_code": "inicis"
            }
        };

        console.log(`[${logTime}] 카페24 주문 페이로드 생성: ${JSON.stringify(cafe24OrderPayload)}`);

        const createCafe24Order = await axios({
            url: `https://${CAFE24_STORE_URL}/api/v2/admin/orders`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAFE24_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: cafe24OrderPayload
        });

        console.log(`[${logTime}] 카페24 주문 생성 성공: 주문번호=${createCafe24Order.data.order.order_id}`);
        res.status(200).json({ success: true, message: '주문 처리가 완료되었습니다.' });

    } catch (error: any) {
        console.error(`[${logTime}] 주문 처리 중 오류 발생:`, error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: '서버 오류로 주문 처리에 실패했습니다.' });
    }
};
