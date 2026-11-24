# Payverse 통신 설정 확인 기록

확인일: 2026-11-24 (한국 시간)
공식 출처: https://docs.payverseglobal.com/ko/apisdk/v1.0.0/integration-pre-check/network-configuration/

## 공식 문서 요약

- API 통신은 HTTPS, 443 포트 및 TLS 1.2 이상을 사용한다.
- 운영 송신 대상: https://pay.payverseglobal.com
- 테스트 송신 대상: https://pay-snd.payverseglobal.com
- Webhook 수신 허용 IP: 운영 182.162.130.11, 테스트 182.162.130.21.
- 승인·취소 결과는 Webhook으로 전달될 수 있으므로 거래 요청에 Webhook URL을 포함해야 한다. 비동기 결제 결과 처리를 위해 Webhook 연동을 권장한다.

## PATZCOM 현재 확인 상태

- 기존 코드의 요청 Webhook URL: https://www.patzcom.com/api/payverse/webhook
- 기존 코드의 리턴 URL: https://www.patzcom.com/api/payverse/return
- Railway patzcom은 PAYVERSE_ENV=sandbox 설정 상태로 확인되었다.
- 별도 partscombined-payverse/payverse-api 서비스에도 환경·리턴·웹훅 변수는 있으나 MID·Client Key·Secret Key는 CLI 확인에서 발견되지 않았다.
- 실제 Railway 컨테이너 송신 통신, Cloudflare/WAF 수신 허용, Payverse에서 발생한 Webhook 수신은 아직 검증하지 않았다.
- 이 문서는 통신 요구사항이다. 서류 제출 전 테스트 키 발급 가능 여부나 환불 API 구현 완료를 증명하지 않는다.
- 실제 샌드박스 결제·환불은 미진행이며 성공 거래를 생성하거나 관리자 결제 이력에 추가하지 않았다.

## 다음 검증 항목

추가 코드 점검: 현재 recordPayverseResult는 SUCCESS 응답을 결제 완료로 저장하지만 공급자 응답의 진위 확인 코드가 확인되지 않았다. 키 등록 후 운영 활성화 전 공식 서명 검증 또는 서버 거래 조회를 구현·검증해야 한다. Payverse 환불 기능도 별도 공식 명세 대조와 구현 확인이 필요하다. 기존 문구의 '결과 처리 완료'를 결제 보안·환불까지 검증 완료로 해석하면 안 된다.

키 없이 가능한 준비: PayPal 옆 Payverse 준비 중 버튼 표시 변경, 누락 키에 따른 결제 요청 차단과 sandbox SDK 선택을 검증하는 scripts/test-payverse-readiness.mjs 추가. 이 검증은 PG 승인·환불 거래 테스트가 아니다.

1. Payverse 발급 샌드박스 MID·Client Key·Secret Key 등록.
2. Railway에서 테스트 API HTTPS 송신 및 SDK 로드 확인.
3. Cloudflare/WAF에서 공식 테스트 Webhook IP의 수신 차단 여부 확인.
4. 공식 환불 API 명세와 서버 구현을 대조하고 승인 결과·금액·서명을 검증.
5. 샌드박스 승인과 취소를 수행하고 관리자에 테스트 표시, 거래번호, 금액, 처리시각과 상태를 저장·확인.
