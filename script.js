// Основная функция, которая запустится при загрузке страницы
function init() {
    console.log("🚀 Запуск 3D сцены...");
    
    // ---------- 1. СОЗДАЕМ СЦЕНУ ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // ---------- 2. КАМЕРА ----------
    const camera = new THREE.PerspectiveCamera(
        75, // угол обзора
        window.innerWidth / window.innerHeight, // соотношение сторон
        0.1, // ближняя плоскость
        1000 // дальняя плоскость
    );
    camera.position.set(5, 3, 10); // x, y, z
    
    // ---------- 3. РЕНДЕРЕР ----------
    const container = document.getElementById('model-container');
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // для ретины
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // ---------- 4. ОСВЕЩЕНИЕ ----------
    // Мягкий рассеянный свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Направленный свет (как солнце)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Задняя подсветка для объема
    const backLight = new THREE.DirectionalLight(0x4466cc, 0.4);
    backLight.position.set(-10, 0, -10);
    scene.add(backLight);
    
    // ---------- 5. УПРАВЛЕНИЕ МЫШКОЙ ----------
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // плавность
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.maxDistance = 50;
    controls.minDistance = 1;
    
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
    `;
    loadingText.textContent = '🔄 Загрузка 3D модели...';
    container.appendChild(loadingText);
    
    // ПУТЬ К МОДЕЛИ - ИЗМЕНИТЕ ЭТУ СТРОКУ!
    const modelPath = 'models/Для презентации.glb'; // ← ЗАМЕНИТЕ НА СВОЙ ФАЙЛ
    
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
            
            // Настраиваем тени
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Центрируем модель
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Автоматически настраиваем камеру под модель
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            
            camera.position.z = cameraZ * 1.5;
            controls.target.copy(center);
            controls.update();
            
            console.log(`📏 Размер модели: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
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
    
    // ---------- 7. ДОБАВЛЯЕМ СЕТКУ ПОЛа (опционально) ----------
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -2;
    scene.add(gridHelper);
    
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
    
    // Выводим версию Three.js в консоль
    console.log(`🎮 Three.js ${THREE.REVISION} готов к работе!`);
}

// Запускаем когда вся страница загружена
window.addEventListener('DOMContentLoaded', init);
