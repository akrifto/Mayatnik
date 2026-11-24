// src/types/index.ts

/**
 * Контракты данных и коллбэков между движком
 */

export type MirrorMode2D = {
  x: boolean;
  y: boolean;
};

export type MirrorMode3D = {
  x: boolean;
  y: boolean;
  z: boolean;
};

/** Параметры одного звена кинематической цепи */
export interface LinkConfig {
  length: number;
  speed2D: number;
  speed3D?: number;
  phase: number;
}

/** Общая конфигурация симуляции маятника */
export interface SimulationConfig {
  linkCount: number;
  links: LinkConfig[];
  is3D: boolean;
  speed: number;
  backgroundColor: string;
  mirror2D: MirrorMode2D;
  mirror3D: MirrorMode3D;
}

/** Контрольная точка карты кисти */
export interface MapControlPoint {
  position: number;
  value: number | string;
}

/** Настройки отдельной карты кисти */
export interface BrushMapParams {
  points: MapControlPoint[];
  density: number;
  flow: number;
}

/** Общая конфигурация кисти и пост-обработки */
export interface BrushFXConfig {
  gradientMap: BrushMapParams;
  opacityMap: BrushMapParams;
  widthMap: BrushMapParams;
  exposure: number;
  glowIntensity: number;
  lineLengthMax: number;
}

/** Точка траектории / сустава для рендера */
export interface JointData {
  x: number;
  y: number;
  z?: number;
  distance?: number;
}

/** Результат расчёта кинематики за кадр */
export interface PendulumResult {
  joints: JointData[];
  tip: { x: number; y: number; z?: number };
}

/** Коллбэки, которыми React-интерфейс управляет внешним движком */
export interface EngineCallbacks {
  onPlayToggle: (isPlaying: boolean) => void;
  onClear: () => void;
  onReset: () => void;
  onModeToggle: (is3D: boolean) => void;
  onBgColorChange: (color: string) => void;
  onConfigChange: () => void;
}
