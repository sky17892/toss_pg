import axios from 'axios';

// 환경 변수는 서버에 설정되어야 합니다.
const IMP_API_KEY = process.env.IMP_API_KEY;
const IMP_API_SECRET = process.env.IMP_API_SECRET;
const CAFE24_ACCESS_TOKEN = process.env.CAFE24_ACCESS_TOKEN;
const CAFE24_STORE_URL = process.env.CAFE24_STORE_URL;

export default async (req: any, res: any) => {
    const logTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(`[${logTime}] 서버리스 함수 호출 시작`);

        const {
        imp_uid,
        merchant_uid,
        totalPrice,
        productNo,
        variantCode,
        buyerName,
        buyerPhone,
        buyerEmail,
        buyerAddr,
        buyerPostcode,
        quantity,
        shop_no
    } = req.body;

    if (!imp_uid || !merchant_uid) {
        console.error(`[${logTime}] 필수 정보 누락: imp_uid=${imp_uid}, merchant_uid=${merchant_uid}`);
        return res.status(400).json({ success: false, message: '필수 정보 누락' });
    }

    try {
        // 포트원 액세스 토큰 발급
        const getToken = await axios({
            url: "https://api.iamport.kr/users/getToken",
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: { imp_key: IMP_API_KEY, imp_secret: IMP_API_SECRET }
        });
        const { access_token } = getToken.data.response;
        console.log(`[${logTime}] 포트원 액세스 토큰 발급 완료`);

        // imp_uid로 결제 정보 조회 (서버 측 검증)
        const getPaymentData = await axios({
            url: `https://api.iamport.kr/payments/${imp_uid}`,
            method: "get",
            headers: { "Authorization": access_token }
        });
        const paymentData = getPaymentData.data.response;
        console.log(`[${logTime}] 포트원 결제 정보 조회 완료: merchant_uid=${paymentData.merchant_uid}`);

        // 결제 금액 위/변조 확인
        if (paymentData.amount !== parseInt(String(totalPrice), 10)) {
            console.error(`[${logTime}] 결제 금액 불일치: API=${paymentData.amount}, 요청=${totalPrice}`);
            // 금액 불일치 시 결제 취소
            await axios({
                url: "https://api.iamport.kr/payments/cancel",
                method: "post",
                headers: { "Authorization": access_token },
                data: { reason: "결제 금액 불일치", imp_uid: imp_uid }
            });
            return res.status(400).json({ success: false, message: '결제 금액 불일치' });
        }
        
        // 결제 상태가 'paid'가 아니면 주문 생성하지 않음
        if (paymentData.status !== 'paid') {
            console.error(`[${logTime}] 결제 상태가 'paid'가 아님: status=${paymentData.status}`);
            return res.status(400).json({ success: false, message: '결제 실패 또는 취소' });
        }

        // ✅ 카페24 주문 생성
        const cafe24OrderPayload = {
            "shop_no": shop_no || paymentData.custom_data?.shop_no || 1,
            "order": {
                "member_id": "guest",
                "items": [{
                    "product_no": productNo || paymentData.custom_data?.product_no,
                    "variant_code": variantCode || paymentData.custom_data?.variant_code,
                    "quantity": quantity || paymentData.custom_data?.quantity || 1
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
        
        const createCafe24Order = await axios({
            url: `https://${CAFE24_STORE_URL}/api/v2/admin/orders`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAFE24_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: cafe24OrderPayload
        });

        const orderId = createCafe24Order.data.order.order_id;
        console.log(`[${logTime}] 카페24 주문 생성 성공: 주문번호=${orderId}`);
        
        res.status(200).json({
            success: true,
            message: '주문 처리가 완료되었습니다.',
            order_id: orderId
        });

    } catch (error: any) {
        console.error(`[${logTime}] 주문 처리 중 오류 발생:`, error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: '서버 오류로 주문 처리에 실패했습니다.' });
    }
};
