// Основной код просмотрщика реактора ИБР-4,5
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
                MOVE: 2400
            },
            
            MANUAL_POSITION_CORRECTION: {
                CORPUS: { x: 0, y: 0, z: 0 },
                TVS: { x: 0, y: 0, z: 0 },
                LID: { x: 0, y: 2165, z: 0 }
            }
        };

        // Состояние
        this.currentState = 'assembled';
        this.selectedPart = null;
        this.tvsDisassembled = false;
        
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
        console.log("🚀 Запуск интерактивного 3D просмотрщика...");
        
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupControls();
        this.setupUI();
        this.setupEventListeners();
        
        this.loadModels();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Черный фон вместо тумана
    }

    setupCamera() {
        const container = document.getElementById('model-container');
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            50000
        );
        this.camera.position.set(0, 100, 300);
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
    }

    setupUI() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.getElementById('loading-text');
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingError = document.getElementById('loading-error');
        
        this.assembleBtn = document.getElementById('assemble-btn');
        this.disassembleBtn = document.getElementById('disassemble-btn');
        this.resetCameraBtn = document.getElementById('reset-camera');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        
        this.infoPanel = document.getElementById('info-panel');
        this.selectedPartText = document.getElementById('selected-part');
        this.stateStatus = document.getElementById('state-status');
        
        this.partName = document.getElementById('part-name');
        this.partDescription = document.getElementById('part-description');
        this.specsList = document.getElementById('specs-list');
    }

    setupEventListeners() {
        this.assembleBtn.addEventListener('click', () => this.assembleReactor());
        this.disassembleBtn.addEventListener('click', () => this.disassembleReactor());
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        this.closeInfoBtn.addEventListener('click', () => this.closeInfoPanel());
        
        this.renderer.domElement.addEventListener('click', (e) => this.onModelClick(e));
        window.addEventListener('resize', () => this.onWindowResize());
        
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

    setupInitialCamera() {
        const box = new THREE.Box3();
        
        this.tvsModels.forEach(tvs => box.expandByObject(tvs));
        if (this.models.corpus) box.expandByObject(this.models.corpus);
        if (this.models.lid) box.expandByObject(this.models.lid);
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        let cameraDistance = maxDim * 1.8;
        cameraDistance = Math.max(cameraDistance, 150);
        
        this.camera.position.set(0, cameraDistance * 0.5, cameraDistance);
        this.camera.lookAt(0, 2500, 0);
        
        this.controls.target.set(0, 0, 0);
        this.controls.maxDistance = cameraDistance * 4;
        this.controls.minDistance = maxDim * 0.3;
        this.controls.update();
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
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
            const vector = part.position.clone().project(this.camera);
            
            // Проверяем, что объект перед камерой
            if (vector.z < 1) {
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
                
                marker.style.left = `${x - 20}px`;
                marker.style.top = `${y - 20}px`;
                marker.style.display = 'block';
            } else {
                marker.style.display = 'none';
            }
        };
        
        // Сохраняем функцию обновления
        marker.updatePosition = updatePosition;
        this.markers.push({ marker, updatePosition, part });
        
        // Обработчик клика
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectPart(part.userData.partType, part.userData.tvsIndex);
        });
        
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
        const corpusTarget = new THREE.Vector3(0, 0, 0);
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
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
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
            }
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
        
        // Перемещаем камеру к детали (после того как маркеры уже на месте)
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
    }

    getPartInfo(partType, tvsIndex = null) {
        const baseInfo = {
            corpus: {
                name: "Корпус реактора ИБР-4,5",
                description: "Основная несущая конструкция реактора, выполненная из ферритно-мартенситной стали марки ЭП-823. Предназначен для размещения активной зоны и обеспечения теплообмена.",
                specs: [
                    { label: "Материал", value: "ЭП-823" },
                    { label: "Высота", value: "2545 мм" },
                    { label: "Внешний диаметр", value: "500 мм" },
                    { label: "Внутренний диаметр", value: "400 мм" },
                    { label: "Толщина стенки", value: "50 мм" },
                    { label: "Рабочая температура", value: "500-620°C" }
                ]
            },
            tvs: {
                name: tvsIndex === 0 ? "Центральная ТВС" : `ТВС ${tvsIndex}`,
                description: "Тепловыделяющая сборка, содержащая карбидное уран-плутониевое топливо. Обеспечивает цепную реакцию деления и генерацию тепловой энергии.",
                specs: [
                    { label: "Тип топлива", value: "карбид уран-плутониевый" },
                    { label: "Обогащение", value: "13,5% плутония" },
                    { label: "Материал оболочки", value: "Циркониевый сплав" },
                    { label: "Высота", value: "2375 мм" },
                    { label: "Диаметр", value: "112,85 мм" },
                    { label: "Тепловая мощность", value: "4,5 МВт" }
                ]
            },
            lid: {
                name: "Крышка реактора",
                description: "Верхняя крышка, обеспечивающая герметичность корпуса реактора. Оснащена системой болтового крепления и уплотнительными элементами.",
                specs: [
                    { label: "Материал", value: "ЭП-823" },
                    { label: "Диаметр", value: "500 мм" },
                    { label: "Толщина", value: "188 мм" },
                    { label: "Количество болтов", value: "28" }
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
                    child.material.emissive = new THREE.Color(0x444444);
                    child.material.emissiveIntensity = 0.5;
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
                targetPosition = new THREE.Vector3(0, 500, 0);
                cameraPosition = new THREE.Vector3(0, 1500, 2000);
                break;
                
            case 'lid':
                targetPosition = new THREE.Vector3(0, 2500, 0);
                cameraPosition = new THREE.Vector3(0, 3500, 1500);
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
            } else if (state === 'Разобран') {
                stateIcon.className = 'fas fa-layer-group';
            } else if (state === 'Сборка...') {
                stateIcon.className = 'fas fa-cogs';
            } else {
                stateIcon.className = 'fas fa-atom';
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