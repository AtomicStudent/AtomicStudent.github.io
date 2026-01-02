function init() {
    console.log("Запуск 3D сцены...");
    
    // ---------- 1. СОЗДАЕМ СЦЕНУ ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // ---------- 2. КАМЕРА ----------
    const container = document.getElementById('model-container');
    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.01,
        50000
    );
    camera.position.set(0, 2, 10);
    
    // ---------- 3. РЕНДЕРЕР ----------
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // ---------- 4. ОСВЕЩЕНИЕ ----------
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 3);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);
    
    // ---------- 5. УПРАВЛЕНИЕ ----------
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.panSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 1;
    controls.maxDistance = 5000;
    
    // ---------- 6. ЗАГРУЗКА МОДЕЛИ ----------
    const loader = new THREE.GLTFLoader();
    
    const loadingText = document.createElement('div');
    loadingText.style.position = 'absolute';
    loadingText.style.top = '50%';
    loadingText.style.left = '50%';
    loadingText.style.transform = 'translate(-50%, -50%)';
    loadingText.style.color = 'white';
    loadingText.style.fontSize = '1.2rem';
    loadingText.style.zIndex = '100';
    loadingText.style.textAlign = 'center';
    loadingText.textContent = 'Загрузка модели...';
    container.appendChild(loadingText);
    
    const modelPath = 'models/Reactor.glb';
    
    loader.load(
        modelPath,
        function(gltf) {
            console.log('Модель загружена!');
            const model = gltf.scene;
            scene.add(model);
            container.removeChild(loadingText);
            
            // Настройка материалов и теней
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Улучшаем отображение материалов
                    if (child.material) {
                        child.material.needsUpdate = true;
                        child.material.side = THREE.DoubleSide;
                    }
                }
            });
            
            // Вычисление размеров и центрирование
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            console.log('Размер модели:', size.x.toFixed(1), '×', size.y.toFixed(1), '×', size.z.toFixed(1));
            console.log('Центр модели:', center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1));
            
            // Центрируем модель
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            // Уменьшаем модель, если она слишком большая
            const maxDim = Math.max(size.x, size.y, size.z);
            let scale = 1;
            
            if (maxDim > 1000) {
                scale = 100 / maxDim; // Уменьшаем до ~100 единиц
                model.scale.setScalar(scale);
                console.log('Масштаб уменьшен до:', scale);
            }
            
            // НАСТРАИВАЕМ КАМЕРУ ПРАВИЛЬНО
            const scaledSize = size.clone().multiplyScalar(scale);
            const scaledMaxDim = maxDim * scale;
            
            // Рассчитываем дистанцию камеры
            let cameraDistance;
            if (scaledMaxDim < 10) {
                cameraDistance = scaledMaxDim * 3;
            } else if (scaledMaxDim < 50) {
                cameraDistance = scaledMaxDim * 2.5;
            } else if (scaledMaxDim < 100) {
                cameraDistance = scaledMaxDim * 2;
            } else {
                cameraDistance = scaledMaxDim * 1.5;
            }
            
            // Минимальная дистанция для удобного просмотра
            cameraDistance = Math.max(cameraDistance, 20);
            
            // Позиционируем камеру
            camera.position.set(cameraDistance, cameraDistance * 0.3, cameraDistance);
            camera.lookAt(0, 0, 0);
            
            // Настраиваем контролы
            controls.target.set(0, 0, 0);
            controls.maxDistance = cameraDistance * 3;
            controls.minDistance = scaledMaxDim * 0.1;
            controls.update();
            
            console.log('Камера установлена на расстоянии:', cameraDistance.toFixed(0));
            console.log('Модель готова к просмотру');
            
            // Добавляем сетку для ориентации (можно убрать потом)
            const gridSize = Math.max(scaledMaxDim * 2, 20);
            const gridHelper = new THREE.GridHelper(gridSize, 20, 0x444444, 0x222222);
            gridHelper.position.y = -scaledSize.y / 2;
            scene.add(gridHelper);
            
            // Оси координат
            const axesHelper = new THREE.AxesHelper(scaledMaxDim);
            scene.add(axesHelper);
            
            // Подсветка контура модели
            const boxHelper = new THREE.BoxHelper(model, 0x00ff00);
            scene.add(boxHelper);
        },
        function(xhr) {
            // Исправляем вывод прогресса
            if (xhr.lengthComputable && xhr.total > 0) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                loadingText.textContent = 'Загрузка: ' + percent + '%';
            } else {
                loadingText.textContent = 'Загрузка: ' + Math.round(xhr.loaded / 1000) + ' KB';
            }
        },
        function(error) {
            console.error('Ошибка загрузки модели:', error);
            loadingText.innerHTML = '<div style="color: #ff6b6b;">Ошибка загрузки модели. Проверьте консоль.</div>';
        }
    );
    
    // ---------- 7. АНИМАЦИЯ ----------
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    // ---------- 8. РЕСАЙЗ ----------
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onWindowResize);
    
    console.log('Three.js готов к работе!');
}

window.addEventListener('DOMContentLoaded', init);