// 元素競技場 — Canvas 2D 可玩 Demo（無外部依賴）
// 元素反應：融穿(冰+火) / 過載(火+雷) / 超導(冰+雷)
// 操作：WASD 移動 / Space 衝刺 / 左鍵普攻 / 1 2 3 切元素 / E 戰技 / Q 絕招 / F 切隊友

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);

// ---- 常數 ----
const EL = { FIRE:'fire', ICE:'ice', THUNDER:'thunder' };
const EL_COLOR = { fire:'#D64E2B', ice:'#6FC7E8', thunder:'#8A5BE0' };
const EL_NAME = { fire:'火', ice:'冰', thunder:'雷' };
const REACT = { MELT:'融穿', OVERLOAD:'過載', SUPERCONDUCT:'超導', RESONANCE:'強化' };
const ARENA_OUT = 340; // 世界半徑
const KILL_GOAL = 6;

// ---- 玩家 ----
const player = {
  x: 0, y: 0, r: 14,
  hp: 500, maxHp: 500,
  speed: 220, face: 0,
  atk: 60, crit: 0.2, level: 10,
  element: EL.FIRE,          // 當前武器元素 1/2/3
  teammates: [EL.ICE, EL.THUNDER, EL.FIRE], // slot 4/5/6 for switch
  teammateIndex: -1,         // -1 = Rein
  energy: 0, energyMax: 100,
  dashCD: 0, dashIFrames: 0,
  attackCD: 0, combo: 0, comboWindow: 0,
  skillCD: 0, burstCD: 0,
  vx: 0, vy: 0,
};

// ---- 敵人 ----
const enemies = [];
const E_TYPES = [
  { name:'掠焰狼', color:'#C97A35', hp: 180, speed:180, radius:14, dmg: 25, range: 40, cd:1.4, behavior:'rush' },
  { name:'巨石守衛', color:'#6E7681', hp: 800, speed: 60, radius:22, dmg: 40, range: 50, cd: 2.0, behavior:'tank' },
  { name:'火語術士', color:'#D64E2B', hp: 220, speed: 80, radius:14, dmg: 30, range: 220, cd:2.0, behavior:'caster', projectile:'fire' },
  { name:'冰霜射手', color:'#9CD8F0', hp: 200, speed: 130, radius:14, dmg: 28, range: 240, cd:1.6, behavior:'archer', projectile:'ice' },
  { name:'雷角巨獸', color:'#5B4F8E', hp: 950, speed: 100, radius:28, dmg: 55, range: 60, cd: 2.4, behavior:'charger' },
];

// ---- 世界狀態 ----
let gameTime = 0, kills = 0, gameOver = false, gameResult = '';
let projectiles = [], effects = [], damageTexts = [], spawnTimer = 0;
const keys = {};

// ---- 工具 ----
function dist(a, b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function rand(a, b){ return a + Math.random() * (b-a); }
function rndType(){ return E_TYPES[Math.floor(Math.random()*E_TYPES.length)]; }
function hud(id, txt){ document.getElementById(id).textContent = txt; }
function showLog(msg, big){
  const log = document.getElementById('log');
  log.innerHTML = big ? `<span class="big">${msg}</span>` : msg;
  clearTimeout(showLog._t);
  showLog._t = setTimeout(() => log.innerHTML = '', 2500);
}

// ---- 元素反應 ----
function detectReaction(aura, incoming){
  if (!aura || aura === incoming) return aura === incoming ? 'RESONANCE' : null;
  if (aura === 'ice' && incoming === 'fire') return 'MELT';
  if (aura === 'fire' && incoming === 'thunder') return 'OVERLOAD';
  if (aura === 'ice' && incoming === 'thunder') return 'SUPERCONDUCT';
  return null;
}
const REACT_MULT = { MELT:1.8, OVERLOAD:1.5, SUPERCONDUCT:1.3, RESONANCE:1.3 };

// ---- 敵人生成 ----
function spawnEnemy(){
  const t = rndType();
  const ang = Math.random() * Math.PI * 2;
  const dist = rand(200, ARENA_OUT - 20);
  enemies.push({
    type: t, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
    r: t.radius, hp: t.hp, maxHp: t.hp,
    attackCD: 0, behavior: t.behavior, aura: null, auraT: 0,
    defenseReduction: 0, vignette: 0,
    vx: 0, vy: 0, state: 'idle', stateT: 0, faces: 0,
  });
}

// ---- 玩家攻擊 ----
function playerAttack(){
  if (player.attackCD > 0) return;
  player.attackCD = 0.25;
  player.combo = (player.combo + 1) % 3;
  player.comboWindow = 0.6;
  const mult = [0.8, 0.9, 1.4][player.combo];
  const range = 55;
  const arc = Math.PI / 2;
  let hit = false;
  for (const e of enemies){
    if (e.hp <= 0) continue;
    const d = dist(player, e);
    if (d < range + e.r){
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      let da = ang - player.face;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < arc / 2){
        dealDamage(e, player.atk, player.element, mult, e.aura);
        hit = true;
      }
    }
  }
  effects.push({ type:'slash', x:player.x, y:player.y, face:player.face, color:EL_COLOR[player.element], life:0.15, max:0.15, angle: Math.PI/3 });
  if (hit) player.energy = Math.min(player.energyMax, player.energy + 10);
}

