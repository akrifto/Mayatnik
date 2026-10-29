// src/types/index.ts

/**
 * Просто набор типов
 * Возможно, можно было и добавить больше, но как есть
 */

// Зеркала
export type MirrorMode2D = {
    x: boolean;
    y: boolean;
};
export type MirrorMode3D = {
    x: boolean;
    y: boolean;
    z: boolean;
};

// Конфигурация одного звена маятника
export interface LinkConfig {
    length: number;       // Длина
    speed2D: number;      // Скорость вращения по вертикали
    speed3D?: number;     // Скорость вращения по горизонтали
    phase: number;        // Вроде и не нужен, но тогда оно будет крутится синхронно
}

// Общая конфигурация симуляции и маятника
export interface SimulationConfig {
    linkCount: number;          // Количество звеньев 
    links: LinkConfig[];        // Массив параметров звеньев
    is3D: boolean;              // Режим 2D или 3D
    speed: number;              // Общая скорость симуляции
    backgroundColor: string;    // Цвет фона (потом сделаю чтоб можно было его менять)
    mirror2D: MirrorMode2D;     // 2D зеркалирование
    mirror3D: MirrorMode3D;     // 3D зеркалирование
} // Судя по текущему результату, начинаю задумываться "а надо ли вообще это зеркалирование?"

// Контрольная точка для карт (градиент, прозрачность, толщина)
export interface MapControlPoint {
    position: number;   // Позиция на шкале (от 0 до 1)
    value: number | string; // Значение (цвет для градиента, а для прозрачности и толщины число)
}
// Параметры для каждой из трех карт кисти (Градиент, Прозрачность, Толщина)
export interface BrushMapParams {
    points: MapControlPoint[]; // Массив контрольных точек
    density: number;           // Частота или масштаб (тут я хз как правильно назвать)
    flow: number;              // Скорость 
}


// Общие настройки кисти и "красивостей"
export interface BrushFXConfig {
    gradientMap: BrushMapParams;
    opacityMap: BrushMapParams;
    widthMap: BrushMapParams;
    exposure: number;          // HDR / Экспозиция
    glowIntensity: number;     // Интенсивность неонового свечения (0 - макс)
    lineLengthMax: number;     // Максимальная длина линии (или бесконечность)
}

/**
 * Результат расчёта физики для рендерера
 * distance добавлен позже, потому что градиенты плыли
 */
export interface JointData {
    x: number;
    y: number;
    z?: number; 
    distance?: number; 
}

export interface PendulumResult {
    joints: JointData[];
    tip: { x: number; y: number; z?: number };
}