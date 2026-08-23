using UnityEngine;

namespace Arena.Combat
{
    /// <summary>場上實際存在的角色（玩家控制的那個 + 入場爆發）</summary>
    [RequireComponent(typeof(CharacterController))]
    public class RuntimePartyMember : MonoBehaviour
    {
        public CharacterController controller;
        public Element currentElement;
        public float attackPower = 120f;
        public float critRate = 0.2f;
        public int level = 1;

        private void Awake()
        {
            if (controller == null) controller = GetComponent<CharacterController>();
        }

        /// <summary>入場爆發：小範圍元素 AoE</summary>
        public void TriggerEntryBurst(Element element, float damage)
        {
            Debug.Log($"[{name}] 入場爆發 {element} dmg={damage}");
            // TODO: 播放元素爆發 VFX + AoE 對敵
        }
    }
}