// ---- 元素戰技 (E) ----
function elementSkill(){
  if (player.skillCD > 0) return;
  player.skillCD = 8;
  const el = player.element;
  if (el === 'fire'){
    // 突進斬：向前位移 + 範圍傷害
    player.x += Math.cos(player.face) * 120;
    player.y += Math.sin(player.face) * 120;
    enemies.forEach(e => { if (e.hp>0 && dist(player,e) < 80) dealDamage(e, player.atk * 1.5, 'fire', 1, e.aura); });
    effects.push({ type:'burst', x:player.x, y:player.y, color:EL_COLOR[el], life:0.4, max:0.4 });
  } else if (el === 'ice'){
    // 冰錐：前方扇形
    enemies.forEach(e => {
      if (e.hp <= 0) return;
      if (dist(player, e) < 200){
        const ang = Math.atan2(e.y-player.y, e.x-player.x);
        let da = ang - player.face; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < Math.PI / 4) dealDamage(e, player.atk * 1.2, 'ice', 1, e.aura);
      }
    });
    effects.push({ type:'cone', x:player.x, y:player.y, face:player.face, color:EL_COLOR[el], life:0.5, max:0.5 });
  } else {
    // 連鎖閃電：全部敵人 + 擴散
    const center = { x:player.x, y:player.y };
    enemies.forEach(e => { if (e.hp>0 && dist(center,e) < 300) dealDamage(e, player.atk, 'thunder', 1, e.aura); });
    effects.push({ type:'lightning', x:player.x, y:player.y, color:EL_COLOR[el], life:0.3, max:0.3 });
  }
  player.energy = Math.min(player.energyMax, player.energy + 15);
}

// ---- 絕招 (Q) ----
function playerBurst(){
  if (player.burstCD > 0 || player.energy < player.energyMax) return;
  player.burstCD = 30; player.energy = 0;
  // 三相合一斬：大量全場傷害 + 同時上三種元素（依序觸發反應）
  enemies.forEach(e => {
    if (e.hp <= 0) return;
    dealDamage(e, player.atk * 2.5, 'fire', 1, e.aura);
    dealDamage(e, player.atk * 2.5, 'ice', 1, e.aura);
    dealDamage(e, player.atk * 2.5, 'thunder', 1, e.aura);
  });
  showLog('『三相合一斬』!', true);
  effects.push({ type:'burst', x:player.x, y:player.y, color:'#FFE0B2', life:0.6, max:0.6 });
}

// ---- 切換隊友 (F) ----
function switchTeammate(){
  // 簡化：切換當前武器元素 + 顏色提示
  player.teammateIndex = (player.teammateIndex + 1) % player.teammates.length;
  const el = player.teammates[player.teammateIndex];
  player.element = el;
  showLog(`切換至 ${EL_NAME[el]} 形態`);
  updateElementUI();
}

