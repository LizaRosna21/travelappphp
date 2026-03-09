# Feribot Yönetim Sistemi - Canlıya Alma Rehberi (Hostinger VPS)

Bu rehber, sisteminizi Hostinger VPS üzerinde adım adım canlıya almanızı sağlar.

---

## Gereksinimler

| Gereksinim | Minimum |
|-----------|---------|
| VPS Planı | Hostinger KVM 2 veya üstü |
| İşletim Sistemi | Ubuntu 22.04 LTS |
| RAM | 2 GB |
| Disk | 20 GB SSD |
| Node.js | v20 LTS |
| PostgreSQL | 14+ |
| Domain | DNS yönetimine erişim |

---

## ADIM 1: Hostinger VPS'e Bağlanma

```bash
# Hostinger panelinden VPS IP adresinizi öğrenin
# SSH ile bağlanın
ssh root@VPS_IP_ADRESINIZ
```

> Hostinger panelinde: VPS → Yönet → SSH Erişimi bölümünden IP ve şifrenizi bulabilirsiniz.

---

## ADIM 2: Sunucu Hazırlığı

### 2.1 Sistem Güncellemesi

```bash
apt update && apt upgrade -y
```

### 2.2 Gerekli Paketlerin Kurulumu

```bash
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw
```

### 2.3 Node.js 20 LTS Kurulumu

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Doğrulama
node --version   # v20.x.x
npm --version    # 10.x.x
```

### 2.4 PM2 Kurulumu (Process Manager)

```bash
npm install -g pm2
```

---

## ADIM 3: PostgreSQL Veritabanı Kurulumu

### 3.1 PostgreSQL Kurulumu

```bash
apt install -y postgresql postgresql-contrib

# Servisi başlat
systemctl start postgresql
systemctl enable postgresql
```

### 3.2 Veritabanı ve Kullanıcı Oluşturma

```bash
sudo -u postgres psql
```

PostgreSQL konsolunda aşağıdaki komutları çalıştırın:

```sql
-- Güçlü bir şifre belirleyin (aşağıdaki örneği DEĞİŞTİRİN!)
CREATE USER feribotuser WITH PASSWORD 'GucluBirSifre123!';

-- Veritabanı oluşturun
CREATE DATABASE feribot_db OWNER feribotuser;

-- Yetkileri verin
GRANT ALL PRIVILEGES ON DATABASE feribot_db TO feribotuser;

-- Çıkış
\q
```

### 3.3 PostgreSQL Bağlantısını Test Edin

```bash
psql -U feribotuser -d feribot_db -h localhost
# Şifrenizi girin, bağlanabiliyorsanız OK
\q
```

---

## ADIM 4: Uygulama Kullanıcısı Oluşturma

Root ile çalışmak güvenli değildir. Özel bir kullanıcı oluşturun:

```bash
# Kullanıcı oluştur
adduser feribot
usermod -aG sudo feribot

# Uygulama dizinini oluştur
mkdir -p /home/feribot/htdocs/siteniz.com
chown -R feribot:feribot /home/feribot/htdocs
```

> **Not:** `siteniz.com` yerine kendi domain adınızı yazın.

---

## ADIM 5: Projeyi Sunucuya Yükleme

### Seçenek A: Git ile (Önerilen)

```bash
su - feribot
cd /home/feribot/htdocs/siteniz.com

# Repoyu klonlayın
git clone https://github.com/KULLANICI_ADINIZ/travelappphp.git .

