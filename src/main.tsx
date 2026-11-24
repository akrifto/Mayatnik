// src/main.tsx

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startMayatnikEngine } from './engine/startMayatnikEngine';

const sceneContainer = document.getElementById('scene-root');
const uiContainer = document.getElementById('ui-root');

if (!sceneContainer || !uiContainer) {
  throw new Error('Не найдены контейнеры #scene-root или #ui-root для запуска Mayatnik.');
}

// 1. Запускаем чистый TypeScript-движок в контейнере сцены
const engine = startMayatnikEngine(sceneContainer);

// 2. Монтируем React-UI в отдельный контейнер поверх сцены и передаём реальные конфиги и коллбэки движка
const uiRoot = createRoot(uiContainer);
uiRoot.render(
  <App
    simConfig={engine.simConfig}
    brushConfig={engine.brushConfig}
    callbacks={engine.callbacks}
  />
);

// Освобождаем ресурсы при HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    engine.destroy();
    uiRoot.unmount();
  });
}
