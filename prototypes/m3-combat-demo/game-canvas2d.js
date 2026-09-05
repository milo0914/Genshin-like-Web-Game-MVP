// 元素競技場 v3 — M3 完成版
// 升級：4人隊伍切換 / 元素裂縫連動 / 結晶掉落 / 超導視覺 / 入場爆發

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);

// ---- 資源載入 ----
const IMGS = { hero: new Image(), enemies: [] };
let imgsReady = 0;
const IMG_TOTAL = 6;
function loadAll(){
  IMGS.hero.onload = incr; IMGS.hero.src = 'img/hero.png';
  for (let i = 0; i < 5; i++){
    const im = new Image();
    im.onload = incr; im.src = `img/enemy_${i}.png`;
    IMGS.enemies.push(im);
  }
}
function incr(){ imgsReady++; }
loadAll();

// ---- 常數 ----
const EL = { NONE:'none', FIRE:'fire', ICE:'ice', THUNDER:'thunder' };
const EL_COLOR = { none:'#aaa', fire:'#D64E2B', ice:'#6FC7E8', thunder:'#8A5BE0' };
const EL_NAME  = { none:'無', fire:'火', ice:'冰', thunder:'雷' };
const ARENA_R = 340;
const KILL_GOAL = 6;

// ---- 4人隊伍定義 ----
const PARTY = [
  { name:'黎恩', shortName:'黎恩', element:null, atk:60,  crit:0.2, color:'#66e0b0', desc:'三相劍士' },
  { name:'焰侍', shortName:'焰',   element:'fire',    atk:70,  crit:0.15, color:'#D64E2B', desc:'火元素人偶' },
  { name:'霜衛', shortName:'霜',   element:'ice',     atk:55,  crit:0.25, color:'#6FC7E8', desc:'冰元素人偶' },
  { name:'雷姬', shortName:'雷',   element:'thunder', atk:65,  crit:0.18, color:'#8A5BE0', desc:'雷元素人偶' },
];

// ---- 玩家（當前駕駛員） ----
const player = {
  x:0, y:0, r:22,
  hp:500, maxHp:500,
  speed:220, face:0,
  element:'fire',
  partyIndex:0,          // 當前 slot
  energy:0, energyMax:100,
  dashCD:0, iframes:0,
  attackCD:0, combo:0, comboWindow:0,
  skillCD:0, burstCD:0,
  attackAnimT:0, walkBob:0, moving:false,
  hurtFlash:0,
  switchCD:0,            // 切人冷卻
  switchAnimT:0,         // 入場動畫計時
  prevIndex:0,
  target:null,           // 鎖定目標
  castInterruptCD:0,      // 施法中斷冷卻
};

// ---- 敵人 ----
const enemies = [];
const E_TYPES = [
  { name:'掠焰狼', imgIdx:0, hp:220, speed:180, radius:24, dmg:22, range:50,  cd:1.2, behavior:'rush'    },
  { name:'巨石守衛', imgIdx:1, hp:900, speed:55,  radius:36, dmg:40, range:60,  cd:2.2, behavior:'tank'   },
  { name:'火語術士', imgIdx:2, hp:240, speed:85,  radius:22, dmg:30, range:230, cd:2.2, behavior:'caster', proj:'fire'    },
  { name:'冰霜射手', imgIdx:3, hp:220, speed:135, radius:22, dmg:26, range:250, cd:1.7, behavior:'archer', proj:'ice'     },
  { name:'雷角巨獸', imgIdx:4, hp:1000, speed:105, radius:42, dmg:55, range:70,  cd:2.6, behavior:'charger' },
];

// ---- 全域狀態 ----
let gameTime=0, kills=0, gameOver=false;
let projectiles=[], effects=[], dmgText=[], spawnTimer=0;
let crystals=[];                   // 敵人掉落結晶
let elementalCrackFlash=[0,0,0]; // 三裂縫當前發光計時
const keys={};
let shake=0, shakeMag=0;
let hitStop=0;
let wave=1;                       // 當前波次
let waveKills=0;                   // 本波擊殺數
let waveKillsGoal=KILL_GOAL;       // 本波目標
let waveClearTimer=0;              // 波次間隔計時
let isWaveClear=false;

// ---- 工具函式 ----
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function rand(a,b){ return a+Math.random()*(b-a); }
function hud(id,txt){ document.getElementById(id).textContent=txt; }
function showLog(msg, big){
  const el=document.getElementById('log');
  el.innerHTML = big?`<span class="big">${msg}</span>`:msg;
  clearTimeout(showLog._t);
  showLog._t=setTimeout(()=>el.innerHTML='',2500);
}
function screenShake(mag){ shake=0.18; shakeMag=mag; }
function hitStopDo(t){ hitStop=Math.max(hitStop,t); }

// ---- 反應偵測 ----
function detectReaction(aura, inc){
  if (!aura || aura==='none' || inc==='none') return null;
  if (aura===inc) return 'RESONANCE';
  if (aura==='ice'    && inc==='fire')    return 'MELT';
  if (aura==='fire'   && inc==='thunder') return 'OVERLOAD';
  if (aura==='ice'    && inc==='thunder') return 'SUPERCONDUCT';
  return null;
}
const REACT_MULT = { MELT:1.8, OVERLOAD:1.5, SUPERCONDUCT:1.3, RESONANCE:1.3 };
const REACT_NAME  = { MELT:'融穿', OVERLOAD:'過載', SUPERCONDUCT:'超導', RESONANCE:'共鳴強化' };

// ---- 元素裂縫閃光 ----
function flashCrack(element){
  if (element==='fire')    elementalCrackFlash[0]=1.2;
  if (element==='ice')     elementalCrackFlash[1]=1.2;
  if (element==='thunder')  elementalCrackFlash[2]=1.2;
}

