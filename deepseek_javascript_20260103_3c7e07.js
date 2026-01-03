// Основной код просмотрщика реактора РИМ-К-4,5
class ReactorViewer {
    constructor() {
        // Конфигурация
        this.config = {
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
                ASSEMBLY: 0x6699CC,
                CORPUS: 0x4a90e2,
                TVS: 0x4CAF50,
                LID: 0xed8936
            },
            
            ANIMATION_DURATION: {
                FADE: 500,
                MOVE: 2400,
                CAMERA: 1500
            },
            
            MANUAL_POSITION_CORRECTION: {
                CORPUS: { x: 0, y: -800, z: 0 }, // Опускаем модель на 800 единиц
                TVS: { x: 0, y: 0, z: 0 },
                LID: { x: 0, y: 1365, z: 0 } // 2165 - 800 = 1365
            }
        };

        // Состояние
        this.currentState = 'assembled';
        this.selectedPart = null;
        this.tvsDisassembled = false;
        this.isMobile = false;
        this.minLoadingTime = 3000; // Минимальное время показа загрузки 3 секунды
        this.loadingStartTime = null;
        
        // Модели
        this.models = {
            corpus: null,
            lid: null
        };
        this.tvsModels = [];
        this.tvsCount = 7;
        
        // Маркеры
        this.markers = [];
        
