#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""motion 协议端到端测试：5 个用例，输出 PASS/FAIL"""
import json, sys, time, urllib.request

BASE = 'http://127.0.0.1:9877'
results = []

def req(method, path, body=None, timeout=10):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def check(name, cond, detail=''):
    results.append((name, cond, detail))
    print(('PASS' if cond else 'FAIL'), '-', name, ('| ' + detail if detail else ''))

# 1. 原语库
st, d = req('GET', '/api/motion/primitives')
check('primitives 列出10原语', st == 200 and len(d['primitives']) == 10 and 'jump' in d['primitives'], str(st))

# 2. 合法 jump：受理 + 解析默认参数
st, d = req('POST', '/api/motion/request', {'mode':'param','action':'jump','params':{'height':0.4,'style':'cute'},'context':'用户说:跳一下'})
check('合法 jump 受理', st == 200 and d['ok'] and d['params']['height'] == 0.4 and d['params']['power'] == 'normal', f"resolved={d.get('params')}")

# 3. solving 中提交新动作 → 最新指令优先（replaced=true）
time.sleep(0.3)
st, d2 = req('POST', '/api/motion/request', {'mode':'param','action':'wave','params':{'duration':1.5}})
check('最新指令优先(replaced)', st == 200 and d2.get('replaced') is True, f"replaced={d2.get('replaced')}")

# 4. 等待完成 → 状态回 idle
deadline = time.time() + 6
state = '?'
while time.time() < deadline:
    _, sd = req('GET', '/api/motion/state')
    state = sd['state']
    if state == 'idle':
        break
    time.sleep(0.25)
check('完成后回归 idle', state == 'idle', f'final={state}')

# 5. 非法动作 → UNKNOWN_ACTION
st, d = req('POST', '/api/motion/request', {'mode':'param','action':'dance'})
check('未注册动作被拒', st == 400 and d['code'] == 'UNKNOWN_ACTION', d.get('code',''))

# 6. 参数越界 → PARAM_OUT_OF_RANGE 附违规明细
st, d = req('POST', '/api/motion/request', {'mode':'param','action':'jump','params':{'height':5}})
check('越界参数被拒+明细', st == 400 and d['code'] == 'PARAM_OUT_OF_RANGE'
      and d['violations'][0]['param'] == 'height', str(d.get('violations')))

# 7. 脚本模式预检（Phase 4 前只校验不执行）
st, d = req('POST', '/api/motion/request', {'mode':'script','script':[
    {'action':'squat','params':{'depth':0.9}}, {'action':'jump','params':{'height':9}}]})
check('脚本越界步拦截', st == 400 and d['code'] == 'PARAM_OUT_OF_RANGE' and '1' in d.get('error',''), d.get('error','')[:40])

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n===== {passed}/{len(results)} PASS =====")
sys.exit(0 if passed == len(results) else 1)