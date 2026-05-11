// Глобальные переменные
let topologyResults = [];     // все результаты топологии
let variationParams = null;
let criticalParams = null;
let currentTaskId = null;
let progressInterval = null;

// Единицы измерения
const units = {
    R_EY: 'см', S_kluch: 'см', f_EY: 'см²', N_TVS: 'шт',
    f_prok: 'см²', Pi_TVS: 'см', d_r: 'см', x: '', Pi_tvel: 'см',
    G_p: 'кг/с', G_tvel: 'кг/с', w_az: 'м/с', Pe_az: '', Nu_az: '',
    G_be: 'кг/с', G_tvel_be: 'кг/с', w_be: 'м/с', Pe_be: '', Nu_be: '',
    k_z_az: '', k_z_bz: '', ql0_az: 'Вт/м', ql0_bz: 'Вт/м', T_cl_max: '°C'
};

// Форматирование чисел
function fmt(val, dec=4) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toFixed(dec);
}

// Сбор геометрических параметров
function getGeometryParams() {
    return {
        a: parseFloat(document.getElementById('geom_a').value),
        N_rad: parseInt(document.getElementById('geom_N_rad').value),
        delta_u: parseFloat(document.getElementById('geom_delta_u').value),
        delta_a: parseFloat(document.getElementById('geom_delta_a').value),
        D_a: parseFloat(document.getElementById('geom_D_a').value),
        n_tvel: parseInt(document.getElementById('geom_n_tvel').value),
        d_tvel: parseFloat(document.getElementById('geom_d_tvel').value)
    };
}

// Сбор тепловых параметров
function getThermalParams() {
    return {
        Q_r: parseFloat(document.getElementById('therm_Q_r').value),
        t_in: parseFloat(document.getElementById('therm_t_in').value),
        t_out: parseFloat(document.getElementById('therm_t_out').value),
        H0_az: parseFloat(document.getElementById('therm_H0_az').value),
        H0_bz: parseFloat(document.getElementById('therm_H0_bz').value),
        delta_eff: parseFloat(document.getElementById('therm_delta_eff').value),
        Cp: parseFloat(document.getElementById('therm_Cp').value),
        rho_Na: parseFloat(document.getElementById('therm_rho_Na').value),
        lambda_Na: parseFloat(document.getElementById('therm_lambda_Na').value),
        a_Na: parseFloat(document.getElementById('therm_a_Na').value),
        d_ob: parseFloat(document.getElementById('therm_d_ob')?.value || 0.0114),
        d_topl_nar: parseFloat(document.getElementById('therm_d_topl_nar')?.value || 0.013),
        d_otv: parseFloat(document.getElementById('therm_d_otv')?.value || 0.0018),
        f_az: parseFloat(document.getElementById('therm_f_az').value),
        f_pr: parseFloat(document.getElementById('therm_f_pr').value),
        f_be: parseFloat(document.getElementById('therm_f_be').value),
        lambda_topl: parseFloat(document.getElementById('therm_lambda_topl').value),
        lambda_3: parseFloat(document.getElementById('therm_lambda_3').value)
    };
}

// Заполнение таблицы геометрии
function fillGeometryTable(data) {
    const tbody = document.getElementById('geomResultsTable');
    const items = [
        ['R_EY', 'Радиус ЭЯ, см:'],
        ['S_kluch', 'Размер ТВС под ключ, см:'],
        ['f_EY', 'Площадь ЭЯ, см²:'],
        ['N_TVS', 'Кол-во ТВС, шт:'],
        ['f_prok', 'Проходное сечение ТВС, см²:'],
        ['Pi_TVS', 'Гидравлический периметр ТВС, см:'],
        ['d_r', 'Гидравлический диаметр ТВС, см:'],
        ['x', 'Относительный шаг решетки:'],
        ['Pi_tvel', 'Тепловой периметр ТВЭЛ, см:']
    ];
    let html = '';
    items.forEach(([key, label]) => {
        let val = data[key];
        if (key === 'N_TVS') val = fmt(val, 2);
        else if (key === 'x') val = fmt(val, 4);
        else val = fmt(val, 4);
        html += `<tr><td>${label}</td><td class="fw-bold">${val}</td></tr>`;
    });
    tbody.innerHTML = html;
}

