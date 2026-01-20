# Clawdbot - Полная документация

## 📖 Содержание

1. [Описание](#описание)
2. [Быстрый старт](#быстрый-старт)
3. [Управление сервисами](#управление-сервисами)
4. [Команды](#команды)
5. [Интеграции](#интеграции)
6. [Обновление](#обновление)
7. [Конфигурация](#конфигурация)
8. [Устранение проблем](#устранение-проблем)
9. [Мониторинг и логи](#мониторинг-и-логи)

---

## Описание

**Clawdbot** - AI-ассистент на базе Claude (Anthropic), работающий через Telegram и другие каналы. Бот поддерживает голосовое взаимодействие, управление браузером, интеграцию с Gmail и другие функции.

### Основные возможности

- 🤖 **Telegram бот** - основной канал взаимодействия
- 🎤 **Голосовое взаимодействие** - через ElevenLabs API
- 🌐 **Управление браузером** - автоматизация веб-задач
- 📧 **Gmail интеграция** - мониторинг и обработка писем
- 🎨 **Canvas** - интерактивный интерфейс
- 🔄 **Автозапуск** - работает в фоне, запускается после перезагрузки

---

## Быстрый старт

### Текущая конфигурация

- **Версия**: 2026.1.16-2
- **Workspace**: `/home/eyurc/clawd`
- **Конфигурация**: `~/.clawdbot/clawdbot.json`
- **Gateway**: `ws://127.0.0.1:18789`
- **Dashboard**: http://127.0.0.1:18789/
- **Canvas**: http://127.0.0.1:18789/__clawdbot__/canvas/

### Проверка статуса

```bash
# Быстрая проверка
/home/eyurc/clawd/manage-clawdbot.sh status

# Или через systemctl
systemctl --user status clawdbot-gateway.service

# Или через Clawdbot CLI
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
clawdbot daemon status
```

---

## Управление сервисами

### Использование скрипта управления (рекомендуется)

```bash
/home/eyurc/clawd/manage-clawdbot.sh [команда]
```

#### Доступные команды:

| Команда | Описание |
|---------|----------|
| `start` | Запустить все сервисы |
| `stop` | Остановить все сервисы |
| `restart` | Перезапустить все сервисы |
| `status` | Показать статус всех сервисов |
| `logs` | Показать логи Gateway (в реальном времени) |
| `logs-gmail` | Показать логи Gmail Webhooks (в реальном времени) |
| `enable-gmail` | Установить и запустить Gmail Webhooks сервис |

#### Примеры:

```bash
# Запустить бота
/home/eyurc/clawd/manage-clawdbot.sh start

# Остановить бота
/home/eyurc/clawd/manage-clawdbot.sh stop

# Перезапустить бота
/home/eyurc/clawd/manage-clawdbot.sh restart

# Проверить статус
/home/eyurc/clawd/manage-clawdbot.sh status

# Смотреть логи
/home/eyurc/clawd/manage-clawdbot.sh logs
```

### Прямое управление через systemctl

```bash
# Gateway сервис
systemctl --user start clawdbot-gateway.service
systemctl --user stop clawdbot-gateway.service
systemctl --user restart clawdbot-gateway.service
systemctl --user status clawdbot-gateway.service

# Gmail Webhooks сервис (если установлен)
systemctl --user start clawdbot-gmail-webhooks.service
systemctl --user stop clawdbot-gmail-webhooks.service
systemctl --user restart clawdbot-gmail-webhooks.service
systemctl --user status clawdbot-gmail-webhooks.service
```

### Управление через Clawdbot CLI

```bash
# Настройка окружения
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22

# Управление daemon
clawdbot daemon start      # Запустить
clawdbot daemon stop       # Остановить
clawdbot daemon restart    # Перезапустить
clawdbot daemon status     # Статус
```

---

## Команды

### Telegram команды

В Telegram боте доступны следующие команды:

- `/start` - Начать работу с ботом
- `/status` - Проверить статус подключения
- `/new` - Начать новую беседу
- `/think <level>` - Установить глубину мышления
- `/usage` - Показать статистику использования

### Clawdbot CLI команды

#### Основные команды

```bash
# Проверка версии
clawdbot --version

# Статус daemon
clawdbot daemon status

# Запуск gateway вручную
clawdbot gateway

# Помощь
clawdbot --help
clawdbot daemon --help
clawdbot gateway --help
```

#### Команды для каналов

```bash
# Telegram
clawdbot channels telegram --help

# Gmail Webhooks
clawdbot webhooks gmail setup --account e.yurchenko@gmail.com
clawdbot webhooks gmail run
```

#### Команды для агента

```bash
# Отправить сообщение агенту
clawdbot agent --message "Привет"

# С доставкой в Telegram
clawdbot agent --message "Привет" --deliver
```

---

## Интеграции

### 1. Telegram

**Статус**: ✅ Настроено и работает

- **Bot Token**: Настроен в конфигурации
- **Канал**: Основной канал взаимодействия
- **Команды**: Доступны все стандартные команды

**Проверка**:
```bash
# Отправьте сообщение боту в Telegram
# Бот должен ответить
```

### 2. ElevenLabs (Голос)

**Статус**: ✅ Настроено

- **API Key**: Настроен
- **Voice ID**: `EkK5I93UQWFDigLMpZcX`
- **Model**: `eleven_multilingual_v2`
- **Interrupt on Speech**: Включено

**Настройка**:
```json
{
  "talk": {
    "voiceId": "EkK5I93UQWFDigLMpZcX",
    "modelId": "eleven_multilingual_v2",
    "apiKey": "sk_...",
    "interruptOnSpeech": true
  }
}
```

**Смена голоса**:
1. Откройте https://elevenlabs.io/app/voice-library
2. Выберите голос
3. Скопируйте Voice ID
4. Обновите `voiceId` в `~/.clawdbot/clawdbot.json`

### 3. Canvas

**Статус**: ✅ Работает

- **URL**: http://127.0.0.1:18789/__clawdbot__/canvas/
- **Порт**: 18793
- **Расположение**: `/home/eyurc/clawd/canvas/`

**Доступ**:
- Откройте браузер: http://127.0.0.1:18789/__clawdbot__/canvas/

### 4. Browser Control

**Статус**: ✅ Настроено

- **User Data Dir**: `/home/eyurc/clawd/browser`
- **Headless**: `false` (браузер видимый)
- **Использование**: Через команды агента

**Тестирование**:
```bash
# Отправьте боту в Telegram:
# "Открой google.com"
# "Сделай скриншот страницы"
```

### 5. Gmail Webhooks

**Статус**: ⏳ Настроено, требует запуска сервиса

- **Аккаунт**: `e.yurchenko@gmail.com`
- **OAuth**: Настроено
- **gog CLI**: Установлен

**Установка сервиса**:
```bash
/home/eyurc/clawd/manage-clawdbot.sh enable-gmail
```

**Ручной запуск**:
```bash
export PATH="$HOME/.local/bin:$PATH"
export GOG_KEYRING_PASSWORD="clawdbot-gmail-keyring"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
clawdbot webhooks gmail run
```

**Документация**: См. `/home/eyurc/clawd/GMAIL_SETUP_COMPLETE.md`

### 6. Voice Wake & Talk Mode

**Статус**: ⏳ Требует Android устройство

- **Wake Words**: "clawd", "assistant"
- **Требуется**: Android приложение и сопряжение

**Настройка**:
```bash
clawdbot nodes pair
```

---

## Обновление

### Обновление Clawdbot

```bash
# Настройка окружения
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22

# Обновление
npm install -g clawdbot@latest

# Проверка версии
clawdbot --version

# Перезапуск сервисов
/home/eyurc/clawd/manage-clawdbot.sh restart
```

### Обновление Node.js (если нужно)

```bash
# Через nvm
nvm install 22
nvm use 22
nvm alias default 22

# Перезапуск сервисов
/home/eyurc/clawd/manage-clawdbot.sh restart
```

### Обновление зависимостей

```bash
# gog CLI (если нужно)
# Скачать новую версию с GitHub
cd /tmp
curl -L -o gogcli.tar.gz https://github.com/steipete/gogcli/releases/latest/download/gogcli_*_linux_amd64.tar.gz
tar -xzf gogcli.tar.gz
mv gog ~/.local/bin/gog
chmod +x ~/.local/bin/gog
```

---

## Конфигурация

### Файл конфигурации

**Расположение**: `~/.clawdbot/clawdbot.json`

**Права доступа**: `600` (только владелец)

### Структура конфигурации

```json
{
  "gateway": {
    "mode": "local"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "...",
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  },
  "workspace": "/home/eyurc/clawd",
  "talk": {
    "voiceId": "...",
    "modelId": "eleven_multilingual_v2",
    "apiKey": "...",
    "interruptOnSpeech": true
  },
  "voicewake": {
    "triggers": ["clawd", "assistant"],
    "enabled": true
  },
  "canvas": {
    "enabled": true,
    "host": {
      "enabled": true,
      "port": 18793
    }
  },
  "browser": {
    "enabled": true,
    "headless": false,
    "userDataDir": "/home/eyurc/clawd/browser"
  },
  "hooks": {
    "gmail": {
      "enabled": true,
      "account": "e.yurchenko@gmail.com"
    }
  }
}
```

### Редактирование конфигурации

```bash
# Просмотр
cat ~/.clawdbot/clawdbot.json

# Редактирование
nano ~/.clawdbot/clawdbot.json
# или
code ~/.clawdbot/clawdbot.json

# Проверка JSON
cat ~/.clawdbot/clawdbot.json | python3 -m json.tool > /dev/null && echo "OK" || echo "ERROR"
```

### Применение изменений

После изменения конфигурации:
```bash
# Перезапустить сервисы
/home/eyurc/clawd/manage-clawdbot.sh restart
```

---

## Устранение проблем

### Бот не отвечает в Telegram

1. **Проверьте статус сервиса**:
   ```bash
   systemctl --user status clawdbot-gateway.service
   ```

2. **Проверьте логи**:
   ```bash
   journalctl --user -u clawdbot-gateway.service -n 50
   ```

3. **Перезапустите сервис**:
   ```bash
   /home/eyurc/clawd/manage-clawdbot.sh restart
   ```

4. **Проверьте конфигурацию Telegram**:
   ```bash
   cat ~/.clawdbot/clawdbot.json | grep -A 5 telegram
   ```

### Сервис не запускается

1. **Проверьте Node.js**:
   ```bash
   export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
   node --version  # Должно быть v22.x.x
   ```

2. **Проверьте права на файлы**:
   ```bash
   ls -la ~/.clawdbot/clawdbot.json
   # Должно быть: -rw------- (600)
   ```

3. **Проверьте workspace**:
   ```bash
   ls -la /home/eyurc/clawd
   ```

4. **Переустановите daemon**:
   ```bash
   export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
   clawdbot daemon uninstall
   clawdbot daemon install
   systemctl --user enable clawdbot-gateway.service
   systemctl --user start clawdbot-gateway.service
   ```

### Бот не запускается после перезагрузки Windows

1. **Проверьте Task Scheduler**:
   ```powershell
   # В Windows PowerShell
   Get-ScheduledTask -TaskName "Clawdbot WSL Autostart"
   ```

2. **Проверьте WSL systemd**:
   ```bash
   systemctl status
   # Должен показать список сервисов, не ошибку
   ```

3. **Проверьте /etc/wsl.conf**:
   ```bash
   cat /etc/wsl.conf
   # Должно быть: systemd=true
   ```

4. **Перезапустите WSL**:
   ```powershell
   # В Windows PowerShell
   wsl --shutdown
   ```
   Затем откройте WSL снова.

### Canvas не доступен

1. **Проверьте, что Gateway работает**:
   ```bash
   systemctl --user status clawdbot-gateway.service
   ```

2. **Проверьте порт**:
   ```bash
   netstat -tuln | grep 18789
   ```

3. **Проверьте файлы Canvas**:
   ```bash
   ls -la /home/eyurc/clawd/canvas/
   ```

4. **Откройте в браузере**:
   - http://127.0.0.1:18789/__clawdbot__/canvas/

### Gmail Webhooks не работает

1. **Проверьте gog CLI**:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   gog --version
   ```

2. **Проверьте аутентификацию**:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   export GOG_KEYRING_PASSWORD="clawdbot-gmail-keyring"
   gog auth list
   ```

3. **Проверьте Google Cloud**:
   ```bash
   gcloud auth list
   gcloud config get-value project
   ```

4. **См. документацию**: `/home/eyurc/clawd/GMAIL_SETUP_COMPLETE.md`

### Проблемы с правами доступа

```bash
# Исправить права на конфигурацию
chmod 600 ~/.clawdbot/clawdbot.json

# Исправить права на workspace
chmod 755 /home/eyurc/clawd
chmod 755 /home/eyurc/clawd/browser

# Исправить права на скрипты
chmod +x /home/eyurc/clawd/*.sh
```

---

## Мониторинг и логи

### Просмотр логов

#### Через скрипт управления

```bash
# Логи Gateway
/home/eyurc/clawd/manage-clawdbot.sh logs

# Логи Gmail Webhooks
/home/eyurc/clawd/manage-clawdbot.sh logs-gmail
```

#### Через journalctl

```bash
# Логи Gateway
journalctl --user -u clawdbot-gateway.service -f

# Последние 100 строк
journalctl --user -u clawdbot-gateway.service -n 100

# Логи за сегодня
journalctl --user -u clawdbot-gateway.service --since today

# Логи Gmail Webhooks
journalctl --user -u clawdbot-gmail-webhooks.service -f
```

#### Файловые логи

```bash
# Логи Clawdbot
ls -la /tmp/clawdbot/
tail -f /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log
```

### Мониторинг статуса

```bash
# Быстрая проверка
/home/eyurc/clawd/manage-clawdbot.sh status

# Детальный статус
systemctl --user status clawdbot-gateway.service

# Через Clawdbot CLI
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
clawdbot daemon status
```

### Проверка ресурсов

```bash
# Использование памяти и CPU
systemctl --user status clawdbot-gateway.service | grep -E "(Memory|CPU)"

# Детальная информация о процессе
ps aux | grep clawdbot
```

### Dashboard и веб-интерфейсы

- **Gateway Dashboard**: http://127.0.0.1:18789/
- **Canvas**: http://127.0.0.1:18789/__clawdbot__/canvas/
- **Browser Control**: http://127.0.0.1:18791/

---

## Автозапуск

### Текущая настройка

✅ **Автозапуск настроен и работает**

- **WSL systemd**: Включен
- **Gateway сервис**: Автозапуск включен
- **Windows Task Scheduler**: Настроен

### Как это работает

1. **Windows загружается** → Task Scheduler запускает WSL
2. **WSL загружается** → systemd запускает сервисы
3. **Сервисы запускаются** → Бот готов к работе

### Проверка автозапуска

```bash
# Проверить, что сервис включен
systemctl --user is-enabled clawdbot-gateway.service
# Должно вернуть: enabled

# Проверить автозапуск в WSL
systemctl --user is-enabled clawdbot-autostart.service
# Должно вернуть: enabled
```

### Управление автозапуском

```bash
# Включить автозапуск
systemctl --user enable clawdbot-gateway.service

# Выключить автозапуск
systemctl --user disable clawdbot-gateway.service

# Проверить статус
systemctl --user is-enabled clawdbot-gateway.service
```

**Документация**: См. `/home/eyurc/clawd/WSL_AUTOSTART_SETUP.md`

---

## Полезные ссылки

### Документация

- **Официальная документация**: https://docs.clawd.bot
- **GitHub**: https://github.com/clawdbot/clawdbot

### Интеграции

- **ElevenLabs**: https://elevenlabs.io/app/voice-library
- **Google Cloud Console**: https://console.cloud.google.com
- **Gmail API**: https://developers.google.com/gmail/api

### Файлы документации в проекте

- `/home/eyurc/clawd/README.md` - Этот файл
- `/home/eyurc/clawd/AUTOSTART_SETUP.md` - Настройка автозапуска
- `/home/eyurc/clawd/WSL_AUTOSTART_SETUP.md` - Автозапуск в WSL
- `/home/eyurc/clawd/GMAIL_SETUP_COMPLETE.md` - Настройка Gmail
- `/home/eyurc/clawd/INTEGRATION_SETUP.md` - Настройка интеграций
- `/home/eyurc/clawd/QUICK_START_WINDOWS.md` - Быстрый старт

---

## Поддержка

### Полезные команды для диагностики

```bash
# Полная диагностика
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
clawdbot doctor

# Или с автоматическим исправлением
clawdbot doctor --repair
```

### Сбор информации для отчёта об ошибке

```bash
# Версия
clawdbot --version

# Статус daemon
clawdbot daemon status

# Статус сервисов
/home/eyurc/clawd/manage-clawdbot.sh status

# Последние логи
journalctl --user -u clawdbot-gateway.service -n 50
```

---

## Версия

**Текущая версия**: 2026.1.16-2

**Дата обновления**: 2026-01-18

**Последнее обновление документации**: 2026-01-18

---

## Лицензия

См. официальную документацию Clawdbot.

---

**Приятного использования! 🚀**
