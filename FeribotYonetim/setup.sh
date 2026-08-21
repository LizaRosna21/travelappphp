#!/bin/bash

# FerryBooking Otomatik Kurulum Betiği
# Bu betik, FerryBooking uygulamasını sunucuya kurar ve yapılandırır

set -e # Hata durumunda betiği durdur

echo "====================================================="
echo "FerryBooking Sistemi Otomatik Kurulum Betiği"
echo "====================================================="

# Sistem güncellemelerini kontrol et
echo -e "\n[1/7] Sistem güncellemeleri kontrol ediliyor..."
apt-get update && apt-get upgrade -y

# Gerekli paketleri kur
echo -e "\n[2/7] Gerekli paketler kuruluyor..."
apt-get install -y curl wget git unzip build-essential postgresql

# Node.js kurulumu
echo -e "\n[3/7] Node.js kuruluyor..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "Node.js kuruldu: $(node -v)"
else
    echo "Node.js zaten kurulu: $(node -v)"
fi

# PostgreSQL veritabanı kontrolü ve kurulumu
echo -e "\n[4/7] PostgreSQL veritabanı ayarlanıyor..."
if systemctl is-active --quiet postgresql; then
    echo "PostgreSQL servis aktif."
else
    echo "PostgreSQL başlatılıyor..."
    systemctl start postgresql
    systemctl enable postgresql
fi

# Veritabanı kullanıcısı ve veritabanı oluştur
echo -e "\n[5/7] Veritabanı ve kullanıcı oluşturuluyor..."
# Random şifre oluştur
DB_PASSWORD=$(openssl rand -base64 12)
DB_NAME="ferryBookingDb"
DB_USER="ferryBookingUser"

# PostgreSQL kullanıcısı ve veritabanı oluşturma
sudo -i -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

echo "Veritabanı kurulumu tamamlandı."

# Uygulama dosyalarını kopyala ve bağımlılıkları kur
echo -e "\n[6/7] Uygulama dosyaları yükleniyor ve bağımlılıklar kuruluyor..."
if [ -d "/opt/ferrybooking" ]; then
    echo "Uygulama dizini zaten var, güncelleniyor..."
    cd /opt/ferrybooking
    git pull
else
    echo "Uygulama dizini oluşturuluyor ve kodlar kopyalanıyor..."
    git clone https://github.com/kullanici/ferrybooking.git /opt/ferrybooking
    cd /opt/ferrybooking
fi

# Bağımlılıkları kur
npm install

# .env dosyasını oluştur
echo -e "\n[7/7] .env dosyası oluşturuluyor..."
cat > .env <<EOF
# Veritabanı Bağlantısı
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Uygulama Ayarları
PORT=5000
NODE_ENV=production
SESSION_SECRET=$(openssl rand -base64 32)

# API Anahtarları (Gerçek anahtarlarınızı buraya ekleyin)
# Stripe
# STRIPE_SECRET_KEY=sk_test_...
# VITE_STRIPE_PUBLIC_KEY=pk_test_...

# SendGrid
# SENDGRID_API_KEY=SG.....

# Türk Ödeme Sağlayıcıları (Gerçek anahtarlarınızı buraya ekleyin)
# PayU
# PAYU_MERCHANT_ID=...
# PAYU_SECRET_KEY=...

# Iyzico
# IYZICO_API_KEY=...
# IYZICO_SECRET_KEY=...

# PayTR
# PAYTR_MERCHANT_ID=...
# PAYTR_MERCHANT_KEY=...
# PAYTR_MERCHANT_SALT=...

# WhatsApp Business API
# WHATSAPP_API_TOKEN=...
# WHATSAPP_PHONE_NUMBER_ID=...
EOF

# Veritabanı şemasını oluştur
echo "Veritabanı şeması oluşturuluyor..."
npm run db:push

# Sistem hizmetini oluştur
echo "Sistem hizmeti oluşturuluyor..."
cat > /etc/systemd/system/ferrybooking.service <<EOF
[Unit]
Description=FerryBooking Application
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ferrybooking
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Servisi başlat
systemctl daemon-reload
systemctl enable ferrybooking
systemctl start ferrybooking

# Kurulum tamamlandı mesajı
echo "====================================================="
echo "FerryBooking kurulumu tamamlandı!"
echo "====================================================="
echo ""
echo "Veritabanı bilgileri:"
echo "  Veritabanı: $DB_NAME"
echo "  Kullanıcı: $DB_USER"
echo "  Şifre: $DB_PASSWORD"
echo ""
echo "Lütfen .env dosyasında bulunan API anahtarlarını güncelleyin:"
echo "  - Stripe, SendGrid, ve Türk ödeme sağlayıcı anahtarları"
echo ""
echo "Uygulamaya şu adreslerden erişebilirsiniz:"
echo "  - http://localhost:5000 (sunucu üzerinden)"
echo "  - http://SERVER_IP:5000 (uzaktan erişim)"
echo ""
echo "Nginx veya başka bir reverse proxy kurarak daha güvenli HTTPS"
echo "bağlantısı sağlamanızı öneririz."
echo "====================================================="