// Заполнение таблицы тепловых результатов
function fillThermalTable(data) {
    const tbody = document.getElementById('thermalResultsTable');
    const items = [
        ['G_p', 'Расход ТН через активную зону, кг/с:'],
        ['G_tvel', 'Расход ТН на один твэл, кг/с:'],
        ['w_az', 'Средняя скорость ТН в активной зоне, м/с:'],
        ['Pe_az', 'Число Пекле для активной зоны:'],
        ['Nu_az', 'Число Нуссельта для активной зоны:'],
        ['G_be', 'Расход ТН для боковой зоны, кг/с:'],
        ['G_tvel_be', 'Расход ТН на твэл в боковой зоне, кг/с:'],
        ['w_be', 'Средняя скорость ТН в боковой зоне, м/с:'],
        ['Pe_be', 'Число Пекле для боковой зоне:'],
        ['Nu_be', 'Число Нуссельта для боковой зоне:'],
        ['T_cl_max', 'Максимальная температура оболочки твэла, °C:'],
        ['k_z_az', 'Аксиальный коэффициент неравномерности (аз):'],
        ['k_z_bz', 'Аксиальный коэффициент неравномерности (бз):'],
        ['ql0_az', 'Погонная мощность в центре (аз), Вт/м:'],
        ['ql0_bz', 'Погонная мощность в центре (бз), Вт/м:']
    ];
    let html = '';
    items.forEach(([key, label]) => {
        let val = data[key];
        if (key === 'T_cl_max' && val > 1e8) val = '—';
        else if (['G_p','G_be','ql0_az','ql0_bz'].includes(key)) val = fmt(val, 2);
        else if (['G_tvel','G_tvel_be'].includes(key)) val = fmt(val, 6);
        else if (['w_az','w_be'].includes(key)) val = fmt(val, 2);
        else val = fmt(val, 2);
        html += `<tr><td>${label}</td><td class="fw-bold">${val}</td></tr>`;
    });
    tbody.innerHTML = html;
}

// Сохранение/загрузка конфигурации (JSON)
document.getElementById('saveConfigBtn').addEventListener('click', () => {
    const config = {
        geometry: getGeometryParams(),
        thermal: getThermalParams()
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('loadConfigBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const config = JSON.parse(reader.result);
                if (config.geometry) {
                    for (const [key, val] of Object.entries(config.geometry)) {
                        const el = document.getElementById('geom_' + key);
                        if (el) el.value = val;
                    }
                }
                if (config.thermal) {
                    for (const [key, val] of Object.entries(config.thermal)) {
                        const el = document.getElementById('therm_' + key);
                        if (el) el.value = val;
                    }
                }
            } catch (err) { alert('Ошибка загрузки конфигурации'); }
        };
        reader.readAsText(file);
    };
    input.click();
});

// Расчет геометрии
document.getElementById('calcGeometryBtn').addEventListener('click', async () => {
    try {
        const resp = await fetch('/calculate_geometry', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(getGeometryParams())
        });
        const data = await resp.json();
        if (data.error) { alert(data.error); return; }
        fillGeometryTable(data);
    } catch (e) { alert('Ошибка соединения'); }
});

// Расчет теплового режима
document.getElementById('calcThermalBtn').addEventListener('click', async () => {
    try {
        const resp = await fetch('/calculate_thermal', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                geometry_params: getGeometryParams(),
                thermal_params: getThermalParams()
            })
        });
        const data = await resp.json();
        if (data.error) { alert(data.error); return; }
        fillThermalTable(data);
    } catch (e) { alert('Ошибка соединения'); }
});

// По умолчанию
document.getElementById('loadDefaultGeomBtn').addEventListener('click', () => {
    const defs = {a:1.5, N_rad:3, delta_u:0.15, delta_a:0.5, D_a:52, n_tvel:37, d_tvel:1.25};
    for (const [k,v] of Object.entries(defs)) document.getElementById('geom_'+k).value = v;
});
document.getElementById('loadDefaultThermalBtn').addEventListener('click', () => {
    const defs = {Q_r:35, t_in:300, t_out:420, H0_az:1.5, H0_bz:1.5, delta_eff:0.1, Cp:1260, rho_Na:775, lambda_Na:75.0, a_Na:0.000057, f_az:0.9, f_pr:0.095, f_be:0.005, lambda_topl:20, lambda_3:1.5};
    for (const [k,v] of Object.entries(defs)) document.getElementById('therm_'+k).value = v;
});

