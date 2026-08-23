using UnityEngine;

namespace Arena.Enemies
{
    /// <summary>敵人基底腦袋（狀態機）</summary>
    [RequireComponent(typeof(ElementalAura))]
    public class EnemyBase : MonoBehaviour
    {
        public enum State { Idle, Alert, Pursue, Attack, Recover, Stagger, Die }

        [Header("Base Stats")]
        public float maxHP = 500f;
        public float attackPower = 30f;
        public float moveSpeed = 3.5f;
        public float defenseFlat = 100f;
        public int level = 1;
        public Element signatureElement;

        [Header("AI Tuning")]
        public float aggroRange = 10f;
        public float attackRange = 2.2f;
        public float attackWindup = 1.0f;
        public float attackRecovery = 0.8f;

        [HideInInspector] public State state;
        protected Transform player;
        protected ElementalAura aura;
        protected float stateTimer;
        protected float hp;

        protected virtual void Awake()
        {
            aura = GetComponent<ElementalAura>();
            hp = maxHP;
        }

        protected virtual void Start()
        {
            var p = GameObject.FindGameObjectWithTag("Player");
            if (p) player = p.transform;
        }

        protected virtual void Update()
        {
            stateTimer -= Time.deltaTime;
            switch (state)
            {
                case State.Idle:   UpdateIdle(); break;
                case State.Alert:  UpdateAlert(); break;
                case State.Pursue: UpdatePursue(); break;
                case State.Attack: UpdateAttack(); break;
                case State.Recover: UpdateRecover(); break;
                case State.Stagger: UpdateStagger(); break;
                case State.Die:    break;
            }
        }

        protected virtual void UpdateIdle()
        {
            if (player && Vector3.Distance(transform.position, player.position) < aggroRange)
                SetState(State.Alert, 0.5f);
        }
        protected virtual void UpdateAlert()
        {
            if (stateTimer <= 0f) SetState(State.Pursue);
        }
        protected virtual void UpdatePursue()
        {
            if (!player) return;
            MoveTowards(player.position, moveSpeed);
            if (Vector3.Distance(transform.position, player.position) < attackRange)
                SetState(State.Attack, attackWindup);
        }
        protected virtual void UpdateAttack()
        {
            if (stateTimer <= 0f)
            {
                // Hit player (simplified: distance check)
                if (player && Vector3.Distance(transform.position, player.position) < attackRange * 1.2f)
                    DealDamageToPlayer();
                SetState(State.Recover, attackRecovery);
            }
        }
        protected virtual void UpdateRecover()
        {
            if (stateTimer <= 0f) SetState(State.Pursue);
        }
        protected virtual void UpdateStagger()
        {
            if (stateTimer <= 0f) SetState(State.Idle);
        }

        protected void SetState(State s, float timer = 0f)
        {
            state = s;
            stateTimer = timer;
        }

        protected virtual void MoveTowards(Vector3 target, float speed)
        {
            Vector3 dir = (target - transform.position).normalized;
            dir.y = 0;
            transform.position += dir * speed * Time.deltaTime;
            transform.forward = dir;
        }

        protected virtual void DealDamageToPlayer()
        {
            Debug.Log($"{name} hit player for {attackPower}");
        }

        public virtual void TakeDamage(float amount, Element fromElement)
        {
            hp -= amount;
            aura.ApplyElement(fromElement);
            if (hp <= 0f) SetState(State.Die);
            else if (amount > maxHP * 0.3f) SetState(State.Stagger, 0.5f);
        }
    }

    // ---- 五種基底 ----

    /// <summary>E1 掠焰狼 — 高攻高速突進型</summary>
    public class EmberProwlerBrain : EnemyBase
    {
        protected override void UpdatePursue()
        {
            base.UpdatePursue();
            // 距離 > 6m 時周期性突進
            if (player && Vector3.Distance(transform.position, player.position) > 6f && stateTimer <= 0f)
            {
                // 突進：速度 × 3 持續 0.4s
                MoveTowards(player.position, moveSpeed * 3f);
            }
        }
    }

    /// <summary>E2 巨石守衛 — 慢速，正面 120° 格擋</summary>
    public class StoneguardBrain : EnemyBase
    {
        protected override void Awake() { base.Awake(); moveSpeed = 1.2f; attackWindup = 1.5f; maxHP = 1200f; }

        public override void TakeDamage(float amount, Element fromElement)
        {
            // 完全格擋若攻擊來自正面 120°
            Vector3 toAttacker = (player != null) ? player.position - transform.position : Vector3.forward;
            if (Vector3.Angle(transform.forward, toAttacker) < 60f)
            {
                amount *= 0.2f;
                Debug.Log("Stoneguard blocked!");
            }
            base.TakeDamage(amount, fromElement);
        }
    }

    /// <summary>E3 火語術士 — 射程 6m，灼燒 AoE</summary>
    public class EmbermancerBrain : EnemyBase
    {
        protected override void Awake() { base.Awake(); attackRange = 6f; attackWindup = 1.2f; }
    }

    /// <summary>E4 冰霜射手 — 保持距離 5m，後跳</summary>
    public class FrostArcherBrain : EnemyBase
    {
        protected override void Awake() { base.Awake(); attackRange = 5f; }

        protected override void UpdatePursue()
        {
            if (!player) return;
            float dist = Vector3.Distance(transform.position, player.position);
            if (dist < 4f)
            {
                // 後跳
                Vector3 away = (transform.position - player.position).normalized;
                transform.position += away * 4f * Time.deltaTime;
                transform.forward = -away;
            }
            else
            {
                base.UpdatePursue();
            }
        }
    }

    /// <summary>E5 雷角巨獸 — 短距離蓄力衝撞</summary>
    public class StormhornBrain : EnemyBase
    {
        protected override void Awake() { base.Awake(); moveSpeed = 4.5f; attackWindup = 1f; attackRange = 3f; }

        protected override void UpdatePursue()
        {
            if (player && Vector3.Distance(transform.position, player.position) < 6f && stateTimer <= 0f)
            {
                SetState(State.Attack, 1f); // 1s 蓄力
            }
            else base.UpdatePursue();
        }

        protected override void UpdateAttack()
        {
            if (stateTimer <= 0f && player)
            {
                // 衝撞：沿前方直線位移 10m
                transform.position += transform.forward * 10f * Time.deltaTime;
            }
        }
    }
}
