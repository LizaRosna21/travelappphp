import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  ShipIcon,
  Tag,
  UserGroup,
  Mail,
  ChevronsUp,
  Store,
  Compass,
  AlertCircle,
  TrendingUp,
  HelpCircle
} from "lucide-react";
import { format, addMonths, isPast, isFuture } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Örnek veri modelleri
interface ExampleCampaign {
  id: string;
  name: string;
  description: string;
  type: "discount" | "seasonal" | "promotion" | "launch" | "other";
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  targetSegmentId?: number;
  goal?: string;
  budget?: string;
  status: "draft" | "active" | "completed" | "paused";
  coupons: ExampleCoupon[];
  emails: ExampleEmail[];
}

interface ExampleCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed" | "free_item";
  discountValue: string;
  description: string;
  minimumPurchaseAmount?: string;
}

interface ExampleEmail {
  id: string;
  subject: string;
  description: string;
  type: "announcement" | "reminder" | "special";
  sendDate: Date;
}

const EXAMPLE_CAMPAIGNS: ExampleCampaign[] = [
  {
    id: "summer2023",
    name: "Yaz Sezonu Erken Rezervasyon Kampanyası",
    description: "Yaz sezonu (Haziran-Ağustos 2023) için 3 ay öncesinden başlayan ve kademeli olarak azalan indirim oranları ile erken rezervasyonu teşvik eden kampanya.",
    type: "seasonal",
    startDate: new Date(2023, 1, 1), // 1 Şubat
    endDate: new Date(2023, 4, 31), // 31 Mayıs
    isActive: true,
    targetSegmentId: 1,
    goal: "Doluluk oranını önceden garantilemek ve nakit akışı sağlamak",
    budget: "25000 TL",
    status: "active",
    coupons: [
      {
        id: "early25",
        code: "EARLY25",
        discountType: "percentage",
        discountValue: "25",
        description: "3 ay öncesi rezervasyonlarda %25 indirim"
      },
      {
        id: "early15",
        code: "EARLY15",
        discountType: "percentage",
        discountValue: "15",
        description: "2 ay öncesi rezervasyonlarda %15 indirim"
      },
      {
        id: "early10",
        code: "EARLY10",
        discountType: "percentage",
        discountValue: "10",
        description: "1 ay öncesi rezervasyonlarda %10 indirim"
      }
    ],
    emails: [
      {
        id: "summer-announce",
        subject: "Yaz 2023 Erken Rezervasyon Fırsatları Başladı!",
        description: "Kampanya duyurusu ve indirim kodları içeren başlangıç e-postası",
        type: "announcement",
        sendDate: new Date(2023, 1, 1)
      },
      {
        id: "summer-reminder1",
        subject: "%25 indirim fırsatını kaçırmayın - Son 15 gün!",
        description: "En yüksek indirim diliminin bitmesine az kala hatırlatma",
        type: "reminder",
        sendDate: new Date(2023, 2, 15)
      },
      {
        id: "summer-final",
        subject: "Erken Rezervasyon Fırsatı Bitiyor - Son Fırsat!",
        description: "Kampanyanın tamamen bitmesine az kala son şans hatırlatması",
        type: "reminder",
        sendDate: new Date(2023, 4, 15)
      }
    ]
  },
  {
    id: "greece-route",
    name: "Türkiye-Yunanistan Yeni Hat Lansmanı",
    description: "İzmir-Atina yeni feribot hattı için tanıtım kampanyası ve ilk yolculara özel avantajlar.",
    type: "launch",
    startDate: new Date(2023, 3, 1), // 1 Nisan
    endDate: new Date(2023, 5, 30), // 30 Haziran
    isActive: true,
    targetSegmentId: 2,
    goal: "Yeni hattın bilinirliğini artırmak ve ilk müşteri deneyimlerini oluşturmak",
    budget: "50000 TL",
    status: "active",
    coupons: [
      {
        id: "newroute30",
        code: "NEWROUTE30",
        discountType: "percentage",
        discountValue: "30",
        description: "İlk 100 rezervasyon için %30 indirim",
        minimumPurchaseAmount: "500"
      },
      {
        id: "carefree",
        code: "CAREFREE",
        discountType: "percentage",
        discountValue: "50",
        description: "Araç taşıma ücretinde %50 indirim"
      }
    ],
    emails: [
      {
        id: "greece-pre",
        subject: "Yakında! İzmir-Atina Feribot Hattı Açılıyor",
        description: "Yeni hattın ön duyurusu ve tarihler",
        type: "announcement",
        sendDate: new Date(2023, 2, 15)
      },
      {
        id: "greece-launch",
        subject: "İzmir-Atina Hattı Artık Aktif - Özel Fırsatlarla",
        description: "Lansmanın duyurulması ve özel indirim kodları",
        type: "announcement",
        sendDate: new Date(2023, 3, 1)
      },
      {
        id: "greece-experience",
        subject: "Atina'ya Giderken Görmeniz Gereken 5 Ada",
        description: "Rota üzerindeki turistik yerlerin tanıtımı ve seyahat önerileri",
        type: "special",
        sendDate: new Date(2023, 3, 15)
      }
    ]
  },
  {
    id: "loyal-customer",
    name: "Sadık Müşteri Programı",
    description: "Tekrarlayan müşterilere özel avantajlar sunan ve sadakati teşvik eden bir kampanya programı.",
    type: "promotion",
    startDate: new Date(2023, 0, 1), // 1 Ocak
    endDate: new Date(2023, 11, 31), // 31 Aralık
    isActive: true,
    targetSegmentId: 3,
    goal: "Müşteri ömür boyu değerini artırmak ve tavsiye yoluyla yeni müşteriler kazanmak",
    budget: "100000 TL",
    status: "active",
    coupons: [
      {
        id: "free5th",
        code: "FREE5TH",
        discountType: "percentage",
        discountValue: "100",
        description: "Her 5 seferde 1 ücretsiz yolculuk"
      },
      {
        id: "vipaccess",
        code: "VIPACCESS",
        discountType: "free_item",
        discountValue: "VIP",
        description: "VIP bekleme salonu erişimi"
      }
    ],
    emails: [
      {
        id: "loyal-welcome",
        subject: "Sadık Müşteri Programımıza Hoş Geldiniz!",
        description: "Program detayları ve avantajlar",
        type: "announcement",
        sendDate: new Date(2023, 0, 15)
      },
      {
        id: "loyal-status",
        subject: "Sadakat Programı Statünüz Güncellendi",
        description: "Müşterinin statü güncellemesi ve yeni ayrıcalıkları",
        type: "special",
        sendDate: new Date(2023, 3, 1)
      }
    ]
  },
  {
    id: "offseason",
    name: "Sezon Dışı Doluluk Artırma",
    description: "Düşük sezonlarda doluluk oranlarını artırmaya yönelik agresif fiyatlandırma stratejisi.",
    type: "discount",
    startDate: new Date(2023, 9, 1), // 1 Ekim
    endDate: new Date(2023, 11, 15), // 15 Aralık
    isActive: false,
    targetSegmentId: 4,
    goal: "Düşük sezonda doluluk oranlarını artırmak ve sabit maliyetleri karşılamak",
    budget: "35000 TL",
    status: "draft",
    coupons: [
      {
        id: "midweek40",
        code: "MIDWEEK40",
        discountType: "percentage",
        discountValue: "40",
        description: "Haftaiçi seferlerde %40 indirim"
      },
      {
        id: "lastmin35",
        code: "LASTMIN35",
        discountType: "percentage",
        discountValue: "35",
        description: "Son 48 saat içindeki seferlerde %35 indirim"
      }
    ],
    emails: [
      {
        id: "offseason-announce",
        subject: "Sonbahar Fırsatları - Haftaiçi Seferlerde %40 İndirim",
        description: "Düşük sezon kampanya duyurusu",
        type: "announcement",
        sendDate: new Date(2023, 9, 1)
      },
      {
        id: "offseason-flash",
        subject: "FLASH SALE: Sadece 48 Saat için Özel İndirimler",
        description: "Kısa süreli özel indirim duyurusu",
        type: "special",
        sendDate: new Date(2023, 10, 15)
      }
    ]
  },
  {
    id: "family-travel",
    name: "Aile Seyahatleri Teşvik Kampanyası",
    description: "Ailelerin toplu seyahat etmesini teşvik eden özel paket ve indirimler.",
    type: "promotion",
    startDate: new Date(2023, 4, 1), // 1 Mayıs
    endDate: new Date(2023, 8, 30), // 30 Eylül
    isActive: true,
    targetSegmentId: 5,
    goal: "Kişi başı ortalama geliri artırmak ve grup rezervasyonları teşvik etmek",
    budget: "40000 TL",
    status: "active",
    coupons: [
      {
        id: "kidsfree",
        code: "KIDSFREE",
        discountType: "percentage",
        discountValue: "50",
        description: "Çocuk yolcular %50 indirimli"
      },
      {
        id: "family4",
        code: "FAMILY4",
        discountType: "fixed",
        discountValue: "200",
        description: "4 kişilik aile paketi 200 TL indirimli",
        minimumPurchaseAmount: "1000"
      }
    ],
    emails: [
      {
        id: "family-routes",
        subject: "Ailenizle Keşfedebileceğiniz En Güzel Rotalar",
        description: "Aile dostu rotaların tanıtımı",
        type: "announcement",
        sendDate: new Date(2023, 4, 5)
      },
      {
        id: "family-activities",
        subject: "Çocuklarla Feribot Seyahatini Keyifli Hale Getirmenin Yolları",
        description: "Aile aktiviteleri önerileri ve eğlence rehberi",
        type: "special",
        sendDate: new Date(2023, 5, 1)
      }
    ]
  }
];

