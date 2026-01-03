// Основной класс просмотрщика реактора
class ReactorViewer {
    constructor() {
        this.config = {
            DISASSEMBLY_DISTANCE: {
                CORPUS_DOWN: -2500,
                LID_UP: 4100,
                TVS_SPREAD: 800
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
            INITIAL_CAMERA: {
                x: 0,
                y: 3900, // Поднята на 800 единиц
                z: 2500  // В 2 раза ближе
            },
            LIGHTING: {
                ambient: 0xffffff,
                ambientIntensity: 0.2,
                directional1: {
                    color: 0xffffff,
                    intensity: 0.2,
                    position: { x: 100, y: 200, z: 150 }
                },
                directional2: {
                    color: 0xffffff,
                    intensity: 0.2,
                    position: { x: -150, y: 100, z: -100 }
                }
            }
        };

        this.models = {
            corpus: null,
            lid: null,
            tvs: [], // 7 ТВС
            assembly: null
        };

        this.currentState = 'assembled';
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.loadingSteps = 0;
        this.totalLoadingSteps = 8; // Увеличено для более долгой загрузки
        
        this.init();
    }

    async init() {
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
        
        // Искусственная задержка для показа загрузочного экрана
        await this.delay(1500);
        
        // Загружаем модели
        await this.loadModels();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e17);
        
        // Убираем туман
        // this.scene.fog = new THREE.Fog(0x0a0e17, 1000, 10000);
    }

    setupCamera() {
        const container = document.getElementById('model-container');
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            50000
        );
        
        // Устанавливаем начальную позицию камеры выше и ближе
        this.camera.position.set(
            this.config.INITIAL_CAMERA.x,
            this.config.INITIAL_CAMERA.y,
            this.config.INITIAL_CAMERA.z
        );
        
