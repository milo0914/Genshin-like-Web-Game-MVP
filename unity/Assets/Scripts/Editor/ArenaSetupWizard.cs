#if UNITY_EDITOR
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Arena.Combat;
using Arena.Enemies;

/// <summary>
/// M4-A: 一鍵生成可玩的 Arena_ThreePhase 場景。
/// 執行方法：Unity 選單 → "Arena" → "Generate Arena Scene & Build Settings"
/// 完成後開啟 Assets/Scenes/Arena_ThreePhase.unity，直接 Play 即可玩。
/// </summary>
public static class ArenaSetupWizard
{
    [MenuItem("Arena/Generate Arena Scene & Build Settings")]
    public static void Generate()
    {
        EnsureTagsAndLayers();

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        scene.name = "Arena_ThreePhase";

        // 1. 場景
        CreateArenaGround();
        CreatePillars();
        CreateElementalCracks();
        CreateLightsAndSky();
        CreateBoundary();

        // 2. 玩家 + PartyManager
        GameObject player = CreatePlayer();

        // 3. 敵人 spawn 點
        CreateSpawner();

        // 4. HUD
        CreateHUD();

        // 5. 攝影機
        CreateCameraRig(player.transform);

        // 6. WebGL 設定
        SetupWebGLBuild();

        // 7. 存檔
        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Arena_ThreePhase.unity");

        // 8. 嘗試自動替換真實資產
        TryAutoImportAssets();

        Debug.Log("[Arena] Arena_ThreePhase 場景已生成! Play 測試或 Build WebGL。");
    }

    static void TryAutoImportAssets()
    {
        // 引導使用者去下載 Asset Store 資產
        if (EditorUtility.DisplayDialog("Auto Import Assets?",
            "要自動下載免費資產嗎（YBot + RPG Monster Wave 2）？\n\n需網路連線 + Unity Editor 已登入。", "下載", "略過"))
        {
            Application.OpenURL("https://assetstore.unity.com/packages/3d/characters/ybot-character-194969");
            Application.OpenURL("https://assetstore.unity.com/packages/3d/characters/creatures/rpg-monster-wave-2-polyart-249251");
            Application.OpenURL("https://assetstore.unity.com/packages/3d/animations/mixamo-starter-animations-170272");
            Debug.Log("[Arena] 請等待資產下載完成後，執行 Arena > Replace Placeholders with Real Assets");
        }
    }

    static void EnsureTagsAndLayers()
    {
        // Player tag 必須存在
        if (!InternalEditorUtility.tags.Contains("Player"))
        {
            InternalEditorUtility.AddTag("Player");
        }
    }

