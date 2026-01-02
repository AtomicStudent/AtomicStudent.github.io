// Основная функция, которая запустится при загрузке страницы
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(-10, 5, -10);
    scene.add(backLight);
    
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
    loadingText.style.position = 'absolute';
    loadingText.style.top = '50%';
    loadingText.style.left = '50%';
    loadingText.style.transform = 'translate(-50%, -50%)';
    loadingText.style.color = 'white';
    loadingText.style.fontSize = '1.2rem';
    loadingText.style.zIndex = '100';
    loadingText.style.textAlign = 'center';
    loadingText.textContent = 'Загрузка 3D модели...';
    container.appendChild(loadingText);
    
    // ПУТЬ К МОДЕЛИ - ИЗМЕНИТЕ ЭТУ СТРОКУ!
    const modelPath = 'models/Reactor.glb';
    
    loader.load(
        modelPath,
        function(gltf) {
            console.log('Модель загружена!');
            
            const model = gltf.scene;
            scene.add(model);
            
            container.removeChild(loadingText);
            
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;
            
            const maxDim = Math.max(size.x, size.y, size.z);
            console.log('Размер модели: ' + size.x.toFixed(2) + ' x ' + size.y.toFixed(2) + ' x ' + size.z.toFixed(2) + ' единиц');
            console.log('Максимальный размер: ' + maxDim.toFixed(2));
            
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
            
            camera.position.set(cameraDistance, cameraDistance * 0.4, cameraDistance);
            camera.lookAt(0, 0, 0);
            
            controls.target.set(0, 0, 0);
            controls.maxDistance = cameraDistance * 3;
            controls.update();
            
            console.log('Камера установлена на расстоянии: ' + cameraDistance.toFixed(2));
            
            const gridSize = Math.max(10, maxDim * 2);
            const gridHelper = new THREE.GridHelper(gridSize, 20, 0x444444, 0x222222);
            gridHelper.position.y = -size.y / 2;
            scene.add(gridHelper);
            
            const axesHelper = new THREE.AxesHelper(maxDim);
            scene.add(axesHelper);
            
            const boxHelper = new THREE.BoxHelper(model, 0xffff00);
            scene.add(boxHelper);
        },
        function(xhr) {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            loadingText.textContent = 'Загрузка: ' + percent + '%';
            console.log('Загружено: ' + percent + '%');
        },
        function(error) {
            console.error('Ошибка загрузки модели:', error);
            
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<div style="text-align: center;">' +
                '<div style="color: #ff6b6b; margin-bottom: 10px;">Ошибка загрузки модели</div>' +
                '<div style="font-size: 0.9rem; opacity: 0.8;">' +
                '1. Проверьте путь к файлу<br>' +
                '2. Формат должен быть .glb или .gltf<br>' +
                '3. Файл должен быть в папке models/' +
                '</div>' +
                '</div>';
            
            loadingText.innerHTML = '';
            loadingText.appendChild(errorDiv);
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
    
    console.log('Three.js ' + THREE.REVISION + ' готов к работе!');
}

// Запускаем когда вся страница загружена
window.addEventListener('DOMContentLoaded', init);