#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""自制「蹲下 / 跳跃」动作资产生成器（ruanlinyun-vmd-asset-v1，含 center 位移）

约定（与引擎一致 / KINEMATICS）：
  - 膝：只能 X−（负值=向后弯）
  - 大腿(足)：X+ = 髋前屈（抬腿/下蹲前倾）
  - 踝(足首)：X+ = 勾脚（下蹲时脚掌贴地补偿）
  - center(センター)：pos[1] 为垂直位移，+ 向上、− 向下；单位=场景单位（先按经验值，实测后校准）
只写被驱动的骨骼链（不写其它骨骼，避免把未动画肢体打回绑定姿势）。
"""
import json
import math
import os
import sys

CATS_ARM = ['shoulderL', 'shoulderR']


def q(ax, a):
    s = math.sin(a / 2.0)
    c = math.cos(a / 2.0)
    return [s, 0.0, 0.0, c] if ax == 'x' else ([0.0, s, 0.0, c] if ax == 'y' else [0.0, 0.0, s, c])


def ease(p):
    p = max(0.0, min(1.0, p))
    return 0.5 - 0.5 * math.cos(math.pi * p)


def bone(quat, pos=None):
    return {'quat': quat, 'pos': pos or [0.0, 0.0, 0.0]}


def build_squat(sink=0.25, total=3.0, dt=0.06):
    """蹲下：下沉 + 屈膝 + 前倾 + 双膝对称，末段起身回位"""
    T_DOWN = 0.75
    T_HOLD = 2.25
    frames = []
    i = 0
    t = 0.0
    while t <= total + 1e-9:
        if t < T_DOWN:
            k = ease(t / T_DOWN)
        elif t < T_HOLD:
            k = 1.0
        else:
            k = 1.0 - ease((t - T_HOLD) / (total - T_HOLD))
        bones = {}
        bones['center'] = bone([0.0, 0.0, 0.0, 1.0], [0.0, -sink * k, 0.0])
        for side in ('L', 'R'):
            bones['leg' + side] = bone(q('x', 0.95 * k))      # 大腿前屈
            bones['knee' + side] = bone(q('x', -1.35 * k))    # 膝后弯
            bones['ankle' + side] = bone(q('x', 0.55 * k))    # 勾脚贴地
        bones['hips'] = bone(q('x', 0.18 * k))                # 骨盆微前倾
        bones['spine'] = bone(q('x', 0.22 * k))               # 上半身前倾
        bones['neck'] = bone(q('x', -0.12 * k))
        bones['head'] = bone(q('x', -0.10 * k))               # 抬头看前方
        bones['shoulderL'] = bone(q('x', 0.18 * k))
        bones['shoulderR'] = bone(q('x', 0.18 * k))
        frames.append({'frame': i, 't': round(t, 4), 'bones': bones})
        t += dt
        i += 1
    return _wrap(frames, total, 'custom_squat')


def build_jump(lift=0.45, crouch=0.22, total=2.6, dt=0.05):
    """跳跃：预备下蹲 → 蹬伸腾空 → 空中收腿 → 落地缓冲 → 回位"""
    keys = [
        (0.00, 0.00, 0.00),   # rest
        (0.35, 1.00, 0.00),   # 预备蹲
        (0.60, -0.15, 0.00),  # 蹬伸（腿近直，略微过伸）
        (0.95, 0.00, 1.00),   # 腾空最高点（收腿）
        (1.30, 0.55, 0.55),   # 下落
        (1.55, 1.00, 0.00),   # 落地缓冲
        (2.05, 0.35, 0.00),   # 起身
        (2.60, 0.00, 0.00),   # rest
    ]
    frames = []
    i = 0
    steps = int(total / dt)
    for n in range(steps + 1):
        t = n * dt
        k_crouch = 0.0
        k_air = 0.0
        for a in range(len(keys) - 1):
            t0, c0, a0 = keys[a]
            t1, c1, a1 = keys[a + 1]
            if t0 <= t <= t1:
                p = ease((t - t0) / max(1e-6, t1 - t0))
                k_crouch = c0 + (c1 - c0) * p
                k_air = a0 + (a1 - a0) * p
                break
        bones = {}
        bones['center'] = bone([0.0, 0.0, 0.0, 1.0],
                               [0.0, (-crouch * k_crouch) + (lift * k_air), 0.0])
        for side in ('L', 'R'):
            bones['leg' + side] = bone(q('x', 1.00 * k_crouch + 0.55 * k_air))
            bones['knee' + side] = bone(q('x', -1.45 * k_crouch - 1.25 * k_air))
            bones['ankle' + side] = bone(q('x', 0.60 * k_crouch - 0.35 * k_air))
        bones['spine'] = bone(q('x', 0.28 * k_crouch - 0.15 * k_air))
        bones['neck'] = bone(q('x', -0.10 * k_crouch))
        bones['head'] = bone(q('x', -0.12 * k_crouch))
        bones['shoulderL'] = bone(q('x', 0.20 * k_crouch - 0.35 * k_air))
        bones['shoulderR'] = bone(q('x', 0.20 * k_crouch - 0.35 * k_air))
        frames.append({'frame': i, 't': round(t, 4), 'bones': bones})
        i += 1
    return _wrap(frames, total, 'custom_jump')


def _wrap(frames, total, name):
    return {
        'format': 'ruanlinyun-vmd-asset-v1',
        'source': 'workbuddy-authored',
        'modelName': 'any',
        'timeScale': 1.0,
        'ampScale': 1.0,
        'clip': {'start': 0, 'end': None},
        'durationSec': round(total, 3),
        'keyframes': frames,
    }


if __name__ == '__main__':
    out_dir = sys.argv[1] if len(sys.argv) > 1 else r'C:\RUANLINYUN\_sessions_raw'
    sink = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
    lift = float(sys.argv[3]) if len(sys.argv) > 3 else 0.45
    sq = build_squat(sink=sink)
    jp = build_jump(lift=lift)
    for a, fn in ((sq, 'custom_squat.motion.json'), (jp, 'custom_jump.motion.json')):
        p = os.path.join(out_dir, fn)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(a, f, ensure_ascii=False)
        print('WROTE %s  frames=%d  dur=%ss' % (p, len(a['keyframes']), a['durationSec']))