// ---- 傷害結算 ----
function dealDamage(target, atk, element, skillMult, targetAura){
  if (target.hp <= 0) return;
  const reaction = detectReaction(targetAura, element);
  const rm = reaction ? REACT_MULT[reaction] : 1;
  const crit = Math.random() < player.crit;
  const cm = crit ? 1.5 : 1;
  const defr = 1 - (100 / (100 + 10 + target.level || 0));
  const dmg = atk * skillMult * rm * cm * (1 - (target.defenseReduction || 0)) * (1 - 0.1);

  target.hp -= dmg;
  target.aura = element;
  target.auraT = 5;

  if (reaction){
    if (reaction === 'SUPERCONDUCT') target.defenseReduction = 0.4;
    showLog(`${EL_NAME[element]} ⇄ ${targetAura ? EL_NAME[targetAura] : ''} ⇒ ${reaction}`, true);
  }

  damageTexts.push({
    text: Math.round(dmg), x: target.x + rand(-8,8), y: target.y - target.r,
    color: crit ? '#ffd700' : '#ffffff', life: 1.0,
  });
  if (target.hp <= 0){
    kills++;
    effects.push({ type:'burst', x:target.x, y:target.y, color:EL_COLOR[element], life:0.5, max:0.5 });
    if (kills >= KILL_GOAL && !gameOver) endGame(true);
  }
}

// ---- 敵人 update ----
function updateEnemies(dt){
  for (const e of enemies){
    if (e.hp <= 0) continue;
    e.attackCD -= dt;
    if (e.auraT > 0){ e.auraT -= dt; if (e.auraT <= 0) e.aura = null; }

    const d = dist(player, e);
    const t = e.type;
    const facing = Math.atan2(player.y - e.y, player.x - e.x);

    if (e.behavior === 'tank') {
      // 緩慢接近
      if (d > t.range){ e.x += Math.cos(facing) * t.speed * dt; e.y += Math.sin(facing) * t.speed * dt; }
      else if (e.attackCD <= 0){ e.attackCD = t.cd; hitPlayer(t.dmg); }
    } else if (e.behavior === 'rush') {
      // 高速度突進
      if (d > t.range){ e.x += Math.cos(facing) * t.speed * dt; e.y += Math.sin(facing) * t.speed * dt; }
      else if (e.attackCD <= 0){ e.attackCD = t.cd; hitPlayer(t.dmg); }
    } else if (e.behavior === 'caster' || e.behavior === 'archer') {
      // 保持距離
      if (d < 120){ e.x -= Math.cos(facing) * t.speed * dt; e.y -= Math.sin(facing) * Math.Speed * dt; }
      else if (d > 200){ e.x += Math.cos(facing) * t.speed * dt; e.y += Math.sin(facing) * t.speed * dt; }
      if (e.attackCD <= 0 && d < t.range){
        e.attackCD = t.cd;
        projectiles.push({
          x: e.x, y: e.y, dx: Math.cos(facing), dy: Math.sin(facing),
          spd: 250, r: 5, life: 3, color: EL_COLOR[t.projectile],
          type: t.projectile, dmg: t.dmg,
        });
      }
    } else if (e.behavior === 'charger') {
      // 蓄力後衝撞
      if (e.state === 'charging'){
        e.stateT -= dt;
        if (e.stateT <= 0){
          e.state = 'charging_go'; e.stateT = 0.5;
          e.vx = Math.cos(facing) * 400; e.vy = Math.sin(facing) * 400;
        }
      } else if (e.state === 'charging_go'){
        e.stateT -= dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.stateT <= 0) e.state = 'idle';
        if (d < e.r + player.r) hitPlayer(t.dmg);
      } else if (d < t.range + 20 && e.attackCD <= 0){
        e.attackCD = t.cd; e.state = 'charging'; e.stateT = 1.0;
      }
    }
  }

  // projectiles
  for (const p of projectiles){
    p.x += p.dx * p.spd * dt;
    p.y += p.dy * p.spd * dt;
    p.life -= dt;
    if (dist(player, p) < p.r + player.r && player.dashIFrames <= 0){
      hitPlayer(p.dmg);
      p.life = 0;
    }
  }
  projectiles = projectiles.filter(p => p.life > 0);
}

function hitPlayer(dmg){
  if (player.dashIFrames > 0) return;
  player.hp -= dmg;
  showLog(`受到 ${Math.round(dmg)} 點傷害！`);
  if (player.hp <= 0 && !gameOver) endGame(false);
}

