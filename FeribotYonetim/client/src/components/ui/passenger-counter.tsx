import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, MinusIcon, UserIcon } from "lucide-react";

interface PassengerCounterProps {
  type: "adult" | "child" | "infant";
  count: number;
  label: string;
  description?: string;
  minCount?: number;
  maxCount?: number;
  onChange: (count: number) => void;
}

export function PassengerCounter({
  type,
  count,
  label,
  description,
  minCount = 0,
  maxCount = 10,
  onChange
}: PassengerCounterProps) {
  
  const increment = () => {
    if (count < maxCount) {
      onChange(count + 1);
    }
  };
  
  const decrement = () => {
    if (count > minCount) {
      onChange(count - 1);
    }
  };
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg shadow-sm mb-2">
      <div className="flex items-center">
        <div className="p-2 bg-primary/10 rounded-full mr-3">
          <UserIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-medium">{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
      </div>
      
      <div className="flex items-center">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={decrement}
          disabled={count <= minCount}
          className="h-8 w-8"
        >
          <MinusIcon className="h-3 w-3" />
        </Button>
        <span className="mx-3 w-5 text-center font-medium">{count}</span>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={increment}
          disabled={count >= maxCount}
          className="h-8 w-8"
        >
          <PlusIcon className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}