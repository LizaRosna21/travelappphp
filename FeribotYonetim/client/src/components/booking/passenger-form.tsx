import { useState } from "react";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { PassengerType } from "@shared/schema";
import { format, addYears } from "date-fns";
import { countries, sortedCountries } from "@/lib/countries";

interface PassengerFormProps {
  passenger: any;
  index: number;
  passengerTypes: PassengerType[];
  onChange: (updatedPassenger: any) => void;
}

const PassengerForm = ({ passenger, index, passengerTypes, onChange }: PassengerFormProps) => {
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    passenger.birthDate ? new Date(passenger.birthDate) : undefined
  );
  
  const [passportExpiry, setPassportExpiry] = useState<Date | undefined>(
    passenger.passportExpiry ? new Date(passenger.passportExpiry) : undefined
  );

  const [nationality, setNationality] = useState<string>(passenger.nationality || "TR");

  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...passenger,
      [field]: value
    });
  };

  const handlePassengerTypeChange = (typeId: string) => {
    onChange({
      ...passenger,
      passengerTypeId: parseInt(typeId)
    });
  };

  const handleBirthDateChange = (date: Date | undefined) => {
    setBirthDate(date);
    onChange({
      ...passenger,
      birthDate: date?.toISOString().split('T')[0]
    });
  };
  
  const handlePassportExpiryChange = (date: Date | undefined) => {
    setPassportExpiry(date);
    onChange({
      ...passenger,
      passportExpiry: date?.toISOString().split('T')[0]
    });
  };
  
  const handleNationalityChange = (value: string) => {
    setNationality(value);
    onChange({
      ...passenger,
      nationality: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`firstName-${index}`}>Ad*</Label>
          <Input
            id={`firstName-${index}`}
            value={passenger.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Adınızı girin"
            required
          />
        </div>
        <div>
          <Label htmlFor={`lastName-${index}`}>Soyad*</Label>
          <Input
            id={`lastName-${index}`}
            value={passenger.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Soyadınızı girin"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`passengerType-${index}`}>Yolcu Tipi</Label>
          <Select
            value={passenger.passengerTypeId.toString()}
            onValueChange={handlePassengerTypeChange}
          >
            <SelectTrigger id={`passengerType-${index}`}>
              <SelectValue placeholder="Yolcu tipini seçin" />
            </SelectTrigger>
            <SelectContent>
              {passengerTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name} {type.description ? `- ${type.description}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`birthDate-${index}`}>Doğum Tarihi</Label>
          <DatePicker
            date={birthDate}
            setDate={handleBirthDateChange}
            placeholder="Doğum tarihi seçin"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`documentNumber-${index}`}>Kimlik/Pasaport No*</Label>
          <Input
            id={`documentNumber-${index}`}
            value={passenger.documentNumber || ''}
            onChange={(e) => handleInputChange('documentNumber', e.target.value)}
            placeholder="TC Kimlik veya Pasaport numarası"
            required={passenger.passengerType === "Adult"}
          />
        </div>
        <div>
          <Label htmlFor={`nationality-${index}`}>Uyruk*</Label>
          <Select
            value={nationality}
            onValueChange={handleNationalityChange}
          >
            <SelectTrigger id={`nationality-${index}`} className="font-normal">
              <SelectValue placeholder="Uyruk seçin">
                {nationality && (
                  <div className="flex items-center">
                    <span className="mr-2 text-base">{countries.find(c => c.code === nationality)?.flag}</span>
                    <span>{countries.find(c => c.code === nationality)?.name || nationality}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              {sortedCountries.map((country) => (
                <SelectItem key={country.code} value={country.code} className="font-normal">
                  <div className="flex items-center">
                    <span className="mr-2 text-base">{country.flag}</span>
                    <span>{country.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{country.code}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`contact-${index}`}>İletişim Telefonu</Label>
          <PhoneInput
            id={`contact-${index}`}
            value={passenger.contact || ''}
            onChange={(value) => handleInputChange('contact', value)}
            placeholder="İletişim telefonu"
            defaultCountry={nationality}
          />
        </div>
        <div>
          <Label htmlFor={`passportExpiry-${index}`}>Pasaport Geçerlilik Tarihi</Label>
          <DatePicker
            date={passportExpiry}
            setDate={handlePassportExpiryChange}
            placeholder="Pasaport geçerlilik tarihi seçin"
            minDate={new Date()}
          />
          <div className="text-xs text-neutral-500 mt-1">
            Uluslararası seferlerde pasaportunuzun en az 6 ay geçerli olması gerekmektedir.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerForm;
