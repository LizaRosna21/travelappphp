import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, HelpCircle, FileText, TrendingUp, Users, Tag, Mail } from "lucide-react";

const MarketingGuide = () => {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Pazarlama Paneli Kullanım Rehberi</CardTitle>
          <CardDescription>
            Etkili pazarlama kampanyaları oluşturmak ve yönetmek için aşağıdaki rehberi kullanabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="campaigns">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Kampanya Yönetimi
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="space-y-4">
                  <p>
                    Kampanyalar, belirli hedef kitleye yönelik promosyonlarınızı ve pazarlama aktivitelerinizi yönetmenize olanak tanır. 
                    Her kampanya, belirli bir zaman diliminde yürütülen ve ölçülebilir sonuçlara sahip pazarlama girişimidir.
                  </p>
                  
                  <h4 className="text-base font-medium mt-4">Kampanya Türleri</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tür</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Kullanım</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>İndirim</TableCell>
                        <TableCell>Belirli ürün/rotalarda fiyat avantajı sunan kampanyalar</TableCell>
                        <TableCell>Sezon dışı dönemlerde doluluk oranını artırmak için</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mevsimsel</TableCell>
                        <TableCell>Belirli sezonlara özel kampanyalar</TableCell>
                        <TableCell>Tatil sezonu, bayram dönemi gibi özel zamanlarda</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Promosyon</TableCell>
                        <TableCell>Genel tanıtım amaçlı kampanyalar</TableCell>
                        <TableCell>Marka bilinirliğini artırmak için</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Lansman</TableCell>
                        <TableCell>Yeni bir ürün/rota tanıtımı kampanyaları</TableCell>
                        <TableCell>Yeni feribot hatları veya hizmetler için</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <h4 className="text-base font-medium mt-4">Kampanya Oluşturma Adımları</h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Kampanya adı ve açıklaması belirleme</li>
                    <li>Kampanya türü seçimi</li>
                    <li>Başlangıç ve bitiş tarihlerini belirleme</li>
                    <li>Hedef müşteri segmentini seçme</li>
                    <li>Bütçe ve hedefleri tanımlama</li>
                    <li>Promosyon kuponları oluşturma (isteğe bağlı)</li>
                    <li>E-posta şablonları hazırlama (isteğe bağlı)</li>
                    <li>Kampanyayı aktifleştirme</li>
                  </ol>
                  
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Dikkat</AlertTitle>
                    <AlertDescription>
                      Aktif bir kampanyayı silmek veya düzenlemek, ilgili kuponların ve e-postaların 
                      çalışmasını etkileyebilir. Değişiklik yapmadan önce tüm ilişkili kaynakları kontrol edin.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="segments">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Müşteri Segmentleri
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="space-y-4">
                  <p>
                    Müşteri segmentleri, kullanıcı veritabanınızı belirli kriterlere göre gruplara ayırmanıza 
                    olanak tanır. Böylece hedefli pazarlama yapabilir ve daha yüksek dönüşüm oranları elde edebilirsiniz.
                  </p>
                  
                  <h4 className="text-base font-medium mt-4">Segment Oluşturma Kriterleri</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kriter</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Örnek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Demografik</TableCell>
                        <TableCell>Yaş, cinsiyet, konum gibi temel özellikler</TableCell>
                        <TableCell>"İstanbul'da yaşayan 25-35 yaş arası kullanıcılar"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Davranışsal</TableCell>
                        <TableCell>Rezervasyon alışkanlıkları ve etkileşimler</TableCell>
                        <TableCell>"Son 3 ayda Türkiye-Yunanistan hattını kullananlar"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Satın Alma</TableCell>
                        <TableCell>Satın alma geçmişi ve harcama alışkanlıkları</TableCell>
                        <TableCell>"Yılda 5000 TL ve üzeri harcama yapan müşteriler"</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Etkileşim</TableCell>
                        <TableCell>E-posta açma, tıklama ve web sitesi ziyaretleri</TableCell>
                        <TableCell>"E-postaları düzenli açan ve tıklayan kullanıcılar"</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <h4 className="text-base font-medium mt-4">Segment Kullanım Önerileri</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Her kampanya için uygun bir müşteri segmenti belirleyin</li>
                    <li>Çok geniş segmentlerden kaçının, daha hedefli gruplar oluşturun</li>
                    <li>Düzenli olarak segment performanslarını analiz edin ve güncelleyin</li>
                    <li>A/B testleri yaparak hangi segmentlerin daha iyi performans gösterdiğini ölçün</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="coupons">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Kupon Yönetimi
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="space-y-4">
                  <p>
                    Kuponlar, kampanyalarınızın somut sonuçlar elde etmesine yardımcı olan indirim kodlarıdır. 
                    Müşterilerinize özel indirimler sunabilir ve kampanya etkinliğini ölçebilirsiniz.
                  </p>
                  
                  <h4 className="text-base font-medium mt-4">Kupon Türleri</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tür</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>En İyi Kullanım</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Yüzde İndirim</TableCell>
                        <TableCell>Toplam tutardan belli bir yüzde indirim</TableCell>
                        <TableCell>%10, %15, %25 gibi indirimler</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sabit İndirim</TableCell>
                        <TableCell>Belirli bir tutarda indirim</TableCell>
                        <TableCell>100 TL, 50 EUR gibi indirimler</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bedava Ürün/Hizmet</TableCell>
                        <TableCell>Belirli bir hizmetin ücretsiz sunulması</TableCell>
                        <TableCell>Ücretsiz araç taşıma, VIP geçiş gibi</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <h4 className="text-base font-medium mt-4">Etkili Kupon Stratejileri</h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Benzersiz ve hatırlanabilir kupon kodları oluşturun (örn. SUMMER2023, GREECE50)</li>
                    <li>Kuponlara bir son kullanma tarihi ekleyin (aciliyeti teşvik eder)</li>
                    <li>Minimum harcama tutarı belirleyin (sepet değerini artırır)</li>
                    <li>Belirli rotalara veya tarihlere özel kuponlar oluşturun</li>
                    <li>Her kupon için maksimum kullanım sayısı belirleyin</li>
                  </ol>
                  
                  <Alert variant="success" className="mt-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>İpucu</AlertTitle>
                    <AlertDescription>
                      İlk kez rezervasyon yapan müşterilerinize özel indirim kuponları sunarak yeni müşteri 
                      kazanımınızı artırabilirsiniz. "FIRSTTRIP" gibi kodlar etkili olabilir.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="emails">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  E-posta Pazarlaması
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="space-y-4">
                  <p>
                    E-posta pazarlaması, müşterilerinizle doğrudan iletişim kurmanın ve kampanyalarınızı 
                    duyurmanın en etkili yollarından biridir. İyi tasarlanmış e-postalar dönüşüm oranlarını artırabilir.
                  </p>
                  
                  <h4 className="text-base font-medium mt-4">E-posta Türleri</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tür</TableHead>
                        <TableHead>Kullanım</TableHead>
                        <TableHead>İçerik Önerileri</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Hoş Geldiniz</TableCell>
                        <TableCell>Yeni kayıt olan kullanıcılar için</TableCell>
                        <TableCell>Karşılama mesajı, kullanım rehberi, ilk rezervasyon indirimi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Kampanya Duyurusu</TableCell>
                        <TableCell>Yeni kampanya başlatıldığında</TableCell>
                        <TableCell>Kampanya detayları, indirim kuponu, son tarih bilgisi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Hatırlatma</TableCell>
                        <TableCell>Sona erecek kampanyalar için</TableCell>
                        <TableCell>"Son 48 saat" gibi aciliyet mesajları, kupon kodları</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Özel Teklif</TableCell>
                        <TableCell>VIP müşteriler veya segmentler için</TableCell>
                        <TableCell>Kişiselleştirilmiş teklifler, özel indirimler</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <h4 className="text-base font-medium mt-4">E-posta Optimizasyon İpuçları</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Dikkat çekici ve kısa konu başlıkları kullanın (40-50 karakter)</li>
                    <li>Mobil cihazlar için uyumlu tasarımlar kullanın (responsive design)</li>
                    <li>Belirgin ve tıklanabilir CTA (Call to Action) butonları ekleyin</li>
                    <li>Kişiselleştirme etiketleri kullanın (isim, önceki rezervasyonlar, vb.)</li>
                    <li>A/B testleri yaparak en iyi performans gösteren e-posta tasarımını bulun</li>
                    <li>Gönderimleri optimize saatlerde yapın (genellikle Salı-Perşembe, 10:00-15:00 arası)</li>
                  </ul>
                  
                  <Alert className="mt-4">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Önemli Hatırlatma</AlertTitle>
                    <AlertDescription>
                      E-posta gönderimlerinde KVKK uyumluluğuna dikkat edin. Her e-postaya abonelikten 
                      çıkma linki ekleyin ve sadece izin veren kullanıcılara e-posta gönderin.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scenarios">
              <AccordionTrigger className="text-lg font-medium">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Örnek Pazarlama Senaryoları
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-base font-medium mb-2">Senaryo 1: Yaz Sezonu Erken Rezervasyon Kampanyası</h4>
                    <p className="text-sm mb-2">
                      Yaz sezonu için 3 ay öncesinden başlayan ve kademeli olarak azalan indirim oranları ile 
                      erken rezervasyonu teşvik eden bir kampanya.
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li><strong>Segment:</strong> Önceki yıllarda yaz sezonunda seyahat eden müşteriler</li>
                      <li><strong>Kampanya Türü:</strong> Mevsimsel</li>
                      <li><strong>Kuponlar:</strong> 3 ay öncesi %25 (EARLY25), 2 ay öncesi %15 (EARLY15), 1 ay öncesi %10 (EARLY10)</li>
                      <li><strong>E-postalar:</strong> Başlangıç duyurusu, 15 günlük hatırlatmalar, son fırsat</li>
                      <li><strong>Hedef:</strong> Doluluk oranını önceden garantilemek ve nakit akışı sağlamak</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-base font-medium mb-2">Senaryo 2: Türkiye-Yunanistan Yeni Hat Lansmanı</h4>
                    <p className="text-sm mb-2">
                      Yeni açılan bir feribot hattı için tanıtım kampanyası ve ilk yolculara özel avantajlar.
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li><strong>Segment:</strong> Yunanistan destinasyonlarına ilgi göstermiş kullanıcılar</li>
                      <li><strong>Kampanya Türü:</strong> Lansman</li>
                      <li><strong>Kuponlar:</strong> İlk 100 rezervasyon için %30 indirim (NEWROUTE30), araç taşıma indirimi (CAREFREE)</li>
                      <li><strong>E-postalar:</strong> Ön duyuru, lansman haberi, güzergah tanıtımı, testimonial paylaşımları</li>
                      <li><strong>Hedef:</strong> Yeni hattın bilinirliğini artırmak ve ilk müşteri deneyimlerini oluşturmak</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-base font-medium mb-2">Senaryo 3: Sadık Müşteri Programı</h4>
                    <p className="text-sm mb-2">
                      Tekrarlayan müşterilere özel avantajlar sunan ve sadakati teşvik eden bir kampanya yapısı.
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li><strong>Segment:</strong> Son 12 ayda 3 veya daha fazla sefer yapmış müşteriler</li>
                      <li><strong>Kampanya Türü:</strong> Promosyon</li>
                      <li><strong>Kuponlar:</strong> Her 5 seferde 1 ücretsiz (FREE5TH), VIP erişim kodu (VIPACCESS)</li>
                      <li><strong>E-postalar:</strong> Kişiselleştirilmiş davetler, duruma göre statü güncellemeleri</li>
                      <li><strong>Hedef:</strong> Müşteri ömür boyu değerini artırmak ve tavsiye yoluyla yeni müşteriler kazanmak</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="text-base font-medium mb-2">Senaryo 4: Sezon Dışı Doluluk Artırma</h4>
                    <p className="text-sm mb-2">
                      Düşük sezonlarda doluluk oranlarını artırmaya yönelik agresif fiyatlandırma stratejisi.
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li><strong>Segment:</strong> Fiyat duyarlı müşteriler, esnek tarihli tatil yapabilecek kişiler</li>
                      <li><strong>Kampanya Türü:</strong> İndirim</li>
                      <li><strong>Kuponlar:</strong> Haftaiçi %40 indirim (MIDWEEK40), yakın tarihler için son dakika %35 (LASTMIN35)</li>
                      <li><strong>E-postalar:</strong> Flash sale duyuruları, 48 saatlik özel teklifler</li>
                      <li><strong>Hedef:</strong> Düşük sezonda doluluk oranlarını artırmak ve sabit maliyetleri karşılamak</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="text-base font-medium mb-2">Senaryo 5: Aile Seyahatleri Teşvik Kampanyası</h4>
                    <p className="text-sm mb-2">
                      Ailelerin toplu seyahat etmesini teşvik eden özel paket ve indirimler.
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li><strong>Segment:</strong> Çocuklu aileler, 3+ kişilik grup rezervasyonu yapanlar</li>
                      <li><strong>Kampanya Türü:</strong> Promosyon</li>
                      <li><strong>Kuponlar:</strong> Çocuk yolcular %50 indirimli (KIDSFREE), aile paketi (FAMILY4)</li>
                      <li><strong>E-postalar:</strong> Aile dostu rota önerileri, aile aktiviteleri rehberi, çocuklar için eğlence önerileri</li>
                      <li><strong>Hedef:</strong> Kişi başı ortalama geliri artırmak ve grup rezervasyonları teşvik etmek</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingGuide;