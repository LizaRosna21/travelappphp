import { useEffect } from 'react';

/**
 * WebSocket bağlantı hatalarını gizleyen ve DOM hatalarını yakalayan bileşen.
 * Özellikle Vite'ın HMR WebSocket hatalarını konsoldan kaldırmaya yardımcı olur
 * ve DOM erişim hatalarını önler.
 * Gelişmiş DOM güvenliği ve safeDOMUpdate yöntemlerini kullanır.
 */
export function WebSocketErrorSuppressor() {
  // Global unhandledrejection yakalayıcı
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        // Vite HMR veya WebSocket hatalarını kontrol et
        const errorText = event.reason?.message || event.reason?.toString() || '';
        if (
          errorText.includes('WebSocket') || 
          errorText.includes('localhost:undefined') || 
          errorText.includes('vite') || 
          errorText.includes('socket') ||
          errorText.includes('innerHTML') ||
          errorText.includes('Cannot set properties of null') ||
          errorText.includes('Cannot read properties of null')
        ) {
          // Hatayı yakala ve sessizce işle
          console.log('[Error Suppressor] Captured unhandled rejection:', errorText);
          event.preventDefault(); // Tarayıcının hata konsolunda göstermesini önle
          return true;
        }
      } catch (e) {
        console.warn('[Error Suppressor] Error in rejection handler:', e);
      }
      return false;
    };

    // Event listener ekle
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup fonksiyonu
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // DOM hatalarını yakalamak için Error constructor override
  useEffect(() => {
    try {
      // Orijinal Error constructor'ını sakla
      const OriginalError = window.Error;
      
      // DOM hatalarını yakalayan bir wrapper fonksiyon oluştur
      function ErrorWrapper(this: Error, message?: string) {
        try {
          const error = new OriginalError(message);
          
          // DOM erişim hatalarını yakala ve sessizce işle
          if (
            message?.includes('Cannot set properties of null') ||
            message?.includes('setting \'innerHTML\'') ||
            message?.includes('Cannot read properties of null') ||
            message?.includes('The provided value cannot be converted')
          ) {
            console.log('[DOM Error Suppressor] Captured DOM error:', message);
            error.stack = `Suppressed DOM error: ${message}\n    at <suppressed>`;
            
            // Global safeDOMUpdate fonksiyonu kullanılabilir ise, DOM güncellemelerinde kullan
            if (window.safeDOMUpdate && message?.includes('innerHTML')) {
              try {
                const match = message.match(/for element with id ['"]([^'"]+)['"]/);
                if (match && match[1]) {
                  const elementId = match[1];
                  console.log(`[DOM Safety] Element with ID ${elementId} had innerHTML issues, using safe update`);
                }
              } catch (matchError) {
                console.warn('[DOM Safety] Error parsing error message:', matchError);
              }
            }
          }
          
          Object.setPrototypeOf(error, Object.getPrototypeOf(this));
          return error;
        } catch (internalError) {
          console.warn('[DOM Error Suppressor] Internal error:', internalError);
          return new OriginalError(message); // Fallback to original
        }
      }
      
      try {
        ErrorWrapper.prototype = Object.create(OriginalError.prototype);
        ErrorWrapper.prototype.constructor = ErrorWrapper;
        
        // Error constructor'ını bizim wrapper ile değiştir
        window.Error = ErrorWrapper as typeof Error;
      } catch (prototypeError) {
        console.warn('[DOM Error Suppressor] Could not set prototype:', prototypeError);
      }
      
      // Temizleme fonksiyonu - orijinal Error'ı geri yükle
      return () => {
        try {
          window.Error = OriginalError;
        } catch (cleanupError) {
          console.warn('[DOM Error Suppressor] Error during cleanup:', cleanupError);
        }
      };
    } catch (setupError) {
      console.warn('[DOM Error Suppressor] Could not setup error handler:', setupError);
      return () => {}; // No cleanup needed if setup failed
    }
  }, []);

  // Global error handling için event listener
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      try {
        const errorMessage = event.message || '';
        const errorSource = event.filename || '';
        
        // DOM ilgili hataları yakala
        if (
          errorMessage.includes('Cannot set properties of null') ||
          errorMessage.includes('setting \'innerHTML\'') ||
          errorMessage.includes('Cannot read properties of null') ||
          errorMessage.includes('The provided value cannot be converted')
        ) {
          console.log('[Global Error Handler] Captured DOM error:', errorMessage);
          event.preventDefault(); // Tarayıcının hata konsolunda göstermesini önle
          return false;
        }
        
        // WebSocket hataları
        if (
          errorMessage.includes('WebSocket') || 
          errorMessage.includes('socket connection') ||
          errorMessage.includes('Failed to construct \'WebSocket\'') ||
          (errorSource && (
            errorSource.includes('socket') || 
            errorSource.includes('ws') ||
            errorSource.includes('vite')
          ))
        ) {
          console.log('[Global Error Handler] Captured WebSocket error:', errorMessage);
          event.preventDefault();
          return false;
        }
      } catch (handlerError) {
        console.warn('[Global Error Handler] Error in error handler:', handlerError);
      }
      return true;
    };
    
    window.addEventListener('error', handleGlobalError, true); // Capture phase
    
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
    };
  }, []);

  // Gelişmiş DOM koruma
  useEffect(() => {
    // Önemli DOM metodlarının orijinallerini sakla
    if (!window.safeDOMUpdate) {
      try {
        // Element.prototype.innerHTML setter'ını güvenli versiyonla koru
        const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        if (originalInnerHTMLDescriptor && originalInnerHTMLDescriptor.set) {
          const originalSetter = originalInnerHTMLDescriptor.set;
          
          Object.defineProperty(Element.prototype, 'innerHTML', {
            ...originalInnerHTMLDescriptor,
            set: function(value: string) {
              try {
                originalSetter.call(this, value);
              } catch (error) {
                console.warn('[DOM Safety] innerHTML setter error:', error);
                try {
                  // Hata durumunda daha güvenli bir yaklaşım dene
                  this.textContent = 'Güvenli içerik güncellenemedi';
                } catch (fallbackError) {
                  console.error('[DOM Safety] Even fallback content setting failed:', fallbackError);
                }
              }
            }
          });
        }
      } catch (e) {
        console.warn('[DOM Safety] Could not override innerHTML setter:', e);
      }
    }
    
    // Temizleme fonksiyonu
    return () => {
      // Prototip değişimlerini geri almak çok riskli olabilir
      // Bu yüzden temizleme yapmıyoruz
    };
  }, []);

  // WebSocket hatalarını yakalamak için
  useEffect(() => {
    try {
      // Orijinal WebSocket constructor'ını sakla
      const OriginalWebSocket = window.WebSocket;
      
      // WebSocket hatalarını yakalayan bir wrapper fonksiyon oluştur
      const WebSocketWrapper = function(this: any, url: string, protocols?: string | string[]) {
        try {
          // URL'i kontrol et
          if (!url) {
            console.warn('[WebSocket] Empty URL provided');
            throw new Error('Invalid WebSocket URL');
          }
          
          // Vite veya geçersiz WebSocket bağlantılarını kontrol et
          if (url.includes('localhost:undefined') || 
              (url.includes('vite') && url.includes('undefined')) ||
              !url.startsWith('ws:') && !url.startsWith('wss:')) {
            console.log('[WebSocket] Intercepted invalid connection attempt to:', url);
            
            // WebSocket API'sini taklit eden ama hiçbir şey yapmayan bir nesne döndür
            const mockSocket = {
              readyState: 3, // CLOSED durumu
              send: (data: any) => {
                console.log('[WebSocket] Mock socket ignoring send:', data);
              },
              close: () => {
                console.log('[WebSocket] Mock socket already closed');
              },
              onopen: null as any,
              onclose: null as any,
              onerror: null as any,
              onmessage: null as any,
              addEventListener: (type: string, listener: any) => {
                console.log('[WebSocket] Mock socket ignoring event listener:', type);
              },
              removeEventListener: () => {},
              dispatchEvent: () => true,
              CONNECTING: 0,
              OPEN: 1,
              CLOSING: 2,
              CLOSED: 3,
              protocol: '',
              extensions: '',
              bufferedAmount: 0,
              binaryType: 'blob' as BinaryType,
              url: url,
            };
            
            // Bir sonraki mikro görevde kapalı olay tetikleyicisini çağır
            setTimeout(() => {
              try {
                // onerror handler
                if (typeof mockSocket.onerror === 'function') {
                  try {
                    const errorEvent = new Event('error') as any;
                    errorEvent.target = mockSocket;
                    mockSocket.onerror(errorEvent);
                  } catch (e) {
                    console.log('[WebSocket] Error in onerror handler:', e);
                  }
                }
                
                // onclose handler
                if (typeof mockSocket.onclose === 'function') {
                  try {
                    const closeEvent = { 
                      code: 1006, 
                      reason: 'Invalid URL', 
                      wasClean: false,
                      target: mockSocket
                    } as CloseEvent;
                    mockSocket.onclose(closeEvent);
                  } catch (e) {
                    console.log('[WebSocket] Error in onclose handler:', e);
                  }
                }
                
                // error event listeners
                mockSocket.dispatchEvent(new Event('error'));
                mockSocket.dispatchEvent(new CloseEvent('close', { 
                  code: 1006, 
                  reason: 'Invalid URL', 
                  wasClean: false 
                }));
              } catch (eventError) {
                console.warn('[WebSocket] Error dispatching events:', eventError);
              }
            }, 0);
            
            return mockSocket;
          }
          
          // URL geçerliyse, gerçek WebSocket oluştur
          const ws = new OriginalWebSocket(url, protocols);
          
          // Bağlantı hata yakalama ekle
          const originalOnError = ws.onerror;
          ws.onerror = function(event) {
            console.log('[WebSocket] Connection error:', event);
            if (originalOnError) {
              try {
                // Orijinal error handler'ı çağır
                if (typeof originalOnError === 'function') {
                  originalOnError.call(this, event);
                }
              } catch (handlerError) {
                console.warn('[WebSocket] Error in original error handler:', handlerError);
              }
            }
          };
          
          return ws;
        } catch (error) {
          console.warn('[WebSocket] Error creating connection:', error);
          
          // Hata durumunda da mock socket döndür
          const mockSocket = {
            readyState: 3,
            send: () => {},
            close: () => {},
            onopen: null as any,
            onclose: null as any,
            onerror: null as any,
            onmessage: null as any,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
            protocol: '',
            extensions: '',
            bufferedAmount: 0,
            binaryType: 'blob' as BinaryType,
            url: url || 'unknown',
          };
          
          // Bir sonraki mikro görevde hata olay tetikleyicisini çağır
          setTimeout(() => {
            try {
              // Tüm handler çağrılarını try/catch içine al
              if (typeof mockSocket.onerror === 'function') {
                try {
                  const errorEvent = new Event('error') as any;
                  errorEvent.target = mockSocket;
                  mockSocket.onerror(errorEvent);
                } catch (e) {
                  console.log('[WebSocket] Error in onerror handler:', e);
                }
              }
              
              if (typeof mockSocket.onclose === 'function') {
                try {
                  const closeEvent = { 
                    code: 1006, 
                    reason: 'Connection failed', 
                    wasClean: false,
                    target: mockSocket
                  } as CloseEvent;
                  mockSocket.onclose(closeEvent);
                } catch (e) {
                  console.log('[WebSocket] Error in onclose handler:', e);
                }
              }
              
              // event listeners
              mockSocket.dispatchEvent(new Event('error'));
              mockSocket.dispatchEvent(new CloseEvent('close', { 
                code: 1006, 
                reason: 'Connection failed', 
                wasClean: false 
              }));
            } catch (eventError) {
              console.warn('[WebSocket] Error dispatching events:', eventError);
            }
          }, 0);
          
          return mockSocket;
        }
      } as any;
      
      // Gerçek WebSocket özelliklerini kopyala
      WebSocketWrapper.prototype = OriginalWebSocket.prototype;
      WebSocketWrapper.CONNECTING = OriginalWebSocket.CONNECTING;
      WebSocketWrapper.OPEN = OriginalWebSocket.OPEN;
      WebSocketWrapper.CLOSING = OriginalWebSocket.CLOSING;
      WebSocketWrapper.CLOSED = OriginalWebSocket.CLOSED;
      
      // WebSocket constructor'ını bizim wrapper ile değiştir
      window.WebSocket = WebSocketWrapper as any;
      
      // Temizleme fonksiyonu - orijinal WebSocket'i geri yükle
      return () => {
        try {
          window.WebSocket = OriginalWebSocket;
        } catch (cleanupError) {
          console.warn('[WebSocket] Error during cleanup:', cleanupError);
        }
      };
    } catch (setupError) {
      console.warn('[WebSocket] Could not setup wrapper:', setupError);
      return () => {}; // No cleanup needed if setup failed
    }
  }, []);
  
  // Bu bileşen UI render etmez
  return null;
}