// ---- 敵人生成 ----
function spawnEnemy(){
  const t = E_TYPES[Math.floor(Math.random()*E_TYPES.length)];
  const ang = Math.random()*Math.PI*2, d = rand(200, ARENA_R-30);
  // DNA 隨機外觀（依 enemy-rng-spec.md）
  const hue = Math.random();
  const sat = 0.5 + Math.random()*0.4;  // 0.5~0.9
  const val = 0.4 + Math.random()*0.3;  // 0.4~0.7
  const bodyScale = 0.88 + Math.random()*0.28; // 0.88~1.16（對應Slim~Bulky）
  const baseColor = HSVtoRGB(hue, sat, val);
  enemies.push({
    type:t, x:Math.cos(ang)*d, y:Math.sin(ang)*d,
    r:t.radius, hp:t.hp, maxHp:t.hp,
    attackCD:0, aura:null, auraT:0, defenseReduction:0,
    state:'idle', stateT:0, vx:0, vy:0,
    hurtT:0, walkT:0, teleT:0,
    superconductT:0,
    knockbackT:0, knockbackVX:0, knockbackVY:0,
    // DNA
    dna: { hue, sat, val, bodyScale, baseColor },
  });
}

function HSVtoRGB(h, s, v){
  const i = Math.floor(h*6);
  const f = h*6-i;
  const p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
  switch(i%6){
    case 0: return [v,t,p];
    case 1: return [q,v,p];
    case 2: return [p,v,t];
    case 3: return [p,q,v];
    case 4: return [t,p,v];
    case 5: return [v,p,q];
  }
  return [v,v,v];
}
function rgbStr([r,g,b]){ return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`; }

// ---- 獲取當前角色數值 ----
function currentAtk(){
  const slot = PARTY[player.partyIndex];
  return slot.atk;
}
function currentCrit(){
  return PARTY[player.partyIndex].crit;
}
function currentElement(){
  const slot = PARTY[player.partyIndex];
  // 黎恩（slot 0）可以用 1/2/3 切換元素；元素人偶鎖定元素
  return player.partyIndex===0 ? player.element : slot.element;
}
function currentColor(){
  const slot = PARTY[player.partyIndex];
  return player.partyIndex===0 ? EL_COLOR[player.element] : slot.color;
}

// ---- 玩家攻擊 ----
function playerAttack(){
  if (player.attackCD>0) return;
  player.attackCD=0.32;
  player.attackAnimT=0.28;
  player.combo=(player.combo+1)%3;
  const mult=[0.8,0.9,1.5][player.combo];
  const range=70, arc=Math.PI*0.7;
  const atk=currentAtk(), elem=currentElement(), col=currentColor();
  let hitAny=false;
  for (const e of enemies){
    if (e.hp<=0) continue;
    const d=dist(player,e);
    if (d<range+e.r){
      const ang=Math.atan2(e.y-player.y, e.x-player.x);
      let da=ang-player.face; da=Math.atan2(Math.sin(da),Math.cos(da));
      if (Math.abs(da)<arc/2){
        dealDamage(e, atk, elem, mult);
        hitAny=true;
      }
    }
  }
  effects.push({kind:'slash', x:player.x, y:player.y, face:player.face,
                color:col, life:0.22, max:0.22, combo:player.combo});
  if (hitAny){
    player.energy=Math.min(player.energyMax, player.energy+10);
    screenShake(4); hitStopDo(0.05);
    playTone(180+player.combo*60, 0.05, 'square', 0.05);
  }
}

// ---- 元素戰技 ----
function elementSkill(){
  if (player.skillCD>0) return;
  player.skillCD=8;
  const elem=currentElement();
  const col=currentColor();
  const atk=currentAtk();

  if (elem==='fire'){
    player.x+=Math.cos(player.face)*140;
    player.y+=Math.sin(player.face)*140;
    enemies.forEach(e=>{ if (e.hp>0 && dist(player,e)<90) dealDamage(e, atk*1.5,'fire',1); });
    effects.push({kind:'dashTrail', x:player.x, y:player.y, face:player.face, color:col, life:0.4, max:0.4});
    playTone(90, 0.2, 'sawtooth', 0.15);
    screenShake(8);
  } else if (elem==='ice'){
    enemies.forEach(e=>{
      if (e.hp<=0) return;
      if (dist(player,e)<220){
        const ang=Math.atan2(e.y-player.y, e.x-player.x);
        let da=ang-player.face; da=Math.atan2(Math.sin(da),Math.cos(da));
        if (Math.abs(da)<Math.PI/3) dealDamage(e, atk*1.2,'ice',1);
      }
    });
    effects.push({kind:'iceCone', x:player.x, y:player.y, face:player.face, life:0.5, max:0.5});
    playTone(1200, 0.25, 'triangle', 0.1);
  } else {
    enemies.forEach(e=>{ if (e.hp>0 && dist(player,e)<320) dealDamage(e, atk*0.95,'thunder',1); });
    effects.push({kind:'thunderNova', x:player.x, y:player.y, color:col, life:0.35, max:0.35});
    playTone(2000, 0.15, 'square', 0.12);
    playTone(800, 0.3, 'sawtooth', 0.1);
    screenShake(6);
  }
  player.energy=Math.min(player.energyMax, player.energy+15);
}

// ---- 絕招 ----
function playerBurst(){
  if (player.burstCD>0 || player.energy<player.energyMax) return;
  player.burstCD=30; player.energy=0;
  hitStopDo(0.4); screenShake(18);
  const atk=currentAtk();
  [EL.FIRE, EL.ICE, EL.THUNDER].forEach(elem=>{
    enemies.forEach(e=>{ if (e.hp>0) dealDamage(e, atk*2.2, elem, 1); });
  });
  showLog('『三相合一斬』！', true);
  effects.push({kind:'burstRing', x:player.x, y:player.y, life:0.8, max:0.8});
  playTone(50, 0.7, 'sine', 0.4);
  setTimeout(()=>playTone(120, 0.4, 'sawtooth', 0.3), 100);
}

// ---- 隊伍切換（F鍵） ----
function switchParty(){
  if (player.switchCD>0){
    showLog(`冷卻中… ${Math.ceil(player.switchCD)}s`);
    return;
  }
  player.prevIndex=player.partyIndex;
  player.partyIndex=(player.partyIndex+1)%4;
  player.switchCD=1.5;   // 共用冷卻 1.5s（PRD規格）
  player.switchAnimT=0.4; // 入場動畫 0.4s

  const slot=PARTY[player.partyIndex];
  // 元素人偶鎖定元素，黎恩繼承當前
  if (player.partyIndex!==0 && slot.element){
    player.element=slot.element;
  }

  // 入場爆發特效
  effects.push({kind:'switchBurst', x:player.x, y:player.y,
                color:currentColor(), life:0.4, max:0.4});
  // 入場能量衝擊（範圍傷害）
  const entryDmg=100;
  enemies.forEach(e=>{
    if (e.hp>0 && dist(player,e)<120){
      dealDamage(e, entryDmg, currentElement(), 1);
    }
  });
  showLog(`${slot.name} 入場！(${slot.desc})`);
  playTone(600+player.partyIndex*150, 0.15, 'triangle', 0.1);
}

// ---- 傷害結算 ----
function dealDamage(t, atk, elem, mult){
  if (t.hp<=0) return;
  const react=detectReaction(t.aura, elem);
  const rm=react ? REACT_MULT[react] : 1;
  const crit=Math.random()<currentCrit();
  const cm=crit ? 1.5 : 1;
  const defMult=1-(t.defenseReduction||0);
  const dmg=atk*mult*rm*cm*defMult*0.9;
  t.hp-=dmg;
  t.aura=elem; t.auraT=5;
  t.hurtT=0.15;

  if (react){
    showLog(`${EL_NAME[elem]} ⇄ ${t.aura?EL_NAME[t.aura]:''} ⇒ ${REACT_NAME[react]}`, true);
    flashCrack(elem);

    if (react==='SUPERCONDUCT'){
      t.defenseReduction=0.4;
      t.superconductT=8;
    }
    if (react==='MELT')     hitStopDo(0.08);
    if (react==='OVERLOAD') { hitStopDo(0.10); screenShake(7); }
    if (react==='RESONANCE'){ hitStopDo(0.05); }
  }

  dmgText.push({text:Math.round(dmg), x:t.x+rand(-6,6), y:t.y-t.r-4,
                color:crit?'#ffd700':'#fff', life:0.9, crit});

  // Knockback
  const kbAngle=Math.atan2(t.y-player.y, t.x-player.x);
  t.knockbackVX=Math.cos(kbAngle);
  t.knockbackVY=Math.sin(kbAngle);
  t.knockbackT=0.3;

  for (let i=0;i<6;i++){
    effects.push({kind:'particle', x:t.x, y:t.y,
                   vx:rand(-120,120), vy:rand(-180,-40),
                   color:EL_COLOR[elem]||'#fff', life:0.5, max:0.5, size:rand(2,4)});
  }

  if (t.hp<=0){
    kills++; waveKills++;
    spawnCrystal(t.x, t.y, elem);
    effects.push({kind:'death', x:t.x, y:t.y, color:EL_COLOR[elem]||'#fff', life:0.6, max:0.6, r:t.r});
    screenShake(6); hitStopDo(0.12);
    playTone(80, 0.3, 'sine', 0.3);
    if (player.target===t) player.target=null;
    // 無需在這裡檢查波次勝利，波次邏輯在主循環處理
  }
}

// ---- 結晶掉落 ----
function spawnCrystal(x, y, elem){
  crystals.push({
    x, y, r:10,
    elem: elem||'fire',
    life:6,      // 6秒後消失
    pulseT:0,
  });
}

// ---- 敵人 Update ----
function updateEnemies(dt){
  if (player.castInterruptCD>0) player.castInterruptCD-=dt;

  for (const e of enemies){
    if (e.hp<=0) continue;
    e.attackCD-=dt;
    if (e.auraT>0){ e.auraT-=dt; if (e.auraT<=0) e.aura=null; }
    if (e.superconductT>0){
      e.superconductT-=dt;
      if (e.superconductT<=0){ e.defenseReduction=0; }
    }
    if (e.hurtT>0) e.hurtT-=dt;
    if (e.knockbackT>0){ e.knockbackT-=dt; }
    e.walkT+=dt*6;

    const d=dist(player,e);
    const t=e.type;
    const ang=Math.atan2(player.y-e.y, player.x-e.x);

    if (t.behavior==='tank'){
      if (d>t.range){ e.x+=Math.cos(ang)*t.speed*dt; e.y+=Math.sin(ang)*t.speed*dt; }
      else if (e.attackCD<=0){ e.attackCD=t.cd; e.state='windup'; e.stateT=0.6; }
    } else if (t.behavior==='rush'){
      if (d>t.range){ e.x+=Math.cos(ang)*t.speed*dt; e.y+=Math.sin(ang)*t.speed*dt; }
      else if (e.attackCD<=0){
        e.attackCD=t.cd;
        e.vx=Math.cos(ang)*350; e.vy=Math.sin(ang)*350;
        e.state='lunge'; e.stateT=0.18;
      }
    } else if (t.behavior==='caster' || t.behavior==='archer'){
      if (d<130){ e.x-=Math.cos(ang)*t.speed*dt; e.y-=Math.sin(ang)*t.speed*dt; }
      else if (d>200){ e.x+=Math.cos(ang)*t.speed*dt; e.y+=Math.sin(ang)*t.speed*dt; }
      if (e.attackCD<=0 && d<t.range){
        e.attackCD=t.cd;
        e.state='casting'; e.stateT=0.8;
        projectiles.push({x:e.x, y:e.y, dx:Math.cos(ang), dy:Math.sin(ang),
                          spd:280, r:6, life:3, color:EL_COLOR[t.proj], type:t.proj, dmg:t.dmg});
        playTone(400, 0.1, 'square', 0.06);
      }
    } else if (t.behavior==='charger'){
      if (e.state==='charging'){
        e.stateT-=dt; e.teleT+=dt*10;
        if (e.stateT<=0){ e.state='charge_go'; e.stateT=0.5;
          e.vx=Math.cos(ang)*450; e.vy=Math.sin(ang)*450; }
      } else if (e.state==='charge_go'){
        e.stateT-=dt;
        e.x+=e.vx*dt; e.y+=e.vy*dt;
        if (e.stateT<=0) e.state='idle';
        if (d<e.r+player.r && player.iframes<=0){ hitPlayer(t.dmg); e.state='idle'; }
      } else if (d<t.range+40 && e.attackCD<=0){
        e.attackCD=t.cd; e.state='charging'; e.stateT=1.0; e.teleT=0;
      } else if (d>t.range){
        e.x+=Math.cos(ang)*t.speed*dt; e.y+=Math.sin(ang)*t.speed*dt;
      }
    }

    if (e.state==='windup' || e.state==='casting'){
      e.stateT-=dt;
      if (e.state==='casting' && player.castInterruptCD<=0 && e.stateT>0.2 && e.hurtT>0){
        e.state='idle'; e.attackCD=t.cd*0.5;
        showLog(`⚡ 施法中斷！`);
        playTone(200, 0.15, 'square', 0.1);
        player.castInterruptCD=0.5;
      }
      if (e.stateT<=0){
        const wasCasting=e.state==='casting';
        e.state='idle';
        if (dist(player,e)<t.range*1.2 && player.iframes<=0) hitPlayer(t.dmg);
      }
    }
    if (e.state==='lunge'){
      e.stateT-=dt;
      e.x+=e.vx*dt; e.y+=e.vy*dt;
      if (e.stateT<=0) e.state='idle';
      if (dist(player,e)<e.r+player.r && player.iframes<=0) hitPlayer(t.dmg);
    }

    // Knockback
    if (e.knockbackT>0){
      e.x+=e.knockbackVX*e.knockbackT*dt*8;
      e.y+=e.knockbackVY*e.knockbackT*dt*8;
    }

    const dc=Math.hypot(e.x, e.y);
    if (dc>ARENA_R-e.r){
      const a=Math.atan2(e.y, e.x);
      e.x=Math.cos(a)*(ARENA_R-e.r); e.y=Math.sin(a)*(ARENA_R-e.r);
    }
  }

  for (const p of projectiles){
    p.x+=p.dx*p.spd*dt; p.y+=p.dy*p.spd*dt; p.life-=dt;
    if (dist(player,p)<p.r+player.r && player.iframes<=0){ hitPlayer(p.dmg); p.life=0; }
  }
  projectiles=projectiles.filter(p=>p.life>0);
}

function hitPlayer(dmg){
  player.hp-=dmg; player.hurtFlash=0.25;
  screenShake(5);
  playTone(150, 0.15, 'sawtooth', 0.2);
  if (player.hp<=0 && !gameOver) endGame(false);
}

// ---- 結晶更新 ----
function updateCrystals(dt){
  for (const c of crystals){
    c.life-=dt;
    c.pulseT+=dt;
    if (c.life<=0) continue;
    // 吸引玩家：靠近時吸收
    const d=dist(player, c);
    if (d<50){
      player.energy=Math.min(player.energyMax, player.energy+10);
      showLog(`+10 能量（結晶）`);
      effects.push({kind:'switchBurst', x:c.x, y:c.y, color:EL_COLOR[c.elem]||'#fff', life:0.3, max:0.3});
      playTone(900, 0.1, 'sine', 0.08);
      c.life=0;
    }
  }
  crystals=crystals.filter(c=>c.life>0);
}

// ---- 玩家 Update ----
function updatePlayer(dt){
  player.attackCD-=dt; player.skillCD-=dt; player.burstCD-=dt;
  player.dashCD-=dt; player.iframes-=dt; player.hurtFlash-=dt;
  player.switchCD-=dt; player.switchAnimT-=dt;
  if (player.attackAnimT>0) player.attackAnimT-=dt;
  if (player.comboWindow>0){ player.comboWindow-=dt; if (player.comboWindow<=0) player.combo=0; }

  let mx=0, my=0;
  if (keys['KeyW']) my-=1; if (keys['KeyS']) my+=1;
  if (keys['KeyA']) mx-=1; if (keys['KeyD']) mx+=1;
  player.moving=!!(mx||my);
  if (mx||my){
    const len=Math.hypot(mx,my); mx/=len; my/=len;
    player.x+=mx*player.speed*dt; player.y+=my*player.speed*dt;
    player.face=Math.atan2(my,mx);
    player.walkBob+=dt*10;
  }
  const dc=Math.hypot(player.x, player.y);
  if (dc>ARENA_R-player.r){
    const a=Math.atan2(player.y,player.x);
    player.x=Math.cos(a)*(ARENA_R-player.r);
    player.y=Math.sin(a)*(ARENA_R-player.r);
  }
}

// ---- 特效 Update ----
function updateEffects(dt){
  effects.forEach(e=>{
    e.life-=dt;
    if (e.kind==='particle'){ e.x+=e.vx*dt; e.y+=e.vy*dt; e.vy+=400*dt; }
  });
  effects=effects.filter(e=>e.life>0);
  dmgText.forEach(t=>{ t.life-=dt; t.y-=dt*28; });
  dmgText=dmgText.filter(t=>t.life>0);
  if (shake>0) shake-=dt;

  // 裂縫發光遞減
  elementalCrackFlash[0]=Math.max(0, elementalCrackFlash[0]-dt);
  elementalCrackFlash[1]=Math.max(0, elementalCrackFlash[1]-dt);
  elementalCrackFlash[2]=Math.max(0, elementalCrackFlash[2]-dt);
}

// ---- WebAudio ----
let audioCtx;
function playTone(freq, dur, type='sine', vol=0.1){
  try{
    if (!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}

// ---- 繪製：場景 ----
function toScreen(x,y){
  let sx=W/2+(x-player.x), sy=H/2+(y-player.y);
  if (shake>0){
    sx+=rand(-shakeMag,shakeMag);
    sy+=rand(-shakeMag,shakeMag);
  }
  return {x:sx, y:sy};
}

function drawArena(){
  const cx=W/2, cy=H/2;
  ctx.fillStyle='#0e1322'; ctx.fillRect(0,0,W,H);
  const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,ARENA_R*1.3);
  grd.addColorStop(0,'#2a3550'); grd.addColorStop(1,'#0a0d18');
  ctx.fillStyle=grd;
  ctx.beginPath(); ctx.arc(cx,cy,ARENA_R,0,Math.PI*2); ctx.fill();

  // 元素裂縫 — 三圈，發光時增亮
  const crackDefs=[
    {color:EL_COLOR.fire,    r:90,  idx:0},
    {color:EL_COLOR.ice,     r:180, idx:1},
    {color:EL_COLOR.thunder, r:260, idx:2},
  ];
  crackDefs.forEach(({color, r, idx})=>{
    const flash=elementalCrackFlash[idx];
    const alpha=0.15 + flash*0.6 + 0.08*Math.sin(gameTime*2+idx);
    ctx.strokeStyle=color;
    ctx.globalAlpha=alpha;
    ctx.lineWidth=4+flash*4;
    ctx.shadowColor=color;
    ctx.shadowBlur=10+flash*20;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;
  });

  // 石柱
  for (let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const px=cx+Math.cos(a)*ARENA_R*0.85, py=cy+Math.sin(a)*ARENA_R*0.85;
    ctx.fillStyle='#3a4358';
    ctx.fillRect(px-6,py-18,12,36);
    ctx.fillStyle='#2a3248';
    ctx.fillRect(px-5,py-16,10,32);
  }

  // 競技場邊界警告（玩家靠近邊緣時紅色漸層）
  const playerDist=Math.hypot(player.x, player.y);
  const edgeRatio=playerDist/(ARENA_R-player.r);
  if (edgeRatio>0.7){
    const intensity=(edgeRatio-0.7)/0.3;
    const vignette=ctx.createRadialGradient(cx,cy,ARENA_R*0.6, cx,cy,ARENA_R*1.2);
    vignette.addColorStop(0,'rgba(255,0,0,0)');
    vignette.addColorStop(1,`rgba(200,0,0,${intensity*0.35})`);
    ctx.fillStyle=vignette;
    ctx.fillRect(0,0,W,H);
  }
}

// ---- 繪製：結晶 ----
function drawCrystals(){
  for (const c of crystals){
    if (c.life<=0) continue;
    const s=toScreen(c.x, c.y);
    const pulse=1+0.2*Math.sin(c.pulseT*6);
    const alpha=Math.min(1, c.life/1.5);
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.fillStyle=EL_COLOR[c.elem]||'#fff';
    ctx.shadowColor=EL_COLOR[c.elem]||'#fff';
    ctx.shadowBlur=15*pulse;
    // 菱形結晶
    ctx.translate(s.x, s.y);
    ctx.rotate(gameTime*2);
    ctx.beginPath();
    ctx.moveTo(0, -c.r*pulse);
    ctx.lineTo(c.r*0.6*pulse, 0);
    ctx.lineTo(0, c.r*pulse);
    ctx.lineTo(-c.r*0.6*pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ---- 繪製：玩家 ----
function drawPlayer(){
  const s=toScreen(player.x, player.y);
  ctx.save(); ctx.translate(s.x, s.y);

  // 入場動畫光環
  if (player.switchAnimT>0){
    const t=player.switchAnimT/0.4;
    ctx.strokeStyle=currentColor();
    ctx.lineWidth=3;
    ctx.globalAlpha=t*0.8;
    ctx.shadowColor=currentColor(); ctx.shadowBlur=20;
    ctx.beginPath(); ctx.arc(0,0,50*(1-t)+player.r+20,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }

  // 受擊閃紅
  if (player.hurtFlash>0){
    ctx.fillStyle='rgba(255,80,80,0.4)';
    ctx.beginPath(); ctx.arc(0,0,player.r+8,0,Math.PI*2); ctx.fill();
  }

  // 元素光環
  const col=currentColor();
  ctx.strokeStyle=col; ctx.lineWidth=3;
  ctx.globalAlpha=0.6+0.3*Math.sin(gameTime*5);
  ctx.shadowColor=col; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.arc(0,0,player.r+6,0,Math.PI*2); ctx.stroke();
  ctx.shadowBlur=0; ctx.globalAlpha=1;

  // 角色貼圖
  const img=IMGS.hero;
  if (imgsReady>=IMG_TOTAL && img.complete && img.naturalWidth){
    const size=player.r*2.6;
    const bobY=player.moving ? Math.sin(player.walkBob)*2 : 0;
    const atkAnim=player.attackAnimT>0 ? Math.sin((0.28-player.attackAnimT)/0.28*Math.PI)*6 : 0;
    const flip=Math.cos(player.face)<0 ? -1 : 1;
    ctx.scale(flip,1);
    ctx.drawImage(img, img.naturalWidth*0.25, img.naturalHeight*0.05,
                  img.naturalWidth*0.5, img.naturalHeight*0.5,
                  -size/2, -size/2+bobY+atkAnim*0.4, size, size);
    ctx.scale(flip,1);
  } else {
    // fallback 膠囊
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.fill();
  }

  // 劍氣
  if (player.attackAnimT>0){
    const t=1-player.attackAnimT/0.28;
    ctx.save(); ctx.rotate(player.face);
    ctx.strokeStyle=col; ctx.lineWidth=6; ctx.globalAlpha=1-t;
    ctx.shadowBlur=20; ctx.shadowColor=col;
    ctx.beginPath(); ctx.arc(0,0,30+t*30,-Math.PI/3,Math.PI/3); ctx.stroke();
    ctx.restore();
  }

  // Combo計數（高於1時顯示）
  if (player.combo>0 && player.attackCD<=0.25){
    const comboAlpha=Math.min(1, player.attackCD<=0?1:player.attackCD/0.25);
    ctx.save();
    ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
    ctx.globalAlpha=comboAlpha*0.9;
    ctx.fillStyle='#ffd97e'; ctx.shadowColor='#d64e2b'; ctx.shadowBlur=10;
    ctx.fillText(`×${player.combo+1}`, 0, -player.r-18);
    ctx.restore();
  }

  ctx.restore();
}

// ---- 繪製：敵人 ----
function drawEnemies(){
  for (const e of enemies){
    if (e.hp<=0) continue;
    const s=toScreen(e.x,e.y);
    ctx.save(); ctx.translate(s.x,s.y);

    // 充能提示
    if (e.type.behavior==='charger' && e.state==='charging'){
      ctx.strokeStyle='#ff3b3b'; ctx.lineWidth=2;
      ctx.globalAlpha=0.5+0.5*Math.sin(e.teleT);
      ctx.beginPath(); ctx.arc(0,0,e.r+10,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    }

    // 施法前搖（法師/弓箭手）
    if (e.state==='casting'){
      const progress=1-(e.stateT/0.8);
      ctx.strokeStyle='#fff'; ctx.lineWidth=3;
      ctx.globalAlpha=0.4+0.5*Math.sin(gameTime*12);
      ctx.beginPath(); ctx.arc(0,-e.r-12,8,0,Math.PI*2*progress); ctx.stroke();
      ctx.globalAlpha=1;
    }

    // 超導減防視覺（紫圈）
    if (e.superconductT>0){
      ctx.strokeStyle='#c87fff'; ctx.lineWidth=2;
      ctx.globalAlpha=0.6+0.3*Math.sin(gameTime*10);
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(0,0,e.r+8,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha=1;
    }

    // 受擊閃白
    if (e.hurtT>0){
      ctx.fillStyle='rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(0,0,e.r+4,0,Math.PI*2); ctx.fill();
    }

    const img=IMGS.enemies[e.type.imgIdx];
    const dna=e.dna||{};
    const size=(e.r*2.6)*(dna.bodyScale||1);
    if (imgsReady>=IMG_TOTAL && img && img.complete && img.naturalWidth){
      const bobY=Math.sin(e.walkT)*1.5;
      const facing=(player.x-e.x)>0?1:-1;
      ctx.scale(facing,1);
      // DNA 色彩濾鏡：根據 hue 旋轉色相
      const hueDeg=Math.round((dna.hue||0)*360);
      ctx.filter=`hue-rotate(${hueDeg}deg) saturate(${Math.round((dna.sat||0.7)*100)}%) brightness(${Math.round((dna.val||0.6)*100)}%)`;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
                    -size/2, -size/2+bobY, size, size);
      ctx.filter='none';
      ctx.scale(facing,1);
    } else {
      // fallback：顯示 DNA 基礎色
      ctx.fillStyle=dna.baseColor ? rgbStr(dna.baseColor) : '#888';
      ctx.beginPath(); ctx.arc(0,0,e.r*(dna.bodyScale||1),0,Math.PI*2); ctx.fill();
    }

    // DNA 基礎色光環（敵人自帶外觀光環）
    if (dna.baseColor){
      ctx.strokeStyle=rgbStr(dna.baseColor); ctx.lineWidth=1.5;
      ctx.globalAlpha=0.35+0.15*Math.sin(gameTime*3+(dna.hue||0)*10);
      ctx.shadowColor=rgbStr(dna.baseColor); ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(0,0,e.r+6+Math.sin(gameTime*4)*2,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur=0; ctx.globalAlpha=1;
    }

    // 元素附著光環（疊加在 DNA 光環之上）
    if (e.aura){
      ctx.strokeStyle=EL_COLOR[e.aura]; ctx.lineWidth=2.5;
      ctx.globalAlpha=0.8+0.2*Math.sin(gameTime*8);
      ctx.shadowColor=EL_COLOR[e.aura]; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(0,0,e.r+4+Math.sin(gameTime*8)*2,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur=0; ctx.globalAlpha=1;
    }

    ctx.restore();

    // HP bar（隨敵人大小調整位置）
    const hpBarY = s.y - (e.r*(dna.bodyScale||1)) - 16;
    ctx.fillStyle='#000a'; ctx.fillRect(s.x-22,hpBarY,44,4);
    ctx.fillStyle='#e14b4b'; ctx.fillRect(s.x-22,hpBarY,44*(e.hp/e.maxHp),4);
    ctx.font='11px sans-serif'; ctx.fillStyle='#fff';
    ctx.textAlign='center';
    ctx.fillText(e.type.name, s.x, hpBarY-4);

    // 鎖定目標框
    if (player.target===e){
      ctx.strokeStyle='#ffd97e'; ctx.lineWidth=2;
      ctx.globalAlpha=0.7+0.3*Math.sin(gameTime*6);
      const r=(e.r*(dna.bodyScale||1))+12;
      // 十字準星
      ctx.beginPath();
      ctx.moveTo(s.x-r-6, s.y); ctx.lineTo(s.x-r+4, s.y);
      ctx.moveTo(s.x+r+6, s.y); ctx.lineTo(s.x+r-4, s.y);
      ctx.moveTo(s.x, s.y-r-6); ctx.lineTo(s.x, s.y-r+4);
      ctx.moveTo(s.x, s.y+r+6); ctx.lineTo(s.x, s.y+r-4);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x,s.y,r+6,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    }
  }
}

// ---- 繪製：投射物 ----
function drawProjectiles(){
  projectiles.forEach(p=>{
    const s=toScreen(p.x,p.y);
    ctx.save();
    ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(s.x,s.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ---- 繪製：特效 ----
function drawEffects(){
  for (const ef of effects){
    const t=ef.life/ef.max;
    const s=toScreen(ef.x, ef.y);
    ctx.save(); ctx.translate(s.x, s.y);

    if (ef.kind==='particle'){
      ctx.fillStyle=ef.color; ctx.globalAlpha=t;
      ctx.beginPath(); ctx.arc(0,0,ef.size*t,0,Math.PI*2); ctx.fill();
    } else if (ef.kind==='slash'){
      ctx.rotate(ef.face);
      ctx.strokeStyle=ef.color; ctx.lineWidth=4; ctx.globalAlpha=t;
      ctx.shadowBlur=14; ctx.shadowColor=ef.color;
      ctx.beginPath();
      ctx.arc(0,0,40+(1-t)*30,-Math.PI/3,Math.PI/3); ctx.stroke();
    } else if (ef.kind==='dashTrail'){
      ctx.rotate(ef.face);
      ctx.strokeStyle=ef.color; ctx.lineWidth=3; ctx.globalAlpha=t*0.8;
      for (let i=0;i<3;i++){
        ctx.beginPath(); ctx.moveTo(-40-i*10,-i*6); ctx.lineTo(-80-i*15,-i*3); ctx.stroke();
      }
    } else if (ef.kind==='iceCone'){
      ctx.rotate(ef.face);
      ctx.strokeStyle=EL_COLOR.ice; ctx.lineWidth=3; ctx.globalAlpha=t;
      ctx.shadowBlur=20; ctx.shadowColor=EL_COLOR.ice;
      for (let i=-2;i<=2;i++){
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(130*t,i*30*t); ctx.stroke();
      }
    } else if (ef.kind==='thunderNova'){
      ctx.strokeStyle=ef.color; ctx.lineWidth=3; ctx.globalAlpha=t;
      ctx.shadowBlur=18; ctx.shadowColor=ef.color;
      ctx.beginPath(); ctx.arc(0,0,20+(1-t)*200,0,Math.PI*2); ctx.stroke();
    } else if (ef.kind==='burstRing'){
      ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.globalAlpha=t;
      ctx.shadowBlur=30; ctx.shadowColor='#fff';
      ctx.beginPath(); ctx.arc(0,0,(1-t)*300,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=EL_COLOR.fire; ctx.beginPath(); ctx.arc(0,0,(1-t)*250,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=EL_COLOR.ice;  ctx.beginPath(); ctx.arc(0,0,(1-t)*200,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=EL_COLOR.thunder; ctx.beginPath(); ctx.arc(0,0,(1-t)*150,0,Math.PI*2); ctx.stroke();
    } else if (ef.kind==='death'){
      ctx.strokeStyle=ef.color; ctx.lineWidth=3; ctx.globalAlpha=t;
      ctx.beginPath(); ctx.arc(0,0,ef.r*(2-(t*2)),0,Math.PI*2); ctx.stroke();
    } else if (ef.kind==='switchBurst'){
      ctx.strokeStyle=ef.color; ctx.lineWidth=3; ctx.globalAlpha=t;
      ctx.beginPath(); ctx.arc(0,0,25+(1-t)*50,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }

  dmgText.forEach(t=>{
    const s=toScreen(t.x,t.y);
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle=t.color; ctx.globalAlpha=t.life;
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.strokeText(t.text,s.x,s.y); ctx.fillText(t.text,s.x,s.y);
    ctx.globalAlpha=1;
  });
}

// ---- 主循環 ----
let lastTime=performance.now();
function loop(now){
  let dt=Math.min(0.05,(now-lastTime)/1000);
  if (hitStop>0){ hitStop-=dt; dt*=0.1; }
  lastTime=now;
  if (!gameOver){
    updatePlayer(dt); updateEnemies(dt); updateCrystals(dt); updateEffects(dt);

    // 波次結算
    if (isWaveClear){
      waveClearTimer-=dt;
      if (waveClearTimer<=0){
        wave++;
        waveKills=0;
        waveKillsGoal=KILL_GOAL+wave*2;
        isWaveClear=false;
        player.hp=Math.min(player.maxHp, player.hp+player.maxHp*0.3);
        showLog(`第 ${wave} 波來襲！消滅 ${waveKillsGoal} 隻`, true);
        playTone(400, 0.2, 'square', 0.1);
      }
    } else {
      spawnTimer-=dt;
      const alive=enemies.filter(e=>e.hp>0).length;
      const maxEnemies=Math.min(3+Math.floor(wave/2),6);
      if (spawnTimer<=0 && alive<maxEnemies){
        spawnEnemy(); spawnTimer=Math.max(1.0, 2.5-wave*0.15);
      }
      if (alive===0 && waveKills>=waveKillsGoal){
        isWaveClear=true; waveClearTimer=3;
        showLog(`第 ${wave} 波 Clear！`, true);
        playTone(600, 0.3, 'triangle', 0.15);
        effects.push({kind:'burstRing', x:player.x, y:player.y, life:0.8, max:0.8});
      }
    }
    gameTime+=dt;
  }
  ctx.clearRect(0,0,W,H);
  drawArena(); drawCrystals(); drawEffects(); drawEnemies(); drawProjectiles(); drawPlayer();
  drawHUD();
  requestAnimationFrame(loop);
}

// ---- HUD 繪製（疊加在網頁 HUD 上）----
function drawHUD(){
  document.getElementById('hp').style.width=(Math.max(0,player.hp)/player.maxHp*100)+'%';
  // 能量條（充能完畢時發光）
  const energyFill=document.querySelector('#energy-bar i');
  if (energyFill){
    energyFill.style.width=(player.energy/player.energyMax*100)+'%';
    const isFull=player.energy>=player.energyMax;
    energyFill.style.boxShadow=isFull ? '0 0 12px #ffd97e, 0 0 24px #d64e2b' : 'none';
    energyFill.style.background=isFull
      ? 'linear-gradient(90deg,#ffd97e,#ff9e3b)'
      : 'linear-gradient(90deg,#d64e2b,#6fc7e8,#8a5be0)';
  }
  hud('kills', waveKills); hud('killGoal', waveKillsGoal);
  // 波次顯示
  const waveEl=document.getElementById('waveLabel');
  if (waveEl) waveEl.textContent=`第 ${wave} 波`;
  const waveProgressEl=document.getElementById('waveProgress');
  if (waveProgressEl){
    waveProgressEl.style.width=Math.min(100, waveKills/waveKillsGoal*100)+'%';
  }

  // 角色名稱
  const slot=PARTY[player.partyIndex];
  const nameEl=document.getElementById('charName');
  if (nameEl) nameEl.textContent=`${slot.name} ${slot.shortName}`;
  if (nameEl) nameEl.style.color=currentColor();

  // 元素小球
  document.querySelectorAll('.element-pill').forEach(p=>{
    p.classList.toggle('active', p.dataset.el===player.element);
  });

  // 隊伍槽位
  for (let i=0;i<4;i++){
    const el=document.getElementById(`slot${i}`);
    if (el) el.classList.toggle('active', i===player.partyIndex);
  }

  // 切換冷卻
  const switchCDEl=document.getElementById('switchCD');
  if (switchCDEl){
    switchCDEl.textContent=player.switchCD>0 ? `${Math.ceil(player.switchCD)}s` : '就緒';
    switchCDEl.style.color=player.switchCD>0 ? '#888' : '#66e0b0';
  }

  // 敵人狀態
  const alive=enemies.filter(e=>e.hp>0);
  // 優先顯示鎖定目標，否則顯示最近的
  const displayTarget=player.target && player.target.hp>0
    ? player.target
    : alive.length>0 ? alive.reduce((a,b)=>dist(player,a)<dist(player,b)?a:b) : null;
  if (displayTarget){
    const ehpEl=document.getElementById('ehp');
    if (ehpEl) ehpEl.style.width=(displayTarget.hp/displayTarget.maxHp*100)+'%';
    const lockMark=player.target===displayTarget ? '🔒 ' : '';
    hud('ename', lockMark+displayTarget.type.name);
    hud('aura', displayTarget.aura?EL_NAME[displayTarget.aura]:'無');
    document.querySelectorAll('#superconduct').forEach(el=>{
      if (displayTarget.superconductT>0){
        el.style.display='';
        el.textContent=`⚡ 防禦 -40% (${Math.ceil(displayTarget.superconductT)}s)`;
      } else {
        el.style.display='none';
      }
    });
  } else {
    hud('ename','—'); hud('aura','無');
    const ehpEl=document.getElementById('ehp');
    if (ehpEl) ehpEl.style.width='0%';
    document.querySelectorAll('#superconduct').forEach(el=>el.style.display='none');
  }
}

// ---- 鎖定系統 ----
function lockTarget(){
  const alive=enemies.filter(e=>e.hp>0);
  if (alive.length===0){ player.target=null; showLog('無可鎖定目標'); return; }
  if (!player.target || player.target.hp<=0){
    player.target=alive[0];
  } else {
    const idx=alive.indexOf(player.target);
    player.target=alive[(idx+1)%alive.length];
  }
  showLog(`🔒 鎖定：${player.target.type.name}`);
  playTone(800, 0.08, 'sine', 0.06);
}

// ---- 操作 ----
document.addEventListener('keydown', e=>{
  keys[e.code]=true;
  if (e.code==='Space') e.preventDefault();
  if (gameOver) return;
  if (e.code==='Digit1'){ player.element=EL.FIRE; showLog('元素 → 火'); }
  if (e.code==='Digit2'){ player.element=EL.ICE;  showLog('元素 → 冰'); }
  if (e.code==='Digit3'){ player.element=EL.THUNDER; showLog('元素 → 雷'); }
  if (e.code==='KeyE') elementSkill();
  if (e.code==='KeyQ') playerBurst();
  if (e.code==='KeyF') switchParty();
  if (e.code==='Tab'){ e.preventDefault(); lockTarget(); }
  if (e.code==='Space' && player.dashCD<=0){
    player.iframes=0.3; player.dashCD=0.8;
    player.x+=Math.cos(player.face)*110; player.y+=Math.sin(player.face)*110;
    effects.push({kind:'switchBurst', x:player.x, y:player.y, color:'#fff', life:0.15, max:0.15});
    playTone(80, 0.1, 'sine', 0.08);
  }
});
document.addEventListener('keyup', e=>keys[e.code]=false);

canvas.addEventListener('mousedown', e=>{ if (e.button===0) playerAttack(); });
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// 手機觸控
let touchStart=null;
canvas.addEventListener('touchstart', e=>{
  const t=e.touches[0];
  if (t.clientX<W/2){ touchStart={x:t.clientX, y:t.clientY}; }
  else { playerAttack(); }
});
canvas.addEventListener('touchmove', e=>{
  if (!touchStart) return;
  const t=e.touches[0];
  const dx=t.clientX-touchStart.x, dy=t.clientY-touchStart.y;
  const mag=Math.hypot(dx,dy);
  if (mag>12){
    player.x+=dx/mag*player.speed*0.016;
    player.y+=dy/mag*player.speed*0.016;
    player.face=Math.atan2(dy,dx);
    player.moving=true;
  }
});
canvas.addEventListener('touchend', ()=>{ touchStart=null; player.moving=false; });

// 初始生成
spawnEnemy(); spawnEnemy(); spawnEnemy();
showLog(`第 1 波：消滅 ${waveKillsGoal} 隻！Tab 鎖定 / F 切換角色`, true);

// ---- 結算 ----
function endGame(win){
  gameOver=true;
  document.getElementById('resultTitle').textContent=win?'勝利！':'戰敗…';
  document.getElementById('result').style.display='flex';
  document.getElementById('resultStats').innerHTML=
    `<div style="margin-top:16px;font-size:15px;color:#aaa">到達波次：第 ${wave} 波</div>
     <div style="font-size:13px;color:#888">總擊殺：${kills}</div>`;
  playTone(win?600:150, 1.2, 'triangle', 0.2);
}

requestAnimationFrame(loop);
