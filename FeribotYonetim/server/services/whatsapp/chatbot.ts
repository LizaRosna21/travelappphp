import whatsAppService from './index';
import pnrQueryService from './pnr-query';
import { formatDate } from '../utils';

/**
 * WhatsApp Chatbot Servisi
 * WhatsApp üzerinde interaktif mesajlaşma ve komutları işleme
 */
class WhatsAppChatbotService {
  // Kullanıcı durumlarını takip etmek için
  private userStates: Record<string, {
    state: string,
    lastActivity: Date,
    data?: any
  }> = {};
  
  // Session zaman aşımı süresi (ms)
  private sessionTimeout = 30 * 60 * 1000; // 30 dakika
  
  // Kullanılabilir komutlar
  private commands: Record<string, (from: string) => Promise<void>> = {
    '1': this.handlePnrCommand.bind(this),
    'pnr': this.handlePnrCommand.bind(this),
    'sorgu': this.handlePnrCommand.bind(this),
    'sorgula': this.handlePnrCommand.bind(this),
    'seferler': this.handleRoutesCommand.bind(this),
    '2': this.handleRoutesCommand.bind(this),
    'rota': this.handleRoutesCommand.bind(this),
    'kampanya': this.handleCampaignsCommand.bind(this),
    'kampanyalar': this.handleCampaignsCommand.bind(this),
    '3': this.handleCampaignsCommand.bind(this),
    'indirim': this.handleCampaignsCommand.bind(this),
    'iletişim': this.handleContactCommand.bind(this),
    'iletisim': this.handleContactCommand.bind(this),
    'contact': this.handleContactCommand.bind(this),
    '4': this.handleContactCommand.bind(this),
    'yardım': this.handleHelpCommand.bind(this),
    'yardim': this.handleHelpCommand.bind(this),
    'help': this.handleHelpCommand.bind(this),
    '0': this.handleHelpCommand.bind(this),
    '?': this.handleHelpCommand.bind(this),
    'iptal': this.handleCancelCommand.bind(this),
    'kapat': this.handleCancelCommand.bind(this),
    'vazgeç': this.handleCancelCommand.bind(this),
    'vazgec': this.handleCancelCommand.bind(this),
    'cancel': this.handleCancelCommand.bind(this)
  };
  
  // Mesaj şablonları
  private templates = {
    welcome: `🚢 *Ferry Tickets'e Hoş Geldiniz* 🚢

Rezervasyon, bilet ve sefer bilgilerinizi sorgulayabilirsiniz.

*Komutlar:*
1️⃣ PNR Sorgulama
2️⃣ Seferler
3️⃣ Kampanyalar
4️⃣ İletişim
0️⃣ Yardım

İşlem yapmak için yukarıdaki komutlardan birini yazın veya numarasını gönderip devam edebilirsiniz.

Ayrıca, doğrudan PNR kodunuzu yazarak da sorgulama yapabilirsiniz.`,
    
    help: `*Yardım Menüsü* ℹ️

*Kullanılabilir Komutlar:*
• *PNR Sorgulama (1):* PNR/Rezervasyon kodunuzla bilet detaylarınızı görüntüleyin.
• *Seferler (2):* Güncel sefer bilgilerini listeleyin.
• *Kampanyalar (3):* Aktif kampanya ve indirimlerimizi öğrenin.
• *İletişim (4):* İletişim bilgilerimizi görüntüleyin.
• *Yardım (0):* Bu yardım menüsünü görüntüleyin.
• *İptal:* Aktif işlemi iptal edin.

Bir sorgulama sırasında işlemi iptal etmek için "iptal" yazabilirsiniz.

Başka sorunuz var mı?`,
    
    pnrRequest: `*PNR Sorgulaması* 🔍

Lütfen PNR (rezervasyon) kodunuzu giriniz.

Bu kod bilet oluşturulurken size verilen ve biletinizde yazan 6-10 haneli koddur. Örnek: ABC123

İşlemi iptal etmek için "iptal" yazabilirsiniz.`,
    
    pnrInvalid: `⚠️ Girdiğiniz PNR kodu geçersiz. Lütfen biletinizdeki kodu kontrol edip tekrar deneyiniz.

PNR kodları genellikle 6-10 karakter uzunluğunda olup harf ve rakamlardan oluşur.

İşlemi iptal etmek için "iptal" yazabilirsiniz.`,
    
    pnrNotFound: `⚠️ Girdiğiniz PNR kodu ile eşleşen bir rezervasyon bulunamadı.

Lütfen kodunuzu kontrol edip tekrar deneyiniz veya müşteri hizmetleri ile iletişime geçiniz.`,
    
    operationCancelled: `✅ İşlem iptal edildi.

Ana menüye dönmek için herhangi bir komut gönderebilir veya "yardım" yazabilirsiniz.`,
    
    sessionExpired: `⏰ *Oturum Zaman Aşımı*

Uzun süre işlem yapılmadığı için oturumunuz sona erdi.

Yeniden başlamak için herhangi bir komut gönderebilir veya "yardım" yazabilirsiniz.`,
    
    error: `❌ Üzgünüz, bir sorun oluştu.

Lütfen daha sonra tekrar deneyiniz veya müşteri hizmetleri ile iletişime geçiniz.`
  };
  
