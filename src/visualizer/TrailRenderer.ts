// src\visualizer\TrailRenderer.ts

/**
 * рендер
 * 
 */
// Импорты
import * as THREE from 'three';
import type { BrushFXConfig, JointData } from '../types';
import { GradientMap } from '../Brush/GradientMap';
import { OpacityMap } from '../Brush/OpacityMap';
import { WidthMap } from '../Brush/WidthMap'; // Подключаем реальную карту толщины!

export class TrailRenderer {
    private trailMeshes: THREE.Mesh[] = []; // * Эта штука нужна для подддержки зеркал (вопрос о том, когда я их сделаю, остается открытым)
    private scene: THREE.Scene;
    private radialSegments = 6; // *Грани трубы (потом можно сделать чтоб оно зависило от устройства по идее)

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public update(trails: JointData[][], brushConfig: BrushFXConfig, time: number): void {
        while (this.trailMeshes.length < trails.length) {
            const geometry = new THREE.BufferGeometry();
            
            /**
             * Материал с фокусами
             */
            const material = new THREE.MeshBasicMaterial({
                vertexColors: true, //  Берем цвет вершин из массива цветов
                transparent: true,
                opacity: 0.9, // ?? А может больше или меньше сделать?
                blending: THREE.AdditiveBlending, // Для красоты и тру неона 
                side: THREE.FrontSide, 
                depthTest: true,
                depthWrite: false // Если пересекается, то просто мешаем цвета
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.frustumCulled = false;

            this.scene.add(mesh);
            this.trailMeshes.push(mesh);
        }

        const exposure = brushConfig.exposure ?? 1.0;
        const angles = Array.from({ length: this.radialSegments }, (_, i) => (i / this.radialSegments) * Math.PI * 2);

        trails.forEach((points, idx) => {
            const mesh = this.trailMeshes[idx];
            if (!mesh) return;

            if (points.length < 2) {
                mesh.visible = false;
                return;
            }

            mesh.visible = true;
            const geometry = mesh.geometry as THREE.BufferGeometry;
            const numPoints = points.length;

            const vertexCount = numPoints * this.radialSegments;
            const indexCount = (numPoints - 1) * this.radialSegments * 6;

            let positions = geometry.attributes.position?.array as Float32Array;
            let colors = geometry.attributes.color?.array as Float32Array;
            let indices = geometry.index?.array as Uint32Array;
            
            /**
             * Перезапись точек
             * Чтоб лишний раз не пинать сборщик мусора, а то будет хреново скорее всего
             * *точно не могу сказать. Не знаю не тестил, но поверю неиронке что это важно
             */
            if (!positions ||  positions.length < vertexCount * 3) {
                positions = new Float32Array(vertexCount * 3);
                colors = new Float32Array(vertexCount * 3);
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
            
            /**
             * Индекс-генератор для трубы
             * *скорее всего для самых маленьких, но я это тоже проверять не буду
             */
            if (!indices || indices.length < indexCount) {
                indices = new Uint32Array(indexCount);
                let indexPtr = 0;
                for (let i = 0; i < numPoints - 1; i++) {
                    for (let j = 0; j < this.radialSegments; j++) {
                        const nextJ = (j + 1) % this.radialSegments;
                        
                        const currentCurr = i * this.radialSegments + j;
                        const currentNext = i * this.radialSegments + nextJ;
                        const nextCurr = (i + 1) * this.radialSegments + j;
                        const nextNext = (i + 1) * this.radialSegments + nextJ;
                        
                        indices[indexPtr++] = currentCurr;
                        indices[indexPtr++] = nextCurr;
                        indices[indexPtr++] = currentNext;
                        
                        indices[indexPtr++] = currentNext;
                        indices[indexPtr++] = nextCurr;
                        indices[indexPtr++] = nextNext;
                    }
                }
                geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            }

            const posAttr = geometry.attributes.position as THREE.BufferAttribute;
            const colAttr = geometry.attributes.color as THREE.BufferAttribute;
            const posArray = posAttr.array as Float32Array;
            const colArray = colAttr.array as Float32Array;

            let vertexIndex = 0;
            const color = new THREE.Color();

            for (let i = 0; i < numPoints; i++) {
                const p = points[i];
                const curr = new THREE.Vector3(p.x, p.y, p.z ?? 0);

                const prev = i > 0 ? new THREE.Vector3(points[i - 1].x, points[i - 1].y, points[i - 1].z ?? 0) : curr;
                const next = i < numPoints - 1 ? new THREE.Vector3(points[i + 1].x, points[i + 1].y, points[i + 1].z ?? 0) : curr;
                


                let tangent = new THREE.Vector3().subVectors(next, prev);
                if (tangent.lengthSq() === 0) {
                    tangent.set(0, 0, 1);
                } else {
                    tangent.normalize();
                }
                
                // ?? Вот тут я ваще не шарю, потом разберу. там жосткая математика и тригонометрия
                const up = new THREE.Vector3(0, 1, 0);
                if (Math.abs(tangent.dot(up)) > 0.95) {
                    up.set(1, 0, 0);
                }
                const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
                const normal = new THREE.Vector3().crossVectors(side, tangent).normalize();

                /**
                 * Вычисляем координату u для карты градиента. 
                 * distanceScale — масштаб, который задает, на какую длину пути растянется один цикл градиента. 
                 * Управляется ползунком в UI. Если сделать значение маленьким, градиент будет часто мелькать, 
                 * если большим — плавно растянется на всю трубу»
                 */
                const distanceScale = 20.0; // Масштаб растяжения градиента
                const pDist = p.distance ?? 0;
                const u = pDist / distanceScale;
                
                /**
                 * Получаем цвет из карты градиентов 
                 */
                const colorStr = GradientMap.getColorAt(u, brushConfig.gradientMap, time);
                
                /**
                 * Получаем прозрачность из карты прозрачности 
                 */
                const rawOpacityVal = OpacityMap.getOpacityAt(u, brushConfig.opacityMap, time);
                let alpha = 1.0;
                if (rawOpacityVal >= 0) {
                    alpha = 1.0 + (rawOpacityVal / 100.0) * 1.0;
                } else {
                    alpha = 1.0 + (rawOpacityVal / 100.0);
                }
                alpha = Math.max(0.0, alpha);

                /**
                 * Получаем толщину из карты толщины
                 * *да, такое тоже есть 
                 */
                const currentWidth = WidthMap.getWidthAt(u, brushConfig.widthMap, time);
                const radius = Math.max(currentWidth * 0.025, 0.002);

                color.set(colorStr);

                for (let j = 0; j < this.radialSegments; j++) {
                    const angle = angles[j];
                    const cx = Math.cos(angle);
                    const cy = Math.sin(angle);

                    const offsetX = side.x * cx + normal.x * cy;
                    const offsetY = side.y * cx + normal.y * cy;
                    const offsetZ = side.z * cx + normal.z * cy;

                    posArray[vertexIndex * 3 + 0] = curr.x + offsetX * radius;
                    posArray[vertexIndex * 3 + 1] = curr.y + offsetY * radius;
                    posArray[vertexIndex * 3 + 2] = curr.z + offsetZ * radius;

                    colArray[vertexIndex * 3 + 0] = color.r * alpha * exposure;
                    colArray[vertexIndex * 3 + 1] = color.g * alpha * exposure;
                    colArray[vertexIndex * 3 + 2] = color.b * alpha * exposure;

                    vertexIndex++;
                }
            }

            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;
            geometry.setDrawRange(0, indexCount);
        });
    }
}

/** 
 * !Я к этому файлу еще вернусь. Потому что это тупо сложно
*/