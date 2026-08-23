# M3 實作路線圖（Unity 6 專案設定 + 開發順序）

## 1. Unity 專案設定
```
Unity Version: Unity 6 LTS (6000.0.x)
Template:      URP (Universal 3D)
Render Scale:  0.75（移動端）
Color Space:   Linear
API Level:     .NET Standard 2.1

Packages (Package Manager):
- Universal RP              (內建)
- Input System              1.7+
- Cinemachine               2.9+
- TextMesh Pro
- Addressables              1.21+
- Visual Effect Graph       （反應粒子）
- ProBuilder                （場景 blocking）
- Animation Rigging         1.2+
```

## 2. 目錄結構（遵守 PRD）
```
Assets/
├── _Core/                 # 人類審查
│   ├── GameManager.cs
│   ├── SaveSystem.cs
│   └── InputManager.cs
├── Combat/
│   ├── PlayerCharacterController.cs
│   ├── ElementalSystem.cs
│   ├── DamageCalculator.cs  # 必審
│   ├── PartyManager.cs      # 必審
│   └── Skills/
│       ├── ProwlerDash.cs
│       ├── ...
├── Enemies/
│   ├── EnemyBase.cs
│   ├── EnemyStateMachine.cs
│   ├── ProwlerBrain.cs
│   ├── StoneguardBrain.cs
│   ├── ...
│   └── EnemyGenerator.cs    # 依 DNA 生成外觀
├── Arena/
│   └── ElementalFloorPulse.cs   # 裂縫發光控制
├── Art/
│   └── Characters/Rein/
│       ├── Model (匯入 .fbx 或 .glb)
│       ├── AnimatorController
│       └── Materials/
└── Scenes/
    └── Arena_ThreePhase.unity
```

## 3. 開發順序（每步 1~2 天）
| 步驟 | 工作 | 完成標準 |
|------|------|----------|
| 1 | 建立 Unity 專案 + URP + Input System | 工程跑通 |
| 2 | 主角走跑衝刺 + 三段普攻（無元素） | 節奏手感 OK |
| 3 | 元素切換 + 三元素戰技 + 絕招 UI | 火冰雷特效分開 |
| 4 | DamageCalculator + ElementalSystem | 單元測試通過 |
| 5 | Prowler 敵人（最少驗證） | 能打死 |
| 6 | 全 5 敵人 + 簡易 AI | 場內可同時存在 4 敵 |
| 7 | ElementalFloorPulse | 裂縫跟元素發光 |
| 8 | PartyManager 切換 + 元素人偶 | 按 1~4 可切人 |
| 9 | WebGL Build + 上傳 itch.io / GitHub Pages | 網頁可玩 |

## 4. Vibe Coding 指南
每步先詳述需求給 AI（Claude / Cursor / Kimi），產出貼到 Unity 後必**人類試玩**。核心數值不要交給 AI。