// Модальные окна
document.getElementById('setupVariationBtn').addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('variationModal')).show();
});
document.getElementById('setupCriticalBtn').addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('criticalModal')).show();
});

// Применить варьируемые параметры
document.getElementById('applyVariationBtn').addEventListener('click', () => {
    variationParams = {
        D_a: {
            min: parseFloat(document.getElementById('var_D_min').value),
            max: parseFloat(document.getElementById('var_D_max').value),
            step: parseFloat(document.getElementById('var_D_step').value)
        },
        Q_r: {
            min: parseFloat(document.getElementById('var_Q_min').value),
            max: parseFloat(document.getElementById('var_Q_max').value),
            step: parseFloat(document.getElementById('var_Q_step').value)
        },
        H0_az: {
            min: parseFloat(document.getElementById('var_H_min').value),
            max: parseFloat(document.getElementById('var_H_max').value),
            step: parseFloat(document.getElementById('var_H_step').value)
        }
    };
    bootstrap.Modal.getInstance(document.getElementById('variationModal')).hide();
    alert('Варьируемые параметры сохранены');
});

// Применить критические параметры
document.getElementById('applyCriticalBtn').addEventListener('click', () => {
    const parseIdeal = (str) => str.split(',').map(s => parseFloat(s.trim())).filter(x => !isNaN(x));
    criticalParams = {
        N_TVS: {
            min: parseFloat(document.getElementById('crit_N_min').value),
            max: parseFloat(document.getElementById('crit_N_max').value),
            ideal_values: parseIdeal(document.getElementById('crit_N_ideal').value)
        },
        G_p: {
            min: parseFloat(document.getElementById('crit_G_min').value),
            max: parseFloat(document.getElementById('crit_G_max').value),
            ideal_min: parseFloat(document.getElementById('crit_G_imin').value),
            ideal_max: parseFloat(document.getElementById('crit_G_imax').value)
        },
        w_az: {
            min: parseFloat(document.getElementById('crit_w_min').value),
            max: parseFloat(document.getElementById('crit_w_max').value),
            ideal_min: parseFloat(document.getElementById('crit_w_imin').value),
            ideal_max: parseFloat(document.getElementById('crit_w_imax').value)
        },
        ql0_az: {
            min: parseFloat(document.getElementById('crit_q_min').value),
            max: parseFloat(document.getElementById('crit_q_max').value),
            ideal_min: parseFloat(document.getElementById('crit_q_imin').value),
            ideal_max: parseFloat(document.getElementById('crit_q_imax').value)
        },
        T_cl_max: {
            min: parseFloat(document.getElementById('crit_T_min').value),
            max: parseFloat(document.getElementById('crit_T_max').value),
            ideal_min: parseFloat(document.getElementById('crit_T_imin').value),
            ideal_max: parseFloat(document.getElementById('crit_T_imax').value)
        }
    };
    bootstrap.Modal.getInstance(document.getElementById('criticalModal')).hide();
    alert('Критические параметры сохранены');
});

// Запуск топологического анализа
document.getElementById('startTopologyBtn').addEventListener('click', async () => {
    if (!variationParams || !criticalParams) {
        alert('Сначала настройте варьируемые и критические параметры');
        return;
    }
    try {
        const resp = await fetch('/start_topology', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                variation: variationParams,
                critical: criticalParams,
                base_geom: getGeometryParams(),
                base_thermal: getThermalParams()
            })
        });
        const data = await resp.json();
        if (data.task_id) {
            currentTaskId = data.task_id;
            document.getElementById('topologyProgress').innerText = 'Вычисление... 0%';
            document.getElementById('buildTopologyBtn').disabled = true;
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = setInterval(checkProgress, 1000);
        }
    } catch (e) { alert('Ошибка запуска'); }
});

async function checkProgress() {
    try {
        const resp = await fetch('/topology_progress/' + currentTaskId);
        const data = await resp.json();
        document.getElementById('topologyProgress').innerText = `Вычисление... ${data.progress}%`;
        if (data.done) {
            clearInterval(progressInterval);
            if (data.error) {
                document.getElementById('topologyProgress').innerText = 'Ошибка';
                alert(data.error);
                return;
            }
            document.getElementById('topologyProgress').innerText = 'Готово';
            // Загружаем результаты
            const resResp = await fetch('/topology_results/' + currentTaskId);
            const resData = await resResp.json();
            topologyResults = resData.results;
            document.getElementById('buildTopologyBtn').disabled = false;
            plot3DCloud();  // сразу показываем 3D облако
        }
    } catch (e) {
        clearInterval(progressInterval);
    }
}

