import { createContext, ReactNode, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  mode?: string;
  lastUpdated?: string;
}

interface WhatsAppContextType {
  isConnected: boolean;
  status: WhatsAppStatus | null;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
  sendWhatsAppMessage: (message: string) => Promise<boolean>;
}

export const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Status check performans iyileştirmeleri
  const lastCheckTime = useRef<number>(0);
  const staleCacheInterval = 300000; // 5 dakika (ms) - durum verisinin "bayat" sayılacağı süre
  const checkIntervalTime = 300000; // 5 dakika (ms) - düzenli kontrol aralığı (önceki: 60 saniye)
  const forceCheckInProgress = useRef<boolean>(false);
  
  // WebSocket aktif olduğunda, daha az durum kontrolü yapmak için
  const wsConnectedRef = useRef<boolean>(false);

  const checkWhatsAppStatus = useCallback(async (force: boolean = false) => {
    // Halihazırda işlenen bir zorunlu kontrol varsa, tekrar işlemekten kaçın
    if (forceCheckInProgress.current && force) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTime.current;
    
    // Eğer zorunlu değilse ve son kontrolden bu yana yeterli zaman geçmediyse atla
    if (!force && timeSinceLastCheck < staleCacheInterval) {
      // console.log('WhatsApp durum kontrolü: Önbellekteki veri kullanılıyor');
      return;
    }
    
    // Eğer WebSocket bağlantısı aktifse ve zorunlu değilse, kontrol sıklığını azalt
    if (wsConnectedRef.current && !force && timeSinceLastCheck < staleCacheInterval * 2) {
      // console.log('WhatsApp durum kontrolü: WebSocket aktif olduğu için atlandı');
      return;
    }
    
    if (force) {
      forceCheckInProgress.current = true;
    }
    
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", "/api/whatsapp/status");
      const data = await response.json();
      
      setStatus(data);
      setIsConnected(data.connected);
      lastCheckTime.current = Date.now();
      
    } catch (error) {
      console.error("WhatsApp status check error:", error);
      setIsConnected(false);
      setStatus({
        connected: false,
        status: "error",
      });
    } finally {
      setIsLoading(false);
      if (force) {
        forceCheckInProgress.current = false;
      }
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    await checkWhatsAppStatus(true); // true: force refresh
  }, [checkWhatsAppStatus]);
  
  // WebSocket bağlantı durumunu kullanarak durum kontrolünü optimize et
  useEffect(() => {
    // WebSocket bağlantısı dinleyicisi
    const handleWSMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connection_status') {
          wsConnectedRef.current = data.connected;
        } else if (data.type === 'whatsapp_status_update') {
          // WebSocket üzerinden WhatsApp durum güncellemesi geldiğinde cache'i güncelle
          setStatus(data.status);
          setIsConnected(data.status.connected);
          lastCheckTime.current = Date.now();
        }
      } catch (e) {
        // JSON parse hatası, işlem yapma
      }
    };
    
    // Global window objesi üzerinden WebSocket mesajlarını dinle
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'ws_message') {
        handleWSMessage(e.data.event);
      }
    });
    
    return () => {
      window.removeEventListener('message', handleWSMessage);
    };
  }, []);

  useEffect(() => {
    // İlk yükleme kontrolü
    checkWhatsAppStatus(true);
    
    // Daha seyrek durum kontrolü - 5 dakikada bir (önceki: 60 saniye)
    const interval = setInterval(() => checkWhatsAppStatus(false), checkIntervalTime);
    
    return () => clearInterval(interval);
  }, [checkWhatsAppStatus]);

  const sendWhatsAppMessage = async (message: string): Promise<boolean> => {
    if (!message.trim()) return false;
    
    try {
      const response = await apiRequest("POST", "/api/whatsapp/send", {
        message,
      });
      
      const data = await response.json();
      
      // Başarılı mesaj gönderimi sonrası durum kontrolünü güncelle
      // ama asenkron olarak arkada çalıştır, kullanıcı arayüzünü bloklamasın
      setTimeout(() => refreshStatus(), 2000);
      
      return data.success || false;
    } catch (error) {
      console.error("WhatsApp message send error:", error);
      return false;
    }
  };

  return (
    <WhatsAppContext.Provider
      value={{
        isConnected,
        status,
        isLoading,
        refreshStatus,
        sendWhatsAppMessage,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error("useWhatsApp must be used within a WhatsAppProvider");
  }
  return context;
}