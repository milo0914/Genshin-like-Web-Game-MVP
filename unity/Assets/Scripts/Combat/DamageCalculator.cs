using UnityEngine;

namespace Arena.Combat
{
    /// <summary>
    /// 元素類型（MVP 使用三件：火 / 冰 / 雷）
    /// </summary>
    public enum Element { None, Fire, Ice, Thunder }

    /// <summary>
    /// 元素反應（Genshin-like）
    /// </summary>
    public enum Reaction { None, Melt, Overload, Superconduct, Resonance }

    /// <summary>
    /// 一次攻擊的傷害輸入
    /// </summary>
    public struct DamageInput
    {
        public float attackPower;      // 攻擊方 ATK
        public float skillMultiplier;  // 技能倍率（1.0 = 普通攻擊）
        public Element element;        // 攻擊方元素
        public float critRate;         // 0..1
        public int attackerLevel;
        public int defenderLevel;
        public float defenseFlat;      // 敵人固定防禦
        public float defenseReduction; // 來自超導等減防 (0..0.6)
        public Element targetAura;     // 敵人目前掛的元素
        public float targetElementResist; // 0..0.9（對該攻擊元素的抗性）
    }

    public struct DamageResult
    {
        public float finalDamage;
        public Reaction reaction;
        public bool isCrit;
    }

    /// <summary>
    /// 元素反應偵測（static）
    /// </summary>
    public static class ElementalSystem
    {
        /// <summary>判斷是否觸發反應（attacker on top of existing aura）</summary>
        public static Reaction Detect(Element aura, Element incoming)
        {
            if (aura == incoming || incoming == Element.None) return Reaction.Resonance;
            if (aura == Element.None) return Reaction.None;
            if (aura == Element.Ice && incoming == Element.Fire) return Reaction.Melt;
            if (aura == Element.Fire && incoming == Element.Thunder) return Reaction.Overload;
            if (aura == Element.Ice && incoming == Element.Thunder) return Reaction.Superconduct;
            return Reaction.None;
        }

        /// <summary>反應乘數（直接傷害加成）</summary>
        public static float Multiplier(Reaction r) => r switch {
            Reaction.Melt => 1.8f,
            Reaction.Overload => 1.5f,
            Reaction.Superconduct => 1.0f,   // 超導無直接傷害加成，靠減防
            Reaction.Resonance => 1.3f,
            _ => 1.0f
        };

        /// <summary>超導的防禦減益</summary>
        public const float SuperconductDefenseReduction = 0.4f; // -40%
        public const float SuperconductDuration = 8f;
        public const float AuraDuration = 8f;
        public const float ReactionCooldownPerTarget = 1.0f; // Melt
        public const float OverloadCooldown = 1.5f;
        public const float SuperconductCooldown = 2.0f;
        public const float ResonanceCooldown = 0.5f;
    }

    /// <summary>
    /// 傷害計算核心（人類審查級別 — 數值不要交給 AI 修改）
    /// </summary>
    public static class DamageCalculator
    {
        // 等級差距影響：±10 級最多 ±30%
        public static float LevelScale(int atk, int def)
        {
            int diff = Mathf.Clamp(atk - def, -10, 10);
            return 1f + diff * 0.03f;
        }

        // 防禦折減（原神式）
        public static float DefenseReduction(float defenseFlat, float levelDefender, float extraReduction)
        {
            float effDef = Mathf.Max(0, defenseFlat * (1f - extraReduction));
            float lvl = Mathf.Max(1, levelDefender);
            float dmgReduction = effDef / (effDef + 500f + lvl * 5f);
            return 1f - dmgReduction;
        }

        public static DamageResult Calculate(in DamageInput input)
        {
            Reaction reaction = ElementalSystem.Detect(input.targetAura, input.element);
            float reactionMult = ElementalSystem.Multiplier(reaction);

            bool isCrit = Random.value < Mathf.Clamp01(input.critRate);
            float critMult = isCrit ? 1.5f : 1.0f;

            float levelScale = LevelScale(input.attackerLevel, input.defenderLevel);
            float defMult = DefenseReduction(input.defenseFlat, input.defenderLevel, input.defenseReduction);
            float resistMult = 1f - Mathf.Clamp01(input.targetElementResist);

            float finalDamage = input.attackPower
                * input.skillMultiplier
                * critMult
                * reactionMult
                * defMult
                * levelScale
                * resistMult;

            return new DamageResult {
                finalDamage = finalDamage,
                reaction = reaction,
                isCrit = isCrit
            };
        }
    }
}
