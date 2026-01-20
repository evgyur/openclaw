#!/bin/bash
# Скрипт для перезапуска всех сервисов Clawdbot (включая Telegram API)
# Используется командой /bigrestart в Telegram

echo "🔄 Перезапуск всех сервисов Clawdbot..."

# Список сервисов для перезапуска
SERVICES=("clawdbot-gateway.service" "telegram-api.service")

# Перезапуск всех сервисов
FAILED=()
for SERVICE in "${SERVICES[@]}"; do
    echo "  🔄 Перезапуск $SERVICE..."
    if systemctl --user restart "$SERVICE" 2>&1; then
        echo "  ✅ $SERVICE перезапущен"
    else
        echo "  ❌ Ошибка при перезапуске $SERVICE"
        FAILED+=("$SERVICE")
    fi
done

# Подождать немного для стабилизации
sleep 2

# Проверка статуса всех сервисов
echo ""
echo "📊 Статус сервисов:"
ALL_OK=true
for SERVICE in "${SERVICES[@]}"; do
    STATUS=$(systemctl --user is-active "$SERVICE" 2>&1)
    if [ "$STATUS" = "active" ]; then
        echo "  ✅ $SERVICE: $STATUS"
    else
        echo "  ❌ $SERVICE: $STATUS"
        ALL_OK=false
    fi
done

# Показать детальный статус, если есть проблемы
if [ "$ALL_OK" = false ] || [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Детальная информация о проблемных сервисах:"
    for SERVICE in "${FAILED[@]}"; do
        systemctl --user status "$SERVICE" --no-pager -l | head -20
    done
    exit 1
else
    echo ""
    echo "✅ Все сервисы успешно перезапущены!"
fi
