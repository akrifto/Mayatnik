// src/App.tsx

import { PendulumHUD } from './ui/components/PendulumHUD';
import type { BrushFXConfig, EngineCallbacks, SimulationConfig } from './types';

export interface AppProps {
  simConfig: SimulationConfig;
  brushConfig: BrushFXConfig;
  callbacks: EngineCallbacks;
}

/**
 * Корневой React-компонент интерфейса.
 * Монтируется в отдельный контейнер #ui-root поверх WebGL-сцены и отвечает только за HUD.
 * Сам контейнер прозрачен для событий мыши (pointer-events-none), чтобы OrbitControls сцены работал свободно.
 */
export default function App({ simConfig, brushConfig, callbacks }: AppProps) {
  return (
    <PendulumHUD
      simConfig={simConfig}
      brushConfig={brushConfig}
      callbacks={callbacks}
    />
  );
}
