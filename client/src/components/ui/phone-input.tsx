import * as React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const countryCodes = [
  { id: "tr", code: "TR", dial: "+90", flag: "🇹🇷", name: "Türkiye" },
  { id: "us", code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { id: "gb", code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { id: "de", code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany" },
  { id: "fr", code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { id: "it", code: "IT", dial: "+39", flag: "🇮🇹", name: "Italy" },
  { id: "gr", code: "GR", dial: "+30", flag: "🇬🇷", name: "Greece" },
  { id: "es", code: "ES", dial: "+34", flag: "🇪🇸", name: "Spain" },
  { id: "nl", code: "NL", dial: "+31", flag: "🇳🇱", name: "Netherlands" },
  { id: "be", code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgium" },
  { id: "ch", code: "CH", dial: "+41", flag: "🇨🇭", name: "Switzerland" },
  { id: "at", code: "AT", dial: "+43", flag: "🇦🇹", name: "Austria" },
  { id: "ru", code: "RU", dial: "+7", flag: "🇷🇺", name: "Russia" },
  { id: "ua", code: "UA", dial: "+380", flag: "🇺🇦", name: "Ukraine" },
  { id: "by", code: "BY", dial: "+375", flag: "🇧🇾", name: "Belarus" },
];

export interface PhoneInputProps extends Omit<InputProps, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  className?: string;
  inputClassName?: string;
  selectClassName?: string;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "TR",
  className,
  inputClassName,
  selectClassName,
  ...props
}: PhoneInputProps) {
  // Telefon numarasını ve ülke kodunu ayır
  const [selectedCountry, setSelectedCountry] = React.useState(
    countryCodes.find(c => c.code === defaultCountry) || countryCodes[0]
  );
  
  const [phoneNumber, setPhoneNumber] = React.useState(() => {
    // Eğer value değeri varsa ve bir ülke kodu ile başlıyorsa, onu ayır
    for (const country of countryCodes) {
      if (value?.startsWith(country.dial)) {
        setSelectedCountry(country);
        return value.slice(country.dial.length).trim();
      }
    }
    return value || "";
  });

  // Telefon numarasını formatla
  const formatPhoneNumber = (input: string) => {
    // Sadece rakamları al
    const digitsOnly = input.replace(/\D/g, "");
    return digitsOnly;
  };

  // Telefon numarası değiştiğinde
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formattedNumber = formatPhoneNumber(input);
    setPhoneNumber(formattedNumber);
    onChange(`${selectedCountry.dial} ${formattedNumber}`);
  };

  // Ülke kodu değiştiğinde
  const handleCountryChange = (countryCode: string) => {
    const country = countryCodes.find(c => c.code === countryCode) || countryCodes[0];
    setSelectedCountry(country);
    onChange(`${country.dial} ${phoneNumber}`);
  };

  return (
    <div className={cn("flex", className)}>
      <Select
        value={selectedCountry.code}
        onValueChange={handleCountryChange}
      >
        <SelectTrigger className={cn("w-[110px] border-r-0 rounded-r-none", selectClassName)}>
          <SelectValue>
            <span className="flex items-center">
              <span className="mr-1">{selectedCountry.flag}</span>
              <span>{selectedCountry.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {countryCodes.map((country) => (
            <SelectItem key={country.id} value={country.code}>
              <span className="flex items-center">
                <span className="mr-2">{country.flag}</span>
                <span>{country.dial}</span>
                <span className="ml-2 text-xs text-muted-foreground">{country.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        className={cn("flex-1 rounded-l-none", inputClassName)}
        placeholder="(5XX) XXX XX XX"
        {...props}
      />
    </div>
  );
}