// Конфигурация приложения
const CONFIG = {
    // Расстояния и позиции
    DISASSEMBLY_DISTANCE: {
        CORPUS_DOWN: -2500,
        LID_UP: 4100,
        TVS_STAYS: 0
    },
    
    // Расположение ТВС
    TVS_HEX_GRID: {
        SPACING_SMALL: 120,
        SPACING_LARGE: 450,
        DELAY: 800,
        ANIMATION_DURATION: 2400,
        HEX_ROTATION: 30,
        CENTER_OFFSET: { x: 0, y: 0, z: 0 }
    },
    
    // Цвета
    COLORS: {
        ASSEMBLY: 0x4a5568,
        CORPUS: 0x4a90e2,
        TVS: 0x4CAF50,
        LID: 0xed8936,
        GLOW: 0x00ffff,
        MARKER: 0x4a90e2
    },
    
    // Длительности анимаций
    ANIMATION: {
        FADE: 500,
        MOVE: 2400,
        CAMERA: 1500
    },
    
    // Коррекция позиций
    POSITION_CORRECTION: {
        CORPUS: { x: 0, y: 0, z: 0 },
        TVS: { x: 0, y: 0, z: 0 },
        LID: { x: 0, y: 2165, z: 0 }
    },
    
    // Камера
    CAMERA_PRESETS: {
        OVERVIEW: { position: [0, 3000, 5000], target: [0, 1000, 0] },
        CORPUS: { position: [0, 1500, 2000], target: [0, 500, 0] },
        TVS: { position: [0, 1500, 1500], target: [0, 1000, 0] },
        LID: { position: [0, 3500, 1500], target: [0, 2500, 0] }
    },
    
    // Режимы
    MODES: {
        NORMAL: 'normal',
        XRAY: 'xray',
        COMPARE: 'compare'
    }
};

// Основное приложение
class ReactorViewer {
    constructor() {
        this.initThreeJS();
        this.initUI();
        this.initEventListeners();
        this.loadModels();
    }
    
    initThreeJS() {
        // Сцена
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0e17, 1000, 10000);
        
        // Контейнер
        this.container = document.getElementById('model-container');
        