        // Запуск
        this.init();
    }

    init() {
        console.log("🚀 Запуск интерактивного 3D просмотрщика реактора РИМ-К-4,5...");
        
        // Определяем мобильное устройство
        this.isMobile = this.checkIfMobile();
        
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupControls();
        this.setupUI();
        this.setupEventListeners();
        
        this.loadingStartTime = Date.now();
        this.loadModels();
    }

    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
    }

    setupCamera() {
        const container = document.getElementById('model-container');
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            50000
        );
        // Начальная позиция камеры выше
        this.camera.position.set(0, 1800, 3000);
    }

    setupRenderer() {
        const container = document.getElementById('model-container');
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(100, 200, 100);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Back light
        const backLight = new THREE.DirectionalLight(0xffffff, 1);
        backLight.position.set(-100, 150, -100);
        this.scene.add(backLight);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.panSpeed = 0.5;
        this.controls.zoomSpeed = 0.8;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 2000;
        
        // Настройки для мобильных устройств
        if (this.isMobile) {
            this.controls.enablePan = false;
            this.controls.rotateSpeed = 0.3;
            this.controls.zoomSpeed = 0.5;
        }
    }

    setupUI() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.getElementById('loading-text');
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingError = document.getElementById('loading-error');
        this.statsText = document.getElementById('stats-text');
        
        this.assembleBtn = document.getElementById('assemble-btn');
        this.disassembleBtn = document.getElementById('disassemble-btn');
        this.resetCameraBtn = document.getElementById('reset-camera');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        
        // Мобильные кнопки
        this.mobileAssembleBtn = document.getElementById('mobile-assemble');
        this.mobileDisassembleBtn = document.getElementById('mobile-disassemble');
        this.mobileResetBtn = document.getElementById('mobile-reset');
        this.mobileOverlay = document.getElementById('mobile-overlay');
        
        this.infoPanel = document.getElementById('info-panel');
        this.selectedPartText = document.getElementById('selected-part');
        this.stateStatus = document.getElementById('state-status');
        
        this.partName = document.getElementById('part-name');
        this.partDescription = document.getElementById('part-description');
        this.specsList = document.getElementById('specs-list');
        
        // Показываем разные кнопки для мобильных
        if (this.isMobile) {
            document.getElementById('mobile-controls').style.display = 'block';
        }
        
        this.updateLoadingText('Инициализация 3D среды...');
        this.updateLoadingProgress(10);
        this.updateStatsText('Подготовка системы...');
    }

    setupEventListeners() {
        // Управление реактором - десктоп
        this.assembleBtn.addEventListener('click', () => this.assembleReactor());
        this.disassembleBtn.addEventListener('click', () => this.disassembleReactor());
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        this.closeInfoBtn.addEventListener('click', () => this.closeInfoPanel());
        
        // Управление реактором - мобильные
        this.mobileAssembleBtn.addEventListener('click', () => {
            this.assembleReactor();
            this.hideMobileOverlay();
        });
        this.mobileDisassembleBtn.addEventListener('click', () => {
            this.disassembleReactor();
            this.hideMobileOverlay();
        });
        this.mobileResetBtn.addEventListener('click', () => {
            this.resetCamera();
            this.hideMobileOverlay();
        });
        
        // Клик по модели
        this.renderer.domElement.addEventListener('click', (e) => this.onModelClick(e));
        
        // Для мобильных - тач события
        if (this.isMobile) {
            this.renderer.domElement.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.onModelClick(e);
                }
            }, { passive: true });
        }
        
        // Оверлей для закрытия панелей на мобильных
        this.mobileOverlay.addEventListener('click', () => this.hideMobileOverlay());
        
        // Ресайз окна
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Анимация
        this.animate();
    }

    showMobileOverlay() {
        if (this.isMobile) {
            this.mobileOverlay.style.display = 'block';
            setTimeout(() => {
                this.mobileOverlay.style.opacity = '1';
            }, 10);
        }
    }

    hideMobileOverlay() {
        if (this.isMobile) {
            this.mobileOverlay.style.opacity = '0';
            setTimeout(() => {
                this.mobileOverlay.style.display = 'none';
            }, 300);
        }
    }

    updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    updateLoadingProgress(percent) {
        if (this.loadingProgress) {
            this.loadingProgress.style.width = `${Math.min(percent, 100)}%`;
        }
    }

    updateStatsText(text) {
        if (this.statsText) {
            this.statsText.textContent = text;
        }
    }

    showError(message) {
        console.error('❌ Ошибка:', message);
        
        if (this.loadingText) {
            this.loadingText.textContent = 'Ошибка загрузки';
        }
        
        if (this.loadingError) {
            this.loadingError.textContent = message;
            this.loadingError.style.display = 'block';
        }
    }

    async loadModels() {
        try {
            this.updateLoadingText('Подготовка моделей реактора...');
            this.updateLoadingProgress(20);
            this.updateStatsText('Загрузка системы координат...');
            
            // Искусственная задержка для красивого отображения загрузки
            await this.delay(800);
            
            const loader = new THREE.GLTFLoader();
            
            // Загрузка корпуса
            this.updateLoadingText('Загрузка корпуса реактора...');
            this.updateLoadingProgress(40);
            this.updateStatsText('Загрузка модели корпуса...');
            await this.delay(600);
            
            this.models.corpus = await this.loadModel('corpus', 'models/reactor_corpus.glb');
            
            // Загрузка ТВС
            this.updateLoadingText('Загрузка тепловыделяющих сборок...');
            this.updateLoadingProgress(60);
            this.updateStatsText('Создание 7 ТВС...');
            await this.delay(800);
            
            await this.loadTVSModels();
            
            // Загрузка крышки
            this.updateLoadingText('Загрузка крышки реактора...');
            this.updateLoadingProgress(80);
            this.updateStatsText('Завершение загрузки моделей...');
            await this.delay(600);
            
            this.models.lid = await this.loadModel('lid', 'models/reactor_lid.glb');
            
            // Добавление моделей в сцену
            this.updateLoadingText('Добавление моделей в сцену...');
            this.updateLoadingProgress(90);
            this.updateStatsText('Инициализация физической модели...');
            await this.delay(500);
            
            this.scene.add(this.models.corpus);
            this.scene.add(this.models.lid);
            this.tvsModels.forEach(tvs => this.scene.add(tvs));
            
            // Настройка камеры
            this.setupInitialCamera();
            
            // Ждем минимум 3 секунды с начала загрузки
            const elapsed = Date.now() - this.loadingStartTime;
            const remaining = Math.max(0, this.minLoadingTime - elapsed);
            
            this.updateLoadingText('Завершение инициализации...');
            this.updateLoadingProgress(95);
            this.updateStatsText('Оптимизация рендеринга...');
            
            await this.delay(remaining);
            
            // Финальные шаги
            this.updateLoadingText('Готово!');
            this.updateLoadingProgress(100);
            this.updateStatsText('Загрузка завершена');
            
            await this.delay(500);
            
            // Скрытие экрана загрузки
            this.hideLoadingScreen();
            
            console.log('✅ Все модели загружены!');
            console.log(`✅ Создано ${this.tvsModels.length} ТВС`);
            
        } catch (error) {
            this.showError(`Ошибка загрузки: ${error.message}`);
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
                            
                            const partColor = this.config.PART_COLORS[key.toUpperCase()] || this.config.PART_COLORS.ASSEMBLY;
                            child.material = new THREE.MeshStandardMaterial({
                                color: this.config.PART_COLORS.ASSEMBLY,
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
                    
                    // Применяем ручную корректировку позиции (опускаем на 800)
                    const correctionKey = key.toUpperCase();
                    const correction = this.config.MANUAL_POSITION_CORRECTION[correctionKey] || { x: 0, y: 0, z: 0 };
                    model.position.x += correction.x;
                    model.position.y += correction.y;
                    model.position.z += correction.z;
                    
                    resolve(model);
                },
                (progress) => {
                    // Прогресс загрузки
                    if (progress.lengthComputable) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(1);
                        this.updateStatsText(`Загрузка ${key}: ${percent}%`);
                    }
                },
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
                    const assembledPositions = this.generateTvsPositions(
                        this.tvsCount,
                        this.config.TVS_HEX_GRID.SPACING_SMALL,
                        this.config.TVS_HEX_GRID.HEX_ROTATION
                    );
                    
                    const disassembledPositions = this.generateTvsPositions(
                        this.tvsCount,
                        this.config.TVS_HEX_GRID.SPACING_LARGE,
                        this.config.TVS_HEX_GRID.HEX_ROTATION
                    );
                    
                    for (let i = 0; i < this.tvsCount; i++) {
                        const model = gltf.scene.clone();
                        
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                child.material = new THREE.MeshStandardMaterial({
                                    color: this.config.PART_COLORS.ASSEMBLY,
                                    roughness: 0.6,
                                    metalness: 0.5,
                                    side: THREE.DoubleSide
                                });
                                
                                child.userData.targetColor = new THREE.Color(this.config.PART_COLORS.TVS);
                                child.userData.partType = 'tvs';
                                child.userData.tvsIndex = i;
                                child.userData.isInteractive = true;
                            }
                        });
                        
                        // Применяем позицию (учитываем смещение на -800)
                        const assembledPos = assembledPositions[i].clone();
                        assembledPos.y += this.config.MANUAL_POSITION_CORRECTION.TVS.y;
                        model.position.copy(assembledPos);
                        
                        // Сохраняем позиции для анимации (учитываем смещение)
                        const disassembledPos = disassembledPositions[i].clone();
                        disassembledPos.y += this.config.MANUAL_POSITION_CORRECTION.TVS.y;
                        
                        model.userData.assembledPosition = assembledPos.clone();
                        model.userData.disassembledPosition = disassembledPos.clone();
                        
                        this.tvsModels.push(model);
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
        
        this.tvsModels.forEach(tvs => box.expandByObject(tvs));
        if (this.models.corpus) box.expandByObject(this.models.corpus);
        if (this.models.lid) box.expandByObject(this.models.lid);
        
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        let cameraDistance = maxDim * 2.5; // Немного дальше для лучшего обзора
        cameraDistance = Math.max(cameraDistance, 200);
        
        // Позиция камеры выше
        this.camera.position.set(0, cameraDistance * 0.8, cameraDistance * 1.2);
        this.camera.lookAt(center.x, center.y, center.z);
        
        this.controls.target.copy(center);
        this.controls.maxDistance = cameraDistance * 5;
        this.controls.minDistance = maxDim * 0.5;
        this.controls.update();
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 800);
        }
    }

    async disassembleReactor() {
        if (this.currentState === 'disassembled') return;
        
        console.log('🔧 Разборка реактора...');
        this.currentState = 'disassembled';
        this.tvsDisassembled = false;
        this.updateState('Разобран');
        
        // Меняем цвета на яркие
        this.changePartsColorToVibrant();
        
        // Анимация корпуса и крышки
        await Promise.all([
            this.animatePart(this.models.corpus, 
                new THREE.Vector3(0, this.config.DISASSEMBLY_DISTANCE.CORPUS_DOWN, 0),
                this.config.ANIMATION_DURATION.MOVE
            ),
            this.animatePart(this.models.lid,
                new THREE.Vector3(0, this.config.DISASSEMBLY_DISTANCE.LID_UP, 0),
                this.config.ANIMATION_DURATION.MOVE
            )
        ]);
        
        // Разъезд ТВС с задержкой
        setTimeout(() => {
            this.disassembleTVS();
        }, this.config.TVS_HEX_GRID.DELAY);
    }

    animatePart(part, targetPosition, duration) {
        return new Promise((resolve) => {
            const startPosition = part.position.clone();
            const startTime = Date.now();
            
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeProgress = this.easeInOutCubic(progress);
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
        this.tvsDisassembled = true;
        
        const animations = this.tvsModels.map((tvs, index) => {
            const targetPos = index === 0 
                ? tvs.userData.assembledPosition.clone()
                : tvs.userData.disassembledPosition.clone();
            
            return this.animatePart(tvs, targetPos, this.config.TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        Promise.all(animations).then(() => {
            // Создаем маркеры для взаимодействия
            this.createMarkers();
            console.log('✅ ТВС разъехались');
        });
    }

    createMarkers() {
        // Очищаем старые маркеры
        this.clearMarkers();
        
        // Создаем маркеры для каждой детали
        this.createMarker(this.models.corpus, 'Корпус реактора', 'fas fa-cube');
        this.createMarker(this.models.lid, 'Крышка реактора', 'fas fa-circle');
        
        // Маркеры для ТВС
        this.tvsModels.forEach((tvs, index) => {
            const name = index === 0 ? 'Центральная ТВС' : `ТВС ${index}`;
            this.createMarker(tvs, name, 'fas fa-bolt');
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
        
        // Функция обновления позиции маркера
        const updatePosition = () => {
            if (!part || !part.position) return;
            
            const vector = part.position.clone().project(this.camera);
            
            // Проверяем, что объект перед камерой
            if (vector.z >= 1 || vector.z <= -1) {
                marker.style.display = 'none';
                return;
            }
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            // Проверяем, что маркер в пределах видимой области
            if (x >= -50 && x <= window.innerWidth + 50 && 
                y >= -50 && y <= window.innerHeight + 50) {
                marker.style.left = `${x - 25}px`;
                marker.style.top = `${y - 25}px`;
                marker.style.display = 'block';
            } else {
                marker.style.display = 'none';
            }
        };
        
        // Сохраняем функцию обновления
        marker.updatePosition = updatePosition;
        this.markers.push({ marker, updatePosition, part });
        
        // Обработчик клика/тапа
        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectPart(part.userData.partType, part.userData.tvsIndex);
            
            if (this.isMobile) {
                this.showMobileOverlay();
            }
        };
        
        marker.addEventListener('click', handleClick);
        marker.addEventListener('touchstart', handleClick, { passive: false });
        
        document.getElementById('markers-container').appendChild(marker);
    }

    updateMarkers() {
        if (!this.markers || this.currentState !== 'disassembled') return;
        
        this.markers.forEach(({ updatePosition }) => {
            updatePosition();
        });
    }

    clearMarkers() {
        const container = document.getElementById('markers-container');
        if (container) {
            container.innerHTML = '';
        }
        this.markers = [];
    }

    async assembleReactor() {
        if (this.currentState === 'assembled') return;
        
        console.log('🔧 Сборка реактора...');
        this.updateState('Сборка...');
        
        // Очищаем маркеры
        this.clearMarkers();
        
        // Сборка ТВС
        if (this.tvsDisassembled) {
            await this.assembleTVS();
        }
        
        // Сборка корпуса и крышки
        const corpusTarget = new THREE.Vector3(0, this.config.MANUAL_POSITION_CORRECTION.CORPUS.y, 0);
        const lidTarget = new THREE.Vector3(0, this.config.MANUAL_POSITION_CORRECTION.LID.y, 0);
        
        await Promise.all([
            this.animatePart(this.models.corpus, corpusTarget, this.config.ANIMATION_DURATION.MOVE),
            this.animatePart(this.models.lid, lidTarget, this.config.ANIMATION_DURATION.MOVE)
        ]);
        
        // Возвращаем серый цвет
        this.changePartsColorToGray();
        
        this.currentState = 'assembled';
        this.tvsDisassembled = false;
        this.updateState('Собран');
        
        console.log('✅ Сборка завершена');
    }

    assembleTVS() {
        const animations = this.tvsModels.map(tvs => {
            return this.animatePart(tvs, tvs.userData.assembledPosition, this.config.TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        return Promise.all(animations).then(() => {
            this.tvsDisassembled = false;
        });
    }

    changePartsColorToVibrant() {
        // Корпус
        if (this.models.corpus) {
            this.models.corpus.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Крышка
        if (this.models.lid) {
            this.models.lid.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // ТВС
        this.tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.needsUpdate = true;
                }
            });
        });
    }

    changePartsColorToGray() {
        const grayColor = new THREE.Color(this.config.PART_COLORS.ASSEMBLY);
        
        // Корпус
        if (this.models.corpus) {
            this.models.corpus.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Крышка
        if (this.models.lid) {
            this.models.lid.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // ТВС
        this.tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.needsUpdate = true;
                }
            });
        });
    }

    onModelClick(event) {
        if (this.currentState !== 'disassembled') return;
        
        // Для мобильных - предотвращаем скролл
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        
        const rect = this.renderer.domElement.getBoundingClientRect();
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
        raycaster.setFromCamera(mouse, this.camera);
        
        // Все интерактивные объекты
        const interactiveObjects = [
            this.models.corpus,
            this.models.lid,
            ...this.tvsModels
        ].filter(obj => obj !== null);
        
        const intersects = raycaster.intersectObjects(interactiveObjects, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            let currentObj = clickedObject;
            
            // Ищем родительский объект с данными
            while (currentObj && !currentObj.userData.partType) {
                currentObj = currentObj.parent;
            }
            
            if (currentObj && currentObj.userData.partType) {
                this.selectPart(currentObj.userData.partType, currentObj.userData.tvsIndex);
                
                if (this.isMobile) {
                    this.showMobileOverlay();
                }
            }
        } else if (this.isMobile && this.infoPanel.classList.contains('active')) {
            // Если кликнули мимо на мобильном и панель открыта - закрываем
            this.closeInfoPanel();
        }
    }

    selectPart(partType, tvsIndex = null) {
        this.selectedPart = { type: partType, tvsIndex };
        
        // Обновляем текст
        const partName = this.getPartName(partType, tvsIndex);
        this.selectedPartText.textContent = partName;
        
        // Показываем информацию о детали
        this.showPartInfo(partType, tvsIndex);
        
        // Подсвечиваем деталь
        this.highlightPart(partType, tvsIndex);
        
        // Перемещаем камеру к детали
        setTimeout(() => {
            this.focusOnPart(partType, tvsIndex);
        }, 100);
    }

    getPartName(partType, tvsIndex) {
        switch (partType) {
            case 'corpus': return 'Корпус реактора';
            case 'lid': return 'Крышка реактора';
            case 'tvs':
                return tvsIndex === 0 ? 'Центральная ТВС' : `ТВС ${tvsIndex}`;
            default: return 'Деталь реактора';
        }
    }

    showPartInfo(partType, tvsIndex = null) {
        const info = this.getPartInfo(partType, tvsIndex);
        
        // Обновляем содержимое
        this.partName.textContent = info.name;
        this.partDescription.textContent = info.description;
        
        // Обновляем характеристики
        this.specsList.innerHTML = '';
        info.specs.forEach(spec => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="spec-label">${spec.label}:</span> <span class="spec-value">${spec.value}</span>`;
            this.specsList.appendChild(li);
        });
        
        // Обновляем иконку
        const iconMap = {
            corpus: 'fas fa-cube',
            lid: 'fas fa-circle',
            tvs: 'fas fa-bolt'
        };
        document.getElementById('part-icon').className = iconMap[partType] || 'fas fa-cube';
        
        // Показываем панель
        this.infoPanel.classList.remove('panel-hidden');
        this.infoPanel.classList.add('active');
        
        // На мобильных показываем оверлей
        if (this.isMobile) {
            this.showMobileOverlay();
        }
    }

    getPartInfo(partType, tvsIndex = null) {
        // Информация о деталях реактора РИМ-К-4,5
        const baseInfo = {
            corpus: {
                name: "Корпус реактора РИМ-К-4,5",
                description: "Основная несущая конструкция реактора, выполненная из высокопрочной стали. Предназначен для размещения активной зоны и обеспечения герметичности системы.",
                specs: [
                    { label: "Материал", value: "Высокопрочная сталь" },
                    { label: "Высота", value: "2545 мм" },
                    { label: "Внешний диаметр", value: "500 мм" },
                    { label: "Толщина стенки", value: "50 мм" },
                    { label: "Рабочее давление", value: "15.5 МПа" },
                    { label: "Температура", value: "320°C" }
                ]
            },
            tvs: {
                name: tvsIndex === 0 ? "Центральная ТВС" : `Тепловыделяющая сборка ${tvsIndex}`,
                description: "Тепловыделяющая сборка содержит урановое топливо. Обеспечивает генерацию тепловой энергии за счет цепной реакции деления ядер.",
                specs: [
                    { label: "Тип топлива", value: "Диоксид урана" },
                    { label: "Обогащение", value: "3.5% U-235" },
                    { label: "Количество ТВЭЛов", value: "312 шт" },
                    { label: "Высота", value: "3850 мм" },
                    { label: "Диаметр", value: "145 мм" },
                    { label: "Тепловая мощность", value: "4.5 МВт" }
                ]
            },
            lid: {
                name: "Крышка реактора",
                description: "Верхняя крышка корпуса реактора. Обеспечивает герметичное закрытие и доступ к внутренним компонентам.",
                specs: [
                    { label: "Материал", value: "Сталь 15Х2МФА" },
                    { label: "Диаметр", value: "500 мм" },
                    { label: "Толщина", value: "188 мм" },
                    { label: "Количество шпилек", value: "54 шт" },
                    { label: "Вес", value: "12.5 т" }
                ]
            }
        };
        
        return baseInfo[partType] || {
            name: "Деталь реактора",
            description: "Описание детали",
            specs: [{ label: "Характеристики", value: "Не доступны" }]
        };
    }

    highlightPart(partType, tvsIndex = null) {
        // Сначала убираем подсветку со всех деталей
        this.removeHighlight();
        
        // Подсвечиваем выбранную деталь
        let targetPart = null;
        
        if (partType === 'corpus') {
            targetPart = this.models.corpus;
        } else if (partType === 'lid') {
            targetPart = this.models.lid;
        } else if (partType === 'tvs') {
            if (tvsIndex !== null && tvsIndex < this.tvsModels.length) {
                targetPart = this.tvsModels[tvsIndex];
            }
        }
        
        if (targetPart) {
            targetPart.traverse((child) => {
                if (child.isMesh) {
                    // Временная подсветка
                    child.material.emissive = new THREE.Color(0x333333);
                    child.material.emissiveIntensity = 0.3;
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    removeHighlight() {
        // Корпус
        if (this.models.corpus) {
            this.models.corpus.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // Крышка
        if (this.models.lid) {
            this.models.lid.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        // ТВС
        this.tvsModels.forEach(tvs => {
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
                targetPosition = new THREE.Vector3(0, this.config.MANUAL_POSITION_CORRECTION.CORPUS.y + 500, 0);
                cameraPosition = new THREE.Vector3(0, this.config.MANUAL_POSITION_CORRECTION.CORPUS.y + 1500, 2000);
                break;
                
            case 'lid':
                targetPosition = new THREE.Vector3(0, this.config.MANUAL_POSITION_CORRECTION.LID.y, 0);
                cameraPosition = new THREE.Vector3(0, this.config.MANUAL_POSITION_CORRECTION.LID.y + 1000, 1500);
                break;
                
            case 'tvs':
                if (tvsIndex !== null && tvsIndex < this.tvsModels.length) {
                    const tvs = this.tvsModels[tvsIndex];
                    targetPosition = tvs.position.clone();
                    cameraPosition = tvs.position.clone().add(new THREE.Vector3(500, 500, 500));
                } else {
                    targetPosition = new THREE.Vector3(0, 1000, 0);
                    cameraPosition = new THREE.Vector3(0, 1500, 1500);
                }
                break;
        }
        
        if (targetPosition && cameraPosition) {
            this.animateCameraTo(cameraPosition, targetPosition);
        }
    }

    animateCameraTo(position, target) {
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = this.easeInOutCubic(progress);
            
            // Интерполяция позиции камеры
            this.camera.position.lerpVectors(startPosition, position, easeProgress);
            
            // Интерполяция цели
            const currentTarget = startTarget.clone().lerp(target, easeProgress);
            this.controls.target.copy(currentTarget);
            this.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    closeInfoPanel() {
        this.infoPanel.classList.remove('active');
        this.infoPanel.classList.add('panel-hidden');
        this.selectedPart = null;
        this.selectedPartText.textContent = 'Ничего';
        this.removeHighlight();
        this.hideMobileOverlay();
    }

    resetCamera() {
        this.setupInitialCamera();
    }

    updateState(state) {
        if (this.stateStatus) {
            this.stateStatus.textContent = state;
        }
        
        // Обновление иконки состояния
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
                stateIcon.style.animation = 'spin 2s linear infinite';
            } else {
                stateIcon.className = 'fas fa-atom';
                stateIcon.style.color = '#4a90e2';
                stateIcon.style.animation = 'pulse 2s infinite';
            }
        }
    }

    onWindowResize() {
        const container = document.getElementById('model-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Обновляем маркеры
        this.updateMarkers();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Обновление управления камерой
        if (this.controls) {
            this.controls.update();
        }
        
        // Обновление позиций маркеров
        this.updateMarkers();
        
        // Рендеринг
        this.renderer.render(this.scene, this.camera);
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