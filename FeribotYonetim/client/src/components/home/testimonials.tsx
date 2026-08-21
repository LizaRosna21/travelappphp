import { Star, StarHalf } from "lucide-react";

// Referanslar / Müşteri Yorumları Bileşeni
const Testimonials = () => {
  const testimonials = [
    {
      name: "Ayşe Yılmaz",
      location: "İstanbul",
      rating: 5,
      comment: "Bu yaz ailemle birlikte Yunan adalarına seyahat ettik ve biletlerimizi bu siteden aldık. Fiyatlar çok uygundu ve rezervasyon süreci son derece kolaydı. Kesinlikle tekrar kullanacağım.",
      date: "15 Ağustos 2023"
    },
    {
      name: "Mehmet Kaya",
      location: "İzmir",
      rating: 4.5,
      comment: "Bodrum-Kos arası feribot biletimi buradan aldım. Mobil uygulama çok kullanışlı, biletimi telefonumda göstererek kolayca check-in yaptım. Tek eksik, birkaç sefer için daha fazla fiyat seçeneği olabilirdi.",
      date: "23 Temmuz 2023"
    },
    {
      name: "Zeynep Demir",
      location: "Antalya",
      rating: 5,
      comment: "Rezervasyonumda değişiklik yapmam gerektiğinde müşteri hizmetleri ekibi son derece yardımcı oldu. İnanılmaz hızlı bir şekilde yanıt aldım ve sorunum çözüldü. Bu kadar iyi bir hizmet için teşekkürler!",
      date: "10 Eylül 2023"
    },
    {
      name: "Ali Öztürk",
      location: "Muğla",
      rating: 4,
      comment: "Araçla seyahat için feribot biletimi buradan aldım. Süreç sorunsuz ilerledi, sadece araç yükleme zamanlamaları konusunda biraz daha detaylı bilgi verilmesini tercih ederdim. Yine de genel olarak memnun kaldım.",
      date: "5 Haziran 2023"
    }
  ];

  // Yıldızları oluşturmak için yardımcı fonksiyon
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Tam yıldızlar
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
    }
    
    // Yarım yıldız
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
    }
    
    // Boş yıldızlar
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />);
    }
    
    return stars;
  };

  return (
    <div className="py-16 bg-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">Müşterilerimiz Ne Diyor?</h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Binlerce müşterimizin deneyimleri ve gerçek yorumları
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-1 mb-3">
                {renderRating(testimonial.rating)}
              </div>
              
              <p className="text-gray-700 mb-4 italic">
                "{testimonial.comment}"
              </p>
              
              <div className="mt-auto">
                <p className="font-semibold">{testimonial.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-500 text-sm">{testimonial.location}</span>
                  <span className="text-gray-400 text-xs">{testimonial.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <a 
            href="/reviews" 
            className="text-blue-600 hover:text-blue-800 inline-flex items-center font-medium"
          >
            Tüm Yorumları Görüntüle
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;