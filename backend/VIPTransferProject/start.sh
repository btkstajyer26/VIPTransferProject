#!/bin/bash

# docker-compose.yml'nin bulunduğu proje kökü (bu script 2 seviye içeride)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Lokal ağ IP'sini bul (macOS ve Linux çalışır)
if [[ "$OSTYPE" == "darwin"* ]]; then
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
else
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="IP_ALINAMADI"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║            VIP Transfer — Docker Başlatılıyor        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

echo "Eski build cache ve dangling image'lar temizleniyor..."
docker builder prune -f > /dev/null 2>&1
docker image prune -f > /dev/null 2>&1
echo "Temizlik tamamlandı."
echo ""

docker compose -f "$PROJECT_ROOT/docker-compose.yml" up --build -d

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Uygulama hazır! Şu adreslerden erişebilirsin:       ║"
echo "║                                                      ║"
echo "║  Bu cihazdan:                                        ║"
echo "║    http://localhost:8888                             ║"
echo "║                                                      ║"
echo "║  Aynı ağdaki diğer cihazlardan:                      ║"
echo "║    http://$LOCAL_IP:8888                             ║"
echo "║                                                      ║"
echo "║  Grafana:  http://$LOCAL_IP:3000                     ║"
echo "║  Prometheus: http://$LOCAL_IP:9090                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Logları görmek için: docker compose -f \"$PROJECT_ROOT/docker-compose.yml\" logs -f"
echo "Durdurmak için:      docker compose -f \"$PROJECT_ROOT/docker-compose.yml\" down"
echo ""
