import axios from 'axios';

const IMP_API_KEY = process.env.IMP_API_KEY;
const IMP_API_SECRET = process.env.IMP_API_SECRET;
const CAFE24_ACCESS_TOKEN = process.env.CAFE24_ACCESS_TOKEN;
const CAFE24_STORE_URL = process.env.CAFE24_STORE_URL;

export default async (req: any, res: any) => {
    const logTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(`[${logTime}] 서버리스 함수 호출 시작`);

    const { imp_uid, merchant_uid, totalPrice } = req.body;
    if (!imp_uid || !merchant_uid) {
        console.error(`[${logTime}] 필수 정보 누락: imp_uid=${imp_uid}, merchant_uid=${merchant_uid}`);
        return res.status(400).json({ success: false, message: '필수 정보 누락' });
    }

    try {
        const getToken = await axios({
            url: "https://api.iamport.kr/users/getToken",
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: { imp_key: IMP_API_KEY, imp_secret: IMP_API_SECRET }
        });
        const { access_token } = getToken.data.response;
        console.log(`[${logTime}] 포트원 액세스 토큰 발급 완료`);

        const getPaymentData = await axios({
            url: `https://api.iamport.kr/payments/${imp_uid}`,
            method: "get",
            headers: { "Authorization": access_token }
        });
        const paymentData = getPaymentData.data.response;
        console.log(`[${logTime}] 포트원 결제 정보 조회 완료: merchant_uid=${paymentData.merchant_uid}, status=${paymentData.status}`);

        if (paymentData.status === 'paid') {
            if (paymentData.amount !== parseInt(String(totalPrice), 10)) {
                await axios({
                    url: "https://api.iamport.kr/payments/cancel",
                    method: "post",
                    headers: { "Authorization": access_token },
                    data: { reason: "금액 불일치", imp_uid: imp_uid }
                });
                console.error(`[${logTime}] 금액 불일치로 결제 취소: imp_uid=${imp_uid}`);
                return res.status(400).json({ success: false, message: '결제 금액 불일치' });
            }

            await axios({
                url: `https://${CAFE24_STORE_URL}/api/v2/admin/orders/${merchant_uid}`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${CAFE24_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                data: { "order": { "status": "C00" } }
            });
            console.log(`[${logTime}] 카페24 주문 업데이트 성공: 주문번호=${merchant_uid}, 상태=결제 완료`);
            res.status(200).json({ success: true, message: '주문 처리가 완료되었습니다.', order_id: merchant_uid });

        } else {
            await axios({
                url: `https://${CAFE24_STORE_URL}/api/v2/admin/orders/${merchant_uid}`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${CAFE24_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                data: { "order": { "status": "F00" } }
            });
            console.log(`[${logTime}] 카페24 주문 업데이트 성공: 주문번호=${merchant_uid}, 상태=결제 실패`);
            res.status(400).json({ success: false, message: `결제 실패: ${paymentData.fail_reason}` });
        }
    } catch (error: any) {
        console.error(`[${logTime}] 주문 처리 중 오류 발생:`, error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: '서버 오류로 주문 처리에 실패했습니다.' });
    }
};
