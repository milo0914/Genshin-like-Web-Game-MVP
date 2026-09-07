# Rein Character 3D Model — DEPLOYED & VERIFIED ✅

**Live URL**: https://milo0914.github.io/Genshin-like-Web-Game-MVP/rein-glb.html
**Latest Commit**: 098264c
**Verified**: 2026-09-07

---

## ✅ Final Verification (cache-busted)

Top-to-bottom scan at image center (1400×900 viewport):

| y%   | RGB                  | Tag   | Part           |
|------|----------------------|-------|----------------|
| 5%   | (14,19,34)           | BG    | sky            |
| 15%  | (14,19,34)           | BG    | sky            |
| 25%  | (14,19,34)           | BG    | sky            |
| **35%** | **(219,222,224)** | **CHAR** | **head/visor** |
| **45%** | **(119,131,149)** | **CHAR** | **helmet edge** |
| **55%** | **(218,221,223)** | **CHAR** | **torso**      |
| **65%** | **(208,212,215)** | **CHAR** | **waist**      |
| **75%** | **(166,174,183)** | **CHAR** | **thighs**     |
| **85%** | **(161,170,191)** | **CHAR** | **legs**       |
| **95%** | **(25,30,42)**    | **CHAR** | **feet/ground** |

**Character is fully visible from head to feet.**

---

## Final Camera & Scale

```javascript
camera.position.set(0, 2.0, 4.5);
controls.target.set(0, 1.4, 0);
scale = 1.0 / max(bbox) * 2.4;
fog = THREE.Fog(0x0e1322, 15, 40);
FOV = 50;
```

## Status Text from Page

> ✓ 渲染成功 — 49 骨骼 / 4 動畫 / 紋理已剝離 / 73 mesh / 黎恩配色已套用

---

## Specs

- **Meshes**: 73 (2 from Soldier.glb + 71 Rein accessories)
- **Bones**: 49 (full skeleton)
- **Animations**: 4 (Idle, Walk, Run, Attack)
- **Textures**: stripped (solid colors)
- **Color scheme**: coat #7A8B9A, skin #E8C4A0, hair #3D2B1F, metal #A9B0BC, fire #D64E2B, ice #6FC7E8, thunder #8A5BE0