# Veya sadece FeribotYonetim klasörünü kullanın
cd FeribotYonetim
```

### Seçenek B: SCP/SFTP ile

Kendi bilgisayarınızdan:

```bash
scp -r ./FeribotYonetim/* feribot@VPS_IP:/home/feribot/htdocs/siteniz.com/
```

---

## ADIM 6: Ortam Değişkenlerini Yapılandırma

Bu en kritik adımdır. `.env` dosyasını düzenleyin:

```bash
cd /home/feribot/htdocs/siteniz.com
nano .env
```

Aşağıdaki değerleri **kendi bilgilerinizle** güncelleyin:

```env
# VERİTABANI - Adım 3'te oluşturduğunuz bilgiler
DATABASE_URL=postgresql://feribotuser:GucluBirSifre123!@localhost:5432/feribot_db
DB_SSL=false

# UYGULAMA
PORT=3000
NODE_ENV=production

# GÜVENLİK - Rastgele uzun bir string oluşturun
SESSION_SECRET=buraya-en-az-32-karakter-rastgele-bir-metin-yazin-1234567890abcdef

# DOMAIN - Kendi domain adınız
SITE_URL=https://siteniz.com
CORS_ORIGIN=https://siteniz.com

# DEMO MODU KAPALI
DEMO_MODE=false
```

> **Güçlü SESSION_SECRET oluşturmak için:**
> ```bash
> openssl rand -hex 32
> ```

---

## ADIM 7: Uygulamayı Kurma ve Derleme

```bash
cd /home/feribot/htdocs/siteniz.com

# Bağımlılıkları yükle
npm install

# Projeyi derle
npm run build

# Veritabanı tablolarını oluştur
npm run db:push

# Başlangıç verilerini yükle (admin kullanıcısı dahil)
npm run db:seed

# Log dizinini oluştur
mkdir -p logs
mkdir -p public/uploads/backgrounds
```

### Test Edin

```bash
# Uygulamayı test modunda başlatın
node dist/index.js
```

Tarayıcınızda `http://VPS_IP:3000` adresini açın. Sayfa geliyorsa devam edin. Ctrl+C ile durdurun.

---

## ADIM 8: PM2 ile Uygulama Yönetimi

### 8.1 ecosystem.config.cjs Dosyasını Güncelleyin

```bash
nano ecosystem.config.cjs
```

`cwd` yolunu kendi dizininize güncelleyin:

```javascript
module.exports = {
  apps: [
    {
      name: "feribot-yonetim",
      script: "dist/index.js",
      cwd: "/home/feribot/htdocs/siteniz.com",  // ← Kendi yolunuz
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      merge_logs: true,
    },
  ],
};
```

### 8.2 PM2 ile Başlatma

```bash
# Uygulamayı başlat
pm2 start ecosystem.config.cjs --env production

# Durumu kontrol et
pm2 status

# Sunucu yeniden başladığında otomatik çalışsın
pm2 startup
pm2 save
```

### PM2 Komutları (İleride Lazım Olacak)

```bash
pm2 status                    # Durum kontrolü
pm2 logs feribot-yonetim      # Canlı loglar
pm2 restart feribot-yonetim   # Yeniden başlat
pm2 stop feribot-yonetim      # Durdur
pm2 monit                     # Anlık izleme paneli
```

---

## ADIM 9: Domain DNS Ayarları (Hostinger Paneli)

Hostinger kontrol panelinde:

1. **Domains** → Domain adınızı seçin → **DNS Zone**
2. Aşağıdaki kayıtları ekleyin/güncelleyin:

| Tür | İsim | Değer | TTL |
|-----|------|-------|-----|
| A | @ | VPS_IP_ADRESINIZ | 3600 |
| A | www | VPS_IP_ADRESINIZ | 3600 |

> DNS değişikliklerinin yayılması 5-30 dakika sürebilir.

### DNS'in Yayıldığını Kontrol Edin

```bash
# Kendi bilgisayarınızdan
ping siteniz.com
nslookup siteniz.com
```

IP adresi VPS IP'nize işaret ediyorsa DNS hazır demektir.

---

## ADIM 10: Nginx Reverse Proxy Kurulumu

### 10.1 Nginx Yapılandırması

```bash
# Root kullanıcı olarak
sudo nano /etc/nginx/sites-available/siteniz.com
```

Projenizdeki `nginx.conf` dosyasının içeriğini yapıştırın, ancak şu yerleri güncelleyin:

- `siteniz.com` → kendi domain adınız
- `/home/kullanici/htdocs/siteniz.com` → `/home/feribot/htdocs/siteniz.com`

### 10.2 Yapılandırmayı Aktifleştirme

```bash
# Sembolik link oluştur
sudo ln -s /etc/nginx/sites-available/siteniz.com /etc/nginx/sites-enabled/

# Varsayılan siteyi kaldır
sudo rm -f /etc/nginx/sites-enabled/default

# Yapılandırmayı test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## ADIM 11: SSL Sertifikası (Let's Encrypt - Ücretsiz HTTPS)

```bash
# SSL sertifikası al
sudo certbot --nginx -d siteniz.com -d www.siteniz.com

# E-posta adresinizi girin
# Koşulları kabul edin (Y)
# HTTP → HTTPS yönlendirmesi için 2'yi seçin
```

### Otomatik Yenileme Testi

```bash
sudo certbot renew --dry-run
```

> Let's Encrypt sertifikaları 90 günlük olup certbot otomatik yeniler.

---

## ADIM 12: Güvenlik Duvarı (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Durumu kontrol et
sudo ufw status
```

**Sonuç:**
- Port 22 (SSH): Açık
- Port 80 (HTTP): Açık (HTTPS'e yönlendirilir)
- Port 443 (HTTPS): Açık
- Port 3000: Dışarıya kapalı (sadece Nginx üzerinden erişilir)

---

## ADIM 13: İlk Giriş ve Kontroller

### 13.1 Sağlık Kontrolü

```bash
curl http://localhost:3000/api/health
```

Beklenen yanıt:
```json
{
  "status": "healthy",
  "database": "connected",
  "environment": "production"
}
```

### 13.2 Tarayıcıdan Erişim

1. `https://siteniz.com` adresini açın
2. Ana sayfa gelmelidir

### 13.3 Admin Paneline Giriş

1. `https://siteniz.com/admin-login` adresine gidin
2. Varsayılan giriş bilgileri:
   - **Kullanıcı adı:** `admin`
   - **Şifre:** `admin123`
3. **İLK İŞ: Şifrenizi değiştirin!**

---

## ADIM 14: Otomatik Yedekleme (Opsiyonel ama Önerilir)

### Günlük Veritabanı Yedeği

```bash
# Yedekleme scripti oluştur
sudo nano /home/feribot/backup.sh
```

İçeriği:

```bash
#!/bin/bash
BACKUP_DIR="/home/feribot/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Veritabanı yedeği
pg_dump -U feribotuser feribot_db > "$BACKUP_DIR/feribot_db_$DATE.sql"

# 7 günden eski yedekleri sil
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Yedekleme tamamlandı: $DATE"
```

```bash
chmod +x /home/feribot/backup.sh

# Cron job ekle (her gece 03:00'te)
crontab -e
# Aşağıdaki satırı ekleyin:
0 3 * * * /home/feribot/backup.sh >> /home/feribot/backups/backup.log 2>&1
```

---

## Güncelleme Prosedürü

Yeni bir sürüm yayınladığınızda:

```bash
su - feribot
cd /home/feribot/htdocs/siteniz.com

# Kodu çek
git pull origin main

# Bağımlılıkları güncelle
npm install

# Yeniden derle
npm run build

# Veritabanı değişikliklerini uygula
npm run db:push

# Uygulamayı yeniden başlat
pm2 restart feribot-yonetim

# Logları kontrol et
pm2 logs feribot-yonetim --lines 20
```

---

## Sorun Giderme

### Uygulama başlamıyor

```bash
# Logları kontrol et
pm2 logs feribot-yonetim --lines 50

# Manuel başlatarak hatayı gör
cd /home/feribot/htdocs/siteniz.com
node dist/index.js
```

### Veritabanı bağlantı hatası

```bash
# PostgreSQL çalışıyor mu?
sudo systemctl status postgresql

# Bağlantıyı test et
psql -U feribotuser -d feribot_db -h localhost

# .env dosyasındaki DATABASE_URL doğru mu?
cat .env | grep DATABASE_URL
```

### Nginx 502 Bad Gateway

```bash
# Node.js uygulaması çalışıyor mu?
pm2 status

# Port 3000'de dinleniyor mu?
ss -tlnp | grep 3000

# Nginx loglarını kontrol et
sudo tail -f /var/log/nginx/error.log
```

### Site açılmıyor (DNS sorunu)

```bash
# DNS kontrol
dig siteniz.com
nslookup siteniz.com

# DNS yayılması 30 dakikaya kadar sürebilir
```

### SSL sertifika hatası

```bash
# Sertifika durumu
sudo certbot certificates

# Manuel yenileme
sudo certbot renew

# Nginx'i yeniden başlat
sudo systemctl restart nginx
```

### Bellek yetersiz

```bash
# Bellek kullanımı
free -h

# PM2 bellek kullanımı
pm2 monit

# Swap alanı ekle (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Özet Kontrol Listesi

Canlıya almadan önce tamamlamanız gerekenler:

- [ ] VPS'e SSH ile bağlan
- [ ] Sistem güncelle, gerekli paketleri kur
- [ ] Node.js 20 ve PM2 kur
- [ ] PostgreSQL kur, veritabanı ve kullanıcı oluştur
- [ ] Uygulama kullanıcısı oluştur
- [ ] Projeyi sunucuya yükle (git clone veya scp)
- [ ] `.env` dosyasını düzenle (DATABASE_URL, SESSION_SECRET, SITE_URL)
- [ ] `npm install && npm run build`
- [ ] `npm run db:push && npm run db:seed`
- [ ] PM2 ile uygulamayı başlat
- [ ] DNS kayıtlarını VPS IP'ye yönlendir
- [ ] Nginx yapılandırmasını kur
- [ ] SSL sertifikası al (certbot)
- [ ] Güvenlik duvarını aktifleştir (ufw)
- [ ] `https://siteniz.com` adresinden test et
- [ ] Admin şifresini değiştir
- [ ] Otomatik yedekleme kur
