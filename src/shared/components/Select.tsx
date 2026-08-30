import { ChevronDown } from "lucide-react";

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="select-field">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, label]) => (
          <option value={optionValue} key={optionValue}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} />
    </label>
  );
}
