# Reference Projects — Scrum Master Skill

Изученные open source решения для вдохновения.

---

## 1. Accountability Telegram Bot
**Repo:** https://github.com/HassanKanj/accountability-telegram-bot
**Stack:** Node.js

### Ключевые фичи:
- `/add` — добавить задачу
- `/list` — список задач
- Mark as done/pending
- **Random progress messages** — рандомные напоминания в течение дня
- Daily repeated tasks — автоматическое добавление
- Morning greeting с вопросом "What do you want to work on?"
- Progress ratio & percentage

### Что взять:
- ✅ Концепция accountability через random pings
- ✅ Progress percentage (X из Y задач)
- ✅ Daily repeated tasks
- ✅ Morning greeting flow

---

## 2. Task Tracker Bot
**Repo:** https://github.com/AlertMode/task-tracker-bot
**Stack:** Python, Aiogram, MySQL

### Ключевые фичи:
- Task creation with deadlines
- **Timezone-aware reminders**
- Background scheduler для проверки дедлайнов
- Interactive buttons (mark complete, snooze, delete)
- Data persistence

### Что взять:
- ✅ Deadline-based reminders
- ✅ Interactive inline buttons
- ✅ Snooze functionality
- ✅ Background scheduler pattern

---

## 3. NicLabs Standup Bot
**Repo:** https://github.com/niclabs/bot
**Stack:** Node.js, Telegraf

### Ключевые фичи:
- `/standup` command
- Classic 3 questions:
  1. What did you do yesterday?
  2. What will you do today?
  3. Do you have any obstacles?

### Что взять:
- ✅ Structured standup flow
- ✅ Simple command interface

---

## 4. DailyBot
**Repo:** https://github.com/sapumar/dailybot

### Ключевые фичи:
- Cron-based standup reminders
- Mon-Fri schedule
- Time configuration via env

### Что взять:
- ✅ Weekday-only scheduling

---

## Наши уникальные фичи (не найдены в проектах):

1. **Pattern detection** — отслеживание задач которые переносятся 3+ раз
2. **Coaching prompts** — предложения разбить/делегировать/удалить
3. **Google Tasks/Calendar sync** — не локальная БД, а реальные инструменты
4. **Eisenhower matrix** — приоритизация P1/P2/P3
5. **Win celebration** — позитивный feedback на completed tasks
6. **Weekly review** с аналитикой паттернов
7. **Time blocking** — автоматическое создание событий в календаре

---

## Архитектурные решения:

### Data Storage
Проекты используют: SQLite, MySQL, JSON files

**Наш подход:** Google Tasks как source of truth + локальный JSON для:
- История стендапов
- Счётчик переносов (pattern detection)
- Streak данные

### Scheduling
Проекты: node-cron, APScheduler, system crontab

**Наш подход:** Clawdbot cron jobs → systemEvent → agent execution

### UI/UX
Проекты: Telegram inline buttons, commands

**Наш подход:** Natural language + structured prompts через Clawdbot

---

## Дополнительные референсы

### 5. n8n Workflow: Tasks + Telegram + Google Sheets + GPT
**URL:** https://n8n.io/workflows/5291

**Ключевые фичи:**
- AI-powered conversational task management
- Google Sheets как master database
- Daily scheduled summary (9 PM)
- Natural language commands: "add buy groceries", "complete submit report"
- Columns: Task, Status, Created At, Due Date, Notes

**Что взять:**
- ✅ AI-powered natural language processing
- ✅ Daily summary at fixed time
- ✅ Due date tracking
- ✅ Notes field для контекста

### 6. Microsoft Teams Scrums for Channels
**Repo:** https://github.com/OfficeDev/microsoft-teams-apps-scrumsforchannels

**Ключевые фичи:**
- Scheduled scrum at specified time + **timezone**
- Auto-start scrum
- Adaptive cards с buttons
- Status: active/closed
- **Export to CSV** (past 30 days)
- Track "blocked" status

**Что взять:**
- ✅ Timezone-aware scheduling
- ✅ "Blocked" status tracking
- ✅ Export functionality
- ✅ Scrum status (active/closed)

### 7. Teleminder
**Repo:** https://github.com/NivEz/tele-minder

**Что взять:**
- ✅ Simple reminder patterns

### 8. cron-telebot
**Repo:** https://github.com/hsdevelops/cron-telebot

**Что взять:**
- ✅ Recurring message scheduling

---

## Финальный feature set (v1):

### Must Have
1. ✅ Google Tasks sync
2. ✅ Morning standup (3 questions)
3. ✅ Evening check-in
4. ✅ Weekly review
5. ✅ Pattern detection (переносы)
6. ✅ Coaching prompts

### Nice to Have (v2)
1. ⏳ Google Calendar time blocking
2. ⏳ Progress percentage
3. ⏳ Export to CSV
4. ⏳ Blocked status
5. ⏳ Due date reminders
6. ⏳ Random progress pings
7. ⏳ Timezone awareness
