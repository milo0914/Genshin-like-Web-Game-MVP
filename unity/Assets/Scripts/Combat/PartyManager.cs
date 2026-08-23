using System.Collections.Generic;
using UnityEngine;

namespace Arena.Combat
{
    /// <summary>
    /// 4 人切換管理：MVP 用元素人偶（同模型，不同配色）
    /// Slot 0 固定為黎恩 Rein（主駕駛，全元素可切）
    /// Slot 1~3 為協同元素人偶（暫定火 / 冰 / 雷）
    /// </summary>
    public class PartyManager : MonoBehaviour
    {
        [System.Serializable]
        public class PartySlot
        {
            public string displayName;
            public GameObject characterPrefab;
            public Element signatureElement;
            public RuntimePartyMember instance;
            public float switchOutCooldownEnd;
        }

        public PartySlot[] slots = new PartySlot[4];
        public int activeIndex = 0;

        public float switchInBurstDamage = 100f;
        public float switchCooldown = 5f;
        public float burstCooldown = 1.5f; // 入場爆發冷卻（全域）
        private float lastBurstTime = -999f;

        public delegate void PartySwitched(int newIndex, int oldIndex);
        public event PartySwitched OnSwitch;

        public RuntimePartyMember Active => slots[activeIndex].instance;

        private void Start()
        {
            for (int i = 0; i < slots.Length; i++)
            {
                if (slots[i] == null || slots[i].characterPrefab == null) continue;
                var go = Instantiate(slots[i].characterPrefab, transform);
                go.SetActive(i == activeIndex);
                slots[i].instance = go.GetComponent<RuntimePartyMember>();
                slots[i].switchOutCooldownEnd = -999f;
            }
        }

        public void SwitchTo(int targetIndex)
        {
            if (targetIndex == activeIndex) return;
            if (targetIndex < 0 || targetIndex >= slots.Length) return;
            var slot = slots[targetIndex];
            if (slot == null || slot.instance == null) return;
            if (Time.time < slot.switchOutCooldownEnd) return;
            if (Time.time < lastBurstTime + burstCooldown) return;

            int oldIndex = activeIndex;
            var oldSlot = slots[oldIndex];

            // 退場
            oldSlot.instance.gameObject.SetActive(false);
            oldSlot.switchOutCooldownEnd = Time.time + switchCooldown;

            // 入場爆發
            slot.instance.gameObject.SetActive(true);
            slot.instance.TriggerEntryBurst(slot.signatureElement, switchInBurstDamage);
            lastBurstTime = Time.time;

            activeIndex = targetIndex;
            OnSwitch?.Invoke(targetIndex, oldIndex);
        }

        public void CycleNext() => SwitchTo((activeIndex + 1) % slots.Length);
    }
}
