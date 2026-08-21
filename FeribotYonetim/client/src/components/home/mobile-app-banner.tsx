import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Smartphone } from "lucide-react";

// Bilet.com tarzı mobil uygulama banner bileşeni
const MobileAppBanner = () => {
  const benefits = [
    "Daha hızlı bilet alma süreci",
    "Biletlerinize offline erişim",
    "Bildirimlerle güncel kalın",
    "Özel kampanya ve indirimler"
  ];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Sol Taraf - Metin İçeriği */}
          <div>
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
              YENİ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              FerryTicket Mobil Uygulamasını İndirin
            </h2>
            <p className="text-white/80 mb-6">
              Seyahat planlamanızı kolaylaştırmak için mobil uygulamamızı hemen cep telefonunuza indirin. 
              İndirimli biletler, özel kampanyalar ve daha fazlası...
            </p>
            
            <div className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-blue-200" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
            
            {/* İndirme Butonları */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 h-14 px-4">
                <img 
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                  alt="App Store" 
                  className="h-7"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML += '<span class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M12 19c-2 0-4-2-4-4a1 1 0 0 0-2 0c0 3 3 6 6 6 0 0 0-2 0-2z"></path><path d="M12 12c-2 0-5-3-5-3 0 0 3-2 5-2"></path><path d="M17 17c3 0 5-2 5-5a1 1 0 0 0-2 0c0 2-1 3-3 3 0 0 0 2 0 2z"></path><path d="M12 19c-2 0-4-2-4-4a1 1 0 0 0-2 0c0 3 3 6 6 6 0 0 0-2 0-2z"></path></svg> App Store\'dan İndir</span>';
                  }}
                />
              </Button>
              <Button className="bg-white text-blue-700 hover:bg-blue-50 h-14 px-4">
                <img 
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                  alt="Google Play" 
                  className="h-7"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML += '<span class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg> Google Play\'den İndir</span>';
                  }}
                />
              </Button>
            </div>
          </div>
          
          {/* Sağ Taraf - Mobil Uygulama Görseli */}
          <div className="flex justify-center relative">
            <div className="relative">
              {/* Arka plan süsleri */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-400/30 rounded-full blur-xl"></div>
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-300/30 rounded-full blur-xl"></div>
              
              {/* Telefon görseli */}
              <div className="relative z-10 bg-white p-3 rounded-3xl shadow-2xl transform rotate-6">
                <div className="bg-gray-100 rounded-2xl overflow-hidden border-8 border-white w-60 h-[450px] md:w-72 md:h-[520px] relative">
                  <img 
                    src="https://i.ibb.co/znHKmZ8/bilet-mobil-app.png" 
                    alt="FerryTicket Mobil Uygulama" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full p-4 text-center">
                          <div class="bg-blue-100 p-4 rounded-full mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600">
                              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                              <path d="M12 18h.01"></path>
                            </svg>
                          </div>
                          <div class="text-xl font-bold text-gray-800 mb-2">FerryTicket</div>
                          <div class="text-sm text-gray-500 mb-4">Mobil Uygulama</div>
                          <div class="space-y-3 w-full">
                            <div class="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 mr-2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span class="text-xs text-gray-600">Kolay Bilet Alma</span>
                            </div>
                            <div class="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 mr-2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span class="text-xs text-gray-600">Bilet Takibi</span>
                            </div>
                            <div class="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 mr-2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span class="text-xs text-gray-600">Bildirimler</span>
                            </div>
                          </div>
                        </div>
                      `;
                    }}
                  />
                  
                  {/* Telefon içindeki çentik */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-6 bg-black rounded-b-xl"></div>
                </div>
              </div>
              
              {/* İkinci telefon gölgesi */}
              <div className="absolute -top-10 -right-6 bg-white p-3 rounded-3xl shadow-xl transform -rotate-6 z-0 opacity-60 scale-75">
                <div className="bg-gray-100 rounded-2xl overflow-hidden border-8 border-white w-60 h-[450px] md:w-72 md:h-[520px]">
                  {/* Boş çerçeve */}
                </div>
              </div>
              
              {/* QR Kod */}
              <div className="absolute -left-10 bottom-20 bg-white p-3 rounded-lg shadow-lg z-20">
                <div className="text-xs font-medium text-center text-gray-600 mb-1">Hemen İndir</div>
                <div className="w-20 h-20 bg-blue-50 flex items-center justify-center">
                  <Download className="w-12 h-12 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppBanner;