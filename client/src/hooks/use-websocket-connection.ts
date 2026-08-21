import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketOptions {
  path?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  exponentialBackoff?: boolean;
  pingInterval?: number;
  pingTimeoutMs?: number;
  autoReconnect?: boolean;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

export function useWebSocketConnection(options: WebSocketOptions = {}) {
  const {
    path = '/ws',
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    exponentialBackoff = true,
    pingInterval = 30000,
    pingTimeoutMs = 5000,
    autoReconnect = true,
    onMessage,
    onOpen,
    onClose,
    onError,
    onReconnect,
    onReconnectFailed,
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const [hasPingTimedOut, setHasPingTimedOut] = useState(false);
  
  // Referanslar
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manuallyDisconnected = useRef<boolean>(false);
  
  // Ping-pong ile bağlantıyı kontrol etme
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    pingIntervalRef.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          // Ping yerine JSON mesajı gönder (özel ping-pong protokolü)
          socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          setLastPingTime(Date.now());
          
          // Ping timeout kontrolü
          if (pingTimeoutRef.current) {
            clearTimeout(pingTimeoutRef.current);
          }
          
          pingTimeoutRef.current = setTimeout(() => {
            console.warn(`WebSocket ping timeout (${pingTimeoutMs}ms)`);
            setHasPingTimedOut(true);
            // Bağlantı timeout oldu, yeniden bağlanmayı dene
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.close();
            }
          }, pingTimeoutMs);
        } catch (error) {
          console.error('WebSocket ping error:', error);
        }
      }
    }, pingInterval);
  }, [socket, pingInterval, pingTimeoutMs]);
  
  // Tüm timer'ları temizle
  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Exponential backoff ile yeniden bağlanma süresi hesapla
  const getReconnectDelay = useCallback((attempt: number) => {
    if (!exponentialBackoff) return reconnectInterval;
    
    // 2^n şeklinde artan gecikme süresi, maksimum 30 saniye
    const delay = Math.min(
      reconnectInterval * Math.pow(2, attempt),
      30000
    );
    
    // Raslantısallık ekle (%20 +/-)
    return delay * (0.8 + Math.random() * 0.4);
  }, [exponentialBackoff, reconnectInterval]);

  // Bağlantı kurma fonksiyonu
  const connect = useCallback(() => {
    // Manuel kapatılmış ise yeniden bağlanma
    if (manuallyDisconnected.current) {
      console.log('WebSocket was manually closed, not reconnecting');
      return () => {};
    }
    
    try {
      // Temizleme işlemleri
      clearTimers();
      
      // Güvenli bağlantı mı kontrolü
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Host bilgisi
      const host = window.location.host;
      // WebSocket URL oluştur
      const wsUrl = `${protocol}//${host}${path}`;
      
      console.log('Connecting to WebSocket:', wsUrl);

      // WebSocket bağlantısını oluştur
      const newSocket = new WebSocket(wsUrl);
      
      // Bağlantı timeout kontrolü (10 saniye)
      const connectionTimeoutId = setTimeout(() => {
        if (newSocket.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout, closing socket');
          newSocket.close();
        }
      }, 10000);
      
      // Açıldığında
      newSocket.onopen = (event) => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeoutId);
        setIsConnected(true);
        setIsReconnecting(false);
        setHasPingTimedOut(false);
        
        // Yeniden bağlanma sayacını sıfırla
        if (reconnectAttempts > 0) {
          setReconnectAttempts(0);
        }
        
        // Ping interval'ı başlat
        startPingInterval();
        
        if (onOpen) onOpen(event);
      };
      
      // Mesaj geldiğinde
      newSocket.onmessage = (event) => {
        try {
          // Mesaj JSON mu kontrol et
          const data = JSON.parse(event.data);
          
          // Özel ping-pong protokolü kontrolü
          if (data.type === 'pong') {
            // Ping-pong başarılı, timeout'u temizle
            if (pingTimeoutRef.current) {
              clearTimeout(pingTimeoutRef.current);
              pingTimeoutRef.current = null;
            }
            setHasPingTimedOut(false);
            return; // Pong mesajlarını kullanıcıya gösterme
          }
        } catch (e) {
          // JSON değilse normal mesaj olarak devam et
        }
        
        if (onMessage) onMessage(event);
      };
      
      // Kapandığında
      newSocket.onclose = (event) => {
        console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'No reason provided'})`);
        clearTimeout(connectionTimeoutId);
        setIsConnected(false);
        clearTimers();
        
        if (onClose) onClose(event);
        
        // Eğer manuel kapatılmamışsa ve otomatik yeniden bağlanma aktifse
        if (autoReconnect && !manuallyDisconnected.current) {
          // Maksimum deneme sayısını aşmadıysak tekrar bağlanmayı dene
          if (reconnectAttempts < maxReconnectAttempts) {
            setIsReconnecting(true);
            const nextAttempt = reconnectAttempts + 1;
            const delay = getReconnectDelay(nextAttempt);
            
            console.log(`Attempting to reconnect (${nextAttempt}/${maxReconnectAttempts}) after ${Math.round(delay)}ms...`);
            
            if (onReconnect) onReconnect(nextAttempt);
            
            // Yeniden bağlanma zamanlayıcısını ayarla
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(nextAttempt);
              connect();
            }, delay);
          } else {
            console.log('Maximum reconnection attempts reached');
            setIsReconnecting(false);
            if (onReconnectFailed) onReconnectFailed();
          }
        }
      };
      
      // Hata oluştuğunda
      newSocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (onError) onError(event);
      };
      
      setSocket(newSocket);
      
      // Temizleme fonksiyonu
      return () => {
        clearTimeout(connectionTimeoutId);
        clearTimers();
        
        if (newSocket.readyState === WebSocket.OPEN || newSocket.readyState === WebSocket.CONNECTING) {
          newSocket.close();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      clearTimers();
      
      // Hata sonrası yeniden bağlanma denemesi
      if (autoReconnect && !manuallyDisconnected.current && reconnectAttempts < maxReconnectAttempts) {
        const nextAttempt = reconnectAttempts + 1;
        const delay = getReconnectDelay(nextAttempt);
        
        console.log(`Error occurred. Attempting to reconnect (${nextAttempt}/${maxReconnectAttempts}) after ${Math.round(delay)}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(nextAttempt);
          connect();
        }, delay);
      }
      
      return () => {
        clearTimers();
      };
    }
  }, [
    path, 
    reconnectInterval, 
    maxReconnectAttempts, 
    onMessage, 
    onOpen, 
    onClose, 
    onError, 
    onReconnect,
    onReconnectFailed,
    reconnectAttempts, 
    clearTimers, 
    getReconnectDelay, 
    autoReconnect,
    startPingInterval
  ]);
  
  // Bağlantıyı başlat
  useEffect(() => {
    manuallyDisconnected.current = false;
    const cleanup = connect();
    
    // Component unmount edildiğinde veya bağımlılıklar değiştiğinde
    return () => {
      cleanup();
    };
  }, [connect]);
  
  // Mesaj gönderme fonksiyonu
  const sendMessage = useCallback((data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, [socket]);
  
  // Bağlantıyı manuel olarak kapatma fonksiyonu
  const closeConnection = useCallback(() => {
    manuallyDisconnected.current = true;
    clearTimers();
    
    if (socket) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      setSocket(null);
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [socket, clearTimers]);
  
  // Manuel yeniden bağlanma fonksiyonu
  const reconnect = useCallback(() => {
    manuallyDisconnected.current = false;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close();
    }
    setReconnectAttempts(0);
    connect();
  }, [socket, connect]);
  
  return {
    socket,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    hasPingTimedOut,
    sendMessage,
    closeConnection,
    reconnect,
  };
}