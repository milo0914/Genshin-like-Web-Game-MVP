#if UNITY_EDITOR
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;
using Arena.Combat;

/// <summary>
/// 把 ArenaSetupWizard 產生的膠囊體佔位符，一鍵換成真實 Asset Store 模型。
/// 用法：先從 Asset Store 下載 YBot + RPG Monster Wave 2 Polyart → 選單 Arena > Replace Placeholders with Real Assets
/// </summary>
public static class AssetAdapter
{
    private const string YBOT_PATH = "Assets/YBot/YBot.fbx";
    private const string ENEMY_ROOT = "Assets/RPGMonsterWave2Polyart/Prefabs/";

    [MenuItem("Arena/Replace Placeholders with Real Assets")]
    public static void Replace()
    {
        var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
        if (!scene.name.Contains("Arena_ThreePhase"))
        {
            EditorUtility.DisplayDialog("Error", "請先執行 Arena > Generate Arena Scene & Build Settings", "OK");
            return;
        }

        int replaced = 0;
        replaced += ReplacePlayer();
        replaced += ReplaceEnemies();
        Debug.Log($"[AssetAdapter] 替換完成: {replaced} 個模型");
    }

    static int ReplacePlayer()
    {
        var player = GameObject.FindWithTag("Player");
        if (player == null) return 0;

        var ybot = AssetDatabase.LoadAssetAtPath<GameObject>(YBOT_PATH);
        if (ybot == null)
        {
            Debug.LogWarning("[AssetAdapter] YBot 未匯入，請先從 Asset Store 下載");
            return 0;
        }

        var party = player.GetComponent<PartyManager>();
        foreach (var slot in party.slots)
        {
            var inst = slot.instance;
            if (inst == null) continue;
            // 刪除膠囊體，掛上 YBot
            foreach (Transform child in inst.transform.Cast<Transform>().ToList())
            {
                if (child.GetComponent<MeshFilter>() != null || child.GetComponent<MeshRenderer>() != null)
                    Object.DestroyImmediate(child.gameObject);
            }
            var model = Object.Instantiate(ybot, inst.transform);
            model.name = "YBotModel";
            model.transform.localPosition = new Vector3(0, 0.9f, 0);
            model.transform.localScale = Vector3.one * 0.9f;
            // 依元素染色
            var renderers = model.GetComponentsInChildren<Renderer>();
            foreach (var r in renderers)
            {
                var mat = new Material(r.sharedMaterial);
                Color c = slot.signatureElement switch
                {
                    Element.Fire => new Color(0.9f, 0.3f, 0.15f),
                    Element.Ice => new Color(0.4f, 0.8f, 0.95f),
                    Element.Thunder => new Color(0.55f, 0.35f, 0.9f),
                    _ => new Color(0.7f, 0.7f, 0.75f)
                };
                mat.SetColor("_BaseColor", c);
                r.sharedMaterial = mat;
            }
        }
        return 1;
    }

    static int ReplaceEnemies()
    {
        var gen = GameObject.FindObjectOfType<EnemyGenerator>();
        if (gen == null) return 0;

        string[] prefabNames = { "DUO_Leech", "DUO_Rock", "DUO_Ember", "DUO_Freeze", "DUO_Storm" };
        var bases = gen.bases;
        for (int i = 0; i < bases.Length && i < prefabNames.Length; i++)
        {
            var path = ENEMY_ROOT + prefabNames[i] + ".prefab";
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab != null)
            {
                bases[i].prefab = prefab;
                Debug.Log($"[AssetAdapter] {bases[i].kind} -> {prefab.name}");
            }
            else
            {
                Debug.LogWarning($"[AssetAdapter] 找不到 {path}");
            }
        }
        return 1;
    }
}
#endif
