# 소복소복

친구의 크리스마스 트리에 오너먼트와 편지를 남기는 모바일 웹 방명록입니다. Figma 초안의 트리, 배경 15종, 오너먼트 6종을 사용했습니다.

## 로컬 체험

Node.js가 설치된 환경에서 `npm run dev`를 실행한 뒤 브라우저에서 `http://127.0.0.1:4173/?demo=1`을 엽니다. 샘플 트리에 편지를 쓰고 내 트리를 만들어 볼 수 있으며, 변경 사항은 같은 브라우저에 저장됩니다. `npm run check`로 JS 문법을 검사합니다.

## Firebase Spark 연결

웹 앱 `Sobok Tree`를 `x-mas-tree-4557e`에 등록했습니다. 웹 SDK 설정은 `public/firebase-config.js`에 연결했고, 서울 리전의 Standard 기본 Firestore에 `firestore.rules`를 배포했습니다.

1. [Firebase Authentication](https://console.firebase.google.com/project/x-mas-tree-4557e/authentication/providers)의 **시작하기**를 누른 뒤 Sign-in method에서 **Google**과 **Anonymous**를 켭니다. Google 제공자를 켤 때 프로젝트 지원 이메일을 선택합니다. 트리 주인은 Google 계정으로 로그인하며, 방문자는 처음 편지를 달 때 익명 인증됩니다. 주인은 같은 Google 계정으로 다른 기기에서 자기 트리를 열 수 있습니다.
2. Authentication → Settings → Authorized domains에 실제 `.vercel.app` 주소의 호스트를 추가합니다. 로컬에서 Google 로그인을 시험할 때는 `localhost`도 추가하고 `http://localhost:4173`에서 엽니다. 방문자용 링크를 공유하기 전에 시크릿 창에서 편지 작성과 작성자 이동, 주인 계정에서 전체 이동과 새로고침 후 위치 유지를 확인합니다.

향후 규칙 변경은 `firebase deploy --only firestore:rules --project x-mas-tree-4557e`로 적용합니다.

트리 링크를 아는 사람은 트리와 편지를 읽을 수 있습니다. 공유 링크에 로그인이나 비밀 번호가 필요하지 않으므로 편지에는 공개 가능한 내용을 적어주세요. 주인만 조명을 바꿀 수 있고, 위치 변경은 트리 주인과 각 편지의 작성자에게 허용됩니다. 방문자가 다른 기기나 다른 세션을 사용하면 기존 익명 작성자 권한을 이어받을 수 없습니다.

## Vercel 배포

Firebase 웹 설정을 넣은 뒤 Vercel Hobby에서 이 저장소를 Import합니다. Framework Preset은 **Other**를 선택합니다. `vercel.json`이 정적 출력 폴더 `public`을 지정하므로 빌드 명령은 비워 둡니다. 배포 URL을 받은 뒤 Firebase Authorized domains에 해당 호스트를 추가합니다.

트리 공유는 기기의 공유 메뉴 또는 링크 복사를 사용합니다. 공유 링크의 Open Graph 제목과 설명은 서비스 공통입니다. 트리 사진에는 화면에 불러온 오너먼트가 들어가며, 더 오래된 오너먼트까지 담으려면 먼저 이전 편지를 불러옵니다.

## 무료 한도와 유입 추정

- Firestore Spark는 읽기 50,000건/일, 쓰기 20,000건/일, 저장 1 GiB, 전송 10 GiB/월입니다. 쿼리는 최신 편지를 12개씩 가져오고, 실시간 구독을 사용하지 않습니다. 드래그는 끝날 때 한 번만 위치를 씁니다. 편지 작성은 한 번의 쓰기와 허용된 오너먼트 종류를 확인하는 규칙의 추가 읽기가 발생합니다.
- 편지가 12개 이상인 트리는 첫 방문에 최대 13건을 읽습니다. 같은 조건으로 약 3,800회 열면 하루 읽기 50,000건에 가까워집니다. 더 보기, 재접속, 쓰기 검증이 함께 발생하면 실제 여유는 줄어듭니다. 이 수치는 부하 테스트 결과가 아닌 쿼리 수 기반 추정입니다.
- Vercel Hobby는 개인 비상업 프로젝트에 사용할 수 있으며 Fast Data Transfer는 월 100 GB입니다. Vercel은 HTML, CSS, JS, 이미지 파일을 제공합니다. 인증과 데이터 트래픽은 Firebase가 처리합니다. 유입이 한 날짜에 집중되면 Vercel 월간 전송량보다 Firestore 일일 읽기를 먼저 확인하세요.
- 공식 문서 [Firestore 한도](https://firebase.google.com/docs/firestore/quotas), [Firestore 사용량 계산](https://firebase.google.com/docs/firestore/pricing), [Firebase Auth 한도](https://firebase.google.com/docs/auth/limits), [Vercel Hobby 이용 기준](https://vercel.com/docs/limits/fair-use-guidelines).

