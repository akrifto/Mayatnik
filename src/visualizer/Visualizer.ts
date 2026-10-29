// src/visualizer/Visualizer.ts

/** 
 * Сборочный цех всего того, что наклепалось 
 */

// Импорты
import * as THREE from 'three';
import { SceneCamera } from '../Camera/SceneCamera';
import { MeshPool } from './MeshPool';
import type { SimulationConfig, BrushFXConfig, JointData } from '../types';
import { PostProcessing } from './PostProcessing';
import { TrailRenderer } from './TrailRenderer';

export class Visualizer {
    private container: HTMLElement;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: SceneCamera;
    private meshPool: MeshPool;
    private postProcessing: PostProcessing;
    private trailRenderer: TrailRenderer;

    /**
     * Инициализирует все подсистемы 
     * Настраивает защиту от потери WebGL-контекста и очистку при HMR
     * @param container Сюда вставляется холст
     */
    constructor(container: HTMLElement) {
        this.container = container;
        this.scene = new THREE.Scene();

         // Очистка перед запуском
         // Очень важно, а то даже F5 не поможет
        this.container.innerHTML = '';

         // Настраиваем WebGL рендерер с защитой производительности
         // !Возможно доработать
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Это чтоб контекст не терялся по любому поводу
        const canvas = this.renderer.domElement;

        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('Контекст - всё...');
        }, false);

        canvas.addEventListener('webglcontextrestored', () => {
            console.log('Контекст возродился');
        }, false);
        

        // Запуск камеры
        this.camera = new SceneCamera(this.renderer.domElement);
        
        /**
         * Пул мешей для маятника 
         * *Честно сказать, я до сих пор не знаю точного названия этой штуки
         */
        this.meshPool = new MeshPool(this.scene);

        /** 
         * Рендерер кисти
        */
        this.trailRenderer = new TrailRenderer(this.scene);

        /**
         * Эффекты 
         * *В основном неон (наверное)
         */
        this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera.instance);

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.postProcessing.resize(window.innerWidth, window.innerHeight);
        });

        /**
         * Защита от утечки контекста
         * *Помогает как когда, но точно стало лучше
         * !Возможно доработать
         */
        if (import.meta.hot) { 
            import.meta.hot.dispose(() => {
                this.renderer.dispose();
            });
        }
    }
    /**
    * Главный метод рендера, вызываемый каждый кадр.
    * Обновляет каркас маятника, шлейфы и применяет пост-процессинг.
    * @param pendulumResults Координаты суставов для отрисовки скелета.
    * @param trails Массивы точек для отрисовки следов.
    * @param simConfig Настройки симуляции (цвет фона и т.д.).
    * @param brushConfig Настройки кисти (цвета, толщина, прозрачность).
    * @param time Время симуляции (для анимации Flow).
    */
    public render(
        pendulumResults: any[],
        trails: JointData[][],
        simConfig: SimulationConfig,
        brushConfig: BrushFXConfig,
        time: number
    ): void {
        this.scene.background = new THREE.Color(simConfig.backgroundColor || '#0b0c10');
        this.camera.update();

        // ?? По идеи мы эти штуки настраиваем в мэйне, но пока трогать не буду
        const skeletonConfig: BrushFXConfig = {
            ...brushConfig,
            exposure: 1.0,
            glowIntensity: 0.0
        };

        this.meshPool.update(pendulumResults, skeletonConfig, time);
        this.trailRenderer.update(trails, brushConfig, time);

        this.postProcessing.updateFX(brushConfig, this.renderer);
        this.postProcessing.render();
    }
}