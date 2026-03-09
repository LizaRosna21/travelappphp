import { useMemo } from "react";
import { useLocation } from "wouter";

export function useQueryParams() {
  const [location] = useLocation();
  
  return useMemo(() => {
    const searchParams = new URLSearchParams(
      location.includes("?") ? location.split("?")[1] : ""
    );
    
    return searchParams;
  }, [location]);
}