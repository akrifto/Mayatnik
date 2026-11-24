// src/ui/components/RangeField.tsx

import React, { useEffect, useState } from 'react';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  /** Показывать ли редактируемое числовое поле справа (иначе — компактный вывод значения) */
  editableNumber?: boolean;
  /** Число знаков после запятой для форматирования */
  precision?: number;
  onChange: (value: number) => void;
}

/**
 * Универсальный числовой ползунок с визуальным треком.
 * Поддерживает двустороннее заполнение от нуля, если диапазон включает отрицательные числа (min < 0 < max).
 */
export const RangeField: React.FC<RangeFieldProps> = ({
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  editableNumber = true,
  precision,
  onChange,
}) => {
  // Автоматически вычисляем точность отображения из step, если не задана явно
  const decimals =
    precision ?? (step.toString().includes('.') ? step.toString().split('.')[1].length : 0);

  const formatNum = (num: number): string => {
    const safe = Number.isFinite(num) ? num : min;
    return decimals > 0 ? Number(safe.toFixed(decimals)).toString() : Math.round(safe).toString();
  };

  // Локальная строка инпута нужна, чтобы пользователь мог свободно вводить '-' или дробную часть
  const [draft, setDraft] = useState<string>(() => formatNum(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatNum(value));
    }
  }, [value, isFocused, decimals]);

  const clampValue = (num: number): number => Math.max(min, Math.min(max, num));

  // Расчёт геометрии активной полосы (от 0 или от левого края)
  const range = max - min;
  const clampedForBar = clampValue(value);
  const percentage = range > 0 ? ((clampedForBar - min) / range) * 100 : 0;

  let fillLeft = 0;
  let fillWidth = percentage;

  if (min < 0 && max > 0 && range > 0) {
    const zeroPercentage = ((0 - min) / range) * 100;
    fillLeft = Math.min(percentage, zeroPercentage);
    fillWidth = Math.abs(percentage - zeroPercentage);
  }

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    if (!Number.isNaN(next)) {
      setDraft(formatNum(next));
      onChange(next);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);

    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(clampValue(parsed));
    }
  };

  const handleNumberBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(draft);
    const committed = Number.isNaN(parsed) ? clampValue(value) : clampValue(parsed);
    setDraft(formatNum(committed));
    if (committed !== value) {
      onChange(committed);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-300 truncate">{label}</span>

        {editableNumber ? (
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            value={draft}
            onFocus={() => setIsFocused(true)}
            onBlur={handleNumberBlur}
            onChange={handleNumberChange}
            className="w-14 shrink-0 rounded-md border border-white/15 bg-black/50 px-1.5 py-0.5 text-center font-mono text-[11px] font-medium text-white tabular-nums outline-none transition-colors focus:border-white/45 focus:bg-black/75"
          />
        ) : (
          <span className="font-mono text-[11px] text-zinc-400 tabular-nums shrink-0">
            {formatNum(value)}
          </span>
        )}
      </div>

      <div className="relative flex h-4 w-full items-center">
        {/* Фоновый трек */}
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-white/10" />
        {/* Активная полоса заполнения */}
        <div
          className="pointer-events-none absolute h-[3px] rounded-full bg-white"
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={clampedForBar}
          onChange={handleRangeChange}
          className="mayatnik-range relative z-10 m-0 h-full w-full"
        />
      </div>
    </div>
  );
};
