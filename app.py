import os
import json
import uuid
import threading
import numpy as np
from flask import Flask, render_template, request, jsonify, url_for

app = Flask(__name__)
app.secret_key = 'replace-with-random-secret'

# ---------- Калькуляторы (перенесены из исходного кода) ----------
class GeometryCalculator:
    def __init__(self):
        self.reset()

    def reset(self):
        self.R_EY = None
        self.S_kluch = None
        self.f_EY = None
        self.N_TVS = None
        self.f_prok = None
        self.Pi_TVS = None
        self.d_r = None
        self.x = None
        self.Pi_tvel = None
        self.n_tvel = None
        self.d_tvel = None

    def calculate(self, params):
        try:
            a = params['a']  # см
            N_rad = params['N_rad']
            delta_u = params['delta_u']  # см
            delta_a = params['delta_a']  # см
            D_a = params['D_a']  # см
            n_tvel = params['n_tvel']
            d_tvel = params['d_tvel']  # см

            self.R_EY = (2 * a) / np.sqrt(3)
            self.S_kluch = self.R_EY * (1 + 1.5 * N_rad) + 2 * delta_u
            self.f_EY = (6 * ((a / np.sqrt(3)) * (1 + 1.5 * N_rad) + delta_u + delta_a / 2) ** 2) / np.sqrt(3)
            self.N_TVS = (np.pi * D_a ** 2) / (4 * self.f_EY)
            self.f_prok = self.f_EY - n_tvel * (np.pi * d_tvel ** 2) / 4 - (6 * self.S_kluch / np.sqrt(3)) * (delta_a / 2)
            self.Pi_TVS = (6 * (2 * self.S_kluch - 2 * delta_u)) / np.sqrt(3) + n_tvel * np.pi * d_tvel
            self.d_r = (4 * self.f_prok) / self.Pi_TVS
            self.x = a / d_tvel
            self.Pi_tvel = np.pi * d_tvel
            self.n_tvel = n_tvel
            self.d_tvel = d_tvel

            return {
                'R_EY': self.R_EY,
                'S_kluch': self.S_kluch,
                'f_EY': self.f_EY,
                'N_TVS': self.N_TVS,
                'f_prok': self.f_prok,
                'Pi_TVS': self.Pi_TVS,
                'd_r': self.d_r,
                'x': self.x,
                'Pi_tvel': self.Pi_tvel
            }
        except Exception as e:
            raise ValueError(f"Ошибка геометрического расчета: {str(e)}")

