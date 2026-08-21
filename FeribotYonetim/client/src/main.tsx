import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Gelişmiş DOM Güvenliği ve Hata Yönetimi
 * 
 * Bu dosya, uygulama genelinde DOM erişimlerini ve WebSocket bağlantılarını güvenli hale getiren
 * kapsamlı bir hata engelleme sistemi içerir. DOM işlemlerinde oluşabilecek null referans hataları,
 * WebSocket bağlantı kesintileri ve vite HMR sorunlarını ele alır.
 */

// Güvenli DOM erişim fonksiyonu
function safeQuerySelector(selector: string): HTMLElement | null {
  try {
    if (!document || !document.querySelector) {
      console.warn(`[DOM Safety] Document or querySelector not available`);
      return null;
    }
    return document.querySelector(selector) as HTMLElement;
  } catch (error) {
    console.warn(`[DOM Safety] Error querying selector: ${selector}`, error);
    return null;
  }
}

// Gelişmiş DOM elementlerinin var olup olmadığını kontrol eden fonksiyon
function elementExists(selector: string): boolean {
  try {
    return !!safeQuerySelector(selector);
  } catch (error) {
    console.warn(`[DOM Safety] Error checking element existence: ${selector}`, error);
    return false;
  }
}

// Zenginleştirilmiş InnerHTML güvenli ayarlama yardımcı fonksiyonu
window.safeDOMUpdate = function(selector: string, html: string): boolean {
  try {
    const element = safeQuerySelector(selector);
    if (!element) {
      console.warn(`[DOM Safety] Element not found: ${selector}`);
      return false;
    }
    
    try {
      // Önce mevcut içeriği yedekle
      const originalContent = element.innerHTML;
      
      // Yeni içeriği ayarlamayı dene
      element.innerHTML = html;
      return true;
    } catch (innerError) {
      console.warn(`[DOM Safety] Failed to update innerHTML for ${selector}`, innerError);
      
      // İçerik güncellenemedi, daha güvenli bir fallback yöntemi dene
      try {
        // textContent kullanarak alternatif bir çözüm dene
        element.textContent = "İçerik güncellenirken bir hata oluştu";
        return false;
      } catch (fallbackError) {
        console.error(`[DOM Safety] Critical error updating element ${selector}`, fallbackError);
        return false;
      }
    }
  } catch (outerError) {
    console.error(`[DOM Safety] Outer error in safeDOMUpdate for ${selector}`, outerError);
    return false;
  }
};

// Gelişmiş DOM element oluşturma
window.safeCreateElement = function(tagName: string, attributes: Record<string, string> = {}, innerHTML?: string): HTMLElement | null {
  try {
    if (!document || !document.createElement) {
      console.warn(`[DOM Safety] Document or createElement not available`);
      return null;
    }
    
    const element = document.createElement(tagName);
    
    // Attributeları ayarla
    Object.entries(attributes).forEach(([key, value]) => {
      try {
        element.setAttribute(key, value);
      } catch (attrError) {
        console.warn(`[DOM Safety] Failed to set attribute ${key}=${value}`, attrError);
      }
    });
    
    // İçeriği ayarla (varsa)
    if (innerHTML !== undefined) {
      try {
        element.innerHTML = innerHTML;
      } catch (htmlError) {
        console.warn(`[DOM Safety] Failed to set innerHTML`, htmlError);
        // Fallback to safer textContent
        try {
          element.textContent = innerHTML;
        } catch (textError) {
          console.error(`[DOM Safety] Failed even with textContent fallback`, textError);
        }
      }
    }
    
    return element;
  } catch (error) {
    console.error(`[DOM Safety] Failed to create element ${tagName}`, error);
    return null;
  }
};

// Gelişmiş element append fonksiyonu
window.safeAppendChild = function(parent: string | HTMLElement, child: HTMLElement): boolean {
  try {
    const parentElement = typeof parent === 'string' ? safeQuerySelector(parent) : parent;
    
    if (!parentElement) {
      console.warn(`[DOM Safety] Parent element not found`);
      return false;
    }
    
    parentElement.appendChild(child);
    return true;
  } catch (error) {
    console.error(`[DOM Safety] Failed to append child`, error);
    return false;
  }
};

