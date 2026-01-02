// Основная функция, которая запустится при загрузке страницы
function init() {
    console.log("🚀 Запуск 3D сцены...");
    
    // ---------- 1. СОЗДАЕМ СЦЕНУ ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // ---------- 2. КАМЕРА ----------
    const container = document.getElementById('model-container');
    const camera = new THREE.PerspectiveCamera(
        75, // угол обзора
        container.clientWidth / container.clientHeight,
        0.1, // ближняя плоскость (очень маленькая)
        1000 // дальняя плоскость (очень большая)
    );
    camera.position.set(10, 5, 10);
    
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
    // Мягкий рассеянный свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // Направленный свет (как солнце)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Задняя подсветка для объема
    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(-10, 5, -10);
    scene.add(backLight);
    
    // Боковая подсветка
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(5, 10, -15);
    scene.add(fillLight);
    
    // ---------- 5. УПРАВЛЕНИЕ МЫШКОЙ ----------
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.panSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 1;
    controls.maxDistance = 10000;
    controls.maxPolarAngle = Math.PI;
    
    // ---------- 6. ЗАГРУЗКА 3D МОДЕЛИ ----------
    const loader = new THREE.GLTFLoader();
    
    // Показываем сообщение о загрузке
    const loadingText = document.createElement('div');
    loadingText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 1.2rem;
        z-index: 100;
        text-align: center;
    `;
    loadingText.textContent = '🔄 Загрузка 3D модели...';
    container.appendChild(loadingText);
    
    // ПУТЬ К МОДЕЛИ - ИЗМЕНИТЕ ЭТУ СТРОКУ!
    const modelPath = 'https://github.com/AtomicStudent/AtomicStudent.github.io/raw/main/models/Reactor.glb;// ← ЗАМЕНИТЕ НА СВОЙ ФАЙЛ
    
    loader.load(
        // URL модели
        modelPath,
        
        // Успешная загрузка
        function(gltf) {
            console.log('✅ Модель загружена!');
            
            const model = gltf.scene;
            scene.add(model);
            
            // Удаляем сообщение о загрузке
            container.removeChild(loadingText);
            
            // Настраиваем тени для всех объектов модели
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Вычисляем габариты модели
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Перемещаем модель в центр сцены
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;
            
            // Автоматическая настройка камеры под размеры модели
            const maxDim = Math.max(size.x, size.y, size.z);
            console.log(`📏 Размер модели: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} единиц`);
            console.log(`📍 Центр: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`);
            console.log(`📐 Максимальный размер: ${maxDim.toFixed(2)}`);
            
            // Определяем расстояние камеры в зависимости от размера модели
            let cameraDistance;
            if (maxDim < 1) {
                cameraDistance = 5;
            } else if (maxDim < 10) {
                cameraDistance = maxDim * 5;
            } else if (maxDim < 50) {
                cameraDistance = maxDim * 8;
            } else if (maxDim < 100) {
                cameraDistance = maxDim * 12;
            } else {
                cameraDistance = maxDim * 15;
            }
            
            // Позиционируем камеру
            camera.position.set(cameraDistance, cameraDistance * 0.4, cameraDistance);
            camera.lookAt(0, 0, 0);
            
            // Настраиваем контролы
            controls.target.set(0, 0, 0);
            controls.maxDistance = cameraDistance * 3;
            controls.update();
            
            console.log(`📷 Камера установлена на расстоянии: ${cameraDistance.toFixed(2)}`);
            
            // Добавляем сетку для ориентации
            const gridSize = Math.max(10, maxDim * 2);
            const gridHelper = new THREE.GridHelper(gridSize, 20, 0x444444, 0x222222);
            gridHelper.position.y = -size.y / 2;
            scene.add(gridHelper);
            
            // Добавляем оси координат
            const axesHelper = new THREE.AxesHelper(maxDim);
            scene.add(axesHelper);
            
            // Визуализируем ограничивающий контур модели
            const boxHelper = new THREE.BoxHelper(model, 0xffff00);
            scene.add(boxHelper);
        },
        
        // Прогресс загрузки
        function(xhr) {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            loadingText.textContent = `🔄 Загрузка: ${percent}%`;
            console.log(`Загружено: ${percent}%`);
        },
        
        // Ошибка
        function(error) {
            console.error('❌ Ошибка загрузки модели:', error);
            loadingText.innerHTML = `
                <div style="text-align: center;">
                    <div style="color: #ff6b6b; margin-bottom: 10px;">⚠️ Ошибка загрузки модели</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">
                        1. Проверьте путь к файлу<br>
                        2. Формат должен быть .glb или .gltf<br>
                        3. Файл должен быть в папке models/
                    </div>
                </div>
            `;
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
    
    // Выводим версию Three.js в консоль
    console.log(`🎮 Three.js ${THREE.REVISION} готов к работе!`);
}

// Запускаем когда вся страница загружена
window.addEventListener('DOMContentLoaded', init);
