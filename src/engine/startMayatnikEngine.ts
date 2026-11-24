// src/engine/startMayatnikEngine.ts

/**
 * Чистый TypeScript-движок Mayatnik (перенесён из src/main.ts пользователя).
 * Управляет физикой, зеркалированием, буферами шлейфа, Three.js-сценой и циклом анимации
 * полностью независимо от React.
 */

import { KinematicChain } from '../core/KinematicChain';
import { Mirror3D } from '../core/Mirror3D';
import { TrailBuffer } from '../Brush/TrailBuffer';
import { Visualizer } from '../visualizer/Visualizer';
import type { BrushFXConfig, EngineCallbacks, SimulationConfig } from '../types';

export interface MayatnikEngineHandle {
  simConfig: SimulationConfig;
  brushConfig: BrushFXConfig;
  callbacks: EngineCallbacks;
  destroy: () => void;
}

/**
 * Запускает чистый TS-движок внутри переданного DOM-контейнера сцены
 * и возвращает ссылки на конфиги и коллбэки для внешнего UI.
 */
export function startMayatnikEngine(sceneContainer: HTMLElement): MayatnikEngineHandle {
  // Настройки симуляции по умолчанию (из оригинального main.ts)
  const simConfig: SimulationConfig = {
    linkCount: 3,
    links: [
      { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: 0 },
      { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: Math.PI / 4 },
      { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: Math.PI / 2 },
    ],
    is3D: false,
    speed: 1.0,
    backgroundColor: '#000000',
    mirror2D: { x: false, y: false },
    mirror3D: { x: false, y: false, z: false },
  };

  // Дефолтные настройки кисти (из оригинального main.ts)
  const brushConfig: BrushFXConfig = {
    gradientMap: {
      points: [{ position: 0.0, value: '#515151' }],
      density: 1.0,
      flow: 0.0,
    },
    opacityMap: {
      points: [{ position: 0, value: 0.0 }],
      density: 1.0,
      flow: 0.0,
    },
    widthMap: {
      points: [{ position: 0, value: 2.0 }],
      density: 1.0,
      flow: 0.0,
    },
    exposure: 1.0,
    glowIntensity: 1.5,
    lineLengthMax: 1500,
  };

  // Инициализация системных модулей движка
  const kinematicChain = new KinematicChain();
  const visualizer = new Visualizer(sceneContainer);

  // Пул буферов траекторий (до 8 независимых буферов для зеркал)
  const trailBuffers: TrailBuffer[] = Array.from(
    { length: 8 },
    () => new TrailBuffer(brushConfig.lineLengthMax)
  );

  let isRunning = true;
  let lastTime = performance.now();
  let simulationTime = 0;
  let rafId = 0;

  // Реальные коллбэки движка, которыми управляет внешний UI
  const callbacks: EngineCallbacks = {
    onPlayToggle: (playing) => {
      isRunning = playing;
    },
    onClear: () => {
      trailBuffers.forEach((buf) => buf.clear());
    },
    onReset: () => {
      trailBuffers.forEach((buf) => buf.clear());
      simConfig.linkCount = 3;
      simConfig.speed = 1.0;
      simConfig.links = [
        { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: 0 },
        { length: 2.0, speed2D: 1.5, speed3D: 0.0, phase: Math.PI / 4 },
        { length: 5.0, speed2D: 1.0, speed3D: 0.0, phase: Math.PI / 2 },
      ];
    },
    onModeToggle: (is3D) => {
      simConfig.is3D = is3D;
    },
    onBgColorChange: (color) => {
      simConfig.backgroundColor = color;
    },
    onConfigChange: () => {
      trailBuffers.forEach((buf) => buf.setMaxLength(brushConfig.lineLengthMax));
    },
  };

  // Главный цикл анимации движка
  function animate(currentTime: number) {
    rafId = requestAnimationFrame(animate);

    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    const scaledDelta = delta * simConfig.speed;

    if (isRunning) {
      simulationTime += scaledDelta;

      const pendulumResult = kinematicChain.update(simConfig, scaledDelta);

      const allPendulumResults = Mirror3D.getMirroredResults(
        pendulumResult,
        simConfig.mirror2D,
        simConfig.mirror3D,
        simConfig.is3D
      );

      allPendulumResults.forEach((res, idx) => {
        if (trailBuffers[idx]) {
          trailBuffers[idx].addPoints([res.tip]);
        }
      });

      const activeTrails = allPendulumResults.map(
        (_, idx) => trailBuffers[idx]?.getHistory() || []
      );

      visualizer.render(
        allPendulumResults,
        activeTrails,
        simConfig,
        brushConfig,
        simulationTime
      );
    } else {
      // На паузе время кисти замирает вместе с симуляцией
      visualizer.render(
        [],
        trailBuffers.map((b) => b.getHistory()),
        simConfig,
        brushConfig,
        simulationTime
      );
    }
  }

  rafId = requestAnimationFrame(animate);

  return {
    simConfig,
    brushConfig,
    callbacks,
    destroy: () => {
      cancelAnimationFrame(rafId);
    },
  };
}
