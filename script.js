// Упрощенная версия скрипта без постобработки для начала
class ReactorViewer {
    constructor() {
        this.config = {
            DISASSEMBLY_DISTANCE: {
                CORPUS_DOWN: -2500,
                LID_UP: 4100
            },
            TVS_HEX_GRID: {
                SPACING_SMALL: 120,
                SPACING_LARGE: 450,
                HEX_ROTATION: 30
            },
            COLORS: {
                CORPUS: 0x4a90e2,
                TVS: 0x4CAF50,
                LID: 0xed8936,
                ASSEMBLY: 0x4a5568
            }
        };

        this.init();
    }

    init() {
        console.log("🚀 Инициализация 3D просмотрщика реактора...");
        
        // Проверка зависимостей
        if (typeof THREE === 'undefined') {
            this.showError('Three.js не загружен');
            return;
        }

        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupControls();
        this.setupUI();
        this.setupEventListeners();
        
        // Загружаем демо-модели (геометрические фигуры вместо GLB)
        this.loadDemoModels();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e17);
        
        // Простой туман для глубины
        this.scene.fog = new THREE.Fog(0x000000);
    }

    setupCamera() {
        const container = document.getElementById('model-container');
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            50000
        );
        this.camera.position.set(0, 3000, 5000);
    }

    setupRenderer() {
        const container = document.getElementById('model-container');
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        // Основной свет
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Направленный свет
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 300, 100);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Задняя подсветка
        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-100, 200, -100);
        this.scene.add(backLight);
    }

    setupControls() {
        if (typeof THREE.OrbitControls === 'undefined') {
            console.warn('OrbitControls не загружены');
            return;
        }
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 20000;
    }

    setupUI() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.getElementById('loading-text');
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingError = document.getElementById('loading-error');
        this.loadingActions = document.getElementById('loading-actions');
        
        this.assembleBtn = document.getElementById('assemble-btn');
        this.disassembleBtn = document.getElementById('disassemble-btn');
        this.resetCameraBtn = document.getElementById('reset-camera');
        this.xrayToggleBtn = document.getElementById('xray-toggle');
        this.compareToggleBtn = document.getElementById('compare-toggle');
        
        this.infoPanel = document.getElementById('info-panel');
        this.comparisonPanel = document.getElementById('comparison-panel');
        
        this.selectedPartText = document.getElementById('selected-part');
        this.stateStatus = document.getElementById('state-status');
        
        this.updateLoadingText('Создание 3D сцены...');
        this.updateLoadingProgress(30);
    }

    setupEventListeners() {
        // Управление реактором
        this.assembleBtn.addEventListener('click', () => this.assembleReactor());
        this.disassembleBtn.addEventListener('click', () => this.disassembleReactor());
        
        // Камера
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        
        // Режимы
        this.xrayToggleBtn.addEventListener('click', () => this.toggleXRayMode());
        this.compareToggleBtn.addEventListener('click', () => this.toggleComparisonMode());
        
        // Закрытие панелей
        document.getElementById('close-info-btn')?.addEventListener('click', () => this.closeInfoPanel());
        document.getElementById('close-comparison')?.addEventListener('click', () => this.closeComparisonPanel());
        
        // Кнопки загрузки
        document.getElementById('retry-loading')?.addEventListener('click', () => window.location.reload());
        document.getElementById('use-demo-models')?.addEventListener('click', () => this.loadDemoModels());
        
        // Ресайз окна
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Клик по модели
        this.renderer.domElement.addEventListener('click', (e) => this.onModelClick(e));
        
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

    showError(message) {
        console.error('❌ Ошибка:', message);
        
        if (this.loadingText) {
            this.loadingText.textContent = 'Ошибка загрузки';
        }
        
        if (this.loadingError) {
            this.loadingError.textContent = message;
            this.loadingError.style.display = 'block';
        }
        
        if (this.loadingActions) {
            this.loadingActions.style.display = 'flex';
        }
    }

    async loadModels() {
        try {
            this.updateLoadingText('Загрузка моделей реактора...');
            this.updateLoadingProgress(30);
            
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
            this.scene.add(this.models.corpus);
            this.scene.add(this.models.lid);
            this.tvsModels.forEach(tvs => this.scene.add(tvs));
            
            // Настройка камеры
            this.setupInitialCamera();
            
            // Скрытие экрана загрузки
            setTimeout(() => {
                this.hideLoadingScreen();
                console.log('✅ Все модели загружены!');
            }, 1000);
            
            this.updateLoadingProgress(100);
            this.updateLoadingText('Загрузка завершена!');
            
        } catch (error) {
            this.showError(`Ошибка загрузки: ${error.message}`);
            console.error('❌ Ошибка при загрузке моделей:', error);
        }
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
                    
                    // Применяем ручную корректировку позиции
                    const correctionKey = key.toUpperCase();
                    const correction = this.config.MANUAL_POSITION_CORRECTION[correctionKey] || { x: 0, y: 0, z: 0 };
                    model.position.x += correction.x;
                    model.position.y += correction.y;
                    model.position.z += correction.z;
                    
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
                        
                        // Применяем позицию
                        model.position.copy(assembledPositions[i]);
                        
                        // Сохраняем позиции для анимации
                        model.userData.assembledPosition = assembledPositions[i].clone();
                        model.userData.disassembledPosition = disassembledPositions[i].clone();
                        
                        this.tvsModels.push(model);
                    }
                    
                    console.log(`✅ Создано ${this.tvsModels.length} ТВС`);
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
        positions.push(new THREE.Vector3(
            this.config.TVS_HEX_GRID.CENTER_OFFSET.x,
            this.config.TVS_HEX_GRID.CENTER_OFFSET.y,
            this.config.TVS_HEX_GRID.CENTER_OFFSET.z
        ));
        
        // 6 ТВС вокруг центральной
        const sideSpacing = spacing;
        const angleStep = (2 * Math.PI) / 6;
        
        for (let i = 0; i < 6; i++) {
            const baseAngle = i * angleStep;
            const angle = baseAngle + rotationRad;
            
            const x = Math.cos(angle) * sideSpacing;
            const z = Math.sin(angle) * sideSpacing;
            
            positions.push(new THREE.Vector3(
                x + this.config.TVS_HEX_GRID.CENTER_OFFSET.x,
                this.config.TVS_HEX_GRID.CENTER_OFFSET.y,
                z + this.config.TVS_HEX_GRID.CENTER_OFFSET.z
            ));
        }
        
        return positions;
    }

            this.updateLoadingProgress(90);
            this.updateLoadingText('Настройка интерфейса...');
            
            // Скрываем экран загрузки
            setTimeout(() => {
                this.hideLoadingScreen();
                console.log('✅ Демо-модели загружены!');
            }, 1000);
            
        } catch (error) {
            this.showError(`Ошибка создания моделей: ${error.message}`);
        }
    }

    generateTVSPositions(count, spacing) {
        const positions = [];
        const rotationRad = THREE.MathUtils.degToRad(this.config.TVS_HEX_GRID.HEX_ROTATION);
        
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

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    disassembleReactor() {
        if (this.currentState === 'disassembled') return;
        
        console.log('🔧 Разборка реактора...');
        this.currentState = 'disassembled';
        this.updateState('Разобран');
        
        // Анимация корпуса вниз
        this.animatePart(this.corpus, 
            new THREE.Vector3(0, this.config.DISASSEMBLY_DISTANCE.CORPUS_DOWN, 0),
            2000
        );
        
        // Анимация крышки вверх
        this.animatePart(this.lid,
            new THREE.Vector3(0, this.config.DISASSEMBLY_DISTANCE.LID_UP, 0),
            2000
        );
        
        // Разъезд ТВС с задержкой
        setTimeout(() => {
            this.disassembleTVS();
        }, 800);
    }

    animatePart(part, targetPosition, duration) {
        const startPosition = part.position.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Кривая Безье для плавности
            const easeProgress = this.easeInOutCubic(progress);
            
            // Линейная интерполяция
            part.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    disassembleTVS() {
        console.log('🔧 Разъезд ТВС...');
        
        this.tvsModels.forEach((tvs, index) => {
            if (index === 0) return; // Центральная остается на месте
            
            const targetPos = tvs.userData.disassembledPosition;
            this.animatePart(tvs, targetPos, 2400);
        });
        
        // Включаем интерактивность
        this.enableInteractivity();
    }

    enableInteractivity() {
        // Включаем курсор-указатель
        this.renderer.domElement.style.cursor = 'pointer';
        
        // Создаем маркеры
        this.createMarkers();
    }

    createMarkers() {
        // Очищаем старые маркеры
        const container = document.getElementById('markers-container');
        container.innerHTML = '';
        
        // Маркер для корпуса
        this.createMarker(this.corpus, 'Корпус', 'fas fa-cube');
        
        // Маркер для крышки
        this.createMarker(this.lid, 'Крышка', 'fas fa-circle');
        
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
        marker.dataset.index = part.userData.index || 0;
        
        // Позиционирование
        const updatePosition = () => {
            const vector = part.position.clone().project(this.camera);
            
            // Преобразование из координат камеры в экранные координаты
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            // Показываем маркер только если объект перед камерой
            if (vector.z < 1) {
                marker.style.left = `${x - 20}px`;
                marker.style.top = `${y - 20}px`;
                marker.style.display = 'block';
            } else {
                marker.style.display = 'none';
            }
        };
        
        // Сохраняем функцию обновления
        marker.updatePosition = updatePosition;
        this.markers = this.markers || [];
        this.markers.push({ marker, updatePosition });
        
        // Обработчик клика
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectPart(part.userData.partType, part.userData.index);
        });
        
        document.getElementById('markers-container').appendChild(marker);
    }

    updateMarkers() {
        if (!this.markers) return;
        
        this.markers.forEach(({ updatePosition }) => {
            updatePosition();
        });
    }

    assembleReactor() {
        if (this.currentState === 'assembled') return;
        
        console.log('🔧 Сборка реактора...');
        this.updateState('Сборка...');
        
        // Убираем маркеры
        this.clearMarkers();
        
        // Сборка ТВС
        this.tvsModels.forEach((tvs) => {
            const targetPos = tvs.userData.assembledPosition;
            this.animatePart(tvs, targetPos, 2400);
        });
        
        // Сборка корпуса и крышки
        setTimeout(() => {
            this.animatePart(this.corpus, new THREE.Vector3(0, 0, 0), 2000);
            this.animatePart(this.lid, new THREE.Vector3(0, 2165, 0), 2000);
            
            this.currentState = 'assembled';
            this.updateState('Собран');
            
            // Выключаем интерактивность
            this.renderer.domElement.style.cursor = 'default';
        }, 1000);
    }

    clearMarkers() {
        const container = document.getElementById('markers-container');
        container.innerHTML = '';
        this.markers = [];
    }

    onModelClick(event) {
        if (this.currentState !== 'disassembled') return;
        
        // Получаем координаты мыши в нормализованных координатах устройства (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Обновляем Raycaster
        this.raycaster = this.raycaster || new THREE.Raycaster();
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        // Все интерактивные объекты
        const interactiveObjects = [
            this.corpus,
            this.lid,
            ...this.tvsModels
        ];
        
        const intersects = this.raycaster.intersectObjects(interactiveObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            this.selectPart(object.userData.partType, object.userData.index);
        }
    }

    selectPart(partType, index = null) {
        console.log(`🔍 Выбрана деталь: ${partType} ${index !== null ? index : ''}`);
        
        // Обновляем текст выбранной детали
        let partName = '';
        switch(partType) {
            case 'corpus': partName = 'Корпус реактора'; break;
            case 'lid': partName = 'Крышка реактора'; break;
            case 'tvs': partName = index === 0 ? 'Центральная ТВС' : `ТВС ${index}`; break;
        }
        
        this.selectedPartText.textContent = partName;
        
        // Показываем информацию
        this.showPartInfo(partType, index);
        
        // Фокусируем камеру на детали
        this.focusOnPart(partType, index);
    }

    showPartInfo(partType, index = null) {
        const info = this.getPartInfo(partType, index);
        
        // Обновляем содержимое панели
        document.getElementById('part-name').textContent = info.name;
        document.getElementById('part-description').textContent = info.description;
        
        // Обновляем характеристики
        const specsList = document.getElementById('specs-list');
        specsList.innerHTML = '';
        info.specs.forEach(spec => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="spec-label">${spec.label}:</span> <span class="spec-value">${spec.value}</span>`;
            specsList.appendChild(li);
        });
        
        // Показываем панель
        this.infoPanel.classList.remove('panel-hidden');
        this.infoPanel.classList.add('active');
    }

    getPartInfo(partType, index = null) {
        const baseInfo = {
            corpus: {
                name: "Корпус реактора РИМ-К-4,5",
                description: "Основная несущая конструкция реактора из ферритно-мартенситной стали. Выдерживает высокие температуры и давление.",
                specs: [
                    { label: "Материал", value: "ЭП-823" },
                    { label: "Высота", value: "2545 мм" },
                    { label: "Диаметр", value: "500 мм" },
                    { label: "Температура", value: "500-620°C" }
                ]
            },
            lid: {
                name: "Крышка реактора",
                description: "Верхняя крышка, обеспечивающая герметичность корпуса. Оснащена системой болтового крепления.",
                specs: [
                    { label: "Материал", value: "ЭП-823" },
                    { label: "Диаметр", value: "500 мм" },
                    { label: "Толщина", value: "188 мм" },
                    { label: "Болтов", value: "28 шт" }
                ]
            },
            tvs: {
                name: index === 0 ? "Центральная ТВС" : `ТВС ${index}`,
                description: "Тепловыделяющая сборка с карбидным уран-плутониевым топливом. Генерирует тепловую энергию.",
                specs: [
                    { label: "Топливо", value: "карбид уран-плутониевый" },
                    { label: "Обогащение", value: "13,5% Pu" },
                    { label: "Высота", value: "2375 мм" },
                    { label: "Диаметр", value: "112,85 мм" }
                ]
            }
        };
        
        return baseInfo[partType] || {
            name: "Деталь реактора",
            description: "Описание детали",
            specs: [{ label: "Характеристики", value: "Не доступны" }]
        };
    }

    focusOnPart(partType, index = null) {
        let target = null;
        
        switch(partType) {
            case 'corpus':
                target = this.corpus;
                break;
            case 'lid':
                target = this.lid;
                break;
            case 'tvs':
                target = this.tvsModels[index || 0];
                break;
        }
        
        if (target) {
            // Плавное перемещение камеры к детали
            const targetPosition = target.position.clone();
            const cameraPosition = targetPosition.clone().add(new THREE.Vector3(1000, 1000, 1000));
            
            // Анимация камеры
            this.animateCameraTo(cameraPosition, targetPosition);
        }
    }

    animateCameraTo(position, target) {
        if (!this.controls) return;
        
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 1500;
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
        this.selectedPartText.textContent = 'Ничего';
    }

    resetCamera() {
        this.camera.position.set(0, 3000, 5000);
        this.controls.target.set(0, 1000, 0);
        this.controls.update();
    }

    toggleXRayMode() {
        const isActive = this.xrayToggleBtn.classList.toggle('active');
        const text = isActive ? 'Рентген-режим: ВКЛ' : 'Рентген-режим: ВЫКЛ';
        const icon = isActive ? 'fa-eye-slash' : 'fa-eye';
        
        this.xrayToggleBtn.querySelector('i').className = `fas ${icon}`;
        this.xrayToggleBtn.querySelector('span').textContent = text;
        
        // В реальной реализации здесь бы менялась прозрачность материалов
        console.log(`Режим рентгена: ${isActive ? 'ВКЛ' : 'ВЫКЛ'}`);
    }

    toggleComparisonMode() {
        this.comparisonPanel.classList.toggle('panel-hidden');
        
        if (!this.comparisonPanel.classList.contains('panel-hidden')) {
            // Показываем сравнение
            this.showComparison(1.8);
        }
    }

    showComparison(scale) {
        // Создаем простую модель человека для сравнения
        if (this.comparisonModel) {
            this.scene.remove(this.comparisonModel);
        }
        
        const group = new THREE.Group();
        
        // Тело (цилиндр)
        const bodyGeometry = new THREE.CylinderGeometry(scale * 0.1, scale * 0.1, scale * 0.6);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x4CAF50 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = scale * 0.3;
        group.add(body);
        
        // Голова (сфера)
        const headGeometry = new THREE.SphereGeometry(scale * 0.15);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = scale * 0.9;
        group.add(head);
        
        // Позиция рядом с реактором
        group.position.set(3000, 0, 0);
        group.scale.set(100, 100, 100);
        
        this.scene.add(group);
        this.comparisonModel = group;
        
        // Обновляем текст
        document.getElementById('comparison-text').textContent = 
            `Реактор: 5.2 м vs Человек: ${scale} м`;
        document.getElementById('scale-text').textContent = 
            `Разница: ${(5.2 / scale).toFixed(1)}:1`;
    }

    closeComparisonPanel() {
        this.comparisonPanel.classList.add('panel-hidden');
        
        if (this.comparisonModel) {
            this.scene.remove(this.comparisonModel);
            this.comparisonModel = null;
        }
    }

    updateState(state) {
        if (this.stateStatus) {
            this.stateStatus.textContent = state;
        }
    }

    onWindowResize() {
        const container = document.getElementById('model-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Обновляем позиции маркеров
        this.updateMarkers();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        // Обновляем позиции маркеров каждый кадр
        this.updateMarkers();
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск приложения при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    // Даем время на загрузку всех скриптов
    setTimeout(() => {
        try {
            new ReactorViewer();
        } catch (error) {
            console.error('❌ Критическая ошибка при запуске:', error);
            document.getElementById('loading-text').textContent = 'Критическая ошибка!';
            document.getElementById('loading-error').textContent = error.message;
            document.getElementById('loading-error').style.display = 'block';
            document.getElementById('loading-actions').style.display = 'flex';
        }
    }, 100);
});