        // Сохраняем начальную позицию для сброса
        this.initialCameraPosition = this.camera.position.clone();
        this.initialCameraTarget = new THREE.Vector3(0, 1500, 0);
    }

    setupRenderer() {
        const container = document.getElementById('model-container');
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Ограничиваем для мобильных
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        // Основной свет с новой позицией
        const ambientLight = new THREE.AmbientLight(
            this.config.LIGHTING.ambient,
            this.config.LIGHTING.ambientIntensity
        );
        this.scene.add(ambientLight);

        // Направленный свет 1
        const directionalLight1 = new THREE.DirectionalLight(
            this.config.LIGHTING.directional1.color,
            this.config.LIGHTING.directional1.intensity
        );
        directionalLight1.position.set(
            this.config.LIGHTING.directional1.position.x,
            this.config.LIGHTING.directional1.position.y,
            this.config.LIGHTING.directional1.position.z
        );
        directionalLight1.castShadow = true;
        directionalLight1.shadow.camera.left = -2000;
        directionalLight1.shadow.camera.right = 2000;
        directionalLight1.shadow.camera.top = 2000;
        directionalLight1.shadow.camera.bottom = -2000;
        this.scene.add(directionalLight1);

        // Направленный свет 2 (задняя подсветка)
        const directionalLight2 = new THREE.DirectionalLight(
            this.config.LIGHTING.directional2.color,
            this.config.LIGHTING.directional2.intensity
        );
        directionalLight2.position.set(
            this.config.LIGHTING.directional2.position.x,
            this.config.LIGHTING.directional2.position.y,
            this.config.LIGHTING.directional2.position.z
        );
        this.scene.add(directionalLight2);
    }

    setupControls() {
        if (typeof THREE.OrbitControls === 'undefined') {
            console.warn('OrbitControls не загружены');
            return;
        }
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 500;
        this.controls.maxDistance = 15000;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Ограничиваем угол обзора
        this.controls.target.copy(this.initialCameraTarget);
        this.controls.update();
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
        
        this.infoPanel = document.getElementById('info-panel');
        
        this.selectedPartText = document.getElementById('selected-part');
        this.stateStatus = document.getElementById('state-status');
        
        // Адаптация интерфейса для мобильных
        if (this.isMobile) {
            this.adaptForMobile();
        }
        
        this.updateLoadingText('Создание 3D сцены...');
        this.updateLoadingProgress(12);
    }

    adaptForMobile() {
        console.log('📱 Адаптация интерфейса для мобильных устройств');
        
        // Уменьшаем размер кнопок
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.style.padding = '10px 12px';
            btn.style.fontSize = '14px';
        });
        
        // Адаптируем панель управления
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.style.bottom = '70px';
        }
    }

    setupEventListeners() {
        // Управление реактором
        this.assembleBtn.addEventListener('click', () => this.assembleReactor());
        this.disassembleBtn.addEventListener('click', () => this.disassembleReactor());
        
        // Камера
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        
        // Закрытие панелей
        document.getElementById('close-info-btn')?.addEventListener('click', () => this.closeInfoPanel());
        
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

    async loadModels() {
        console.log('📦 Загрузка моделей реактора...');
        
        if (typeof THREE.GLTFLoader === 'undefined') {
            this.showError('GLTFLoader не загружен');
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        const modelPath = 'models/';
        
        try {
            // Загружаем корпус
            this.updateLoadingText('Загрузка корпуса реактора...');
            this.updateLoadingProgress(25);
            await this.delay(500);
            
            const corpusData = await this.loadGLTF(loader, `${modelPath}reactor_corpus.glb`);
            this.models.corpus = corpusData.scene;
            this.models.corpus.position.set(0, 0, 0);
            this.models.corpus.scale.set(1, 1, 1);
            this.models.corpus.userData = { partType: 'corpus', name: 'Корпус реактора' };
            this.scene.add(this.models.corpus);
            
            // Загружаем крышку
            this.updateLoadingText('Загрузка крышки реактора...');
            this.updateLoadingProgress(40);
            await this.delay(500);
            
            const lidData = await this.loadGLTF(loader, `${modelPath}reactor_lid.glb`);
            this.models.lid = lidData.scene;
            this.models.lid.position.set(0, 2165, 0);
            this.models.lid.scale.set(1, 1, 1);
            this.models.lid.userData = { partType: 'lid', name: 'Крышка реактора' };
            this.scene.add(this.models.lid);
            
            // Загружаем сборку ТВС
            this.updateLoadingText('Загрузка тепловыделяющих сборок...');
            this.updateLoadingProgress(60);
            await this.delay(500);
            
            const tvsData = await this.loadGLTF(loader, `${modelPath}reactor_tvs.glb`);
            
            // Создаем 7 ТВС в шестиугольной решетке
            this.models.tvs = [];
            const positions = this.generateTVSPositions(7, 120);
            
            for (let i = 0; i < 7; i++) {
                const tvs = tvsData.scene.clone();
                tvs.position.copy(positions[i]);
                tvs.scale.set(1, 1, 1);
                tvs.userData = { 
                    partType: 'tvs', 
                    name: i === 0 ? 'Центральная ТВС' : `ТВС ${i}`,
                    index: i,
                    assembledPosition: positions[i].clone(),
                    disassembledPosition: this.generateTVSPositions(7, this.config.DISASSEMBLY_DISTANCE.TVS_SPREAD)[i]
                };
                
                this.models.tvs.push(tvs);
                this.scene.add(tvs);
            }
            
            // Загружаем общую сборку (для справки)
            this.updateLoadingText('Загрузка общей сборки...');
            this.updateLoadingProgress(80);
            await this.delay(500);
            
            const assemblyData = await this.loadGLTF(loader, `${modelPath}reactor_assembly.glb`);
            this.models.assembly = assemblyData.scene;
            this.models.assembly.visible = false; // Скрываем, используем отдельные части
            
            this.updateLoadingProgress(90);
            this.updateLoadingText('Настройка интерфейса...');
            await this.delay(1000);
            
            // Скрываем экран загрузки
            this.hideLoadingScreen();
            console.log('✅ Модели реактора успешно загружены!');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки моделей:', error);
            this.showError(`Ошибка загрузки моделей: ${error.message}`);
        }
    }

    loadGLTF(loader, url) {
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf) => {
                    this.loadingSteps++;
                    resolve(gltf);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(2);
                    console.log(`Загрузка: ${percent}%`);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    generateTVSPositions(count, spacing) {
        const positions = [];
        
        // Центральная ТВС
        positions.push(new THREE.Vector3(0, 0, 0));
        
        // 6 ТВС вокруг центральной (шестиугольник)
        const angleStep = (2 * Math.PI) / 6;
        
        for (let i = 0; i < 6; i++) {
            const angle = i * angleStep;
            const x = Math.cos(angle) * spacing;
            const z = Math.sin(angle) * spacing;
            
            positions.push(new THREE.Vector3(x, 0, z));
        }
        
        return positions;
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

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disassembleReactor() {
        if (this.currentState === 'disassembled') return;
        
        console.log('🔧 Разборка реактора...');
        this.currentState = 'disassembled';
        this.updateState('Разобран');
        
        // Сначала создаем маркеры
        this.createMarkers();
        
        // Затем анимация разборки
        setTimeout(() => {
            // Анимация корпуса вниз
            if (this.models.corpus) {
                this.animatePart(this.models.corpus, 
                    new THREE.Vector3(0, this.config.DISASSEMBLY_DISTANCE.CORPUS_DOWN, 0),
                    1500
                );
            }
            
            // Анимация крышки вверх
            if (this.models.lid) {
                this.animatePart(this.models.lid,
                    new THREE.Vector3(0, this.config.DISASSEMBLY_DISTANCE.LID_UP, 0),
                    1500
                );
            }
            
            // Разъезд ТВС
            if (this.models.tvs.length > 0) {
                setTimeout(() => {
                    this.disassembleTVS();
                }, 300);
            }
        }, 100);
        
        // Включаем интерактивность
        this.enableInteractivity();
    }

    animatePart(part, targetPosition, duration) {
        const startPosition = part.position.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = this.easeInOutCubic(progress);
            
            part.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Обновляем маркеры во время анимации
            this.updateMarkers();
            
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
        
        this.models.tvs.forEach((tvs, index) => {
            if (tvs.userData && tvs.userData.disassembledPosition) {
                this.animatePart(tvs, tvs.userData.disassembledPosition, 1800);
            }
        });
    }

    enableInteractivity() {
        this.renderer.domElement.style.cursor = 'pointer';
    }

    createMarkers() {
        // Очищаем старые маркеры
        const container = document.getElementById('markers-container');
        container.innerHTML = '';
        
        // Создаем маркеры для всех деталей
        if (this.models.corpus) {
            this.createMarker(this.models.corpus, 'Корпус', 'fas fa-cube');
        }
        
        if (this.models.lid) {
            this.createMarker(this.models.lid, 'Крышка', 'fas fa-circle');
        }
        
        // На мобильных устройствах - только один маркер для всех ТВС
        if (this.isMobile && this.models.tvs.length > 0) {
            this.createMarker(this.models.tvs[0], 'ТВС', 'fas fa-bolt', 'all');
        } else {
            // На десктопе - маркеры для всех ТВС
            this.models.tvs.forEach((tvs, index) => {
                const name = index === 0 ? 'Центральная ТВС' : `ТВС ${index}`;
                this.createMarker(tvs, name, 'fas fa-bolt');
            });
        }
        
        // Обновляем позиции маркеров сразу
        this.updateMarkers();
    }

    createMarker(part, label, iconClass, specialType = null) {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.innerHTML = `
            <div class="marker-inner">
                <i class="${iconClass}"></i>
            </div>
        `;
        marker.title = label;
        marker.dataset.partType = specialType || part.userData.partType;
        marker.dataset.index = specialType === 'all' ? 'all' : (part.userData.index || 0);
        
        // Сохраняем ссылку на объект
        marker.threeObject = part;
        marker.specialType = specialType;
        
        document.getElementById('markers-container').appendChild(marker);
        
        // Обработчик клика
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            if (specialType === 'all') {
                this.selectPart('tvs', 'all');
            } else {
                this.selectPart(part.userData.partType, part.userData.index);
            }
        });
        
        return marker;
    }

    updateMarkers() {
        const markers = document.querySelectorAll('.marker');
        markers.forEach(marker => {
            if (!marker.threeObject) return;
            
            const vector = new THREE.Vector3();
            
            // Для ТВС на мобильных - используем среднюю позицию
            if (marker.specialType === 'all' && this.models.tvs.length > 0) {
                // Средняя позиция всех ТВС
                const avgPosition = new THREE.Vector3();
                this.models.tvs.forEach(tvs => {
                    avgPosition.add(tvs.position);
                });
                avgPosition.divideScalar(this.models.tvs.length);
                vector.copy(avgPosition);
            } else {
                vector.copy(marker.threeObject.position);
            }
            
            // Проецируем 3D позицию в 2D экранные координаты
            vector.project(this.camera);
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            // Показываем маркер только если объект перед камерой
            if (vector.z < 1 && x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
                marker.style.left = `${x - 20}px`;
                marker.style.top = `${y - 20}px`;
                marker.style.display = 'block';
            } else {
                marker.style.display = 'none';
            }
        });
    }

    assembleReactor() {
        if (this.currentState === 'assembled') return;
        
        console.log('🔧 Сборка реактора...');
        this.updateState('Сборка...');
        
        // Убираем маркеры сразу
        this.clearMarkers();
        
        // Сборка ТВС
        this.models.tvs.forEach((tvs) => {
            if (tvs.userData && tvs.userData.assembledPosition) {
                this.animatePart(tvs, tvs.userData.assembledPosition, 1800);
            }
        });
        
        // Сборка корпуса и крышки
        setTimeout(() => {
            if (this.models.corpus) {
                this.animatePart(this.models.corpus, new THREE.Vector3(0, 0, 0), 1500);
            }
            
            if (this.models.lid) {
                this.animatePart(this.models.lid, new THREE.Vector3(0, 2165, 0), 1500);
            }
            
            this.currentState = 'assembled';
            this.updateState('Собран');
            
            // Выключаем интерактивность
            this.renderer.domElement.style.cursor = 'default';
        }, 300);
    }

    clearMarkers() {
        const container = document.getElementById('markers-container');
        container.innerHTML = '';
    }

    onModelClick(event) {
        if (this.currentState !== 'disassembled') return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster = this.raycaster || new THREE.Raycaster();
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        // Все интерактивные объекты
        const interactiveObjects = [];
        if (this.models.corpus) interactiveObjects.push(this.models.corpus);
        if (this.models.lid) interactiveObjects.push(this.models.lid);
        if (this.models.tvs.length > 0) interactiveObjects.push(...this.models.tvs);
        
        const intersects = this.raycaster.intersectObjects(interactiveObjects, true);
        
        if (intersects.length > 0) {
            // Находим родительский объект с userData
            let object = intersects[0].object;
            while (object && !object.userData.partType) {
                object = object.parent;
            }
            
            if (object && object.userData.partType) {
                this.selectPart(object.userData.partType, object.userData.index);
            }
        }
    }

    selectPart(partType, index = null) {
        console.log(`🔍 Выбрана деталь: ${partType} ${index !== null ? index : ''}`);
        
        let partName = '';
        switch(partType) {
            case 'corpus': partName = 'Корпус реактора'; break;
            case 'lid': partName = 'Крышка реактора'; break;
            case 'tvs': 
                if (index === 'all') {
                    partName = 'Тепловыделяющие сборки';
                } else {
                    partName = index === 0 ? 'Центральная ТВС' : `ТВС ${index}`;
                }
                break;
        }
        
        this.selectedPartText.textContent = partName;
        
        // Показываем информацию
        this.showPartInfo(partType, index);
        
        // Фокусируем камеру на детали
        this.focusOnPart(partType, index);
    }

    showPartInfo(partType, index = null) {
        const info = this.getPartInfo(partType, index);
        
        document.getElementById('part-name').textContent = info.name;
        document.getElementById('part-description').textContent = info.description;
        
        const specsList = document.getElementById('specs-list');
        specsList.innerHTML = '';
        info.specs.forEach(spec => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="spec-label">${spec.label}:</span> <span class="spec-value">${spec.value}</span>`;
            specsList.appendChild(li);
        });
        
        this.infoPanel.classList.remove('panel-hidden');
        this.infoPanel.classList.add('active');
    }

    getPartInfo(partType, index = null) {
        const baseInfo = {
            corpus: {
                name: "Корпус реактора РИМ-К-4,5",
                description: "Основная несущая конструкция реактора из высокопрочной стали. Обеспечивает герметичность и защиту от радиации.",
                specs: [
                    { label: "Материал", value: "ЭП-823 сталь" },
                    { label: "Высота", value: "2545 мм" },
                    { label: "Диаметр", value: "500 мм" },
                    { label: "Назначение", value: "Защита активной зоны" }
                ]
            },
            lid: {
                name: "Крышка реактора",
                description: "Верхняя герметичная крышка с системой болтового крепления. Обеспечивает доступ к активной зоне.",
                specs: [
                    { label: "Материал", value: "ЭП-823 сталь" },
                    { label: "Толщина", value: "188 мм" },
                    { label: "Диаметр", value: "500 мм" },
                    { label: "Назначение", value: "Герметизация корпуса" }
                ]
            },
            tvs: {
                name: index === 'all' ? "Тепловыделяющие сборки" : (index === 0 ? "Центральная ТВС" : `ТВС ${index}`),
                description: index === 'all' 
                    ? "Семь тепловыделяющих сборок с уран-плутониевым топливом. Генерируют тепловую энергию в активной зоне реактора."
                    : "Тепловыделяющая сборка с карбидным уран-плутониевым топливом. Генерирует тепловую энергию.",
                specs: index === 'all' ? [
                    { label: "Количество", value: "7 шт" },
                    { label: "Топливо", value: "карбид уран-плутониевый" },
                    { label: "Обогащение", value: "13,5% Pu" },
                    { label: "Конфигурация", value: "шестиугольная решетка" }
                ] : [
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
                target = this.models.corpus;
                break;
            case 'lid':
                target = this.models.lid;
                break;
            case 'tvs':
                if (index === 'all' && this.models.tvs.length > 0) {
                    // Средняя позиция всех ТВС
                    const avgPosition = new THREE.Vector3();
                    this.models.tvs.forEach(tvs => {
                        avgPosition.add(tvs.position);
                    });
                    avgPosition.divideScalar(this.models.tvs.length);
                    target = { position: avgPosition };
                } else if (this.models.tvs[index || 0]) {
                    target = this.models.tvs[index || 0];
                }
                break;
        }
        
        if (target) {
            const targetPosition = target.position.clone();
            const cameraPosition = targetPosition.clone().add(new THREE.Vector3(800, 800, 800));
            
            this.animateCameraTo(cameraPosition, targetPosition);
        }
    }

    animateCameraTo(position, target) {
        if (!this.controls) return;
        
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 1200;
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = this.easeInOutCubic(progress);
            
            this.camera.position.lerpVectors(startPosition, position, easeProgress);
            
            const currentTarget = startTarget.clone().lerp(target, easeProgress);
            this.controls.target.copy(currentTarget);
            this.controls.update();
            
            // Обновляем маркеры во время движения камеры
            this.updateMarkers();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    closeInfoPanel() {
        this.infoPanel.classList.remove('active');
        setTimeout(() => {
            this.infoPanel.classList.add('panel-hidden');
        }, 300);
        this.selectedPartText.textContent = 'Ничего';
    }

    resetCamera() {
        this.animateCameraTo(this.initialCameraPosition, this.initialCameraTarget);
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
        
        this.updateMarkers();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.updateMarkers();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск приложения
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            window.reactorViewer = new ReactorViewer();
        } catch (error) {
            console.error('❌ Критическая ошибка при запуске:', error);
            document.getElementById('loading-text').textContent = 'Критическая ошибка!';
            document.getElementById('loading-error').textContent = error.message;
            document.getElementById('loading-error').style.display = 'block';
            document.getElementById('loading-actions').style.display = 'flex';
        }
    }, 100);
});
