# M3 — 核心戰鬥系統設計

## 1. 目標
在 Unity 6 + URP 上實作可玩的三元素 ARPG 競技場戰鬥原型，**全部用 vibe coding 生成 C#，核心模組人類審查**。

## 2. 角色控制器（PlayerCharacterController）
| 功能 | 規格 |
|------|------|
| 移動 | CharacterController，速度 5.5 m/s，空中不可控 |
| 衝刺 | 0.3s 無敵 + 距離 6m，冷卻 0.8s，消耗 20 體力 |
| 普攻 | 三段連擊（前 0.8s / 中 0.9s / 後 1.1s），最後段有小範圍擊退 |
| 元素切換 | 1/2/3 切換火/冰/雷形態（改變武器特效 + 傷害屬性） |
| 重攻（元素戰技 E） | 每元素獨特：火=突進斬、冰=冰錐範圍、雷=連鎖閃電 |
| 絕招（Q） | 三相合一斬，長冷卻 30s，需三元素能量滿 |
| 鎖定敵人 | 自動鎖定最近敵人，右搖桿切換目標 |

## 3. 元素反應系統（MVP 三元素）

### 基底附著（Aura）
- 敵人可被附加元素：火 / 冰 / 雷
- 持續 8 秒（但弱點為該元素時只持續 4 秒，鼓勵元素爆發）

### 三大反應
| 觸發順序 | 反應名稱 | 效果 | 內含 CD |
|----------|----------|------|---------|
| 冰 → 火 | **融穿** | 目標承受 (atk × 1.8) 火傷害，清除冰 | 1.0s/敵人 |
| 火 → 雷 | **過載** | 半徑 4m (atk × 1.5) 雷傷 + 擊退 | 1.5s/敵人 |
| 冰 → 雷 | **超導** | 半徑 3m 敵人防禦 -40%，8s | 2.0s/敵人 |
| 同元素 | 強化 | 造成 1.3 × 傷害並延長 Aura | 0.5s/敵人 |

## 4. 傷害公式（人類審查）
```
finalDamage = ATK
  × skillMultiplier        // 技能倍率
  × (1 + critRate × 0.5)
  × elementalMultiplier    // 1.0 / 1.8 / 1.5 / 及抗
  × (1 - defenseReduction) // 敵人防禦扣減
  × levelScaleFactor       // 等級差距曲線
```

- 暴擊率上限 50%；暴傷固定 150%
- 敵人防禦 = flatDefense + baseDefense（受超導減成 60%）
- 等級差距：LV 差距 ±10 最多 ±30% 傷害

## 5. 4 人切換（PartyManager）
```
PartySlots[4] = { Rein, Slot2, Slot3, Slot4 }
當前上場 = activeIndex（0..3）
切換：F 鍵循環，或按 1~4 直接切換（除 Slot1=黎恩）
切換動作：
  - 上場角色 → 退場 (0.2s 淡出，進入冷卻 5s)
  - 新角色 → 以「元素爆發」形式入場 (0.4s 小 AoE)
  - 共享冷卻：元素爆發切人 CD 1.5s
```
**MVP 限制**：Slot2~4 暫用「元素人偶」——和黎恩共用模型但配色與不同元素粒子，待 M4 再補真正隊友。

## 6. 敵人 AI（State Machine）
```
State: Idle → Patrol → Alert → Pursue → Attack → Recover → (Stagger | Die)

Prowler:
  Idle → 敵在 10m 內 → Alert(0.5s) → Pursue
  Pursue → 距離 < 2.2m → Attack (1s 前搖 + 0.3s 命中 + 0.8s 後搖)

Stoneguard: 慢速移動，正面 120° 格擋，無視玩家普攻
Embermancer: 距離 6m 詠唱 1.2s 火彈，每 8s 施放灼燒區
FrostArcher: 距離保持 5m，玩家靠近即後跳，每 3s 冰矢
Stormhorn: 距離 < 6m 時蓄力 1s 衝撞（路徑長 10m）
```

## 7. 競技場整合
- 敵人觸發反應時，地面裂縫對應顏色發光 2s
- 敵人死亡掉落「元素結晶」（補充絕招能量 10%）
- 玩家 HP 見底時舞台邊緣閃紅光提示

## 8. 人類必審模組
| 模組 | 原因 |
|------|------|
| DamageCalculator.cs | 影響平衡核心 |
| SaveSystem.cs | 資料安全 |
| PartyManager.cs | 牽動全域狀態 |
| EnemyDropTable.cs | 掉落平衡 |

AI 可大量 vibe code：`AnimatorConfs`、`VFXSpawner`、`EnemyStateMachine` 各基底實作等。