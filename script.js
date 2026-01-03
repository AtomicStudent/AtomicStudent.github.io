// Основной код просмотрщика реактора РИМ-К-4,5
class ReactorViewer {
    constructor() {
        // Конфигурация из ОРИГИНАЛЬНОГО кода
        const config = {
            DISASSEMBLY_DISTANCE: {
                CORPUS_DOWN: -2500,
                LID_UP: 4100,
                TVS_STAYS: 0
            },
            
            TVS_HEX_GRID: {
                SPACING_SMALL: 120,
                SPACING_LARGE: 450,
                DELAY: 800,
                ANIMATION_DURATION: 2400,
                HEX_ROTATION: 30,
                CENTER_OFFSET: { x: 0, y: 0, z: 0 }
            },
            
            PART_COLORS: {
                ASSEMBLY: 0x7C8B9B,
                CORPUS: 0x4a90e2,
                TVS: 0x4CAF50,
                LID: 0xed8936
            },
            
            ANIMATION_DURATION: {
                FADE: 500,
                MOVE: 2400
            },
            
            // Исправляем: опускаем ВСЕ модели на 800 единиц
            MANUAL_POSITION_CORRECTION: {
                CORPUS: { x: 0, y: -800, z: 0 },
                TVS: { x: 0, y: -800, z: 0 },
                LID: { x: 0, y: 1365, z: 0 } // 2165 - 800 = 1365
            }
        };

        // Информация о деталях из ОРИГИНАЛЬНОГО кода
        const partInfo = {
            corpus: {
                name: "Корпус реактора",
                description: "Основная несущая конструкция реактора, выполненная из ферритно-мартенситной стали.",
                specs: [
                    "Материал: ЭП-823",
                    "Высота: 2545 мм",
                    "Внешний диаметр: 500 мм",
                    "Внутренний диаметр: 400 мм",
                    "Толщина стенки: 50 мм",
                    "Диапазон температур: 500 - 620 Градусов Цельсия"
                ]
            },
            tvs: {
                name: "ТВС (Тепловыделяющая сборка)",
                description: "Сборка тепловыделяющих элементов, содержащая карбидное уран-плутониевое топливо.",
                specs: [
                    "Количество ТВС: 7",
                    "Обогащение по плутонию: 13,5%",
                    "Материал оболочки: Циркониевый сплав",
                    "Высота: 2375 мм",
                    "Диаметр: 112,85 мм",
                    "Тепловая мощность: 4,5 МВт"
                ]
            },
            lid: {
                name: "Крышка реактора",
                description: "Верхняя крышка ядерного реактора.",
                specs: [
                    "Материал: ЭП-823",
                    "Диаметр: 500 мм",
                    "Толщина большей части: 188 мм",
                    "Количество болтов: 28"
                ]
            }
        };

        // Состояние
        const currentState = 'assembled';
        const selectedPart = null;
        const tvsDisassembled = false;
        const isMobile = false;
        const minLoadingTime = 2500; // 2.5 секунды минимальной загрузки
        const loadingStartTime = null;
        
        // Модели
        const models = {
            corpus: null,
            lid: null
        };
        const tvsModels = [];
        const tvsCount = 7;
        
        // Маркеры
        const markers = [];
        
        // Запуск
        const init();
    }

