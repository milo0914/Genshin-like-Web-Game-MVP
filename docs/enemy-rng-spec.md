# M2-C — 敵人外觀隨機生成規格（DNA 基因組）

## 1. 資料結構（C# 類別）
```csharp
public enum EnemyBase { Prowler, Stoneguard, Embermancer, FrostArcher, Stormhorn }
public enum EnemyElement { Fire, Ice, Thunder, None }
public enum BodySize { Slim = -1, Standard = 0, Bulky = 1 }

public class EnemyDNA {
    public EnemyBase   baseType;
    public EnemyElement element;
    public float        primaryColorHue;   // 0..1   (saturated 0.6, value 0.5)
    public float        secondaryColorHue; // 0..1
    public int          headAccessoryIndex;   // 0..3
    public int          backAccessoryIndex;   // 0..2
    public int          weaponVariantIndex;   // 0..3
    public BodySize     bodySize;             // 影響 scale
    public bool         hasAura;
}
```

## 2. 生成演算法
```csharp
EnemyDNA Generate(System.Random rng, DifficultyTier tier) {
    var dna = new EnemyDNA {
        baseType    = (EnemyBase) rng.Next(5),
        element     = WeightedElement(rng, tier),      // 依難度骰出
        primaryColorHue   = (float) rng.NextDouble(),
        secondaryColorHue = (float) rng.NextDouble(),
        headAccessoryIndex = rng.Next(4),
        backAccessoryIndex = rng.Next(3),
        weaponVariantIndex = rng.Next(4),
        bodySize    = (BodySize) rng.Next(-1, 2),
        hasAura     = rng.NextDouble() < AuraChance(tier),
    };
    return dna;
}
```

## 3. 組合上限
5 base × 4 element × 3 body × 4 head × 3 back × 4 weapon × hue × aura
≈ **數萬種視覺變化**，但模型僅需 5 套基底 + 14 種配件。

## 4. 渲染管線
1. 讀取 `EnemyDNA.baseType` → 啟用對應 Animator + Model Prefab
2. 染色：HLSL `ColorAdjust` Shader，輸入 primary/secondary hue
3. 配件：用 Transform.Find("Socket_Head") 等插槽掛載
4. 光環：ParticleSystem prefab，依 element 選擇 ColorModule
5. 體型：root Transform.localScale 微調 (0.9 ~ 1.15)

## 5. 與戰鬥連動
- 弱點元素：敵人身上的水晶裝飾顏色提示
- 隨機性僅影響視覺；HP / 攻擊力由基底 + 難度級別算出，避免平衡失控
