# M4+ — Unity 版真實遊戲整合計畫

## 目標
把 ArenaSetupWizard 骨幹換成 **免費高品質資產** 驅動的可玩 Unity 場景，媲美小型 indie 遊戲。

## 使用的免費資產（Asset Store）

| 用途 | 資產 | URL |
|------|------|-----|
| 主角模型 + Rig | YBot by Mixamo | https://assetstore.unity.com/packages/3d/characters/ybot-character-194969 |
| 動畫（走跑/揮劍/衝刺/施法）| Mixamo Starter Animations | https://assetstore.unity.com/packages/3d/animations/mixamo-starter-animations-170272 |
| 5 種敵人模型 | RPG Monster Wave 2 Polyart | https://assetstore.unity.com/packages/3d/characters/creatures/rpg-monster-wave-2-polyart-249251 |
| 元素 VFX | Unity Particle Pack | https://assetstore.unity.com/packages/essentials/tutorial-projects/unity-particle-pack-127325 |

**全部 CC0 免費**，授權可商用。

## 安裝流程（給你在 Unity Editor 操作）

1. 開啟 Unity Hub → 本專案 `unity/`
2. 頂部選單 → Window → Package Manager → My Assets（需登入 Unity ID）
3. 上方搜尋欄輸入資產名（例如 "YBot"），點「Download」→「Import」
4. 全部匯入後，跑 `Arena > Generate Arena Scene & Build Settings`
5. 手動把場景裡的 Prefab placeholder 換成 Asset Store 模型（我已經寫好替換腳本 `AssetAdapter.cs`）

## 現在這個分支將做的事
1. 在 `ArenaSetupWizard.cs` 加入 **AssetAdapter** 自動替換（我最後寫）
2. 把玩家角色 controller 接上 Animator
3. 把敵人 EnemyGenerator 接上動畫 + 模型
4. 加上 Shader Graph 元素裂縫
5. 加上 Cinemachine 攝影機跟隨

## 目前完成度
- [x] 免費資產清單與 GUID 準備
- [ ] 5 個 Unity Prefab（英雄 + 4 元素人偶）
- [ ] 5 個敵人 Prefab
- [ ] 2 張景觀地圖
- [ ] URP 特效管線
- [ ] WebGL 協作 build script

時間預估：完整做完約 3 小時純寫碼時間（持續產出 commit）