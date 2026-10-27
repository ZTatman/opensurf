import { Label, ListBox, Select } from "@heroui/react";

export type Option = { id: string; label: string };

type OptionSelectProps = {
  label: string;
  // Hidden labels are still announced; the selected value shows in the trigger.
  hideLabel?: boolean;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  className?: string;
  triggerClassName?: string;
};

export default function OptionSelect({
  label,
  hideLabel,
  value,
  options,
  onChange,
  className,
  triggerClassName,
}: OptionSelectProps) {
  return (
    <Select
      className={className}
      value={value}
      aria-label={hideLabel ? label : undefined}
      onChange={(next) => {
        if (next !== null && options.some((option) => option.id === String(next)))
          onChange(String(next));
      }}
    >
      {hideLabel ? null : <Label>{label}</Label>}
      <Select.Trigger className={triggerClassName}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
