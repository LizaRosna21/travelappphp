#!/bin/bash
# ============================================
# FERİBOT YÖNETİM SİSTEMİ - HOSTİNGER KURULUM SCRIPTI
# ============================================
# Bu scripti VPS'de çalıştırın: bash setup-hostinger.sh

set -e

echo "============================================"
echo "  Feribot Yönetim Sistemi - Hostinger Kurulum"
echo "============================================"
echo ""

# .env dosyası kontrolü
if [ ! -f ".env" ]; then
    echo "❌ .env dosyası bulunamadı!"
    echo "   Önce .env.example dosyasını .env olarak kopyalayıp düzenleyin:"
    echo "   cp .env.example .env"
    echo "   nano .env"
    exit 1
fi

echo "📦 Bağımlılıklar yükleniyor..."
npm install

echo ""
echo "🔨 Proje derleniyor (build)..."
npm run build

echo ""
echo "🗄️  Veritabanı tabloları oluşturuluyor..."
npm run db:push

echo ""
echo "🌱 Başlangıç verileri yükleniyor..."
npm run db:seed

echo ""
echo "📁 Logs klasörü oluşturuluyor..."
mkdir -p logs
mkdir -p public/uploads/backgrounds

echo ""
echo "🚀 PM2 ile uygulama başlatılıyor..."
pm2 start ecosystem.config.cjs --env production
pm2 save

echo ""
echo "============================================"
echo "  ✅ KURULUM TAMAMLANDI!"
echo "============================================"
echo ""
echo "  🌐 Site adresi: Nginx yapılandırmasından sonra"
echo "     domain adresiniz üzerinden erişebilirsiniz"
echo ""
echo "  👤 Admin Girişi:"
echo "     Kullanıcı: admin"
echo "     Şifre: admin123"
echo ""
echo "  ⚠️  ÖNEMLİ: İlk girişte şifrenizi değiştirin!"
echo ""
echo "  📋 Sonraki adımlar:"
echo "     1. Nginx yapılandırmasını kurun (nginx.conf)"
echo "     2. SSL sertifikası alın (Let's Encrypt)"
echo "     3. Admin panelinden site ayarlarını güncelleyin"
echo ""
echo "  🔍 Sağlık kontrolü:"
echo "     curl http://localhost:3000/api/health"
echo ""
echo "  📜 Logları izleme:"
echo "     pm2 logs feribot-yonetim"
echo ""
