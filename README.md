# 과외 정산

선입금 받은 과외비를 수업할 때마다 깎아 나가는 앱. Expo(React Native).

**아이폰에서 쓰는 주소: https://qaz083.github.io/tutoring-pay/**
Safari로 열고 `공유 → 홈 화면에 추가`를 하면 홈 화면 아이콘이 생기고, 주소창 없이 앱처럼 뜬다.

## 실행

```bash
npm install
npm run ios       # 시뮬레이터
npm start         # Expo Go (아이폰과 맥이 같은 와이파이여야 한다)
npm test          # 정산 계산 테스트
```

## 웹으로 배포

`docs/`를 GitHub Pages가 그대로 서빙한다. 코드를 고친 뒤:

```bash
npm run build:web
git add docs && git commit -m "chore: 웹 빌드 갱신" && git push
```

`scripts/build-web.mjs`가 번들을 만들고 홈 화면 앱용 설정(전체화면 메타 태그, 아이콘,
오프라인 서비스 워커)을 심는다. 서비스 워커 덕에 **한 번 연 뒤에는 인터넷 없이도 열린다.**

> 경로 주의: `app.json`의 `experiments.baseUrl`이 `/tutoring-pay`로 잡혀 있다.
> 저장소 이름을 바꾸면 이 값과 `scripts/build-web.mjs`의 `BASE`를 같이 고쳐야 한다.

## 네이티브 앱으로 설치하려면

`ios/`는 커밋하지 않는다 (`npx expo prebuild -p ios`로 언제든 다시 만든다).
실기기 설치는 **기기의 iOS 버전을 지원하는 Xcode**가 필요하다 — iOS 26 기기라면 Xcode 26 이상.
무료 Apple ID로 서명하면 7일마다 다시 설치해야 한다.

## 정산 규칙

이 앱이 지키는 규칙은 셋뿐이고, 전부 `test/model.test.mjs`에 케이스로 고정돼 있다.

1. **수업은 완료와 예정으로 나뉜다.**
   - `확정 잔액` = 입금액 − 완료한 수업
   - `예정 반영` = 확정 잔액 − 잡혀 있는 예정 수업
   선입금이라 실제로 봐야 하는 숫자는 두 번째다. 이게 마이너스면 돈을 더 받아야 한다.

2. **시급은 수업을 기록할 때 그 값이 박제된다.** 나중에 시급을 올려도 지난 수업은
   그때 시급으로 계산된다. "남은 시간"만 현재 시급으로 환산한다.

3. **상태가 없던 옛 기록은 완료로 본다.** (`normalize()`)

## 구조

```
App.js                메인 화면 — 학생 선택, 요약, 달력, 수업/입금 목록
src/model.js          계산과 변환. 화면을 모르는 순수 함수만 둔다
src/storage.js        AsyncStorage 읽기/쓰기
src/theme.js          라이트·다크 색상
src/ui.js             Btn, Input, Sheet 같은 공용 조각
src/MonthCalendar.js  월 달력 (보기 모드 / 날짜 여러 개 고르기 모드)
src/DaySheet.js       날짜 하나의 수업·입금 기록
src/StudentSheet.js   학생 추가·수정
src/BulkSheet.js      수업 일정 한번에 추가
```

`model.js`는 일부러 React를 import하지 않는다. 그래야 Node에서 그대로 테스트할 수 있다
(`test/load-model.mjs`가 메모리에서 불러온다).

## 데이터

기기 안(AsyncStorage)에만 저장된다. 서버도 계정도 없다.
**앱을 지우면 기록도 같이 사라진다.**
