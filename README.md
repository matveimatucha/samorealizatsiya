# Самореализация

Личный сайт: to-do лист с ежедневной самооценкой и календарём.

## Запуск

```bash
npm install
cp .env.example .env   # заполни Firebase-ключи для синхронизации
npm run dev
```

## Возможности

### Задачи
- Добавление задач с дедлайном
- Ежедневный опрос прогресса (0–100%)
- История оценок, фильтры

### Календарь
- Виды: день / неделя / месяц
- События с временем, повторение каждую неделю
- Клик по слоту — создать событие

### Синхронизация
- Вход через Google — одни и те же данные на телефоне и компьютере
- Автосохранение в облако (Firebase)
- Без входа данные остаются локально в браузере

## Настройка Firebase (один раз)

1. Создай проект на [console.firebase.google.com](https://console.firebase.google.com)
2. **Build → Firestore Database → Create database** (режим production, регион ближе к тебе)
3. **Build → Authentication → Sign-in method → Google → Enable**
4. **Project Settings → Your apps → Web** — зарегистрируй приложение, скопируй config
5. Заполни `.env` по образцу `.env.example`
6. **Firestore → Rules** — вставь правила (только свой аккаунт):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

7. **Authentication → Settings → Authorized domains** — добавь `matveimatucha.github.io`

### GitHub Pages (секреты)

В репозитории: **Settings → Secrets and variables → Actions** — добавь:
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

## Сайт

https://matveimatucha.github.io/samorealizatsiya/