  constructor() {
    // Düzenli olarak süresi dolmuş oturumları temizle
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 5 dakikada bir
  }
  
  /**
   * WhatsApp mesajını işle
   * @param from - Gönderen telefon numarası
   * @param message - Gelen mesaj
   */
  public async processMessage(from: string, message: string): Promise<void> {
    try {
      if (!from || !message) {
        console.error('Invalid message or sender');
        return;
      }
      
      // Mesajı normalleştir
      const normalizedMessage = message.trim().toLowerCase();
      
      // Kullanıcı durumunu al
      const userState = this.getUserState(from);
      
      // İptal komutu kontrolü
      if (['iptal', 'kapat', 'vazgeç', 'vazgec', 'cancel'].includes(normalizedMessage)) {
        await this.handleCancelCommand(from);
        return;
      }
      
      // Komut mu kontrol et
      if (this.commands.hasOwnProperty(normalizedMessage) && userState?.state !== 'WAITING_PNR') {
        // Son etkinliği güncelle
        this.setUserState(from, 'COMMAND', { command: normalizedMessage });
        
        // Komutu çalıştır
        const commandFunction = this.commands[normalizedMessage];
        await commandFunction(from);
        return;
      }
      
      // Durum bazlı işlemler
      switch (userState?.state) {
        case 'INITIAL':
        case undefined:
          await this.handleInitialState(from, normalizedMessage);
          break;
          
        case 'WAITING_PNR':
          await this.handlePnrInput(from, normalizedMessage);
          break;
          
        default:
          // Tanımlanmamış durum, ana menüye dön
          await this.sendWelcomeMessage(from);
          this.resetUserState(from);
      }
    } catch (error) {
      console.error('Error processing WhatsApp message:', error);
      
      // Hata durumunda kullanıcıya bildir
      try {
        await this.sendMessage(from, '❌ *Bir hata oluştu*\n\nİşleminiz sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin veya müşteri hizmetlerimizle iletişime geçin.');
      } catch (e) {
        console.error('Error sending error message:', e);
      }
    }
  }

  /**
   * Başlangıç durumundaki işlemler
   */
  private async handleInitialState(from: string, message: string): Promise<void> {
    // PNR sorgusu olabilecek giriş kontrolü
    if (this.isPotentialPNRCode(message)) {
      // Doğrudan PNR sorgulaması yap
      await this.queryPnr(from, message);
    } else {
      // Komut anlaşılamadı, yardım mesajı gönder
      await this.sendWelcomeMessage(from);
    }
  }

  /**
   * Yardım komutu
   */
  private async handleHelpCommand(from: string): Promise<void> {
    await this.sendMessage(from, this.templates.help);
    this.resetUserState(from);
  }

  /**
   * PNR komutu
   */
  private async handlePnrCommand(from: string): Promise<void> {
    await this.sendMessage(from, this.templates.pnrRequest);
    this.setUserState(from, 'WAITING_PNR');
  }

  /**
   * Seferler komutu
   */
  private async handleRoutesCommand(from: string): Promise<void> {
    await this.sendDemoRoutes(from);
    this.resetUserState(from);
  }

  /**
   * Kampanyalar komutu
   */
  private async handleCampaignsCommand(from: string): Promise<void> {
    await this.sendDemoCampaigns(from);
    this.resetUserState(from);
  }

  /**
   * İletişim komutu
   */
  private async handleContactCommand(from: string): Promise<void> {
    await this.sendDemoContact(from);
    this.resetUserState(from);
  }

  /**
   * İptal komutu 
   */
  private async handleCancelCommand(from: string): Promise<void> {
    // Sadece aktif durum varsa iptal mesajı gönder
    if (this.userStates[from] && this.userStates[from].state !== 'INITIAL') {
      await this.sendMessage(from, this.templates.operationCancelled);
    }
    this.resetUserState(from);
  }

