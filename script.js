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
    camera.position.set(0, 100, 300);
    
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
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 1);
    backLight.position.set(-100, 150, -100);
    scene.add(backLight);
    
    // ---------- 5. УПРАВЛЕНИЕ ----------
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.panSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 10;
    controls.maxDistance = 2000;
    
    // ---------- 6. СЕТКА (ОСТАВЛЯЕМ) ----------
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    
    // ---------- 7. ЗАГРУЗКА МОДЕЛИ ----------
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
            
            // Настройка материалов - СЕРЫЙ цвет
            console.log('🔧 Настройка материалов (серый цвет)...');
            
            model.traverse(function(child) {
                if (child.isMesh) {
                    // Назначаем серый материал
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x808080, // Серый цвет
                        roughness: 0.6,
                        metalness: 0.4,
                        side: THREE.DoubleSide
                    });
                    
                    // Включаем тени
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Вычисляем размеры модели
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            console.log('📏 Оригинальные размеры:');
            console.log('   X:', size.x.toFixed(1), 'единиц');
            console.log('   Y:', size.y.toFixed(1), 'единиц');
            console.log('   Z:', size.z.toFixed(1), 'единиц');
            console.log('📍 Оригинальный центр:', center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1));
            
            // УВЕЛИЧИВАЕМ МОДЕЛЬ (уменьшаем масштабирование)
            const scale = 0.1;
            model.scale.setScalar(scale);
            console.log('⚖️ Масштаб применен:', scale, '(модель увеличена)');
            
            // Пересчитываем после масштабирования
            const newBox = new THREE.Box3().setFromObject(model);
            const newSize = newBox.getSize(new THREE.Vector3());
            const newCenter = newBox.getCenter(new THREE.Vector3());
            
            console.log('📏 Размеры после масштабирования:');
            console.log('   X:', newSize.x.toFixed(1), 'единиц');
            console.log('   Y:', newSize.y.toFixed(1), 'единиц');
            console.log('   Z:', newSize.z.toFixed(1), 'единиц');
            console.log('📍 Центр после масштабирования:', newCenter.x.toFixed(1), newCenter.y.toFixed(1), newCenter.z.toFixed(1));
            
            // ЦЕНТРИРОВАНИЕ: сдвигаем модель так, чтобы ее центр был в (0,0,0)
            model.position.x = -newCenter.x;
            model.position.y = -newCenter.y;
            model.position.z = -newCenter.z;
            
            // Поднимаем модель, чтобы она стояла на сетке (y=0)
            // После центрирования низ модели находится на -newSize.y/2
            // Чтобы низ был на y=0, нужно поднять на newSize.y/2
            model.position.y += newSize.y / 2;
            
            console.log('🎯 Модель отцентрирована и поставлена на сетку');
            console.log('   Позиция модели:', model.position.x.toFixed(1), model.position.y.toFixed(1), model.position.z.toFixed(1));
            
            // Настраиваем камеру на основе новой (большей) модели
            const maxDim = Math.max(newSize.x, newSize.y, newSize.z);
            let cameraDistance = maxDim * 2.5;
            cameraDistance = Math.max(cameraDistance, 150);
            
            camera.position.set(0, cameraDistance * 0.4, cameraDistance);
            camera.lookAt(0, newSize.y/2, 0); // Смотрим на центр модели (учитываем подъем)
            
            controls.target.set(0, newSize.y/2, 0); // Цель контролов - центр модели
            controls.maxDistance = cameraDistance * 3;
            controls.minDistance = maxDim * 0.5;
            controls.update();
            
            console.log('📷 Камера установлена на расстоянии:', cameraDistance.toFixed(1));
            console.log('🎮 Модель готова к просмотру');
            
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
    
    // ---------- 8. АНИМАЦИЯ ----------
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    // ---------- 9. ОБРАБОТКА ИЗМЕНЕНИЯ РАЗМЕРА ОКНА ----------
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
