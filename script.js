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
        0.1,
        50000
    );
    camera.position.set(0, 50, 150);
    
    // ---------- 3. РЕНДЕРЕР ----------
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; // Для правильных цветов
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Для лучшего освещения
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    
    // ---------- 4. УСИЛЕННОЕ ОСВЕЩЕНИЕ ----------
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8); // Увеличено
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Увеличено
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 1.2); // Увеличено
    backLight.position.set(-100, 150, -100);
    scene.add(backLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0); // Добавлено
    fillLight.position.set(-50, 100, 50);
    scene.add(fillLight);
    
    // ---------- 5. УПРАВЛЕНИЕ ----------
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.panSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 10;
    controls.maxDistance = 1000;
    
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
            console.log('✅ Модель загружена!');
            
            // Создаем группу для модели
            const group = new THREE.Group();
            scene.add(group);
            
            const model = gltf.scene;
            group.add(model);
            
            // Удаляем сообщение о загрузке
            container.removeChild(loadingText);
            
            // Настройка материалов и теней
            let materialCount = 0;
            let textureCount = 0;
            
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Улучшаем отображение материалов
                    if (child.material) {
                        materialCount++;
                        
                        // Включаем все свойства материалов
                        if (child.material.map) {
                            textureCount++;
                            child.material.map.encoding = THREE.sRGBEncoding;
                        }
                        
                        // Улучшаем настройки материалов
                        child.material.needsUpdate = true;
                        child.material.side = THREE.DoubleSide;
                        child.material.roughness = 0.7;
                        child.material.metalness = 0.2;
                        
                        // Увеличиваем яркость материалов
                        if (child.material.emissive) {
                            child.material.emissive.multiplyScalar(1.5);
                        }
                        
                        // Включаем вертексные цвета если есть
                        if (child.material.vertexColors) {
                            child.material.vertexColors = true;
                        }
                    }
                }
            });
            
            console.log(`📊 Материалов: ${materialCount}, Текстур: ${textureCount}`);
            
            // Вычисляем размеры модели (ДО добавления в группу)
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            console.log('📏 Размеры оригинальной модели:');
            console.log('   X:', size.x.toFixed(1), 'единиц');
            console.log('   Y:', size.y.toFixed(1), 'единиц');
            console.log('   Z:', size.z.toFixed(1), 'единиц');
            console.log('📍 Оригинальный центр:', center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1));
            
            // Масштабируем модель (уменьшаем в 30 раз)
            const scale = 1 / 30;
            model.scale.setScalar(scale);
            console.log('⚖️ Модель уменьшена в', scale.toFixed(3), 'раза');
            
            // Пересчитываем размеры после масштабирования
            const newBox = new THREE.Box3().setFromObject(model);
            const newSize = newBox.getSize(new THREE.Vector3());
            const newCenter = newBox.getCenter(new THREE.Vector3());
            
            console.log('📏 Размер после масштабирования:');
            console.log('   X:', newSize.x.toFixed(1), 'единиц');
            console.log('   Y:', newSize.y.toFixed(1), 'единиц');
            console.log('   Z:', newSize.z.toFixed(1), 'единиц');
            console.log('📍 Центр после масштабирования:', newCenter.x.toFixed(1), newCenter.y.toFixed(1), newCenter.z.toFixed(1));
            
            // ПРАВИЛЬНОЕ ЦЕНТРИРОВАНИЕ:
            // 1. Вычисляем смещение модели относительно группы
            // 2. Сдвигаем модель так, чтобы ее центр был в (0,0,0) группы
            
            // Текущее положение модели в группе
            const modelPosition = model.position.clone();
            
            // Сдвигаем модель внутри группы
            model.position.x = -newCenter.x;
            model.position.y = -newCenter.y;
            model.position.z = -newCenter.z;
            
            console.log('🎯 Модель отцентрирована внутри группы');
            console.log('   Смещение модели:', model.position.x.toFixed(1), model.position.y.toFixed(1), model.position.z.toFixed(1));
            
            // Позиционируем группу в центре сцены
            group.position.set(0, 0, 0);
            
            // Настраиваем камеру на основе размера модели
            const scaledMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
            let cameraDistance = scaledMaxDim * 2.5;
            cameraDistance = Math.max(cameraDistance, 80);
            
            camera.position.set(0, cameraDistance * 0.4, cameraDistance);
            camera.lookAt(0, 0, 0);
            
            controls.target.set(0, 0, 0);
            controls.maxDistance = cameraDistance * 3;
            controls.minDistance = scaledMaxDim * 0.3;
            controls.update();
            
            console.log('📷 Камера установлена на расстоянии:', cameraDistance.toFixed(1));
            console.log('🎮 Модель готова к просмотру');
            
            // ---------- ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ ----------
            
            // Сетка пола (зеленая для контраста)
            const gridHelper = new THREE.GridHelper(200, 20, 0x00aa00, 0x004400);
            gridHelper.position.y = 0;
            scene.add(gridHelper);
            
            // Оси координат (увеличены)
            const axesHelper = new THREE.AxesHelper(150);
            scene.add(axesHelper);
            
            // Точка в центре сцены (0,0,0) - КРАСНАЯ
            const centerSphere = new THREE.Mesh(
                new THREE.SphereGeometry(3, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            scene.add(centerSphere);
            
            // Точка в центре модели (после центрирования) - ЗЕЛЕНАЯ
            // Должна совпадать с красной
            const modelCenterSphere = new THREE.Mesh(
                new THREE.SphereGeometry(2, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            // Центр модели теперь в (0,0,0) группы, а группа в (0,0,0) сцены
            modelCenterSphere.position.set(0, 0, 0);
            scene.add(modelCenterSphere);
            
            console.log('🎯 Красная точка - центр сцены (0,0,0)');
            console.log('🟢 Зеленая точка - центр модели (должна совпадать с красной)');
            
            // Визуализация bounding box модели - ЖЕЛТАЯ
            const boxHelper = new THREE.BoxHelper(model, 0xffff00);
            group.add(boxHelper); // Добавляем в группу, чтобы двигалось с моделью
            
            // Информация для отладки
            console.log('🔍 Для проверки:');
            console.log('   - Красная и зеленая точки должны совпадать');
            console.log('   - Желтый контур должен окружать модель');
            console.log('   - Сетка должна быть под моделью');
            
        },
        function(xhr) {
            // Прогресс загрузки
            if (xhr.lengthComputable && xhr.total > 0) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                loadingText.textContent = 'Загрузка: ' + percent + '%';
            } else {
                loadingText.textContent = 'Загрузка: ' + Math.round(xhr.loaded / 1000) + ' KB';
            }
        },
        function(error) {
            console.error('❌ Ошибка загрузки модели:', error);
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
    
    // ---------- 8. ОБРАБОТКА ИЗМЕНЕНИЯ РАЗМЕРА ОКНА ----------
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    window.addEventListener('resize', onWindowResize);
    
    console.log('🚀 Three.js готов к работе!');
}

// Запускаем когда вся страница загружена
window.addEventListener('DOMContentLoaded', init);