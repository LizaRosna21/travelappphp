import { useEffect, useState, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/hooks/use-whatsapp';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocketConnection } from '@/hooks/use-websocket-connection';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function WhatsAppChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  // Mesaj gösterimi için DOM referansı
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // WhatsApp context'inden bağlantı durumunu al
  const { isConnected, status } = useWhatsApp();

  // Mesajları gösterirken scroll'u en alta kaydır
  useEffect(() => {
    if (messagesContainerRef.current) {
      try {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } catch (error) {
        console.warn('[WhatsAppChat] Scroll error:', error);
      }
    }
  }, [messages]);

  // Hoş geldin mesajını göster
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          text: 'Merhaba! Ferry rezervasyonunuz ile ilgili nasıl yardımcı olabilirim?',
          isUser: false,
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  // Mesaj alma fonksiyonu
  const handleIncomingMessage = (messageData: any) => {
    try {
      if (!messageData) return;
      
      // Güvenli bir şekilde mesajları ekle
      setMessages(prev => {
        try {
          // Önceki mesajları kopyala (güvenli)
          const prevMessages = [...prev];
          
          // Yeni mesajı ekle
          const newMsg = {
            id: `server-${Date.now().toString()}`,
            text: messageData.message || messageData.content || "Mesajınız alındı",
            isUser: false,
            timestamp: new Date()
          };
          
          return [...prevMessages, newMsg];
        } catch (err) {
          console.error('[WhatsAppChat] Mesaj ekleme hatası:', err);
          return prev; // Hata durumunda orijinal listeyi koru
        }
      });
    } catch (error) {
      console.error('[WhatsAppChat] Gelen mesaj işleme hatası:', error);
    }
  };

  // Gelişmiş WebSocket bağlantısı kullan
  const { 
    isConnected: wsConnected, 
    sendMessage: wsSendMessage,
    hasPingTimedOut,
    isReconnecting,
  } = useWebSocketConnection({
    path: '/ws',
    pingInterval: 30000,
    maxReconnectAttempts: 15,
    exponentialBackoff: true,
    autoReconnect: true,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'whatsapp_message' || data.type === 'chat_response' || data.type === 'agent_message') {
          // Sistem, temsilci veya WhatsApp'ten gelen mesaj
          handleIncomingMessage(data);
        } else if (data.type === 'ping') {
          // Ping mesajına otomatik pong yanıtı gönder
          if (wsSendMessage) {
            try {
              wsSendMessage(JSON.stringify({ 
                type: 'pong', 
                timestamp: Date.now(),
                clientId: data.clientId || 'whatsapp-client' 
              }));
            } catch (pingError) {
              console.warn('[WhatsAppChat] Ping yanıtlama hatası:', pingError);
            }
          }
        } else if (data.type === 'connection_status') {
          // Bağlantı durum mesajlarını konsola logla
          console.log('[WhatsAppChat] WebSocket bağlantı durumu:', data.status);
        } else if (data.type === 'message_status') {
          // Mesaj durumu güncellemesi
          console.log('[WhatsAppChat] Mesaj durumu:', data.status, data.messageId);
        }
      } catch (error) {
        console.error('[WhatsAppChat] WebSocket mesajı işlenemedi:', error);
      }
    },
    onError: (error) => {
      console.error('[WhatsAppChat] WebSocket hatası:', error);
    },
    onClose: () => {
      console.log('[WhatsAppChat] WebSocket bağlantısı kapatıldı');
    }
  });

  const { sendWhatsAppMessage } = useWhatsApp();

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      // Kullanıcı mesajını ekle
      const userMessage: Message = {
        id: Date.now().toString(),
        text: newMessage,
        isUser: true,
        timestamp: new Date()
      };
      
      // Güvenli bir şekilde mesaj ekleme
      setMessages(prev => {
        try {
          return [...prev, userMessage];
        } catch (err) {
          console.error('[WhatsAppChat] Kullanıcı mesajı ekleme hatası:', err);
          return prev;
        }
      });
      
      const messageContent = newMessage;
      setNewMessage('');
      
      // Hem WhatsApp API'sini hem de WebSocket'i kullan
      let success = false;
      
      try {
        success = await sendWhatsAppMessage(messageContent);
      } catch (whatsappError) {
        console.error('[WhatsAppChat] WhatsApp API hatası:', whatsappError);
      }
      
      // WebSocket üzerinden mesajı gönder
      let wsSuccess = false;
      if (wsConnected && wsSendMessage) {
        try {
          wsSendMessage(JSON.stringify({
            type: 'chat_message',
            message: messageContent,
            timestamp: new Date().toISOString(),
            channel: 'whatsapp'
          }));
          wsSuccess = true;
        } catch (wsError) {
          console.error('[WhatsAppChat] WebSocket mesaj gönderme hatası:', wsError);
        }
      }
      
      if (!success && !wsSuccess && process.env.NODE_ENV !== 'development') {
        // Her iki kanal da başarısız olduğunda hata göster
        setMessages(prev => {
          try {
            return [...prev, {
              id: 'error-' + Date.now().toString(),
              text: 'Mesaj gönderilirken bir hata oluştu, ancak ekibimiz bu mesajı alacaktır.',
              isUser: false,
              timestamp: new Date()
            }];
          } catch (err) {
            console.error('[WhatsAppChat] Hata mesajı ekleme hatası:', err);
            return prev;
          }
        });
      }
      
      // Demo için cevap oluştur (hem gerçek bir API hatası durumunda hem de geliştirme modunda)
      if (process.env.NODE_ENV === 'development' || (!isConnected && !wsConnected)) {
        // Demo modunda mesajdaki anahtar kelimelere göre özel cevaplar oluştur
        let responseText = `"${messageContent}" mesajınız alındı. Size en kısa sürede dönüş yapacağız.`;
        
        try {
          // Mesajda özel anahtar kelimeler ara ve özel cevaplar oluştur
          const lowerMessage = messageContent.toLowerCase();
          
          if (lowerMessage.includes('rezervasyon') || lowerMessage.includes('pnr') || lowerMessage.includes('bilet')) {
            responseText = 'Rezervasyon bilgilerinizi kontrol etmek için PNR numaranızı paylaşır mısınız?';
          } else if (lowerMessage.includes('iptal') || lowerMessage.includes('iade')) {
            responseText = 'Bilet iptal işleminiz için PNR numaranızı ve iptal gerekçenizi paylaşabilir misiniz? İptal koşullarımız hakkında bilgi vermek isteriz.';
          } else if (lowerMessage.includes('fiyat') || lowerMessage.includes('ücret') || lowerMessage.includes('ne kadar')) {
            responseText = 'Fiyat bilgisi için lütfen hangi rota ve tarih aralığı ile ilgilendiğinizi belirtebilir misiniz?';
          } else if (lowerMessage.includes('sefer saati') || lowerMessage.includes('kalkış') || lowerMessage.includes('varış')) {
            responseText = 'Sefer saatleri hakkında bilgi almak için lütfen hangi rota için bilgi istediğinizi belirtebilir misiniz?';
          } else if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam')) {
            responseText = 'Merhaba! Size nasıl yardımcı olabilirim?';
          } else if (lowerMessage.includes('teşekkür')) {
            responseText = 'Rica ederim! Başka bir konuda yardım gerekirse yine buradayız.';
          }
        } catch (parseError) {
          console.warn('[WhatsAppChat] Anahtar kelime analizi hatası:', parseError);
        }
        
        setTimeout(() => {
          setMessages(prev => {
            try {
              return [...prev, {
                id: 'bot-' + Date.now().toString(),
                text: responseText,
                isUser: false,
                timestamp: new Date()
              }];
            } catch (err) {
              console.error('[WhatsAppChat] Demo cevabı ekleme hatası:', err);
              return prev;
            }
          });
        }, 1000);
      }
    } catch (error) {
      console.error('[WhatsAppChat] Mesaj gönderme hatası:', error);
      
      // Hata mesajı ekle
      try {
        setMessages(prev => {
          try {
            return [...prev, {
              id: 'error-' + Date.now().toString(),
              text: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
              isUser: false,
              timestamp: new Date()
            }];
          } catch (err) {
            console.error('[WhatsAppChat] Genel hata mesajı ekleme hatası:', err);
            return prev;
          }
        });
      } catch (setError) {
        console.error('[WhatsAppChat] setState hatası:', setError);
      }
    }
  };

  // Input change handler - hataya karşı korumalı
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setNewMessage(e.target.value);
    } catch (error) {
      console.warn('[WhatsAppChat] Input değişikliği hatası:', error);
    }
  };

  // Enter tuşuna basma - hataya karşı korumalı
  const handleKeyPress = (e: React.KeyboardEvent) => {
    try {
      if (e.key === 'Enter') {
        sendMessage();
      }
    } catch (error) {
      console.warn('[WhatsAppChat] Klavye olayı hatası:', error);
    }
  };

  // Chat açma/kapama - hataya karşı korumalı
  const toggleChat = (open: boolean) => {
    try {
      setIsOpen(open);
    } catch (error) {
      console.warn('[WhatsAppChat] Chat durumu değiştirme hatası:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => toggleChat(true)}
          className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg animate-bounce-slow"
          aria-label="WhatsApp Chat Aç"
        >
          <MessageCircle size={28} color="white" />
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
          </span>
        </Button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-80 md:w-96 flex flex-col max-h-[500px] border border-gray-200">
          <div className="bg-green-500 p-4 text-white rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold">WhatsApp Destek</h3>
              <div className="flex flex-col text-xs space-y-1">
                {/* WhatsApp bağlantı durumu */}
                <span className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></span>
                  {isConnected ? 'WhatsApp Bağlı' : `WhatsApp: ${status}`}
                </span>
                
                {/* WebSocket bağlantı durumu */}
                <span className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                    wsConnected 
                      ? 'bg-green-300' 
                      : isReconnecting 
                        ? 'bg-yellow-300'
                        : 'bg-red-300'
                  }`}></span>
                  {wsConnected 
                    ? 'Anlık Bağlantı Aktif' 
                    : isReconnecting 
                      ? 'Yeniden Bağlanıyor...' 
                      : hasPingTimedOut 
                        ? 'Bağlantı Zaman Aşımına Uğradı'
                        : 'Anlık Bağlantı Yok'}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleChat(false)}
              className="text-white hover:bg-green-600 rounded-full"
            >
              <X size={20} />
            </Button>
          </div>
          
          <div 
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 min-h-[300px]"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.isUser 
                    ? 'ml-auto bg-green-100 text-gray-800' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <p>{message.text}</p>
                <span className="text-xs text-gray-500 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  !wsConnected && !isConnected
                    ? "Bağlantı bekleniyor..."
                    : isReconnecting
                      ? "Yeniden bağlanıyor..."
                      : "Mesajınızı yazın..."
                }
                className={`flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  (!wsConnected && !isConnected && process.env.NODE_ENV !== 'development') 
                    ? 'bg-gray-100' 
                    : ''
                }`}
                disabled={(!wsConnected && !isConnected && process.env.NODE_ENV !== 'development')}
              />
              <Button
                onClick={sendMessage}
                disabled={((!wsConnected && !isConnected) && process.env.NODE_ENV !== 'development') || !newMessage.trim()}
                className={`rounded-full px-4 ${
                  wsConnected 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : isReconnecting 
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-gray-400 hover:bg-gray-500'
                }`}
              >
                {isReconnecting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Bağlanıyor
                  </span>
                ) : (
                  'Gönder'
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              WhatsApp Business API üzerinden destek alın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}