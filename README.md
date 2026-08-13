# Mini-Game
미니게임천국

## 분리 배포 설정

프론트는 `public/config.js`의 `backendUrl`에 Render 백엔드 주소를 입력합니다.
프론트에는 별도 환경변수가 필요하지 않습니다.

백엔드 환경변수는 다음처럼 설정합니다.

```env
KOREAN_DICT_API_KEY=발급받은_인증키
FRONTEND_URL=https://your-frontend.vercel.app
DEVELOPER_PHONE=선택사항
```

`PORT`는 Render가 자동으로 주입하므로 직접 설정하지 않아도 됩니다.
