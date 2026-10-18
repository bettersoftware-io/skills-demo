import type { ChangeEvent, ReactElement } from "react";

/**
 * A native select whose chosen option is drawn over it as ordinary text.
 * Chromium on Linux painted a select's own text one of two ways from one run
 * to the next (measured in condo-ledger, and named by the visual add-on),
 * while the same text in a plain element was the same every run. The select
 * stays underneath, painted as a plain box with its text transparent, so the
 * keyboard, the list of options and the accessible name are the native ones.
 */
export function Choice({
  label,
  value,
  options,
  invalid = false,
  onChoose,
}: ChoiceProps): ReactElement {
  function choose(event: ChangeEvent<HTMLSelectElement>): void {
    onChoose(event.target.value);
  }

  // The label of the chosen option; empty when the value is none of them.
  const shown = options
    .filter((option) => {
      return option.value === value;
    })
    .map((option) => {
      return option.label;
    })
    .join("");

  return (
    <label>
      {label}
      <span className="choice">
        <select
          className="choice-select"
          aria-invalid={invalid}
          value={value}
          onChange={choose}
        >
          {options.map((option) => {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
        <span className="choice-shown" aria-hidden="true">
          {shown}
        </span>
      </span>
    </label>
  );
}

interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoiceProps {
  /** The text of the label the select sits in, which is also its accessible name. */
  label: string;
  value: string;
  /** Every option, in order. The first is usually the one that means none. */
  options: ChoiceOption[];
  /** Whether the last refusal points at this field. */
  invalid?: boolean;
  onChoose: (value: string) => void;
}
