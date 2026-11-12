# Supabase 연결

1. 기존 `app_records`에 필요한 열과 사용자별 RLS가 없다면 `supabase/setup.sql`을 SQL Editor에서 실행합니다.
2. Authentication → URL Configuration에서 실제 서비스 주소를 Site URL과 Redirect URLs에 등록합니다. 로컬 개발 주소도 Redirect URLs에 등록합니다.
3. `.env.local` 및 Vercel에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정합니다. 기존 `GEMINI_API_KEY` 설정은 유지합니다. Vercel 변경 후 다시 배포합니다.
4. 기존 데이터가 있는 브라우저의 기존 서비스 주소에서 로그인하고 **이 기기 데이터 백업 후 이전**을 선택합니다. 다운로드한 JSON을 보관합니다. 다른 기기는 같은 계정으로 로그인 후 **클라우드 가계부 열기**를 선택합니다.

## 저장 방식

기존 7개 저장소와 숫자 ID를 유지하기 위해 `app_records`의 `store_name=__ledger__`, `record_key=v1` 한 행에 전체 가계부와 임의 revision을 저장합니다. 행 개수는 지출 건수가 아니며 payload.data.transactions 등을 확인하세요. 기존 예시의 개별 행 방식과는 다릅니다. 데이터가 커지면 행별 저장 모델로 전환해야 합니다.

5초 간격, 창 재활성화, 온라인 복귀 시 동기화합니다. 실시간 구독은 사용하지 않습니다. 로컬 저장은 즉시 반영되고 네트워크 오류 시 다음 주기에 재시도합니다. 로컬 데이터와 마지막 클라우드 기준은 IndexedDB에 함께 보관되어 재시작 후에도 복구됩니다. 계정마다 별도 DB를 사용하고 기존 SampenseDB는 삭제하지 않습니다. 여러 탭의 동기화는 Web Locks로 직렬화합니다(HTTPS 또는 localhost 필요).

서로 다른 항목 변경은 3방향 병합합니다. 같은 항목 수정/삭제와 숫자 ID 충돌은 자동 덮어쓰지 않습니다. 새 항목에는 기기별 무작위 안전 정수 ID를 부여하여 충돌 가능성을 줄입니다. 기존 ID와 삭제된 분류를 참조하는 과거 지출 표시 방식은 유지합니다. 충돌 시 로컬 JSON을 백업한 후 클라우드 버전을 선택하고 필요한 로컬 수정은 다시 입력하세요. 백업은 syncMeta에도 보관됩니다. 여러 기기에 이미 서로 다른 데이터가 있는 경우 자동 최초 병합은 하지 않습니다. 먼저 각각 백업하세요.

클라우드 저장은 revision 조건부 갱신을 사용하여 오래된 기기가 최신 데이터를 덮어쓰지 못하게 합니다. 삭제는 스냅샷의 부재로 표현하며 기준 버전과 비교하므로 오래된 기기의 데이터가 자동으로 부활하지 않습니다. RESET APP은 계정 전체로 동기화됩니다.

## 실제 계정 확인

회원가입/이메일 확인 → 기존 기기 이전 → 동기화 확인 → 두 번째 기기로 로그인 → 지출/예산/분류/수입 비교 → 추가/수정/삭제 양방향 확인 → 오프라인 변경 후 재접속 → 같은 항목 동시 변경 시 충돌 확인. 다른 계정에서 첫 계정의 데이터가 보이지 않는지도 확인하세요.

인증된 실제 기기 테스트와 서버 RLS 설정은 로컬 빌드만으로 검증할 수 없습니다.

API 참고: https://supabase.com/docs/reference/javascript/update
RLS 참고: https://supabase.com/docs/guides/database/postgres/row-level-security
