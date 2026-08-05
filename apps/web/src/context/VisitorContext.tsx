"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Visitor } from "@beerfest/domain";
import { getAdapter } from "@/lib/db/synthetic";

interface VisitorContextType {
  visitor: Visitor | null;
  setVisitor: (visitor: Visitor) => void;
  logout: () => void;
  loading: boolean;
}

const VisitorContext = createContext<VisitorContextType>({
  visitor: null,
  setVisitor: () => {},
  logout: () => {},
  loading: true,
});

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function VisitorProvider({ children }: { children: ReactNode }) {
  const [visitor, setVisitorState] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const visitorId = getCookie("beerfest_visitor_id");
    if (visitorId) {
      getAdapter().getVisitor(visitorId).then((v) => {
        if (v) setVisitorState(v);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const setVisitor = useCallback((v: Visitor) => {
    setVisitorState(v);
  }, []);

  const logout = useCallback(() => {
    setVisitorState(null);
  }, []);

  return (
    <VisitorContext.Provider value={{ visitor, setVisitor, logout, loading }}>
      {children}
    </VisitorContext.Provider>
  );
}

export function useVisitor() {
  return useContext(VisitorContext);
}
