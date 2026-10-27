import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type BackHandler = () => boolean; // returns true if handled, false to let next handler or default run

interface BackNavigationContextType {
  registerBackHandler: (handler: BackHandler, priority?: number) => () => void;
}

const BackNavigationContext = createContext<BackNavigationContextType | null>(null);

interface HandlerItem {
  id: number;
  priority: number;
  handler: BackHandler;
}

export const BackNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<HandlerItem[]>([]);
  const idCounterRef = useRef(0);
  const isNavigatingBackRef = useRef(false);

  // Maintain an artificial history state stack in the browser so that
  // pressing Android physical back button (or browser back swipe/button)
  // triggers `popstate` instead of closing the PWA or exiting the webpage.
  useEffect(() => {
    // Ensure initial entry has our app marker
    if (!window.history.state || !window.history.state.__app_screen) {
      window.history.replaceState({ __app_screen: 'root', depth: 0 }, '');
    }

    // Always push a top barrier state so there is always a state to pop
    window.history.pushState({ __app_screen: 'current', depth: 1 }, '');

    const handlePopState = (e: PopStateEvent) => {
      // Prevent recursive triggers
      if (isNavigatingBackRef.current) return;

      // Sort handlers by priority descending (higher priority = modals/drawers first, then tabs)
      const sorted = [...handlersRef.current].sort((a, b) => b.priority - a.priority);

      let handled = false;
      for (const item of sorted) {
        try {
          if (item.handler()) {
            handled = true;
            break;
          }
        } catch (err) {
          console.error('Error executing back handler:', err);
        }
      }

      if (handled) {
        // We consumed the back press!
        // Immediately push back the barrier state so subsequent back presses also trigger popstate
        // instead of falling off the history stack and closing the app.
        window.history.pushState({ __app_screen: 'current', depth: 1 }, '');
      } else {
        // Nothing handled it (user is on root screen with no open modals/submenus).
        // Push the guard state again so they don't accidentally close the app on single press.
        window.history.pushState({ __app_screen: 'current', depth: 1 }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const registerBackHandler = useCallback((handler: BackHandler, priority: number = 10) => {
    const id = ++idCounterRef.current;
    handlersRef.current.push({ id, priority, handler });

    return () => {
      handlersRef.current = handlersRef.current.filter((item) => item.id !== id);
    };
  }, []);

  return (
    <BackNavigationContext.Provider value={{ registerBackHandler }}>
      {children}
    </BackNavigationContext.Provider>
  );
};

export function useBackHandler(handler: BackHandler, active: boolean = true, priority: number = 10) {
  const context = useContext(BackNavigationContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!context || !active) return;
    return context.registerBackHandler(() => handlerRef.current(), priority);
  }, [context, active, priority]);
}
