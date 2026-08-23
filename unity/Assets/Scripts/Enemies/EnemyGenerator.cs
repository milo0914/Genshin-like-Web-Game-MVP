using UnityEngine;
using Arena.Combat;

namespace Arena.Enemies
{
    /// <summary>
    /// 敵人外觀隨機生成器：依 EnemyDNA 組裝基底模型 + 染色 + 配件 + 光環。
    /// 僅影響視覺，不影響數值（數值由基底 + 難度級別算出）。
    /// </summary>
    public class EnemyGenerator : MonoBehaviour
    {
        [System.Serializable]
        public class BasePrefabEntry
        {
            public EnemyBaseKind kind;
            public GameObject prefab;
            public Transform headSocket;
            public Transform backSocket;
            public Transform weaponSocket;
        }

        public enum EnemyBaseKind { EmberProwler, Stoneguard, Embermancer, FrostArcher, Stormhorn }

        [Header("Base Prefabs")]
        public BasePrefabEntry[] bases;

        [Header("Modular Accessories")]
        public GameObject[] headAccessories;
        public GameObject[] backAccessories;
        public GameObject[] weaponVariants;

        [Header("Aura VFX Prefabs (by element)")]
        public GameObject auraFire, auraIce, auraThunder;

        [Header("Generator")]
        public int randomSeed = 0;
        private System.Random rng;

        private void Awake()
        {
            rng = randomSeed == 0 ? new System.Random() : new System.Random(randomSeed);
        }

        public GameObject Spawn(Vector3 position, DifficultyTier tier = DifficultyTier.Normal)
        {
            var dna = GenerateDNA(tier);
            var entry = FindBase(dna.baseType);
            if (entry == null) { Debug.LogWarning("no base prefab for " + dna.baseType); return null; }

            var go = Instantiate(entry.prefab, position, Quaternion.identity);

            // 染色
            Tint(go, dna);

            // 配件
            Attach(entry, go.transform, dna);

            // 光環
            AttachAura(go, dna.element, dna.hasAura);

            // 體型縮放
            float scale = dna.bodySize switch {
                BodySize.Slim => 0.92f,
                BodySize.Bulky => 1.12f,
                _ => 1f
            };
            go.transform.localScale *= scale;

            // 設置屬性（給 EnemyBase）
            var baseBrain = go.GetComponent<EnemyBase>();
            if (baseBrain != null) baseBrain.signatureElement = dna.element;

            return go;
        }

        private BasePrefabEntry FindBase(EnemyBaseKind k)
        {
            foreach (var b in bases) if (b.kind == k) return b;
            return null;
        }

        private EnemyDNA_v2 GenerateDNA(DifficultyTier tier)
        {
            return new EnemyDNA_v2
            {
                baseType = (EnemyBaseKind)rng.Next(bases.Length),
                element = (Element)rng.Next(1, 4), // Fire/Ice/Thunder
                primaryColorHue = (float)rng.NextDouble(),
                secondaryColorHue = (float)rng.NextDouble(),
                headAccessoryIndex = headAccessories.Length == 0 ? -1 : rng.Next(headAccessories.Length),
                backAccessoryIndex = backAccessories.Length == 0 ? -1 : rng.Next(backAccessories.Length),
                weaponVariantIndex = weaponVariants.Length == 0 ? -1 : rng.Next(weaponVariants.Length),
                bodySize = (BodySize)rng.Next(-1, 2),
                hasAura = rng.NextDouble() < 0.35
            };
        }

        private void Tint(GameObject go, EnemyDNA_v2 dna)
        {
            var renderers = go.GetComponentsInChildren<Renderer>();
            Color primary = Color.HSVToRGB(dna.primaryColorHue, 0.6f, 0.5f);
            Color secondary = Color.HSVToRGB(dna.secondaryColorHue, 0.5f, 0.4f);
            foreach (var r in renderers)
            {
                var mat = r.material;            // creates instance — OK for MVP
                if (mat.HasProperty("_BaseColor"))
                {
                    mat.SetColor("_BaseColor", r.name.Contains("Secondary") ? secondary : primary);
                }
            }
        }

        private void Attach(BasePrefabEntry entry, Transform root, EnemyDNA_v2 dna)
        {
            if (dna.headAccessoryIndex >= 0 && entry.headSocket)
                Instantiate(headAccessories[dna.headAccessoryIndex], entry.headSocket);
            if (dna.backAccessoryIndex >= 0 && entry.backSocket)
                Instantiate(backAccessories[dna.backAccessoryIndex], entry.backSocket);
            if (dna.weaponVariantIndex >= 0 && entry.weaponSocket)
                Instantiate(weaponVariants[dna.weaponVariantIndex], entry.weaponSocket);
        }

        private void AttachAura(GameObject go, Element el, bool enabled)
        {
            if (!enabled) return;
            GameObject prefab = el switch {
                Element.Fire => auraFire,
                Element.Ice => auraIce,
                Element.Thunder => auraThunder,
                _ => null
            };
            if (prefab != null) Instantiate(prefab, go.transform);
        }

        public enum DifficultyTier { Easy, Normal, Hard, Boss }

        [System.Serializable]
        public struct EnemyDNA_v2
        {
            public EnemyBaseKind baseType;
            public Element element;
            public float primaryColorHue, secondaryColorHue;
            public int headAccessoryIndex, backAccessoryIndex, weaponVariantIndex;
            public BodySize bodySize;
            public bool hasAura;
        }

        public enum BodySize { Slim = -1, Standard = 0, Bulky = 1 }
    }
}
