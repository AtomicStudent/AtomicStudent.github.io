function init() {
    console.log("Запуск интерактивного 3D просмотрщика...");
    
    // ---------- 1. СОЗДАЕМ СЦЕНУ ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Чёрный фон
    
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
    
    // ---------- 6. ПЕРЕМЕННЫЕ ДЛЯ УПРАВЛЕНИЯ ----------
    let model = null;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let selectedPart = null;
    
    // Состояние разборки
    const partStates = {
        corpus: { originalPosition: null, detached: false, color: 0x4a90e2 }, // Синий
        tvs: { originalPosition: null, detached: false, color: 0x68d391 },   // Зеленый
        lid: { originalPosition: null, detached: false, color: 0xed8936 }    // Оранжевый
    };
    
    // Информация о деталях
    const partInfo = {
        corpus: {
            name: "Корпус реактора",
            description: "Основная несущая конструкция реактора, выполненная из нержавеющей стали. Предназначена для размещения активной зоны и теплоносителя.",
            specs: [
                "Материал: Нержавеющая сталь 08Х18Н10Т",
                "Высота: 3000 мм",
                "Диаметр: 500 мм",
                "Толщина стенки: 50 мм",
                "Масса: 1200 кг",
                "Рабочее давление: 16 МПа",
                "Температура: 350°C"
            ]
        },
        tvs: {
            name: "ТВС (Тепловыделяющая сборка)",
            description: "Сборка тепловыделяющих элементов, содержащая ядерное топливо. Обеспечивает управляемую цепную реакцию и отвод тепла.",
            specs: [
                "Тип: ТВС-2М",
                "Количество ТВЭЛов: 312",
                "Материал оболочки: Циркониевый сплав",
                "Высота: 2500 мм",
                "Диаметр: 150 мм",
                "Масса: 700 кг",
                "Тепловая мощность: 3 МВт"
            ]
        },
        lid: {
            name: "Крышка реактора",
            description: "Верхняя крышка реактора с системой уплотнений. Обеспечивает герметичность реакторного пространства и доступ для перегрузки топлива.",
            specs: [
                "Материал: Нержавеющая сталь 08Х18Н10Т",
                "Диаметр: 520 мм",
                "Толщина: 100 мм",
                "Масса: 300 кг",
                "Количество шпилек: 24",
                "Сила затяжки: 150 кН",
                "Тип уплотнения: Металлическое кольцо"
            ]
        }
    };
    
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
    loadingText.textContent = 'Загрузка модели реактора...';
    container.appendChild(loadingText);
    
    const modelPath = 'models/Reactor.glb';
    
    loader.load(
        modelPath,
        function(gltf) {
            console.log('✅ Модель реактора загружена!');
            
            model = gltf.scene;
            scene.add(model);
            
            container.removeChild(loadingText);
            
            // Назначение цветов деталям
            console.log('🔧 Настройка деталей реактора...');
            
            // Предполагаем, что модель состоит из одного меша
            // Мы создадим три группы для разных частей
            createPartsFromModel();
            
            // Настройка камеры
            setupCamera();
            
            console.log('🎮 Реактор готов к интерактивному просмотру');
            
            // Инициализация управления
            initControls();
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
            loadingText.innerHTML = '<div style="color: #ff6b6b;">Ошибка загрузки модели реактора</div>';
        }
    );
    
    // ---------- 8. ФУНКЦИИ ДЛЯ РАБОТЫ С МОДЕЛЬЮ ----------
    
    function createPartsFromModel() {
        // Создаем группы для каждой части
        const corpusGroup = new THREE.Group();
        const tvsGroup = new THREE.Group();
        const lidGroup = new THREE.Group();
        
        // Копируем модель в каждую группу (в реальном проекте нужно разделить модель)
        const corpusMesh = model.clone();
        const tvsMesh = model.clone();
        const lidMesh = model.clone();
        
        // Назначаем материалы
        corpusMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: partStates.corpus.color,
                    roughness: 0.6,
                    metalness: 0.4,
                    side: THREE.DoubleSide
                });
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.partType = 'corpus';
            }
        });
        
        tvsMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: partStates.tvs.color,
                    roughness: 0.5,
                    metalness: 0.3,
                    side: THREE.DoubleSide
                });
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.partType = 'tvs';
            }
        });
        
        lidMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: partStates.lid.color,
                    roughness: 0.7,
                    metalness: 0.5,
                    side: THREE.DoubleSide
                });
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.partType = 'lid';
            }
        });
        
        // Добавляем в группы
        corpusGroup.add(corpusMesh);
        tvsGroup.add(tvsMesh);
        lidGroup.add(lidMesh);
        
        // Добавляем группы в сцену
        scene.add(corpusGroup);
        scene.add(tvsGroup);
        scene.add(lidGroup);
        
        // Удаляем оригинальную модель
        scene.remove(model);
        
        // Сохраняем ссылки
        partStates.corpus.group = corpusGroup;
        partStates.tvs.group = tvsGroup;
        partStates.lid.group = lidGroup;
        
        // Позиционируем части
        positionParts();
    }
    
    function positionParts() {
        // Корпус - внизу
        partStates.corpus.group.position.set(0, -150, 0);
        partStates.corpus.originalPosition = partStates.corpus.group.position.clone();
        
        // ТВС - по центру
        partStates.tvs.group.position.set(0, 0, 0);
        partStates.tvs.originalPosition = partStates.tvs.group.position.clone();
        
        // Крышка - сверху
        partStates.lid.group.position.set(0, 150, 0);
        partStates.lid.originalPosition = partStates.lid.group.position.clone();
        
        // Ручная корректировка позиции (из предыдущей версии)
        partStates.corpus.group.position.y += -33;
        partStates.corpus.group.position.z += 119.3;
        partStates.tvs.group.position.y += -33;
        partStates.tvs.group.position.z += 119.3;
        partStates.lid.group.position.y += -33;
        partStates.lid.group.position.z += 119.3;
    }
    
    function setupCamera() {
        // Настраиваем камеру для обзора всей сборки
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        let cameraDistance = maxDim * 2;
        cameraDistance = Math.max(cameraDistance, 200);
        
        camera.position.set(0, cameraDistance * 0.3, cameraDistance);
        camera.lookAt(0, 0, 0);
        
        controls.target.set(0, 0, 0);
        controls.maxDistance = cameraDistance * 4;
        controls.minDistance = maxDim * 0.3;
        controls.update();
    }
    
    // ---------- 9. ФУНКЦИИ ДЛЯ РАЗБОРКИ/СБОРКИ ----------
    
    function disassembleReactor() {
        console.log('🔧 Разборка реактора...');
        
        // Анимация перемещения частей
        animatePart(partStates.corpus, new THREE.Vector3(0, -300, 0), 1500); // Вниз
        animatePart(partStates.tvs, new THREE.Vector3(200, 0, 0), 1500);     // Вправо
        animatePart(partStates.lid, new THREE.Vector3(0, 300, 0), 1500);    // Вверх
        
        updateSelectionIndicator('Реактор разобран');
    }
    
    function assembleReactor() {
        console.log('🔧 Сборка реактора...');
        
        // Возвращаем части на исходные позиции
        animatePart(partStates.corpus, partStates.corpus.originalPosition, 1500);
        animatePart(partStates.tvs, partStates.tvs.originalPosition, 1500);
        animatePart(partStates.lid, partStates.lid.originalPosition, 1500);
        
        updateSelectionIndicator('Реактор собран');
    }
    
    function movePart(partName, direction) {
        const part = partStates[partName];
        if (!part) return;
        
        let targetPosition;
        switch(direction) {
            case 'down':
                targetPosition = part.group.position.clone().add(new THREE.Vector3(0, -100, 0));
                break;
            case 'up':
                targetPosition = part.group.position.clone().add(new THREE.Vector3(0, 100, 0));
                break;
            case 'right':
                targetPosition = part.group.position.clone().add(new THREE.Vector3(100, 0, 0));
                break;
            case 'left':
                targetPosition = part.group.position.clone().add(new THREE.Vector3(-100, 0, 0));
                break;
            default:
                return;
        }
        
        animatePart(part, targetPosition, 800);
        updateSelectionIndicator(`Движение: ${partName}`);
    }
    
    function animatePart(part, targetPosition, duration) {
        const startPosition = part.group.position.clone();
        const startTime = Date.now();
        
        function updateAnimation() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Плавная анимация с easing
            const easeProgress = easeInOutCubic(progress);
            
            part.group.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(updateAnimation);
            }
        }
        
        updateAnimation();
    }
    
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // ---------- 10. ВЫБОР И ИНФОРМАЦИЯ О ДЕТАЛЯХ ----------
    
    function initControls() {
        // Обработка кликов по модели
        container.addEventListener('click', onMouseClick, false);
        
        // Кнопки управления
        document.getElementById('assemble-btn').addEventListener('click', assembleReactor);
        document.getElementById('disassemble-btn').addEventListener('click', disassembleReactor);
        
        document.getElementById('move-corpus-btn').addEventListener('click', () => movePart('corpus', 'down'));
        document.getElementById('move-tvs-btn').addEventListener('click', () => movePart('tvs', 'right'));
        document.getElementById('move-lid-btn').addEventListener('click', () => movePart('lid', 'up'));
        
        // Закрытие информационной панели
        document.getElementById('close-info-btn').addEventListener('click', closeInfoPanel);
    }
    
    function onMouseClick(event) {
        // Вычисляем позицию мыши в нормализованных координатах (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Обновляем луч
        raycaster.setFromCamera(mouse, camera);
        
        // Проверяем пересечения со всеми объектами сцены
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            
            // Ищем родительскую группу с информацией о детали
            let partType = null;
            let currentObj = clickedObject;
            
            while (currentObj && !partType) {
                if (currentObj.userData.partType) {
                    partType = currentObj.userData.partType;
                }
                currentObj = currentObj.parent;
            }
            
            if (partType && partStates[partType]) {
                selectPart(partType);
            }
        }
    }
    
    function selectPart(partType) {
        selectedPart = partType;
        
        // Подсвечиваем выбранную деталь
        Object.keys(partStates).forEach(key => {
            const part = partStates[key];
            if (part.group) {
                part.group.traverse((child) => {
                    if (child.isMesh) {
                        if (key === partType) {
                            // Выделяем выбранную деталь
                            child.material.emissive = new THREE.Color(0x333333);
                            child.material.emissiveIntensity = 0.5;
                        } else {
                            // Снимаем выделение с остальных
                            child.material.emissive = new THREE.Color(0x000000);
                            child.material.emissiveIntensity = 0;
                        }
                        child.material.needsUpdate = true;
                    }
                });
            }
        });
        
        // Показываем информацию
        showPartInfo(partType);
        updateSelectionIndicator(partInfo[partType].name);
    }
    
    function showPartInfo(partType) {
        const info = partInfo[partType];
        
        document.getElementById('part-name').textContent = info.name;
        document.getElementById('part-description').textContent = info.description;
        
        const specsList = document.getElementById('specs-list');
        specsList.innerHTML = '';
        
        info.specs.forEach(spec => {
            const li = document.createElement('li');
            li.textContent = spec;
            specsList.appendChild(li);
        });
        
        // Показываем панель
        document.getElementById('info-panel').classList.add('active');
    }
    
    function closeInfoPanel() {
        document.getElementById('info-panel').classList.remove('active');
        
        // Снимаем выделение
        if (selectedPart) {
            partStates[selectedPart].group.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
            selectedPart = null;
            updateSelectionIndicator('Ничего');
        }
    }
    
    function updateSelectionIndicator(text) {
        document.getElementById('selected-part').textContent = text;
    }
    
    // ---------- 11. АНИМАЦИЯ И ОБРАБОТКА РЕСАЙЗА ----------
    
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    window.addEventListener('resize', onWindowResize);
    
    console.log('🚀 3D просмотрщик готов к работе!');
}

// Запускаем когда вся страница загружена
window.addEventListener('DOMContentLoaded', init);