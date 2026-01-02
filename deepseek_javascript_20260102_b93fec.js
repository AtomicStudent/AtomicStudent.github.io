function init() {
    console.log("Запуск интерактивного 3D просмотрщика...");
    
    // ========== НАСТРОЙКИ ДЛЯ РУЧНОЙ КОРРЕКТИРОВКИ ==========
    // МОЖНО МЕНЯТЬ ЭТИ ПАРАМЕТРЫ БЕЗ ИЗМЕНЕНИЯ ОСНОВНОЙ ЛОГИКИ
    
    // Расстояния разлёта деталей (в единицах Three.js)
    const DISASSEMBLY_DISTANCE = {
        CORPUS_DOWN: -500,    // Корпус улетает вниз (отрицательное значение)
        LID_UP: 500,          // Крышка улетает вверх (положительное значение)
        TVS_STAYS: 0          // ТВС остаётся на месте
    };
    
    // Параметры гексагональной упаковки ТВС
    const TVS_HEX_GRID = {
        SPACING: 50,          // Расстояние между ТВС
        DELAY: 500,           // Задержка перед разъездом ТВС (мс)
        ANIMATION_DURATION: 800 // Длительность анимации разъезда ТВС
    };
    
    // Цвета деталей в разобранном состоянии
    const PART_COLORS = {
        ASSEMBLY: 0x808080,   // Серый цвет для сборки
        CORPUS: 0x4a90e2,     // Синий для корпуса
        TVS: 0x68d391,        // Зелёный для ТВС
        LID: 0xed8936         // Оранжевый для крышки
    };
    
    // Скорости анимаций (в миллисекундах)
    const ANIMATION_DURATION = {
        FADE: 500,            // Плавное появление/исчезновение
        MOVE: 1000            // Движение деталей
    };
    
    // Ручная корректировка позиций отдельных деталей (если нужно подогнать)
    const MANUAL_POSITION_CORRECTION = {
        CORPUS: { x: 0, y: 0, z: 0 },     // Корректировка позиции корпуса
        TVS: { x: 0, y: 0, z: 0 },        // Корректировка позиции ТВС (центральной)
        LID: { x: 0, y: 0, z: 0 }         // Корректировка позиции крышки
    };
    // ========== КОНЕЦ НАСТРОЕК ДЛЯ РУЧНОЙ КОРРЕКТИРОВКИ ==========
    
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
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let selectedPart = null;
    let currentState = 'assembled'; // 'assembled' или 'disassembled'
    let tvsDisassembled = false;    // Флаг, разъехались ли ТВС
    
    // Объекты для хранения моделей
    const models = {
        assembly: null,  // Полная сборка
        corpus: null,    // Корпус отдельно
        lid: null        // Крышка отдельно
    };
    
    // Массив для 7 ТВС
    let tvsModels = [];
    
    // Позиции для анимации
    const partPositions = {
        assembled: {
            corpus: new THREE.Vector3(0, 0, 0),
            lid: new THREE.Vector3(0, 0, 0)
        },
        disassembled: {
            corpus: new THREE.Vector3(0, DISASSEMBLY_DISTANCE.CORPUS_DOWN, 0),
            lid: new THREE.Vector3(0, DISASSEMBLY_DISTANCE.LID_UP, 0)
        }
    };
    
    // Позиции для ТВС в гексагональной упаковке
    const tvsHexPositions = generateHexagonPositions(7, TVS_HEX_GRID.SPACING);
    
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
                "Количество ТВС: 7",
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
    
    // ---------- 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    
    // Функция для генерации позиций в гексагональной упаковке
    function generateHexagonPositions(count, spacing) {
        const positions = [];
        
        if (count === 1) {
            // Одна ТВС в центре
            positions.push(new THREE.Vector3(0, 0, 0));
        } else if (count === 7) {
            // 7 ТВС: одна в центре, 6 вокруг
            positions.push(new THREE.Vector3(0, 0, 0)); // Центральная
            
            const angleStep = (2 * Math.PI) / 6;
            for (let i = 0; i < 6; i++) {
                const angle = i * angleStep;
                const x = Math.cos(angle) * spacing;
                const z = Math.sin(angle) * spacing;
                positions.push(new THREE.Vector3(x, 0, z));
            }
        } else {
            // Для других количеств - простая сетка
            const gridSize = Math.ceil(Math.sqrt(count));
            const halfSize = (gridSize - 1) * spacing * 0.5;
            
            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / gridSize);
                const col = i % gridSize;
                const x = (col - gridSize / 2 + 0.5) * spacing;
                const z = (row - gridSize / 2 + 0.5) * spacing;
                positions.push(new THREE.Vector3(x, 0, z));
            }
        }
        
        return positions;
    }
    
    // ---------- 8. ЗАГРУЗКА ВСЕХ МОДЕЛЕЙ ----------
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
    loadingText.textContent = 'Загрузка моделей реактора...';
    container.appendChild(loadingText);
    
    // Пути к моделям (ИЗМЕНИТЕ НА ВАШИ ФАЙЛЫ!)
    const modelPaths = {
        assembly: 'models/reactor_assembly.glb',  // Полная сборка
        corpus: 'models/reactor_corpus.glb',      // Корпус отдельно
        tvs: 'models/reactor_tvs.glb',            // Одна ТВС (будем клонировать)
        lid: 'models/reactor_lid.glb'             // Крышка отдельно
    };
    
    let modelsLoaded = 0;
    const totalModels = 4; // assembly, corpus, tvs, lid
    
    // Функция загрузки одной модели
    function loadModel(key, path) {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    console.log(`✅ Модель ${key} загружена`);
                    
                    if (key === 'tvs') {
                        // Для ТВС создаем 7 клонов
                        for (let i = 0; i < 7; i++) {
                            const model = gltf.scene.clone();
                            
                            // Настройка материалов
                            model.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    
                                    // Изначально серый
                                    child.material = new THREE.MeshStandardMaterial({
                                        color: 0x808080,
                                        roughness: 0.6,
                                        metalness: 0.5,
                                        side: THREE.DoubleSide
                                    });
                                    
                                    // Сохраняем целевой цвет
                                    child.userData.targetColor = new THREE.Color(PART_COLORS.TVS);
                                    child.userData.partType = 'tvs';
                                    child.userData.tvsIndex = i;
                                }
                            });
                            
                            // Применяем ручную корректировку позиции если нужно
                            const correction = MANUAL_POSITION_CORRECTION.TVS || { x: 0, y: 0, z: 0 };
                            model.position.x += correction.x;
                            model.position.y += correction.y;
                            model.position.z += correction.z;
                            
                            tvsModels.push(model);
                        }
                        resolve(tvsModels);
                    } else {
                        const model = gltf.scene;
                        
                        // Настройка материалов в зависимости от типа модели
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                if (key === 'assembly') {
                                    // Для сборки - серый металлический цвет
                                    child.material = new THREE.MeshStandardMaterial({
                                        color: PART_COLORS.ASSEMBLY,
                                        roughness: 0.6,
                                        metalness: 0.7,
                                        side: THREE.DoubleSide
                                    });
                                } else {
                                    // Для отдельных деталей - пока серый, при разборке поменяем
                                    const partColor = PART_COLORS[key.toUpperCase()] || 0x808080;
                                    child.material = new THREE.MeshStandardMaterial({
                                        color: 0x808080, // Изначально серый
                                        roughness: 0.6,
                                        metalness: 0.5,
                                        side: THREE.DoubleSide
                                    });
                                    
                                    // Сохраняем целевой цвет для этой детали
                                    child.userData.targetColor = new THREE.Color(partColor);
                                    child.userData.partType = key;
                                }
                                
                                child.userData.modelKey = key;
                            }
                        });
                        
                        // Применяем ручную корректировку позиции если нужно
                        if (key !== 'assembly') {
                            const correctionKey = key.toUpperCase();
                            const correction = MANUAL_POSITION_CORRECTION[correctionKey] || { x: 0, y: 0, z: 0 };
                            model.position.x += correction.x;
                            model.position.y += correction.y;
                            model.position.z += correction.z;
                        }
                        
                        models[key] = model;
                        resolve(model);
                    }
                    
                    modelsLoaded++;
                    
                    // Обновляем прогресс загрузки
                    const percent = Math.round((modelsLoaded / totalModels) * 100);
                    loadingText.textContent = `Загрузка моделей: ${percent}%`;
                },
                (xhr) => {
                    // Прогресс загрузки отдельной модели
                },
                (error) => {
                    console.error(`❌ Ошибка загрузки модели ${key}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    // Загружаем все модели
    Promise.all([
        loadModel('assembly', modelPaths.assembly),
        loadModel('corpus', modelPaths.corpus),
        loadModel('tvs', modelPaths.tvs),
        loadModel('lid', modelPaths.lid)
    ]).then(() => {
        console.log('✅ Все модели загружены!');
        console.log(`✅ Создано ${tvsModels.length} ТВС`);
        
        // Удаляем сообщение о загрузке
        container.removeChild(loadingText);
        
        // Добавляем только сборку в сцену
        scene.add(models.assembly);
        
        // Настройка позиций моделей
        setupModelsPosition();
        
        // Настройка камеры
        setupCamera();
        
        // Инициализация управления
        initControls();
        
        console.log('🎮 Реактор готов к интерактивному просмотру');
    }).catch((error) => {
        console.error('❌ Ошибка при загрузке моделей:', error);
        loadingText.innerHTML = '<div style="color: #ff6b6b;">Ошибка загрузки моделей. Проверьте консоль.</div>';
    });
    
    // ---------- 9. ФУНКЦИИ ДЛЯ РАБОТЫ С МОДЕЛЯМИ ----------
    
    function setupModelsPosition() {
        // Позиционируем отдельные детали в те же координаты, что и сборка
        
        // Сначала получаем bounding box сборки
        const assemblyBox = new THREE.Box3().setFromObject(models.assembly);
        const assemblyCenter = assemblyBox.getCenter(new THREE.Vector3());
        
        // Позиционируем корпус и крышку
        ['corpus', 'lid'].forEach(key => {
            if (models[key]) {
                // Позиционируем в центр сцены (0,0,0)
                models[key].position.set(0, 0, 0);
                
                // Сохраняем стартовую позицию
                partPositions.assembled[key] = models[key].position.clone();
                
                // Рассчитываем позицию для разборки
                partPositions.disassembled[key] = new THREE.Vector3(
                    partPositions.assembled[key].x,
                    partPositions.assembled[key].y + 
                        (key === 'corpus' ? DISASSEMBLY_DISTANCE.CORPUS_DOWN : DISASSEMBLY_DISTANCE.LID_UP),
                    partPositions.assembled[key].z
                );
            }
        });
        
        // Позиционируем все ТВС в одну точку (центр)
        tvsModels.forEach((tvs, index) => {
            tvs.position.set(0, 0, 0);
            tvs.userData.originalPosition = tvs.position.clone();
            tvs.userData.hexPosition = tvsHexPositions[index] || new THREE.Vector3(0, 0, 0);
        });
    }
    
    function setupCamera() {
        // Настраиваем камеру для обзора сборки
        const box = new THREE.Box3().setFromObject(models.assembly);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        let cameraDistance = maxDim * 2.5;
        cameraDistance = Math.max(cameraDistance, 200);
        
        camera.position.set(0, cameraDistance * 0.3, cameraDistance);
        camera.lookAt(0, 0, 0);
        
        controls.target.set(0, 0, 0);
        controls.maxDistance = cameraDistance * 4;
        controls.minDistance = maxDim * 0.3;
        controls.update();
    }
    
    // ---------- 10. ФУНКЦИИ ДЛЯ РАЗБОРКИ/СБОРКИ ----------
    
    function disassembleReactor() {
        if (currentState === 'disassembled') return;
        console.log('🔧 Разборка реактора...');
        
        currentState = 'disassembled';
        tvsDisassembled = false;
        
        // Этап 1: Плавное исчезновение сборки
        fadeOutModel(models.assembly, ANIMATION_DURATION.FADE, () => {
            // Убираем сборку из сцены
            scene.remove(models.assembly);
            
            // Этап 2: Добавляем отдельные детали в сцену
            scene.add(models.corpus);
            scene.add(models.lid);
            tvsModels.forEach(tvs => scene.add(tvs));
            
            // Начинаем с прозрачности 0
            setModelOpacity(models.corpus, 0);
            setModelOpacity(models.lid, 0);
            tvsModels.forEach(tvs => setModelOpacity(tvs, 0));
            
            // Этап 3: Плавное появление деталей
            Promise.all([
                fadeInModel(models.corpus, ANIMATION_DURATION.FADE),
                fadeInModel(models.lid, ANIMATION_DURATION.FADE),
                ...tvsModels.map(tvs => fadeInModel(tvs, ANIMATION_DURATION.FADE))
            ]).then(() => {
                // Этап 4: Меняем цвета на насыщенные
                changePartsColorToVibrant();
                
                // Этап 5: Анимация разлёта корпуса и крышки
                Promise.all([
                    animatePart(models.corpus, partPositions.disassembled.corpus, ANIMATION_DURATION.MOVE),
                    animatePart(models.lid, partPositions.disassembled.lid, ANIMATION_DURATION.MOVE)
                ]).then(() => {
                    // Этап 6: Задержка, затем разъезд ТВС
                    setTimeout(() => {
                        disassembleTVS();
                    }, TVS_HEX_GRID.DELAY);
                });
            });
        });
    }
    
    function disassembleTVS() {
        console.log('🔧 Разъезд 7 ТВС в гексагональную упаковку...');
        tvsDisassembled = true;
        
        // Анимация разъезда всех ТВС
        const animations = tvsModels.map((tvs, index) => {
            const targetPos = tvs.userData.hexPosition.clone();
            return animatePart(tvs, targetPos, TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        Promise.all(animations).then(() => {
            updateSelectionIndicator('ТВС разъехались');
            console.log('✅ ТВС разъехались');
        });
    }
    
    function assembleReactor() {
        if (currentState === 'assembled') return;
        console.log('🔧 Сборка реактора...');
        
        // Если ТВС разъехались, сначала собираем их обратно
        if (tvsDisassembled) {
            assembleTVS().then(() => {
                // После сборки ТВС продолжаем общую сборку
                continueAssembly();
            });
        } else {
            // Если ТВС еще не разъехались, сразу продолжаем сборку
            continueAssembly();
        }
    }
    
    function assembleTVS() {
        console.log('🔧 Сборка ТВС в центр...');
        
        // Анимация сборки всех ТВС в одну точку
        const animations = tvsModels.map(tvs => {
            return animatePart(tvs, tvs.userData.originalPosition, TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        return Promise.all(animations).then(() => {
            tvsDisassembled = false;
            console.log('✅ ТВС собраны в центр');
        });
    }
    
    function continueAssembly() {
        // Этап 1: Возвращаем корпус и крышку в исходные позиции
        Promise.all([
            animatePart(models.corpus, partPositions.assembled.corpus, ANIMATION_DURATION.MOVE),
            animatePart(models.lid, partPositions.assembled.lid, ANIMATION_DURATION.MOVE)
        ]).then(() => {
            // Этап 2: Меняем цвета обратно на серый
            changePartsColorToGray();
            
            // Этап 3: Плавное исчезновение деталей
            Promise.all([
                fadeOutModel(models.corpus, ANIMATION_DURATION.FADE),
                fadeOutModel(models.lid, ANIMATION_DURATION.FADE),
                ...tvsModels.map(tvs => fadeOutModel(tvs, ANIMATION_DURATION.FADE))
            ]).then(() => {
                // Убираем детали из сцены
                scene.remove(models.corpus);
                scene.remove(models.lid);
                tvsModels.forEach(tvs => scene.remove(tvs));
                
                // Этап 4: Добавляем сборку в сцену
                scene.add(models.assembly);
                setModelOpacity(models.assembly, 0);
                
                // Этап 5: Плавное появление сборки
                fadeInModel(models.assembly, ANIMATION_DURATION.FADE, () => {
                    currentState = 'assembled';
                    updateSelectionIndicator('Собран');
                    console.log('✅ Сборка завершена');
                });
            });
        });
    }
    
    // ---------- 11. ФУНКЦИИ АНИМАЦИИ ----------
    
    function fadeInModel(model, duration) {
        return new Promise((resolve) => {
            let opacity = 0;
            const startTime = Date.now();
            
            function updateFade() {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                opacity = progress;
                setModelOpacity(model, opacity);
                
                if (progress < 1) {
                    requestAnimationFrame(updateFade);
                } else {
                    resolve();
                }
            }
            
            updateFade();
        });
    }
    
    function fadeOutModel(model, duration, onComplete) {
        return new Promise((resolve) => {
            let opacity = 1;
            const startTime = Date.now();
            
            function updateFade() {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                opacity = 1 - progress;
                setModelOpacity(model, opacity);
                
                if (progress < 1) {
                    requestAnimationFrame(updateFade);
                } else {
                    if (onComplete) onComplete();
                    resolve();
                }
            }
            
            updateFade();
        });
    }
    
    function setModelOpacity(model, opacity) {
        if (Array.isArray(model)) {
            model.forEach(m => setModelOpacity(m, opacity));
        } else {
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.transparent = opacity < 1;
                    child.material.opacity = opacity;
                    child.material.needsUpdate = true;
                }
            });
        }
    }
    
    function animatePart(model, targetPosition, duration) {
        return new Promise((resolve) => {
            const startPosition = model.position.clone();
            const startTime = Date.now();
            
            function updateAnimation() {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Плавная анимация с easing
                const easeProgress = easeInOutCubic(progress);
                
                model.position.lerpVectors(startPosition, targetPosition, easeProgress);
                
                if (progress < 1) {
                    requestAnimationFrame(updateAnimation);
                } else {
                    resolve();
                }
            }
            
            updateAnimation();
        });
    }
    
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    function changePartsColorToVibrant() {
        // Меняем цвета деталей на насыщенные
        ['corpus', 'lid'].forEach(key => {
            if (models[key]) {
                models[key].traverse((child) => {
                    if (child.isMesh && child.userData.targetColor) {
                        child.material.color = child.userData.targetColor;
                        child.material.emissive = child.userData.targetColor.clone().multiplyScalar(0.1);
                        child.material.emissiveIntensity = 0.2;
                        child.material.needsUpdate = true;
                    }
                });
            }
        });
        
        // Меняем цвет ТВС
        tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.emissive = child.userData.targetColor.clone().multiplyScalar(0.1);
                    child.material.emissiveIntensity = 0.2;
                    child.material.needsUpdate = true;
                }
            });
        });
    }
    
    function changePartsColorToGray() {
        // Возвращаем серый цвет
        ['corpus', 'lid'].forEach(key => {
            if (models[key]) {
                models[key].traverse((child) => {
                    if (child.isMesh) {
                        child.material.color = new THREE.Color(0x808080);
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                        child.material.needsUpdate = true;
                    }
                });
            }
        });
        
        // Возвращаем серый цвет для ТВС
        tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = new THREE.Color(0x808080);
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        });
    }
    
    // ---------- 12. ВЫБОР И ИНФОРМАЦИЯ О ДЕТАЛЯХ ----------
    
    function initControls() {
        // Обработка кликов по модели
        container.addEventListener('click', onMouseClick, false);
        
        // Кнопки управления
        document.getElementById('assemble-btn').addEventListener('click', assembleReactor);
        document.getElementById('disassemble-btn').addEventListener('click', disassembleReactor);
        
        // Закрытие информационной панели
        document.getElementById('close-info-btn').addEventListener('click', closeInfoPanel);
    }
    
    function onMouseClick(event) {
        // Только в разобранном состоянии можно выбирать детали
        if (currentState !== 'disassembled') return;
        
        // Вычисляем позицию мыши в нормализованных координатах (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Обновляем луч
        raycaster.setFromCamera(mouse, camera);
        
        // Проверяем пересечения со всеми объектами сцены
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            
            // Ищем родительский объект с информацией о детали
            let partType = null;
            let currentObj = clickedObject;
            
            while (currentObj && !partType) {
                if (currentObj.userData.partType) {
                    partType = currentObj.userData.partType;
                    break;
                }
                currentObj = currentObj.parent;
            }
            
            if (partType && partInfo[partType]) {
                selectPart(partType);
            }
        }
    }
    
    function selectPart(partType) {
        selectedPart = partType;
        
        // Подсвечиваем выбранную деталь
        if (partType === 'tvs') {
            // Для ТВС подсвечиваем все или конкретную?
            tvsModels.forEach(tvs => {
                tvs.traverse((child) => {
                    if (child.isMesh) {
                        child.material.emissiveIntensity = 0.2;
                        child.material.needsUpdate = true;
                    }
                });
            });
        } else if (models[partType]) {
            // Для других деталей
            models[partType].traverse((child) => {
                if (child.isMesh) {
                    child.material.emissiveIntensity = 0.5;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Показываем информацию
        showPartInfo(partType);
        updateSelectionIndicator(`Выбрано: ${partInfo[partType].name}`);
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
            if (selectedPart === 'tvs') {
                tvsModels.forEach(tvs => {
                    tvs.traverse((child) => {
                        if (child.isMesh) {
                            child.material.emissiveIntensity = 0.2;
                            child.material.needsUpdate = true;
                        }
                    });
                });
            } else if (models[selectedPart]) {
                models[selectedPart].traverse((child) => {
                    if (child.isMesh) {
                        child.material.emissiveIntensity = 0.2;
                        child.material.needsUpdate = true;
                    }
                });
            }
            selectedPart = null;
            updateSelectionIndicator(tvsDisassembled ? 'ТВС разъехались' : 'Разобран');
        }
    }
    
    function updateSelectionIndicator(text) {
        document.getElementById('selected-part').textContent = text;
    }
    
    // ---------- 13. АНИМАЦИЯ И ОБРАБОТКА РЕСАЙЗА ----------
    
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