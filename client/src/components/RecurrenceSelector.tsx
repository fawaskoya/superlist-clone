import React, { useState } from 'react';
import { Calendar, Repeat, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { RRule } from 'rrule';

interface RecurrenceSelectorProps {
  value?: {
    isRecurring: boolean;
    recurrenceRule?: string;
    recurrenceEnd?: string;
  };
  onChange: (value: {
    isRecurring: boolean;
    recurrenceRule?: string;
    recurrenceEnd?: string;
  }) => void;
}

const recurrenceOptions = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' },
];

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const [frequency, setFrequency] = useState<string>('WEEKLY');
  const [endDate, setEndDate] = useState<string>('');

  const handleRecurringChange = (isRecurring: boolean) => {
    if (!isRecurring) {
      onChange({
        isRecurring: false,
        recurrenceRule: undefined,
        recurrenceEnd: undefined,
      });
    } else {
      // Generate RRULE string
      const rule = new RRule({
        freq: RRule[frequency as keyof typeof RRule],
        dtstart: new Date(),
        byweekday: frequency === 'WEEKLY' ? [RRule.MO] : undefined, // Default to Monday for weekly
      });

      onChange({
        isRecurring: true,
        recurrenceRule: rule.toString(),
        recurrenceEnd: endDate || undefined,
      });
    }
  };

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency);

    if (value?.isRecurring) {
      const rule = new RRule({
        freq: RRule[newFrequency as keyof typeof RRule],
        dtstart: new Date(),
        byweekday: newFrequency === 'WEEKLY' ? [RRule.MO] : undefined,
      });

      onChange({
        ...value,
        recurrenceRule: rule.toString(),
      });
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
    onChange({
      ...value,
      recurrenceEnd: newEndDate || undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="recurring"
          checked={value?.isRecurring || false}
          onChange={(e) => handleRecurringChange(e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="recurring" className="flex items-center gap-2">
          <Repeat className="w-4 h-4" />
          Recurring task
        </Label>
      </div>

      {value?.isRecurring && (
        <div className="space-y-3 pl-6 border-l-2 border-primary/20">
          <div>
            <Label htmlFor="frequency">Repeat every</Label>
            <Select value={frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="end-date">End date (optional)</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Preview: {getRecurrenceDescription(frequency, endDate)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getRecurrenceDescription(frequency: string, endDate: string): string {
  const frequencyText = recurrenceOptions.find(opt => opt.value === frequency)?.label.toLowerCase() || 'weekly';

  if (endDate) {
    return `Repeats ${frequencyText} until ${new Date(endDate).toLocaleDateString()}`;
  }

  return `Repeats ${frequencyText} indefinitely`;
}
