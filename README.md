# 과외 정산

선입금 받은 과외비를 수업할 때마다 깎아 나가는 아이폰 앱. Expo(React Native).

## 실행

```bash
npm install
npm run ios
```

시뮬레이터가 뜨고 Expo Go 안에서 앱이 열린다. 아이폰 실기기로 보려면 `npm start` 후
터미널의 QR을 아이폰 카메라로 찍는다 (맥과 아이폰이 같은 와이파이에 있어야 한다).

```bash
npm test    # 정산 계산 테스트
```

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
