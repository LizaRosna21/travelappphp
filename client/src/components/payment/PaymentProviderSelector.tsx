import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiVisa, SiMastercard, SiAmericanexpress } from "react-icons/si";

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  supported: string[];
}

const providers: ProviderInfo[] = [
  {
    id: "paytr",
    name: "PayTR",
    description: "Türkiye'nin lider ödeme altyapı sağlayıcısı",
    icon: (
      <div className="bg-[#053CFF] text-white p-3 rounded-md font-bold">
        PayTR
      </div>
    ),
    supported: ["Visa", "Mastercard", "Troy"],
  },
  {
    id: "iyzico",
    name: "iyzico",
    description: "Kolay ve güvenli ödeme çözümleri",
    icon: (
      <div className="bg-[#5252BE] text-white p-3 rounded-md font-bold">
        iyzico
      </div>
    ),
    supported: ["Visa", "Mastercard", "American Express", "Troy"],
  },
  {
    id: "payu",
    name: "PayU",
    description: "Global ödeme ve fintech çözümleri",
    icon: (
      <div className="bg-[#00A5CD] text-white p-3 rounded-md font-bold">
        PayU
      </div>
    ),
    supported: ["Visa", "Mastercard", "Troy"],
  },
];

interface PaymentProviderSelectorProps {
  onSelect: (provider: string) => void;
  selectedProvider?: string;
}

export function PaymentProviderSelector({ 
  onSelect, 
  selectedProvider 
}: PaymentProviderSelectorProps) {
  const [selectedTab, setSelectedTab] = useState<string>(selectedProvider || "credit-card");
  const [localSelectedProvider, setLocalSelectedProvider] = useState<string | undefined>(
    selectedProvider
  );

  const handleProviderSelect = (providerId: string) => {
    setLocalSelectedProvider(providerId);
    onSelect(providerId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ödeme Yöntemi Seçin</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          defaultValue={selectedTab} 
          className="w-full" 
          onValueChange={setSelectedTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credit-card">Kredi Kartı</TabsTrigger>
            <TabsTrigger value="other">Diğer Yöntemler</TabsTrigger>
          </TabsList>
          
          <TabsContent value="credit-card" className="pt-4 space-y-4">
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md">
              <div className="flex space-x-2">
                <SiVisa className="text-2xl text-blue-700" />
                <SiMastercard className="text-2xl text-orange-600" />
                <SiAmericanexpress className="text-2xl text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground">Tüm kredi kartları desteklenir</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {providers.map((provider) => (
                <Card 
                  key={provider.id}
                  className={`overflow-hidden cursor-pointer transition-all ${
                    localSelectedProvider === provider.id 
                      ? "ring-2 ring-primary ring-offset-1" 
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleProviderSelect(provider.id)}
                >
                  <CardContent className="p-4 relative">
                    {localSelectedProvider === provider.id && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-full flex justify-center p-2">
                        {provider.icon}
                      </div>
                      
                      <div className="text-center">
                        <h3 className="font-medium">{provider.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="other" className="pt-4">
            <div className="text-center p-6 border rounded-md">
              <p className="text-muted-foreground mb-2">
                Şu anda sadece kredi kartı ile ödeme kabul edilmektedir.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSelectedTab("credit-card")}
              >
                Kredi Kartına Dön
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}