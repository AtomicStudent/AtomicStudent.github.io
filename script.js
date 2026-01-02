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
    camera.position.set(0, 50, 150);
    
    // ---------- 3. РЕНДЕРЕР ----------
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // ---------- 4. ОСВЕЩЕНИЕ ----------
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(100, 200, 50);
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
            
            // Создаем группу для модели
            const group = new THREE.Group();
            scene.add(group);
            
            const model = gltf.scene;
            group.add(model);
            
            // Удаляем сообщение о загрузке
            container.removeChild(loadingText);
            
            // Настройка материалов
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Улучшаем отображение материалов
                    if (child.material) {
                        child.material.needsUpdate = true;
                        child.material.side = THREE.DoubleSide;
                        
                        // Делаем материалы ярче
                        if (child.material.emissive) {
                            child.material.emissive.multiplyScalar(0.5);
                        }
                    }
                }
            });
            
            // Вычисляем размеры до масштабирования
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            console.log('📏 Размеры оригинальной модели:');
            console.log('   X:', size.x.toFixed(1), 'единиц');
            console.log('   Y:', size.y.toFixed(1), 'единиц');
            console.log('   Z:', size.z.toFixed(1), 'единиц');
            console.log('📐 Максимальный размер:', maxDim.toFixed(1), 'единиц');
            
            // Масштабируем модель (уменьшаем в 30 раз)
            const scale = 1 / 30;
            model.scale.setScalar(scale);
            console.log('⚖️ Модель уменьшена в', scale.toFixed(3), 'раза');
            
            // Вычисляем новый bounding box после масштабирования
            const newBox = new THREE.Box3().setFromObject(group);
            const center = newBox.getCenter(new THREE.Vector3());
            const newSize = newBox.getSize(new THREE.Vector3());
            
            console.log('📍 Центр группы:', center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1));
            console.log('📏 Размер после масштабирования:');
            console.log('   X:', newSize.x.toFixed(1), 'единиц');
            console.log('   Y:', newSize.y.toFixed(1), 'единиц');
            console.log('   Z:', newSize.z.toFixed(1), 'единиц');
            
            // ЦЕНТРИРОВАНИЕ: сдвигаем группу, чтобы её центр был в (0,0,0)
            group.position.x = -center.x;
            group.position.y = -center.y;
            group.position.z = -center.z;
            
            console.log('🎯 Группа отцентрирована в (0,0,0)');
            
            // Настраиваем камеру на основе размера модели
            const scaledMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
            let cameraDistance = scaledMaxDim * 2;
            cameraDistance = Math.max(cameraDistance, 50); // Минимальное расстояние
            
            camera.position.set(0, cameraDistance * 0.3, cameraDistance);
            camera.lookAt(0, 0, 0);
            
            controls.target.set(0, 0, 0);
            controls.maxDistance = cameraDistance * 3;
            controls.update();
            
            console.log('📷 Камера установлена на расстоянии:', cameraDistance.toFixed(1));
            console.log('🎮 Модель готова к просмотру');
            
            // ---------- ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ ----------
            
            // Сетка пола (можно убрать)
            const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
            gridHelper.position.y = 0;
            scene.add(gridHelper);
            
            // Оси координат (можно убрать)
            const axesHelper = new THREE.AxesHelper(100);
            scene.add(axesHelper);
            
            // Визуализация bounding box (можно убрать)
            const boxHelper = new THREE.BoxHelper(group, 0x00ff00);
            scene.add(boxHelper);
            
            // Точка в центре сцены (0,0,0) - для проверки центрирования (можно убрать)
            const centerSphere = new THREE.Mesh(
                new THREE.SphereGeometry(2, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            scene.add(centerSphere);
            
            // Точка в центре модели (должна совпадать с красной) (можно убрать)
            const modelCenterSphere = new THREE.Mesh(
                new THREE.SphereGeometry(1.5, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x0000ff })
            );
            modelCenterSphere.position.copy(center);
            scene.add(modelCenterSphere);
            
            console.log('🎯 Красная точка - центр сцены (0,0,0)');
            console.log('🔵 Синяя точка - центр модели (должна совпадать с красной)');
            
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