// Segment örnekleri
const EXAMPLE_SEGMENTS = [
  { id: 1, name: "Önceki Yaz Sezonu Yolcuları", description: "Geçmiş yıllarda haziran-ağustos arası seyahat edenler", estimatedSize: 4500 },
  { id: 2, name: "Yunanistan İlgili Kullanıcılar", description: "Yunanistan rotalarını görüntüleyen veya araştıran kullanıcılar", estimatedSize: 2800 },
  { id: 3, name: "Sadık Müşteriler", description: "Son 12 ayda 3+ sefer yapan kullanıcılar", estimatedSize: 1200 },
  { id: 4, name: "Fiyat Duyarlı Segment", description: "İndirim kodlarını kullananlar ve fiyat karşılaştırması yapanlar", estimatedSize: 5600 },
  { id: 5, name: "Aile Seyahatleri", description: "Çocuklu rezervasyon yapan kullanıcılar", estimatedSize: 3200 }
];

const MarketingExampleScenarios = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("summer2023");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Aktif kampanyayı bul
  const activeCampaign = EXAMPLE_CAMPAIGNS.find(c => c.id === activeTab);

  // Kampanya tipi için badge rengi
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "discount":
        return <Badge variant="default">İndirim</Badge>;
      case "seasonal":
        return <Badge variant="success">Mevsimsel</Badge>;
      case "promotion":
        return <Badge variant="info">Promosyon</Badge>;
      case "launch":
        return <Badge variant="destructive">Lansman</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Kampanya zaman bilgisini hesapla
  const getCampaignTimeInfo = (startDate: Date, endDate: Date) => {
    const now = new Date();
    
    if (isPast(endDate)) {
      return { status: "Tamamlandı", progress: 100 };
    }
    
    if (isPast(startDate) && isFuture(endDate)) {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const progress = Math.round((elapsed / totalDuration) * 100);
      return { status: "Devam Ediyor", progress };
    }
    
    return { status: "Başlamamış", progress: 0 };
  };

  // Örnek kampanyayı gerçek veritabanına uygulama
  const applyExampleMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      setLoading(prev => ({ ...prev, [campaignId]: true }));
      
      // 1. Kampanyayı oluştur
      const campaign = EXAMPLE_CAMPAIGNS.find(c => c.id === campaignId)!;
      
      const campaignRes = await apiRequest("POST", "/api/campaigns", {
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        startDate: format(campaign.startDate, 'yyyy-MM-dd'),
        endDate: format(campaign.endDate, 'yyyy-MM-dd'),
        isActive: campaign.isActive,
        targetSegmentId: campaign.targetSegmentId,
        goal: campaign.goal,
        budget: campaign.budget,
        status: campaign.status
      });
      
      const createdCampaign = await campaignRes.json();
      
      // 2. Kuponları oluştur
      for (const coupon of campaign.coupons) {
        await apiRequest("POST", "/api/coupons", {
          code: coupon.code,
          campaignId: createdCampaign.id,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          startDate: format(campaign.startDate, 'yyyy-MM-dd'),
          endDate: format(campaign.endDate, 'yyyy-MM-dd'),
          minimumPurchaseAmount: coupon.minimumPurchaseAmount || null,
          isActive: true
        });
      }
      
      // 3. E-postaları oluştur
      for (const email of campaign.emails) {
        await apiRequest("POST", "/api/marketing-emails", {
          subject: email.subject,
          campaignId: createdCampaign.id,
          fromName: "FerryTicket",
          fromEmail: "info@ferryticket.com",
          htmlContent: `<p>${email.description}</p>`,
          textContent: email.description,
          scheduledAt: format(email.sendDate, 'yyyy-MM-dd')
        });
      }
      
      return createdCampaign;
    },
    onSuccess: (data, campaignId) => {
      toast({
        title: "Örnek kampanya uygulandı",
        description: `"${EXAMPLE_CAMPAIGNS.find(c => c.id === campaignId)?.name}" kampanyası ve ilgili tüm bileşenler başarıyla oluşturuldu.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-emails'] });
      setLoading(prev => ({ ...prev, [campaignId]: false }));
    },
    onError: (error: Error, campaignId) => {
      console.error("Kampanya uygulama hatası:", error);
      toast({
        title: "Kampanya uygulanamadı",
        description: `Hata: ${error.message}`,
        variant: "destructive",
      });
      setLoading(prev => ({ ...prev, [campaignId]: false }));
    },
  });

  // Eğer aktif kampanya yoksa
  if (!activeCampaign) {
    return (
      <div className="text-center py-10">
        <p>Kampanya bulunamadı.</p>
      </div>
    );
  }

  // Zaman bilgisini hesapla
  const timeInfo = getCampaignTimeInfo(activeCampaign.startDate, activeCampaign.endDate);
  
  // İlgili müşteri segmentini bul
  const targetSegment = EXAMPLE_SEGMENTS.find(s => s.id === activeCampaign.targetSegmentId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pazarlama Örnek Senaryoları</CardTitle>
          <CardDescription>
            Hazır pazarlama kampanyası şablonları ve senaryolar. Bu örnekleri inceleyerek kendi kampanyalarınızı oluşturabilir veya doğrudan uygulamaya alabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 w-full mb-6">
              {EXAMPLE_CAMPAIGNS.map(campaign => (
                <TabsTrigger key={campaign.id} value={campaign.id} className="text-xs md:text-sm">
                  {campaign.type === "seasonal" && <Calendar className="h-3 w-3 mr-1" />}
                  {campaign.type === "launch" && <Compass className="h-3 w-3 mr-1" />}
                  {campaign.type === "promotion" && <TrendingUp className="h-3 w-3 mr-1" />}
                  {campaign.type === "discount" && <Tag className="h-3 w-3 mr-1" />}
                  {campaign.name.split(" ").slice(0, 2).join(" ")}...
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Kampanya Detayları */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{activeCampaign.name}</CardTitle>
                        <CardDescription>{activeCampaign.description}</CardDescription>
                      </div>
                      <div>
                        {getTypeBadge(activeCampaign.type)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Kampanya Süresi</div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(activeCampaign.startDate, 'd MMMM yyyy', { locale: tr })} - {format(activeCampaign.endDate, 'd MMMM yyyy', { locale: tr })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Durum</div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{timeInfo.status}</span>
                            <span>{timeInfo.progress}%</span>
                          </div>
                          <Progress value={timeInfo.progress} className="h-2" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Hedef</div>
                        <div className="text-sm">{activeCampaign.goal}</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Bütçe</div>
                        <div className="text-sm">{activeCampaign.budget}</div>
                      </div>

                      {targetSegment && (
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">Hedef Segment</div>
                          <div className="flex items-center justify-between text-sm border p-3 rounded-md">
                            <div className="flex items-center">
                              <UserGroup className="h-4 w-4 mr-2 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{targetSegment.name}</div>
                                <div className="text-xs text-muted-foreground">{targetSegment.description}</div>
                              </div>
                            </div>
                            <Badge variant="outline">{targetSegment.estimatedSize.toLocaleString()} kullanıcı</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <Tag className="h-5 w-5 mr-2" />
                        <CardTitle>Kuponlar</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeCampaign.coupons.map(coupon => (
                        <div key={coupon.id} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{coupon.code}</span>
                            <Badge variant="outline">
                              {coupon.discountType === "percentage" && `%${coupon.discountValue}`}
                              {coupon.discountType === "fixed" && `${coupon.discountValue} TL`}
                              {coupon.discountType === "free_item" && `Ücretsiz`}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{coupon.description}</div>
                          {coupon.minimumPurchaseAmount && (
                            <div className="text-xs">
                              Min. harcama: {coupon.minimumPurchaseAmount} TL
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 mr-2" />
                        <CardTitle>E-postalar</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeCampaign.emails.map(email => (
                        <div key={email.id} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{email.subject}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(email.sendDate, 'd MMM', { locale: tr })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{email.description}</div>
                          <div className="text-xs">
                            <Badge variant="outline" className="text-xs">
                              {email.type === "announcement" && "Duyuru"}
                              {email.type === "reminder" && "Hatırlatma"}
                              {email.type === "special" && "Özel İçerik"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Uygulamaya Alın</CardTitle>
                    <CardDescription>
                      Bu örnek kampanyayı gerçek sisteme uygulayabilirsiniz. Tüm kuponlar ve e-postalar otomatik olarak oluşturulacaktır.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>Ne dahil ediliyor?</AlertTitle>
                      <AlertDescription className="text-xs">
                        <ul className="list-disc pl-4 space-y-1 mt-2">
                          <li>Kampanya temel bilgileri</li>
                          <li>Tüm kampanya kuponları</li>
                          <li>Tüm e-posta şablonları</li>
                          <li>Hedef segment bağlantısı</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full"
                      onClick={() => applyExampleMutation.mutate(activeCampaign.id)}
                      disabled={loading[activeCampaign.id]}
                    >
                      {loading[activeCampaign.id] ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                          Uygulanıyor...
                        </>
                      ) : (
                        <>
                          <ChevronsUp className="h-4 w-4 mr-2" />
                          Sisteme Uygula
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Uygulama İpuçları</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                        <span className="font-medium text-sm">Hedef Kitle</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeCampaign.type === "seasonal" && "Mevsimsel kampanyalarda, önceki yıllarda aynı sezonda seyahat eden müşterileri hedefleyin."}
                        {activeCampaign.type === "launch" && "Lansman kampanyalarında benzer destinasyonlara ilgi gösteren kullanıcıları hedefleyin."}
                        {activeCampaign.type === "promotion" && "Promosyon kampanyalarında önceden belirlenmiş segmentleri kullanın ve kişiselleştirme yapın."}
                        {activeCampaign.type === "discount" && "İndirim kampanyalarında fiyat duyarlı segmentlere öncelik verin ve aciliyet mesajları kullanın."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                        <span className="font-medium text-sm">Zamanlama</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeCampaign.type === "seasonal" && "Erken rezervasyon kampanyasını sezandan en az 3-4 ay önce başlatın."}
                        {activeCampaign.type === "launch" && "Lansman öncesi 2-3 hafta teaser içerikler paylaşarak ilgi uyandırın."}
                        {activeCampaign.type === "promotion" && "Promosyonları yılın farklı dönemlerine yayarak sürekli aktivite sağlayın."}
                        {activeCampaign.type === "discount" && "Son dakika fırsatları için kısa süreli flash sale'ler düzenleyin."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                        <span className="font-medium text-sm">İzleme & Analiz</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bu kampanya türünde özellikle kupon kullanım oranları, e-posta açılma oranları ve 
                        rezervasyon dönüşüm oranlarını yakından takip edin.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingExampleScenarios;