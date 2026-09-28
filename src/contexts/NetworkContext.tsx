import React, { createContext, useContext, useState, useEffect } from 'react';

interface NetworkContextType {
  isOnline: boolean;
  checkOnlineOrWarn: (actionDescription?: string) => boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Helper that checks if online. Returns true if online, or false if offline.
   * Can be called right before transactional operations.
   */
  const checkOnlineOrWarn = (_actionDescription?: string): boolean => {
    return isOnline;
  };

  return (
    <NetworkContext.Provider value={{ isOnline, checkOnlineOrWarn }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