  /**
   * PNR giriş durumunda işlemler
   */
  private async handlePnrInput(from: string, message: string): Promise<void> {
    // PNR formatı doğrula
    if (!this.isPotentialPNRCode(message)) {
      await this.sendMessage(from, this.templates.pnrInvalid);
      return;
    }

    // PNR sorgulama
    await this.queryPnr(from, message);
  }

  /**
   * PNR sorgulaması
   */
  private async queryPnr(from: string, pnr: string): Promise<void> {
    try {
      const result = await pnrQueryService.queryPNR(pnr);
      
      if (result.success) {
        await this.sendMessage(from, result.message);
      } else {
        await this.sendMessage(from, `${this.templates.pnrNotFound}\n\n${result.message}`);
      }
      
      // Durumu sıfırla
      this.resetUserState(from);
    } catch (error) {
      console.error('Error querying PNR:', error);
      await this.sendMessage(from, 'PNR sorgulaması sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      this.resetUserState(from);
    }
  }

  /**
   * PNR formatını kontrol et
   */
  private isPotentialPNRCode(text: string): boolean {
    // PNR formatı doğrulama (genelde 6-10 karakter)
    if (!text || typeof text !== 'string') return false;
    
    const pnrRegex = /^[A-Za-z0-9]{3,10}$/;
    return pnrRegex.test(text.trim());
  }

  /**
   * Demo sefer bilgilerini gönder
   */
  private async sendDemoRoutes(from: string): Promise<void> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const formattedToday = formatDate(today.toISOString().split('T')[0], 'short', 'tr-TR');
    const formattedTomorrow = formatDate(tomorrow.toISOString().split('T')[0], 'short', 'tr-TR');
    
    const message = `🚢 *Popüler Seferler* 🚢

*${formattedToday} - ${formattedTomorrow} Tarihleri Arası*

*İstanbul - Yalova*
• 09:00 - 10:30 (Ferry Lines) - ₺120
• 12:00 - 13:30 (Sea Speed) - ₺135
• 15:00 - 16:30 (Ferry Lines) - ₺120
• 18:00 - 19:30 (Sea Speed) - ₺145

*İstanbul - Bursa*
• 08:30 - 10:30 (Blue Wave) - ₺150
• 13:30 - 15:30 (Ferry Lines) - ₺160
• 17:30 - 19:30 (Blue Wave) - ₺165

*İstanbul - Bandırma*
• 07:00 - 09:30 (Sea Speed) - ₺180
• 14:00 - 16:30 (Ferry Lines) - ₺190

*Yalova - İstanbul*
• 07:30 - 09:00 (Ferry Lines) - ₺120
• 11:00 - 12:30 (Sea Speed) - ₺135
• 16:00 - 17:30 (Ferry Lines) - ₺120

*Çalışma Günleri:*
${this.formatDaysOfWeek('1,2,3,4,5,6,7')}

Bilet satın almak için web sitemizi ziyaret edin:
🌐 www.ferrytickets.com`;

    await this.sendMessage(from, message);
  }

  /**
   * Demo kampanya bilgilerini gönder
   */
  private async sendDemoCampaigns(from: string): Promise<void> {
    const message = `🎉 *Güncel Kampanyalar* 🎉

*1. Yaz Sezonu İndirimi*
Tüm yaz sezonu boyunca, hafta içi seferlerde %15 indirim!
*Kod:* YAZ15
*Bitiş:* 31 Ağustos 2025
*Koşullar:* Pazartesi-Cuma arası seferlerde geçerlidir.

*2. Aile Paketi*
4 kişi ve üzeri aile biletlerinde %25'e varan indirim!
*Kod:* AILE25
*Bitiş:* 30 Eylül 2025
*Koşullar:* En az 2 yetişkin ve 2 çocuk içeren rezervasyonlarda geçerlidir.

*3. Erken Rezervasyon*
30 gün önceden alınan biletlerde %20 indirim!
*Kod:* ERKEN20
*Bitiş:* Sürekli kampanya
*Koşullar:* Seyahatten en az 30 gün önce yapılan rezervasyonlarda geçerlidir.

*4. Araçlı Yolcu İndirimi*
Araçlı yolculuklarda, dönüş bileti alımında %10 indirim!
*Kod:* ARAC10
*Bitiş:* 31 Aralık 2025
*Koşullar:* Gidiş-dönüş araçlı rezervasyonlarda geçerlidir.

*5. İlk Yolculuk İndirimi*
İlk kez Ferry Tickets ile seyahat edecekler için %15 indirim!
*Kod:* ILKYOLCULUK
*Bitiş:* Sürekli kampanya
*Koşullar:* Sadece yeni üye olan kullanıcılar için geçerlidir.

Kampanyalardan yararlanmak için, bilet alımı sırasında ilgili kampanya kodunu kullanın.

Detaylı bilgi için web sitemizi ziyaret edin:
🌐 www.ferrytickets.com/kampanyalar`;

    await this.sendMessage(from, message);
  }

