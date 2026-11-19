// src/brush/TrailBuffer.ts

import type { JointData } from '../types';

export class TrailBuffer {
    private history: JointData[] = [];
    private maxLength: number;
    private totalAccumulatedDistance: number = 0; // Накопитель абсолютного пути

    constructor(maxLength: number = 1500) {
        this.maxLength = maxLength;
    }

    /**
     * Добавляет новые точки (с учетом зеркал) в буфер траектории
     */
    public addPoints(points: JointData[]): void {
        for (const point of points) {
            const newPoint: JointData = { ...point };

            if (this.history.length > 0) {
                const lastPoint = this.history[this.history.length - 1];
                const dx = newPoint.x - lastPoint.x;
                const dy = newPoint.y - lastPoint.y;
                const dz = (newPoint.z ?? 0) - (lastPoint.z ?? 0);
                const stepDist = Math.hypot(dx, dy, dz);
                this.totalAccumulatedDistance += stepDist;
            }

            // Точка навсегда фиксирует свою абсолютную позицию на ленте шлейфа
            newPoint.distance = this.totalAccumulatedDistance;
            this.history.push(newPoint);
        }

        // Плавное ограничение максимальной длины хвоста (скользящее окно)
        if (this.maxLength > 0 && this.history.length > this.maxLength) {
            this.history.splice(0, this.history.length - this.maxLength);
        }
    }

    /**
     * Полная очистка хвоста (для кнопки Clear)
     */
    public clear(): void {
        this.history = [];
        this.totalAccumulatedDistance = 0;
    }

    /**
     * Возвращает текущий массив точек для рендерера
     */
    public getHistory(): JointData[] {
        return this.history;
    }

    public setMaxLength(length: number): void {
        this.maxLength = length;
    }
}