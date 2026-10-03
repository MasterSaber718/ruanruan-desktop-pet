# v192 T5：VMD 动作库使用指南

## 一、现在怎么加新动作（3 步）

1. **找 VMD 源文件**：Bilibili / DeviantArt / bowlroll.net 搜「MMD 配布 モーション」下载 `.vmd`（注意模型配布协议，琳奈用配布动作需确认二次使用条款）。
2. **转换**（项目自带管线，一条命令）：

```
cd C:\RUANLINYUN\motion-core\vmd-pipeline
node vmd_pipeline.js "C:\下载\波浪舞.vmd" --name wave_dance --amp 0.8
```

参数：`--name` 资产名 / `--time 1.2` 放慢动作 / `--amp 0.8` 幅度收敛（待机类建议 0.7-0.9）/ `--start 30 --end 120` 只截取某段帧。

3. **入库**：把 `output\wave_dance.motion.json` 和 `wave_dance.recipe.json` 复制到
   `C:\Users\Administrator\Desktop\kks\resources\app\frontend-dist\vmd\`，
   并在 `index.json` 数组里追加一条：

```json
{
  "id": "wave_dance",
  "label": "波浪舞",
  "source": "外部VMD",
  "durationSec": 6.5,
  "asset": "wave_dance.motion.json",
  "spatial": false
}
```

**验证**：软件里对 AI 说「来一段波浪舞」或控制台执行 `__petAction('vmdClip', { asset: 'wave_dance.motion.json' })`，日志出现 `[VmdClip] 播放` 即成功。

## 二、注意事项

- **idle 类（循环待机）片段**：v192 起播放期间生命感层（视线/微晃）自动让位（`__vmdClipActive` 标记），播完自动恢复，不会打架。
- **动作总时长**：`durationSec` 以 motion.json 内实际关键帧为准；太长的 VMD 用 `--start/--end` 裁剪。
- **骨骼覆盖**：管线只映射标准 MMD 骨骼名（头/首/腕/足等 20 类），模型缺骨骼会自动跳过，日志会列出未映射骨骼。
- **表情帧**：VMD 里的 morph 帧当前不导入（眨眼由 v192 实时系统接管，避免叠加冲突）。

## 三、现状

- 库内资产：`idle_刘TWT`（7.7s 待机）、`js_芝麻凛`（1.2s 短姿）、`idle2_眨眼瓶子`（23.3s，索引占位未拷入）。
- 扩库建议优先级：待机替代片段 2-3 个（防循环感）＞ 打招呼类 3-5 个 ＞ 舞蹈/表演类随意。
