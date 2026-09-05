# Genshin-like Web Game MVP 「元素競技場」

Vibe coding 3D 動作 RPG MVP，參考原神戰鬥系統，使用 Unity 6 + URP + C#。

## 里程碑
- **M1 ✅** 主角設定稿 + 主視覺（黎恩 Rein / 7.5頭身日系寫實）
- **M2 ✅** 競技場（三相遺跡） + 5 種敵人基底 + AI 隨機外觀規格
- **M3 ✅** 核心戰鬥原型（HTML5 Canvas 可玩 Demo）
- **M4 🔨** MVP 整合（HTML5 Demo 持續更新中；Unity 場景需 Editor）

## 可玩 Demo
直接用瀏覽器打開 `prototypes/m3-combat-demo/index.html`

**操作說明：**
| 按鍵 | 功能 |
|------|------|
| WASD | 移動 |
| Space | 衝刺（無敵幀） |
| 左鍵 | 三段普攻 |
| 1 / 2 / 3 | 切換火 / 冰 / 雷元素 |
| E | 元素戰技（8秒冷卻）|
| Q | 絕招「三相合一斬」（能量滿時）|
| F | 切換4人隊伍（黎恩/焰/霜/雷）|
| Tab | 鎖定最近敵人 |

## M3 已實作功能
- ✅ 即時移動 / 三段普攻 / 無敵幀衝刺
- ✅ 火/冰/雷三元素切換（1/2/3鍵）
- ✅ 三元素反應：融穿×1.8 / 過載×1.5 / 超導-40%防禦 / 共鳴強化
- ✅ 4人隊伍切換（F鍵）：黎恩 + 焰/霜/雷元素人偶，各有屬性差異
- ✅ 元素戰技：火=突進 / 冰=扇形 / 雷=範圍
- ✅ 絕招三相合一斬（能量充滿按Q，30秒冷卻）
- ✅ Tab鍵敵人鎖定 + 金色準星
- ✅ 施法中斷系統（攻擊詠唱中敵人可中斷）
- ✅ 敵人死亡掉落結晶（自動吸收 +10能量）
- ✅ 地面元素裂縫發光連動
- ✅ 敵人擊退 / 暴擊傷害數字 / 命中粒子
- ✅ 競技場邊界紅色警告
- ✅ 能量充滿時發光提示

## M4 HTML5 Demo 已實作
- ✅ 敵人DNA染色多樣化（hue-rotate + saturate + brightness，數萬種視覺變化）
- ✅ 敵人體型大小隨機（Slim ~ Bulky）
- ✅ 敵人自有基礎色光環（區別於元素附著光環）
- ✅ 波次系統：消滅目標後休息3秒回血30%，逐波增加難度
- ✅ 波次進度條視覺化
- ✅ 波次結算大字動畫（螢幕中央）
- ✅ 敵人元素弱點顯示（腳下水晶標記 + HUD提示）
- ✅ 波次難度縮放：每波 HP+15% / 傷害+8%
- ✅ 開場覆蓋層（標題 + 操作說明 + 開始按鈕）
- ✅ 累計總傷害 / 受到傷害追蹤
- ✅ 結算畫面：到達波次 / 總擊殺 / 總傷害 / 受到傷害

## M4 Unity 待完成（需 Unity Editor）
- [ ] 執行 `Arena > Generate Arena Scene & Build Settings` 生成 `Assets/Scenes/Arena_ThreePhase.unity`
- [ ] 匯入 YBot + RPG Monster Wave 2 Polyart（CC0免費資產）
- [ ] 執行 `Arena > Replace Placeholders with Real Assets`
- [ ] 設定 Cinemachine 攝影機跟隨
- [ ] 設定 Animator Controller + Mixamo 動畫
- [ ] 串接 Unity C# 傷害系統與 HTML5 演示的同步
- [ ] WebGL Build 打包（720p / 60fps）

## 文件目錄
- `docs/PRD.md` — 產品需求書
- `docs/character-design.md` — 主角設定稿（黎恩）
- `docs/design/proportion-sheet.md` — 7.5 頭身比例與配色
- `docs/arena-design.md` — 競技場場景設計
- `docs/enemies-design.md` — 5 種敵人基底
- `docs/enemy-rng-spec.md` — AI 敵人隨機外觀規格
- `docs/asset-integration-plan.md` — Unity 免費資產整合計畫

## 主視覺
- `assets/characters/hero/hero-portrait.png` — 黎恩主視覺
- `assets/characters/enemies/m2-enemies-concept.png` — 5 敵人概念圖
- `prototypes/` — 設計提案頁 / 可玩 Demo

## 工具
- `tools/generate_enemy_concepts.sh` — Agnes AI 敵人圖生成腳本
- `unity/Assets/Scripts/Editor/ArenaSetupWizard.cs` — Unity 場景一鍵生成
- `unity/Assets/Scripts/Editor/AssetAdapter.cs` — 免費資產一鍵替換