  /**
   * Demo iletişim bilgilerini gönder
   */
  private async sendDemoContact(from: string): Promise<void> {
    const message = `📞 *İletişim Bilgileri* 📞

*Müşteri Hizmetleri:*
☎️ 0850 123 45 67
📧 info@ferrytickets.com

*Çalışma Saatleri:*
Hafta içi: 08:00 - 20:00
Hafta sonu: 09:00 - 18:00

*Ana Ofis:*
İstanbul, Beşiktaş, Barbaros Bulvarı No:123
📍 Konum: https://maps.app.goo.gl/example

*Bilet Satış Ofisleri:*
• İstanbul (Kabataş Terminal): 08:00 - 20:00
• Yalova (Feribot İskelesi): 07:30 - 19:30
• Bursa (Terminal): 08:00 - 19:00
• Bandırma (İskele): 07:00 - 20:00

*Online Kanallar:*
🌐 www.ferrytickets.com
📱 Ferry Tickets Mobil Uygulaması (iOS & Android)

*Sosyal Medya:*
Instagram: @ferrytickets
Facebook: /ferrytickets
Twitter: @ferrytickets

Acil durumlar için 7/24 ulaşabileceğiniz hat:
☎️ 0850 123 00 00`;

    await this.sendMessage(from, message);
  }

  /**
   * Çalışma günlerini formatla
   */
  private formatDaysOfWeek(daysOfWeek: string): string {
    const days = {
      '1': 'Pazartesi',
      '2': 'Salı',
      '3': 'Çarşamba',
      '4': 'Perşembe',
      '5': 'Cuma',
      '6': 'Cumartesi',
      '7': 'Pazar'
    };
    
    const dayNumbers = daysOfWeek.split(',');
    
    if (dayNumbers.length === 7) {
      return 'Her gün';
    }
    
    return dayNumbers.map(d => days[d as keyof typeof days]).join(', ');
  }

  /**
   * Kullanıcı durumunu al
   */
  private getUserState(from: string) {
    if (!this.userStates[from]) {
      this.userStates[from] = {
        state: 'INITIAL',
        lastActivity: new Date()
      };
    }
    
    return this.userStates[from];
  }

  /**
   * Kullanıcı durumunu ayarla
   */
  private setUserState(from: string, state: string, data?: any) {
    this.userStates[from] = {
      state,
      data,
      lastActivity: new Date()
    };
  }

  /**
   * Kullanıcı durumunu sıfırla
   */
  private resetUserState(from: string) {
    this.setUserState(from, 'INITIAL');
  }

  /**
   * Süresi dolmuş oturumları temizle
   */
  private cleanupExpiredSessions() {
    const now = new Date();
    
    for (const [from, state] of Object.entries(this.userStates)) {
      const timeDiff = now.getTime() - state.lastActivity.getTime();
      
      if (timeDiff > this.sessionTimeout && state.state !== 'INITIAL') {
        // Oturum zaman aşımı bildirimi gönder
        this.sendMessage(from, this.templates.sessionExpired)
          .catch(err => console.error('Error sending session timeout message:', err));
        
        // Durumu sıfırla
        this.resetUserState(from);
      }
    }
  }

  /**
   * Mesaj gönder
   */
  private async sendMessage(to: string, message: string): Promise<any> {
    try {
      // WhatsApp servisi kullanarak mesaj gönder
      return await whatsAppService.sendMessage(to, message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Karşılama mesajı
   */
  async sendWelcomeMessage(to: string): Promise<any> {
    try {
      // Kullanıcı durumunu başlat veya sıfırla
      this.resetUserState(to);
      
      // Karşılama mesajını gönder
      return await this.sendMessage(to, this.templates.welcome);
    } catch (error) {
      console.error('Error sending welcome message:', error);
      throw error;
    }
  }
}

// Singleton instance
const whatsAppChatbotService = new WhatsAppChatbotService();

export default whatsAppChatbotService;