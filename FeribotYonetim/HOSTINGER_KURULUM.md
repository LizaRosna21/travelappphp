# Feribot Yönetim Sistemi - Hostinger VPS Kurulum Kılavuzu

## Gereksinimler

- **Hostinger VPS** (KVM 2 veya üzeri önerilir)
- **Ubuntu 22.04 LTS** (veya üzeri)
- **Domain adı** (Hostinger üzerinden yönetilen)
- **SSH erişimi**

---

## 1. VPS İlk Kurulum

### 1.1 SSH ile Bağlanma
```bash
ssh root@VPS_IP_ADRESINIZ
```

### 1.2 Sistemi Güncelleme
```bash
apt update && apt upgrade -y
```

### 1.3 Node.js Kurulumu (v20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node -v  # v20.x.x olmalı
npm -v
```

### 1.4 PostgreSQL Kurulumu
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 1.5 Nginx Kurulumu
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 1.6 PM2 Kurulumu (Process Manager)
```bash
npm install -g pm2
```

### 1.7 Git Kurulumu
```bash
apt install -y git
```

---

## 2. PostgreSQL Veritabanı Kurulumu

### 2.1 PostgreSQL'e Bağlanma
```bash
sudo -u postgres psql
```

### 2.2 Veritabanı ve Kullanıcı Oluşturma
```sql
-- Veritabanı oluştur
CREATE DATABASE feribot_db;

-- Kullanıcı oluştur (ŞİFRENİZİ DEĞİŞTİRİN!)
CREATE USER feribotuser WITH ENCRYPTED PASSWORD 'GÜÇLÜ_BİR_ŞİFRE_GİRİN';

-- Yetkileri ver
GRANT ALL PRIVILEGES ON DATABASE feribot_db TO feribotuser;

-- Şema yetkilerini ver
\c feribot_db
GRANT ALL ON SCHEMA public TO feribotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO feribotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO feribotuser;

-- Çık
\q
```

### 2.3 PostgreSQL Uzak Erişim Ayarları (isteğe bağlı)
```bash
# pg_hba.conf dosyasını düzenleyin
nano /etc/postgresql/14/main/pg_hba.conf

# Aşağıdaki satırı ekleyin (sadece localhost için):
# local   all   feribotuser   md5
```

```bash
systemctl restart postgresql
```

---

## 3. Uygulama Kurulumu

### 3.1 Proje Dosyalarını Yükleme
```bash
# Kullanıcı dizini oluştur
mkdir -p /home/kullanici/htdocs/siteniz.com
cd /home/kullanici/htdocs/siteniz.com

# Git ile klonlama
git clone https://github.com/LizaRosna21/travelappphp.git .

