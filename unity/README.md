# Unity 專案 — Genshin-like Web Game MVP

## 需求
- Unity 6 LTS (**6000.0.29f1**)
- WebGL Build Support module（Web 打包）
- Git LFS（處理 .fbx / .png / 音效）

## 快速開始

```bash
# 1. 複製 repo
git clone https://github.com/milo0914/Genshin-like-Web-Game-MVP.git
cd Genshin-like-Web-Game-MVP

# 2. 第一次跑（需要安裝 LFS）
git lfs install && git lfs pull

# 3. 用 Unity Hub 開啟 unity/ 資料夾
#    Unity 會自動建立 Library/（約 5–10 分鐘）

# 4. 打開場景 Assets/Scenes/Arena_ThreePhase.unity
#    （若場景不存在，先新增空場景 + 按 Roadmap 第 2 步建立主角）
```

## 結構
```
unity/
├── Packages/manifest.json          # Unity 套件相依
├── ProjectSettings/                # 專案設定
│   └── ProjectVersion.txt
└── Assets/
    ├── Scripts/
    │   ├── Combat/                 # COMBAT 核心
    │   │   ├── Combat.asmdef
    │   │   ├── DamageCalculator.cs  # ⚠️ 人類審查
    │   │   ├── ElementalAura.cs     # 元素附著狀態機
    │   │   ├── PartyManager.cs    # ⚠️ 4 人切換
    │   │   ├── RuntimePartyMember.cs
    │   │   └── PlayerCharacterController.cs
    │   └── Enemies/
    │       ├── Enemies.asmdef
    │       ├── EnemyBase.cs       # 敵人基底狀態機
    │       └── EnemyGenerator.cs   # AI 隨機外觀
    ├── Scenes/
    └── Art/
```

## 審查清單
以下檔案**不要交給 AI 任意修改**（變動需審查）：
- `DamageCalculator.cs` — 傷害公式 / 反應乘數
- `PartyManager.cs` — 切換時機與冷卻
- `EnemyGenerator.cs` — 隨機範圍
- `docs/PRD.md` — 需求書

## 下一步（M4）
- [ ] 建立 `Assets/Scenes/Arena_ThreePhase.unity`（參考 arena-design.md）
- [ ] 敵人動畫控制器
- [ ] HUD UI
- [ ] WebGL Build + 性能測試（720p / 60fps）
