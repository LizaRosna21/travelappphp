import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon, CheckCircle2, Clock, CreditCard, Headphones, ShieldCheck, Ticket, Zap } from "lucide-react";

// Bilet.com tarzı hizmet avantajları bileşeni
const ServiceAdvantages = () => {
  // Hizmet avantajları listesi
  const advantages = [
    {
      id: 1,
      title: "7/24 Müşteri Hizmetleri",
      description: "Seyahatiniz boyunca size destek sağlıyoruz.",
      icon: <Headphones className="h-10 w-10 text-blue-500" />
    },
    {
      id: 2,
      title: "Hızlı ve Güvenli Ödeme",
      description: "Tüm ödeme yöntemleri ile güvenli alışveriş.",
      icon: <CreditCard className="h-10 w-10 text-blue-500" />
    },
    {
      id: 3,
      title: "Anlık E-Bilet",
      description: "Ödeme sonrası anında e-biletiniz hazır.",
      icon: <Ticket className="h-10 w-10 text-blue-500" />
    },
    {
      id: 4,
      title: "İptal Güvencesi",
      description: "Esnek iptal ve değişiklik seçenekleri.",
      icon: <ShieldCheck className="h-10 w-10 text-blue-500" />
    }
  ];

  // Neden biz seçenekleri
  const whyChooseUs = [
    "En uygun fiyat garantisi",
    "Kolay ve hızlı bilet alım süreci",
    "Ücretsiz değişim ve iptal seçenekleri",
    "Tüm feribot firmaları tek platformda",
    "TL, USD ve EUR para birimi desteği",
    "Çoklu dil desteği"
  ];

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-16">
        {/* Avantajlar Bölümü */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {advantages.map((advantage) => (
            <Card key={advantage.id} className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    {advantage.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{advantage.title}</h3>
                  <p className="text-neutral-600 text-sm">{advantage.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Neden Biz Bölümü */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="relative mb-8">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-50 rounded-full"></div>
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-50 rounded-full"></div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Neden <span className="text-blue-600">FerryTicket</span> ile Bilet Almalısınız?
                </h2>
                <p className="text-neutral-600 mb-8 text-lg">
                  Türkiye'nin en büyük online feribot bileti platformu olarak, siz değerli yolcularımıza en iyi hizmeti sunmak için buradayız.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whyChooseUs.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="mr-3 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-neutral-700">{item}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-10">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Hakkımızda Daha Fazla <ArrowUpRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-xl transform rotate-6"></div>
              <img 
                src="https://images.unsplash.com/photo-1518623489648-a173ef7824f3?q=80&w=600&auto=format&fit=crop" 
                alt="Ferry service" 
                className="relative z-10 rounded-xl shadow-xl max-w-md"
                onError={(e) => {
                  // Görsel yüklenemezse fallback olarak kullan
                  e.currentTarget.src = "";
                  e.currentTarget.alt = "Image could not be loaded";
                  e.currentTarget.style.height = "400px";
                  e.currentTarget.style.backgroundColor = "#f0f9ff";
                  e.currentTarget.style.display = "flex";
                  e.currentTarget.style.alignItems = "center";
                  e.currentTarget.style.justifyContent = "center";
                  e.currentTarget.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-blue-300"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
                }}
              />
              
              {/* İstatistik Kartları */}
              <div className="absolute -bottom-10 -left-10 bg-white rounded-lg shadow-lg p-3 z-20">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Aylık Yolcu</p>
                    <p className="font-bold">50.000+</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-5 -right-5 bg-white rounded-lg shadow-lg p-3 z-20">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Aktif Rota</p>
                    <p className="font-bold">120+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceAdvantages;