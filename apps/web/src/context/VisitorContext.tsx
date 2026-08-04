"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Visitor } from "@beerfest/domain";

interface VisitorContextType {
  visitor: Visitor | null;
  setVisitor: (visitor: Visitor) => void;
  logout: () => void;
}

const VisitorContext = createContext<VisitorContextType>({
  visitor: null,
  setVisitor: () => {},
  logout: () => {},
});

export function VisitorProvider({ children }: { children: ReactNode }) {
  const [visitor, setVisitorState] = useState<Visitor | null>(null);

  const setVisitor = useCallback((v: Visitor) => {
    setVisitorState(v);
  }, []);

  const logout = useCallback(() => {
    setVisitorState(null);
  }, []);

  return (
    <VisitorContext.Provider value={{ visitor, setVisitor, logout }}>
      {children}
    </VisitorContext.Provider>
  );
}

export function useVisitor() {
  return useContext(VisitorContext);
}
