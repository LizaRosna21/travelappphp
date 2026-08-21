import { useQuery } from "@tanstack/react-query";
import { SiteSetting } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

/**
 * Custom hook to fetch and provide site settings
 */
export function useSiteSettings() {
  const { 
    data: settings, 
    isLoading, 
    error 
  } = useQuery<SiteSetting>({
    queryKey: ['/api/site-settings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const defaultBackgroundImage = "/uploads/backgrounds/default-ferry-bg.jpg";
  const defaultOverlayColor = "rgba(0,0,0,0.5)";
  const defaultOverlayOpacity = "0.5";

  // Return settings with defaults for optional values
  return {
    settings,
    isLoading,
    error,
    // Background settings with defaults
    backgroundSettings: {
      image: settings?.homeBackgroundImage || defaultBackgroundImage,
      overlayColor: settings?.homeBackgroundOverlayColor || defaultOverlayColor,
      overlayOpacity: settings?.homeBackgroundOverlayOpacity || defaultOverlayOpacity,
    }
  };
}