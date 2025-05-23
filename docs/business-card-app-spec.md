# 명함관리 웹앱 개발 명세서

## 1. 프로젝트 개요
- 전문적이고 고급스러운 명함관리 웹앱
- 한 화면(One Page) 내 자료 입력 섹션 + 명함카드 섹션

## 2. 주요 기능
- 명함 정보 입력(이름, 전화번호, 이메일, 우편번호, 주소)
- 명함카드 레이아웃(리스트 아님)
- 실시간 검색/필터링
- 카드별 부드러운 애니메이션 효과
- 다크모드/라이트모드 전환
- 명함 정보 복사/공유 버튼
- 프로필 사진/회사 로고 이미지 업로드
- 반응형 디자인(모바일/데스크탑)
- 명함 즐겨찾기/중요 표시
- 명함 삭제/수정
- 입력폼 자동완성 및 유효성 검사

## 3. 추천 디자인 스타일
- 모던 머티리얼(Material) + 미니멀리즘
- 카드 UI, 그림자, 레이어, 부드러운 트랜지션
- 넓은 여백, 심플한 컬러, 명확한 타이포그래피
- 브랜드 컬러 및 아이덴티티 반영

## 4. 기술 스택(예시)
- React(Next.js), TypeScript
- Tailwind CSS, Framer Motion(애니메이션)
- Supabase(백엔드/DB)
- Material Icons, Heroicons

## 5. 주요 UI/UX
- 입력폼: 상단 고정, 명확한 유효성 검사
- 명함카드: 그리드 레이아웃, 카드별 애니메이션
- 검색: 입력 즉시 필터링, 하이라이트 표시
- 다크/라이트 모드: 토글 스위치, 시스템 연동
- 반응형: 모바일/데스크탑 모두 최적화

## 6. 페이지 구조(One Page)
- 상단: 앱 타이틀, 다크/라이트 토글
- 좌측/상단: 명함 입력폼
- 중앙/하단: 명함카드 그리드
- 우측/상단: 검색바

## 7. 애니메이션/트랜지션
- 카드 추가/삭제/검색 시 부드러운 효과
- 입력폼/카드 hover, focus, active 상태 트랜지션

## 8. 접근성
- 키보드 네비게이션, 명확한 포커스 표시
- 충분한 명도 대비, 스크린리더 지원

## 9. 기타
- 민감 정보 보호, 불필요한 파일/디버깅 코드 금지
- 코드 일관성(Prettier, ESLint) 