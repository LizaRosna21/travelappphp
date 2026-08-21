import { useLocation } from "wouter";

// Çağrı Eylemi (Call to Action) Bileşeni
const CTA = () => {
  const [, navigate] = useLocation();

  const handleStartSearch = () => {
    navigate("/search");
  };

  return (
    <div className="py-24 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Hayalinizdeki Tatile Bir Adım Uzaktasınız
        </h2>
        <p className="max-w-2xl mx-auto text-lg md:text-xl mb-10 text-blue-100">
          Şimdi feribot biletinizi ayırtın, cazip fiyatlarla güvenli ve konforlu seyahatin keyfini çıkarın.
        </p>
        
        <button
          onClick={handleStartSearch}
          className="bg-white text-blue-700 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
        >
          Bilet Aramaya Başla
        </button>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold mb-2">100+</div>
            <div className="text-blue-100">Feribot Rotası</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold mb-2">50.000+</div>
            <div className="text-blue-100">Mutlu Müşteri</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold mb-2">24/7</div>
            <div className="text-blue-100">Müşteri Desteği</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTA;