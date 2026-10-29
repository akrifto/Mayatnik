// src\visualizer\PostProcessing.ts

/**
 * Накладыватель фильтров
 */

// Импорты
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { BrushFXConfig } from '../types';
/**
* Менеджер пост-обработки
* Управляет конвейером эффектов и настройками свечения
*/
export class PostProcessing {
    private composer: EffectComposer;
    private bloomPass: UnrealBloomPass;
    /**
     * 
     * @param renderer 
     * @param scene 
     * @param camera 
     */
    constructor(
        renderer: THREE.WebGLRenderer,
        scene: THREE.Scene,
        camera: THREE.Camera
    ) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Создаем EffectComposer для пайплайна пост-обработки
        this.composer = new EffectComposer(renderer);

        // Базовый проход рендера сцены
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Проход неонового свечения (Unreal Bloom Pass)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.5, // базовое значение неона
            0.4, // радиус
            0.1  // порог
        );
        this.composer.addPass(this.bloomPass);

        // Автоматический ресайз буферов при изменении размера окна
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.resize(w, h);
        });
    }

    /**
     * Публичный метод для изменения размеров буферов рендеринга
     * Короче если его не будет, то при изменении размеров окна все поплывёт
     */
    public resize(width: number, height: number): void {
        this.composer.setSize(width, height);
        this.bloomPass.resolution.set(width, height);
    }

    /**
    * Обновляет параметры эффектов из конфига.
    * Если свечение 0, отключает (Ну а зачем он)
    * @param config Настройки кисти и эффектов.
    * @param renderer WebGL-рендерер (для настройки ToneMappingExposure).
    */
    public updateFX(config: BrushFXConfig, renderer: THREE.WebGLRenderer): void {
        this.bloomPass.strength = config.glowIntensity;
        this.bloomPass.enabled = config.glowIntensity > 0;
        renderer.toneMappingExposure = config.exposure ?? 1.0;
    }

    /**
     * Вызывает финальный рендер с красивостями
     */
    public render(): void {
        this.composer.render();
    }
}