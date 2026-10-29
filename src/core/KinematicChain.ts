// src/core/KinematicChain.ts

/**
 * МАТЕМАТИЧЕСКИЙ АДСКИЙ ЗАМЕС 
 * Мы с неиронкой это переписывали 3 РАЗА!
 */

import type { SimulationConfig, PendulumResult, JointData } from '../types';

/**
 * Кинематическая цепь маятника
 * Считает углы (скалярно) и переводит их в координаты 3D-пространства
 */
export class KinematicChain {
    // Углы для каждой из 5 звеньев (делать больше, по моему нет смысла)
    private angles2D: number[] = [0, 0, 0, 0, 0];
    private angles3D: number[] = [0, 0, 0, 0, 0];

    // Для фиксированного шага
    private accumulator: number = 0;
    private readonly FIXED_TIMESTEP: number = 1 / 60;

    /**
    * Обновляет состояние цепи с фиксированным шагом времени
    * Если убрать, то ничего не не случится, просто на 144 или 240 гц скорость будет огромной 
    * @param config Настройки симуляции (скорости, звенья).
    * @param rawDelta Реальное время с прошлого кадра.
    * @returns Координаты цмллиндра и кончика для рендера
    */
    public update(config: SimulationConfig, rawDelta: number): PendulumResult {
        const clampedDelta = Math.min(rawDelta, 0.1);
        this.accumulator += clampedDelta;
        
        while (this.accumulator >= this.FIXED_TIMESTEP) {
            this.stepPhysics(config, this.FIXED_TIMESTEP);
            this.accumulator -= this.FIXED_TIMESTEP;
        }

        return this.computeCurrentState(config);
    }
    
    /**
    * Считает шаг физики и углы на основе скоростей
    * если убрать, ничего не будет (всмысле оно не будет двигаться)
    * @param config Настройки симуляции.
    * @param dt Фиксированный шаг
    */
    private stepPhysics(config: SimulationConfig, dt: number): void {
        const linkCount = Math.min(Math.max(config.linkCount, 1), 5);

        for (let i = 0; i < linkCount; i++) {
            const link = config.links[i];
            if (!link) break;

            const speed2D = link.speed2D ?? 1;
            const speed3D = link.speed3D ?? 0;
            
            this.angles2D[i] += speed2D * config.speed * dt;
            
            if (config.is3D) {
                this.angles3D[i] += speed3D * config.speed * dt;
            }
        }
    }
    
    /**
    * Переводит накопленные углы в X, Y, Z координаты.
    * Использует наследование углов и сферическую тригонометрию.
    * 
    * ?Обьяснение написала неиронка, я не шарю 
    * 
    * @param config Настройки симуляции.
    * @returns Массив точек (joints) и кончик (tip).
    */
    private computeCurrentState(config: SimulationConfig): PendulumResult {
        const joints: JointData[] = [{ x: 0, y: 0, z: 0 }];
        
        let currentX = 0;
        let currentY = 0;
        let currentZ = 0;

        const linkCount = Math.min(Math.max(config.linkCount, 1), 5);

        // Накопительные переменные для иерархического суммирования углов по всей цепи
        let cumulativeAngle2D = 0;
        let cumulativeAngle3D = 0;

        for (let i = 0; i < linkCount; i++) {
            const link = config.links[i];
            if (!link) break;

            // Наследуем вращение от предыдущих звеньев
            cumulativeAngle2D += this.angles2D[i];
            const totalAngle2D = cumulativeAngle2D + link.phase;

            const length = link.length;

            if (config.is3D) {
                cumulativeAngle3D += this.angles3D[i];
                const totalAngle3D = cumulativeAngle3D;

                // Чистый скалярный расчет для 3D сферы (каждое звено добавляет свой вклад в координаты)
                const dx = Math.sin(totalAngle2D) * Math.cos(totalAngle3D) * length;
                const dy = Math.cos(totalAngle2D) * length;
                const dz = Math.sin(totalAngle2D) * Math.sin(totalAngle3D) * length;

                currentX += dx;
                currentY += dy;
                currentZ += dz;
            } else {
                // Скалярный 2D расчет 
                const dx = Math.sin(totalAngle2D) * length;
                const dy = Math.cos(totalAngle2D) * length;

                currentX += dx;
                currentY += dy;
                currentZ = 0;
            }

            joints.push({
                x: currentX,
                y: currentY,
                z: config.is3D ? currentZ : 0
            });
        }

        const tip = {
            x: currentX,
            y: currentY,
            z: config.is3D ? currentZ : 0
        };

        return { joints, tip };
    }
}