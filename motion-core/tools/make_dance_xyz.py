#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""自制「舞蹈 + 四向位移」动作资产生成器（ruanlinyun-vmd-asset-v1）

编舞（16.2s，全部原地/小幅，遵守 KINEMATICS 生理极限，见 LIMITS 自检）：
  开场 groove → 向 X+ 平移一趟 → X− 一趟 → Z+ 一趟 → Z− 一趟 → 收势
  位移走 center(センター) pos 通道（v194 位移通道，播完自动还原）
生成后内置 LIMITS 校验，超限即中止不落盘。
"""
import json
import math

DT = 0.06
TOTAL = 16.2

# 生理极限自检表（超限中止；与工程守卫口径一致）
LIMITS = {
    'elbowL': {'x': (0.0, 2.2), 'y': (-0.3, 0.3), 'z': (-0.40, 0.40)},
    'elbowR': {'x': (0.0, 2.2), 'y': (-0.3, 0.3), 'z': (-0.40, 0.40)},
    'kneeL': {'x': (-2.2, 0.0), 'y': (-0.2, 0.2), 'z': (-0.2, 0.2)},
    'kneeR': {'x': (-2.2, 0.0), 'y': (-0.2, 0.2), 'z': (-0.2, 0.2)},
    'armL': {'x': (-0.6, 0.6), 'y': (-0.4, 0.4), 'z': (-1.4, 1.4)},
    'armR': {'x': (-0.6, 0.6), 'y': (-0.4, 0.4), 'z': (-1.4, 1.4)},
    'legL': {'x': (-0.7, 0.7), 'y': (-0.3, 0.3), 'z': (-0.3, 0.3)},
    'legR': {'x': (-0.7, 0.7), 'y': (-0.3, 0.3), 'z': (-0.3, 0.3)},
    'head': {'x': (-0.3, 0.3), 'y': (-0.4, 0.4), 'z': (-0.3, 0.3)},
    'neck': {'x': (-0.2, 0.2), 'y': (-0.3, 0.3), 'z': (-0.2, 0.2)},
    'spine': {'x': (-0.3, 0.3), 'y': (-0.3, 0.3), 'z': (-0.3, 0.3)},
    'hips': {'x': (-0.2, 0.2), 'y': (-0.3, 0.3), 'z': (-0.2, 0.2)},
    'shoulderL': {'x': (-0.3, 0.3), 'y': (-0.2, 0.2), 'z': (-0.4, 0.4)},
    'shoulderR': {'x': (-0.3, 0.3), 'y': (-0.2, 0.2), 'z': (-0.4, 0.4)},
    'wristL': {'x': (-0.4, 0.4), 'y': (-0.3, 0.3), 'z': (-0.4, 0.4)},
    'wristR': {'x': (-0.4, 0.4), 'y': (-0.3, 0.3), 'z': (-0.4, 0.4)},
    'ankleL': {'x': (-0.4, 0.5), 'y': (-0.2, 0.2), 'z': (-0.2, 0.2)},
    'ankleR': {'x': (-0.4, 0.5), 'y': (-0.2, 0.2), 'z': (-0.2, 0.2)},
}
POS_LIMITS = {'x': 3.2, 'y': 0.5, 'z': 3.2}
STEP_UNITS = 2.6  # 每方向单程位移（场景单位）


def q(ax, a):
    s = math.sin(a / 2.0)
    c = math.cos(a / 2.0)
    return [s, 0.0, 0.0, c] if ax == 'x' else ([0.0, s, 0.0, c] if ax == 'y' else [0.0, 0.0, s, c])


def ease(p):
    p = max(0.0, min(1.0, p))
    return 0.5 - 0.5 * math.cos(math.pi * p)


def quat(x=0.0, y=0.0, z=0.0):
    """小角度欧拉合成：先绕 X，再 Y，再 Z（各轴角≤0.7rad 时误差可忽略）"""
    qx = q('x', x)
    qy = q('y', y)
    qz = q('z', z)
    return quat_mul(quat_mul(qz, qy), qx)


def quat_mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ]


def groove_pose(t, move=None):
    """基础律动：弹跳 + 摆臂 + 扭胯；move=(axis, amount) 时叠加步态位移与抬腿"""
    b = 2.0 * math.pi * 1.6  # 弹跳频率
    s = 2.0 * math.pi * 0.8  # 摆臂/扭腰频率
    bounce = 0.10 * (0.5 - 0.5 * math.cos(b * t)) - 0.05
    pose = {}
    pose['center'] = {'quat': quat(), 'pos': [0.0, bounce, 0.0]}
    k = 0.5 - 0.5 * math.cos(b * t)
    pose['kneeL'] = {'quat': quat(x=-(0.16 + 0.10 * k)), 'pos': [0, 0, 0]}
    pose['kneeR'] = {'quat': quat(x=-(0.16 + 0.10 * k)), 'pos': [0, 0, 0]}
    pose['legL'] = {'quat': quat(x=0.08), 'pos': [0, 0, 0]}
    pose['legR'] = {'quat': quat(x=0.08), 'pos': [0, 0, 0]}
    pose['ankleL'] = {'quat': quat(x=0.10 - 0.06 * k), 'pos': [0, 0, 0]}
    pose['ankleR'] = {'quat': quat(x=0.10 - 0.06 * k), 'pos': [0, 0, 0]}
    sw = math.sin(s * t)
    pose['armL'] = {'quat': quat(z=0.55 + 0.32 * sw), 'pos': [0, 0, 0]}
    pose['armR'] = {'quat': quat(z=-0.55 + 0.32 * sw), 'pos': [0, 0, 0]}
    pose['elbowL'] = {'quat': quat(x=0.95 + 0.22 * sw), 'pos': [0, 0, 0]}
    pose['elbowR'] = {'quat': quat(x=0.95 - 0.22 * sw), 'pos': [0, 0, 0]}
    pose['wristL'] = {'quat': quat(z=0.18 * sw), 'pos': [0, 0, 0]}
    pose['wristR'] = {'quat': quat(z=0.18 * sw), 'pos': [0, 0, 0]}
    pose['shoulderL'] = {'quat': quat(z=0.10 + 0.06 * sw), 'pos': [0, 0, 0]}
    pose['shoulderR'] = {'quat': quat(z=-0.10 + 0.06 * sw), 'pos': [0, 0, 0]}
    pose['spine'] = {'quat': quat(y=0.10 * sw, z=0.08 * math.sin(s * t + math.pi / 2)), 'pos': [0, 0, 0]}
    pose['hips'] = {'quat': quat(z=0.08 * sw), 'pos': [0, 0, 0]}
    pose['head'] = {'quat': quat(y=0.16 * sw, z=0.10 * math.sin(s * t + math.pi / 2)), 'pos': [0, 0, 0]}
    pose['neck'] = {'quat': quat(y=0.06 * sw), 'pos': [0, 0, 0]}
    if move:
        axis, amt = move
        pos = [0.0, bounce, 0.0]
        pos[0 if axis == 'x' else 2] = amt
        pose['center']['pos'] = pos
        # 步态：随位移方向交替抬腿（ph=当前拍）
        step_ph = math.sin(2.0 * math.pi * 1.4 * t)
        lift = 0.30 * min(1.0, abs(amt) / STEP_UNITS)
        pose['legL'] = {'quat': quat(x=0.08 + lift * max(0.0, step_ph)), 'pos': [0, 0, 0]}
        pose['legR'] = {'quat': quat(x=0.08 + lift * max(0.0, -step_ph)), 'pos': [0, 0, 0]}
        pose['kneeL'] = {'quat': quat(x=-(0.16 + 0.35 * max(0.0, step_ph))), 'pos': [0, 0, 0]}
        pose['kneeR'] = {'quat': quat(x=-(0.16 + 0.35 * max(0.0, -step_ph))), 'pos': [0, 0, 0]}
    return pose


def frames():
    out = []
    i = 0
    t = 0.0
    while t <= TOTAL + 1e-9:
        if t < 3.0:
            pose = groove_pose(t)
        else:
            # 四趟位移：每趟 3.3s（去 1.2 + 律动 0.9 + 回 1.2），轴序 X+ / X- / Z+ / Z-
            trips = [('x', 1.0), ('x', -1.0), ('z', 1.0), ('z', -1.0)]
            idx = min(3, int((t - 3.0) // 3.3))
            axis, sign = trips[idx]
            tl = t - 3.0 - idx * 3.3  # 趟内时间 0~3.3
            if tl < 1.2:
                amt = sign * STEP_UNITS * ease(tl / 1.2)
            elif tl < 2.1:
                amt = sign * STEP_UNITS
            else:
                amt = sign * STEP_UNITS * (1.0 - ease((tl - 2.1) / 1.2))
            pose = groove_pose(t, move=(axis, amt))
        bones = {}
        for cat, b in pose.items():
            bones[cat] = {'quat': b['quat'], 'pos': b['pos']}
        out.append({'frame': i, 't': round(t, 4), 'bones': bones})
        t += DT
        i += 1
    return out


def validate(kfs):
    errs = []
    for kf in kfs:
        for cat, b in kf['bones'].items():
            qv = b['quat']
            if abs(qv[0]*qv[0] + qv[1]*qv[1] + qv[2]*qv[2] + qv[3]*qv[3] - 1.0) > 1e-3:
                errs.append(f"t={kf['t']} {cat} quat 非单位")
            if cat in LIMITS:
                for ax, (lo, hi) in LIMITS[cat].items():
                    v = {'x': qv[0], 'y': qv[1], 'z': qv[2]}[ax]
                    ang = 2.0 * math.atan2(v, qv[3]) if qv[3] >= 0 else 2.0 * math.atan2(-v, -qv[3])
                    # 单轴近似角（合成角小，单轴检查按各分量角）
                    v_angle = 2.0 * math.asin(max(-1.0, min(1.0, abs(v))))
                    sign = 1.0 if v >= 0 else -1.0
                    ang_signed = sign * v_angle
                    if ang_signed < lo - 1e-6 or ang_signed > hi + 1e-6:
                        errs.append(f"t={kf['t']} {cat} {ax}={ang_signed:.3f} 超限 [{lo},{hi}]")
            p = b.get('pos') or [0, 0, 0]
            for ax, lim in POS_LIMITS.items():
                if abs(p[{'x': 0, 'y': 1, 'z': 2}[ax]]) > lim + 1e-6:
                    errs.append(f"t={kf['t']} {cat} pos.{ax}={p[{'x':0,'y':1,'z':2}[ax]]:.3f} 超限 ±{lim}")
    return errs


def main():
    kfs = frames()
    errs = validate(kfs)
    if errs:
        print('LIMITS VIOLATION:')
        for e in errs[:20]:
            print('  ' + e)
        raise SystemExit(1)
    asset = {
        'format': 'ruanlinyun-vmd-asset-v1',
        'source': 'workbuddy-authored',
        'modelName': 'any',
        'timeScale': 1.0,
        'ampScale': 1.0,
        'clip': {'start': 0, 'end': None},
        'durationSec': TOTAL,
        'keyframes': kfs,
    }
    out = r'C:\RUANLINYUN\_sessions_raw\dance_xyz.motion.json'
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(asset, f, ensure_ascii=False)
    print(f'WROTE {out} frames={len(kfs)} dur={TOTAL}s limits=OK')


if __name__ == '__main__':
    main()
