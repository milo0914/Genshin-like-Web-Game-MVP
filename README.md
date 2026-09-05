# Genshin-like Web Game MVP 「元素競技場」

Vibe coding 3D 動作 RPG MVP，參考原神戰鬥系統，使用 Unity 6 + URP + C#。

## 里程碑
- **M1 ✅** 主角設定稿 + 主視覺（黎恩 Rein / 7.5頭身日系寫實）
- **M2 ✅** 競技場（三相遺跡） + 5 種敵人基底 + AI 隨機外觀規格
- **M3 ✅** 核心戰鬥原型（HTML5 Canvas 可玩 Demo）
- **M4** MVP 整合 + WebGL 打包

## 可玩 Demo（直接打開）
```
prototypes/m3-combat-demo/index.html
```
操作：WASD 移動 | Space 衝刺 | 左鍵 普攻 | 1/2/3 元素 | E 戰技 | Q 絕招 | F 切換角色 | Tab 鎖定

## M3 已實作功能
- ✅ 即時移動 / 三段普攻 / 無敵幀衝刺
- ✅ 火/冰/雷三元素切換（1/2/3鍵）
- ✅ 三元素反應：融穿(Melt)×1.8 / 過載(Overload)×1.5 / 超導(Superconduct)-40%防禦 / 共鳴強化
- ✅ 4人隊伍切換（F鍵）：黎恩 + 焰/霜/雷三元素人偶，各有屬性差異
- ✅ 元素戰技：火=突進斬 / 冰=扇形冰刺 / 雷=範圍閃電
- ✅ 絕招三相合一斬（能量充滿按Q，30秒冷卻）
- ✅ Tab鍵敵人鎖定 + 金色準星
- ✅ 施法中斷系統（攻擊詠唱中敵人可中斷）
- ✅ 敵人死亡掉落結晶（自動吸收 +10能量）
- ✅ 地面元素裂縫發光連動
- ✅ 敵人擊退 / 暴擊傷害數字 / 命中粒子
- ✅ 競技場邊界紅色警告
- ✅ 能量充滿時發光提示

## 文件目錄
- `docs/PRD.md` — 產品需求書
- `docs/character-design.md` — 主角設定稿（黎恩）
- `docs/design/proportion-sheet.md` — 7.5 頭身比例與配色
- `docs/arena-design.md` — 競技場場景設計
- `docs/enemies-design.md` — 5 種敵人基底
- `docs/enemy-rng-spec.md` — AI 敵人隨機外觀規格

## 主視覺
- `assets/characters/hero/hero-portrait.png` — 黎恩主視覺（Agnes Image 2.1 Flash）
- `assets/characters/enemies/m2-enemies-concept.png` — 5 敵人概念圖
- `prototypes/` — 設計提案瀏覽頁

## 工具
- `tools/generate_enemy_concepts.sh` — Agnes AI 敵人圖生成腳本
