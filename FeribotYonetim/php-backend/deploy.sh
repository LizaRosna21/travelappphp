#!/bin/bash
# ============================================
# FERİBOT YÖNETİM SİSTEMİ - PHP Deployment Script
# Hostinger VPS için kurulum ve güncelleme
# ============================================

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} FERİBOT YÖNETİM - PHP Backend Deploy${NC}"
echo -e "${GREEN}========================================${NC}"

# Değişkenler
SITE_DIR="${SITE_DIR:-/home/kullanici/htdocs/siteniz.com}"
PHP_VERSION="${PHP_VERSION:-8.2}"

# ============================================
# 1. Sistem Gereksinimleri Kontrolü
# ============================================
echo -e "\n${YELLOW}[1/7] Sistem gereksinimleri kontrol ediliyor...${NC}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}[HATA] $1 bulunamadı!${NC}"
        return 1
    fi
    echo -e "${GREEN}[OK] $1 mevcut${NC}"
}

check_cmd php
check_cmd nginx || check_cmd apache2 || echo -e "${YELLOW}Web server bulunamadı${NC}"
check_cmd psql || echo -e "${YELLOW}PostgreSQL client bulunamadı${NC}"

# PHP eklentileri kontrolü
echo -e "\nPHP eklentileri:"
for ext in pdo pdo_pgsql json session mbstring; do
    if php -m 2>/dev/null | grep -qi "$ext"; then
        echo -e "${GREEN}  [OK] $ext${NC}"
    else
        echo -e "${RED}  [EKSIK] $ext${NC}"
    fi
done

# ============================================
# 2. PostgreSQL Kurulumu (eğer yoksa)
# ============================================
echo -e "\n${YELLOW}[2/7] PostgreSQL kontrol ediliyor...${NC}"

if command -v psql &> /dev/null; then
    echo -e "${GREEN}PostgreSQL zaten kurulu${NC}"
else
    echo -e "${YELLOW}PostgreSQL kuruluyor...${NC}"
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo -e "${GREEN}PostgreSQL kuruldu${NC}"
fi

# PHP PostgreSQL eklentisi
if ! php -m 2>/dev/null | grep -qi "pdo_pgsql"; then
    echo -e "${YELLOW}PHP PostgreSQL eklentisi kuruluyor...${NC}"
    sudo apt install -y php${PHP_VERSION}-pgsql
    sudo systemctl restart php${PHP_VERSION}-fpm 2>/dev/null || true
fi

# ============================================
# 3. Veritabanı Oluştur
# ============================================
echo -e "\n${YELLOW}[3/7] Veritabanı oluşturuluyor...${NC}"

# Veritabanı ve kullanıcı oluştur
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='feribotuser'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER feribotuser WITH PASSWORD 'SIFRENIZ';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='feribot_db'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE feribot_db OWNER feribotuser;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE feribot_db TO feribotuser;"

echo -e "${GREEN}Veritabanı hazır${NC}"

# ============================================
# 4. Dosyaları Kopyala
# ============================================
echo -e "\n${YELLOW}[4/7] Dosyalar kopyalanıyor...${NC}"

mkdir -p "$SITE_DIR/php-backend"
mkdir -p "$SITE_DIR/php-backend/logs"
mkdir -p "$SITE_DIR/public/uploads"
mkdir -p "$SITE_DIR/dist/public"

# PHP backend dosyalarını kopyala
cp -r . "$SITE_DIR/php-backend/"

echo -e "${GREEN}Dosyalar kopyalandı${NC}"

# ============================================
# 5. .env Yapılandırma
# ============================================
echo -e "\n${YELLOW}[5/7] Yapılandırma kontrol ediliyor...${NC}"

if [ ! -f "$SITE_DIR/.env" ]; then
    cp "$SITE_DIR/php-backend/.env.example" "$SITE_DIR/.env"
    echo -e "${YELLOW}.env dosyası oluşturuldu - lütfen düzenleyin!${NC}"
    echo -e "  nano $SITE_DIR/.env"
else
    echo -e "${GREEN}.env dosyası mevcut${NC}"
fi

# İzinleri ayarla
chmod 600 "$SITE_DIR/.env" 2>/dev/null || true
chmod -R 755 "$SITE_DIR/php-backend/"
chmod -R 777 "$SITE_DIR/php-backend/logs/"
chmod -R 777 "$SITE_DIR/public/uploads/"

# ============================================
# 6. Migration'ları Çalıştır
# ============================================
echo -e "\n${YELLOW}[6/7] Migration'lar çalıştırılıyor...${NC}"

cd "$SITE_DIR/php-backend"
php migrations/001_create_tables.php
php migrations/002_seed_data.php

# ============================================
# 7. Nginx Yapılandırma
# ============================================
echo -e "\n${YELLOW}[7/7] Web server yapılandırılıyor...${NC}"

if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx yapılandırması kurulacak...${NC}"

    # Domain adını güncelle
    read -p "Domain adınız (örn: feribot.com): " DOMAIN_NAME
    if [ -n "$DOMAIN_NAME" ]; then
        sed "s/siteniz\.com/$DOMAIN_NAME/g; s/kullanici/$(whoami)/g" nginx-php.conf > /tmp/feribot-nginx.conf
        sudo cp /tmp/feribot-nginx.conf /etc/nginx/sites-available/feribot.conf
        sudo ln -sf /etc/nginx/sites-available/feribot.conf /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        echo -e "${GREEN}Nginx yapılandırıldı${NC}"

        # SSL sertifikası (Let's Encrypt)
        if command -v certbot &> /dev/null; then
            echo -e "${YELLOW}SSL sertifikası alınıyor...${NC}"
            sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email "admin@$DOMAIN_NAME" || \
                echo -e "${YELLOW}SSL sertifikası daha sonra alabilirsiniz: sudo certbot --nginx${NC}"
        else
            echo -e "${YELLOW}Certbot bulunamadı. SSL için: sudo apt install certbot python3-certbot-nginx${NC}"
        fi
    fi
fi

# ============================================
# TAMAMLANDI
# ============================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN} KURULUM TAMAMLANDI!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "PHP Backend: ${GREEN}$SITE_DIR/php-backend/${NC}"
echo -e "API Test:    ${GREEN}curl http://localhost/api/health${NC}"
echo ""
echo -e "${YELLOW}ÖNEMLİ:${NC}"
echo -e "  1. .env dosyasını düzenleyin: nano $SITE_DIR/.env"
echo -e "  2. Admin giriş: admin / admin123"
echo -e "  3. Şifrenizi hemen değiştirin!"
echo ""
echo -e "${YELLOW}React Frontend Build:${NC}"
echo -e "  cd $SITE_DIR && npm install && npm run build"
echo -e "  (React build output dist/public/ dizinine gider)"
echo ""
