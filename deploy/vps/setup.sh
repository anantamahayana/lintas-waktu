#!/usr/bin/env bash
# Pasang API Lintas Waktu di VPS Ubuntu (sekali jalan; aman dijalankan ulang untuk update).
#   curl -fsSL https://raw.githubusercontent.com/anantamahayana/lintas-waktu/main/deploy/vps/setup.sh | sudo bash
# Rahasia (SECRET_KEY, password admin, akun Google) ditanyakan di layar dan disimpan hanya di
# /srv/lintas-waktu/api.env (izin 600), tidak pernah di repo.
set -euo pipefail
DOMAIN="${API_DOMAIN:-api.lintaswaktuvisual.com}"
ROOT=/srv/lintas-waktu
ask() { local v; read -r -p "$1" v </dev/tty; printf '%s' "$v"; }
asks() { local v; read -r -s -p "$1" v </dev/tty; echo >&2; printf '%s' "$v"; }

echo "== 1/5 Paket sistem dan Docker"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git ufw sqlite3 >/dev/null
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh >/dev/null

echo "== 2/5 Firewall (SSH, HTTP, HTTPS)"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null

echo "== 3/5 Kode"
mkdir -p "$ROOT/data/uploads" "$ROOT/data/backups"
if [ -d "$ROOT/repo/.git" ]; then git -C "$ROOT/repo" pull -q; else git clone -q https://github.com/anantamahayana/lintas-waktu.git "$ROOT/repo"; fi

echo "== 4/5 Pengaturan rahasia"
if [ ! -f "$ROOT/api.env" ]; then
  echo "Isi sama persis dengan yang di Railway (Variables). SECRET_KEY yang sama menjaga PIN galeri lama tetap berlaku."
  SK=$(asks "SECRET_KEY: ")
  AP=$(asks "ADMIN_PASSWORD: ")
  RS=$(asks "REVALIDATE_SECRET (kosongkan kalau tidak ada): ")
  echo "GOOGLE_SERVICE_ACCOUNT_JSON: tempel isi JSON akun layanan Google dalam SATU baris, lalu Enter."
  GJ=$(asks "> ")
  umask 077
  {
    echo "SECRET_KEY=$SK"; echo "ADMIN_PASSWORD=$AP"; echo "REVALIDATE_SECRET=$RS"
    echo "GOOGLE_SERVICE_ACCOUNT_JSON=$GJ"; echo "FRONTEND_URL=https://www.lintaswaktuvisual.com"; echo "APP_ENV=production"
  } > "$ROOT/api.env"
  echo "Tersimpan di $ROOT/api.env"
fi

echo "== 5/5 Menjalankan API + HTTPS untuk $DOMAIN"
cd "$ROOT/repo/deploy/vps"
API_DOMAIN="$DOMAIN" docker compose up -d --build
# Backup database harian pukul 03.00 (14 hari terakhir)
cat > /etc/cron.d/lintas-waktu-backup <<CRON
0 3 * * * root sqlite3 $ROOT/data/photo_platform.db ".backup '$ROOT/data/backups/db-\$(date +\%F).db'" && find $ROOT/data/backups -name 'db-*.db' -mtime +14 -delete
CRON
sleep 5
curl -fsS http://localhost:80 -H "Host: $DOMAIN" >/dev/null 2>&1 || true
docker compose ps
echo
echo "Selesai. Cek: https://$DOMAIN/api/health (butuh DNS $DOMAIN -> IP server ini)."
