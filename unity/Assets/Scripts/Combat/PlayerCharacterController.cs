using UnityEngine;
using UnityEngine.InputSystem;

namespace Arena.Combat
{
    /// <summary>
    /// 玩家角色控制器：移動 / 衝刺 / 三段普攻 / 元素切換 / 元素戰技
    /// 依賴 Unity Input System（PlayerInput 組件）。
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    [RequireComponent(typeof(PartyManager))]
    public class PlayerCharacterController : MonoBehaviour
    {
        [Header("Movement")]
        public float moveSpeed = 5.5f;
        public float rotationSpeed = 12f;

        [Header("Dash")]
        public float dashSpeed = 18f;
        public float dashDuration = 0.3f;
        public float dashCooldown = 0.8f;
        public float dashIFrames = 0.3f;

        [Header("Attack")]
        public float[] comboMultipliers = { 0.8f, 0.9f, 1.4f }; // 三段倍率
        public float[] comboWindows = { 0.8f, 0.9f, 1.1f };

        [Header("Element Skills (E)")]
        public float elementSkillCD = 8f;

        [Header("Burst (Q)")]
        public float burstCD = 30f;
        public float energyPerHit = 10f;
        public float burstThreshold = 100f;

        private CharacterController cc;
        private PartyManager party;
        private Vector2 moveInput;
        private int comboIndex;
        private float comboTimer;
        private float lastDashTime = -999f;
        private float lastSkillTime = -999f;
        private float lastBurstTime = -999f;
        private float burstEnergy;
        private float iFramesEndTime;

        private void Awake()
        {
            cc = GetComponent<CharacterController>();
            party = GetComponent<PartyManager>();
        }

        private void Update()
        {
            float dt = Time.deltaTime;

            // 移動
            Vector3 move = new Vector3(moveInput.x, 0f, moveInput.y);
            move = transform.TransformDirection(move) * moveSpeed;
            cc.Move(move * dt);

            if (moveInput.sqrMagnitude > 0.01f)
            {
                Quaternion targetRot = Quaternion.LookRotation(new Vector3(moveInput.x, 0, moveInput.y));
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, rotationSpeed * dt);
            }

            // 連擊窗
            if (comboTimer > 0f) comboTimer -= dt;
            if (comboTimer <= 0f) comboIndex = 0;
        }

        // ---- Input callbacks (wire in PlayerInput) ----
        public void OnMove(InputValue v) => moveInput = v.Get<Vector2>();

        public void OnDash(InputValue _)
        {
            if (Time.time < lastDashTime + dashCooldown) return;
            lastDashTime = Time.time;
            iFramesEndTime = Time.time + dashIFrames;

            Vector3 dir = new Vector3(moveInput.x, 0, moveInput.y);
            if (dir.sqrMagnitude < 0.01f) dir = transform.forward;
            cc.Move(dir.normalized * dashSpeed * dashDuration);
        }

        public void OnAttack(InputValue _)
        {
            if (comboIndex >= comboMultipliers.Length) return;
            float mult = comboMultipliers[comboIndex];
            comboTimer = comboWindows[comboIndex];
            comboIndex = (comboIndex + 1) % comboMultipliers.Length;

            // TODO: 播動畫 + hitbox 判定
            Debug.Log($"Attack combo {comboIndex} mult={mult}");
        }

        public void OnSwitchElement(InputValue v)
        {
            // 1 / 2 / 3 → SetActiveElement(Fire/Ice/Thunder) via PartyManager.Active
            int idx = Mathf.Clamp(Mathf.RoundToInt(v.Get<float>()) - 1, 0, 2);
            if (party.Active != null)
            {
                party.Active.currentElement = (Element)(idx + 1);
            }
        }

        public void OnElementSkill(InputValue _)
        {
            if (Time.time < lastSkillTime + elementSkillCD) return;
            if (party.Active == null) return;
            lastSkillTime = Time.time;
            // Fire dash / Ice cone / Thunder chain — 依 currentElement 分派
            Debug.Log($"Element Skill: {party.Active.currentElement}");
        }

        public void OnBurst(InputValue _)
        {
            if (Time.time < lastBurstTime + burstCD) return;
            if (burstEnergy < burstThreshold) return;
            lastBurstTime = Time.time;
            burstEnergy = 0;
            Debug.Log("BURST — 三相合一斬!");
        }

        public void OnSwitchParty(InputValue v)
        {
            if (v.Get<float>() is float f && f == 0f) party.CycleNext();
            else party.SwitchTo(Mathf.RoundToInt(f) - 1);
        }

        // ---- 給傷害結算用 ----
        public DamageInput BuildDamageInput(float skillMultiplier, Element attackElement, Element targetAura, float targetResist, float targetDefenseFlat, int targetLevel, float extraDefenseReduction)
        {
            return new DamageInput
            {
                attackPower = party.Active != null ? party.Active.attackPower : 100f,
                skillMultiplier = skillMultiplier,
                element = attackElement,
                critRate = party.Active != null ? party.Active.critRate : 0f,
                attackerLevel = party.Active != null ? party.Active.level : 1,
                defenderLevel = targetLevel,
                defenseFlat = targetDefenseFlat,
                defenseReduction = extraDefenseReduction,
                targetAura = targetAura,
                targetElementResist = targetResist,
            };
        }

        public bool IsInIFrames => Time.time < iFramesEndTime;

        public void GainBurstEnergy(float amount) => burstEnergy = Mathf.Min(burstThreshold, burstEnergy + amount);
    }
}
