import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export function Switch({ checked = false, onChange, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative h-6 w-10 rounded-pill transition-colors',
        checked ? 'bg-action' : 'bg-line-strong',
        className
      )}
    >
      <span
        className="absolute top-[3px] h-[18px] w-[18px] rounded-pill bg-white transition-[left] duration-150"
        style={{ left: checked ? 19 : 3 }}
      />
    </button>
  );
}
