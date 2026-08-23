using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Arena.Combat
{
    /// <summary>
    /// 敵人身上的元素 Aura 附著管理：
    /// - 追蹤當前掛上的元素與剩餘時間
    /// - 反應冷卻（per-target）
    /// - 觸發反應後清除 Aura 並回傳事件
    /// </summary>
    public class ElementalAura : MonoBehaviour
    {
        public Element CurrentAura { get; private set; } = Element.None;
        public float AuraRemaining { get; private set; }

        // 反應冷卻
        private readonly Dictionary<Reaction, float> reactionCooldowns = new();

        // 超導的減防狀態
        public float SuperconductReduction { get; private set; }
        private float superconductTimer;

        public delegate void ReactionTriggered(Reaction reaction, Element consumed);
        public event ReactionTriggered OnReaction;

        private void Update()
        {
            if (AuraRemaining > 0f)
            {
                AuraRemaining -= Time.deltaTime;
                if (AuraRemaining <= 0f) ClearAura();
            }
            if (superconductTimer > 0f)
            {
                superconductTimer -= Time.deltaTime;
                if (superconductTimer <= 0f) SuperconductReduction = 0f;
            }
            // 冷卻時鐘（用 unscaled 不走，跟 Update）
            var keys = new List<Reaction>(reactionCooldowns.Keys);
            foreach (var k in keys)
            {
                reactionCooldowns[k] -= Time.deltaTime;
                if (reactionCooldowns[k] <= 0f) reactionCooldowns.Remove(k);
            }
        }

        public bool IsReactionOnCooldown(Reaction r) => reactionCooldowns.ContainsKey(r);

        /// <summary>附加元素（會先檢查是否觸發反應，若有則處理反應並回傳）</summary>
        public Reaction ApplyElement(Element incoming)
        {
            Element before = CurrentAura;
            Reaction reaction = ElementalSystem.Detect(before, incoming);

            if (reaction == Reaction.None)
            {
                CurrentAura = incoming;
                AuraRemaining = ElementalSystem.AuraDuration;
                return Reaction.None;
            }

            if (IsReactionOnCooldown(reaction)) return Reaction.None;

            // 觸發反應
            float cd = reaction switch {
                Reaction.Melt => ElementalSystem.ReactionCooldownPerTarget,
                Reaction.Overload => ElementalSystem.OverloadCooldown,
                Reaction.Superconduct => ElementalSystem.SuperconductCooldown,
                Reaction.Resonance => ElementalSystem.ResonanceCooldown,
                _ => 0f
            };
            if (cd > 0f) reactionCooldowns[reaction] = cd;

            // 超導長效減防
            if (reaction == Reaction.Superconduct)
            {
                SuperconductReduction = ElementalSystem.SuperconductDefenseReduction;
                superconductTimer = ElementalSystem.SuperconductDuration;
            }

            // 原神式：反應後 Aura 被消耗（Resonance 除外）
            if (reaction != Reaction.Resonance) ClearAura();
            else
            {
                // 同元素強化 = 重新刷 Aura
                CurrentAura = incoming;
                AuraRemaining = ElementalSystem.AuraDuration;
            }

            OnReaction?.Invoke(reaction, before);
            return reaction;
        }

        public void ClearAura()
        {
            CurrentAura = Element.None;
            AuraRemaining = 0f;
        }
    }
}