// ---- 玩家 update ----
function updatePlayer(dt){
  player.attackCD -= dt; player.skillCD -= dt; player.burstCD -= dt;
  player.dashCD -= dt; player.dashIFrames -= dt;
  if (player.comboWindow > 0){ player.comboWindow -= dt; if (player.comboWindow <= 0) player.combo = 0; }

  // 移動
  let mx = 0, my = 0;
  if (keys['KeyW']) my -= 1;
  if (keys['KeyS']) my += 1;
  if (keys['KeyA']) mx -= 1;
  if (keys['KeyD']) mx += 1;
  if (mx || my){
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    player.x += mx * player.speed * dt;
    player.y += my * player.speed * dt;
    player.face = Math.atan2(my, mx);
  }
  // 競技場邊界（圓形）
  const distFromCenter = Math.hypot(player.x, player.y);
  if (distFromCenter > ARENA_OUT - player.r){
    const ang = Math.atan2(player.y, player.x);
    player.x = Math.cos(ang) * (ARENA_OUT - player.r);
    player.y = Math.sin(ang) * (ARENA_OUT - player.r);
  }
}

// ---- 視覺效果 ----
function updateEffects(dt){
  effects.forEach(e => { e.life -= dt; });
  effects = effects.filter(e => e.life > 0);
  damageTexts.forEach(t => { t.life -= dt; t.y -= dt * 30; });
  damageTexts = damageTexts.filter(t => t.life > 0);
}

