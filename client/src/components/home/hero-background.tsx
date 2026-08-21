import { ReactNode, useEffect, useState } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Loader2 } from "lucide-react";

interface HeroBackgroundProps {
  children: ReactNode;
  className?: string;
}

const HeroBackground = ({ children, className = "" }: HeroBackgroundProps) => {
  const { backgroundSettings, isLoading } = useSiteSettings();
  const [scrollPos, setScrollPos] = useState(0);

  // Paralaks efekti için scroll pozisyonunu takip et
  useEffect(() => {
    const handleScroll = () => {
      setScrollPos(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="relative min-h-[500px] flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Gradient overlay
  const gradientOverlay = `linear-gradient(to right, 
    rgba(3, 105, 161, 0.8) 0%, 
    rgba(12, 74, 110, 0.6) 50%, 
    rgba(8, 47, 73, 0.8) 100%)`;

  return (
    <div
      className={`relative overflow-hidden min-h-[650px] ${className}`}
      style={{
        backgroundImage: `url(${backgroundSettings.image})`,
        backgroundSize: "cover",
        backgroundPosition: `center ${scrollPos * 0.1}px`, // Paralaks efekti
        transition: "background-position 0.1s ease-out",
      }}
    >
      {/* Modern gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: gradientOverlay,
          opacity: 0.85,
        }}
      />
      
      {/* Decorative waves */}
      <div className="absolute bottom-0 left-0 w-full h-24 md:h-32 z-[5] opacity-30">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="h-full w-full">
          <path fill="#ffffff" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,224C672,235,768,245,864,240C960,235,1056,213,1152,202.7C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
      
      {/* Animasyonlu deniz simgeleri */}
      <div className="absolute top-10 right-10 text-white/20 z-[2] animate-float">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16.016V7.984a4 4 0 1 1 0 8.032"></path><path d="M10 16.016V7.984a4 4 0 1 0 0 8.032"></path><path d="M5 13h14"></path></svg>
      </div>
      
      <div className="absolute top-20 left-[10%] text-white/20 z-[2] animate-float-slow">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h12"></path><path d="M12 6v12"></path></svg>
      </div>
      
      <div className="absolute bottom-28 right-[15%] text-white/20 z-[2] animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 7V3"></path><path d="M12 21v-4"></path><path d="M3 12h4"></path><path d="M21 12h-4"></path><path d="M7.6 16.4l2.8-2.8"></path><path d="M7.6 7.6l2.8 2.8"></path><path d="M16.4 16.4l-2.8-2.8"></path><path d="M16.4 7.6l-2.8 2.8"></path></svg>
      </div>
      
      {/* Content that sits on top of the background and overlay */}
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 h-full">
        {children}
      </div>
    </div>
  );
};

export default HeroBackground;