// src/brush/OpacityMap.ts

import type { BrushMapParams } from '../types';

export class OpacityMap {
    /**
     * Вычисляет коэффициент прозрачности / яркости в заданной точке траектории
     */
    public static getOpacityAt(
        normalizedDist: number,
        params: BrushMapParams,
        time: number
    ): number {
        const points = params.points;
        if (!points || points.length === 0) return 1.0;

        const sorted = [...points].sort((a, b) => a.position - b.position);

        if (sorted.length === 1) {
            return Number(sorted[0].value);
        }

        // Синхронизированный с GradientMap расчет смещения времени и позиции
        const timeOffset = time * params.flow * 0.05;
        const rawPos = normalizedDist * params.density + timeOffset;
        const pos = ((rawPos % 1) + 1) % 1;

        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        // Жесткая фиксация краев (clamp), как в GradientMap, исключающая артефакты на концах
        if (pos <= first.position) {
            return Number(first.value);
        }
        if (pos >= last.position) {
            return Number(last.value);
        }

        let left = first;
        let right = last;
        let factor = 0;

        // Ищем интервал между соседними точками
        for (let i = 0; i < sorted.length - 1; i++) {
            if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
                left = sorted[i];
                right = sorted[i + 1];
                const range = right.position - left.position;
                factor = range === 0 ? 0 : (pos - left.position) / range;
                break;
            }
        }

        const val1 = Number(left.value);
        const val2 = Number(right.value);

        return val1 + factor * (val2 - val1);
    }
}