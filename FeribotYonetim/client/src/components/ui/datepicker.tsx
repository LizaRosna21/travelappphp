import * as React from "react";
import { format, parse, addDays, isValid } from "date-fns";
import { tr } from "date-fns/locale"; // Turkish locale for date formatting
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  disabled?: boolean;
  fullWidth?: boolean;
}

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

export function DatePicker({
  date,
  setDate,
  label,
  placeholder = "Tarih seçin",
  className,
  minDate,
  disabled = false,
  fullWidth = true,
}: DatePickerProps) {
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>(
    date ? format(date, "dd.MM.yyyy", { locale: tr }) : ""
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle outside clicks to close the calendar
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Update input value when date changes
  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd.MM.yyyy", { locale: tr }));
      setErrorMessage(null);
    } else {
      setInputValue("");
    }
  }, [date]);

  // Focus and position handling
  React.useEffect(() => {
    if (showCalendar && calendarRef.current) {
      // Position the calendar properly (below the input)
      const inputRect = inputRef.current?.getBoundingClientRect();
      if (inputRect) {
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - inputRect.bottom;
        
        if (spaceBelow < 300 && inputRect.top > 300) {
          // If there's not enough space below but enough above, show above
          calendarRef.current.style.bottom = "100%";
          calendarRef.current.style.top = "auto";
        } else {
          // Show below
          calendarRef.current.style.top = "100%";
          calendarRef.current.style.bottom = "auto";
        }
      }
    }
  }, [showCalendar]);

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setErrorMessage(null);
    
    // Allow only numeric inputs and dots
    const filteredValue = value.replace(/[^\d.]/g, "");
    
    // Only update if the input is valid or empty
    if (filteredValue === "" || /^\d{0,2}(\.\d{0,2}(\.\d{0,4})?)?$/.test(filteredValue)) {
      setInputValue(filteredValue);
      
      // Auto-add dots if needed
      if (filteredValue.length === 2 && !filteredValue.includes(".") && value.length > inputValue.length) {
        setInputValue(filteredValue + ".");
      } else if (filteredValue.length === 5 && filteredValue.split(".").length === 2 && value.length > inputValue.length) {
        setInputValue(filteredValue + ".");
      }
      
      // Try to parse the date if it's in the correct format
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(filteredValue)) {
        try {
          const parsedDate = parse(filteredValue, "dd.MM.yyyy", new Date());
          
          // Check if date is valid
          if (isValid(parsedDate)) {
            // Check minimum date constraint
            if (minDate && parsedDate < minDate) {
              const formattedMinDate = format(minDate, "dd.MM.yyyy", { locale: tr });
              setErrorMessage(`Lütfen ${formattedMinDate} tarihinden sonra bir tarih seçin.`);
            } else {
              setDate(parsedDate);
              setErrorMessage(null);
            }
          } else {
            setErrorMessage("Geçersiz tarih.");
          }
        } catch (error) {
          setErrorMessage("Lütfen geçerli bir tarih girin.");
        }
      }
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setShowCalendar(true);
    }
  };

  // Handle calendar date selection
  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setErrorMessage(null);
      setShowCalendar(false);
    }
  };

  // Handle calendar button click
  const handleCalendarButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setShowCalendar(!showCalendar);
      // When opening, also focus the input
      if (!showCalendar) {
        inputRef.current?.focus();
      }
    }
  };
  
  // Quick date buttons
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  // Format the current selected date nicely for display (if needed)
  const formattedDate = date ? (
    <div className="text-sm text-gray-600 mt-1 hidden">
      {date.getDate()} {TURKISH_MONTHS[date.getMonth()]} {date.getFullYear()}
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div className="relative">
        <div className="relative flex items-center">
          {/* Text input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm",
              "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
              disabled && "bg-gray-100 cursor-not-allowed",
              errorMessage && "border-red-500",
              "text-center font-medium text-gray-700"
            )}
            style={{ width: fullWidth ? '100%' : '140px' }}
          />
          
          {/* Calendar button */}
          <button
            type="button"
            onClick={handleCalendarButtonClick}
            className={cn(
              "absolute right-2 flex items-center justify-center w-8 h-8 rounded-md",
              "text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors",
              "focus:outline-none",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
            aria-label="Takvimi aç"
          >
            <CalendarIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Error message */}
        {errorMessage && (
          <div className="text-xs text-red-500 mt-1">
            {errorMessage}
          </div>
        )}
        
        {/* Calendar dropdown */}
        {showCalendar && (
          <div 
            ref={calendarRef}
            className={cn(
              "absolute z-20 mt-1 bg-white shadow-xl rounded-md border border-gray-200",
              "transform transition-opacity duration-200"
            )}
            style={{ 
              width: "320px",
              left: fullWidth ? "50%" : "0",
              transform: fullWidth ? "translateX(-50%)" : "none"
            }}
          >
            <div className="p-2 border-b border-gray-200 flex space-x-2 bg-gray-50 rounded-t-md">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs py-1 px-2 bg-white hover:bg-blue-50 hover:text-blue-600 transition-colors"
                onClick={() => {
                  setDate(today);
                  setShowCalendar(false);
                }}
              >
                Bugün
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs py-1 px-2 bg-white hover:bg-blue-50 hover:text-blue-600 transition-colors"
                onClick={() => {
                  setDate(tomorrow);
                  setShowCalendar(false);
                }}
              >
                Yarın
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs whitespace-nowrap py-1 px-2 bg-white hover:bg-blue-50 hover:text-blue-600 transition-colors"
                onClick={() => {
                  setDate(dayAfterTomorrow);
                  setShowCalendar(false);
                }}
              >
                Yarından Sonra
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleCalendarSelect}
              disabled={(date) => minDate ? date < minDate : false}
              locale={tr}
              className="p-2"
            />
          </div>
        )}
        
        {/* Formatted date display (if needed) */}
        {formattedDate}
      </div>
    </div>
  );
}