// Построить тепловую карту S(D,H)
document.getElementById('buildTopologyBtn').addEventListener('click', () => {
    plotHeatmap();
    // переключаемся на вкладку тепловой карты
    const triggerEl = document.querySelector('#heatmap-tab');
    bootstrap.Tab.getInstance(triggerEl)?.show() || new bootstrap.Tab(triggerEl).show();
});

// 3D облако
function plot3DCloud() {
    let points = topologyResults;
    const step = parseInt(document.getElementById('cloudStep').value) || 1;
    const hideRed = document.getElementById('hideRedCheckbox').checked;
    points = points.filter((_, i) => i % step === 0);
    if (hideRed) points = points.filter(p => p.score !== -1);
    
    const trace = {
        x: points.map(p => p.D),
        y: points.map(p => p.Q),
        z: points.map(p => p.H),
        mode: 'markers',
        type: 'scatter3d',
        marker: {
            size: 3,
            color: points.map(p => p.score === 2 ? 'green' : (p.score === 1 ? 'yellow' : 'red')),
            opacity: 0.7
        },
        text: points.map(p => `D: ${p.D.toFixed(1)}, Q: ${p.Q.toFixed(1)}, H: ${p.H.toFixed(2)}, Score: ${p.score}`),
        hoverinfo: 'text'
    };
    const layout = {
        scene: {
            xaxis: {title: 'D, см'},
            yaxis: {title: 'Q, МВт'},
            zaxis: {title: 'H, м'}
        },
        margin: {l:0,r:0,b:0,t:40}
    };
    Plotly.newPlot('plot3d', [trace], layout);
    document.getElementById('plot3d').on('plotly_click', data => {
        const pt = data.points[0];
        const idx = points[pt.pointIndex];
        showPointDetails(idx);
    });
}

document.getElementById('cloudStep').addEventListener('input', plot3DCloud);
document.getElementById('hideRedCheckbox').addEventListener('change', plot3DCloud);

// Тепловая карта S(D,H)
function plotHeatmap() {
    const Dvals = [...new Set(topologyResults.map(r => r.D))].sort((a,b)=>a-b);
    const Hvals = [...new Set(topologyResults.map(r => r.H))].sort((a,b)=>a-b);
    const Smatrix = Hvals.map(h => Dvals.map(d => {
        const pts = topologyResults.filter(r => Math.abs(r.D-d)<0.001 && Math.abs(r.H-h)<0.001);
        return pts.reduce((acc, r) => acc + r.score, 0);
    }));
    const interp = document.getElementById('interpSelect').value;
    Plotly.newPlot('plotHeatmap', [{
        z: Smatrix,
        x: Dvals,
        y: Hvals,
        type: 'heatmap',
        colorscale: 'RdYlGn',
        zmin: -Dvals.length,
        zmax: Dvals.length*2,
        hoverongaps: false,
        hovertemplate: 'D: %{x:.1f} см<br>H: %{y:.2f} м<br>S: %{z}<extra></extra>'
    }], {
        xaxis: {title: 'Диаметр активной зоны D, см'},
        yaxis: {title: 'Высота активной зоны H, м'},
        margin: {l:60,r:20,t:40,b:60}
    });
    document.getElementById('plotHeatmap').on('plotly_click', data => {
        const D = data.points[0].x;
        const H = data.points[0].y;
        const column = topologyResults.filter(r => Math.abs(r.D-D)<0.001 && Math.abs(r.H-H)<0.001);
        if (column.length > 0) {
            showPointDetails(column[0]);
            document.getElementById('showQDistBtn').disabled = false;
            document.getElementById('showQDistBtn').onclick = () => showQDistribution(D, H);
        }
    });
}

document.getElementById('interpSelect').addEventListener('change', plotHeatmap);

