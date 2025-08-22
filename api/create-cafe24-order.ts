import axios from 'axios';

const CAFE24_ACCESS_TOKEN = process.env.CAFE24_ACCESS_TOKEN;
const CAFE24_STORE_URL = process.env.CAFE24_STORE_URL;

export default async (req: any, res: any) => {
    const logTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(`[${logTime}] 카페24 주문 생성 서버리스 함수 호출 시작`);

    const {
        merchant_uid,
        totalPrice,
        buyerName,
        buyerPhone,
        buyerEmail,
        buyerAddr,
        buyerPostcode,
        productNo,
        variantCode
    } = req.body;

    if (!merchant_uid) {
        console.error(`[${logTime}] 필수 정보 누락: merchant_uid=${merchant_uid}`);
        return res.status(400).json({ success: false, message: '주문번호(merchant_uid) 누락' });
    }

    try {
        const cafe24OrderPayload = {
            "shop_no": 1,
            "order": {
                // merchant_uid를 카페24 주문 ID로 사용
                "order_id": merchant_uid,
                "member_id": "guest",
                "items": [{
                    "product_no": productNo,
                    "variant_code": variantCode,
                    "quantity": 1
                }],
                "payment_method_code": "card",
                "payment_amount": totalPrice,
                "buyer_name": buyerName,
                "buyer_phone": buyerPhone,
                "buyer_email": buyerEmail,
                "receiver_name": buyerName,
                "receiver_phone": buyerPhone,
                "receiver_address1": buyerAddr,
                "receiver_zipcode": buyerPostcode,
                "payment_type": "P",
                "payment_gateway_code": "inicis",
                "status": "N00"
            }
        };

        await axios({
            url: `https://${CAFE24_STORE_URL}/api/v2/admin/orders`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAFE24_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: cafe24OrderPayload
        });

        console.log(`[${logTime}] 카페24 주문 생성 성공: 주문번호=${merchant_uid}`);
        res.status(200).json({ success: true, message: '결제 대기 주문 생성 성공', order_id: merchant_uid });

    } catch (error: any) {
        // ⭐ 서버에서 받은 상세 에러 메시지를 콘솔에 출력
        console.error(`[${logTime}] 카페24 주문 생성 중 오류 발생:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        res.status(500).json({ success: false, message: '서버 오류로 주문 생성에 실패했습니다.' });
    }
};
