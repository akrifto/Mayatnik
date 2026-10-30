// src\Camera\SceneCamera.ts

/**
 * Камера
 * !Добавить плавность при скролле 
 * *На мобилке не тестировалось, по этому пока не знаю будет ли работать
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


/**
 * Класс камеры, чтоб можно было красиво туда-сюда летать
 */
export class SceneCamera {
    public instance: THREE.PerspectiveCamera;
    public controls: OrbitControls;


    constructor(domElement: HTMLElement) {
        const aspect = window.innerWidth / window.innerHeight;
        
        // Создаем перспективную камеру
        this.instance = new THREE.PerspectiveCamera(
            60,     // Угол обзора
            aspect, // Соотношение сторон
            0.1,    // Ближняя граница
            1000    // Дальняя граница
        );

        // Это для вращения камеры вокруг центра
        this.controls = new OrbitControls(this.instance, domElement);
        this.instance.position.set(0, 0, 15); // Положение камеры
        this.controls.enableDamping = true; // Плавность при вращении
        this.controls.dampingFactor = 0.05; // Плавность
        this.controls.enableZoom = true;
        

        // Лимиты зума
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;


        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * Обновление состояния камеры (вызывается в каждом кадре рендера для работы инерции)
     */
    public update(): void {
        this.controls.update();
    }
    
    /**
     * Овнвиндоуресайз 
     * *Если не вызвать, то при изменении пропорции все полетит в трубу
     */
    private onWindowResize(): void {
        const aspect = window.innerWidth / window.innerHeight;
        this.instance.aspect = aspect;
        this.instance.updateProjectionMatrix();
    }

    /**
     * Ресет, рестарт (до конца не втыкаю что это)
     */
    public reset(): void {
        this.controls.reset();
    }
}