import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PassengerCounter } from "@/components/ui/passenger-counter";
import { UserIcon } from "lucide-react";

export interface PassengerCounts {
  adult: number;
  child: number;
  infant: number;
}

interface PassengerSelectorProps {
  value: PassengerCounts;
  onChange: (value: PassengerCounts) => void;
  className?: string;
}

export function PassengerSelector({
  value,
  onChange,
  className = ""
}: PassengerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [counts, setCounts] = useState<PassengerCounts>(value);
  
  // Sync with external value
  useEffect(() => {
    setCounts(value);
  }, [value]);
  
  const handleChange = (type: keyof PassengerCounts, count: number) => {
    const newCounts = { ...counts, [type]: count };
    setCounts(newCounts);
  };
  
  const handleApply = () => {
    onChange(counts);
    setIsOpen(false);
  };
  
  const totalPassengers = counts.adult + counts.child + counts.infant;
  const displayText = totalPassengers === 1 
    ? '1 Yolcu' 
    : `${totalPassengers} Yolcu`;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`justify-start text-left font-normal ${className}`}
        >
          <UserIcon className="mr-2 h-4 w-4" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <h4 className="font-medium">Yolcu Sayısı</h4>
          
          <div className="space-y-2">
            <PassengerCounter
              type="adult"
              count={counts.adult}
              label="Yetişkin"
              description="12+ yaş"
              minCount={1}
              maxCount={9}
              onChange={(count) => handleChange("adult", count)}
            />
            
            <PassengerCounter
              type="child"
              count={counts.child}
              label="Çocuk"
              description="2-11 yaş"
              minCount={0}
              maxCount={8}
              onChange={(count) => handleChange("child", count)}
            />
            
            <PassengerCounter
              type="infant"
              count={counts.infant}
              label="Bebek"
              description="0-2 yaş"
              minCount={0}
              maxCount={4}
              onChange={(count) => handleChange("infant", count)}
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={handleApply}>
              Uygula
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}