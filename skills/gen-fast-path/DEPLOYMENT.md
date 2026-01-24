# Gen Fast Path — Deployment Guide

## Quick Links

- **GitHub:** https://github.com/evgyur/clawdbot/tree/main/skills/gen-fast-path
- **Commit:** 12367bcb3

---

## ✅ Готово и закоммичено

### Что в репозитории

```
skills/gen-fast-path/
├── README.md                   # Полная документация для GitHub
├── SKILL.md                    # Метаданные для Clawdbot
├── DEPLOYMENT.md               # Этот файл
├── scripts/
│   ├── apply-patch.sh          # Автоматическая установка патча
│   ├── update-cache.sh         # Обновление кеша моделей
│   ├── rollback.sh             # Откат патча
│   └── verify.sh               # Проверка установки
└── cache/
    └── gen-cache.json          # Кеш 23 UI команд
```

---

## 🚀 Установка на новой системе

### Option 1: Из Git репозитория

```bash
# 1. Клонировать репозиторий (если ещё нет)
git clone https://github.com/evgyur/clawdbot.git ~/clawd

# 2. Применить патч
cd ~/clawd/skills/gen-fast-path
bash scripts/apply-patch.sh

# 3. Проверить
bash scripts/verify.sh
```

### Option 2: Только skill (без полного repo)

```bash
# 1. Скачать skill
mkdir -p ~/clawd/skills
cd ~/clawd/skills
git clone --depth 1 --filter=blob:none --sparse https://github.com/evgyur/clawdbot.git temp
cd temp
git sparse-checkout set skills/gen-fast-path
mv skills/gen-fast-path ../
cd ..
rm -rf temp

# 2. Применить патч
cd gen-fast-path
bash scripts/apply-patch.sh
```

---

## 🔄 Обновление существующей установки

### При апдейте chip-fai моделей

```bash
cd ~/clawd/skills/gen-fast-path
git pull
bash scripts/update-cache.sh
systemctl --user restart clawdbot-gateway
```

### При апдейте Clawdbot

После `npm install -g clawdbot@latest`:

```bash
cd ~/clawd/skills/gen-fast-path
bash scripts/apply-patch.sh  # Переприменить патч
```

---

## 📝 Инструкции для новых моделей chip-fai

### Когда добавляешь модель в models.yaml

1. **Добавь модель в chip-fai:**
   ```bash
   nano ~/clawd/skills/chip-fai/models.yaml
   # Добавить новую модель
   ```

2. **Обнови кеш gen-fast-path:**
   ```bash
   cd ~/clawd/skills/gen-fast-path
   bash scripts/update-cache.sh
   ```

3. **Проверь кеш:**
   ```bash
   cat cache/gen-cache.json | jq 'keys | map(select(startswith("model:"))) | length'
   # Должно показать количество моделей
   ```

4. **Перезапусти Clawdbot:**
   ```bash
   systemctl --user restart clawdbot-gateway
   ```

5. **Тест:**
   - Отправь `/gen` в Telegram
   - Выбери категорию где новая модель
   - Проверь что кнопка появляется
   - Нажми на модель → должно прийти "Send your text prompt" мгновенно

### Когда добавляешь новую категорию

1. **Добавь категорию в router.py:**
   ```bash
   nano ~/clawd/skills/chip-fai/scripts/router.py
   # Добавить обработчик новой категории
   ```

2. **Обнови кеш:**
   ```bash
   cd ~/clawd/skills/gen-fast-path
   bash scripts/update-cache.sh
   ```

   Скрипт автоматически найдёт все категории через вызовы router.py.

3. **Вручную добавь кнопку в /gen:**
   ```bash
   nano cache/gen-cache.json
   ```

   В секции `"/gen"` → `"buttons"` добавь:
   ```json
   {"text": "🆕 Новая Категория", "callback_data": "category:new"}
   ```

4. **Скопируй в deployment:**
   ```bash
   cp cache/gen-cache.json ~/.clawdbot/extensions/gen-fast-path/gen-cache.json
   systemctl --user restart clawdbot-gateway
   ```

---

## 🔧 Патчинг новых версий Clawdbot

### При мажорном обновлении Clawdbot

Если структура `bot-handlers.js` сильно изменилась:

1. **Проверь текущий патч:**
   ```bash
   cd ~/clawd/skills/gen-fast-path
   bash scripts/verify.sh
   ```

2. **Если патч не применяется автоматически:**

   **Вариант A: Ручное применение**
   ```bash
   nano ~/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js
   ```

   Добавь код вручную (см. `README.md` → "Что патчится").

   **Вариант B: Создай новый патч**
   ```bash
   # 1. Найди новую структуру bot-handlers.js
   grep -n "bot.on.*callback" ~/.nvm/.../bot-handlers.js
   
   # 2. Адаптируй apply-patch.sh под новую структуру
   nano scripts/apply-patch.sh
   
   # 3. Протестируй
   bash scripts/apply-patch.sh
   ```

3. **Закоммить обновлённый патч:**
   ```bash
   cd ~/clawd
   git add skills/gen-fast-path/scripts/apply-patch.sh
   git commit -m "fix(gen-fast-path): adapt patch for Clawdbot vX.X.X"
   git push
   ```

---

## 🧪 Testing Checklist

После установки или обновления:

- [ ] `bash scripts/verify.sh` → всё ✅
- [ ] `/gen` в Telegram → кнопки <500ms
- [ ] Клик на категорию → модели <500ms
- [ ] Клик на модель → "Send prompt" <500ms
- [ ] Отправка промпта → генерация работает
- [ ] `journalctl --user -u clawdbot-gateway --since '5 min ago'` → нет ошибок

---

## 📦 Release Workflow

### Создание нового релиза

1. **Обновить версию:**
   ```bash
   nano SKILL.md
   # Добавить в Changelog
   ```

2. **Тестирование:**
   ```bash
   bash scripts/apply-patch.sh
   bash scripts/verify.sh
   # Test в Telegram
   ```

3. **Коммит:**
   ```bash
   git add skills/gen-fast-path/
   git commit -m "release(gen-fast-path): v1.1.0

   - Добавлена поддержка новых моделей
   - Улучшена производительность кеша
   - Исправлены баги в update-cache.sh"
   git push
   ```

4. **Tag (опционально):**
   ```bash
   git tag -a gen-fast-path-v1.1.0 -m "Gen Fast Path v1.1.0"
   git push --tags
   ```

---

## 🐛 Known Issues

### Issue: Патч не применяется на WSL

**Проблема:** `sed` и файлы в `~/.nvm/` могут быть read-only в WSL.

**Решение:** Применяй патч вручную:
1. Открой `bot-handlers.js` через `nano` (работает)
2. Следуй инструкции из `README.md` → "Что патчится"

### Issue: Cache не загружается

**Проблема:** Путь к кешу неправильный в `bot-handlers.js`.

**Решение:**
```bash
grep "cachePath" ~/.nvm/.../bot-handlers.js
# Должно быть: process.env.HOME + '/clawd/.clawdbot/extensions/gen-fast-path/gen-cache.json'
```

Если неправильно — исправь вручную.

---

## 📞 Support

- **Issues:** https://github.com/evgyur/clawdbot/issues
- **Telegram:** [@ChipCR](https://t.me/ChipCR)
- **Docs:** см. `README.md` в этой папке

---

## ✅ Status

**Current version:** v1.0.0  
**Commit:** 12367bcb3  
**Tested on:** Clawdbot 2026.1.22, Node.js v22.22.0  
**Status:** ✅ Production ready