    init() {
        console.log("🚀 Запуск интерактивного 3D просмотрщика реактора РИМ-К-4,5...");
        
        // Определяем мобильное устройство
        const isMobile = const checkIfMobile();
        
        const setupScene();
        const setupCamera();
        const setupRenderer();
        const setupLighting(); // ПРАВИЛЬНОЕ освещение
        const setupControls();
        const setupUI();
        const setupEventListeners();
        
        const loadingStartTime = Date.now();
        const loadModels();
    }

    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }

    setupScene() {
        const scene = new THREE.Scene();
        // Темно-синий фон с глубиной
        const scene.background = new THREE.Color(0x0a0a14);
    }

    setupCamera() {
        const container = document.getElementById('model-container');
        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            50000
        );
        // Камера ближе
        const camera.position.set(0, 800, 1500);
    }

    setupRenderer() {
        const container = document.getElementById('model-container');
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        const renderer.setSize(container.clientWidth, container.clientHeight);
        const renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const renderer.shadowMap.enabled = true;
        const renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(const renderer.domElement);
    }

    setupLighting() {
        // ТОЛЬКО правильное освещение из оригинального кода
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        const scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(100, 200, 100);
        directionalLight.castShadow = true;
        const scene.add(directionalLight);
        
        // Back light
        const backLight = new THREE.DirectionalLight(0xffffff, 1);
        backLight.position.set(-100, 150, -100);
        const scene.add(backLight);
    }

    setupControls() {
        const controls = new THREE.OrbitControls(const camera, const renderer.domElement);
        const controls.enableDamping = true;
        const controls.dampingFactor = 0.05;
        const controls.rotateSpeed = 0.5;
        const controls.panSpeed = 0.5;
        const controls.zoomSpeed = 0.8;
        const controls.minDistance = 10;
        const controls.maxDistance = 2000;
        
        if (const isMobile) {
            const controls.enablePan = false;
            const controls.rotateSpeed = 0.3;
            const controls.zoomSpeed = 0.5;
        }
    }

    setupUI() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = document.getElementById('loading-text');
        const loadingProgress = document.getElementById('loading-progress');
        const loadingError = document.getElementById('loading-error');
        
        const assembleBtn = document.getElementById('assemble-btn');
        const disassembleBtn = document.getElementById('disassemble-btn');
        const resetCameraBtn = document.getElementById('reset-camera');
        const closeInfoBtn = document.getElementById('close-info-btn');
        
        // Мобильные кнопки
        const mobileAssembleBtn = document.getElementById('mobile-assemble');
        const mobileDisassembleBtn = document.getElementById('mobile-disassemble');
        const mobileResetBtn = document.getElementById('mobile-reset');
        const mobileOverlay = document.getElementById('mobile-overlay');
        
        const infoPanel = document.getElementById('info-panel');
        const selectedPartText = document.getElementById('selected-part');
        const stateStatus = document.getElementById('state-status');
        
        const partName = document.getElementById('part-name');
        const partDescription = document.getElementById('part-description');
        const specsList = document.getElementById('specs-list');
        
        if (const isMobile) {
            document.getElementById('mobile-controls').style.display = 'block';
        }
        
        const updateLoadingText('Инициализация 3D среды...');
        const updateLoadingProgress(10);
    }

    setupEventListeners() {
        const assembleBtn.addEventListener('click', () => const assembleReactor());
        const disassembleBtn.addEventListener('click', () => const disassembleReactor());
        const resetCameraBtn.addEventListener('click', () => const resetCamera());
        const closeInfoBtn.addEventListener('click', () => const closeInfoPanel());
        
        const mobileAssembleBtn.addEventListener('click', () => {
            const assembleReactor();
            const hideMobileOverlay();
        });
        const mobileDisassembleBtn.addEventListener('click', () => {
            const disassembleReactor();
            const hideMobileOverlay();
        });
        const mobileResetBtn.addEventListener('click', () => {
            const resetCamera();
            const hideMobileOverlay();
        });
        
        const renderer.domElement.addEventListener('click', (e) => const onModelClick(e));
        
        if (const isMobile) {
            const renderer.domElement.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    const onModelClick(e);
                }
            }, { passive: true });
        }
        
        const mobileOverlay.addEventListener('click', () => const hideMobileOverlay());
        window.addEventListener('resize', () => const onWindowResize());
        
        const animate();
    }

    showMobileOverlay() {
        if (const isMobile) {
            const mobileOverlay.style.display = 'block';
            setTimeout(() => {
                const mobileOverlay.style.opacity = '1';
            }, 10);
        }
    }

    hideMobileOverlay() {
        if (const isMobile) {
            const mobileOverlay.style.opacity = '0';
            setTimeout(() => {
                const mobileOverlay.style.display = 'none';
            }, 300);
        }
    }

    updateLoadingText(text) {
        if (const loadingText) {
            const loadingText.textContent = text;
        }
    }

    updateLoadingProgress(percent) {
        if (const loadingProgress) {
            const loadingProgress.style.width = `${Math.min(percent, 100)}%`;
        }
    }

    showError(message) {
        console.error('❌ Ошибка:', message);
        
        if (const loadingText) {
            const loadingText.textContent = 'Ошибка загрузки';
        }
        
        if (const loadingError) {
            const loadingError.textContent = message;
            const loadingError.style.display = 'block';
        }
    }

    async loadModels() {
        try {
            const updateLoadingText('Подготовка моделей реактора...');
            const updateLoadingProgress(20);
            await const delay(500);
            
            const loader = new THREE.GLTFLoader();
            
            // Загрузка корпуса
            const updateLoadingText('Загрузка корпуса реактора...');
            const updateLoadingProgress(40);
            await const delay(400);
            
            const models.corpus = await const loadModel('corpus', 'models/reactor_corpus.glb');
            
            // Загрузка ТВС
            const updateLoadingText('Загрузка тепловыделяющих сборок...');
            const updateLoadingProgress(60);
            await const delay(500);
            
            await const loadTVSModels();
            
            // Загрузка крышки
            const updateLoadingText('Загрузка крышки реактора...');
            const updateLoadingProgress(80);
            await const delay(400);
            
            const models.lid = await const loadModel('lid', 'models/reactor_lid.glb');
            
            // Добавление моделей в сцену
            const updateLoadingText('Добавление моделей в сцену...');
            const updateLoadingProgress(90);
            await const delay(300);
            
            const scene.add(const models.corpus);
            const scene.add(const models.lid);
            const tvsModels.forEach(tvs => const scene.add(tvs));
            
            // Настройка камеры
            const setupInitialCamera();
            
            // Ждем минимум 2.5 секунды
            const elapsed = Date.now() - const loadingStartTime;
            const remaining = Math.max(0, const minLoadingTime - elapsed);
            
            const updateLoadingText('Завершение инициализации...');
            const updateLoadingProgress(95);
            
            await const delay(remaining);
            
            // Добавляем шутку
            const updateLoadingText('Запускаем Реактор в космос! А, нет, отмена....');
            await const delay(800);
            
            // Финальные шаги
            const updateLoadingText('Готово!');
            const updateLoadingProgress(100);
            
            await const delay(300);
            
            // Скрытие экрана загрузки
            const hideLoadingScreen();
            
            console.log('✅ Все модели загружены!');
            console.log(`✅ Создано ${const tvsModels.length} ТВС`);
            
        } catch (error) {
            const showError(`Ошибка загрузки: ${error.message}`);
            console.error('❌ Ошибка при загрузке моделей:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadModel(key, path) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                path,
                (gltf) => {
                    console.log(`✅ Модель ${key} загружена`);
                    
                    const model = gltf.scene;
                    
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            const partColor = const config.PART_COLORS[key.toUpperCase()] || const config.PART_COLORS.ASSEMBLY;
                            child.material = new THREE.MeshStandardMaterial({
                                color: const config.PART_COLORS.ASSEMBLY,
                                roughness: 0.6,
                                metalness: 0.5,
                                side: THREE.DoubleSide
                            });
                            
                            child.userData.targetColor = new THREE.Color(partColor);
                            child.userData.partType = key;
                            child.userData.modelKey = key;
                            child.userData.isInteractive = true;
                        }
                    });
                    
                    // Применяем ручную корректировку позиции
                    const correctionKey = key.toUpperCase();
                    const correction = const config.MANUAL_POSITION_CORRECTION[correctionKey] || { x: 0, y: 0, z: 0 };
                    model.position.x += correction.x;
                    model.position.y += correction.y;
                    model.position.z += correction.z;
                    
                    resolve(model);
                },
                undefined,
                (error) => {
                    reject(new Error(`Ошибка загрузки модели ${key}: ${error.message}`));
                }
            );
        });
    }

    async loadTVSModels() {
        const loader = new THREE.GLTFLoader();
        
        return new Promise((resolve, reject) => {
            loader.load(
                'models/reactor_tvs.glb',
                (gltf) => {
                    // Создаем 7 ТВС
                    const assembledPositions = const generateTvsPositions(
                        const tvsCount,
                        const config.TVS_HEX_GRID.SPACING_SMALL,
                        const config.TVS_HEX_GRID.HEX_ROTATION
                    );
                    
                    const disassembledPositions = const generateTvsPositions(
                        const tvsCount,
                        const config.TVS_HEX_GRID.SPACING_LARGE,
                        const config.TVS_HEX_GRID.HEX_ROTATION
                    );
                    
                    for (let i = 0; i < const tvsCount; i++) {
                        const model = gltf.scene.clone();
                        
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                child.material = new THREE.MeshStandardMaterial({
                                    color: const config.PART_COLORS.ASSEMBLY,
                                    roughness: 0.6,
                                    metalness: 0.5,
                                    side: THREE.DoubleSide
                                });
                                
                                child.userData.targetColor = new THREE.Color(const config.PART_COLORS.TVS);
                                child.userData.partType = 'tvs';
                                child.userData.tvsIndex = i;
                                child.userData.isInteractive = true;
                            }
                        });
                        
                        // Применяем позицию (учитываем смещение на -800)
                        const assembledPos = assembledPositions[i].clone();
                        assembledPos.y += const config.MANUAL_POSITION_CORRECTION.TVS.y;
                        model.position.copy(assembledPos);
                        
                        // Сохраняем позиции для анимации (учитываем смещение)
                        const disassembledPos = disassembledPositions[i].clone();
                        disassembledPos.y += const config.MANUAL_POSITION_CORRECTION.TVS.y;
                        
                        model.userData.assembledPosition = assembledPos.clone();
                        model.userData.disassembledPosition = disassembledPos.clone();
                        
                        const tvsModels.push(model);
                    }
                    
                    resolve();
                },
                undefined,
                reject
            );
        });
    }

    generateTvsPositions(count, spacing, rotationDegrees = 0) {
        const positions = [];
        const rotationRad = THREE.MathUtils.degToRad(rotationDegrees);
        
        // Центральная ТВС
        positions.push(new THREE.Vector3(0, 0, 0));
        
        // 6 ТВС вокруг центральной
        const sideSpacing = spacing;
        const angleStep = (2 * Math.PI) / 6;
        
        for (let i = 0; i < 6; i++) {
            const baseAngle = i * angleStep;
            const angle = baseAngle + rotationRad;
            
            const x = Math.cos(angle) * sideSpacing;
            const z = Math.sin(angle) * sideSpacing;
            
            positions.push(new THREE.Vector3(x, 0, z));
        }
        
        return positions;
    }

    setupInitialCamera() {
        const box = new THREE.Box3();
        
        const tvsModels.forEach(tvs => box.expandByObject(tvs));
        if (const models.corpus) box.expandByObject(const models.corpus);
        if (const models.lid) box.expandByObject(const models.lid);
        
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        let cameraDistance = maxDim * 1.5;
        cameraDistance = Math.max(cameraDistance, 100);
        
        const camera.position.set(0, cameraDistance * 0.6, cameraDistance * 0.8);
        const camera.lookAt(center.x, center.y, center.z);
        
        const controls.target.copy(center);
        const controls.maxDistance = cameraDistance * 3;
        const controls.minDistance = maxDim * 0.3;
        const controls.update();
    }

    hideLoadingScreen() {
        if (const loadingScreen) {
            const loadingScreen.style.opacity = '0';
            setTimeout(() => {
                const loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    async disassembleReactor() {
        if (const currentState === 'disassembled') return;
        
        console.log('🔧 Разборка реактора...');
        const currentState = 'disassembled';
        const tvsDisassembled = false;
        const updateState('Разобран');
        
        // Меняем цвета на яркие
        const changePartsColorToVibrant();
        
        // ИСПРАВЛЯЕМ: правильные расстояния для корпуса и крышки
        // Корпус: из (0, -800) должен опуститься на 2500 единиц → (0, -3300)
        // Крышка: из (0, 1365) должна подняться на 4100 - 2165 = 1935 единиц → (0, 3300)
        const corpusTarget = new THREE.Vector3(0, -3300, 0);
        const lidTarget = new THREE.Vector3(0, 3300, 0);
        
        await Promise.all([
            const animatePart(const models.corpus, corpusTarget, const config.ANIMATION_DURATION.MOVE),
            const animatePart(const models.lid, lidTarget, const config.ANIMATION_DURATION.MOVE)
        ]);
        
        // Разъезд ТВС с задержкой
        setTimeout(() => {
            const disassembleTVS();
        }, const config.TVS_HEX_GRID.DELAY);
    }

    animatePart(part, targetPosition, duration) {
        return new Promise((resolve) => {
            const startPosition = part.position.clone();
            const startTime = Date.now();
            
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeProgress = const easeInOutCubic(progress);
                part.position.lerpVectors(startPosition, targetPosition, easeProgress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    disassembleTVS() {
        console.log('🔧 Разъезд ТВС...');
        const tvsDisassembled = true;
        
        const animations = const tvsModels.map((tvs, index) => {
            const targetPos = index === 0 
                ? tvs.userData.assembledPosition.clone()
                : tvs.userData.disassembledPosition.clone();
            
            return const animatePart(tvs, targetPos, const config.TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        Promise.all(animations).then(() => {
            // Создаем маркеры для взаимодействия
            const createMarkers();
            console.log('✅ ТВС разъехались');
        });
    }

    createMarkers() {
        // Очищаем старые маркеры
        const clearMarkers();
        
        // Создаем маркеры для каждой детали
        const createMarker(const models.corpus, 'Корпус реактора', 'fas fa-cube');
        const createMarker(const models.lid, 'Крышка реактора', 'fas fa-circle');
        
        // Маркеры для ТВС
        const tvsModels.forEach((tvs, index) => {
            const name = index === 0 ? 'Центральная ТВС' : `ТВС ${index}`;
            const createMarker(tvs, name, 'fas fa-bolt');
        });
    }

    createMarker(part, label, iconClass) {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.innerHTML = `
            <div class="marker-inner">
                <i class="${iconClass}"></i>
            </div>
        `;
        marker.title = label;
        marker.dataset.partType = part.userData.partType;
        marker.dataset.tvsIndex = part.userData.tvsIndex || 0;
        
        // Функция обновления позиции маркера - ПРИБИВАЕМ ЖЕСТКО
        const updatePosition = () => {
            if (!part || !part.position) return;
            
            // Жесткая привязка к позиции модели в мировых координатах
            const worldPosition = new THREE.Vector3();
            part.getWorldPosition(worldPosition);
            
            // Проецируем мировую позицию в координаты экрана
            const vector = worldPosition.clone().project(const camera);
            
            // Проверяем, что объект перед камерой
            if (vector.z >= 1 || vector.z <= -1) {
                marker.style.display = 'none';
                return;
            }
            
            // Преобразуем нормализованные координаты в пиксели
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            // Проверяем, что маркер в пределах видимой области
            if (x >= -50 && x <= window.innerWidth + 50 && 
                y >= -50 && y <= window.innerHeight + 50) {
                marker.style.left = `${x - 17}px`;
                marker.style.top = `${y - 17}px`;
                marker.style.display = 'block';
                marker.style.transform = 'translateZ(0)'; // Принудительный хардверарный слой
            } else {
                marker.style.display = 'none';
            }
        };
        
        // Сохраняем функцию обновления
        marker.updatePosition = updatePosition;
        const markers.push({ marker, updatePosition, part });
        
        // Обработчик клика/тапа
        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (const isMobile && part.userData.partType === 'tvs') {
                const selectPart('tvs', 0);
            } else {
                const selectPart(part.userData.partType, part.userData.tvsIndex);
            }
            
            if (const isMobile) {
                const showMobileOverlay();
            }
        };
        
        marker.addEventListener('click', handleClick);
        marker.addEventListener('touchstart', handleClick, { passive: false });
        
        document.getElementById('markers-container').appendChild(marker);
    }

    updateMarkers() {
        if (!const markers || const currentState !== 'disassembled') return;
        
        // Обновляем позиции ВСЕХ маркеров каждый кадр
        const markers.forEach(({ updatePosition }) => {
            updatePosition();
        });
    }

    clearMarkers() {
        const container = document.getElementById('markers-container');
        if (container) {
            container.innerHTML = '';
        }
        const markers = [];
    }

    async assembleReactor() {
        if (const currentState === 'assembled') return;
        
        console.log('🔧 Сборка реактора...');
        const updateState('Сборка...');
        
        // Очищаем маркеры
        const clearMarkers();
        
        // Сборка ТВС
        if (const tvsDisassembled) {
            await const assembleTVS();
        }
        
        // Сборка корпуса и крышки (возвращаем в исходные позиции с учетом смещения)
        const corpusTarget = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.CORPUS.y, 0);
        const lidTarget = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.LID.y, 0);
        
        await Promise.all([
            const animatePart(const models.corpus, corpusTarget, const config.ANIMATION_DURATION.MOVE),
            const animatePart(const models.lid, lidTarget, const config.ANIMATION_DURATION.MOVE)
        ]);
        
        // Возвращаем серый цвет
        const changePartsColorToGray();
        
        const currentState = 'assembled';
        const tvsDisassembled = false;
        const updateState('Собран');
        
        console.log('✅ Сборка завершена');
    }

    assembleTVS() {
        const animations = const tvsModels.map(tvs => {
            return const animatePart(tvs, tvs.userData.assembledPosition, const config.TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        return Promise.all(animations).then(() => {
            const tvsDisassembled = false;
        });
    }

    changePartsColorToVibrant() {
        // Корпус
        if (const models.corpus) {
            const models.corpus.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Крышка
        if (const models.lid) {
            const models.lid.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // ТВС
        const tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.needsUpdate = true;
                }
            });
        });
    }

    changePartsColorToGray() {
        const grayColor = new THREE.Color(const config.PART_COLORS.ASSEMBLY);
        
        // Корпус
        if (const models.corpus) {
            const models.corpus.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Крышка
        if (const models.lid) {
            const models.lid.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // ТВС
        const tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.needsUpdate = true;
                }
            });
        });
    }

    onModelClick(event) {
        if (const currentState !== 'disassembled') return;
        
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        
        const rect = const renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        
        if (event.type === 'touchstart') {
            const touch = event.touches[0];
            mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        } else {
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, const camera);
        
        const interactiveObjects = [
            const models.corpus,
            const models.lid,
            ...const tvsModels
        ].filter(obj => obj !== null);
        
        const intersects = raycaster.intersectObjects(interactiveObjects, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            let currentObj = clickedObject;
            
            while (currentObj && !currentObj.userData.partType) {
                currentObj = currentObj.parent;
            }
            
            if (currentObj && currentObj.userData.partType) {
                if (const isMobile && currentObj.userData.partType === 'tvs') {
                    const selectPart('tvs', 0);
                } else {
                    const selectPart(currentObj.userData.partType, currentObj.userData.tvsIndex);
                }
                
                if (const isMobile) {
                    const showMobileOverlay();
                }
            }
        } else if (const isMobile && const infoPanel.classList.contains('active')) {
            const closeInfoPanel();
        }
    }

    selectPart(partType, tvsIndex = null) {
        const selectedPart = { type: partType, tvsIndex };
        
        // Обновляем текст
        let partName = '';
        let partData = null;
        
        if (partType === 'tvs') {
            partData = const partInfo.tvs;
            partName = partData.name;
        } else {
            partData = const partInfo[partType];
            partName = partData ? partData.name : 'Деталь реактора';
        }
        
        const selectedPartText.textContent = partName;
        
        // Показываем информацию о детали
        const showPartInfo(partType, tvsIndex);
        
        // Подсвечиваем деталь
        const highlightPart(partType, tvsIndex);
        
        // Перемещаем камеру к детали
        setTimeout(() => {
            const focusOnPart(partType, tvsIndex);
        }, 100);
    }

    showPartInfo(partType, tvsIndex = null) {
        let info = null;
        
        if (partType === 'tvs') {
            info = const partInfo.tvs;
        } else {
            info = const partInfo[partType];
        }
        
        if (!info) {
            info = {
                name: "Деталь реактора",
                description: "Описание детали",
                specs: ["Характеристики не доступны"]
            };
        }
        
        // Обновляем содержимое - ИСПРАВЛЕНО!
        const partName.textContent = info.name;
        const partDescription.textContent = info.description;
        
        // Обновляем характеристики - ИСПРАВЛЕНО!
        const specsList.innerHTML = '';
        info.specs.forEach(spec => {
            const li = document.createElement('li');
            li.textContent = spec;
            const specsList.appendChild(li);
        });
        
        // Обновляем иконку
        const iconMap = {
            corpus: 'fas fa-cube',
            lid: 'fas fa-circle',
            tvs: 'fas fa-bolt'
        };
        document.getElementById('part-icon').className = iconMap[partType] || 'fas fa-cube';
        
        // Показываем панель
        const infoPanel.classList.remove('panel-hidden');
        const infoPanel.classList.add('active');
        
        if (const isMobile) {
            const showMobileOverlay();
        }
    }

    highlightPart(partType, tvsIndex = null) {
        const removeHighlight();
        
        let targetPart = null;
        
        if (partType === 'corpus') {
            targetPart = const models.corpus;
        } else if (partType === 'lid') {
            targetPart = const models.lid;
        } else if (partType === 'tvs') {
            if (tvsIndex !== null && tvsIndex < const tvsModels.length) {
                targetPart = const tvsModels[tvsIndex];
            }
        }
        
        if (targetPart) {
            targetPart.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x333333);
                    child.material.emissiveIntensity = 0.3;
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    removeHighlight() {
        // Корпус
        if (const models.corpus) {
            const models.corpus.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Крышка
        if (const models.lid) {
            const models.lid.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // ТВС
        const tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        });
    }

    focusOnPart(partType, tvsIndex = null) {
        let targetPosition = null;
        let cameraPosition = null;
        
        switch (partType) {
            case 'corpus':
                targetPosition = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.CORPUS.y + 300, 0);
                cameraPosition = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.CORPUS.y + 800, 1200);
                break;
                
            case 'lid':
                targetPosition = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.LID.y, 0);
                cameraPosition = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.LID.y + 600, 1000);
                break;
                
            case 'tvs':
                if (tvsIndex !== null && tvsIndex < const tvsModels.length) {
                    const tvs = const tvsModels[tvsIndex];
                    targetPosition = tvs.position.clone();
                    cameraPosition = tvs.position.clone().add(new THREE.Vector3(300, 300, 300));
                } else {
                    targetPosition = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.TVS.y + 500, 0);
                    cameraPosition = new THREE.Vector3(0, const config.MANUAL_POSITION_CORRECTION.TVS.y + 800, 1000);
                }
                break;
        }
        
        if (targetPosition && cameraPosition) {
            const animateCameraTo(cameraPosition, targetPosition);
        }
    }

    animateCameraTo(position, target) {
        const startPosition = const camera.position.clone();
        const startTarget = const controls.target.clone();
        const duration = 800;
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = const easeInOutCubic(progress);
            
            const camera.position.lerpVectors(startPosition, position, easeProgress);
            
            const currentTarget = startTarget.clone().lerp(target, easeProgress);
            const controls.target.copy(currentTarget);
            const controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    closeInfoPanel() {
        const infoPanel.classList.remove('active');
        const infoPanel.classList.add('panel-hidden');
        const selectedPart = null;
        const selectedPartText.textContent = 'Ничего';
        const removeHighlight();
        const hideMobileOverlay();
    }

    resetCamera() {
        const setupInitialCamera();
    }

    updateState(state) {
        if (const stateStatus) {
            const stateStatus.textContent = state;
        }
        
        const stateIcon = document.getElementById('state-main-icon');
        if (stateIcon) {
            if (state === 'Собран') {
                stateIcon.className = 'fas fa-check-circle';
                stateIcon.style.color = '#4CAF50';
            } else if (state === 'Разобран') {
                stateIcon.className = 'fas fa-layer-group';
                stateIcon.style.color = '#4a90e2';
            } else if (state === 'Сборка...') {
                stateIcon.className = 'fas fa-cogs';
                stateIcon.style.color = '#ed8936';
            } else {
                stateIcon.className = 'fas fa-atom';
                stateIcon.style.color = '#4a90e2';
            }
        }
    }

    onWindowResize() {
        const container = document.getElementById('model-container');
        const camera.aspect = container.clientWidth / container.clientHeight;
        const camera.updateProjectionMatrix();
        const renderer.setSize(container.clientWidth, container.clientHeight);
        
        const updateMarkers();
    }

    animate() {
        requestAnimationFrame(() => const animate());
        
        if (const controls) {
            const controls.update();
        }
        
        const updateMarkers();
        
        const renderer.render(const scene, const camera);
    }
}

// Запуск приложения
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            new ReactorViewer();
        } catch (error) {
            console.error('❌ Критическая ошибка при запуске:', error);
            document.getElementById('loading-text').textContent = 'Критическая ошибка!';
            document.getElementById('loading-error').textContent = error.message;
            document.getElementById('loading-error').style.display = 'block';
        }
    }, 100);
});