class ThermalCalculator:
    def __init__(self, geometry_calc):
        self.geometry = geometry_calc
        self.reset()

    def reset(self):
        self.Q_az = None
        self.Q_pr = None
        self.Q_be = None
        self.G_p = None
        self.G_tvel = None
        self.w_az = None
        self.Pe_az = None
        self.Nu_az = None
        self.G_be = None
        self.G_tvel_be = None
        self.w_be = None
        self.Pe_be = None
        self.Nu_be = None
        self.H_az = None
        self.H_bz = None
        self.k_z_az = None
        self.k_z_bz = None
        self.ql0_az = None
        self.ql0_bz = None
        self.T_cl_max = None

    def calculate(self, params, geometry_results):
        try:
            Q_r = params['Q_r']
            t_in = params['t_in']
            t_out = params['t_out']
            H0_az = params['H0_az']
            H0_bz = params['H0_bz']
            delta_eff = params['delta_eff']
            Cp = params['Cp']
            rho_Na = params['rho_Na']
            lambda_Na = params['lambda_Na']
            a_Na = params['a_Na']
            d_ob = params.get('d_ob', 0.0114)
            d_topl_nar = params.get('d_topl_nar', 0.013)
            d_otv = params.get('d_otv', 0.0018)
            f_az = params['f_az']
            f_pr = params['f_pr']
            f_be = params['f_be']
            lambda_topl = params.get('lambda_topl', 20)
            lambda_3 = params.get('lambda_3', 1.5)

            N_TVS = geometry_results['N_TVS']
            f_prok = geometry_results['f_prok']  # см²
            d_r = geometry_results['d_r']  # см
            x = geometry_results['x']
            d_tvel_1 = self.geometry.d_tvel
            n_tvel = self.geometry.n_tvel

            if abs(f_az + f_pr + f_be - 1) > 0.001:
                raise ValueError("Сумма долей тепловыделения должна быть равна 1")

            self.Q_az = f_az * Q_r
            self.Q_pr = f_pr * Q_r
            self.Q_be = f_be * Q_r
            t_avg = (t_out + t_in) / 2

            self.G_p = (self.Q_az + self.Q_pr) * 1e6 / (Cp * (t_out - t_in))
            self.G_tvel = self.G_p / (n_tvel * N_TVS)
            self.G_be = self.Q_be * 1e6 / (Cp * (t_out - t_in))
            self.G_tvel_be = self.G_be / (n_tvel * 1)

            f_prok_m2 = f_prok * 1e-4
            self.w_az = self.G_p / (f_prok_m2 * N_TVS * rho_Na)
            self.w_be = self.G_be / (f_prok_m2 * 1 * rho_Na)

            d_r_m = d_r * 1e-2
            self.Pe_az = self.w_az * d_r_m / a_Na
            self.Pe_be = self.w_be * d_r_m / a_Na

            try:
                log_arg = -8.12 + 12.76 * x - 3.65 * (x ** 2)
                if log_arg <= 0:
                    self.Nu_az = 0
                else:
                    log_part = 24.151 * np.log10(log_arg)
                    exp_part = 0.0174 * (1 - np.exp(-6 * (x - 1))) * (self.Pe_az - 200) ** 0.9
                    self.Nu_az = log_part + exp_part
                    if not np.isfinite(self.Nu_az):
                        self.Nu_az = 0
            except:
                self.Nu_az = 0

            try:
                log_arg = -8.12 + 12.76 * x - 3.65 * (x ** 2)
                if log_arg <= 0:
                    self.Nu_be = 0
                else:
                    self.Nu_be = 24.151 * np.log10(log_arg)
                    if not np.isfinite(self.Nu_be):
                        self.Nu_be = 0
            except:
                self.Nu_be = 0

            self.H_az = H0_az + 2 * delta_eff
            self.H_bz = H0_bz + 2 * delta_eff

            arg_az = np.pi * H0_az / (2 * self.H_az)
            arg_bz = np.pi * H0_bz / (2 * self.H_bz)
            self.k_z_az = arg_az / np.sin(arg_az) if np.sin(arg_az) != 0 else 1
            self.k_z_bz = arg_bz / np.sin(arg_bz) if np.sin(arg_bz) != 0 else 1

            self.ql0_az = (self.Q_az + self.Q_pr) * 1e6 * self.k_z_az / (H0_az * N_TVS * n_tvel)
            self.ql0_bz = self.Q_be * 1e6 * self.k_z_bz / (H0_bz * 1 * n_tvel)

            if self.G_p > 0 and np.isfinite(self.ql0_az) and np.isfinite(d_r_m) and np.isfinite(lambda_Na) and self.Nu_az != 0:
                self.T_cl_max = t_in + (Q_r * 1e6) / (self.G_p * Cp) + (self.ql0_az * d_r_m * 100) / (np.pi * d_tvel_1 * self.Nu_az * lambda_Na) + 15
            else:
                self.T_cl_max = 1e9

            return {
                'G_p': self.G_p,
                'G_tvel': self.G_tvel,
                'w_az': self.w_az,
                'Pe_az': self.Pe_az,
                'Nu_az': self.Nu_az,
                'G_be': self.G_be,
                'G_tvel_be': self.G_tvel_be,
                'w_be': self.w_be,
                'Pe_be': self.Pe_be,
                'Nu_be': self.Nu_be,
                'k_z_az': self.k_z_az,
                'k_z_bz': self.k_z_bz,
                'ql0_az': self.ql0_az,
                'ql0_bz': self.ql0_bz,
                'T_cl_max': self.T_cl_max
            }
        except Exception as e:
            raise ValueError(f"Ошибка теплового расчета: {str(e)}")

# ---------- Оценка критических параметров ----------
def evaluate_critical_params(geometry_results, thermal_results, critical_ranges):
    critical_params = {
        'N_TVS': geometry_results['N_TVS'],
        'G_p': thermal_results['G_p'],
        'w_az': thermal_results['w_az'],
        'T_cl_max': thermal_results['T_cl_max'],
        'ql0_az': thermal_results['ql0_az']
    }
    for param_name, value in critical_params.items():
        ranges = critical_ranges[param_name]
        if value < ranges['min'] or value > ranges['max']:
            return -1

    ideal_count = 0
    for param_name, value in critical_params.items():
        ranges = critical_ranges[param_name]
        if param_name == 'N_TVS':
            if value in ranges['ideal_values']:
                ideal_count += 1
        else:
            if ranges['ideal_min'] <= value <= ranges['ideal_max']:
                ideal_count += 1
    if ideal_count > 2.5:
        return 2
    else:
        return 1