# Veya dosyaları SFTP ile yükleyin
# FeribotYonetim klasörünü kök dizine taşıyın
cp -r FeribotYonetim/* .
```

### 3.2 Environment Dosyasını Yapılandırma
```bash
# .env dosyasını oluşturun
cp .env.example .env
nano .env
```

**.env içeriğini düzenleyin:**
```env
# VERİTABANI - Yukarıda oluşturduğunuz bilgiler
DATABASE_URL=postgresql://feribotuser:GÜÇLÜ_BİR_ŞİFRE@localhost:5432/feribot_db
DB_SSL=false

# UYGULAMA
PORT=3000
NODE_ENV=production

# Oturum anahtarı oluşturun:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=BURAYA_OLUŞTURDUĞUNUZ_ANAHTAR

# DOMAIN
SITE_URL=https://siteniz.com
CORS_ORIGIN=https://siteniz.com

# DEMO MODU KAPALI
DEMO_MODE=false
```

### 3.3 Bağımlılıkları Yükleme
```bash
npm install
```

### 3.4 Projeyi Derleme (Build)
```bash
npm run build
```

### 3.5 Veritabanı Tablolarını Oluşturma
```bash
npm run db:push
```

### 3.6 Başlangıç Verilerini Yükleme
```bash
npm run db:seed
```

### 3.7 Logs Klasörü Oluşturma
```bash
mkdir -p logs
```

---

## 4. PM2 ile Uygulama Başlatma

### 4.1 Uygulamayı Başlatma
```bash
# ecosystem.config.cjs dosyasındaki yolları güncelleyin
nano ecosystem.config.cjs

# Uygulamayı başlatın
pm2 start ecosystem.config.cjs --env production

# Durumu kontrol edin
pm2 status
pm2 logs feribot-yonetim
```

### 4.2 PM2 Otomatik Başlatma
```bash
# Sunucu yeniden başladığında PM2'nin otomatik başlaması için
pm2 startup
pm2 save
```

---

## 5. Nginx Reverse Proxy Yapılandırması

### 5.1 Nginx Site Yapılandırması
```bash
nano /etc/nginx/sites-available/siteniz.com
```

**nginx.conf dosyasının içeriğini yapıştırın** (proje kökündeki `nginx.conf` dosyasını kullanın, domain adını değiştirin).

### 5.2 Site'ı Aktifleştirme
```bash
# Sembolik link oluştur
ln -s /etc/nginx/sites-available/siteniz.com /etc/nginx/sites-enabled/

# Varsayılan site'ı kaldır
rm /etc/nginx/sites-enabled/default

# Yapılandırmayı test et
nginx -t

# Nginx'i yeniden başlat
systemctl restart nginx
```

---

## 6. SSL Sertifikası (Let's Encrypt)

### 6.1 Certbot Kurulumu
```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2 SSL Sertifikası Alma
```bash
certbot --nginx -d siteniz.com -d www.siteniz.com
```

### 6.3 Otomatik Yenileme
```bash
# Sertifika otomatik yenileme testi
certbot renew --dry-run
```

---

## 7. Domain Ayarları (Hostinger Panel)

### 7.1 DNS Ayarları
Hostinger panelinde:
1. **Domains** > **DNS Zone** bölümüne gidin
2. Aşağıdaki kayıtları ekleyin/güncelleyin:

| Tip | İsim | Değer | TTL |
|-----|-------|-------|-----|
| A | @ | VPS_IP_ADRESİNİZ | 3600 |
| A | www | VPS_IP_ADRESİNİZ | 3600 |
| CNAME | www | siteniz.com | 3600 |

### 7.2 Nameserver Ayarları
Eğer domain Hostinger'da ise DNS otomatik yönetilir. Harici domain için Hostinger'ın nameserver'larını kullanın.

---

## 8. Güvenlik Ayarları

### 8.1 Firewall (UFW)
```bash
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### 8.2 Fail2ban Kurulumu (İsteğe bağlı)
```bash
apt install -y fail2ban
systemctl start fail2ban
systemctl enable fail2ban
```

### 8.3 Admin Şifresini Değiştirme
1. Tarayıcıdan `https://siteniz.com/admin` adresine gidin
2. **Kullanıcı:** admin / **Şifre:** admin123
3. Profil ayarlarından şifrenizi **hemen** değiştirin!

---

## 9. Yedekleme

### 9.1 Veritabanı Yedekleme
```bash
# Manuel yedek alma
pg_dump -U feribotuser feribot_db > /home/kullanici/backups/feribot_db_$(date +%Y%m%d).sql

# Otomatik yedekleme (crontab)
crontab -e
# Her gün gece 3'te yedek al:
# 0 3 * * * pg_dump -U feribotuser feribot_db > /home/kullanici/backups/feribot_db_$(date +\%Y\%m\%d).sql
```

### 9.2 Dosya Yedekleme
```bash
# Uploads klasörünü yedekle
tar -czf /home/kullanici/backups/uploads_$(date +%Y%m%d).tar.gz /home/kullanici/htdocs/siteniz.com/public/uploads/
```

---

## 10. Güncelleme Prosedürü

```bash
cd /home/kullanici/htdocs/siteniz.com

# Güncellemeleri çek
git pull origin main

# Bağımlılıkları güncelle
npm install

# Projeyi yeniden derle
npm run build

# Veritabanı şemasını güncelle
npm run db:push

# Uygulamayı yeniden başlat
pm2 restart feribot-yonetim
```

---

## 11. Sorun Giderme

### Uygulama çalışmıyor
```bash
pm2 logs feribot-yonetim --lines 50
```

### Veritabanı bağlantı hatası
```bash
# PostgreSQL durumunu kontrol et
systemctl status postgresql

# Bağlantıyı test et
psql -U feribotuser -d feribot_db -h localhost
```

### Nginx hatası
```bash
nginx -t
systemctl status nginx
cat /var/log/nginx/error.log
```

### Port çakışması
```bash
# 3000 portunu kullanan işlemi bul
lsof -i :3000
```

### Sağlık kontrolü
```bash
curl http://localhost:3000/api/health
```

---

## 12. Hızlı Kurulum Komutu

Tüm adımları tek seferde çalıştırmak için:

```bash
#!/bin/bash
# setup-hostinger.sh

# Bağımlılıkları yükle
npm install

# Projeyi derle
npm run build

# Veritabanı tablolarını oluştur
npm run db:push

# Başlangıç verilerini yükle
npm run db:seed

# Logs klasörünü oluştur
mkdir -p logs

# PM2 ile başlat
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

echo "✅ Kurulum tamamlandı!"
echo "🌐 Site: https://siteniz.com"
echo "👤 Admin: admin / admin123"
echo "⚠️  Şifrenizi hemen değiştirin!"
```

---

## Destek

Sorun yaşarsanız:
1. PM2 loglarını kontrol edin: `pm2 logs`
2. Sağlık kontrolü yapın: `curl http://localhost:3000/api/health`
3. Veritabanı bağlantısını test edin
4. Nginx yapılandırmasını kontrol edin: `nginx -t`
