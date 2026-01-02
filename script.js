function init() {
    console.log("Запуск интерактивного 3D просмотрщика...");
    
    // ========== НАСТРОЙКИ ДЛЯ РУЧНОЙ КОРРЕКТИРОВКИ ==========
    const DISASSEMBLY_DISTANCE = {
        CORPUS_DOWN: -500,
        LID_UP: 500,
        TVS_STAYS: 0
    };
    
    // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: расстояния для правильного касания сторонами
    const TVS_HEX_GRID = {
        // Для гексагонального расположения при касании сторонами:
        // Расстояние между центрами = сторона шестиугольника
        // Если R - радиус описанной окружности (от центра до угла),
        // то сторона шестиугольника = R
        // Но для касания сторон нужно другое расстояние
        
        // Эмпирические значения - подбирайте:
        SPACING_SMALL: 15,          // Собранное состояние - близко
        SPACING_LARGE: 60,          // Разобранное состояние - далеко
        DELAY: 800,
        ANIMATION_DURATION: 1200,
        
        // Угол поворота всей сборки ТВС (в градусах)
        HEX_ROTATION: 0,
        
        // Смещение центральной ТВС относительно общего центра (если нужно)
        CENTER_OFFSET: { x: 0, y: 0, z: 0 }
    };
    
    const PART_COLORS = {
        ASSEMBLY: 0x808080,
        CORPUS: 0x4a90e2,
        TVS: 0x68d391,
        LID: 0xed8936
    };
    
    const ANIMATION_DURATION = {
        FADE: 500,
        MOVE: 1000
    };
    
    const MANUAL_POSITION_CORRECTION = {
        CORPUS: { x: 0, y: 0, z: 0 },
        TVS: { x: 0, y: 0, z: 0 },
        LID: { x: 0, y: 0, z: 0 }
    };
    // ========== КОНЕЦ НАСТРОЕК ==========
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    const container = document.getElementById('model-container');
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 50000);
    camera.position.set(0, 100, 300);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 1);
    backLight.position.set(-100, 150, -100);
    scene.add(backLight);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.panSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 10;
    controls.maxDistance = 2000;
    
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let selectedPart = null;
    let currentState = 'assembled';
    let tvsDisassembled = false;
    
    const models = {
        corpus: null,
        lid: null
    };
    
    let tvsModels = [];
    const tvsCount = 7;
    
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
    
    const partInfo = {
        corpus: {
            name: "Корпус реактора",
            description: "Основная несущая конструкция реактора, выполненная из нержавеющей стали.",
            specs: [
                "Материал: Нержавеющая сталь 08Х18Н10Т",
                "Высота: 3000 мм",
                "Диаметр: 500 мм",
                "Толщина стенки: 50 мм",
                "Масса: 1200 кг",
                "Рабочее давление: 16 МПа"
            ]
        },
        tvs: {
            name: "ТВС (Тепловыделяющая сборка)",
            description: "Сборка тепловыделяющих элементов, содержащая ядерное топливо.",
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
            description: "Верхняя крышка реактора с системой уплотнений.",
            specs: [
                "Материал: Нержавеющая сталь 08Х18Н10Т",
                "Диаметр: 520 мм",
                "Толщина: 100 мм",
                "Масса: 300 кг",
                "Количество шпилек: 24",
                "Сила затяжки: 150 кН"
            ]
        }
    };
    
    // Функция для генерации позиций 7 ТВС с правильным касанием сторонами
    function generateTvsPositions(count, spacing, rotationDegrees = 0) {
        const positions = [];
        
        if (count === 7) {
            // Преобразуем угол поворота в радианы
            const rotationRad = THREE.MathUtils.degToRad(rotationDegrees);
            
            // Центральная ТВС (0)
            positions.push(new THREE.Vector3(
                TVS_HEX_GRID.CENTER_OFFSET.x,
                TVS_HEX_GRID.CENTER_OFFSET.y,
                TVS_HEX_GRID.CENTER_OFFSET.z
            ));
            
            // Для правильного гексагонального расположения с касанием сторонами:
            // 6 ТВС вокруг центральной, смещенные для касания сторонами
            
            // Для касания сторонами (а не углами), 6 внешних ТВС нужно сместить ближе к центру
            // Если центральная ТВС имеет диаметр D, то для касания сторонами расстояние между центрами = D
            // Но 6 внешних расположены по вершинам шестиугольника, расстояние от центра = D / cos(30°) ≈ D / 0.866
            
            // На практике подбираем коэффициент эмпирически
            const sideSpacing = spacing; // Используем переданное расстояние
            
            // Угол между ТВС в шестиугольнике (60 градусов)
            const angleStep = (2 * Math.PI) / 6;
            
            // Генерируем 6 позиций вокруг центра
            for (let i = 0; i < 6; i++) {
                // Базовый угол (0, 60, 120, 180, 240, 300 градусов)
                const baseAngle = i * angleStep;
                
                // Применяем общий поворот
                const angle = baseAngle + rotationRad;
                
                // Рассчитываем позицию
                const x = Math.cos(angle) * sideSpacing;
                const z = Math.sin(angle) * sideSpacing;
                
                // Добавляем смещение центра
                positions.push(new THREE.Vector3(
                    x + TVS_HEX_GRID.CENTER_OFFSET.x,
                    TVS_HEX_GRID.CENTER_OFFSET.y,
                    z + TVS_HEX_GRID.CENTER_OFFSET.z
                ));
            }
        }
        
        return positions;
    }
    
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
    
    const modelPaths = {
        corpus: 'models/reactor_corpus.glb',
        tvs: 'models/reactor_tvs.glb',
        lid: 'models/reactor_lid.glb'
    };
    
    let modelsLoaded = 0;
    const totalModels = 3; // corpus, tvs, lid
    
    function loadModel(key, path) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                path,
                (gltf) => {
                    console.log(`✅ Модель ${key} загружена`);
                    
                    if (key === 'tvs') {
                        // Создаем 7 ТВС
                        const assembledPositions = generateTvsPositions(
                            tvsCount, 
                            TVS_HEX_GRID.SPACING_SMALL,
                            TVS_HEX_GRID.HEX_ROTATION
                        );
                        
                        const disassembledPositions = generateTvsPositions(
                            tvsCount,
                            TVS_HEX_GRID.SPACING_LARGE,
                            TVS_HEX_GRID.HEX_ROTATION
                        );
                        
                        for (let i = 0; i < tvsCount; i++) {
                            const model = gltf.scene.clone();
                            
                            model.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    
                                    child.material = new THREE.MeshStandardMaterial({
                                        color: PART_COLORS.ASSEMBLY,
                                        roughness: 0.6,
                                        metalness: 0.5,
                                        side: THREE.DoubleSide
                                    });
                                    
                                    child.userData.targetColor = new THREE.Color(PART_COLORS.TVS);
                                    child.userData.partType = 'tvs';
                                    child.userData.tvsIndex = i;
                                }
                            });
                            
                            // Применяем позицию
                            model.position.copy(assembledPositions[i]);
                            
                            // Сохраняем позиции для анимации
                            model.userData.assembledPosition = assembledPositions[i].clone();
                            model.userData.disassembledPosition = disassembledPositions[i].clone();
                            
                            tvsModels.push(model);
                        }
                        resolve(tvsModels);
                    } else {
                        const model = gltf.scene;
                        
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                const partColor = PART_COLORS[key.toUpperCase()] || 0x808080;
                                child.material = new THREE.MeshStandardMaterial({
                                    color: PART_COLORS.ASSEMBLY,
                                    roughness: 0.6,
                                    metalness: 0.5,
                                    side: THREE.DoubleSide
                                });
                                
                                child.userData.targetColor = new THREE.Color(partColor);
                                child.userData.partType = key;
                                child.userData.modelKey = key;
                            }
                        });
                        
                        // Применяем ручную корректировку позиции
                        const correctionKey = key.toUpperCase();
                        const correction = MANUAL_POSITION_CORRECTION[correctionKey] || { x: 0, y: 0, z: 0 };
                        model.position.x += correction.x;
                        model.position.y += correction.y;
                        model.position.z += correction.z;
                        
                        models[key] = model;
                        resolve(model);
                    }
                    
                    modelsLoaded++;
                    const percent = Math.round((modelsLoaded / totalModels) * 100);
                    loadingText.textContent = `Загрузка моделей: ${percent}%`;
                },
                undefined,
                (error) => {
                    console.error(`❌ Ошибка загрузки модели ${key}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    Promise.all([
        loadModel('corpus', modelPaths.corpus),
        loadModel('tvs', modelPaths.tvs),
        loadModel('lid', modelPaths.lid)
    ]).then(() => {
        console.log('✅ Все модели загружены!');
        console.log(`✅ Создано ${tvsModels.length} ТВС`);
        
        container.removeChild(loadingText);
        
        // Добавляем все детали в сцену
        scene.add(models.corpus);
        scene.add(models.lid);
        tvsModels.forEach(tvs => scene.add(tvs));
        
        // Все детали изначально серые
        changePartsColorToGray();
        
        setupCamera();
        initControls();
        
        console.log('🎮 Реактор готов к просмотру');
        console.log('📐 Расстояние между ТВС в сборке:', TVS_HEX_GRID.SPACING_SMALL);
        console.log('📐 Расстояние между ТВС в разборке:', TVS_HEX_GRID.SPACING_LARGE);
        console.log('↻ Поворот гексагона:', TVS_HEX_GRID.HEX_ROTATION, 'градусов');
        
    }).catch((error) => {
        console.error('❌ Ошибка при загрузке моделей:', error);
        loadingText.innerHTML = '<div style="color: #ff6b6b;">Ошибка загрузки моделей</div>';
    });
    
    function setupCamera() {
        const box = new THREE.Box3();
        
        tvsModels.forEach(tvs => box.expandByObject(tvs));
        if (models.corpus) box.expandByObject(models.corpus);
        if (models.lid) box.expandByObject(models.lid);
        
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
    
    function disassembleReactor() {
        if (currentState === 'disassembled') return;
        console.log('🔧 Разборка реактора...');
        
        currentState = 'disassembled';
        tvsDisassembled = false;
        
        changePartsColorToVibrant();
        
        Promise.all([
            animatePart(models.corpus, partPositions.disassembled.corpus, ANIMATION_DURATION.MOVE),
            animatePart(models.lid, partPositions.disassembled.lid, ANIMATION_DURATION.MOVE)
        ]).then(() => {
            setTimeout(() => {
                disassembleTVS();
            }, TVS_HEX_GRID.DELAY);
        });
    }
    
    function disassembleTVS() {
        console.log('🔧 Разъезд 7 ТВС...');
        tvsDisassembled = true;
        
        const animations = tvsModels.map((tvs, index) => {
            // Для центральной ТВС (индекс 0) оставляем на месте
            // Для остальных - разъезжаем
            const targetPos = index === 0 
                ? tvs.userData.assembledPosition.clone()
                : tvs.userData.disassembledPosition.clone();
            
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
        
        if (tvsDisassembled) {
            assembleTVS().then(() => {
                continueAssembly();
            });
        } else {
            continueAssembly();
        }
    }
    
    function assembleTVS() {
        console.log('🔧 Сборка ТВС...');
        
        const animations = tvsModels.map(tvs => {
            return animatePart(tvs, tvs.userData.assembledPosition, TVS_HEX_GRID.ANIMATION_DURATION);
        });
        
        return Promise.all(animations).then(() => {
            tvsDisassembled = false;
            console.log('✅ ТВС собраны');
        });
    }
    
    function continueAssembly() {
        Promise.all([
            animatePart(models.corpus, partPositions.assembled.corpus, ANIMATION_DURATION.MOVE),
            animatePart(models.lid, partPositions.assembled.lid, ANIMATION_DURATION.MOVE)
        ]).then(() => {
            changePartsColorToGray();
            
            currentState = 'assembled';
            updateSelectionIndicator('Собран');
            console.log('✅ Сборка завершена');
        });
    }
    
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
        if (models.corpus) {
            models.corpus.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.emissive = child.userData.targetColor.clone().multiplyScalar(0.1);
                    child.material.emissiveIntensity = 0.2;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        if (models.lid) {
            models.lid.traverse((child) => {
                if (child.isMesh && child.userData.targetColor) {
                    child.material.color = child.userData.targetColor;
                    child.material.emissive = child.userData.targetColor.clone().multiplyScalar(0.1);
                    child.material.emissiveIntensity = 0.2;
                    child.material.needsUpdate = true;
                }
            });
        }
        
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
        const grayColor = new THREE.Color(PART_COLORS.ASSEMBLY);
        
        if (models.corpus) {
            models.corpus.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        if (models.lid) {
            models.lid.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh) {
                    child.material.color = grayColor;
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        });
    }
    
    function initControls() {
        container.addEventListener('click', onMouseClick, false);
        document.getElementById('assemble-btn').addEventListener('click', assembleReactor);
        document.getElementById('disassemble-btn').addEventListener('click', disassembleReactor);
        document.getElementById('close-info-btn').addEventListener('click', closeInfoPanel);
    }
    
    function onMouseClick(event) {
        if (currentState !== 'disassembled') return;
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
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
        
        // Снимаем выделение со всех
        if (models.corpus) {
            models.corpus.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        if (models.lid) {
            models.lid.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        }
        
        tvsModels.forEach(tvs => {
            tvs.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissiveIntensity = 0;
                    child.material.needsUpdate = true;
                }
            });
        });
        
        // Подсвечиваем выбранную деталь
        if (partType === 'tvs') {
            tvsModels.forEach(tvs => {
                tvs.traverse((child) => {
                    if (child.isMesh) {
                        child.material.emissiveIntensity = 0.2;
                        child.material.needsUpdate = true;
                    }
                });
            });
        } else if (models[partType]) {
            models[partType].traverse((child) => {
                if (child.isMesh) {
                    child.material.emissiveIntensity = 0.5;
                    child.material.needsUpdate = true;
                }
            });
        }
        
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
        
        document.getElementById('info-panel').classList.add('active');
    }
    
    function closeInfoPanel() {
        document.getElementById('info-panel').classList.remove('active');
        
        if (selectedPart) {
            selectedPart = null;
            updateSelectionIndicator(tvsDisassembled ? 'ТВС разъехались' : 'Разобран');
        }
    }
    
    function updateSelectionIndicator(text) {
        document.getElementById('selected-part').textContent = text;
    }
    
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

window.addEventListener('DOMContentLoaded', init);
