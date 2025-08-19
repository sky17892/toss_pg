const axios = require('axios');

const IMP_API_KEY = process.env.IMP_API_KEY;
const IMP_API_SECRET = process.env.IMP_API_SECRET;
const CAFE24_ACCESS_TOKEN = process.env.CAFE24_ACCESS_TOKEN;
const CAFE24_STORE_URL = process.env.CAFE24_STORE_URL;

module.exports = async (req, res) => {
    const {
        imp_uid,
        merchant_uid,
        productName,
        totalPrice,
        buyerName,
        buyerPhone,
        buyerEmail,
        buyerAddr,
        buyerPostcode
    } = req.body;

    if (!imp_uid || !merchant_uid) {
        return res.status(400).json({ success: false, message: '필수 정보 누락' });
    }

    try {
        // 1. 포트원 API 토큰 발급
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

        // 2. 포트원 결제 정보 조회 (위변조 검증)
        const getPaymentData = await axios({
            url: `https://api.iamport.kr/payments/${imp_uid}`,
            method: "get",
            headers: { "Authorization": access_token }
        });
        const paymentData = getPaymentData.data.response;

        // 3. 결제 금액 검증
        if (paymentData.amount !== parseInt(String(totalPrice), 10)) {
            return res.status(400).json({ success: false, message: '결제 금액 불일치' });
        }

        // 4. 카페24 주문 API 호출
        const cafe24OrderPayload = {
            "shop_no": 1,
            "order": {
                "member_id": "guest",
                "items": [{
                    "product_no": paymentData.custom_data?.merchant_uid || '기본 상품번호',
                    "variant_code": paymentData.custom_data?.variant_code || '기본 옵션코드',
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

        const createCafe24Order = await axios({
            url: `https://${CAFE24_STORE_URL}/api/v2/admin/orders`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAFE24_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: cafe24OrderPayload
        });

        res.status(200).json({ success: true, message: '주문 처리가 완료되었습니다.' });

    } catch (error) {
        console.error('주문 처리 중 오류 발생:', error);
        res.status(500).json({ success: false, message: '서버 오류로 주문 처리에 실패했습니다.' });
    }
};