# ---------- Хранилище задач топологии ----------
topology_tasks = {}

class TopologyThread(threading.Thread):
    def __init__(self, task_id, variation_params, critical_ranges, base_geom, base_thermal):
        super().__init__()
        self.task_id = task_id
        self.variation_params = variation_params
        self.critical_ranges = critical_ranges
        self.base_geom = base_geom
        self.base_thermal = base_thermal
        self.progress = 0
        self.results = []
        self.error = None

    def run(self):
        try:
            D_min = self.variation_params['D_a']['min']
            D_max = self.variation_params['D_a']['max']
            D_step = self.variation_params['D_a']['step']
            Q_min = self.variation_params['Q_r']['min']
            Q_max = self.variation_params['Q_r']['max']
            Q_step = self.variation_params['Q_r']['step']
            H_min = self.variation_params['H0_az']['min']
            H_max = self.variation_params['H0_az']['max']
            H_step = self.variation_params['H0_az']['step']

            D_range = np.arange(D_min, D_max + D_step, D_step)
            Q_range = np.arange(Q_min, Q_max + Q_step, Q_step)
            H_range = np.arange(H_min, H_max + H_step, H_step)

            total = len(D_range) * len(Q_range) * len(H_range)
            geom_calc = GeometryCalculator()
            therm_calc = ThermalCalculator(geom_calc)

            count = 0
            for D in D_range:
                for Q in Q_range:
                    for H in H_range:
                        geometry_params = self.base_geom.copy()
                        geometry_params['D_a'] = D
                        thermal_params = self.base_thermal.copy()
                        thermal_params['Q_r'] = Q
                        thermal_params['H0_az'] = H

                        try:
                            g_res = geom_calc.calculate(geometry_params)
                            t_res = therm_calc.calculate(thermal_params, g_res)
                            score = evaluate_critical_params(g_res, t_res, self.critical_ranges)
                            self.results.append({
                                'D': D,
                                'Q': Q,
                                'H': H,
                                'score': score,
                                'geometry': g_res,
                                'thermal': t_res
                            })
                        except Exception as e:
                            self.results.append({
                                'D': D,
                                'Q': Q,
                                'H': H,
                                'score': -1,
                                'error': str(e)
                            })
                        count += 1
                        self.progress = int(100 * count / total)
            self.progress = 100
        except Exception as e:
            self.error = str(e)
            self.progress = -1

# ---------- Маршруты ----------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate_geometry', methods=['POST'])
def calculate_geometry():
    try:
        params = request.get_json()
        calc = GeometryCalculator()
        result = calc.calculate(params)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/calculate_thermal', methods=['POST'])
def calculate_thermal():
    try:
        data = request.get_json()
        geom_params = data['geometry_params']
        therm_params = data['thermal_params']
        calc = GeometryCalculator()
        geom_res = calc.calculate(geom_params)
        therm_calc = ThermalCalculator(calc)
        therm_res = therm_calc.calculate(therm_params, geom_res)
        return jsonify(therm_res)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/start_topology', methods=['POST'])
def start_topology():
    data = request.get_json()
    variation = data['variation']
    critical = data['critical']
    base_geom = data['base_geom']
    base_thermal = data['base_thermal']
    task_id = str(uuid.uuid4())
    thread = TopologyThread(task_id, variation, critical, base_geom, base_thermal)
    topology_tasks[task_id] = thread
    thread.start()
    return jsonify({'task_id': task_id})

@app.route('/topology_progress/<task_id>')
def topology_progress(task_id):
    task = topology_tasks.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({
        'progress': task.progress,
        'done': task.progress == 100 or task.progress == -1,
        'error': task.error
    })

@app.route('/topology_results/<task_id>')
def topology_results(task_id):
    task = topology_tasks.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    if task.progress != 100:
        return jsonify({'error': 'Not finished'}), 400
    # Возвращаем только нужное: координаты, score и критические параметры для тепловой карты
    # Для 3D облака нужно всё, но для оптимизации вернем только нужное
    return jsonify({'results': task.results})

if __name__ == '__main__':
    app.run(debug=True, threaded=True)