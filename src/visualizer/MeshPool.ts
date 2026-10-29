// src\ui\components\MeshPool.ts

/**
 * ВАЖНО: Это не совсем пул, скорее фабрика мешей. 
 * Мы пересоздаем геометрию каждый кадр. 
 * !Заменить на Object Pool (переиспользование всего этого), чтобы меньше лагало (хотя уже не плохо).
 */

// Импорты
import * as THREE from 'three';
import type { PendulumResult, BrushFXConfig } from '../types';
import { GradientMap } from '../Brush/GradientMap';
/**
 * Фабрика мешей для отрисовки скелета маятника.
 * Создает цилиндры (звенья) и сферы (суставы).
 * !сейчас пересоздает геометрию каждый кадр (переделать на настоящий Object Pool).
 */
export class MeshPool {
    private scene: THREE.Scene;
    private group: THREE.Group;

    // Группа для шаров и циллиндров
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
    }

    /**
    * Обновляет скелет маятника: удаляет старые меши и создает новые.
    * @param pendulumResults Массив результатов физики (суставы и кончик).
    * @param brushConfig Настройки кисти (для цвета суставов).
    * @param time Время симуляции.
    */
    public update(pendulumResults: PendulumResult[], brushConfig?: BrushFXConfig, time: number = 0): void {
        // Очищаем старые элементы скелета
        while (this.group.children.length > 0) {
            const obj = this.group.children[0];
            this.group.remove(obj);
            if ((obj as THREE.Mesh).geometry) {
                (obj as THREE.Mesh).geometry.dispose(); // Тут полное уничтожение
            }
        }
        
        for (const res of pendulumResults) {
            const joints = res.joints;
            if (joints.length < 2) continue;

            /**
             * Покра=сочные работы для суставов
             * *Кстати если экспозицию поставить на минимум а неон на максимум, но суставы будут видны, а остальное не будет))
             */
            const tipColorStr = brushConfig 
                ? GradientMap.getColorAt(1.0, brushConfig.gradientMap, time) 
                : '#ffffff';
            const jointColor = new THREE.Color(tipColorStr);

            /**
             * Отрисовка стержней
             * !ПОМЕНЯТЬ РАДИУС ЦИЛЛИНДРА!!!!!!!!
             */
            for (let i = 0; i < joints.length - 1; i++) {
                const p1 = joints[i];
                const p2 = joints[i + 1];

                const v1 = new THREE.Vector3(p1.x, p1.y, p1.z ?? 0);
                const v2 = new THREE.Vector3(p2.x, p2.y, p2.z ?? 0);

                const distance = v1.distanceTo(v2);
                if (distance < 0.0001) continue;

                // Создаем цилиндрический стержневой каркас
                const cylinderGeo = new THREE.CylinderGeometry(0.025, 0.025, distance, 8);
                
                const material = new THREE.MeshBasicMaterial({
                    color: 0x555555,
                    transparent: true,
                    opacity: 0.95
                });

                const cylinder = new THREE.Mesh(cylinderGeo, material);
                
                // Позиционирование посередине между двумя суставами
                cylinder.position.copy(v1.clone().add(v2).multiplyScalar(0.5)); // ? а почему 0,5?
                
                // Ориентируем цилиндр вдоль вектора соединения суставов
                cylinder.matrixAutoUpdate = true;
                cylinder.lookAt(v2);
                // Поворачиваем цилиндр, так как Дерево.js по дефолту ориентирует цилиндр вдоль оси Y
                cylinder.rotateX(Math.PI / 2);

                this.group.add(cylinder);
            }

            // Отрисовка шаров поверх узлов
            for (let i = 0; 
                i < joints.length; i++) {
                const p = joints[i];
                const sphereGeo = new THREE.SphereGeometry(0.06, 16, 16); // Тут потом сделаю по другому

                const material = new THREE.MeshBasicMaterial({
                    color: jointColor
                });
                
                /**
                 * 
                 */
                const sphere = new THREE.Mesh(sphereGeo, material);
                sphere.position.set(p.x, p.y, p.z ?? 0);
                this.group.add(sphere);
            }
        }
    }
}