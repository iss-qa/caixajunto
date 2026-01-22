import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
    isBottomNavVisible: boolean;
    setBottomNavVisible: (visible: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isBottomNavVisible, setBottomNavVisible] = useState(true);

    return (
        <UIContext.Provider value={{ isBottomNavVisible, setBottomNavVisible }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
