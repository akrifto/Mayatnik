// src/brush/GradientMap.ts

/**
 * ФШ на минималках
 * Вычисляет карту градиентов
 */

import type { BrushMapParams } from '../types';

export class GradientMap {
    /**
     * Вычисляет цвет в заданной точке траектории с учетом контрольных точек, Density и Flow.
     * @param normalizedDist Позиция от 0 до 1 вдоль линии.
     * @param params Параметры карты (точки, плотность, поток).
     * @param time Время для анимации смещения (Flow).
     * @returns Строка цвета в формате 'rgb(r, g, b)'.
    */
    public static getColorAt(
        normalizedDist: number, // позиция от 0 до 1 вдоль линии
        params: BrushMapParams,
        time: number            // время для анимации смещения (Flow)
    ): string {
        const points = params.points;
        if (!points || points.length === 0) return '#00f3ff';

        const sorted = [...points].sort((a, b) => a.position - b.position);

        if (sorted.length === 1) {
            return sorted[0].value as string;
        }

        // Симметричный расчет смещения времени для плавной анимации потока в обе стороны
        const timeOffset = time * params.flow * 0.05;
        const rawPos = normalizedDist * params.density + timeOffset;
        const pos = ((rawPos % 1) + 1) % 1; // зацикливаем в диапазоне [0, 1]

        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        // Фиксация краев (clamp): всё до первой точки имеет ее цвет, всё после последней — ее цвет
        if (pos <= first.position) {
            return first.value as string;
        }
        if (pos >= last.position) {
            return last.value as string;
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

        return this.interpolateColor(left.value as string, right.value as string, factor);
    }

    /**
     * Интерполирует цвет между двумя значениями.
     * @param color1 Левый цвет (от которого начинаем).
     * @param color2 Правый цвет (к которому идем).
     * @param factor Коэффициент от 0 до 1 (0 = color1, 1 = color2).
     * @returns Строка цвета в формате 'rgb(r, g, b)'.
     */
    private static interpolateColor(color1: string, color2: string, factor: number): string {
        const c1 = this.parseHex(color1);
        const c2 = this.parseHex(color2);

        const r = Math.round(c1.r + factor * (c2.r - c1.r));
        const g = Math.round(c1.g + factor * (c2.g - c1.g));
        const b = Math.round(c1.b + factor * (c2.b - c1.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Парсит HEX-строку в объект с каналами RGB.
     * Поддерживает короткую запись (#f00) и полную (#ff0000).
     * @param hex Строка цвета.
     * @returns Объект с компонентами r, g, b (от 0 до 255).
     */
    private static parseHex(hex: string) {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        const num = parseInt(cleanHex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }
}