// ---- 繪製 ----
function drawArena(){
  const cx = W / 2, cy = H / 2;
  // 地面
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, ARENA_OUT * 1.2);
  grd.addColorStop(0, '#1a2236'); grd.addColorStop(1, '#0a0d18');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(cx, cy, ARENA_OUT, 0, Math.PI * 2); ctx.fill();
  // 元素裂縫
  for (let i = 0; i < 3; i++){
    ctx.strokeStyle = [EL_COLOR.fire, EL_COLOR.ice, EL_COLOR.thunder][i];
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, ARENA_OUT * (0.5 + i * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function toScreen(x, y){ return { x: W/2 + (x - player.x), y: H/2 + (y - player.y) }; }

function drawPlayer(){
  const s = toScreen(player.x, player.y);
  // 陰影
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(s.x, s.y + player.r + 2, player.r * 1.1, player.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  // 身體
  ctx.fillStyle = '#4A5A73';
  ctx.beginPath(); ctx.arc(s.x, s.y, player.r, 0, Math.PI * 2); ctx.fill();
  // 元素光環
  ctx.strokeStyle = EL_COLOR[player.element];
  ctx.lineWidth = 3; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(s.x, s.y, player.r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  // 方向線
  ctx.strokeStyle = EL_COLOR[player.element]; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(player.face) * 22, s.y + Math.sin(player.face) * 22); ctx.stroke();
}

function drawEnemies(){
  for (const e of enemies){
    if (e.hp <= 0) continue;
    const s = toScreen(e.x, e.y);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + e.r + 1, e.r, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    // 身體
    ctx.fillStyle = e.type.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, e.r, 0, Math.PI * 2); ctx.fill();
    // 元素附著顯示
    if (e.aura){
      ctx.strokeStyle = EL_COLOR[e.aura]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, e.r + 3, 0, Math.PI * 2); ctx.stroke();
    }
    // 血條
    ctx.fillStyle = '#333'; ctx.fillRect(s.x - e.r, s.y - e.r - 6, e.r * 2, 3);
    ctx.fillStyle = '#e14b4b'; ctx.fillRect(s.x - e.r, s.y - e.r - 6, e.r * 2 * (e.hp / e.maxHp), 3);
  }
}

function drawProjectiles(){
  projectiles.forEach(p => {
    const s = toScreen(p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
}

function drawEffects(){
  for (const ef of effects){
    const t = ef.life / ef.max;
    ctx.globalAlpha = t;
    if (ef.type === 'slash'){
      const s = toScreen(ef.x, ef.y);
      ctx.strokeStyle = ef.color; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 30 + 10 * (1-t), ef.face - ef.angle, ef.face + ef.angle);
      ctx.stroke();
    } else if (ef.type === 'burst' || ef.type === 'cone'){
      const s = toScreen(ef.x, ef.y);
      ctx.strokeStyle = ef.color; ctx.lineWidth = 2;
      const maxR = ef.type === 'burst' ? 90 * (1 - t) : 80;
      ctx.beginPath(); ctx.arc(s.x, s.y, maxR, 0, Math.PI * 2); ctx.stroke();
    } else if (ef.type === 'lightning'){
      const s = toScreen(ef.x, ef.y);
      ctx.strokeStyle = ef.color; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++){
        const a = Math.random() * Math.PI * 2, len = rand(30, 80) * (1 - t);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * len, s.y + Math.sin(a) * len); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawDamageTexts(){
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  damageTexts.forEach(t => {
    const s = toScreen(t.x, t.y);
    ctx.fillStyle = `rgba(255,255,255,${t.life})`;
    ctx.fillText(t.text, s.x, s.y);
  });
}

// ---- 主循環 ----
let lastTime = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!gameOver){
    updatePlayer(dt); updateEnemies(dt); updateEffects(dt);
    spawnTimer -= dt;
    if (spawnTimer <= 0 && enemies.filter(e=>e.hp>0).length < 3 && kills < KILL_GOAL){ spawnEnemy(); spawnTimer = 2.5; }
    gameTime += dt;
  }
  // draw
  ctx.clearRect(0, 0, W, H);
  drawArena(); drawEnemies(); drawProjectiles(); drawPlayer(); drawEffects(); drawDamageTexts();
  // HUD
  hud('hp', document.getElementById('hp')); document.getElementById('hp').style.width = (player.hp / player.maxHp * 100) + '%';
  document.querySelector('#energy .fill').style.width = (player.energy / player.energyMax * 100) + '%';
  hud('kills', kills); hud('killGoal', KILL_GOAL);
  updateElementUI();
  // 最近的敵人資訊
  const alive = enemies.filter(e => e.hp > 0);
  if (alive.length){
    const near = alive.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
    document.getElementById('ehp').style.width = (near.hp / near.maxHp * 100) + '%';
    hud('ename', near.type.name);
    hud('aura', near.aura ? EL_NAME[near.aura] : '無');
  } else { hud('ename', '無敵人'); hud('aura', '無'); document.getElementById('ehp').style.width = '0%'; }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function updateElementUI(){
  document.querySelectorAll('.element-pill').forEach(p => {
    const v = p.dataset.el;
    p.classList.toggle('active', v === player.element || (v === 'f' + (player.teammateIndex + 1) && player.teammateIndex >= 0));
  });
}

// ---- 操作 ----
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (gameOver) return;
  if (e.code === 'Digit1') { player.element = EL.FIRE; showLog('元素 → 火'); }
  if (e.code === 'Digit2') { player.element = EL.ICE; showLog('元素 → 冰'); }
  if (e.code === 'Digit3') { player.element = EL.THUNDER; showLog('元素 → 雷'); }
  if (e.code === 'KeyE') elementSkill();
  if (e.code === 'KeyQ') playerBurst();
  if (e.code === 'KeyF') switchTeammate();
  if (e.code === 'Space' && player.dashCD <= 0){
    player.dashIFrames = 0.3; player.dashCD = 0.8;
    player.x += Math.cos(player.face) * 100; player.y += Math.sin(player.face) * 100;
    effects.push({ type:'burst', x:player.x, y:player.y, color:'#FFFFFF', life:0.15, max:0.15 });
  }
});
document.addEventListener('keyup', e => keys[e.code] = false);
canvas.addEventListener('mousedown', e => { if (e.button === 0) playerAttack(); });
canvas.addEventListener('mousemove', e => { });

// 初始 3 隻
spawnEnemy(); spawnEnemy(); spawnEnemy();
showLog('消滅 6 隻敵人！使用 1/2/3 切換元素，E 戰技，Q 絕招');

function endGame(win){
  gameOver = true; gameResult = win ? '勝利！' : '戰敗…';
  document.getElementById('resultTitle').textContent = win ? '勝利！' : '戰敗…';
  document.getElementById('result').style.display = 'flex';
}
