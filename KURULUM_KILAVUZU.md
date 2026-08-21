# FerryBooking Sistemi Kurulum Kılavuzu

Bu belge, FerryBooking sisteminin sunucu ortamına kurulumu için gerekli adımları içermektedir.

## İçindekiler

1. [Sistem Gereksinimleri](#sistem-gereksinimleri)
2. [Ön Hazırlık](#ön-hazırlık)
3. [Uygulama Kurulumu](#uygulama-kurulumu)
4. [Veritabanı Kurulumu](#veritabanı-kurulumu)
5. [Çevre Değişkenleri Yapılandırması](#çevre-değişkenleri-yapılandırması)
6. [Uygulama Başlatma](#uygulama-başlatma)
7. [Güvenlik Önerileri](#güvenlik-önerileri)
8. [Sorun Giderme](#sorun-giderme)

## Sistem Gereksinimleri

- İşletim Sistemi: Ubuntu 20.04 LTS veya üzeri (diğer dağıtımlar da desteklenir)
- Node.js: v18.x veya v20.x
- PostgreSQL: 14.x veya üzeri
- En az 2GB RAM
- En az 20GB disk alanı
- Internet bağlantısı

## Ön Hazırlık

1. Node.js Kurulumu:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. PostgreSQL Kurulumu:
   ```bash
   sudo apt-get install -y postgresql postgresql-contrib
   ```

3. Gerekli Paketlerin Kurulumu:
   ```bash
   sudo apt-get install -y git curl build-essential
   ```

## Uygulama Kurulumu

1. Uygulama için bir dizin oluşturun:
   ```bash
   sudo mkdir -p /opt/ferrybooking
   ```

2. Uygulamayı GitHub veya başka bir kaynaktan klonlayın:
   ```bash
   sudo git clone https://github.com/kullanici/ferrybooking.git /opt/ferrybooking
   ```

3. Uygulama dizinine geçin:
   ```bash
   cd /opt/ferrybooking
   ```

4. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

## Veritabanı Kurulumu

1. PostgreSQL servisini başlatın:
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. Veritabanı ve kullanıcı oluşturun:
   ```bash
   sudo -i -u postgres psql
   ```

3. PostgreSQL komut satırında aşağıdaki komutları çalıştırın:
   ```sql
   CREATE USER ferrybookinguser WITH PASSWORD 'güçlü_bir_şifre';
   CREATE DATABASE ferrybookingdb;
   GRANT ALL PRIVILEGES ON DATABASE ferrybookingdb TO ferrybookinguser;
   \q
   ```

## Çevre Değişkenleri Yapılandırması

1. Uygulama dizininde `.env` dosyası oluşturun:
   ```bash
   cd /opt/ferrybooking
   sudo nano .env
   ```

2. `.env` dosyasına aşağıdaki içeriği ekleyin ve değerlerinizle güncelleyin:
   ```
   # Veritabanı Bağlantısı
   DATABASE_URL=postgresql://ferrybookinguser:güçlü_bir_şifre@localhost:5432/ferrybookingdb

   # Uygulama Ayarları
   PORT=5000
   NODE_ENV=production
   SESSION_SECRET=rastgele_uzun_bir_güvenlik_anahtarı

   # API Anahtarları (Gerçek anahtarlarınızla değiştirin)
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   VITE_STRIPE_PUBLIC_KEY=pk_test_...

   # SendGrid
   SENDGRID_API_KEY=SG.....

   # Türk Ödeme Sağlayıcıları
   # PayU
   PAYU_MERCHANT_ID=...
   PAYU_SECRET_KEY=...

   # Iyzico
   IYZICO_API_KEY=...
   IYZICO_SECRET_KEY=...

   # PayTR
   PAYTR_MERCHANT_ID=...
   PAYTR_MERCHANT_KEY=...
   PAYTR_MERCHANT_SALT=...

   # WhatsApp Business API
   WHATSAPP_API_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   ```

3. Yapılandırmayı kaydedip çıkın (nano için: CTRL+O, ENTER, CTRL+X)

4. Veritabanı şemasını oluşturun:
   ```bash
   cd /opt/ferrybooking
   npm run db:push
   ```

## Uygulama Başlatma

### PM2 ile Başlatma (Önerilen)

1. PM2'yi global olarak yükleyin:
   ```bash
   sudo npm install -g pm2
   ```

2. Uygulamayı PM2 ile başlatın:
   ```bash
   cd /opt/ferrybooking
   pm2 start npm --name "ferrybooking" -- run start
   ```

3. Sistem başlangıcında otomatik başlaması için:
   ```bash
   pm2 startup
   pm2 save
   ```

### Systemd ile Başlatma (Alternatif)

1. Servis dosyası oluşturun:
   ```bash
   sudo nano /etc/systemd/system/ferrybooking.service
   ```

2. Aşağıdaki içeriği ekleyin:
   ```
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
   ```

3. Servisi etkinleştirin ve başlatın:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable ferrybooking.service
   sudo systemctl start ferrybooking.service
   ```

4. Servis durumunu kontrol edin:
   ```bash
   sudo systemctl status ferrybooking.service
   ```

## Güvenlik Önerileri

1. **Nginx Reverse Proxy**: SSL/TLS için Nginx reverse proxy kurun:
   ```bash
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```

2. **Nginx Yapılandırması**:
   ```bash
   sudo nano /etc/nginx/sites-available/ferrybooking
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **SSL/TLS Sertifikası**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ferrybooking /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **Güvenlik Duvarı Yapılandırması**:
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   ```

## Sorun Giderme

### Uygulama Başlatma Sorunları

1. Log dosyalarını kontrol edin:
   ```bash
   # PM2 için
   pm2 logs ferrybooking

   # Systemd için
   sudo journalctl -u ferrybooking.service
   ```

2. Bağlantı noktası çakışması:
   ```bash
   # Kullanılan bağlantı noktalarını kontrol edin
   sudo netstat -tulpn | grep LISTEN
   ```

### Veritabanı Sorunları

1. PostgreSQL servisini kontrol edin:
   ```bash
   sudo systemctl status postgresql
   ```

2. Veritabanı bağlantısını test edin:
   ```bash
   psql -h localhost -U ferrybookinguser -d ferrybookingdb
   ```

3. `.env` dosyasındaki bağlantı bilgilerini doğrulayın.

### Performans Sorunları

1. Sunucu kaynaklarını kontrol edin:
   ```bash
   htop
   ```

2. Node.js bellek kullanımını kontrol edin (PM2 için):
   ```bash
   pm2 monit
   ```

---

Bu kurulum kılavuzu ile ilgili herhangi bir soru veya sorununuz varsa, lütfen destek ekibimizle iletişime geçin.