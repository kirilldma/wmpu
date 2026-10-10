(() => {
  if (window.__GAMESENSE_SKEET__) {
    try { window.__GAMESENSE_SKEET__.destroy(); } catch (_) {}
  }

  // -------------------------------------------------------------------------
  // 1. RESOLVER & STATE
  // -------------------------------------------------------------------------
  const resolveGame = () => window.game || window.TS?.game || window.__CAUGHT_GAME__;
  
  const state = {
    // Rage
    aimbotEnabled: false, targetHitbox: 'Head', impactForce: 45, fireInterval: 150, autoSever: false,
    killAura: false, autoHeal: false,
    // AA
    antiAimEnabled: false, aaMode: 'Spinbot', aaIntensity: 60,
    // Legit
    walkEnabled: false, walkGodMode: true, noclipEnabled: false, walkSpeed: 60, jumpForce: 45,
    // Visuals
    espEnabled: true, boxEsp: true, skeletonEsp: true, nameEsp: true, flagsEsp: true, healthEsp: false,
    hitmarkers: true, fovCircle: false, watermark: true, indicators: true, crosshair: false,
    thirdPerson: false, camFov: 34,
    // Misc
    infiniteCoins: false, unlockAll: true, zeroGravity: false, freezeWumpus: false,
    zombieMode: false, physgun: false,
    // Network
    mpNickname: 'Player_' + Math.floor(Math.random()*9999),
    // Lua
    luaEditor: `client.log("Hello from Skeet Lua API!");\nclient.set_event_callback("paint", function() {\n  render.text(10, 150, 255, 255, 255, 255, "Skeet Lua API Active");\n});`
  };

  const runtime = {
    customPose: null, lastShot: 0, hitlogs: [], fps: 60, frameCount: 0, lastFpsUpdate: performance.now(),
    renderQueue: [], eventCallbacks: {}, luaCallbacks: {},
    activeTab: 'RAGE', camAngles: { theta: 0, phi: Math.PI/2.5, radius: 10 }, isDraggingCam: false,
    props: [], physgunState: { body: null, dist: 0 },
    network: { peer: null, connections: [], remotePlayers: {}, skeletons: {} }
  };
  
  // Inject PeerJS for Multiplayer
  if (!window.__SK_PEERJS__) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
      document.head.appendChild(s);
      window.__SK_PEERJS__ = true;
  }

  const UI = {
    'RAGE': {
      'Torture-bot': [
        { type: 'checkbox', id: 'aimbotEnabled', label: 'Enabled' },
        { type: 'combobox', id: 'targetHitbox', label: 'Target part', options: ['Head', 'Torso', 'Pelvis', 'Arms', 'Legs', 'Random'] },
        { type: 'slider', id: 'impactForce', label: 'Impact force', min: 1, max: 100, unit: '' },
        { type: 'slider', id: 'fireInterval', label: 'Hit interval', min: 10, max: 1000, unit: 'ms' },
        { type: 'checkbox', id: 'autoSever', label: 'Auto-sever limbs' }
      ],
      'Other': [
        { type: 'checkbox', id: 'killAura', label: 'Kill Aura (Shredder)' },
        { type: 'checkbox', id: 'autoHeal', label: 'Auto-Heal Wumpus' }
      ]
    },
    'AA': {
      'Ragdoll angles': [
        { type: 'checkbox', id: 'antiAimEnabled', label: 'Enabled' },
        { type: 'combobox', id: 'aaMode', label: 'Pitch/Yaw Mode', options: ['Spinbot', 'Helicopter', 'Earthquake', 'Spasm', 'Ascend'] },
        { type: 'slider', id: 'aaIntensity', label: 'Intensity', min: 1, max: 150, unit: '' }
      ]
    },
    'LEGIT': {
      'Movement': [
        { type: 'checkbox', id: 'walkEnabled', label: 'Enable WASD Walk' },
        { type: 'checkbox', id: 'walkGodMode', label: 'Godmode while walking' },
        { type: 'checkbox', id: 'noclipEnabled', label: 'Noclip (Fly Mode)' },
        { type: 'slider', id: 'walkSpeed', label: 'Walk speed', min: 10, max: 200, unit: '' },
        { type: 'slider', id: 'jumpForce', label: 'Jump force', min: 10, max: 150, unit: '' }
      ],
      'Custom Poser': [
        { type: 'button', id: 'btn_idle', label: 'Pose: Idle', onclick: "window.__SK_POSE__('idle')" },
        { type: 'button', id: 'btn_flop', label: 'Pose: Flop', onclick: "window.__SK_POSE__('flop')" },
        { type: 'button', id: 'btn_jerk', label: 'Cheat: Jerk Off 🍆', onclick: "window.__SK_CUSTOM_POSE__('jerk')" },
        { type: 'button', id: 'btn_twerk', label: 'Cheat: Twerk 🍑', onclick: "window.__SK_CUSTOM_POSE__('twerk')" },
        { type: 'button', id: 'btn_stop', label: 'Stop Custom Pose', onclick: "window.__SK_CUSTOM_POSE__(null)" }
      ]
    },
    'VISUALS': {
      'Player ESP': [
        { type: 'checkbox', id: 'espEnabled', label: 'Enabled' },
        { type: 'checkbox', id: 'boxEsp', label: 'Bounding box' },
        { type: 'checkbox', id: 'skeletonEsp', label: 'Skeleton' },
        { type: 'checkbox', id: 'nameEsp', label: 'Name' },
        { type: 'checkbox', id: 'flagsEsp', label: 'Flags' },
        { type: 'checkbox', id: 'healthEsp', label: 'Health Bar (Fake)' }
      ],
      'Other ESP': [
        { type: 'checkbox', id: 'hitmarkers', label: 'Hitmarkers' },
        { type: 'checkbox', id: 'fovCircle', label: 'FOV Circle' },
        { type: 'checkbox', id: 'indicators', label: 'Indicators' },
        { type: 'checkbox', id: 'watermark', label: 'Watermark' },
        { type: 'checkbox', id: 'crosshair', label: 'Crosshair' }
      ],
      'Camera / View': [
        { type: 'checkbox', id: 'thirdPerson', label: '3rd Person (Hold Right Click)' },
        { type: 'slider', id: 'camFov', label: 'Override FOV', min: 10, max: 150, unit: '°' }
      ]
    },
    'MISC': {
      'Game State': [
        { type: 'checkbox', id: 'infiniteCoins', label: 'Infinite coins loop' },
        { type: 'checkbox', id: 'unlockAll', label: 'Auto-unlock tools' },
        { type: 'checkbox', id: 'zeroGravity', label: 'Zero gravity' },
        { type: 'checkbox', id: 'freezeWumpus', label: 'Freeze entities' },
        { type: 'button', id: 'btn_explode', label: 'Insta-Explode Wumpus', onclick: "window.__SK_EXPLODE__()" },
        { type: 'button', id: 'btn_coins', label: 'Add 1000 Coins', onclick: "window.__SK_COINS__()" },
        { type: 'button', id: 'btn_reset', label: 'Reset Wumpus', onclick: "window.__SK_RESET__()" }
      ],
      'Fun / Exploits': [
        { type: 'checkbox', id: 'zombieMode', label: 'Zombie Mode (Crawling)' },
        { type: 'checkbox', id: 'physgun', label: 'Gravity Gun (Hold Middle Click)' }
      ]
    },
    'SANDBOX': {
      'Builder': [
        { type: 'button', id: 'sb_cube', label: 'Spawn Heavy Cube', onclick: "window.__SK_SPAWN_PROP__(2)" },
        { type: 'button', id: 'sb_cube_s', label: 'Spawn Light Cube', onclick: "window.__SK_SPAWN_PROP__(0.5)" },
        { type: 'button', id: 'sb_clear', label: 'Clear All Props', onclick: "window.__SK_CLEAR_PROPS__()" }
      ]
    },
    'NETWORK': {
      'Identity': [
        { type: 'text', id: 'mp_nick_label', label: 'Nickname:' },
        { type: 'button', id: 'net_setnick', label: 'Set Nickname', onclick: "window.__SK_SET_NICK__()" }
      ],
      'Session': [
        { type: 'button', id: 'net_host', label: '📡 Host Lobby (Copy ID)', onclick: "window.__SK_HOST_GAME__()" },
        { type: 'button', id: 'net_join', label: '🔗 Join Lobby (Paste ID)', onclick: "window.__SK_JOIN_GAME__()" },
        { type: 'text', id: 'net_status', label: 'Status: Offline' },
        { type: 'text', id: 'net_lobby', label: 'Players: (none)' }
      ]
    },
    'CHANGES': {
      'Update History': [
        { type: 'custom', id: 'changelogHtml', render: () => {
            return CHANGELOG.map(c => `
              <div style="margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <span style="font-size:11px;font-weight:bold;color:#cdcdcd">${c.ver}</span>
                  ${c.tag ? `<span style="font-size:9px;background:#97b621;color:#000;padding:1px 4px;font-weight:bold">${c.tag}</span>` : ''}
                  <span style="font-size:9px;color:#555;margin-left:auto">${c.date}</span>
                </div>
                ${c.items.map(i => `<div style="font-size:10px;color:#9d9d9d;padding-left:8px;border-left:1px solid ${i.startsWith('✓')?'#37b1da':'#232323'}">${i}</div>`).join('')}
              </div>
            `).join('');
        }}
      ]
    },
    'LUA': {
      'Script Editor': [
        { type: 'textarea', id: 'luaEditor' },
        { type: 'button', id: 'btn_exec', label: 'Execute Script', onclick: "window.__SK_EXEC_LUA__()" },
        { type: 'text', id: 'luaStatus', label: 'Engine Ready. 300+ funcs.' }
      ],
      'Custom Elements': []
    }
  };

  const keys = { w: false, a: false, s: false, d: false, space: false };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.code === 'Space' ? 'space' : e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.code === 'Space' ? 'space' : e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = false;
  });

  // -------------------------------------------------------------------------
  // 2. OVERLAY CANVAS
  // -------------------------------------------------------------------------
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.id = '__skeet_overlay__';
  Object.assign(overlayCanvas.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: '2147483646',
  });
  document.body.appendChild(overlayCanvas);
  const ctx = overlayCanvas.getContext('2d');
  function resizeCanvas() { overlayCanvas.width = window.innerWidth; overlayCanvas.height = window.innerHeight; }
  window.addEventListener('resize', resizeCanvas); resizeCanvas();

  function projectWorldToScreen(pos, cam, g) {
    if (!pos || !cam) return null;
    try {
      const T = g.THREE || window.THREE;
      if (T) {
        const v = new T.Vector3(pos.x, pos.y, pos.z).project(cam);
        if (v.z > 1) return null;
        return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((-v.y + 1) / 2) * window.innerHeight };
      }
    } catch (_) {}
    return null;
  }

  // -------------------------------------------------------------------------
  // 3. LUA API GENERATION (300+ Functions)
  // -------------------------------------------------------------------------
  const LUA = {
      client: {
          log: (msg) => console.log(`%c[gamesense]%c ${msg}`, 'color:#a4cb38;font-weight:bold;', 'color:#fff'),
          color_log: (r,g,b,msg) => console.log(`%c[gamesense] %c${msg}`, `color:rgb(${r},${g},${b});font-weight:bold;`, `color:rgb(${r},${g},${b});`),
          delay_call: (ms, cb) => setTimeout(cb, ms),
          set_event_callback: (evt, cb) => { if (!runtime.eventCallbacks[evt]) runtime.eventCallbacks[evt] = []; runtime.eventCallbacks[evt].push(cb); },
          unset_event_callback: (evt, cb) => { if (runtime.eventCallbacks[evt]) runtime.eventCallbacks[evt] = runtime.eventCallbacks[evt].filter(c => c !== cb); },
          screen_size: () => [window.innerWidth, window.innerHeight],
          system_time: () => new Date().getTime(),
          timestamp: () => performance.now()
      },
      input: {
          key_state: (k) => !!keys[k.toLowerCase()],
          mouse_pos: () => [window.__SK_MOUSE_X || 0, window.__SK_MOUSE_Y || 0],
          is_mouse_down: (btn) => !!window.__SK_MOUSE_BTNS[btn]
      },
      http: {
          get: (url, cb) => fetch(url).then(r=>r.text()).then(cb).catch(e=>cb("error")),
          post: (url, data, cb) => fetch(url, {method:'POST', body:JSON.stringify(data)}).then(r=>r.text()).then(cb).catch(e=>cb("error"))
      },
      math: {
          distance: (x1, y1, x2, y2) => Math.hypot(x2-x1, y2-y1),
          distance3d: (x1,y1,z1, x2,y2,z2) => Math.hypot(x2-x1, y2-y1, z2-z1),
          clamp: (val, min, max) => Math.min(Math.max(val, min), max),
          lerp: (a, b, t) => a + (b - a) * t,
          random_float: (min, max) => Math.random() * (max - min) + min,
          random_int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
      },
      camera: {
          get_pos: () => { const p = resolveGame()?.camera?.position; return p ? [p.x, p.y, p.z] : [0,0,0]; },
          get_rot: () => { const r = resolveGame()?.camera?.rotation; return r ? [r.x, r.y, r.z] : [0,0,0]; },
          get_fov: () => resolveGame()?.camera?.fov || 75,
          set_fov: (fov) => { const c = resolveGame()?.camera; if(c){ c.fov = fov; c.updateProjectionMatrix(); } }
      },
      audio: {
          play: (sound, vol=1) => resolveGame()?.audio?.play(sound, { gain: vol })
      },
      visuals: {
          set_wireframe: (state) => {
              const gameCtx = resolveGame();
              if (gameCtx?.scene) gameCtx.scene.traverse(c => { if(c.isMesh && c.material) c.material.wireframe = !!state; });
          },
          set_wumpus_color: (r,g,b) => {
              const gameCtx = resolveGame();
              if (gameCtx?.scene) gameCtx.scene.traverse(c => {
                  if(c.isMesh && c.material && c.name !== 'ground') {
                      if (c.material.color) c.material.color.setRGB(r/255, g/255, b/255);
                  }
              });
          }
      },
      world: {
          raycast: (x,y,z, dx,dy,dz, dist) => {
              const g = resolveGame();
              if (g?.world && g.RAPIER) {
                  const hit = g.world.castRay(new g.RAPIER.Ray({x,y,z}, {x:dx, y:dy, z:dz}), dist, true);
                  if (hit) return { hit: true, dist: hit.toi, normal: hit.normal };
              }
              return { hit: false };
          },
          set_gravity: (x,y,z) => { const g = resolveGame(); if(g?.world) g.world.gravity = {x,y,z}; }
      },
      globals: {
          realtime: () => performance.now() / 1000,
          frametime: () => 1 / (runtime.fps || 60),
          tickcount: () => runtime.frameCount,
          mapname: () => 'wumpus_torture_chamber',
          maxplayers: () => 1
      },
      render: {
          text: (x,y,r,g,b,a,txt) => { runtime.renderQueue.push({type:'text',x,y,r,g,b,a,txt}); },
          text_size: (txt) => { ctx.font = '11px Tahoma, sans-serif'; return [ctx.measureText(txt).width, 11]; },
          line: (x1,y1,x2,y2,r,g,b,a,w=1) => { runtime.renderQueue.push({type:'line',x1,y1,x2,y2,r,g,b,a,w}); },
          rect: (x,y,w,h,r,g,b,a) => { runtime.renderQueue.push({type:'rect',x,y,w,h,r,g,b,a}); },
          rect_filled: (x,y,w,h,r,g,b,a) => { runtime.renderQueue.push({type:'rectf',x,y,w,h,r,g,b,a}); },
          gradient: (x,y,w,h,r1,g1,b1,a1,r2,g2,b2,a2,vertical=true) => { runtime.renderQueue.push({type:'grad',x,y,w,h,r1,g1,b1,a1,r2,g2,b2,a2,vertical}); },
          circle: (x,y,rad,r,g,b,a) => { runtime.renderQueue.push({type:'circle',x,y,rad,r,g,b,a}); },
          world_to_screen: (x,y,z) => projectWorldToScreen({x,y,z}, resolveGame()?.camera, resolveGame())
      },
      entity: {
          get_all: () => ['wumpus'],
          get_local_player: () => 'wumpus',
          is_alive: () => resolveGame()?.ragdoll?.standing,
          get_prop: (e, prop) => state[prop],
          set_prop: (e, prop, val) => state[prop] = val,
      },
      ui: {
          new_checkbox: (tab, group, label) => {
              const id = 'lcb_' + Math.random().toString(36).substr(2, 5); state[id] = false;
              if(!UI[tab]) UI[tab] = {}; if(!UI[tab][group]) UI[tab][group] = [];
              UI[tab][group].push({ type: 'checkbox', id, label });
              window.__SK_BUILD_TABS__(); return id;
          },
          new_slider: (tab, group, label, min, max, def) => {
              const id = 'lsl_' + Math.random().toString(36).substr(2, 5); state[id] = def;
              if(!UI[tab]) UI[tab] = {}; if(!UI[tab][group]) UI[tab][group] = [];
              UI[tab][group].push({ type: 'slider', id, label, min, max, unit: '' });
              window.__SK_BUILD_TABS__(); return id;
          },
          new_combobox: (tab, group, label, ...options) => {
              const id = 'lco_' + Math.random().toString(36).substr(2, 5); state[id] = options[0];
              if(!UI[tab]) UI[tab] = {}; if(!UI[tab][group]) UI[tab][group] = [];
              UI[tab][group].push({ type: 'combobox', id, label, options });
              window.__SK_BUILD_TABS__(); return id;
          },
          new_button: (tab, group, label, cb) => {
              const id = 'lbtn_' + Math.random().toString(36).substr(2, 5);
              runtime.luaCallbacks[id] = cb;
              if(!UI[tab]) UI[tab] = {}; if(!UI[tab][group]) UI[tab][group] = [];
              UI[tab][group].push({ type: 'button', id, label, onclick: `window.__SK_CALL_LUA__('${id}')` });
              window.__SK_BUILD_TABS__(); return id;
          },
          new_label: (tab, group, label) => {
              const id = 'llbl_' + Math.random().toString(36).substr(2, 5);
              if(!UI[tab]) UI[tab] = {}; if(!UI[tab][group]) UI[tab][group] = [];
              UI[tab][group].push({ type: 'text', id, label });
              window.__SK_BUILD_TABS__(); return id;
          },
          get: (id) => state[id],
          set: (id, val) => window.__SK_VAL__(id, val, true),
          set_visible: (id, visible) => {
              const el = document.getElementById(id);
              if (el) {
                  const cont = el.closest('.sk-control, .sk-slider-cont, .sk-select-cont, .sk-button');
                  if (cont) cont.style.display = visible ? 'flex' : 'none';
              }
          },
          set_callback: (id, cb) => { runtime.luaCallbacks[id] = cb; }
      },
      wumpus: {
          reset: () => { const g=resolveGame(); if(g) g.reset(); },
          get_coins: () => resolveGame()?.coins.amount,
          add_coins: (amount) => resolveGame()?.coins.add(amount),
          set_pose: (pose) => window.__SK_CUSTOM_POSE__(pose),
          trigger_damage: (seg, force) => resolveGame()?.events.emit('damage', { seg, point: {x:0,y:0,z:0}, normal: {x:0,y:1,z:0}, force, kind:'blast', source:'lua' })
      }
  };

  const SEGS = ['head', 'torso', 'pelvis', 'armL', 'armR', 'foreL', 'foreR', 'legL', 'legR', 'footL', 'footR'];
  const JOINTS = ['neck', 'waist', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];

  // Procedurally generate 150+ physics manipulation functions
  SEGS.forEach(seg => {
      LUA.wumpus[`get_${seg}_pos`] = () => resolveGame()?.ragdoll?.bodies[seg]?.translation();
      LUA.wumpus[`get_${seg}_vel`] = () => resolveGame()?.ragdoll?.bodies[seg]?.linvel();
      LUA.wumpus[`set_${seg}_vel`] = (x,y,z) => resolveGame()?.ragdoll?.bodies[seg]?.setLinvel({x,y,z}, true);
      LUA.wumpus[`get_${seg}_angvel`] = () => resolveGame()?.ragdoll?.bodies[seg]?.angvel();
      LUA.wumpus[`set_${seg}_angvel`] = (x,y,z) => resolveGame()?.ragdoll?.bodies[seg]?.setAngvel({x,y,z}, true);
      LUA.wumpus[`apply_${seg}_impulse`] = (x,y,z) => resolveGame()?.ragdoll?.bodies[seg]?.applyImpulse({x,y,z}, true);
      LUA.wumpus[`apply_${seg}_torque`] = (x,y,z) => resolveGame()?.ragdoll?.bodies[seg]?.applyTorqueImpulse({x,y,z}, true);
      LUA.wumpus[`set_${seg}_rot`] = (x,y,z,w) => resolveGame()?.ragdoll?.bodies[seg]?.setRotation({x,y,z,w}, true);
      LUA.wumpus[`is_${seg}_enabled`] = () => resolveGame()?.ragdoll?.bodies[seg]?.isEnabled();
      LUA.wumpus[`wake_${seg}`] = () => resolveGame()?.ragdoll?.bodies[seg]?.wakeUp();
      LUA.wumpus[`sleep_${seg}`] = () => resolveGame()?.ragdoll?.bodies[seg]?.sleep();
  });
  JOINTS.forEach(j => {
      LUA.wumpus[`sever_${j}`] = () => resolveGame()?.events.emit('sever', { joint: j });
      LUA.wumpus[`is_severed_${j}`] = () => resolveGame()?.ragdoll?.isSevered(j);
      LUA.wumpus[`get_${j}_rot`] = () => resolveGame()?.wumpus?.joints[j]?.rotation;
      LUA.wumpus[`set_${j}_rot`] = (x,y,z) => {
          const w = resolveGame()?.wumpus;
          if (w?.joints[j]) w.joints[j].rotation.set(x,y,z);
      };
  });
  
  window.client = LUA.client; window.globals = LUA.globals; window.render = LUA.render; 
  window.entity = LUA.entity; window.ui = LUA.ui; window.wumpus = LUA.wumpus;

  // -------------------------------------------------------------------------
  // 4. GUI STYLES (Skeet Remake CSS)
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // OTA HOT RELOAD — checks for updates every 60s, reloads in-place
  // -------------------------------------------------------------------------
  const __SK_CDN__ = 'https://cdn.jsdelivr.net/gh/kirilldma/wmpu@master/gamesense_skeet.js';
  let __SK_OTA_HASH__ = null;
  async function otaCheck() {
      try {
          const r = await fetch(__SK_CDN__ + '?_ota=' + Date.now());
          const txt = await r.text();
          const hash = txt.length + '|' + txt.slice(0, 64);
          if (__SK_OTA_HASH__ && __SK_OTA_HASH__ !== hash) {
              console.log('%c[skeet OTA] New version detected! Hot-reloading...', 'color:#97b621;font-weight:bold');
              // Clean up old instance
              if (window.__SK_CLEANUP__) window.__SK_CLEANUP__();
              // Re-eval new version
              eval(txt);
              return; // stop old interval
          }
          __SK_OTA_HASH__ = hash;
      } catch(e) {}
  }
  if (!window.__SK_OTA_INTERVAL__) {
      window.__SK_OTA_INTERVAL__ = setInterval(otaCheck, 60000);
      otaCheck(); // initial hash capture
  }

  // -------------------------------------------------------------------------
  // LOADING SPLASH SCREEN
  // -------------------------------------------------------------------------
  const CHANGELOG = [
      { ver: 'v1.4', tag: 'LATEST', date: '2026-10-10', items: [
          '+ Multiplayer 2.0: Real Wumpus models (no more red blocks!)',
          '+ Multiplayer Physics: Added full player-to-player collision',
          '✓ Improved multiplayer sync rate and precision'
      ]},
      { ver: 'v1.3', date: '2026-10-10', items: [
          '+ Hot OTA in-game reload',
          '+ Loading splash screen',
          '+ Changelog tab in-menu',
          '✓ Fixed THREE not defined in physgun',
          '✓ Fixed g redeclaration in visuals.set_wumpus_color'
      ]},
      { ver: 'v1.2', date: '2026-10-10', items: [
          '+ WebRTC Multiplayer with 3D red skeleton avatars',
          '+ Nicknames & live lobby display',
          '+ Sandbox: spawn physics cubes',
          '+ Gravity Gun (middle click)',
          '+ Zombie Mode (crawling torso)'
      ]},
      { ver: 'v1.1', date: '2026-10-10', items: [
          '+ 3rd Person Camera (RMB drag + scroll)',
          '+ FOV Changer slider',
          '+ 300+ Lua API functions',
          '+ camera, world, visuals, http, math modules',
          '+ Custom meme poses: Twerk, Jerk Off'
      ]}
  ];

  function showSplash(onDone) {
      const splash = document.createElement('div');
      splash.id = 'sk-splash';
      splash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#0c0c0c;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Verdana,sans-serif;color:#cdcdcd;`;
      splash.innerHTML = `
        <div style="width:340px">
          <div style="font-size:22px;font-weight:bold;letter-spacing:3px;margin-bottom:4px;background:linear-gradient(90deg,#37b1da,#cc46cd,#cce335);-webkit-background-clip:text;-webkit-text-fill-color:transparent">skeet.wts</div>
          <div style="font-size:9px;color:#444;letter-spacing:3px;margin-bottom:28px;text-transform:uppercase">wumpus torture simulator cheat</div>
          <div id="sk-sp-bar-wrap" style="height:4px;background:#1a1a1a;border:1px solid #0c0c0c;margin-bottom:12px">
            <div id="sk-sp-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#37b1da,#97b621);transition:width .2s"></div>
          </div>
          <div id="sk-sp-msg" style="font-size:10px;color:#555;margin-bottom:28px">Initializing...</div>
          <div style="font-size:9px;color:#2a2a2a;text-transform:uppercase;letter-spacing:2px;border-top:1px solid #1a1a1a;padding-top:12px">Version 1.3 • OTA Enabled • github.com/kirilldma/wmpu</div>
        </div>
      `;
      document.body.appendChild(splash);

      const steps = ['Connecting to OTA server...', 'Loading physics hooks...', 'Injecting ESP renderer...', 'Patching game loop...', 'Building UI...', 'Ready!'];
      let i = 0;
      const iv = setInterval(() => {
          const pct = Math.round(((i+1)/steps.length)*100);
          document.getElementById('sk-sp-bar').style.width = pct + '%';
          document.getElementById('sk-sp-msg').textContent = steps[i];
          i++;
          if (i >= steps.length) {
              clearInterval(iv);
              setTimeout(() => {
                  splash.style.transition = 'opacity .4s';
                  splash.style.opacity = '0';
                  setTimeout(() => { splash.remove(); onDone(); }, 400);
              }, 300);
          }
      }, 220);
  }

  const css = `
    @font-face { font-family: 'undefeated'; src: url('https://winchxyz.github.io/wumpus-torture-simulator/fonts/undefeated.ttf') format('truetype'); } /* Optional if they have icon font */
    #sk-gui {
        width: 660px; height: 500px; position: fixed; top: 70px; left: 120px; z-index: 2147483647;
        background-color: #171717; 
        box-shadow: 
            inset 0 0 0 1px #0c0c0c,
            inset 0 0 0 2px #3d3d3d,
            inset 0 0 0 3px #2b2b2b,
            inset 0 0 0 4px #2b2b2b,
            inset 0 0 0 5px #2b2b2b,
            inset 0 0 0 6px #3d3d3d,
            0 10px 30px rgba(0,0,0,0.8);
        font-family: 'Verdana', sans-serif; color: #cdcdcd; display: flex; flex-direction: column;
        user-select: none; padding: 6px;
    }
    #sk-gui ::-webkit-scrollbar { width: 10px; }
    #sk-gui ::-webkit-scrollbar-track { background: #282828; border-left: 1px solid #0c0c0c; }
    #sk-gui ::-webkit-scrollbar-thumb { background: #414141; border: 1px solid #0c0c0c; }
    #sk-gui ::-webkit-scrollbar-thumb:hover { background: #4d4d4d; }
    
    #sk-rainbow { 
        height: 2px; 
        background: linear-gradient(90deg, #37b1da 0%, #cc46cd 50%, #cce335 100%); 
        margin: 1px 1px 0 1px; 
    }
    #sk-drag {
        height: 18px; background: #171717;
        display: flex; justify-content: space-between; align-items: center; padding: 0 4px; cursor: move; margin-bottom: 2px;
    }
    #sk-drag span:first-child { font-weight: bold; font-size: 11px; color: #cdcdcd; }
    #sk-close { cursor: pointer; color: #cdcdcd; font-size: 12px; line-height: 10px; font-family: Tahoma; }
    
    #sk-body { display: flex; flex: 1; overflow: hidden; background: #171717; }
    #sk-tabs { 
        width: 74px; 
        border-right: 1px solid #0c0c0c; 
        box-shadow: inset -1px 0 0 #282828; 
        display: flex; flex-direction: column; background: #0c0c0c; margin-right: 15px; 
        position: relative; z-index: 1;
    }
    .sk-tab-icon {
        height: 74px; display: flex; justify-content: center; align-items: center;
        color: #555555; cursor: pointer; transition: 0.1s;
    }
    .sk-tab-icon.active { 
        color: #cdcdcd; background: #171717; 
        width: 75px; z-index: 2; 
        border-top: 1px solid #282828; border-bottom: 1px solid #282828;
        box-shadow: inset 0 1px 0 #000, inset 0 -1px 0 #000;
        margin-top: -1px; margin-bottom: -1px;
    }
    .sk-tab-icon svg { width: 34px; height: 34px; }
    
    #sk-content { flex: 1; padding: 10px 10px 10px 0; overflow-y: auto; background: #171717; }
    .sk-tab-view { display: none; width: 100%; gap: 15px; }
    .sk-tab-view.active { display: flex; }
    .sk-col { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    
    .sk-groupbox {
        border: 1px solid #0c0c0c; background: #171717;
        box-shadow: inset 0 0 0 1px #232323;
        position: relative; padding: 15px 12px 10px 12px;
    }
    .sk-groupbox-legend {
        position: absolute; top: -6px; left: 12px; background: #171717;
        padding: 0 4px; font-weight: normal; font-size: 11px; color: #cdcdcd; font-family: Verdana;
    }
    
    .sk-control { display: flex; align-items: center; justify-content: space-between; margin: 3px 0; cursor: pointer; }
    .sk-cb-wrap { display: flex; align-items: center; gap: 8px; }
    .sk-cb-box {
        width: 12px; height: 12px; background: linear-gradient(to bottom, #2e2e2e, #292929); border: 1px solid #0c0c0c;
        flex-shrink: 0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .sk-cb-box.checked { background: #97b621; }
    .sk-label { font-size: 11px; color: #cdcdcd; }
    
    .sk-slider-cont { margin: 6px 0; }
    .sk-slider-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .sk-slider-val { font-size: 11px; color: #9d9d9d; font-weight: normal; }
    .sk-slider-track {
        height: 8px; background: linear-gradient(to bottom, #2e2e2e, #292929); border: 1px solid #0c0c0c;
        position: relative; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .sk-slider-fill { height: 100%; background: #97b621; }
    .sk-slider-input { position: absolute; top: -4px; left: 0; width: 100%; height: 14px; opacity: 0; cursor: ew-resize; }
    
    .sk-select-cont { margin: 4px 0; }
    .sk-select {
        width: 100%; height: 20px; background: linear-gradient(to bottom, #2e2e2e, #292929); border: 1px solid #0c0c0c;
        color: #cdcdcd; font-size: 11px; padding: 0 4px; outline: none; border-radius: 0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .sk-button {
        width: 100%; height: 20px; background: linear-gradient(to bottom, #2e2e2e, #292929); border: 1px solid #0c0c0c;
        color: #cdcdcd; font-size: 11px; cursor: pointer; outline: none; margin: 4px 0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .sk-button:active { background: linear-gradient(to bottom, #242424, #1f1f1f); }
    .sk-textarea {
        width: 100%; height: 120px; background: #191919; border: 1px solid #0c0c0c; color: #cdcdcd;
        font-family: Consolas, monospace; font-size: 11px; padding: 4px; resize: none; outline: none; box-sizing: border-box;
    }
  `;
  const style = document.createElement('style'); style.innerHTML = css; document.head.appendChild(style);

  // -------------------------------------------------------------------------
  // 5. GUI CONTROLLER
  // -------------------------------------------------------------------------
  const gui = document.createElement('div'); gui.id = 'sk-gui'; gui.style.display = 'none'; document.body.appendChild(gui);
  showSplash(() => { gui.style.display = 'flex'; });

  const icons = {
    RAGE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="18" cy="18" r="4"/><path d="M18 14v8M14 18h8"/></svg>`,
    AA: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    LEGIT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
    VISUALS: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>`,
    MISC: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    SANDBOX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    NETWORK: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    LUA: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
  };

  window.__SK_VAL__ = (id, val, programmatic = false) => {
    state[id] = val;
    const el = document.getElementById(id);
    if(el) {
        if(el.type === 'checkbox') {
            document.getElementById('skb-'+id).className = `sk-cb-box ${val?'checked':''}`;
            document.getElementById('skl-'+id).className = `sk-label ${val?'active':''}`;
        }
        else if(el.type === 'range') {
            document.getElementById('skv-'+id).innerText = val;
            document.getElementById('skf-'+id).style.width = `${((val - el.min) / (el.max - el.min)) * 100}%`;
        }
        else if(el.tagName === 'SELECT') { el.value = val; }
        else if(el.tagName === 'TEXTAREA') { if(programmatic) el.value = val; }
    }
    if(runtime.luaCallbacks[id]) { try { runtime.luaCallbacks[id](val); } catch(e){ console.error(e); } }
  };

  window.__SK_CALL_LUA__ = (id) => {
      if(runtime.luaCallbacks[id]) { try { runtime.luaCallbacks[id](); } catch(e){ console.error(e); } }
  };

  window.__SK_EXEC_LUA__ = () => {
      const code = document.getElementById('luaEditor').value;
      const status = document.getElementById('luaStatus');
      try {
          runtime.eventCallbacks = {}; // Clear old callbacks
          const args = Object.keys(LUA);
          const fn = new Function(...args, code);
          fn(...args.map(k => LUA[k]));
          if(status) { status.innerText = 'Script executed successfully.'; status.style.color = '#97b621'; }
      } catch (err) {
          if(status) { status.innerText = 'Error: ' + err.message; status.style.color = '#e8505b'; }
      }
  };

  window.__SK_POSE__ = (poseName) => {
     runtime.customPose = null; const g = resolveGame();
     if (g?.wumpus) { g.wumpus.setPoseControl(false); g.wumpus.setPose(poseName, true); if(g.ragdoll) { g.ragdoll.standing = true; g.ragdoll.limp = false; } }
  };
  
  window.__SK_CUSTOM_POSE__ = (poseName) => {
     runtime.customPose = poseName; const g = resolveGame();
     if (g?.wumpus) {
         if (!window.__ORIG_WUMPUS_UPDATE__) {
             window.__ORIG_WUMPUS_UPDATE__ = g.wumpus.update;
             g.wumpus.update = function(dt) {
                 window.__ORIG_WUMPUS_UPDATE__.call(this, dt);
                 if (runtime.customPose) {
                     const j = this.joints; const t = performance.now() * 0.001;
                     if (runtime.customPose === 'jerk') {
                         if (j.shoulderL) j.shoulderL.rotation.set(0.1, 0, 0.4); if (j.elbowL) j.elbowL.rotation.set(-0.5, 0, 0);
                         if (j.shoulderR) j.shoulderR.rotation.set(-0.3, -0.6, -0.4); if (j.elbowR) j.elbowR.rotation.set(-1.8 + Math.sin(t * 30) * 0.8, 0.2, 0.4); if (j.handR) j.handR.rotation.set(-0.5, 0, 0);
                         if (j.pelvis) j.pelvis.position.z = Math.sin(t * 30) * 0.05; if (j.hipL) j.hipL.rotation.set(0, 0, 0.3); if (j.hipR) j.hipR.rotation.set(0, 0, -0.3); if (j.head) j.head.rotation.set(-0.2 + Math.sin(t * 30) * 0.08, 0, 0);
                     } else if (runtime.customPose === 'twerk') {
                         if (j.pelvis) { j.pelvis.rotation.set(0.8, 0, 0); j.pelvis.position.y = 0.33 + Math.sin(t * 25) * 0.2; }
                         if (j.torso) j.torso.rotation.set(-0.8, 0, 0); if (j.legL) j.legL.rotation.set(-0.3, 0, 0); if (j.legR) j.legR.rotation.set(-0.3, 0, 0);
                         if (j.shoulderL) j.shoulderL.rotation.set(-0.5, 0, 0.5); if (j.shoulderR) j.shoulderR.rotation.set(-0.5, 0, -0.5); if (j.head) j.head.rotation.set(0.4, 0, 0);
                     }
                 }
             };
         }
         if (poseName) { g.wumpus.setPose('idle', true); g.wumpus.setPoseControl(true); } else g.wumpus.setPoseControl(false);
     }
  };
  
  window.__SK_RESET__ = () => resolveGame()?.reset();
  window.__SK_COINS__ = () => resolveGame()?.coins.add(1000);
  window.__SK_EXPLODE__ = () => {
      const g = resolveGame();
      if (!g || !g.ragdoll) return;
      for (const b of Object.values(g.ragdoll.bodies)) {
          if (b?.isEnabled()) b.applyImpulse({x: (Math.random()-0.5)*100, y: Math.random()*100, z: (Math.random()-0.5)*100}, true);
      }
      for (const j of ['neck', 'waist', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR']) {
          g.events.emit('sever', {joint: j});
      }
  };
  
  window.__SK_SPAWN_PROP__ = (size) => {
      const g = resolveGame();
      if (!g || !g.world) return;
      const rDesc = g.RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0);
      const rBody = g.world.createRigidBody(rDesc);
      const cDesc = g.RAPIER.ColliderDesc.cuboid(size/2, size/2, size/2).setMass(size*5);
      g.world.createCollider(cDesc, rBody);
      const T = g.THREE || window.THREE;
      const geo = new T.BoxGeometry(size, size, size);
      const mat = new T.MeshStandardMaterial({color: Math.random() * 0xffffff});
      const mesh = new T.Mesh(geo, mat);
      g.scene.add(mesh);
      runtime.props.push({body: rBody, mesh: mesh});
  };
  
  window.__SK_CLEAR_PROPS__ = () => {
      const g = resolveGame();
      if (!g) return;
      runtime.props.forEach(p => {
          g.scene.remove(p.mesh);
          g.world.removeRigidBody(p.body);
      });
      runtime.props = [];
  };
  
  // ---- Multiplayer helpers ----
  function mpUpdateLobby() {
      const names = Object.values(runtime.network.remotePlayers).map(p => `💀 ${p.nick||p.id.slice(0,6)}`);
      const me = `⚠ YOU (${state.mpNickname})`;
      window.__SK_VAL__('net_lobby', [me, ...names].join(' | ') || '(empty)');
  }
  
  let _skWumpusFactory = null;
  function mpHandlePacket(d) {
      if (!d || !d.id) return;
      const g = resolveGame();
      if (!g || !g.scene || !g.THREE) return;
      
      let rp = runtime.network.remotePlayers[d.id];
      if (!rp) {
          rp = runtime.network.remotePlayers[d.id] = { loaded: false };
          const skel = runtime.network.skeletons[d.id] = { bodies: {}, group: new g.THREE.Group(), wumpus: null };
          g.scene.add(skel.group);

          const sizes = { head: {type:'sphere',r:0.8}, torso: {type:'sphere',r:0.5}, pelvis: {type:'sphere',r:0.42}, legL: {type:'sphere',r:0.24}, legR: {type:'sphere',r:0.24}, armL: {type:'sphere',r:0.14}, armR: {type:'sphere',r:0.14}, foreL: {type:'sphere',r:0.17}, foreR: {type:'sphere',r:0.17} };
          for (let seg in sizes) {
              let desc = g.RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -100, 0);
              let body = g.world.createRigidBody(desc);
              let s = sizes[seg];
              let col = g.RAPIER.ColliderDesc.ball(s.r);
              col.setCollisionGroups(0x00020001); // enable collision
              g.world.createCollider(col, body);
              skel.bodies[seg] = body;
          }

          const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
          const lctx = canvas.getContext('2d');
          lctx.fillStyle = '#ffffff'; lctx.font = 'bold 28px Verdana';
          lctx.fillText('😎 ' + (d.nick || d.id.slice(0,8)), 4, 42);
          const texture = new g.THREE.CanvasTexture(canvas);
          const lblMat = new g.THREE.SpriteMaterial({ map: texture, transparent: true });
          skel.label = new g.THREE.Sprite(lblMat); skel.label.scale.set(1.5, 0.4, 1);
          skel.group.add(skel.label);

          const loadVis = async () => {
              if (!_skWumpusFactory) {
                  try {
                      const m = await import('https://winchxyz.github.io/wumpus-torture-simulator/src/wumpus.js');
                      _skWumpusFactory = m.createWumpus;
                  } catch(e) { console.error('wumpus load fail', e); return; }
              }
              skel.wumpus = _skWumpusFactory({ THREE: g.THREE });
              skel.wumpus.setPoseControl(false);
              skel.wumpus.setLife(false);
              
              for (let seg in skel.wumpus.segments) {
                  const sGrp = skel.wumpus.segments[seg];
                  sGrp.matrixAutoUpdate = false;
                  skel.group.add(sGrp);
              }
              rp.loaded = true;
          };
          loadVis();
          mpUpdateLobby();
      }
      
      rp.lastUpdate = performance.now();
      rp.nick = d.nick;
      
      const skel = runtime.network.skeletons[d.id];
      if (skel && d.segs) {
          let maxY = -999;
          for (let seg in d.segs) {
              const data = d.segs[seg];
              if (!data.t || !data.q) continue;
              if (skel.bodies[seg]) {
                  skel.bodies[seg].setNextKinematicTranslation(data.t);
                  skel.bodies[seg].setNextKinematicRotation(data.q);
              }
              if (skel.wumpus && skel.wumpus.segments[seg]) {
                  const sGrp = skel.wumpus.segments[seg];
                  sGrp.position.set(data.t.x, data.t.y, data.t.z);
                  sGrp.quaternion.set(data.q.x, data.q.y, data.q.z, data.q.w);
                  sGrp.updateMatrix();
                  sGrp.updateWorldMatrix(true, false);
              }
              if (data.t.y > maxY) maxY = data.t.y;
          }
          if (skel.label && d.segs.head) {
              skel.label.position.set(d.segs.head.t.x, maxY + 0.9, d.segs.head.t.z);
          }
      }
  }

  function mpSendSelf(g) {
      if (!runtime.network.connections.length && !runtime.network.conn) return;
      let pkt = { id: runtime.network.peer.id, nick: state.mpNickname, segs: {} };
      for (let seg in g.ragdoll.bodies) {
          const b = g.ragdoll.bodies[seg];
          if (!b || !b.isEnabled()) continue;
          const t = b.translation();
          const q = b.rotation();
          pkt.segs[seg] = { t: {x: t.x, y: t.y, z: t.z}, q: {x: q.x, y: q.y, z: q.z, w: q.w} };
      }
      runtime.network.connections.forEach(c => { try { c.send(pkt); } catch(e){} });
      if (runtime.network.conn) { try { runtime.network.conn.send(pkt); } catch(e){} }
  }
  
  window.__SK_SET_NICK__ = () => {
      const n = prompt('Enter nickname (max 16 chars):', state.mpNickname);
      if (n) { state.mpNickname = n.slice(0,16); window.__SK_VAL__('mp_nick_label', 'Nickname: ' + state.mpNickname); mpUpdateLobby(); }
  };
  
  window.__SK_HOST_GAME__ = () => {
      if (!window.Peer) return alert('PeerJS still loading, try again in 2s!');
      if (runtime.network.peer) { runtime.network.peer.destroy(); }
      runtime.network.peer = new Peer();
      runtime.network.connections = [];
      runtime.network.peer.on('open', id => {
          window.__SK_VAL__('net_status', '📡 Hosting! ID copied.');
          navigator.clipboard.writeText(id).catch(() => prompt('Copy your ID:', id));
          mpUpdateLobby();
      });
      runtime.network.peer.on('connection', c => {
          runtime.network.connections.push(c);
          c.on('open', () => { window.__SK_VAL__('net_status', `📡 Hosting | ${runtime.network.connections.length} connected`); });
          c.on('data', d => mpHandlePacket(d));
          c.on('close', () => {
              runtime.network.connections = runtime.network.connections.filter(x => x !== c);
              window.__SK_VAL__('net_status', `📡 Hosting | ${runtime.network.connections.length} connected`);
          });
      });
  };
  
  window.__SK_JOIN_GAME__ = async () => {
      if (!window.Peer) return alert('PeerJS still loading, try again in 2s!');
      const id = await navigator.clipboard.readText().catch(() => prompt('Paste Host ID:'));
      if (!id) return;
      if (runtime.network.peer) runtime.network.peer.destroy();
      runtime.network.peer = new Peer();
      runtime.network.peer.on('open', () => {
          window.__SK_VAL__('net_status', '🔗 Connecting...');
          runtime.network.conn = runtime.network.peer.connect(id.trim());
          runtime.network.conn.on('open', () => {
              window.__SK_VAL__('net_status', '✅ Connected!');
              runtime.network.conn.on('data', d => mpHandlePacket(d));
              runtime.network.conn.on('close', () => window.__SK_VAL__('net_status', '❌ Disconnected'));
          });
          runtime.network.conn.on('error', e => window.__SK_VAL__('net_status', '❌ Error: ' + e.type));
      });
  };

  window.__SK_SET_TAB__ = (t) => {
      runtime.activeTab = t;
      document.querySelectorAll('.sk-tab-icon').forEach(e => e.classList.remove('active'));
      document.getElementById('ico-'+t).classList.add('active');
      document.querySelectorAll('.sk-tab-view').forEach(e => e.classList.remove('active'));
      document.getElementById('tab-'+t).classList.add('active');
  };

  window.__SK_BUILD_TABS__ = () => {
    let tabsHtml = '';
    let viewsHtml = '';
    
    for (let tab in UI) {
        tabsHtml += `<div id="ico-${tab}" class="sk-tab-icon ${runtime.activeTab===tab?'active':''}" onclick="window.__SK_SET_TAB__('${tab}')">${icons[tab] || icons.MISC}</div>`;
        
        let col1 = [], col2 = [];
        let i = 0;
        for (let group in UI[tab]) { (i++ % 2 === 0 ? col1 : col2).push(group); }
        
        const renderGroup = (g) => {
            let html = `<div class="sk-groupbox"><div class="sk-groupbox-legend">${g}</div><div style="display:flex;flex-direction:column;gap:5px;">`;
            UI[tab][g].forEach(el => {
                if (el.type === 'checkbox') {
                    const c = state[el.id];
                    html += `<label class="sk-control"><div class="sk-cb-wrap"><input type="checkbox" id="${el.id}" style="display:none;" onchange="window.__SK_VAL__('${el.id}', this.checked)" ${c?'checked':''}><div class="sk-cb-box ${c?'checked':''}" id="skb-${el.id}"></div><span class="sk-label ${c?'active':''}" id="skl-${el.id}">${el.label}</span></div></label>`;
                } else if (el.type === 'slider') {
                    const v = state[el.id]; const pct = ((v - el.min) / (el.max - el.min)) * 100;
                    html += `<div class="sk-slider-cont"><div class="sk-slider-top"><span class="sk-label">${el.label}</span><span class="sk-slider-val" id="skv-${el.id}">${v}${el.unit||''}</span></div><div class="sk-slider-track"><div class="sk-slider-fill" id="skf-${el.id}" style="width:${pct}%"></div><input type="range" class="sk-slider-input" id="${el.id}" min="${el.min}" max="${el.max}" value="${v}" oninput="window.__SK_VAL__('${el.id}', this.value)"></div></div>`;
                } else if (el.type === 'combobox') {
                    html += `<div class="sk-select-cont"><div class="sk-label" style="margin-bottom:2px;">${el.label}</div><select class="sk-select" id="${el.id}" onchange="window.__SK_VAL__('${el.id}', this.value)">${el.options.map(o => `<option value="${o}" ${o===state[el.id]?'selected':''}>${o}</option>`).join('')}</select></div>`;
                } else if (el.type === 'button') {
                    // Safe injection format using double quotes around the onclick value, assuming el.onclick only has single quotes
                    html += `<button class="sk-button" onclick="${el.onclick}">${el.label}</button>`;
                } else if (el.type === 'textarea') {
                    html += `<textarea id="${el.id}" class="sk-textarea" oninput="window.__SK_VAL__('${el.id}', this.value)">${state[el.id]}</textarea>`;
                } else if (el.type === 'text') {
                    html += `<span id="${el.id}" style="color:#a5a8af;font-size:10px;margin-top:4px;">${el.label}</span>`;
                } else if (el.type === 'custom') {
                    html += el.render();
                }
            });
            return html + `</div></div>`;
        };
        
        viewsHtml += `<div id="tab-${tab}" class="sk-tab-view ${runtime.activeTab===tab?'active':''}">
            <div class="sk-col">${col1.map(renderGroup).join('')}</div>
            <div class="sk-col">${col2.map(renderGroup).join('')}</div>
        </div>`;
    }
    
    gui.innerHTML = `
      <div id="sk-rainbow"></div>
      <div id="sk-drag"><span>gamesense</span><span id="sk-close" onclick="document.getElementById('sk-gui').style.display='none'">×</span></div>
      <div id="sk-body">
        <div id="sk-tabs">${tabsHtml}</div>
        <div id="sk-content">${viewsHtml}</div>
      </div>
    `;
    
    const dragHeader = gui.querySelector('#sk-drag');
    let isDragging = false, dragX = 0, dragY = 0;
    dragHeader.onmousedown = (e) => { isDragging = true; dragX = e.clientX - gui.offsetLeft; dragY = e.clientY - gui.offsetTop; };
    window.addEventListener('mousemove', (e) => { if (!isDragging) return; gui.style.left = Math.max(0, e.clientX - dragX) + 'px'; gui.style.top = Math.max(0, e.clientY - dragY) + 'px'; });
    window.addEventListener('mouseup', () => (isDragging = false));
  };

  window.__SK_BUILD_TABS__();
  window.addEventListener('keydown', (e) => { if (e.code === 'Insert') gui.style.display = gui.style.display === 'none' ? 'flex' : 'none'; });

  // -------------------------------------------------------------------------
  // 6. CHEAT PIPELINE
  // -------------------------------------------------------------------------
  function triggerHit(point, dmg, seg) {
    runtime.hitlogs.push({ x: point.x, y: point.y, dmg: Math.round(dmg), life: 40, alpha: 1.0 });
    resolveGame()?.audio?.play('thud', { gain: 1.1 });
  }

  function frameLoop(timestamp) {
    const animId = requestAnimationFrame(frameLoop);
    runtime.frameCount++;
    if (timestamp - runtime.lastFpsUpdate >= 1000) { runtime.fps = runtime.frameCount; runtime.frameCount = 0; runtime.lastFpsUpdate = timestamp; }

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    runtime.renderQueue = [];
    const g = resolveGame();

    if (runtime.eventCallbacks['paint']) { runtime.eventCallbacks['paint'].forEach(cb => { try { cb(); } catch(e) {} }); }

    if (state.watermark) {
      const text = `gamesense | wumpus torture | ${runtime.fps} fps`;
      ctx.font = '11px Tahoma, Verdana, sans-serif'; const tw = ctx.measureText(text).width;
      const wx = window.innerWidth - tw - 24, wy = 12;
      ctx.fillStyle = '#0b0c0f'; ctx.fillRect(wx - 2, wy, tw + 18, 20);
      ctx.strokeStyle = '#2d323f'; ctx.lineWidth = 1; ctx.strokeRect(wx - 2, wy, tw + 18, 20);
      const grad = ctx.createLinearGradient(wx - 2, wy, wx + tw + 16, wy);
      grad.addColorStop(0, '#e8505b'); grad.addColorStop(0.5, '#50e88b'); grad.addColorStop(1, '#50b0e8');
      ctx.fillStyle = grad; ctx.fillRect(wx - 2, wy, tw + 18, 2);
      ctx.fillStyle = '#e0e2e6'; ctx.fillText(text, wx + 6, wy + 14);
    }

    if (state.crosshair) {
        ctx.fillStyle = '#a4cb38';
        ctx.fillRect(window.innerWidth / 2 - 1, window.innerHeight / 2 - 4, 2, 8);
        ctx.fillRect(window.innerWidth / 2 - 4, window.innerHeight / 2 - 1, 8, 2);
    }

    if (state.fovCircle) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(window.innerWidth / 2, window.innerHeight / 2, 100, 0, Math.PI * 2); ctx.stroke();
    }

    if (!g || !g.ragdoll || !g.camera) { drawRenderQueue(); return; }
    
    if (g.events && !window.__ORIG_EMIT__) {
       window.__ORIG_EMIT__ = g.events.emit;
       g.events.emit = function(eventName, payload) {
          if (state.walkGodMode && (state.walkEnabled || state.noclipEnabled) && (keys.w || keys.a || keys.s || keys.d || keys.space)) {
              if (eventName === 'damage' || eventName === 'sever') return;
          }
          return window.__ORIG_EMIT__.call(g.events, eventName, payload);
       };
    }

    const r = g.ragdoll; const bodies = r.bodies; const cam = g.camera;

    if (state.aimbotEnabled && timestamp - runtime.lastShot > state.fireInterval) {
      let target = state.targetHitbox.toLowerCase();
      if (target === 'arms') target = Math.random() > 0.5 ? 'armL' : 'armR';
      if (target === 'legs') target = Math.random() > 0.5 ? 'legL' : 'legR';
      if (target === 'random') { const segs = ['head', 'torso', 'pelvis', 'armL', 'armR', 'legL', 'legR']; target = segs[Math.floor(Math.random() * segs.length)]; }

      const body = bodies[target];
      if (body && body.isEnabled()) {
        const pos = body.translation(); const dmgForce = (state.impactForce / 35);
        g.events.emit('damage', { seg: target, point: pos, normal: { x: 0, y: 1, z: 0 }, force: dmgForce, kind: 'blast', source: 'ragebot' });
        body.applyImpulse({ x: (Math.random() - 0.5) * 12 * dmgForce, y: Math.random() * 15 * dmgForce, z: (Math.random() - 0.5) * 12 * dmgForce }, true);
        const screenPos = projectWorldToScreen(pos, cam, g);
        if (screenPos && state.hitmarkers) triggerHit(screenPos, state.impactForce, target);
        if (state.autoSever && Math.random() < 0.05) {
          const severs = ['neck', 'waist', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR'];
          g.events.emit('sever', { joint: severs[Math.floor(Math.random() * severs.length)] });
        }
        runtime.lastShot = timestamp;
      }
    }
    
    // Kill Aura
    if (state.killAura) {
        for (let i = 0; i < 3; i++) {
            const tgt = ['head', 'torso', 'armL', 'armR', 'legL', 'legR'][Math.floor(Math.random()*6)];
            if (bodies[tgt] && bodies[tgt].isEnabled()) {
                g.events.emit('damage', { seg: tgt, point: bodies[tgt].translation(), normal: {x:0,y:1,z:0}, force: 0.5, kind: 'blast' });
            }
        }
    }
    
    // Auto Heal
    if (state.autoHeal && r.limp && Math.random() < 0.1) {
        g.reset();
    }

    if (state.antiAimEnabled) {
      const i = state.aaIntensity;
      switch (state.aaMode) {
        case 'Spinbot': if (bodies.torso?.isEnabled()) bodies.torso.setAngvel({ x: 0, y: i * 0.5, z: 0 }, true); break;
        case 'Helicopter': for (const s of ['armL', 'armR', 'legL', 'legR']) { if(bodies[s]?.isEnabled()) bodies[s].setAngvel({ x: 0, y: i * 0.8, z: 0 }, true); } if (bodies.torso?.isEnabled()) bodies.torso.setAngvel({ x: 0, y: i * 0.2, z: 0 }, true); break;
        case 'Earthquake': for (const s of ['head', 'torso', 'pelvis']) { if(bodies[s]?.isEnabled()) bodies[s].applyImpulse({x: (Math.random()-0.5)*i, y: (Math.random()-0.5)*i, z: (Math.random()-0.5)*i}, true); } break;
        case 'Spasm': for (const b of Object.values(bodies)) { if(b?.isEnabled()) b.setAngvel({x: (Math.random()-0.5)*i, y: (Math.random()-0.5)*i, z: (Math.random()-0.5)*i}, true); } break;
        case 'Ascend': if (bodies.torso?.isEnabled()) bodies.torso.applyImpulse({ x: 0, y: i * 0.15, z: 0 }, true); break;
      }
    }

    if ((state.walkEnabled || state.noclipEnabled) && bodies.torso && bodies.pelvis && bodies.torso.isEnabled()) {
      const camFwd = new g.THREE.Vector3(); cam.getWorldDirection(camFwd);
      if (!state.noclipEnabled) camFwd.y = 0; // standard walk stays on ground
      camFwd.normalize();
      const camRight = new g.THREE.Vector3().crossVectors(camFwd, new g.THREE.Vector3(0, 1, 0)).normalize();
      
      const move = new g.THREE.Vector3(0, 0, 0);
      if (keys.w) move.add(camFwd); if (keys.s) move.sub(camFwd); if (keys.a) move.sub(camRight); if (keys.d) move.add(camRight);

      if (state.noclipEnabled) {
          bodies.torso.setGravityScale(0, true);
          bodies.pelvis.setGravityScale(0, true);
          // Zero out existing velocity to fly smooth
          bodies.pelvis.setLinvel({x:0, y:0, z:0}, true);
          bodies.torso.setLinvel({x:0, y:0, z:0}, true);
          
          if (move.lengthSq() > 0) {
              move.normalize().multiplyScalar(state.walkSpeed * 0.2);
              const cur = bodies.pelvis.translation();
              bodies.pelvis.setTranslation({x: cur.x + move.x, y: cur.y + move.y, z: cur.z + move.z}, true);
              bodies.torso.setTranslation({x: cur.x + move.x, y: cur.y + move.y, z: cur.z + move.z}, true);
          }
      } else {
          // Restore gravity if toggled off
          bodies.torso.setGravityScale(1, true); bodies.pelvis.setGravityScale(1, true);
          if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(state.walkSpeed * 0.05);
            if (r.limp) r.limp = false; r.standing = true;
            bodies.pelvis.setLinvel({ x: move.x * 2, y: bodies.pelvis.linvel().y, z: move.z * 2 }, true);
            bodies.torso.setLinvel({ x: move.x * 2, y: bodies.torso.linvel().y, z: move.z * 2 }, true);
          }
          if (keys.space) {
             if (r.standing) {
                 bodies.pelvis.setLinvel({ x: bodies.pelvis.linvel().x, y: (state.jumpForce * 0.2), z: bodies.pelvis.linvel().z }, true);
                 bodies.torso.setLinvel({ x: bodies.torso.linvel().x, y: (state.jumpForce * 0.2), z: bodies.torso.linvel().z }, true);
             }
             keys.space = false;
          }
      }
    }

    if (state.infiniteCoins && g.coins) g.coins.add(10);
    if (state.unlockAll && g.unlocked && g.tools) { if (g.unlocked.size < g.tools.length) g.unlockAll(); }
    if (g.world) g.world.gravity = state.zeroGravity ? { x: 0, y: 0, z: 0 } : { x: 0, y: -9.81, z: 0 };
    if (state.freezeWumpus) { for (const b of Object.values(bodies)) { if (b?.isEnabled()) { b.setLinvel({x:0, y:0, z:0}, true); b.setAngvel({x:0, y:0, z:0}, true); } } }
    
    // Sandbox Props Sync
    runtime.props.forEach(p => {
        let t = p.body.translation(); let q = p.body.rotation();
        p.mesh.position.set(t.x, t.y, t.z); p.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    });
    
    // Zombie Mode
    if (state.zombieMode && g.ragdoll && g.ragdoll.bodies.torso) {
        const t = performance.now() / 200;
        const force = 0.5;
        if (Math.sin(t) > 0 && g.ragdoll.bodies.armL) { g.ragdoll.bodies.armL.applyImpulse({x:0, y:force, z:-force}, true); g.ragdoll.bodies.armL.wakeUp(); }
        else if (g.ragdoll.bodies.armR) { g.ragdoll.bodies.armR.applyImpulse({x:0, y:force, z:-force}, true); g.ragdoll.bodies.armR.wakeUp(); }
        g.ragdoll.bodies.torso.wakeUp();
    }
    
    // Gravity Gun (Physgun)
    if (runtime.physgunState.body && state.physgun) {
        const _T = g.THREE || window.THREE;
        const raycaster = new _T.Raycaster();
        const mouse = new _T.Vector2((window.__SK_MOUSE_X / window.innerWidth)*2-1, -(window.__SK_MOUSE_Y/window.innerHeight)*2+1);
        raycaster.setFromCamera(mouse, g.camera);
        const target = raycaster.ray.origin.clone().add(raycaster.ray.direction.multiplyScalar(runtime.physgunState.dist));
        const pos = runtime.physgunState.body.translation();
        const vel = runtime.physgunState.body.linvel();
        const kP = 5.0; const kD = 0.5;
        runtime.physgunState.body.applyImpulse({ x: (target.x-pos.x)*kP - vel.x*kD, y: (target.y-pos.y)*kP - vel.y*kD, z: (target.z-pos.z)*kP - vel.z*kD }, true);
        runtime.physgunState.body.wakeUp();
    }
    
    // Network Sync
    if (runtime.network.peer && runtime.frameCount % 3 === 0 && g.ragdoll) {
        mpSendSelf(g);
    }
    // Cleanup stale remote players (no packet for 5s)
    for (let id in runtime.network.remotePlayers) {
        if (performance.now() - runtime.network.remotePlayers[id].lastUpdate > 5000) {
            if (runtime.network.skeletons[id]) {
                g.scene.remove(runtime.network.skeletons[id].group);
                delete runtime.network.skeletons[id];
            }
            delete runtime.network.remotePlayers[id];
            mpUpdateLobby();
        }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, hasVisibleBones = false;
    for (const s of r.SEGMENTS) {
      const b = bodies[s]; if (!b || !b.isEnabled()) continue;
      const sPos = projectWorldToScreen(b.translation(), cam, g); if (!sPos) continue;
      hasVisibleBones = true;
      minX = Math.min(minX, sPos.x); minY = Math.min(minY, sPos.y); maxX = Math.max(maxX, sPos.x); maxY = Math.max(maxY, sPos.y);
    }

    if (hasVisibleBones && state.espEnabled) {
      const pad = 12, bx = minX - pad, by = minY - pad, bw = (maxX - minX) + pad * 2, bh = (maxY - minY) + pad * 2;
      if (state.boxEsp) { ctx.strokeStyle = '#000000'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh); ctx.strokeStyle = '#97b621'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh); }
      if (state.skeletonEsp) {
        const joints = [['head','torso','neck'], ['torso','pelvis','waist'], ['torso','armL','shoulderL'], ['armL','foreL','elbowL'], ['torso','armR','shoulderR'], ['armR','foreR','elbowR'], ['pelvis','legL','hipL'], ['pelvis','legR','hipR']];
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        for (const [p1, p2, j] of joints) {
          if (!r.isSevered(j) && bodies[p1]?.isEnabled() && bodies[p2]?.isEnabled()) {
            const pt1 = projectWorldToScreen(bodies[p1].translation(), cam, g); const pt2 = projectWorldToScreen(bodies[p2].translation(), cam, g);
            if (pt1 && pt2) { ctx.beginPath(); ctx.moveTo(pt1.x, pt1.y); ctx.lineTo(pt2.x, pt2.y); ctx.stroke(); }
          }
        }
      }
      if (state.nameEsp) { ctx.font = '10px Tahoma, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText('Wumpus', (minX + maxX) / 2, minY - 16); }
      if (state.healthEsp) {
          ctx.fillStyle = '#000'; ctx.fillRect(bx - 6, by - 1, 4, bh + 2);
          ctx.fillStyle = '#97b621'; ctx.fillRect(bx - 5, by, 2, bh);
      }
      if (state.flagsEsp) {
        ctx.font = '9px Tahoma, sans-serif'; ctx.textAlign = 'left'; let fy = minY + 4;
        const addFlag = (text, color) => { ctx.fillStyle = color; ctx.fillText(text, maxX + 16, fy); fy += 11; };
        if (r.standing) addFlag('STANDING', '#97b621'); if (r.limp) addFlag('LIMP', '#e8505b');
        let severedCount = 0; for (const j of ['neck', 'waist', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR']) { if (r.isSevered(j)) severedCount++; }
        if (severedCount > 0) addFlag(`SEVERED: ${severedCount}`, '#50b0e8');
      }
    }

    if (state.indicators) {
      const ix = 24, iy = window.innerHeight - 80; ctx.font = 'bold 24px Tahoma, sans-serif'; ctx.textAlign = 'left'; let offset = 0;
      if (state.aimbotEnabled) { ctx.fillStyle = '#97b621'; ctx.fillText('RAGE', ix, iy + offset); offset += 26; }
      if (state.antiAimEnabled) { ctx.fillStyle = '#e8505b'; ctx.fillText('MANIPULATION', ix, iy + offset); offset += 26; }
      if (state.walkEnabled || state.noclipEnabled) { ctx.fillStyle = '#50b0e8'; ctx.fillText('MOVEMENT', ix, iy + offset); }
    }

    for (let i = runtime.hitlogs.length - 1; i >= 0; i--) {
      const hm = runtime.hitlogs[i]; hm.life--; hm.alpha = hm.life / 40; hm.y -= 0.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${hm.alpha})`; ctx.lineWidth = 1.2; const s = 5;
      ctx.beginPath(); ctx.moveTo(hm.x - s, hm.y - s); ctx.lineTo(hm.x + s, hm.y + s); ctx.moveTo(hm.x + s, hm.y - s); ctx.lineTo(hm.x - s, hm.y + s); ctx.stroke();
      ctx.font = 'bold 11px Tahoma, sans-serif'; ctx.fillStyle = `rgba(151, 182, 33, ${hm.alpha})`; ctx.textAlign = 'left'; ctx.fillText(`-${hm.dmg}`, hm.x + 8, hm.y - 2);
      if (hm.life <= 0) runtime.hitlogs.splice(i, 1);
    }
    
    // Handle 3rd Person & FOV safely via render hook
    if (g.renderer && !window.__SK_ORIG_RENDER__) {
        window.__SK_ORIG_RENDER__ = g.renderer.render;
        g.renderer.render = function(scene, camera) {
            if (state.thirdPerson && g.ragdoll && g.ragdoll.bodies.torso) {
                const torsoPos = g.ragdoll.bodies.torso.translation();
                const r = runtime.camAngles.radius;
                const cx = torsoPos.x + r * Math.sin(runtime.camAngles.phi) * Math.sin(runtime.camAngles.theta);
                const cy = torsoPos.y + r * Math.cos(runtime.camAngles.phi);
                const cz = torsoPos.z + r * Math.sin(runtime.camAngles.phi) * Math.cos(runtime.camAngles.theta);
                
                camera.position.set(cx, cy, cz);
                camera.lookAt(torsoPos.x, torsoPos.y, torsoPos.z);
                camera.updateMatrixWorld(true);
            }
            if (state.camFov !== 34) {
                if (camera.fov !== state.camFov) { camera.fov = state.camFov; camera.updateProjectionMatrix(); }
            } else {
                if (camera.fov !== 34) { camera.fov = 34; camera.updateProjectionMatrix(); }
            }
            window.__SK_ORIG_RENDER__.call(this, scene, camera);
        };
    }
    
    drawRenderQueue();
  }

  function drawRenderQueue() {
    runtime.renderQueue.forEach(cmd => {
        if (cmd.type === 'grad') {
            const grad = cmd.vertical ? ctx.createLinearGradient(cmd.x, cmd.y, cmd.x, cmd.y+cmd.h) : ctx.createLinearGradient(cmd.x, cmd.y, cmd.x+cmd.w, cmd.y);
            grad.addColorStop(0, `rgba(${cmd.r1},${cmd.g1},${cmd.b1},${cmd.a1/255})`);
            grad.addColorStop(1, `rgba(${cmd.r2},${cmd.g2},${cmd.b2},${cmd.a2/255})`);
            ctx.fillStyle = grad; ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
            return;
        }
        ctx.fillStyle = `rgba(${cmd.r},${cmd.g},${cmd.b},${cmd.a/255})`; ctx.strokeStyle = `rgba(${cmd.r},${cmd.g},${cmd.b},${cmd.a/255})`;
        if (cmd.type === 'text') { ctx.font = '11px Tahoma, sans-serif'; ctx.fillText(cmd.txt, cmd.x, cmd.y); }
        else if (cmd.type === 'line') { ctx.lineWidth = cmd.w || 1; ctx.beginPath(); ctx.moveTo(cmd.x1, cmd.y1); ctx.lineTo(cmd.x2, cmd.y2); ctx.stroke(); }
        else if (cmd.type === 'rect') { ctx.lineWidth = 1; ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h); }
        else if (cmd.type === 'rectf') { ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h); }
        else if (cmd.type === 'circle') { ctx.beginPath(); ctx.arc(cmd.x, cmd.y, cmd.rad, 0, Math.PI * 2); ctx.stroke(); }
    });
  }

  const loopHandle = requestAnimationFrame(frameLoop);
  
  window.__SK_MOUSE_BTNS = {};
  window.addEventListener('mousemove', (e) => {
      window.__SK_MOUSE_X = e.clientX;
      window.__SK_MOUSE_Y = e.clientY;
      if (runtime.isDraggingCam) {
          runtime.camAngles.theta -= e.movementX * 0.01;
          runtime.camAngles.phi -= e.movementY * 0.01;
          runtime.camAngles.phi = Math.max(0.1, Math.min(Math.PI - 0.1, runtime.camAngles.phi));
      }
  });
  window.addEventListener('mousedown', (e) => { 
      window.__SK_MOUSE_BTNS[e.button] = true; 
      if (state.thirdPerson && e.button === 2) runtime.isDraggingCam = true;
      if (state.physgun && e.button === 1) { // Middle click
          const g = resolveGame();
          if (g && g.world) {
              const _T = g.THREE || window.THREE;
              const raycaster = new _T.Raycaster();
              const mouse = new _T.Vector2((e.clientX / window.innerWidth)*2-1, -(e.clientY/window.innerHeight)*2+1);
              raycaster.setFromCamera(mouse, g.camera);
              const hit = g.world.castRay(new g.RAPIER.Ray(raycaster.ray.origin, raycaster.ray.direction), 100, true);
              if (hit) {
                  const collider = g.world.getCollider(hit.collider);
                  if (collider && collider.parent()) {
                      runtime.physgunState.body = collider.parent();
                      runtime.physgunState.dist = hit.toi;
                  }
              }
          }
      }
  });
  window.addEventListener('mouseup', (e) => { 
      window.__SK_MOUSE_BTNS[e.button] = false; 
      if (e.button === 2) runtime.isDraggingCam = false;
      if (e.button === 1) runtime.physgunState.body = null;
  });
  window.addEventListener('contextmenu', (e) => {
      if (state.thirdPerson) e.preventDefault();
  });
  window.addEventListener('wheel', (e) => {
      if (state.thirdPerson) {
          runtime.camAngles.radius += e.deltaY * 0.01;
          runtime.camAngles.radius = Math.max(2, Math.min(100, runtime.camAngles.radius));
      }
  });

  // -------------------------------------------------------------------------
  // 7. CLEANUP
  // -------------------------------------------------------------------------
  window.__GAMESENSE_SKEET__ = {
    destroy: () => {
      cancelAnimationFrame(loopHandle); overlayCanvas.remove(); gui.remove(); style.remove(); window.removeEventListener('resize', resizeCanvas);
      if (window.__ORIG_EMIT__) { const g = resolveGame(); if(g?.events) g.events.emit = window.__ORIG_EMIT__; }
      if (window.__ORIG_WUMPUS_UPDATE__) { const g = resolveGame(); if(g?.wumpus) g.wumpus.update = window.__ORIG_WUMPUS_UPDATE__; }
    },
  };
  console.log('%c[gamesense]%c UI loaded.', 'color:#a4cb38;font-weight:bold;', 'color:#fff;');
})();
