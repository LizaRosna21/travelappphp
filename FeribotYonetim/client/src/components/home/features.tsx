import { 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Smartphone, 
  Search, 
  Globe, 
  Award, 
  Headset
} from "lucide-react";

// Özellikler bileşeni
const Features = () => {
  const features = [
    {
      icon: <ShieldCheck className="w-10 h-10 text-blue-600" />,
      title: "Güvenli Ödeme",
      description: "En güncel güvenlik protokolleri ile korunan, çoklu ödeme seçenekleri sunan güvenli altyapı."
    },
    {
      icon: <CreditCard className="w-10 h-10 text-blue-600" />,
      title: "Uygun Fiyat Garantisi",
      description: "Kampanyalar ve fırsatlarla her zaman en iyi fiyatları bulun, fiyat farkı garantisi sağlıyoruz."
    },
    {
      icon: <Clock className="w-10 h-10 text-blue-600" />,
      title: "Anlık Rezervasyon",
      description: "Hızlı ve kolay rezervasyon süreci ile dakikalar içinde biletinizi ayırtın."
    },
    {
      icon: <Smartphone className="w-10 h-10 text-blue-600" />,
      title: "Mobil Uyumluluk",
      description: "Mobil cihazınızdan kolayca bilet alın, değiştirin veya iptal edin."
    },
    {
      icon: <Search className="w-10 h-10 text-blue-600" />,
      title: "Kolay Arama",
      description: "Gelişmiş filtreleme özellikleri ile ihtiyacınıza uygun en iyi feribot biletini hızlıca bulun."
    },
    {
      icon: <Globe className="w-10 h-10 text-blue-600" />,
      title: "Çoklu Dil Desteği",
      description: "Türkçe, İngilizce, Almanca ve daha fazla dil seçeneği ile kolayca kullanım sağlayın."
    },
    {
      icon: <Award className="w-10 h-10 text-blue-600" />,
      title: "Kaliteli Hizmet",
      description: "Güler yüzlü ve uzman müşteri hizmetleri ekibimiz her zaman yanınızda."
    },
    {
      icon: <Headset className="w-10 h-10 text-blue-600" />,
      title: "7/24 Destek",
      description: "Seyahatinizin her aşamasında, sorularınız için 7/24 müşteri hizmetleri desteği."
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">Neden Bizi Tercih Etmelisiniz?</h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Feribot biletinizi alırken size en iyi deneyimi sunmak için çalışıyoruz
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="p-6 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center"
            >
              <div className="mb-4 bg-blue-50 p-3 rounded-full">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;