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
    container.appendChild(renderer.domElement);
    
    // ---------- 4. ОСВЕЩЕНИЕ ----------
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(100, 200, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(-50, 100, -50);
    scene.add(backLight);
    
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
            
            const model = gltf.scene;
            scene.add(model);
            
            container.removeChild(loadingText);
            
            // Настройка материалов - ВАЖНО: модель имеет 1 материал, 0 текстур
            console.log('🔧 Настройка материалов...');
            
            let meshCount = 0;
            model.traverse(function(child) {
                if (child.isMesh) {
                    meshCount++;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Если у модели только 1 материал и нет текстур, назначаем цвет
                    if (child.material && !child.material.map) {
                        // Задаем цвет для моделей без текстур
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0x4a90e2, // Синий цвет для металла
                            roughness: 0.4,
                            metalness: 0.8,
                            side: THREE.DoubleSide
                        });
                        console.log(`   Меш ${meshCount}: назначен стандартный материал (синий металл)`);
                    } else if (child.material) {
                        // Если есть материал, улучшаем его
                        child.material.needsUpdate = true;
                        child.material.side = THREE.DoubleSide;
                    }
                }
            });
            
            console.log(`📊 Всего мешей: ${meshCount}`);
            
            // Вычисляем размеры модели
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            console.log('📏 Размеры оригинальной модели:');
            console.log('   X:', size.x.toFixed(1), 'единиц');
            console.log('   Y:', size.y.toFixed(1), 'единиц');
            console.log('   Z:', size.z.toFixed(1), 'единиц');
            console.log('📍 Оригинальный центр:', center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1));
            
            // ПРОБЛЕМА: модель смещена по Z на 1192.5 единиц!
            // Исправляем центрирование:
            
            // 1. Масштабируем модель
            const scale = 0.03; // Уменьшаем в ~33 раза
            model.scale.setScalar(scale);
            console.log('⚖️ Модель уменьшена в', scale, 'раза');
            
            // 2. Пересчитываем центр после масштабирования
            const newBox = new THREE.Box3().setFromObject(model);
            const newCenter = newBox.getCenter(new THREE.Vector3());
            const newSize = newBox.getSize(new THREE.Vector3());
            
            console.log('📍 Центр после масштабирования:', newCenter.x.toFixed(1), newCenter.y.toFixed(1), newCenter.z.toFixed(1));
            
            // 3. Сдвигаем модель так, чтобы её центр был в (0,0,0)
            // Поскольку оригинальный центр был ( -0.1, 0.0, 1192.5 ),
            // а после масштабирования центр стал ( -0.0, 0.0, 39.8 ),
            // нам нужно сдвинуть модель на -39.8 по Z
            
            model.position.x = -newCenter.x;
            model.position.y = -newCenter.y;
            model.position.z = -newCenter.z;
            
            console.log('🎯 Модель отцентрирована в (0,0,0)');
            console.log('   Смещение применено:', model.position.x.toFixed(1), model.position.y.toFixed(1), model.position.z.toFixed(1));
            
            // 4. Настраиваем камеру
            const scaledMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
            let cameraDistance = scaledMaxDim * 3;
            cameraDistance = Math.max(cameraDistance, 100);
            
            camera.position.set(0, cameraDistance * 0.4, cameraDistance);
            camera.lookAt(0, 0, 0);
            
            controls.target.set(0, 0, 0);
            controls.maxDistance = cameraDistance * 4;
            controls.minDistance = scaledMaxDim * 0.5;
            controls.update();
            
            console.log('📷 Камера установлена на расстоянии:', cameraDistance.toFixed(1));
            console.log('🎮 Модель готова к просмотру');
            
            // ---------- ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ ----------
            
            // Сетка пола (серая, как было изначально)
            const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
            gridHelper.position.y = 0;
            scene.add(gridHelper);
            
            // Оси координат
            const axesHelper = new THREE.AxesHelper(100);
            scene.add(axesHelper);
            
            // Точка в центре сцены (0,0,0) - КРАСНАЯ
            const centerSphere = new THREE.Mesh(
                new THREE.SphereGeometry(3, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            scene.add(centerSphere);
            
            // Визуализация bounding box модели - ЖЕЛТАЯ
            const boxHelper = new THREE.BoxHelper(model, 0xffff00);
            scene.add(boxHelper);
            
            console.log('🔍 Проверка:');
            console.log('   - Красная точка - центр сцены (0,0,0)');
            console.log('   - Желтый контур должен окружать модель');
            console.log('   - Сетка должна быть под моделью');
            console.log('   - Модель должна быть синего металлического цвета');
            
        },
        function(xhr) {
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