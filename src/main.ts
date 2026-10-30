// src\main.ts

/** 
 * Главный заводила в банде
 * Его первое слово имеет вес крейсера (а потом не особо)
*/


// Импорты
import { KinematicChain } from './core/KinematicChain';
import { Mirror3D } from './core/Mirror3D';
import { TrailBuffer } from './Brush/TrailBuffer';
import { Visualizer } from './visualizer/Visualizer';
import type { SimulationConfig, BrushFXConfig } from './types';
import { HUD } from './ui/components/HUD';

/** 
 * Контейнер
 * Вери важно, оно не дает странице свалить
 */
const appContainer = document.createElement('div');
appContainer.style.width = '100vw';
appContainer.style.height = '100vh';
appContainer.style.overflow = 'hidden';
appContainer.style.position = 'fixed';
appContainer.style.top = '0';
appContainer.style.left = '0';
document.body.appendChild(appContainer);
document.body.style.margin = '0';   
document.body.style.overflow = 'hidden';


 //Настройки симуляции по умолчанию
const simConfig: SimulationConfig = {
    linkCount: 3, 
    links: [
        
        // *Пусть все будет одинаково тут
        { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: 0 },
        { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: Math.PI / 4 },
        { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: Math.PI / 2 }
    ],
    is3D: false,
    speed: 1.0,
    backgroundColor: '#000000', // !Потом куда-нибудь пульну настройки цвета (ну а вдруг я захочу сделать серобуромалиновый фон) 
    
    // !Пока не сделал (до сих пор думаю, есть ли смысл)
    mirror2D: { x: false, y: false },
    mirror3D: { x: false, y: false, z: false }
};

/** 
 * Дефолтные настройки кисти
 * *Пока что и так сойдет
*/ 
const brushConfig: BrushFXConfig = {
    gradientMap: {
        points: [ // !ВОТ ТУТ ПОМЕНЯТЬ
            { position: 0.0, value: '#515151' }
        ],
        density: 1.0,
        flow: 0.0
    },
    opacityMap: {
        points: [{ position: 0, value: 0.0 }],
        density: 1.0,
        flow: 0.0
    },
    widthMap: {
        points: [{ position: 0, value: 2.0 }],
        density: 1.0,
        flow: 0.0
    },
    exposure: 1.0,
    glowIntensity: 1.5,
    lineLengthMax: 1500 
};

/** 
 * Инициализация системнных модулей 
*/
const kinematicChain = new KinematicChain();
const visualizer = new Visualizer(appContainer);

// Пул буферов траекторий (до 8 независимых буферов для зеркал)
// !ПОКА ОБСОЛЮТНО БЕСПОЛЕЗНЫЙ КОД
const trailBuffers: TrailBuffer[] = Array.from({ length: 8 }, () => new TrailBuffer(1500));

let isRunning = true;

/**
 * HUD... В этот модуль идти - себе дороже
 * Да отци за клебом так не уходят как уходит время на исправление этого модуля 
 * в след раз прсто качаю реакт или еще что-то
 */
new HUD(simConfig, brushConfig, {

    /**
     * Старт/Пауза 
     */
    onPlayToggle: (playing) => {
        isRunning = playing;
    },
    /**
     * Очистить
     */
    onClear: () => {
        trailBuffers.forEach(buf => buf.clear());
    },

    /**
     * Перезагрузка до заводских настроек
     * !НЕ РЕАЛИЗОВАНО
     */
    onReset: () => {
        trailBuffers.forEach(buf => buf.clear());
        simConfig.linkCount = 3;
        simConfig.speed = 1.0;
        simConfig.links = [
            { length: 2.0, speed2D: 1.0, speed3D: 0.0, phase: 0 },
            { length: 2.0, speed2D: 1.5, speed3D: 0.0, phase: Math.PI / 4 },
            { length: 5.0, speed2D: 1.0, speed3D: 0.0, phase: Math.PI / 2 }
        ];
    },

    /**
     * Проверка на 3D
     */
    onModeToggle: (is3D) => {
        simConfig.is3D = is3D;
    },

    
    onBgColorChange: (color) => {
        simConfig.backgroundColor = color;
    },
    onConfigChange: () => {
        trailBuffers.forEach(buf => buf.setMaxLength(brushConfig.lineLengthMax));
    }
});


// Объявляем переменную для расчёта дельты времени кадра
let lastTime = performance.now();
let simulationTime = 0; // Накопитель симуляционного времени
 
/**
 * Цикл анимации
 * Буквально двигатель всего и вся
 * @param currentTime Системное время, передаваемое requestAnimationFrame
 */
function animate(currentTime: number) {
    requestAnimationFrame(animate);

    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    const scaledDelta = delta * simConfig.speed;

    if (isRunning) {
        simulationTime += scaledDelta; // Время для кисти и Flow тикает синхронно с физикой!

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

        const activeTrails = allPendulumResults.map((_, idx) => trailBuffers[idx]?.getHistory() || []);

        // Передаем simulationTime вместо системного времени
        visualizer.render(allPendulumResults, activeTrails, simConfig, brushConfig, simulationTime);
    } else {
        // На паузе время кисти замирает вместе с симуляцией
        visualizer.render([], trailBuffers.map(b => b.getHistory()), simConfig, brushConfig, simulationTime);
    }
}


requestAnimationFrame(animate);