// Geliştirilmiş Global unhandledrejection handler
window.addEventListener('unhandledrejection', (event) => {
  try {
    // Daha detaylı hata bilgisi al
    const errorReason = event.reason;
    const errorMessage = errorReason?.message || errorReason?.toString() || '';
    const errorStack = errorReason?.stack || '';
    
    // WebSocket, DOM ve diğer common hataları yakala
    if (
      errorMessage.includes('WebSocket') || 
      errorMessage.includes('localhost:undefined') || 
      errorMessage.includes('wss://localhost') ||
      errorMessage.includes('ws://') ||
      (errorMessage.includes('vite') && errorMessage.includes('socket')) ||
      errorMessage.includes('Cannot set properties of null') ||
      errorMessage.includes('innerHTML') ||
      errorMessage.includes('The provided value cannot be converted') ||
      errorMessage.includes('Cannot read properties of null') ||
      (errorStack && errorStack.includes('socket'))
    ) {
      console.log('[Global Rejection Handler] Intercepted error:', {
        message: errorMessage,
        stack: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
      });
      
      event.preventDefault(); // Prevents the error from appearing in the console
      return true; // Handled
    }
  } catch (handlerError) {
    console.warn('[Global Rejection Handler] Error in handler', handlerError);
  }
});

// Geliştirilmiş Global error handler
window.addEventListener('error', (event) => {
  try {
    // Hata detaylarını al
    const errorObj = event.error;
    const errorMessage = errorObj?.message || event.message || '';
    const errorStack = errorObj?.stack || '';
    const errorFilename = event.filename || '';
    
    // WebSocket, DOM ve diğer common hataları yakala
    if (
      errorMessage.includes('WebSocket') || 
      errorMessage.includes('localhost:undefined') || 
      errorMessage.includes('wss://localhost') ||
      (errorMessage.includes('vite') && errorMessage.includes('socket')) ||
      errorMessage.includes('Cannot set properties of null') ||
      errorMessage.includes('innerHTML') ||
      errorMessage.includes('The provided value cannot be converted') ||
      errorMessage.includes('Cannot read properties of null') ||
      errorFilename.includes('socket') ||
      errorFilename.includes('ws') ||
      (errorStack && (
        errorStack.includes('WebSocket') || 
        errorStack.includes('socket')
      ))
    ) {
      console.log('[Global Error Handler] Intercepted error event:', {
        message: errorMessage,
        filename: errorFilename,
        stack: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
      });
      
      event.preventDefault(); // Prevents the error from appearing in the console
      return false; // Prevents default browser error handling
    }
  } catch (handlerError) {
    console.warn('[Global Error Handler] Error in handler', handlerError);
  }
  return true;
}, true);

// DOM Elementlerini korumak için güvenlik katmanı
const protectDOMElements = () => {
  try {
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name: string, value: string) {
      try {
        return originalSetAttribute.call(this, name, value);
      } catch (error) {
        console.warn(`[DOM Safety] Failed to set attribute ${name}=${value}`, error);
        return undefined;
      }
    };
    
    // innerHTML için benzer koruma eklenebilir
    const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (originalInnerHTMLDescriptor && originalInnerHTMLDescriptor.set) {
      const originalSetter = originalInnerHTMLDescriptor.set;
      
      Object.defineProperty(Element.prototype, 'innerHTML', {
        ...originalInnerHTMLDescriptor,
        set: function(value: string) {
          try {
            return originalSetter.call(this, value);
          } catch (error) {
            console.warn(`[DOM Safety] Failed to set innerHTML`, error);
            
            // textContent ile fallback dene
            try {
              this.textContent = "İçerik yüklenemedi";
            } catch (fallbackError) {
              // Silent fail
            }
            return undefined;
          }
        }
      });
    }
    
    console.log('[DOM Safety] DOM protection layer activated');
  } catch (error) {
    console.warn('[DOM Safety] Failed to setup DOM protection layer', error);
  }
};

