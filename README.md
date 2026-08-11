# Sampense

개인용 AI 가계부 PWA 초안.

## 포함 기능

- Daily / Weekly / Monthly 3페이지
- 좌우 스와이프로 페이지 이동
- IndexedDB(Dexie) 로컬 저장
- 카테고리별 Daily / Weekly / Monthly / None 예산 주기
- Variable / Fixed / Planned 소비 타입
- Daily 직접 지출 추가 / 수정 / 삭제
- Gemini 텍스트 지출 분류
- Gemini 카드 결제내역 스크린샷 추출 + 저장 전 검수
- merchant → category 로컬 학습
- Weekly 소비 흐름 / 예산 요약
- Monthly 총수입 / 총지출 / 잔액 / Heatmap
- Monthly Fixed & Planned
- Monthly 1080×1350 PNG 캡처
- 테마 색 변경
- JSON 백업
- Vercel Functions로 Gemini API Key 숨김

## 1. 설치

```bash
npm install
```

## 2. 일반 UI 실행

```bash
npm run dev
```

Vite만 실행하면 화면/IndexedDB 기능은 쓸 수 있지만 `/api/*` Vercel Function은 로컬에서 실행되지 않는다.

AI 기능까지 로컬 테스트하려면 Vercel CLI로 실행하는 편이 간단하다.

```bash
npx vercel dev
```

## 3. Gemini 환경변수

루트에 `.env.local` 또는 Vercel Project Settings에 다음 값을 설정한다.

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

`GEMINI_API_KEY` 앞에 `VITE_`를 붙이지 않는다. `VITE_` 변수는 브라우저 번들에서 접근 가능한 값으로 쓰이므로 API Key 보관 용도로 사용하면 안 된다.

## 4. 빌드

```bash
npm run build
```

## 5. Vercel

GitHub에 push하고 Vercel에서 Vite 프로젝트로 Import하면 된다.
루트 `api/classify.ts`, `api/import-image.ts`가 Vercel Functions가 된다.

Vercel 환경변수에 `GEMINI_API_KEY`를 추가한 뒤 재배포한다.

## 폴더 구조

```text
Sampense/
├─ api/
│  ├─ _gemini.ts
│  ├─ classify.ts
│  └─ import-image.ts
├─ public/
│  ├─ icon.svg
│  └─ manifest.webmanifest
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ utils/
│  ├─ App.tsx
│  ├─ db.ts
│  ├─ index.css
│  ├─ main.tsx
│  ├─ theme.ts
│  └─ types.ts
├─ .env.example
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 데이터 주의

거래/수입/카테고리 데이터는 브라우저 IndexedDB에 저장된다.
휴대폰 Safari 데이터 삭제나 사이트 데이터 초기화 시 사라질 수 있으므로 Menu > EXPORT JSON으로 가끔 백업하는 것을 권장한다.

AI 버튼을 사용한 입력 텍스트와 업로드한 결제 스크린샷은 분류를 위해 Gemini API로 전송된다.

## Gemini API Key 발급 + Vercel 연결

### Google AI Studio에서 키 만들기

1. Google AI Studio에 로그인한다.
2. Dashboard에서 **API Keys**로 이동한다.
3. **Create API key**를 누른다.
4. 사용할 Google Cloud project를 선택하거나 새 project를 만든다.
5. 생성된 키를 복사한다.

2026년 기준 새로 만드는 Gemini API key는 authorization key가 기본이다. 키 문자열 자체는 GitHub나 프런트엔드 코드에 넣지 않는다.

### Vercel에 키 넣기

1. Vercel Dashboard에서 Sampense project를 연다.
2. **Settings → Environment Variables**로 이동한다.
3. Name에 `GEMINI_API_KEY`, Value에 위에서 복사한 키를 넣는다.
4. Production / Preview / Development 중 필요한 환경을 선택한다. 개인용이면 세 환경 모두 적용해도 된다.
5. Save 후 **Redeploy**한다. 기존 deployment에는 새 환경변수가 자동 반영되지 않는다.

선택 사항으로 `GEMINI_MODEL=gemini-3.6-flash`도 같은 방식으로 추가할 수 있다. 생략하면 서버 코드의 기본값을 사용한다.

휴대폰 Safari/PWA가 API key를 직접 가져오는 구조는 아니다.

```text
휴대폰 Sampense
      ↓
/api/classify 또는 /api/import-image
      ↓
Vercel Function
      ↓  process.env.GEMINI_API_KEY
Gemini API
```

따라서 iPhone에 별도로 API key를 저장하거나 설정할 필요가 없다.
