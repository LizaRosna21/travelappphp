import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Sıkça Sorulan Sorular (FAQ) Bileşeni
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: "Feribot biletimi ne kadar süre önceden ayırtmalıyım?",
      answer: "Yüksek sezon dönemlerinde (Haziran-Eylül arası) feribot biletlerinizi en az 3-4 hafta önceden rezerve etmenizi öneririz. Düşük sezonda ise 1-2 hafta önceden bilet almak genellikle yeterlidir. Ancak popüler rotalar ve tatil dönemleri için daha erken rezervasyon yapmanız tavsiye edilir."
    },
    {
      question: "Biletimi iptal edebilir miyim? İptal politikanız nedir?",
      answer: "Evet, biletinizi iptal edebilirsiniz. İptal politikamız feribot şirketlerine göre değişiklik gösterebilir, ancak genel olarak hareket tarihinden 48 saat öncesine kadar yapılan iptallerde %80-90 oranında geri ödeme yapılır. 48 saat ile 24 saat arasında yapılan iptallerde %50, 24 saatten kısa sürede yapılan iptallerde ise genellikle geri ödeme yapılmaz. Tarih değişiklikleri için ayrıca servis ücreti alınabilir."
    },
    {
      question: "Evcil hayvanımla seyahat edebilir miyim?",
      answer: "Birçok feribot şirketi evcil hayvanlarla seyahate izin vermektedir, ancak her şirketin farklı kuralları vardır. Bazı şirketler hayvanların taşıma kafesinde olmasını şart koşarken, bazıları güvertede belirli alanlarda tasma ile bulunmalarına izin vermektedir. Evcil hayvanınızla seyahat ederken, geçerli aşı belgelerini yanınızda bulundurmanız gerekmektedir. Rezervasyon sırasında mutlaka evcil hayvan bilgilerinizi belirtmeniz önemlidir."
    },
    {
      question: "Araçla feribot seyahati için ne gibi belgeler gereklidir?",
      answer: "Araçla feribot seyahati için geçerli ehliyet, araç ruhsatı, yeşil sigorta kartı ve araç sahibi siz değilseniz vekâletname bulundurmanız gerekmektedir. Uluslararası seyahatler için pasaport ve gerekiyorsa vize belgelerinizin olması şarttır. Ayrıca araç boyutlarını (uzunluk, yükseklik, genişlik) ve plaka numaranızı rezervasyon sırasında doğru girmeniz çok önemlidir."
    },
    {
      question: "Feribot biletleri için en uygun fiyat garantisi veriyor musunuz?",
      answer: "Evet, en uygun fiyat garantisi sunuyoruz. Eğer aynı tarih, sefer ve şartlar için başka bir yerden daha uygun fiyatlı bir bilet bulursanız, fiyat farkını geri ödüyoruz. Bunun için rezervasyonu yapmadan önce bize ulaşmanız yeterlidir. Ayrıca erken rezervasyon indirimleri, grup indirimleri ve dönemsel kampanyalarımız ile her zaman en iyi fiyatları sunmaya çalışıyoruz."
    },
    {
      question: "Check-in işlemi için ne kadar erken gelmem gerekiyor?",
      answer: "Check-in işlemi için araçlı seyahatlerde hareket saatinden en az 2 saat önce, yolcu olarak seyahat ediyorsanız en az 1 saat önce terminalde olmanızı öneririz. Uluslararası seferlerde, özellikle yüksek sezonda pasaport kontrolü ve gümrük işlemleri nedeniyle daha erken gelmeniz tavsiye edilir. Her feribot şirketi ve rotası için check-in süreleri farklılık gösterebilir, bu nedenle biletinizdeki özel talimatları kontrol etmeniz önemlidir."
    },
    {
      question: "Feribotlarda yemek ve içecek servisi var mı?",
      answer: "Evet, çoğu feribotta kafe, restoran veya büfe hizmeti bulunmaktadır. Özellikle uzun süreli seferlerde (2 saatten fazla) genellikle yiyecek ve içecek seçenekleri mevcuttur. Bazı lüks feribotlarda tam donanımlı restoranlar ve geniş menü seçenekleri sunulurken, daha kısa mesafe seferlerde sınırlı büfe hizmeti olabilir. Özel diyet gereksinimleri olan yolcuların önceden kendi yiyeceklerini hazırlamaları önerilir."
    },
    {
      question: "Satın aldığım bileti başkası kullanabilir mi?",
      answer: "Biletlerin kullanımı genellikle kişiye özeldir ve bilet üzerinde isim değişikliği yapmak için ek ücret ödemeniz gerekebilir. İsim değişikliği hareket tarihinden belirli bir süre önce (genellikle 48 saat) yapılmalıdır. Bazı promosyonlu veya indirimli biletlerde isim değişikliği mümkün olmayabilir. İsim değişikliği talepleri için müşteri hizmetlerimizle iletişime geçmeniz gerekmektedir."
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">Sıkça Sorulan Sorular</h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Feribot seyahati ile ilgili en çok sorulan soruları ve cevaplarını burada bulabilirsiniz
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto divide-y divide-gray-200">
          {faqItems.map((item, index) => (
            <div key={index} className="py-5">
              <button
                onClick={() => toggleQuestion(index)}
                className="flex justify-between items-center w-full text-left font-medium text-lg text-gray-900 focus:outline-none"
              >
                <span>{item.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="mt-3 text-gray-600 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <p className="text-gray-600">
            Başka sorularınız mı var?
          </p>
          <a 
            href="/support" 
            className="mt-2 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            Müşteri Hizmetleri ile İletişime Geçin
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;