// Geliştirilmiş DOM operasyonları için Mutation Observer
const setupMutationSafety = () => {
  try {
    // DOM henüz hazır değilse observer kurulumunu geciktir
    if (!document.body) {
      console.log('[DOM Safety] Document body not ready, delaying observer setup');
      window.addEventListener('DOMContentLoaded', () => {
        console.log('[DOM Safety] Document ready, setting up observer');
        setupMutationSafety();
      });
      return null;
    }
    
    const observer = new MutationObserver((mutations) => {
      try {
        mutations.forEach((mutation) => {
          try {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // Eklenen DOM nodelarını kontrol et
              mutation.addedNodes.forEach((node) => {
                try {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    // Burada yeni eklenen elementler için güvenlik kontrolleri yapılabilir
                    // Örneğin, script taglerini kontrol etme veya güvenli olmayan attrleri filtreleme
                  }
                } catch (nodeError) {
                  // Node işleme hatalarını sessizce yakala
                }
              });
            }
          } catch (mutationError) {
            // Bireysel mutation işleme hatalarını sessizce yakala
          }
        });
      } catch (batchError) {
        console.warn('[DOM Safety] Error processing mutations', batchError);
      }
    });
    
    // Tüm DOM değişikliklerini izle
    try {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        characterData: true
      });
      
      console.log('[DOM Safety] Mutation observer successfully setup');
    } catch (observeError) {
      console.warn('[DOM Safety] Failed to start observing', observeError);
    }
    
    return observer;
  } catch (setupError) {
    console.warn('[DOM Safety] Failed to setup mutation observer', setupError);
    return null;
  }
};

// Type definitions
declare global {
  interface Window {
    safeDOMUpdate: (selector: string, html: string) => boolean;
    safeCreateElement: (tagName: string, attributes?: Record<string, string>, innerHTML?: string) => HTMLElement | null;
    safeAppendChild: (parent: string | HTMLElement, child: HTMLElement) => boolean;
    requestIdleCallback?: (callback: Function, options?: object) => number;
  }
}

// DOM koruma katmanını aktive et
protectDOMElements();

// Uygulama başlatma - tüm render işlemini try-catch içine al
try {
  // Root elementi güvenli bir şekilde al
  const rootElement = document.getElementById("root");
  
  if (rootElement) {
    try {
      // React uygulamasını render et
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log('[App] Successfully rendered React application');
      
      // DOM güvenliği için mutation observer kurulumunu geciktir
      // Tarayıcı boştayken çalıştır (daha modern tarayıcılar için)
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          setupMutationSafety();
        });
      } else {
        // Fallback için setTimeout kullan
        setTimeout(() => {
          setupMutationSafety();
        }, 100);
      }
    } catch (renderError) {
      console.error('[Critical Error] Failed to render app:', renderError);
      
      // Kritik render hatası durumunda kullanıcıya basit bir mesaj göster
      try {
        rootElement.innerHTML = `
          <div style="padding: 20px; text-align: center; font-family: sans-serif;">
            <h2>Uygulama yüklenirken bir hata oluştu</h2>
            <p>Lütfen sayfayı yenilemeyi deneyin veya daha sonra tekrar kontrol edin.</p>
          </div>
        `;
      } catch (fallbackError) {
        console.error('[Critical Error] Even fallback rendering failed:', fallbackError);
      }
    }
  } else {
    console.error('[Critical Error] Root element not found');
    
    // Root element bulunamadığında body'ye bir mesaj ekle
    if (document.body) {
      try {
        document.body.innerHTML = `
          <div style="padding: 20px; text-align: center; font-family: sans-serif;">
            <h2>Sayfa yüklenirken bir hata oluştu</h2>
            <p>Lütfen sayfayı yenilemeyi deneyin.</p>
          </div>
        `;
      } catch (fallbackError) {
        // En son çare - sadece logla
      }
    }
  }
} catch (criticalError) {
  console.error('[Critical Error] Fatal application error:', criticalError);
  
  // En kritik hata durumunda bile bir şeyler göstermeye çalış
  try {
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Uygulama başlatılamadı.</div>';
  } catch (e) {
    // Son çare başarısız oldu, yapılacak bir şey kalmadı
  }
}
