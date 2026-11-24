// src\core\Mirror3D.ts

/**
 * Считатель и создаватель отражений
 */

// Импорты 
import type { MirrorMode2D, MirrorMode3D, PendulumResult } from '../types';

/**
 * Модуль для создания зеркальных отражений маятника (как в калейдоскопе).
 * Позволяет дублировать движение по осям X, Y и Z, создавая симметричные узоры.
 * *На данном этапе самы сомнительный блок, но посмотрим по тому что получится
 */
export class Mirror3D {
    /**
     * Дегенератор массива результатов с учетом включенных зеркал
     * @param baseResult Исходный результат (координаты оригинального маятника
     * @param mirror2D Настройки зеркал для 2D-режима (оси X, Y)
     * @param mirror3D Настройки зеркал для 3D-режима (оси X, Y, Z)
     * @param is3D Флаг 3D
     * @returns Массив результатов: первый — оригинал, остальные — отражения
     */
    public static getMirroredResults(
        baseResult: PendulumResult,
        mirror2D: MirrorMode2D,
        mirror3D: MirrorMode3D,
        is3D: boolean
    ): PendulumResult[] {

        const results: PendulumResult[] = [];
        const scales: [number, number, number][] = [[1, 1, 1]];

        // проверка на включенный 3D
        if (is3D) {
            const useX = mirror3D.x;
            const useY = mirror3D.y;
            const useZ = mirror3D.z;

            // Просчитываются все возможные комбинации
            if (useX) scales.push([-1, 1, 1]);
            if (useY) scales.push([1, -1, 1]);
            if (useZ) scales.push([1, 1, -1]);
            if (useX && useY) scales.push([-1, -1, 1]);
            if (useX && useZ) scales.push([-1, 1, -1]);
            if (useY && useZ) scales.push([1, -1, -1]);
            if (useX && useY && useZ) scales.push([-1, -1, -1]);
        } else { // Тут комбинации в 2D 
            const useX = mirror2D.x;
            const useY = mirror2D.y;

            if (useX) scales.push([-1, 1, 0]);
            if (useY) scales.push([1, -1, 0]);
            if (useX && useY) scales.push([-1, -1, 0]);
        }

        // А тут шиза... Но тут мы применяем масштаб к кажной точке 
        for (const [sx, sy, sz] of scales) {
            const joints = baseResult.joints.map(j => ({
                x: j.x * sx,
                y: j.y * sy,
                z: is3D ? (j.z ?? 0) * sz : 0
            }));

            const tip = {
                x: baseResult.tip.x * sx,
                y: baseResult.tip.y * sy,
                z: is3D ? (baseResult.tip.z ?? 0) * sz : 0
            };

            results.push({ joints, tip });
        }

        return results;
    }
}