    static void CreateArenaGround()
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        g.name = "ArenaGround";
        g.transform.position = Vector3.zero;
        g.transform.localScale = new Vector3(30f, 0.2f, 30f); // 30m 半徑
        var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.SetColor("_BaseColor", new Color(0.15f, 0.18f, 0.26f));
        g.GetComponent<Renderer>().sharedMaterial = mat;
    }

    static void CreatePillars()
    {
        for (int i = 0; i < 8; i++)
        {
            float ang = i * Mathf.PI * 2f / 8f;
            Vector3 p = new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * 22f;
            var pillar = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pillar.name = $"Pillar_{i}";
            pillar.transform.position = p + Vector3.up * 3f;
            pillar.transform.localScale = new Vector3(1.5f, 3f, 1.5f);
        }
    }

    static void CreateElementalCracks()
    {
        // 三條發光裂縫（火 / 冰 / 雷）
        for (int i = 0; i < 3; i++)
        {
            float ang = (i * 2f + 0.5f) * Mathf.PI * 2f / 3f;
            var crack = GameObject.CreatePrimitive(PrimitiveType.Plane);
            crack.name = $"Crack_{i}";
            crack.transform.position = new Vector3(Mathf.Cos(ang), 0.03f, Mathf.Sin(ang)) * 8f;
            crack.transform.localScale = new Vector3(3f, 1f, 0.6f);
            var m = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            Color[] colors = { new Color(0.84f, 0.31f, 0.17f), new Color(0.44f, 0.78f, 0.91f), new Color(0.54f, 0.36f, 0.88f) };
            m.SetColor("_BaseColor", colors[i] * 0.7f + Color.white * 0.3f);
            crack.GetComponent<Renderer>().sharedMaterial = m;
        }
    }

    static void CreateLightsAndSky()
    {
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 1.6f;
        sun.color = new Color(1f, 0.85f, 0.65f);
        sun.transform.rotation = Quaternion.Euler(45f, 30f, 0f);
        RenderSettings.ambientLight = new Color(0.35f, 0.42f, 0.6f);
    }

    static void CreateBoundary()
    {
        // 不可見的圓形邊界 collider（簡化用 box 圍起來）
        var b = GameObject.CreatePrimitive(PrimitiveType.Cube);
        b.name = "Boundary";
        b.transform.localScale = new Vector3(80f, 5f, 80f);
        DestroyColliderVisible(b);
    }

    static void DestroyColliderVisible(GameObject g)
    {
        var mr = g.GetComponent<MeshRenderer>(); if (mr) Object.DestroyImmediate(mr);
        var mf = g.GetComponent<MeshFilter>(); if (mf) Object.DestroyImmediate(mf);
    }

    static GameObject CreatePlayer()
    {
        var go = new GameObject("Player");
        go.tag = "Player";
        var cc = go.AddComponent<CharacterController>();
        cc.radius = 0.5f; cc.height = 1.8f; cc.center = new Vector3(0, 0.9f, 0);

        var pm = go.AddComponent<PartyManager>();
        var pcc = go.AddComponent<PlayerCharacterController>();

        // 建立 4 個成員 prefab（用 capsule + 各自顏色）
        pm.slots = new PartyManager.PartySlot[4];
        Color[] colors = { new Color(0.29f, 0.35f, 0.45f), new Color(0.84f, 0.31f, 0.17f), new Color(0.44f, 0.78f, 0.91f), new Color(0.54f, 0.36f, 0.88f) };
        string[] names = { "Rein", "Ember", "Frost", "Thunder" };
        for (int i = 0; i < 4; i++)
        {
            var memberPrefab = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            memberPrefab.name = names[i];
            var r = memberPrefab.GetComponent<Renderer>();
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.SetColor("_BaseColor", colors[i]);
            r.sharedMaterial = mat;
            memberPrefab.AddComponent<RuntimePartyMember>();
            var active = i == 0;
            memberPrefab.SetActive(active);

            pm.slots[i] = new PartyManager.PartySlot {
                displayName = names[i],
                characterPrefab = memberPrefab,
                signatureElement = (Element)(i), // 0=Rein(all), 1=Fire, 2=Ice, 3=Thunder
            };
        }
        return go;
    }

    static void CreateSpawner()
    {
        var g = new GameObject("EnemySpawner");
        g.AddComponent<EnemyGenerator>();
        for (int i = 0; i < 3; i++)
        {
            float ang = i * Mathf.PI * 2f / 3f;
            var spawn = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            spawn.name = $"Spawn_{i}";
            spawn.transform.position = new Vector3(Mathf.Cos(ang), 1f, Mathf.Sin(ang)) * 18f;
            spawn.transform.localScale = Vector3.one * 2f;
            DestroyColliderVisible(spawn);
        }
    }

    static void CreateHUD()
    {
        var canvas = new GameObject("HUD");
        canvas.AddComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.AddComponent<UnityEngine.UI.CanvasScaler>();
        var t = new GameObject("Tip", typeof(UnityEngine.UI.Text));
        t.transform.SetParent(canvas.transform);
        var text = t.GetComponent<UnityEngine.UI.Text>();
        text.text = "WASD 移動 | Space 衝刺 | 左鍵 普攻 | 1/2/3 元素 | E 戰技 | Q 絕招 | F 切換隊友";
        text.alignment = TextAnchor.LowerCenter;
        var rt = t.GetComponent<RectTransform>();
        rt.anchorMin = new Vector2(0, 0); rt.anchorMax = new Vector2(1, 0.1f);
        rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
    }

    static void CreateCameraRig(Transform target)
    {
        var cam = new GameObject("Main Camera");
        cam.tag = "MainCamera";
        cam.AddComponent<Camera>();
        cam.AddComponent<AudioListener>();
        cam.transform.position = new Vector3(0, 8, -10);
        cam.transform.LookAt(target);
        // Cinemachine 需額外安裝範例
    }

    static void SetupWebGLBuild()
    {
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
        PlayerSettings.WebGL.template = "PROJECT:Arena";
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.memorySize = 512;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.FullWithStacktrace;
        PlayerSettings.colorSpace = ColorSpace.Linear;
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.WebGL, ScriptingImplementation.IL2CPP);
        Debug.Log("[Arena] WebGL build settings conditioned");
    }
}
#endif
