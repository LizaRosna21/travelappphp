# Feribot Yönetim Sistemi - PHP Backend Kurulum Rehberi

## Hostinger VPS'e PHP Backend Kurulumu

### Gereksinimler
- PHP 8.1+ (PHP-FPM önerilir)
- PostgreSQL 14+
- Nginx veya Apache
- SSL Sertifikası (Let's Encrypt)

---

## 1. VPS'e SSH ile Bağlanma

```bash
ssh root@VPS_IP_ADRESI
```

## 2. Sistem Güncelleme ve PHP Kurulumu

```bash
# Sistem güncelle
apt update && apt upgrade -y

# PHP ve gerekli eklentiler
apt install -y php8.2-fpm php8.2-pgsql php8.2-mbstring php8.2-json php8.2-curl php8.2-xml

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Nginx
apt install -y nginx

# Let's Encrypt
apt install -y certbot python3-certbot-nginx

# Git
apt install -y git
```

## 3. PostgreSQL Veritabanı Kurulumu

```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Veritabanı ve kullanıcı oluştur
CREATE USER feribotuser WITH PASSWORD 'GUCLU_SIFRE_BURAYA';
CREATE DATABASE feribot_db OWNER feribotuser;
GRANT ALL PRIVILEGES ON DATABASE feribot_db TO feribotuser;
\q
```

## 4. Proje Dosyalarını Yükle

```bash
# Proje dizini oluştur
mkdir -p /home/kullanici/htdocs/siteniz.com
cd /home/kullanici/htdocs/siteniz.com

# Git'ten çek
git clone https://github.com/KULLANICI/travelappphp.git .

# veya SCP ile yükle
# scp -r ./FeribotYonetim root@VPS_IP:/home/kullanici/htdocs/siteniz.com/
```

## 5. .env Dosyasını Yapılandır

```bash
cp FeribotYonetim/.env.example FeribotYonetim/.env
nano FeribotYonetim/.env
```

```env
DATABASE_URL=postgresql://feribotuser:GUCLU_SIFRE@localhost:5432/feribot_db
DB_SSL=false
NODE_ENV=production
SESSION_SECRET=RASTGELE_GUCLU_BIR_ANAHTAR
SITE_URL=https://siteniz.com
CORS_ORIGIN=https://siteniz.com
DEMO_MODE=false
```

## 6. Veritabanı Migration'larını Çalıştır

```bash
cd /home/kullanici/htdocs/siteniz.com/FeribotYonetim/php-backend

# Tabloları oluştur
php migrations/001_create_tables.php

# Başlangıç verilerini yükle
php migrations/002_seed_data.php
```

## 7. Nginx Yapılandırması

```bash
# Nginx config dosyasını kopyala
cp FeribotYonetim/php-backend/nginx-php.conf /etc/nginx/sites-available/feribot.conf

# Domain adını güncelle
sed -i 's/siteniz.com/GERCEK_DOMAIN/g' /etc/nginx/sites-available/feribot.conf
sed -i 's/kullanici/root/g' /etc/nginx/sites-available/feribot.conf

# Aktifleştir
ln -sf /etc/nginx/sites-available/feribot.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 8. SSL Sertifikası (Let's Encrypt)

```bash
certbot --nginx -d siteniz.com -d www.siteniz.com
```

## 9. React Frontend Build (Opsiyonel)

React frontend'i de kullanmak istiyorsanız:

```bash
cd /home/kullanici/htdocs/siteniz.com/FeribotYonetim

# Node.js kurulumu (eğer yoksa)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Bağımlılıkları yükle ve build al
npm install
npm run build

# Build çıktısı: dist/public/
```

## 10. İzinler

```bash
# Dosya izinleri
chown -R www-data:www-data /home/kullanici/htdocs/siteniz.com/
chmod -R 755 /home/kullanici/htdocs/siteniz.com/
chmod 600 /home/kullanici/htdocs/siteniz.com/FeribotYonetim/.env
chmod -R 777 /home/kullanici/htdocs/siteniz.com/FeribotYonetim/php-backend/logs/
chmod -R 777 /home/kullanici/htdocs/siteniz.com/FeribotYonetim/public/uploads/
```

---

## API Endpoint'leri

### Public (Giriş Gerekmez)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sistem durumu |
| GET | `/api/routes` | Aktif rotalar |
| GET | `/api/routes/search?departure=X&arrival=Y&date=Z` | Rota arama |
| GET | `/api/routes/:id` | Rota detayı |
| GET | `/api/schedules?route_id=X&date=Y` | Sefer arama |
| GET | `/api/languages` | Diller |
| GET | `/api/currencies` | Para birimleri |
| GET | `/api/ports` | Limanlar |
| GET | `/api/translations/:lang` | Çeviriler |
| GET | `/api/bookings/pnr/:pnr` | PNR ile sorgulama |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/register` | Kayıt |
| POST | `/api/campaigns/validate-coupon` | Kupon doğrulama |

### Kullanıcı (Giriş Gerekir)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/auth/me` | Mevcut kullanıcı |
| POST | `/api/auth/logout` | Çıkış |
| GET | `/api/bookings` | Rezervasyonlarım |
| POST | `/api/bookings` | Yeni rezervasyon |
| GET | `/api/bookings/:id` | Rezervasyon detayı |
| POST | `/api/bookings/:id/cancel` | Rezervasyon iptali |
| GET | `/api/users/profile` | Profil bilgileri |
| PUT | `/api/users/profile` | Profil güncelle |
| POST | `/api/users/change-password` | Şifre değiştir |

### Admin
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/admin/dashboard` | Dashboard istatistikleri |
| GET | `/api/admin/bookings` | Tüm rezervasyonlar |
| GET | `/api/admin/users` | Kullanıcı yönetimi |
| GET | `/api/admin/routes` | Rota yönetimi |
| GET | `/api/admin/revenue` | Gelir raporları |
| GET/PUT | `/api/admin/settings` | Site ayarları |
| POST | `/api/routes` | Yeni rota |
| PUT | `/api/routes/:id` | Rota güncelle |
| DELETE | `/api/routes/:id` | Rota sil |
| POST | `/api/schedules` | Yeni sefer |
| POST | `/api/bookings/:id/confirm-payment` | Ödeme onayla |

### B2B Acente
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/agencies` | Acente listesi |
| GET | `/api/agencies/:id` | Acente detayı |
| POST | `/api/agencies` | Yeni acente |
| PUT | `/api/agencies/:id` | Acente güncelle |

### Kampanya / Pazarlama
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/campaigns` | Kampanyalar |
| POST | `/api/campaigns` | Yeni kampanya |

---

## Varsayılan Giriş Bilgileri
- **Kullanıcı Adı:** admin
- **Şifre:** admin123
- **Rol:** superadmin

> **ÖNEMLİ:** İlk giriş sonrası şifrenizi mutlaka değiştirin!

---

## Sorun Giderme

### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL servisini kontrol et
systemctl status postgresql

# Bağlantıyı test et
php -r "
require 'php-backend/config/app.php';
require 'php-backend/config/database.php';
\$db = new Database();
print_r(\$db->testConnection());
"
```

### PHP-FPM Hatası
```bash
systemctl status php8.2-fpm
tail -f /var/log/php8.2-fpm.log
```

### Nginx Hatası
```bash
nginx -t
tail -f /var/log/nginx/feribot-error.log
```

### Log Dosyaları
```bash
tail -f php-backend/logs/php-error.log
```