// Показать детали точки
function showPointDetails(point) {
    document.getElementById('pointInfo').innerHTML = 
        `Точка: D=${point.D.toFixed(1)} см, Q=${point.Q.toFixed(1)} МВт, H=${point.H.toFixed(2)} м, Оценка: ${scoreSymbol(point.score)}`;
    const table = document.createElement('table');
    table.className = 'table table-sm table-bordered';
    let html = '<thead><tr><th>Параметр</th><th>Значение</th><th>Ед.</th></tr></thead><tbody>';
    const addRow = (name, val, unit='') => {
        html += `<tr><td>${name}</td><td>${val}</td><td>${unit}</td></tr>`;
    };
    // варьируемые
    addRow('Диаметр D', point.D.toFixed(2), 'см');
    addRow('Мощность Q', point.Q.toFixed(2), 'МВт');
    addRow('Высота H', point.H.toFixed(3), 'м');
    if (point.geometry) {
        for (const [k,v] of Object.entries(point.geometry)) {
            addRow(k, fmt(v,4), units[k]||'');
        }
    }
    if (point.thermal) {
        for (const [k,v] of Object.entries(point.thermal)) {
            let disp = v;
            if (k === 'T_cl_max' && v > 1e8) disp = '—';
            else if (['G_p','G_be','ql0_az','ql0_bz'].includes(k)) disp = fmt(v,2);
            addRow(k, disp, units[k]||'');
        }
    }
    html += '</tbody>';
    table.innerHTML = html;
    document.getElementById('detailTableContainer').innerHTML = '';
    document.getElementById('detailTableContainer').appendChild(table);
}

function scoreSymbol(s) {
    if (s === 2) return '🟢 +2';
    if (s === 1) return '🟡 +1';
    return '🔴 -1';
}

// Распределение по Q для пары D,H
async function showQDistribution(D, H) {
    const column = topologyResults.filter(r => Math.abs(r.D-D)<0.001 && Math.abs(r.H-H)<0.001);
    if (!column.length) return;
    document.getElementById('qDistTitle').innerText = `Распределение по Q для D=${D.toFixed(1)} см, H=${H.toFixed(2)} м`;
    // Таблица
    let tableHtml = '<table class="table table-sm table-bordered"><thead><tr><th>Q (МВт)</th><th>Оценка</th><th>N_TVS</th><th>G_p (кг/с)</th><th>w_az (м/с)</th><th>ql0_az (Вт/м)</th><th>T_cl_max (°C)</th></tr></thead><tbody>';
    column.sort((a,b)=>a.Q-b.Q);
    column.forEach(p => {
        const score = scoreSymbol(p.score);
        const bg = p.score===2?'#c8e6c9':(p.score===1?'#fff9c4':'#ffcdd2');
        tableHtml += `<tr style="background:${bg}">`;
        tableHtml += `<td>${p.Q.toFixed(2)}</td><td>${score}</td>`;
        tableHtml += `<td>${p.geometry?fmt(p.geometry.N_TVS,1):'—'}</td>`;
        tableHtml += `<td>${p.thermal?fmt(p.thermal.G_p,1):'—'}</td>`;
        tableHtml += `<td>${p.thermal?fmt(p.thermal.w_az,2):'—'}</td>`;
        tableHtml += `<td>${p.thermal?fmt(p.thermal.ql0_az,0):'—'}</td>`;
        let tcl = p.thermal?.T_cl_max;
        tableHtml += `<td>${(tcl && tcl<1e8)?tcl.toFixed(1):'—'}</td>`;
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    document.getElementById('qDistTableContainer').innerHTML = tableHtml;
    // График
    const Qvals = column.map(r=>r.Q);
    const scores = column.map(r=>r.score);
    Plotly.newPlot('qDistPlot', [{
        x: Qvals,
        y: scores,
        mode: 'markers',
        marker: {
            size: 10,
            color: scores.map(s=>s===2?'green':(s===1?'yellow':'red')),
            line: {color:'black',width:1}
        },
        type: 'scatter'
    }], {
        xaxis: {title: 'Q, МВт'},
        yaxis: {title: 'Оценка', tickvals: [-1,1,2], ticktext: ['-1','+1','+2']},
        margin: {t:20}
    });
    new bootstrap.Modal(document.getElementById('qDistModal')).show();
}

// Инициализация по умолчанию
document.addEventListener('DOMContentLoaded', () => {
    // Предварительно установить значения по умолчанию в модальных окнах можно здесь
});