        // Камера
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            50000
        );
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);
        
        // Освещение
        this.setupLighting();
        
        // Управление камерой
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.setupControls();
        
        // Raycaster для взаимодействия
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Состояния
        this.currentState = 'assembled';
        this.currentMode = CONFIG.MODES.NORMAL;
        this.selectedPart = null;
        this.tvsDisassembled = false;
        this.animationSpeed = 1.0;
        
        // Модели
        this.models = {
            corpus: null,
            lid: null
        };
        this.tvsModels = [];
        this.comparisonModel = null;
        this.markers = [];
        
        // Эффекты
        this.initEffects();
        
        // Загрузка
        this.updateLoadingText('Инициализация 3D среды...');
        this.updateLoadingProgress(10);
    }
    
    setupLighting() {
        // Основной свет
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(this.ambientLight);
        
        // Направленный свет
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.directionalLight.position.set(100, 300, 100);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.camera.far = 5000;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);
        
        // Задняя подсветка
        this.backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.backLight.position.set(-100, 200, -100);
        this.scene.add(this.backLight);
        
        // Объемный свет для свечения
        this.glowLight = new THREE.PointLight(CONFIG.COLORS.GLOW, 2, 1000);
        this.glowLight.position.set(0, 1500, 0);
        this.scene.add(this.glowLight);
    }
    
    setupControls() {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.panSpeed = 0.5;
        this.zoomSpeed = 0.8;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 10000;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    }
    
    initEffects() {
        // Постобработка для обводки
        this.composer = new THREE.EffectComposer(this.renderer);
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        
        // Outline pass для обводки
        this.outlinePass = new THREE.OutlinePass(
            new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
            this.scene,
            this.camera
        );
        
        this.outlinePass.edgeStrength = 4.0;
        this.outlinePass.edgeGlow = 0.8;
        this.outlinePass.edgeThickness = 2.0;
        this.outlinePass.pulsePeriod = 2;
        this.outlinePass.visibleEdgeColor.set(0x00ffff);
        this.outlinePass.hiddenEdgeColor.set(0x000000);
        this.composer.addPass(this.outlinePass);
        
        // Объекты для обводки
        this.outlineObjects = [];
        
        // Фоновые звезды
        this.createStarfield();
    }
    
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // Случайная позиция в сфере
            const radius = 5000 + Math.random() * 10000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            sizes[i] = Math.random() * 2;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 1,
            sizeAttenuation: true,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }
    
    initUI() {
        // Элементы интерфейса
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.getElementById('loading-text');
        this.loadingProgress = document.getElementById('loading-progress');
        
        // Кнопки
        this.assembleBtn = document.getElementById('assemble-btn');
        this.disassembleBtn = document.getElementById('disassemble-btn');
        this.resetCameraBtn = document.getElementById('reset-camera');
        this.xrayToggleBtn = document.getElementById('xray-toggle');
        this.compareToggleBtn = document.getElementById('compare-toggle');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        this.closeComparisonBtn = document.getElementById('close-comparison');
        
        // Панели
        this.infoPanel = document.getElementById('info-panel');
        this.comparisonPanel = document.getElementById('comparison-panel');
        
        // Слайдер скорости
        this.speedSlider = document.getElementById('animation-speed');
        this.speedValue = document.getElementById('speed-value');
        
        // Текстовые элементы
        this.partName = document.getElementById('part-name');
        this.partDescription = document.getElementById('part-description');
        this.specsList = document.getElementById('specs-list');
        this.selectedPartText = document.getElementById('selected-part');
        this.stateStatus = document.getElementById('state-status');
        
        // Элементы сравнения
        this.comparisonItems = document.querySelectorAll('.comparison-item');
        this.comparisonText = document.getElementById('comparison-text');
        this.scaleText = document.getElementById('scale-text');
        
        // Контейнер для маркеров
        this.markersContainer = document.getElementById('markers-container');
        
        // Иконка состояния
        this.stateMainIcon = document.getElementById('state-main-icon');
    }
    
    initEventListeners() {
        // Управление реактором
        this.assembleBtn.addEventListener('click', () => this.assembleReactor());
        this.disassembleBtn.addEventListener('click', () => this.disassembleReactor());
        
        // Камера
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        
        // Режимы
        this.xrayToggleBtn.addEventListener('click', () => this.toggleXRayMode());
        this.compareToggleBtn.addEventListener('click', () => this.toggleComparisonMode());
        
        // Закрытие панелей
        this.closeInfoBtn.addEventListener('click', () => this.closeInfoPanel());
        this.closeComparisonBtn.addEventListener('click', () => this.closeComparisonPanel());
        
        // Слайдер скорости
        this.speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            this.speedValue.textContent = `${this.animationSpeed}x`;
        });
        
        // Сравнение размеров
        this.comparisonItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const scale = parseFloat(e.currentTarget.dataset.scale);
                const name = e.currentTarget.dataset.name;
                this.updateComparison(scale, name);
                
                // Обновление активного элемента
                this.comparisonItems.forEach(i => i.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Взаимодействие с моделью
        this.container.addEventListener('click', (e) => this.onModelClick(e));
        this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // Ресайз окна
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Анимация
        this.animate();
    }
    
    updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }
    
    updateLoadingProgress(percent) {
        if (this.loadingProgress) {
            this.loadingProgress.style.width = `${percent}%`;
        }
    }
    
    async loadModels() {
        try {
            this.updateLoadingText('Загрузка моделей реактора...');
            this.updateLoadingProgress(30);
            
            // Загрузка моделей
            const loader = new THREE.GLTFLoader();
            
            // Загрузка корпуса
            this.models.corpus = await this.loadModel('corpus', 'models/reactor_corpus.glb');
            this.updateLoadingProgress(50);
            
            // Загрузка ТВС
            await this.loadTVSModels();
            this.updateLoadingProgress(70);
            
            // Загрузка крышки
            this.models.lid = await this.loadModel('lid', 'models/reactor_lid.glb');
            this.updateLoadingProgress(90);
            
            // Добавление моделей в сцену
            this.scene.add(this.models.corpus, this.models.lid);
            this.tvsModels.forEach(tvs => this.scene.add(tvs));
            
            // Настройка камеры
            this.setupCamera();
            
            // Скрытие экрана загрузки
            setTimeout(() => {
                this.loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                }, 500);
            }, 1000);
            
            this.updateLoadingProgress(100);
            this.updateLoadingText('Загрузка завершена!');
            
            console.log('✅ Все модели загружены!');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки моделей:', error);
            this.updateLoadingText('Ошибка загрузки моделей. Проверьте консоль для деталей.');
        }
    }
    
    async loadModel(key, path) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Настройка материалов и теней
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Сохранение исходного материала
                            child.userData.originalMaterial = child.material.clone();
                            
                            // Установка цвета в зависимости от типа детали
                            const color = this.getPartColor(key);
                            child.material = new THREE.MeshStandardMaterial({
                                color: color,
                                roughness: 0.6,
                                metalness: 0.5,
                                side: THREE.DoubleSide
                            });
                            
                            // Данные для взаимодействия
                            child.userData.partType = key;
                            child.userData.modelKey = key;
                            child.userData.isInteractive = true;
                        }
                    });
                    
                    // Коррекция позиции
                    const correction = CONFIG.POSITION_CORRECTION[key.toUpperCase()] || { x: 0, y: 0, z: 0 };
                    model.position.set(
                        model.position.x + correction.x,
                        model.position.y + correction.y,
                        model.position.z + correction.z
                    );
                    
                    resolve(model);
                },
                undefined,
                (error) => {
                    reject(new Error(`Ошибка загрузки модели ${key}: ${error}`));
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
                    // Создание 7 ТВС
                    const assembledPositions = this.generateTvsPositions(
                        7,
                        CONFIG.TVS_HEX_GRID.SPACING_SMALL,
                        CONFIG.TVS_HEX_GRID.HEX_ROTATION
                    );
                    
                    const disassembledPositions = this.generateTvsPositions(
                        7,
                        CONFIG.TVS_HEX_GRID.SPACING_LARGE,
                        CONFIG.TVS_HEX_GRID.HEX_ROTATION
                    );
                    
                    for (let i = 0; i < 7; i++) {
                        const model = gltf.scene.clone();
                        
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                // Сохранение исходного материала
                                child.userData.originalMaterial = child.material.clone();
                                
                                child.material = new THREE.MeshStandardMaterial({
                                    color: CONFIG.COLORS.TVS,
                                    roughness: 0.6,
                                    metalness: 0.5,
                                    side: THREE.DoubleSide
                                });
                                
                                child.userData.partType = 'tvs';
                                child.userData.tvsIndex = i;
                                child.userData.isInteractive = true;
                            }
                        });
                        
                        // Установка позиций
                        model.position.copy(assembledPositions[i]);
                        model.userData.assembledPosition = assembledPositions[i].clone();
                        model.userData.disassembledPosition = disassembledPositions[i].clone();
                        
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
        const angleStep = (2 * Math.PI) / 6;
        
        for (let i = 0; i < 6; i++) {
            const baseAngle = i * angleStep;
            const angle = baseAngle + rotationRad;
            
            const x = Math.cos(angle) * spacing;
            const z = Math.sin(angle) * spacing;
            
            positions.push(new THREE.Vector3(x, 0, z));
        }
        
        return positions;
    }
    
    getPartColor(partType) {
        switch (partType) {
            case 'corpus': return CONFIG.COLORS.CORPUS;
            case 'tvs': return CONFIG.COLORS.TVS;
            case 'lid': return CONFIG.COLORS.LID;
            default: return CONFIG.COLORS.ASSEMBLY;
        }
    }
    
    setupCamera() {
        // Общий вид реактора
        const preset = CONFIG.CAMERA_PRESETS.OVERVIEW;
        this.camera.position.set(...preset.position);
        this.controls.target.set(...preset.target);
        this.controls.update();
    }
    
    resetCamera() {
        const preset = CONFIG.CAMERA_PRESETS.OVERVIEW;
        this.animateCameraTo(preset.position, preset.target);
    }
    
    animateCameraTo(position, target, duration = CONFIG.ANIMATION.CAMERA) {
        return new Promise((resolve) => {
            const startPosition = this.camera.position.clone();
            const startTarget = this.controls.target.clone();
            const endPosition = new THREE.Vector3(...position);
            const endTarget = new THREE.Vector3(...target);
            
            const startTime = Date.now();
            
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeProgress = this.easeInOutCubic(progress);
                
                // Интерполяция позиции
                this.camera.position.lerpVectors(startPosition, endPosition, easeProgress);
                
                // Интерполяция цели
                const currentTarget = startTarget.clone().lerp(endTarget, easeProgress);
                this.controls.target.copy(currentTarget);
                this.controls.update();
                
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
    
    async disassembleReactor() {
        if (this.currentState === 'disassembled') return;
        
        console.log('🔧 Разборка реактора...');
        this.currentState = 'disassembled';
        this.tvsDisassembled = false;
        this.updateState('Разобран');
        
        // Включение интерактивности
        this.enableInteractivity();
        
        // Анимация движения корпуса и крышки
        const corpusTarget = new THREE.Vector3(0, CONFIG.DISASSEMBLY_DISTANCE.CORPUS_DOWN, 0);
        const lidTarget = new THREE.Vector3(0, CONFIG.DISASSEMBLY_DISTANCE.LID_UP, 0);
        
        await Promise.all([
            this.animatePartWithCurve(this.models.corpus, corpusTarget, CONFIG.ANIMATION.MOVE),
            this.animatePartWithCurve(this.models.lid, lidTarget, CONFIG.ANIMATION.MOVE)
        ]);
        
        // Задержка перед разъездом ТВС
        setTimeout(() => {
            this.disassembleTVS();
        }, CONFIG.TVS_HEX_GRID.DELAY);
    }
    
    animatePartWithCurve(part, targetPosition, duration) {
        return new Promise((resolve) => {
            const startPosition = part.position.clone();
            const controlPoint = startPosition.clone().lerp(targetPosition, 0.5);
            controlPoint.y += 500; // Кривая Безье для эффекта "магнитного притяжения"
            
            const curve = new THREE.QuadraticBezierCurve3(
                startPosition,
                controlPoint,
                targetPosition
            );
            
            const startTime = Date.now();
            
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeProgress = this.easeInOutCubic(progress);
                const point = curve.getPoint(easeProgress);
                
                part.position.copy(point);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    async disassembleTVS() {
        console.log('🔧 Разъезд ТВС...');
        this.tvsDisassembled = true;
        
        const animations = this.tvsModels.map((tvs, index) => {
            const targetPos = index === 0 
                ? tvs.userData.assembledPosition.clone()
                : tvs.userData.disassembledPosition.clone();
            
            return this.animatePartWithCurve(tvs, targetPos, CONFIG.TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        await Promise.all(animations);
        
        // Создание маркеров для взаимодействия
        this.createMarkers();
        
        console.log('✅ ТВС разъехались');
    }
    
    createMarkers() {
        // Очистка старых маркеров
        this.clearMarkers();
        
        // Создание маркеров для каждой детали
        this.createPartMarker(this.models.corpus, 'Корпус', 'fas fa-cube');
        this.createPartMarker(this.models.lid, 'Крышка', 'fas fa-circle');
        
        // Маркеры для ТВС
        this.tvsModels.forEach((tvs, index) => {
            const label = index === 0 ? 'Центральная ТВС' : `ТВС ${index}`;
            this.createPartMarker(tvs, label, 'fas fa-bolt');
        });
    }
    
    createPartMarker(part, label, iconClass) {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.dataset.partType = part.userData.partType;
        marker.dataset.tvsIndex = part.userData.tvsIndex;
        marker.title = label;
        
        const markerInner = document.createElement('div');
        markerInner.className = 'marker-inner';
        
        const icon = document.createElement('i');
        icon.className = iconClass;
        
        markerInner.appendChild(icon);
        marker.appendChild(markerInner);
        this.markersContainer.appendChild(marker);
        
        // Обновление позиции маркера
        const updatePosition = () => {
            const vector = part.position.clone().project(this.camera);
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            marker.style.left = `${x - 20}px`;
            marker.style.top = `${y - 20}px`;
            
            // Видимость маркера
            marker.style.display = vector.z > 1 ? 'none' : 'block';
        };
        
        // Сохранение функции обновления
        marker.updatePosition = updatePosition;
        this.markers.push({ marker, updatePosition });
        
        // Обработчик клика
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectPart(part.userData.partType, part.userData.tvsIndex);
        });
    }
    
    updateMarkers() {
        this.markers.forEach(({ updatePosition }) => {
            updatePosition();
        });
    }
    
    clearMarkers() {
        this.markers.forEach(({ marker }) => {
            marker.remove();
        });
        this.markers = [];
    }
    
    async assembleReactor() {
        if (this.currentState === 'assembled') return;
        
        console.log('🔧 Сборка реактора...');
        this.updateState('Сборка...');
        
        // Очистка маркеров
        this.clearMarkers();
        
        // Сборка ТВС
        if (this.tvsDisassembled) {
            await this.assembleTVS();
        }
        
        // Сборка корпуса и крышки
        const corpusTarget = new THREE.Vector3(0, 0, 0);
        const lidTarget = new THREE.Vector3(0, CONFIG.POSITION_CORRECTION.LID.y, 0);
        
        await Promise.all([
            this.animatePartWithCurve(this.models.corpus, corpusTarget, CONFIG.ANIMATION.MOVE),
            this.animatePartWithCurve(this.models.lid, lidTarget, CONFIG.ANIMATION.MOVE)
        ]);
        
        this.currentState = 'assembled';
        this.updateState('Собран');
        
        // Отключение интерактивности
        this.disableInteractivity();
        
        console.log('✅ Сборка завершена');
    }
    
    async assembleTVS() {
        const animations = this.tvsModels.map(tvs => {
            return this.animatePartWithCurve(tvs, tvs.userData.assembledPosition, CONFIG.TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        await Promise.all(animations);
        this.tvsDisassembled = false;
    }
    
    enableInteractivity() {
        // Включение обводки и маркеров
        this.outlinePass.enabled = true;
        this.container.style.cursor = 'pointer';
    }
    
    disableInteractivity() {
        // Отключение обводки
        this.outlinePass.enabled = false;
        this.outlinePass.selectedObjects = [];
        this.container.style.cursor = 'default';
    }
    
    onMouseMove(event) {
        if (this.currentState !== 'disassembled') return;
        
        // Обновление позиции маркеров
        this.updateMarkers();
        
        // Обводка при наведении
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Все интерактивные объекты
        const interactiveObjects = [
            this.models.corpus,
            this.models.lid,
            ...this.tvsModels
        ].filter(obj => obj !== null);
        
        const intersects = this.raycaster.intersectObjects(interactiveObjects, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            let currentObj = object;
            
            // Поиск родительской модели с данными
            while (currentObj && !currentObj.userData.partType) {
                currentObj = currentObj.parent;
            }
            
            if (currentObj && currentObj.userData.partType) {
                // Находим корневую модель
                let rootModel = currentObj;
                while (rootModel.parent && rootModel.parent.type !== 'Scene') {
                    rootModel = rootModel.parent;
                }
                
                // Обводка модели
                this.outlinePass.selectedObjects = [rootModel];
                
                // Свечение
                this.glowLight.position.copy(rootModel.position);
                this.glowLight.position.y += 500;
            }
        } else {
            this.outlinePass.selectedObjects = [];
        }
    }
    
    onModelClick(event) {
        if (this.currentState !== 'disassembled') return;
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const interactiveObjects = [
            this.models.corpus,
            this.models.lid,
            ...this.tvsModels
        ].filter(obj => obj !== null);
        
        const intersects = this.raycaster.intersectObjects(interactiveObjects, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            let currentObj = object;
            
            while (currentObj && !currentObj.userData.partType) {
                currentObj = currentObj.parent;
            }
            
            if (currentObj && currentObj.userData.partType) {
                this.selectPart(
                    currentObj.userData.partType,
                    currentObj.userData.tvsIndex
                );
            }
        }
    }
    
    selectPart(partType, tvsIndex = null) {
        this.selectedPart = { type: partType, tvsIndex };
        
        // Обновление текста
        this.selectedPartText.textContent = this.getPartName(partType, tvsIndex);
        
        // Показ информации о детали
        this.showPartInfo(partType, tvsIndex);
        
        // Перемещение камеры к детали
        this.focusOnPart(partType, tvsIndex);
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
    
    async focusOnPart(partType, tvsIndex = null) {
        let target, cameraPosition;
        
        switch (partType) {
            case 'corpus':
                cameraPosition = CONFIG.CAMERA_PRESETS.CORPUS.position;
                target = CONFIG.CAMERA_PRESETS.CORPUS.target;
                break;
                
            case 'lid':
                cameraPosition = CONFIG.CAMERA_PRESETS.LID.position;
                target = CONFIG.CAMERA_PRESETS.LID.target;
                break;
                
            case 'tvs':
                cameraPosition = CONFIG.CAMERA_PRESETS.TVS.position;
                target = CONFIG.CAMERA_PRESETS.TVS.target;
                
                // Если выбрана конкретная ТВС, смещаем камеру
                if (tvsIndex !== null && tvsIndex !== 0) {
                    const tvs = this.tvsModels[tvsIndex];
                    if (tvs) {
                        target = [tvs.position.x, tvs.position.y + 500, tvs.position.z];
                        cameraPosition = [
                            tvs.position.x + 1000,
                            tvs.position.y + 1000,
                            tvs.position.z + 1000
                        ];
                    }
                }
                break;
        }
        
        if (cameraPosition && target) {
            await this.animateCameraTo(cameraPosition, target);
        }
    }
    
    showPartInfo(partType, tvsIndex = null) {
        const info = this.getPartInfo(partType, tvsIndex);
        
        // Обновление текста
        this.partName.textContent = info.name;
        this.partDescription.textContent = info.description;
        
        // Обновление характеристик
        this.specsList.innerHTML = '';
        info.specs.forEach(spec => {
            const [label, value] = spec.split(': ');
            const li = document.createElement('li');
            li.innerHTML = `<span class="spec-label">${label}:</span> <span class="spec-value">${value}</span>`;
            this.specsList.appendChild(li);
        });
        
        // Обновление иконки
        const iconMap = {
            corpus: 'fas fa-cube',
            lid: 'fas fa-circle',
            tvs: 'fas fa-bolt'
        };
        document.getElementById('part-icon').className = iconMap[partType] || 'fas fa-cube';
        
        // Показ панели
        this.infoPanel.classList.add('active');
    }
    
    getPartInfo(partType, tvsIndex = null) {
        const baseInfo = {
            corpus: {
                name: "Корпус реактора ИБР-4,5",
                description: "Основная несущая конструкция реактора, выполненная из ферритно-мартенситной стали марки ЭП-823. Предназначен для размещения активной зоны и обеспечения теплообмена.",
                specs: [
                    "Материал: ЭП-823 (ферритно-мартенситная сталь)",
                    "Высота: 2545 мм",
                    "Внешний диаметр: 500 мм",
                    "Внутренний диаметр: 400 мм",
                    "Толщина стенки: 50 мм",
                    "Рабочая температура: 500-620°C",
                    "Вес: ≈ 12000 кг"
                ]
            },
            tvs: {
                name: tvsIndex === 0 ? "Центральная ТВС" : `ТВС ${tvsIndex}`,
                description: "Тепловыделяющая сборка, содержащая карбидное уран-плутониевое топливо. Обеспечивает цепную реакцию деления и генерацию тепловой энергии.",
                specs: [
                    "Тип топлива: карбид уран-плутониевый",
                    "Обогащение по плутонию: 13,5%",
                    "Материал оболочки: Циркониевый сплав",
                    "Высота: 2375 мм",
                    "Диаметр: 112,85 мм",
                    "Тепловая мощность: 4,5 МВт",
                    "Количество ТВЭЛов: 127"
                ]
            },
            lid: {
                name: "Крышка реактора",
                description: "Верхняя крышка, обеспечивающая герметичность корпуса реактора. Оснащена системой болтового крепления и уплотнительными элементами.",
                specs: [
                    "Материал: ЭП-823",
                    "Диаметр: 500 мм",
                    "Толщина: 188 мм",
                    "Количество болтов: 28",
                    "Тип уплотнения: металлическая прокладка",
                    "Вес: ≈ 2500 кг"
                ]
            }
        };
        
        return baseInfo[partType] || {
            name: "Деталь реактора",
            description: "Описание детали",
            specs: ["Характеристики не доступны"]
        };
    }
    
    closeInfoPanel() {
        this.infoPanel.classList.remove('active');
        this.selectedPart = null;
        this.selectedPartText.textContent = 'Ничего';
        this.outlinePass.selectedObjects = [];
    }
    
    toggleXRayMode() {
        this.currentMode = this.currentMode === CONFIG.MODES.XRAY 
            ? CONFIG.MODES.NORMAL 
            : CONFIG.MODES.XRAY;
        
        const isXRay = this.currentMode === CONFIG.MODES.XRAY;
        
        // Обновление текста кнопки
        this.xrayToggleBtn.innerHTML = isXRay
            ? '<i class="fas fa-eye"></i><span>Обычный режим</span>'
            : '<i class="fas fa-x-ray"></i><span>Рентген-режим</span>';
        
        // Применение режима ко всем моделям
        this.applyXRayMode(this.models.corpus, isXRay);
        this.applyXRayMode(this.models.lid, isXRay);
        this.tvsModels.forEach(tvs => this.applyXRayMode(tvs, isXRay));
    }
    
    applyXRayMode(model, isXRay) {
        if (!model) return;
        
        model.traverse((child) => {
            if (child.isMesh && child.userData.originalMaterial) {
                if (isXRay) {
                    // Полупрозрачный материал для рентген-режима
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: child.userData.originalMaterial.color,
                        transmission: 0.8,
                        roughness: 0.1,
                        thickness: 1,
                        transparent: true,
                        opacity: 0.3
                    });
                } else {
                    // Возврат к исходному материалу
                    child.material = child.userData.originalMaterial.clone();
                }
                child.material.needsUpdate = true;
            }
        });
    }
    
    toggleComparisonMode() {
        this.comparisonPanel.classList.toggle('active');
        
        if (this.comparisonPanel.classList.contains('active')) {
            // Показ модели для сравнения (человек)
            this.showComparisonModel(1.8, 'Человек (1.8м)');
        } else {
            // Удаление модели сравнения
            this.removeComparisonModel();
        }
    }
    
    showComparisonModel(scale, name) {
        // Удаление предыдущей модели
        this.removeComparisonModel();
        
        // Создание простой модели человека (цилиндр + сфера)
        const group = new THREE.Group();
        
        // Тело (цилиндр)
        const bodyGeometry = new THREE.CylinderGeometry(scale * 0.15, scale * 0.15, scale * 0.6);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4CAF50,
            roughness: 0.7
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = scale * 0.3;
        group.add(body);
        
        // Голова (сфера)
        const headGeometry = new THREE.SphereGeometry(scale * 0.2);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8BC34A,
            roughness: 0.7
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = scale * 0.9;
        group.add(head);
        
        // Позиционирование рядом с реактором
        group.position.set(3000, scale * 0.5, 0);
        group.scale.set(100, 100, 100); // Масштабирование к метрической системе
        
        this.scene.add(group);
        this.comparisonModel = group;
        
        // Обновление текста
        this.comparisonText.innerHTML = `Высота реактора: <strong>5.2 м</strong><br>${name}`;
        this.scaleText.textContent = `Масштаб: 1:${(5.2 / scale).toFixed(1)}`;
    }
    
    removeComparisonModel() {
        if (this.comparisonModel) {
            this.scene.remove(this.comparisonModel);
            this.comparisonModel = null;
        }
    }
    
    updateComparison(scale, name) {
        if (this.comparisonPanel.classList.contains('active')) {
            this.showComparisonModel(scale, name);
        }
    }
    
    closeComparisonPanel() {
        this.comparisonPanel.classList.remove('active');
        this.removeComparisonModel();
    }
    
    updateState(state) {
        this.stateStatus.textContent = state;
        
        // Обновление иконки состояния
        const iconMap = {
            'Собран': 'fas fa-check-circle',
            'Разобран': 'fas fa-layer-group',
            'Сборка...': 'fas fa-cogs'
        };
        
        this.stateMainIcon.className = iconMap[state] || 'fas fa-atom';
    }
    
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        if (this.composer) {
            this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
        
        // Обновление маркеров
        this.updateMarkers();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Обновление управления камерой
        this.controls.update();
        
        // Анимация звездного поля (параллакс-эффект)
        if (this.starfield) {
            this.starfield.rotation.y += 0.0001;
        }
        
        // Анимация пульсации обводки
        if (this.outlinePass.enabled && this.outlinePass.selectedObjects.length > 0) {
            const time = Date.now() * 0.001;
            this.outlinePass.edgeStrength = 4.0 + Math.sin(time * 2) * 1.5;
            this.outlinePass.edgeGlow = 0.8 + Math.sin(time * 3) * 0.2;
        }
        
        // Рендеринг
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Обновление позиции объемного света для следования за камерой
        this.glowLight.position.copy(this.camera.position);
        this.glowLight.position.y -= 500;
    }
}

// Инициализация приложения
window.addEventListener('DOMContentLoaded', () => {
    new ReactorViewer();
});