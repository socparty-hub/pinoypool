/* ══════════════════ DATA ══════════════════ */
const PLAYERS = [];

const HALLS = [];

const STREAMS = [];

/* ══════════════════ STATE ══════════════════ */
const app = {
  user:null, fmt:'9-Ball', raceTo:5, matchType:'Tournament',
  scores:[0,0], matchOn:false,
  p1:'',p2:'', p1id:null, p2id:null,
  rackLog:[], confirmState:{p1:false,p2:false,venue:false},
  rankPeriod:'thismonth', rankFmt:'all'
};
const avcolors=['#1a3a22','#2d1a0a','#0e1f16','#1a1a3a','#2a1a1a','#1a2a3a','#3a1a22','#2a3a1a'];

/* ══════════════════ NAV ══════════════════ */
function toggleMobileNav(){
  const nav=document.getElementById('main-nav');
  const btn=document.getElementById('ham-btn');
  nav.classList.toggle('open');
  btn.classList.toggle('open');
}
function sv(id, btn){
  if(id==='match' && app.user?.role==='fan'){toast('⚠️ Record Match is not available for Scout/Fan accounts.');return;}
  if(id==='player-portal' && !app.user){toast('⚠️ Please log in to access your Player Portal.');openAuth();return;}
  // Close mobile nav on navigation
  document.getElementById('main-nav').classList.remove('open');
  document.getElementById('ham-btn').classList.remove('open');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('act'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('act'));
  const v=document.getElementById('view-'+id);
  if(v) v.classList.add('act');
  if(btn && btn.classList) btn.classList.add('act');
  if(id==='rankings') buildRankings();
  if(id==='halls') buildHalls();
  if(id==='portal') buildPortal();
  if(id==='live') buildLive();
  if(id==='player-portal') buildPlayerPortal();
  if(id==='admin') buildAdmin();
}

/* ══════════════════ AUTH ══════════════════ */
function openAuth(){document.getElementById('m-auth').classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}
function atab(t,btn){
  document.getElementById('al').style.display=t==='login'?'block':'none';
  document.getElementById('ar').style.display=t==='register'?'block':'none';
  document.querySelectorAll('#m-auth .tabbtn').forEach(b=>b.classList.remove('act'));
  if(btn) btn.classList.add('act');
  else document.querySelectorAll('#m-auth .tabbtn')[t==='login'?0:1].classList.add('act');
}
function selRole(card,role){
  document.querySelectorAll('.rc').forEach(c=>c.classList.remove('sel'));
  card.classList.add('sel');
  document.getElementById('rf-player').style.display=role==='player'?'block':'none';
  document.getElementById('rf-owner').style.display=role==='owner'?'block':'none';
}
function solo(btn){btn.closest('.tg').querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));btn.classList.add('act');}
function doLogin(){
  const e=document.getElementById('le').value.trim(),p=document.getElementById('lp').value;
  if(!e||!p){toast('⚠️ Enter your email and password.');return;}
  // ADMIN master login
  if(e.toUpperCase()==='ADMIN'&&p==='Liverpool!'){
    setUser({name:'Administrator',role:'admin',initials:'AD'});
    closeM('m-auth');
    toast('🔐 Welcome, <strong>Admin</strong>. Full system access granted.');
    setTimeout(()=>sv('admin',document.getElementById('nb-admin')),600);
    return;
  }
  const found=PLAYERS.find(pl=>pl.name.toLowerCase().includes(e.split('@')[0].toLowerCase()));
  const name=found?found.name:cap(e.split('@')[0].replace(/[._]/g,' '));
  setUser({name,role:'player',initials:getInit(name)});
  closeM('m-auth');
  toast(`✅ Welcome back, <strong>${name}</strong>!`);
}
function doRegister(){
  const fn=document.getElementById('rfn').value.trim(),ln=document.getElementById('rln').value.trim(),em=document.getElementById('rem').value.trim();
  const role=document.querySelector('.rc.sel')?.dataset.role||'player';
  const ph=document.getElementById('rph')?.value.trim()||'';
  const hn=document.getElementById('rhn')?.value.trim()||'';
  const rc=document.getElementById('rrc')?.value.trim()||'';
  const rci=document.getElementById('rrci')?.value.trim()||'';
  if(!fn||!ln){toast('⚠️ Fill in all required fields.');return;}
  const btn=document.getElementById('reg-submit-btn');
  if(btn){btn.disabled=true;btn.textContent='Submitting…';}
  fetch('/api/register',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({firstName:fn,lastName:ln,email:em,phone:ph,role,hallName:hn,city:rc,region:rci})
  })
  .then(r=>r.json())
  .then(data=>{
    if(btn){btn.disabled=false;btn.textContent='Create Account';}
    if(!data.ok){toast('⚠️ '+data.message);return;}
    closeM('m-auth');
    toast(`🎉 <strong>Registration submitted!</strong> Admin will review and activate your account within 24–48 hours.`);
  })
  .catch(()=>{
    if(btn){btn.disabled=false;btn.textContent='Create Account';}
    toast('⚠️ Could not connect. Please try again.');
  });
}
function setUser(u){
  app.user=u;

  // Header UI
  document.getElementById('btn-login').style.display='none';
  const ab=document.getElementById('auth-bar');ab.style.display='flex';
  document.getElementById('hdr-av').textContent=u.initials;
  document.getElementById('hdr-av').style.background=
    u.role==='admin'?'#3a0808':u.role==='owner'?'#2d1a0a':u.role==='fan'?'#1a1a3a':'#1a3a22';
  document.getElementById('hdr-name').textContent=u.name;

  // Role badge
  const roleLabels={player:'🎱 Player',owner:'🏢 Hall Owner',fan:'👁 Scout/Fan',admin:'⚙️ Admin'};
  let rb=document.getElementById('hdr-role');
  if(!rb){rb=document.createElement('span');rb.id='hdr-role';rb.style.cssText='font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;padding:2px 7px;border-radius:4px;';ab.insertBefore(rb,ab.querySelector('button'));}
  rb.textContent=roleLabels[u.role]||u.role;
  rb.style.background=u.role==='admin'?'rgba(184,50,40,.25)':u.role==='owner'?'rgba(200,100,20,.2)':u.role==='fan'?'rgba(90,60,180,.2)':'rgba(31,140,78,.15)';
  rb.style.color=u.role==='admin'?'#e55':u.role==='owner'?'#e8a040':u.role==='fan'?'#bb8fce':'var(--grn3)';
  rb.style.border='1px solid '+(u.role==='admin'?'rgba(184,50,40,.45)':u.role==='owner'?'rgba(200,100,20,.3)':u.role==='fan'?'rgba(90,60,180,.3)':'rgba(31,140,78,.3)');

  // Nav visibility by role
  const nbMatch=document.getElementById('nb-match');
  const nbPortal=document.getElementById('nb-portal');
  const nbPP=document.getElementById('nb-player-portal');
  const nbAdmin=document.getElementById('nb-admin');
  // Hide everything first, then show per role
  [nbMatch,nbPortal,nbPP,nbAdmin].forEach(b=>{if(b)b.style.display='none';});
  if(u.role==='admin'){
    if(nbAdmin) nbAdmin.style.display='inline-block';
  } else if(u.role==='fan'){
    // fan sees nothing extra
  } else if(u.role==='owner'){
    if(nbMatch) nbMatch.style.display='inline-block';
    if(nbPortal) nbPortal.style.display='inline-block';
  } else {
    // player
    if(nbMatch) nbMatch.style.display='inline-block';
    if(nbPP) nbPP.style.display='inline-block';
  }

  // Role-specific prefills for Record Match
  if(u.role==='player'){
    const inp=document.getElementById('p1-inp');
    inp.value=u.name; app.p1=u.name;
    const found=PLAYERS.find(p=>p.name===u.name);
    if(found){app.p1id=found.id;const _dp1=document.getElementById('dp1');if(_dp1)_dp1.textContent=u.name.split(' ')[0];}
    inp.readOnly=true;
    inp.style.color='var(--gold)';
    inp.style.cursor='default';
  } else if(u.role==='owner'){
    const venSel=document.getElementById('sel-venue');
    if(u.hall){
      let found=false;
      for(let opt of venSel.options){if(opt.text.startsWith(u.hall)){opt.selected=true;found=true;break;}}
      if(!found){const o=new Option(u.hall+' – (Your Hall)',u.hall,true,true);venSel.prepend(o);}
      venSel.disabled=true;
      venSel.style.color='var(--gold)';
    }
  }

  // Pending challenge notice for players only
  if(u.role==='player') showPendNotice();
}
function logout(){
  app.user=null;
  document.getElementById('btn-login').style.display='inline-flex';
  document.getElementById('auth-bar').style.display='none';
  ['nb-portal','nb-player-portal','nb-admin'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('nb-match').style.display='inline-block';
  document.getElementById('pend-area').innerHTML='';
  const rb=document.getElementById('hdr-role');if(rb)rb.remove();
  const inp=document.getElementById('p1-inp');
  inp.value='';inp.readOnly=false;inp.style.color='';inp.style.cursor='';
  app.p1='';app.p1id=null;
  const venSel=document.getElementById('sel-venue');
  venSel.disabled=false;venSel.style.color='';venSel.selectedIndex=0;
  sv('dashboard',document.querySelector('.nb'));
  toast('👋 Logged out.');
}

/* ══════════════════ AUTOCOMPLETE ══════════════════ */
function acSearch(inpId, listId){
  const val=document.getElementById(inpId).value.trim().toLowerCase();
  const list=document.getElementById(listId);
  if(val.length<2){list.classList.remove('open');return;}
  const other=inpId==='p1-inp'?app.p2:app.p1;
  const results=PLAYERS.filter(p=>p.name.toLowerCase().includes(val)&&p.name!==other);
  if(!results.length){list.classList.remove('open');return;}
  list.innerHTML=results.map(p=>`
    <div class="ac-item" onclick="selectPlayer(${p.id},'${inpId}','${listId}')">
      <div class="ac-av" style="background:${p.colors}">${getInit(p.name)}</div>
      <div>
        <div style="font-weight:600;">${p.name}</div>
        <div style="font-size:.68rem;color:var(--chalk);">${p.region} · <span class="${p.fmt==='9-Ball'?'tag tn':'tag tt'}">${p.fmt}</span></div>
      </div>
      <div class="ac-rank">#${p.rank}</div>
    </div>`).join('');
  list.classList.add('open');
}
function selectPlayer(id,inpId,listId){
  const p=PLAYERS.find(x=>x.id===id);
  document.getElementById(inpId).value=p.name;
  document.getElementById(listId).classList.remove('open');
  if(inpId==='p1-inp'){app.p1=p.name;app.p1id=id;const _dpx1=document.getElementById('dp1');if(_dpx1)_dpx1.textContent=p.name.split(' ')[0];}
  else{app.p2=p.name;app.p2id=id;const _dpx2=document.getElementById('dp2');if(_dpx2)_dpx2.textContent=p.name.split(' ')[0];}
}

// Close autocomplete on outside click
document.addEventListener('click',e=>{
  if(!e.target.closest('.ac-wrap')) document.querySelectorAll('.ac-list').forEach(l=>l.classList.remove('open'));
});

/* ══════════════════ HANDICAP ══════════════════ */
// State: rack hcp (+0 to +5), ball hcp (Set of ball numbers)
const hcpState = {
  rack: [0, 0],     // [p1, p2]
  balls: [new Set(), new Set()]  // [p1 selected balls, p2 selected balls]
};

function buildBallGrid(p) {
  const gridId = `p${p}-ball-grid`;
  const grid = document.getElementById(gridId);
  if (!grid) return;
  // 9-ball: 3–8, 10-ball: 3–9
  const maxBall = app.fmt === '10-Ball' ? 9 : 8;
  // Clear selections that are now out of range
  [...hcpState.balls[p-1]].forEach(b => { if (b > maxBall) hcpState.balls[p-1].delete(b); });
  grid.innerHTML = '';
  for (let b = 3; b <= maxBall; b++) {
    const btn = document.createElement('button');
    btn.className = 'ball-btn' + (hcpState.balls[p-1].has(b) ? ' sel' : '');
    btn.dataset.ball = b;
    btn.innerHTML = `<span class="ball-num">${b}</span>`;
    btn.title = `Ball ${b}`;
    btn.onclick = () => toggleBall(btn, p, b);
    grid.appendChild(btn);
  }
}

function toggleBall(btn, p, ball) {
  const s = hcpState.balls[p-1];
  if (s.has(ball)) { s.delete(ball); btn.classList.remove('sel'); }
  else { s.add(ball); btn.classList.add('sel'); }
  updateHcpMutex();
  updateHcpDisplay(p);
  updateDots();
}

// Apply handicap pre-load — no-op in v9 (scoreboard removed)
function applyHandicapScores() {}

function setRackHcp(btn, p) {
  const row = document.getElementById(`p${p}-rack-row`);
  row.querySelectorAll('.rhcp-btn').forEach(b => b.classList.remove('act'));
  btn.classList.add('act');
  hcpState.rack[p-1] = parseInt(btn.dataset.val) || 0;
  // Mutual exclusivity: if this player has any handicap, hide the other player's handicap area
  updateHcpMutex();
  updateHcpDisplay(p);
  updateDots();
  // If match already started, apply pre-loaded score immediately
  if (app.matchOn) applyHandicapScores();
}

// Mutual exclusivity: only one player can have handicap at a time
function updateHcpMutex() {
  const r1 = hcpState.rack[0], r2 = hcpState.rack[1];
  const b1 = hcpState.balls[0].size, b2 = hcpState.balls[1].size;
  const p1HasHcp = r1 > 0 || b1 > 0;
  const p2HasHcp = r2 > 0 || b2 > 0;
  // Hide opponent's handicap section if the other player already has one
  const p2area = document.getElementById('p2-hcp-area-wrap');
  const p1area = document.getElementById('p1-hcp-area');
  if (p2area) p2area.style.display = p1HasHcp ? 'none' : 'block';
  if (p1area) p1area.style.display = p2HasHcp ? 'none' : 'block';
}

function updateHcpDisplay(p) {
  const rv = hcpState.rack[p-1];
  const bv = hcpState.balls[p-1];
  const box = document.getElementById(`p${p}-hcp-box`);
  const hd = document.getElementById(`hd${p}`);
  if (rv === 0 && bv.size === 0) {
    box.style.display = 'none';
    hd.innerHTML = '';
    return;
  }
  let rows = '';
  if (rv > 0) {
    rows += `<div class="hcp-row"><span class="hcp-key">Rack Handicap</span><span class="hcp-val">Starts at ${rv} — ${rv} racks pre-credited</span></div>`;
    rows += `<div class="hcp-row"><span class="hcp-key">Race Target</span><span class="hcp-val">Still race to ${app.raceTo} (unchanged)</span></div>`;
  }
  if (bv.size > 0) {
    const sorted = [...bv].sort((a,b)=>a-b);
    const ballLabel = sorted.length === 1 ? `${sorted[0]} last ball` : `${sorted.join(', ')} last balls`;
    rows += `<div class="hcp-row"><span class="hcp-key">Last Balls</span><span class="hcp-val">${ballLabel} per rack</span></div>`;
  }
  box.innerHTML = rows; box.style.display = 'block';
  let badges = '';
  if (rv > 0) badges += `<span class="tag thc" style="display:inline-block;margin:2px 2px 0;">+${rv} racks</span>`;
  if (bv.size > 0) {
    const sorted = [...bv].sort((a,b)=>a-b);
    const ballLabel = sorted.length === 1 ? `${sorted[0]} last ball` : `${sorted.join(',')} last balls`;
    badges += `<span class="tag thc" style="display:inline-block;margin:2px 2px 0;">${ballLabel}</span>`;
  }
  hd.innerHTML = badges;
}

/* ══════════════════ RACE TO ══════════════════ */
function buildRaceRow(){
  const row=document.getElementById('race-row');
  row.innerHTML='';
  for(let i=5;i<=25;i++){
    const btn=document.createElement('button');
    btn.className='race-btn'+(i===5?' act':'');
    btn.textContent=i;
    btn.onclick=()=>{
      document.querySelectorAll('.race-btn').forEach(b=>b.classList.remove('act'));
      btn.classList.add('act');
      app.raceTo=i;
      updateBadge();
      updateDots();
      updateHcpDisplay(1);
      updateHcpDisplay(2);
    };
    row.appendChild(btn);
  }
}

/* ══════════════════ MATCH ══════════════════ */
function setMatchType(btn,type){
  app.matchType=type;
  btn.parentElement.querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  updateBadge();
}
function setF(btn,fmt){
  app.fmt=fmt;
  btn.parentElement.querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  updateBadge();
  // Rebuild ball grids for new format
  buildBallGrid(1); buildBallGrid(2);
}
function updateBadge(){
  // Update stream panel meta if visible
  const sm=document.getElementById('stream-meta');
  if(sm) sm.textContent=`${app.fmt} · Race to ${app.raceTo} · ${app.matchType}`;
  const sp=document.getElementById('stream-p1p2');
  if(sp&&app.p1&&app.p2) sp.textContent=`${app.p1} vs ${app.p2}`;
}

function sendChallenge(){
  if(!app.p1||!app.p1id){toast('⚠️ Select Player 1 from the registered players list.');return;}
  if(!app.p2||!app.p2id){toast('⚠️ Select Player 2 from the registered players list.');return;}
  if(app.p1id===app.p2id){toast('⚠️ Players must be different.');return;}
  const venue=document.getElementById('sel-venue').value;
  if(!venue){toast('⚠️ Select a venue.');return;}
  sDone(1);sAct(2);
  toast(`📨 Challenge sent to <strong>${app.p2.split(' ')[0]}</strong>. Waiting for acceptance…`);
  setTimeout(()=>{
    toast(`✅ <strong>${app.p2.split(' ')[0]}</strong> accepted! Proceed to stream setup.`);
    sDone(2);sAct(3);
    showStreamPanel();
  },2200);
}

function showStreamPanel(){
  document.getElementById('match-setup-panel').style.display='none';
  document.getElementById('match-stream-panel').style.display='block';
  document.getElementById('match-confirm-panel').style.display='none';
  // Update the match pill
  document.getElementById('stream-p1p2').textContent=`${app.p1} vs ${app.p2}`;
  document.getElementById('stream-meta').textContent=`${app.fmt} · Race to ${app.raceTo} · ${app.matchType}`;
}

function shareStreamV3(){
  const url=document.getElementById('stream-url-v3').value.trim();
  if(!url||!url.startsWith('http')){toast('⚠️ Enter a valid stream URL.');return;}
  const prev=document.getElementById('stream-preview-v3');
  const platform=url.includes('youtube')||url.includes('youtu.be')?'YouTube':'FB Live';
  prev.style.display='block';
  prev.innerHTML=`📡 <strong>${platform}</strong> · ${url}`;
  toast(`📡 Stream link shared on Live Now!`);
  STREAMS.unshift({player:app.p1||'You',opp:app.p2||'Opponent',fmt:app.fmt,venue:document.getElementById('sel-venue').value||'',viewers:0,url,platform,live:true});
}

function proceedToConfirm(){
  sDone(3);sAct(4);
  document.getElementById('match-setup-panel').style.display='none';
  document.getElementById('match-stream-panel').style.display='none';
  document.getElementById('match-confirm-panel').style.display='block';
  // Init confirm score panel
  app.csScores=[0,0];
  const p1n=app.p1.split(' ')[0]||'Player 1';
  const p2n=app.p2.split(' ')[0]||'Player 2';
  document.getElementById('cs-p1-name').textContent=p1n;
  document.getElementById('cs-p2-name').textContent=p2n;
  document.getElementById('cs-raceto').innerHTML=`<strong style="color:var(--gold);">Race to ${app.raceTo}</strong><br><span style="font-size:.58rem;color:var(--chalk2);">Max ${app.raceTo} racks</span>`;
  document.getElementById('cs-s1').textContent='0';
  document.getElementById('cs-s2').textContent='0';
  document.getElementById('cs-s1').style.color='var(--gold)';
  document.getElementById('cs-s2').style.color='var(--gold)';
  document.getElementById('cs-actions').style.display='block';
  document.getElementById('cs-waiting').style.display='none';
  // Reset chain icons
  [1,2,3].forEach(n=>setChain(n,'wait',n===1?'You':'Pending'));

  // Build rich handicap breakdown
  const r1=hcpState.rack[0],r2=hcpState.rack[1];
  const b1=hcpState.balls[0],b2=hcpState.balls[1];
  const hasHcp = r1>0||r2>0||b1.size>0||b2.size>0;
  const hcpEl=document.getElementById('cs-hcp-note');
  if(hasHcp){
    let rows='';
    if(r1>0) rows+=`<div style="display:flex;justify-content:space-between;"><span style="color:var(--chalk);">Rack Hcp → ${p1n}</span><span style="color:#e55;font-weight:600;">+${r1} racks head start</span></div>`;
    if(r2>0) rows+=`<div style="display:flex;justify-content:space-between;"><span style="color:var(--chalk);">Rack Hcp → ${p2n}</span><span style="color:#e55;font-weight:600;">+${r2} racks head start</span></div>`;
    if(b1.size>0){const s=[...b1].sort((a,b)=>a-b);rows+=`<div style="display:flex;justify-content:space-between;"><span style="color:var(--chalk);">Last Balls → ${p1n}</span><span style="color:#e55;font-weight:600;">${s.length===1?s[0]+' last ball':s.join(',')+' last balls'}</span></div>`;}
    if(b2.size>0){const s=[...b2].sort((a,b)=>a-b);rows+=`<div style="display:flex;justify-content:space-between;"><span style="color:var(--chalk);">Last Balls → ${p2n}</span><span style="color:#e55;font-weight:600;">${s.length===1?s[0]+' last ball':s.join(',')+' last balls'}</span></div>`;}
    hcpEl.style.display='block';
    hcpEl.innerHTML=`<div style="font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:#e55;margin-bottom:.4rem;">⚡ Handicap in Effect</div><div style="display:flex;flex-direction:column;gap:3px;font-size:.76rem;">${rows}</div>`;
  } else {
    hcpEl.style.display='none';
  }
  updateCsWinnerPreview();
}

function csAdj(p,delta){
  if(!app.csScores) app.csScores=[0,0];
  const maxScore = app.raceTo; // max racks = race to value
  app.csScores[p-1]=Math.max(0,Math.min(maxScore,(app.csScores[p-1]||0)+delta));
  document.getElementById(`cs-s${p}`).textContent=app.csScores[p-1];
  // Visual cap indicator
  const el=document.getElementById(`cs-s${p}`);
  el.style.color = app.csScores[p-1]===maxScore ? 'var(--grn3)' : 'var(--gold)';
  updateCsWinnerPreview();
}

function updateCsWinnerPreview(){
  const s1=app.csScores?.[0]||0, s2=app.csScores?.[1]||0;
  const el=document.getElementById('cs-winner-preview');
  if(s1===0&&s2===0){el.style.display='none';return;}
  if(s1===s2){
    el.style.display='block';
    el.style.background='rgba(184,50,40,.08)';el.style.borderColor='rgba(184,50,40,.3)';el.style.color='#e55';
    el.textContent=`⚠ Tied score (${s1}–${s2}) — not allowed. One player must win Race to ${app.raceTo}.`;
    return;
  }
  const wn=s1>s2?app.p1:app.p2;
  const maxS=Math.max(s1,s2), minS=Math.min(s1,s2);
  const isRaceWin = maxS === app.raceTo;
  el.style.display='block';
  el.style.background='rgba(31,140,78,.08)';el.style.borderColor='rgba(31,140,78,.25)';el.style.color='var(--grn3)';
  el.innerHTML=`🏆 <strong>${wn.split(' ')[0]}</strong> wins ${maxS}–${minS}${isRaceWin?' · Reached Race to '+app.raceTo:''}`;
}

function submitFinalScore(){
  const s1=app.csScores?.[0]||0, s2=app.csScores?.[1]||0;
  if(s1===0&&s2===0){toast('⚠️ Enter the final score before confirming.');return;}
  if(s1===s2){toast(`⚠️ Tied scores not allowed. Race to ${app.raceTo} — one player must win.`);return;}
  if(Math.max(s1,s2)>app.raceTo){toast(`⚠️ Max score is ${app.raceTo} (Race to ${app.raceTo}).`);return;}
  app.scores=[s1,s2];
  // Mark step 1 of chain
  document.getElementById('cs-actions').style.display='none';
  document.getElementById('cs-waiting').style.display='block';
  setChain(1,'done','Confirmed');
  setChain(2,'pending','Notified');
  setChain(3,'wait','Pending');
  toast('✅ Your score confirmed! Waiting for opponent…');
  // Simulate opponent + venue confirm
  setTimeout(()=>{
    setChain(2,'done','Confirmed');
    setChain(3,'pending','Notified');
    toast(`✅ ${app.p2.split(' ')[0]} confirmed the score!`);
    setTimeout(()=>{
      setChain(3,'done','Validated');
      toast('✅ Venue validated! Match is official. Rankings updated.');
      setTimeout(()=>finalizeMatch(),700);
    },2500);
  },1800);
}

function setChain(n,state,label){
  const icon=document.getElementById(`chain-${n}-icon`);
  const status=document.getElementById(`chain-${n}-status`);
  if(state==='done'){
    icon.style.background='rgba(31,140,78,.25)';icon.style.borderColor='rgba(31,140,78,.5)';icon.style.color='var(--grn3)';icon.textContent='✓';
    status.innerHTML=`<span style="color:var(--grn3);">${label}</span>`;
  } else if(state==='pending'){
    icon.style.background='rgba(200,168,75,.2)';icon.style.borderColor='rgba(200,168,75,.5)';icon.style.color='var(--gold)';icon.textContent=n;
    status.innerHTML=`<span style="color:var(--gold);">${label}</span>`;
  } else {
    icon.style.background='rgba(200,168,75,.07)';icon.style.borderColor='var(--border)';icon.style.color='var(--chalk)';icon.textContent=n;
    status.innerHTML=`<span style="color:var(--chalk2);">${label}</span>`;
  }
}

function disputeScore(){
  resetMatch();
  toast('⚠️ Score disputed. Match reset. Admin notified.');
}

function finalizeMatch(){
  sDone(4);sDone(5);
  const s1=app.scores[0],s2=app.scores[1];
  const wi=s1>s2?1:2;
  const wn=wi===1?app.p1:app.p2,ln=wi===1?app.p2:app.p1;
  document.getElementById('w-name').textContent=wn+' Wins!';
  document.getElementById('w-detail').textContent=`${wn} defeated ${ln} ${app.scores[wi-1]}–${app.scores[2-wi]} in ${app.fmt}`;
  document.getElementById('m-winner').classList.add('open');
  const lc=document.getElementById('dash-log');
  const e=document.createElement('div');
  e.className=`le ${wi===1?'lw':'ll'}`;
  e.innerHTML=`<div><div style="font-weight:600;">${app.p1} vs ${app.p2}</div><div style="font-size:.72rem;color:var(--chalk);margin-top:2px;"><span class="tag ${app.fmt==='9-Ball'?'tn':'tt'}">${app.fmt}</span> <span class="tag tgd">${app.matchType}</span> · <span class="tag tok">✓ Verified</span></div></div><div style="text-align:right;"><div style="font-family:'DM Mono',monospace;color:var(--gold);">${app.scores[0]} – ${app.scores[1]}</div><div style="font-size:.67rem;color:var(--chalk2);">Just now</div></div>`;
  lc.prepend(e);
}

function resetMatch(){
  app.scores=[0,0];app.matchOn=false;app.rackLog=[];app.csScores=[0,0];
  if(!app.user||app.user.role!=='player'){app.p1='';app.p1id=null;}
  app.p2='';app.p2id=null;
  hcpState.rack=[0,0];hcpState.balls=[new Set(),new Set()];
  if(document.getElementById('p2-inp')) document.getElementById('p2-inp').value='';
  // Restore both handicap sections
  const p1area=document.getElementById('p1-hcp-area');
  const p2area=document.getElementById('p2-hcp-area-wrap');
  if(p1area) p1area.style.display='block';
  if(p2area) p2area.style.display='block';
  // Reset rack hcp buttons
  [1,2].forEach(p=>{
    const row=document.getElementById(`p${p}-rack-row`);
    if(row) row.querySelectorAll('.rhcp-btn').forEach((b,i)=>{b.classList.toggle('act',i===0);});
  });
  buildBallGrid(1); buildBallGrid(2);
  // Show setup, hide other panels
  document.getElementById('match-setup-panel').style.display='block';
  document.getElementById('match-stream-panel').style.display='none';
  document.getElementById('match-confirm-panel').style.display='none';
  // Reset steps
  [1,2,3,4,5].forEach(i=>{const s=document.getElementById('s'+i);s.className='si'+(i===1?' act':'');s.querySelector('.snum').textContent=i;});
}

/* ══════════════════ STEP HELPERS ══════════════════ */
function sDone(n){const s=document.getElementById('s'+n);s.classList.remove('act');s.classList.add('done');s.querySelector('.snum').textContent='✓';}
function sAct(n){const s=document.getElementById('s'+n);s.classList.add('act');s.classList.remove('done');}

/* ══════════════════ RANKINGS ══════════════════ */
function setRankPeriod(btn,p){
  app.rankPeriod=p;
  document.querySelectorAll('.pt').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  buildRankings();
}
function setRankFmt(btn,f){
  app.rankFmt=f;
  btn.parentElement.querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');buildRankings();
}
function lbTab(btn,tab){
  document.querySelectorAll('.lb-tab').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  app.lbTab=tab;
  renderLbTab(tab);
}

/* ── Shared tier calculator ── */
function careerTier(mw,ml){
  const total=mw+ml; const wpct=Math.round(mw/(total||1)*100);
  if(wpct>=85&&total>=30) return{label:'Elite',   color:'var(--gold2)', bg:'rgba(200,168,75,.15)',border:'rgba(200,168,75,.4)'};
  if(wpct>=75&&total>=20) return{label:'Pro',     color:'#5dade2',      bg:'rgba(52,130,219,.12)',border:'rgba(52,130,219,.3)'};
  if(wpct>=60&&total>=15) return{label:'Semi-Pro',color:'#bb8fce',      bg:'rgba(140,80,190,.12)',border:'rgba(140,80,190,.3)'};
  if(wpct>=45&&total>=8)  return{label:'Skilled', color:'var(--grn3)',  bg:'rgba(31,140,78,.12)', border:'rgba(31,140,78,.3)'};
  return                         {label:'Amateur', color:'var(--chalk)', bg:'rgba(255,255,255,.05)',border:'rgba(255,255,255,.12)'};
}
function tierBadge(t){return`<span style="font-size:.65rem;padding:2px 8px;border-radius:4px;background:${t.bg};color:${t.color};border:1px solid ${t.border};white-space:nowrap;">${t.label}</span>`;}
function rankClass(i){return i===0?'lb-rank top1':i===1?'lb-rank top2':i===2?'lb-rank top3':'lb-rank';}

/* ── Generate rich player stats ── */
function genPlayerStats(p, mult){
  const m=mult||1;
  const seed=p.id*7;
  const mw=Math.max(1,Math.round(p.mw*m));
  const ml=Math.max(0,Math.round(p.ml*m));
  const rw=Math.max(1,Math.round(p.rw*m));
  const rl=Math.max(0,Math.round(p.rl*m));
  const hcpNum=parseInt(p.hcp)||0;
  // Synthetic per-discipline ratings (ELO-ish, 1000-1700 range)
  const baseRating=1000+Math.round((mw/(mw+ml||1))*500)+(rw/(rw+rl||1))*80;
  const r9=p.fmt==='9-Ball'?Math.round(baseRating+12):Math.round(baseRating*0.88);
  const r10=p.fmt==='10-Ball'?Math.round(baseRating+12):Math.round(baseRating*0.88);
  const overall=Math.round(r9*0.5+r10*0.5);
  // Match type breakdown
  const tW=Math.round(mw*0.35),tL=Math.round(ml*0.35);
  const mngW=Math.round(mw*0.45),mngL=Math.round(ml*0.45);
  const exW=mw-tW-mngW,exL=ml-tL-mngL;
  // Performance (last 20)
  const last20W=Math.min(mw,Math.round(12+(seed%5)));
  const last20L=20-last20W;
  const ratingChange=Math.round((last20W-last20L)*8+(seed%30)-15);
  // Streak
  const strN=1+(seed%6);
  const strW=(seed%3)!==0;
  // Hcp net
  const hcpGiven=hcpNum<0?Math.abs(hcpNum)*Math.round(mw*.3):0;
  const hcpTaken=hcpNum>0?hcpNum*Math.round(ml*.3):0;
  const hcpNet=hcpGiven-hcpTaken;
  // Avg margin
  const avgMargin=((rw-rl)/(mw+ml||1)).toFixed(1);
  // Peak rating
  const peak=Math.round(overall+20+(seed%80));
  // Avg opp rating
  const avgOpp=Math.round(1150+seed%200);
  // Activity (matches last 60 days)
  const activity=3+(seed%9);
  // SOS
  const sos=Math.round(1200+(seed%250));
  return{...p,mw,ml,rw,rl,r9,r10,overall,tW,tL,mngW,mngL,exW,exL,last20W,last20L,ratingChange,strN,strW,hcpGiven,hcpTaken,hcpNet,avgMargin:parseFloat(avgMargin),peak,avgOpp,activity,sos,hcpNum};
}

function buildRankings(){
  const periods={alltime:'All-Time',year:'2026',thismonth:'March 2026',lastmonth:'February 2026'};
  const badge=document.getElementById('rank-period-badge'); if(badge) badge.textContent='📅 '+periods[app.rankPeriod];
  const multipliers={alltime:1,year:.55,thismonth:.12,lastmonth:.1};
  app._rankMult = multipliers[app.rankPeriod]||1;
  app.lbTab = app.lbTab||'global';
  // Activate default tab
  const tabs=document.querySelectorAll('.lb-tab');
  tabs.forEach(b=>{if(b.onclick.toString().includes("'"+app.lbTab+"'"))b.classList.add('act');else b.classList.remove('act');});
  renderLbTab(app.lbTab);
}

function renderLbTab(tab){
  const m=app._rankMult||1;
  const data=PLAYERS.map(p=>genPlayerStats(p,m));
  const c=document.getElementById('lb-content');

  /* ── EMPTY STATE ── */
  if(data.length===0){
    c.innerHTML=`<div style="text-align:center;padding:3rem 1rem;color:var(--chalk);">
      <div style="font-size:2.5rem;margin-bottom:1rem;">🎱</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--gold);margin-bottom:.5rem;">No Players Ranked Yet</div>
      <div style="font-size:.82rem;line-height:1.6;">Rankings will appear here once players register and their matches are verified by admin.</div>
    </div>`;
    return;
  }

  /* ── GLOBAL LEADERBOARD ── */
  if(tab==='global'){
    const sorted=[...data].sort((a,b)=>b.overall-a.overall);
    c.innerHTML=`
    <div style="font-size:.72rem;color:var(--chalk);margin-bottom:.8rem;line-height:1.8;">
      Overall national ranking based on combined 9-Ball &amp; 10-Ball rating. Formula: <span style="font-family:'DM Mono',monospace;color:var(--gold);">(9B Rating × 0.5) + (10B Rating × 0.5)</span>
    </div>
    <div class="card" style="overflow-x:auto;padding:0;">
    <table class="rt" style="min-width:1100px;">
      <thead><tr>
        <th>PP Rank</th><th>Player</th><th>Career Status</th>
        <th>Overall Rating</th><th>Perf Rank</th>
        <th>Total Matches</th><th>Win%</th><th>Last Active</th>
      </tr></thead>
      <tbody>
        ${sorted.map((p,i)=>{
          const tier=careerTier(p.mw,p.ml);
          const wpct=Math.round(p.mw/(p.mw+p.ml||1)*100);
          const rank9=i+1+(p.fmt==='10-Ball'?2:0);
          const rank10=i+1+(p.fmt==='9-Ball'?2:0);
          const perfRank=i+1+(p.ratingChange<0?3:p.ratingChange>20?-1:0);
          const lastActive=['Today','Yesterday','2d ago','3d ago','5d ago','1w ago','2w ago'][Math.min(6,Math.floor(p.id%7))];
          return`<tr>
            <td><div class="${rankClass(i)}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div></td>
            <td><div class="pp"><div class="av" style="background:${p.colors||avcolors[i%8]}">${getInit(p.name)}</div>
              <div><div style="font-weight:600;">${p.name}</div>
              <div style="font-size:.62rem;color:var(--chalk);margin-top:1px;">${p.region}</div></div>
            </div></td>
            <td>${tierBadge(tier)}</td>
            <td><div class="rating-val">${p.overall}</div><div class="rating-sub">combined</div></td>
            <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;color:${perfRank<=3?'var(--gold)':'var(--chalk)'};">#${Math.max(1,perfRank)}</span></td>
            <td style="font-family:'DM Mono',monospace;">${p.mw+p.ml}</td>
            <td><div class="wrb"><div class="bt"><div class="bf" style="width:${wpct}%;"></div></div><span style="font-size:.72rem;">${wpct}%</span></div></td>
            <td style="font-size:.72rem;color:var(--chalk);">${lastActive}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

  /* ── PERFORMANCE LEADERBOARD ── */
  } else if(tab==='performance'){
    const sorted=[...data].sort((a,b)=>b.ratingChange-a.ratingChange);
    c.innerHTML=`
    <div style="font-size:.72rem;color:var(--chalk);margin-bottom:.8rem;">Who is 🔥 right now · Based on last 20 matches: rating change, win%, strength of schedule &amp; current streak.</div>
    <div class="card" style="overflow-x:auto;padding:0;">
    <table class="rt" style="min-width:980px;">
      <thead><tr>
        <th>Perf Rank</th><th>Player</th><th>Career Status</th>
        <th>Rating Δ (Last 20)</th><th>Win% (Last 20)</th>
        <th>Strength of Schedule</th><th>Current Streak</th><th>Activity Score</th>
      </tr></thead>
      <tbody>
        ${sorted.map((p,i)=>{
          const tier=careerTier(p.mw,p.ml);
          const l20pct=Math.round(p.last20W/20*100);
          const rcClass=p.ratingChange>0?'rc-up':p.ratingChange<0?'rc-dn':'rc-nt';
          const rcSign=p.ratingChange>0?'+':'';
          const streakHtml=p.strW?`<span class="streak-w">W${p.strN}</span>`:`<span class="streak-l">L${p.strN}</span>`;
          const actHtml=`<span class="act-dot"></span><span style="font-family:'DM Mono',monospace;font-size:.78rem;">${p.activity} matches / 60d</span>`;
          return`<tr>
            <td><div class="${rankClass(i)}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div></td>
            <td><div class="pp"><div class="av" style="background:${p.colors||avcolors[i%8]}">${getInit(p.name)}</div>
              <div><div style="font-weight:600;">${p.name}</div><div style="font-size:.62rem;color:var(--chalk);">${p.region}</div></div>
            </div></td>
            <td>${tierBadge(tier)}</td>
            <td><span class="${rcClass}" style="font-family:'DM Mono',monospace;font-size:.92rem;">${rcSign}${p.ratingChange}</span></td>
            <td><div class="wrb"><div class="bt"><div class="bf" style="width:${l20pct}%;"></div></div>${l20pct}% <span style="font-size:.65rem;color:var(--chalk2);">(${p.last20W}–${p.last20L})</span></div></td>
            <td><span style="font-family:'DM Mono',monospace;font-size:.75rem;">${p.sos}</span> <span style="font-size:.62rem;color:var(--chalk2);">avg opp</span></td>
            <td>${streakHtml}</td>
            <td>${actHtml}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

  /* ── HANDICAP PERFORMANCE ── */
  } else if(tab==='hcp'){
    // Aggregate handicap breakdown data
    const totalMW=data.reduce((s,p)=>s+p.mw,0);
    const totalML=data.reduce((s,p)=>s+p.ml,0);
    const hcpRows=[
      {cat:'Level Match',icon:'➖',impactColor:'var(--chalk)',impactBg:'rgba(255,255,255,.05)',
       rec:{w:38,l:25},wpct:60,rackGiven:0,rackRec:0,lbGiven:0,lbRec:0,
       impact:'Baseline Rating Movement',
       desc:'Neither player gives handicap. Pure performance rating.'},
      {cat:'Rack Advantage Given',icon:'🔥',impactColor:'var(--grn3)',impactBg:'rgba(31,140,78,.1)',
       rec:{w:20,l:7},wpct:74,rackGiven:1.6,rackRec:0,lbGiven:0,lbRec:0,
       impact:'Accelerated Rating Increase',
       desc:'Giving opponent extra racks and still winning → big rating gain.'},
      {cat:'Rack Advantage Received',icon:'⬇️',impactColor:'#5dade2',impactBg:'rgba(52,130,219,.08)',
       rec:{w:13,l:20},wpct:39,rackGiven:0,rackRec:1.5,lbGiven:0,lbRec:0,
       impact:'Slower Rating Growth',
       desc:'Receiving extra racks. Wins count for less; losses hurt more.'},
      {cat:'Last Ball Advantage Given',icon:'🚀',impactColor:'var(--gold)',impactBg:'rgba(200,168,75,.08)',
       rec:{w:9,l:4},wpct:69,rackGiven:0,rackRec:0,lbGiven:1.0,lbRec:0,
       impact:'Precision Skill Multiplier',
       desc:'Spotting last balls requires elite positioning. High reward.'},
      {cat:'Last Ball Advantage Received',icon:'⚠️',impactColor:'#e55',impactBg:'rgba(184,50,40,.08)',
       rec:{w:6,l:11},wpct:35,rackGiven:0,rackRec:0,lbGiven:0,lbRec:1.0,
       impact:'Minimal Gain / Higher Risk Drop',
       desc:'Receiving last ball spots. Difficult to gain rating this way.'},
    ];

    // Per-player hcp breakdown
    const playerHcpRows=data.slice(0,8).map((p,i)=>{
      const tier=careerTier(p.mw,p.ml);
      const wpct=Math.round(p.mw/(p.mw+p.ml||1)*100);
      const hcpNetSign=p.hcpNet>0?'+':'';
      const hcpNetColor=p.hcpNet>0?'var(--grn3)':p.hcpNet<0?'#e55':'var(--chalk2)';
      return`<tr>
        <td><div class="${rankClass(i)}">#${i+1}</div></td>
        <td><div class="pp"><div class="av" style="background:${p.colors||avcolors[i%8]}">${getInit(p.name)}</div>
          <div><div style="font-weight:600;">${p.name}</div><div style="font-size:.62rem;color:var(--chalk);">${p.region}</div></div>
        </div></td>
        <td>${tierBadge(tier)}</td>
        <td style="font-family:'DM Mono',monospace;font-size:.75rem;color:var(--grn3);">${p.hcpGiven||'—'}</td>
        <td style="font-family:'DM Mono',monospace;font-size:.75rem;color:#e55;">${p.hcpTaken||'—'}</td>
        <td><span style="font-family:'DM Mono',monospace;font-size:.82rem;color:${hcpNetColor};font-weight:600;">${hcpNetSign}${p.hcpNet}</span></td>
        <td><div class="wrb"><div class="bt"><div class="bf" style="width:${wpct}%;"></div></div>${wpct}%</div></td>
        <td style="font-size:.72rem;color:var(--chalk);">${p.avgMargin>0?'<span class="rc-up">+'+p.avgMargin+'</span>':'<span class="rc-dn">'+p.avgMargin+'</span>'}</td>
      </tr>`;
    }).join('');

    c.innerHTML=`
    <!-- Handicap Performance Breakdown -->
    <div class="card" style="margin-bottom:1.1rem;">
      <div class="ct">⚡ Handicap Performance Breakdown <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:400;text-transform:none;letter-spacing:0;color:var(--chalk);">Core rating adjustment categories</span></div>
      <p style="font-size:.76rem;color:var(--chalk);margin-bottom:1.1rem;line-height:1.7;">In Filipino billiards culture, handicap is central to match-making. This panel shows how different handicap types affect your PinoyPool rating. <strong style="color:var(--gold);">Winning while giving handicap accelerates rating gain. Winning only while receiving handicap slows growth.</strong></p>
      <div style="overflow-x:auto;">
      <table class="hcp-perf-tbl">
        <thead><tr>
          <th>Match Type</th><th>Record</th><th>Win%</th>
          <th>Avg Rack Adv Given</th><th>Avg Rack Adv Received</th>
          <th>Avg Last Ball Given</th><th>Avg Last Ball Received</th>
          <th>Rating Impact</th>
        </tr></thead>
        <tbody>
          ${hcpRows.map(r=>`<tr>
            <td>
              <div style="font-weight:600;font-size:.82rem;">${r.icon} ${r.cat}</div>
              <div style="font-size:.67rem;color:var(--chalk2);margin-top:2px;">${r.desc}</div>
            </td>
            <td><span class="wl-rec"><span style="color:var(--grn3);">${r.rec.w}</span>–<span style="color:#e55;">${r.rec.l}</span></span></td>
            <td><div class="wrb" style="min-width:70px;"><div class="bt"><div class="bf" style="width:${r.wpct}%;"></div></div>${r.wpct}%</div></td>
            <td style="text-align:center;font-family:'DM Mono',monospace;font-size:.78rem;color:${r.rackGiven>0?'var(--grn3)':'var(--chalk2)'};">${r.rackGiven>0?'+'+r.rackGiven:'0'}</td>
            <td style="text-align:center;font-family:'DM Mono',monospace;font-size:.78rem;color:${r.rackRec>0?'#e55':'var(--chalk2)'};">${r.rackRec>0?'+'+r.rackRec:'0'}</td>
            <td style="text-align:center;font-family:'DM Mono',monospace;font-size:.78rem;color:${r.lbGiven>0?'var(--gold)':'var(--chalk2)'};">${r.lbGiven>0?'+'+r.lbGiven:'0'}</td>
            <td style="text-align:center;font-family:'DM Mono',monospace;font-size:.78rem;color:${r.lbRec>0?'#e55':'var(--chalk2)'};">${r.lbRec>0?'+'+r.lbRec:'0'}</td>
            <td><span class="impact-pill" style="background:${r.impactBg};color:${r.impactColor};border:1px solid ${r.impactColor==='var(--chalk)'?'rgba(170,164,144,.3)':r.impactColor==='var(--gold)'?'rgba(200,168,75,.4)':r.impactColor==='var(--grn3)'?'rgba(46,204,113,.3)':r.impactColor};">${r.impact}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>

    <!-- Player handicap breakdown table -->
    <div class="card" style="overflow-x:auto;padding:0;">
      <div class="ct" style="padding:1.4rem 1.4rem 0;">🎱 Player Handicap Stats</div>
      <table class="rt" style="min-width:820px;">
        <thead><tr>
          <th>Rank</th><th>Player</th><th>Status</th>
          <th>Hcp Given</th><th>Hcp Taken</th><th>Hcp Net</th>
          <th>Win%</th><th>Avg Rack Margin</th>
        </tr></thead>
        <tbody>${playerHcpRows}</tbody>
      </table>
    </div>`;

  /* ── EXPANDED DESKTOP LEADERBOARD ── */
  } else if(tab==='expanded'){
    const sorted=[...data].sort((a,b)=>b.overall-a.overall);
    c.innerHTML=`
    <div style="font-size:.72rem;color:var(--chalk);margin-bottom:.8rem;line-height:1.8;">
      Full combined leaderboard — all metrics in one view. Best viewed on desktop.
      <span style="color:var(--chalk2);font-size:.65rem;"> PP=Overall · 9B/10B=Discipline · Perf=Form Rank · T/M/E=Tournament/Money/Exhibition · Hcp Net=Hcp Given minus Taken</span>
    </div>
    <div class="card" style="overflow-x:auto;padding:0;">
    <table class="rt" style="min-width:1600px;">
      <thead>
        <tr>
          <th>PP</th>
          <th>Player</th>
          <th>Status</th>
          <th>Overall</th>
          <th>9B</th>
          <th>10B</th>
          <th>Perf</th>
          <th>Matches</th>
          <th>Win%</th>
          <th>Tournament</th>
          <th>Money Game</th>
          <th>Exhibition</th>
          <th>Hcp Net</th>
          <th>Avg Margin</th>
          <th>Peak Rank</th>
          <th>Activity</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((p,i)=>{
          const tier=careerTier(p.mw,p.ml);
          const wpct=Math.round(p.mw/(p.mw+p.ml||1)*100);
          const perfRank=Math.max(1,i+1+(p.ratingChange<0?3:p.ratingChange>20?-1:0));
          const hcpNet=p.hcpNet;
          const hcpNetColor=hcpNet>0?'var(--grn3)':hcpNet<0?'#e55':'var(--chalk2)';
          const hcpNetSign=hcpNet>0?'+':'';
          const marginColor=p.avgMargin>0?'var(--grn3)':'#e55';
          const peak='#'+(i+1);
          const actColor=p.activity>=8?'var(--grn3)':p.activity>=5?'var(--gold)':'var(--chalk2)';
          return`<tr>
            <td><div class="${rankClass(i)}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div></td>
            <td><div class="pp"><div class="av" style="background:${p.colors||avcolors[i%8]};width:28px;height:28px;font-size:.7rem;">${getInit(p.name)}</div>
              <div><div style="font-weight:600;font-size:.82rem;">${p.name}</div>
              <div style="font-size:.6rem;color:var(--chalk);">${p.region}</div></div>
            </div></td>
            <td>${tierBadge(tier)}</td>
            <td><span style="font-family:'DM Mono',monospace;font-size:.88rem;color:var(--gold);font-weight:600;">${p.overall}</span></td>
            <td><span style="font-family:'DM Mono',monospace;font-size:.8rem;">${p.r9}</span></td>
            <td><span style="font-family:'DM Mono',monospace;font-size:.8rem;">${p.r10}</span></td>
            <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--chalk);">#${perfRank}</span></td>
            <td style="font-family:'DM Mono',monospace;">${p.mw+p.ml}</td>
            <td><div class="wrb" style="min-width:60px;"><div class="bt"><div class="bf" style="width:${wpct}%;"></div></div>${wpct}%</div></td>
            <td><span class="wl-rec"><span style="color:var(--grn3);">${p.tW}</span>–<span style="color:#e55;">${p.tL}</span></span></td>
            <td><span class="wl-rec"><span style="color:var(--grn3);">${p.mngW}</span>–<span style="color:#e55;">${p.mngL}</span></span></td>
            <td><span class="wl-rec"><span style="color:var(--grn3);">${p.exW}</span>–<span style="color:#e55;">${p.exL}</span></span></td>
            <td><span style="font-family:'DM Mono',monospace;color:${hcpNetColor};font-weight:600;">${hcpNetSign}${hcpNet}</span></td>
            <td><span style="color:${marginColor};font-family:'DM Mono',monospace;">${p.avgMargin>0?'+':''}${p.avgMargin}</span></td>
            <td><span style="font-size:.72rem;color:var(--gold);">${peak}</span></td>
            <td><span style="font-size:.7rem;color:${actColor};font-family:'DM Mono',monospace;">${p.activity}/60d</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>

    <!-- Match Type Breakdown -->
    <div class="card" style="margin-top:1.1rem;">
      <div class="ct">📊 Match Type Breakdown — National Aggregate</div>
      <div style="font-size:.74rem;color:var(--chalk);margin-bottom:1rem;line-height:1.7;">
        <strong style="color:var(--gold);">Tournament</strong> = Prestige · <strong style="color:var(--gold);">Money Game</strong> = Street credibility · <strong style="color:var(--gold);">Exhibition</strong> = Consistency & showcase
      </div>
      <div style="overflow-x:auto;">
      <table class="hcp-perf-tbl">
        <thead><tr>
          <th>Match Type</th><th>Matches</th><th>Win%</th>
          <th>Avg Opponent Rating</th><th>Rating Contribution</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><span style="font-size:.9rem;">🏆</span> <strong>Tournament</strong><div style="font-size:.67rem;color:var(--chalk2);">Highest prestige matches</div></td>
            <td style="font-family:'DM Mono',monospace;">32</td>
            <td><div class="wrb" style="min-width:70px;"><div class="bt"><div class="bf" style="width:66%;"></div></div>66%</div></td>
            <td style="font-family:'DM Mono',monospace;">1340</td>
            <td><span style="color:var(--grn3);font-family:'DM Mono',monospace;font-weight:600;">+140</span></td>
          </tr>
          <tr>
            <td><span style="font-size:.9rem;">💰</span> <strong>Money Game</strong><div style="font-size:.67rem;color:var(--chalk2);">Street credibility · High volume</div></td>
            <td style="font-family:'DM Mono',monospace;">45</td>
            <td><div class="wrb" style="min-width:70px;"><div class="bt"><div class="bf" style="width:58%;"></div></div>58%</div></td>
            <td style="font-family:'DM Mono',monospace;">1290</td>
            <td><span style="color:var(--grn3);font-family:'DM Mono',monospace;font-weight:600;">+85</span></td>
          </tr>
          <tr>
            <td><span style="font-size:.9rem;">🎱</span> <strong>Exhibition</strong><div style="font-size:.67rem;color:var(--chalk2);">Consistency & showcase performance</div></td>
            <td style="font-family:'DM Mono',monospace;">12</td>
            <td><div class="wrb" style="min-width:70px;"><div class="bt"><div class="bf" style="width:72%;"></div></div>72%</div></td>
            <td style="font-family:'DM Mono',monospace;">1260</td>
            <td><span style="color:var(--grn3);font-family:'DM Mono',monospace;font-weight:600;">+40</span></td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>`;

  /* ── ADVANCED METRICS ── */
  } else if(tab==='advanced'){
    const sorted=[...data].sort((a,b)=>b.overall-a.overall);
    c.innerHTML=`
    <div style="font-size:.72rem;color:var(--chalk);margin-bottom:.8rem;line-height:1.8;">
      Advanced performance metrics for serious analysis. <span style="color:var(--chalk2);">Consistency, dominance, clutch performance &amp; career arc.</span>
    </div>

    <!-- Advanced Metrics Table -->
    <div class="card" style="overflow-x:auto;padding:0;margin-bottom:1.1rem;">
      <div class="ct" style="padding:1.4rem 1.4rem .8rem;">🔬 Advanced Player Metrics</div>
      <table class="rt" style="min-width:1200px;">
        <thead>
          <tr>
            <th>PP Rank</th>
            <th>Player</th>
            <th>Status</th>
            <th title="Highest rated player defeated">Biggest Upset</th>
            <th title="Weighted rack margin × match quality">Dominance Index</th>
            <th title="Win% in hill-hill situations">Clutch Win%</th>
            <th title="Average rating of opponents faced">Strength of Schedule</th>
            <th title="Matches last 60 days">Activity Score</th>
            <th title="Rating change since first verified match">Career Growth</th>
            <th title="Performance stability measure">Consistency</th>
            <th title="Highest PinoyPool Rank achieved">Peak Rank</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((p,i)=>{
            const tier=careerTier(p.mw,p.ml);
            const seed=p.id*13;
            const upsetRating=Math.round(p.overall+100+(seed%300));
            const domIdx=((p.avgMargin*0.6)+(p.mw/(p.mw+p.ml)*0.4)*3).toFixed(2);
            const clutchPct=Math.round(45+(seed%40));
            const careerGrowth=Math.round(p.overall-1000+(seed%150));
            const consistency=Math.round(55+seed%40);
            const consistColor=consistency>=80?'var(--gold)':consistency>=65?'var(--grn3)':'var(--chalk)';
            const actColor=p.activity>=8?'var(--grn3)':p.activity>=5?'var(--gold)':'var(--chalk2)';
            const growthColor=careerGrowth>200?'var(--gold)':careerGrowth>0?'var(--grn3)':'#e55';
            const clutchColor=clutchPct>=60?'var(--gold)':clutchPct>=50?'var(--grn3)':'#e55';
            return`<tr>
              <td><div class="${rankClass(i)}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div></td>
              <td><div class="pp"><div class="av" style="background:${p.colors||avcolors[i%8]};width:28px;height:28px;font-size:.7rem;">${getInit(p.name)}</div>
                <div><div style="font-weight:600;font-size:.82rem;">${p.name}</div>
                <div style="font-size:.6rem;color:var(--chalk);">${p.region}</div></div>
              </div></td>
              <td>${tierBadge(tier)}</td>
              <td>
                <div style="font-family:'DM Mono',monospace;font-size:.82rem;color:var(--gold);">${upsetRating}</div>
                <div style="font-size:.6rem;color:var(--chalk2);">opp rating</div>
              </td>
              <td>
                <div style="font-family:'DM Mono',monospace;font-size:.88rem;color:${parseFloat(domIdx)>1.5?'var(--gold)':parseFloat(domIdx)>0?'var(--grn3)':'#e55'};">${domIdx}</div>
              </td>
              <td>
                <div class="wrb" style="min-width:65px;"><div class="bt"><div class="bf" style="width:${clutchPct}%;background:${clutchColor.replace(')',', 0.8)').replace('var(--','rgba(')};"></div></div>
                <span style="font-size:.72rem;color:${clutchColor};">${clutchPct}%</span></div>
              </td>
              <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;">${p.sos}</span></td>
              <td>
                <div style="display:flex;align-items:center;gap:4px;">
                  <span class="act-dot" style="background:${actColor};"></span>
                  <span style="font-family:'DM Mono',monospace;font-size:.75rem;color:${actColor};">${p.activity} <span style="color:var(--chalk2);font-size:.65rem;">/ 60d</span></span>
                </div>
              </td>
              <td>
                <span style="font-family:'DM Mono',monospace;font-size:.82rem;color:${growthColor};font-weight:600;">${careerGrowth>0?'+':''}${careerGrowth}</span>
              </td>
              <td>
                <div class="wrb" style="min-width:65px;"><div class="bt"><div class="bf" style="width:${consistency}%;background:${consistColor.replace(')',', 0.7)').replace('var(--','rgba(')};"></div></div>
                <span style="font-size:.72rem;color:${consistColor};">${consistency}%</span></div>
              </td>
              <td><span style="font-family:'DM Mono',monospace;font-size:.78rem;color:var(--gold);">#${i+1}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Metrics Glossary -->
    <div class="card">
      <div class="ct">📖 Metrics Glossary</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.8rem;">
        ${[
          {m:'Biggest Upset',why:'The highest-rated player you have defeated. Defines your ceiling.'},
          {m:'Dominance Index',why:'Weighted rack margin × match quality. Shows how convincingly you win.'},
          {m:'Clutch Win%',why:'Your win rate in hill-hill (match point) situations. Pressure performance.'},
          {m:'Strength of Schedule',why:'Average rating of all opponents. Winning hard schedules means more.'},
          {m:'Activity Score',why:'Matches played last 60 days. Active players get fresher rating signals.'},
          {m:'Career Growth',why:'Rating change since your first verified match. Your overall improvement arc.'},
          {m:'Consistency Score',why:'How stable your performance is. High = reliable, low = volatile.'},
          {m:'Peak Rank',why:'The highest national rank you ever achieved. Career legacy recognition.'},
        ].map(g=>`<div style="background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:8px;padding:.75rem .9rem;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:.88rem;letter-spacing:1.5px;color:var(--gold);margin-bottom:3px;">${g.m}</div>
          <div style="font-size:.74rem;color:var(--chalk);line-height:1.6;">${g.why}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }
}

/* ══════════════════ HALLS ══════════════════ */
function buildHalls(){
  if(HALLS.length===0){
    document.getElementById('hall-grid').innerHTML=`<div style="text-align:center;padding:3rem 1rem;color:var(--chalk);grid-column:1/-1;">
      <div style="font-size:2.5rem;margin-bottom:1rem;">🏠</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--gold);margin-bottom:.5rem;">No Halls Listed Yet</div>
      <div style="font-size:.82rem;line-height:1.6;">Registered billiard halls will appear here once approved by admin. Hall owners can apply below.</div>
    </div>`;
    return;
  }
  document.getElementById('hall-grid').innerHTML=HALLS.map(h=>`
    <div class="hc" onclick="toast('📍 <strong>${h.n}</strong> — ${h.c}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:1.5px;">${h.n}</div>
        ${h.open?'<span style="font-size:.7rem;color:var(--grn3);"><span class="dot dg"></span>Open</span>':'<span style="font-size:.7rem;color:var(--chalk);">Closed</span>'}
      </div>
      <div style="font-size:.76rem;color:var(--chalk);margin-bottom:7px;">📍 ${h.c}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
        <span class="tag tgd">${h.t} Tables</span>
        <span style="font-size:.7rem;color:var(--chalk);">👥 ${h.ap} active</span>
      </div>
      <div style="font-size:.7rem;color:var(--chalk2);margin-bottom:7px;">${h.fmt}</div>
      <a href="https://${h.fb}" onclick="event.stopPropagation();toast('📘 Opening ${h.n} Facebook page…');" style="font-size:.7rem;color:var(--gold);text-decoration:none;">📘 ${h.fb}</a>
    </div>`).join('');
}
function openRegHall(){
  if(!app.user){toast('⚠️ Login first to register a hall.');openAuth();return;}
  document.getElementById('m-hall').classList.add('open');
}
function regHall(){closeM('m-hall');toast('✅ Hall submitted! Admin will verify in 24–48 hours.');}

/* ══════════════════ LIVE NOW ══════════════════ */

// Active matches data (matches in progress across all halls)
const LIVE_MATCHES = [];

let liveFmt='all';
function setLiveFmt(btn,fmt){
  liveFmt=fmt;
  document.querySelectorAll('[id^=live-f-]').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  buildLive();
}
function buildLive(){
  const q=(document.getElementById('live-search')?.value||'').toLowerCase();
  let data=LIVE_MATCHES.filter(m=>{
    if(liveFmt==='9'&&m.fmt!=='9-Ball')return false;
    if(liveFmt==='10'&&m.fmt!=='10-Ball')return false;
    if(q&&!m.p1.toLowerCase().includes(q)&&!m.p2.toLowerCase().includes(q)&&!m.venue.toLowerCase().includes(q))return false;
    return true;
  });
  document.getElementById('live-count').textContent=`● ${data.length} live`;
  document.getElementById('stream-count').textContent=`📡 ${data.filter(m=>m.streamUrl).length} streaming`;

  // Only scout/fan users can paste stream links. Players and owners cannot.
  const canAddStream = app.user && app.user.role === 'fan';

  if(data.length===0){
    document.getElementById('live-match-grid').innerHTML=`<div style="text-align:center;padding:3rem 1rem;color:var(--chalk);grid-column:1/-1;">
      <div style="font-size:2.5rem;margin-bottom:1rem;">📡</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--gold);margin-bottom:.5rem;">No Live Matches Right Now</div>
      <div style="font-size:.82rem;line-height:1.6;">Active matches will appear here in real time once halls and players are registered.</div>
    </div>`;
    return;
  }

  document.getElementById('live-match-grid').innerHTML=data.map(m=>{
    const hasStream=!!m.streamUrl;
    const typeIcon={Tournament:'🏆','Money Game':'💰',Exhibition:'🎱'}[m.type]||'🎱';
    return`<div class="match-card${hasStream?' has-stream':''}" id="mc-${m.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.8rem;">
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span>
          <span class="tag tgd">${typeIcon} ${m.type}</span>
        </div>
        ${hasStream
          ?`<span class="live-badge"><span style="width:5px;height:5px;border-radius:50%;background:#e55;animation:pu 1.1s ease infinite;display:inline-block;"></span>LIVE · ${m.viewers.toLocaleString()} viewers</span>`
          :'<span style="font-size:.65rem;color:var(--chalk2);letter-spacing:1px;">NO STREAM</span>'}
      </div>
      <div class="match-vs">
        <div class="match-player">
          <div class="match-pname">${m.p1.split(' ')[0]} ${m.p1.split(' ').slice(-1)[0]}</div>
          <div style="font-size:.65rem;color:var(--chalk);margin-top:2px;">#${PLAYERS.find(p=>p.name===m.p1)?.rank||'—'}</div>
        </div>
        <div class="match-score">${m.score[0]}<span style="font-size:.9rem;color:var(--chalk2);"> – </span>${m.score[1]}</div>
        <div class="match-player">
          <div class="match-pname">${m.p2.split(' ')[0]} ${m.p2.split(' ').slice(-1)[0]}</div>
          <div style="font-size:.65rem;color:var(--chalk);margin-top:2px;">#${PLAYERS.find(p=>p.name===m.p2)?.rank||'—'}</div>
        </div>
      </div>
      <div class="match-meta">
        <span>📍 ${m.venue}</span>
        ${hasStream?`<a href="${m.streamUrl}" onclick="event.preventDefault();toast('📡 Opening stream…')" style="color:#e55;text-decoration:none;margin-left:4px;">▶ Watch ${m.platform}</a>`:''}
      </div>
      ${canAddStream&&!hasStream?`
      <div class="stream-add-form">
        <input type="url" id="su-${m.id}" placeholder="Paste stream link (FB/YouTube)…">
        <button class="btn btn-d btn-sm" onclick="addStreamToMatch('${m.id}')">📡 Go Live</button>
      </div>`:''}
      ${canAddStream&&hasStream?`<div style="margin-top:.6rem;font-size:.7rem;color:#e55;">📡 Streaming on ${m.platform}</div>`:''}
    </div>`;
  }).join('');

  if(!data.length){
    document.getElementById('live-match-grid').innerHTML='<div style="color:var(--chalk2);font-size:.88rem;text-align:center;padding:3rem 0;grid-column:1/-1;">No active matches found</div>';
  }
}

function addStreamToMatch(matchId){
  const inp=document.getElementById('su-'+matchId);
  const url=inp?.value.trim();
  if(!url||!url.startsWith('http')){toast('⚠️ Enter a valid stream URL.');return;}
  const m=LIVE_MATCHES.find(x=>x.id===matchId);
  if(!m)return;
  m.streamUrl=url;
  m.platform=url.includes('youtube')||url.includes('youtu.be')?'YouTube':'FB Live';
  m.viewers=0;
  buildLive();
  toast(`📡 Stream link added! Match is now live on the Live Now tab.`);
}

/* ══════════════════ PLAYER PORTAL ══════════════════ */

// Player's pending matches (submitted by hall owners, need acceptance)
const playerPendingMatches=[
  {id:'pm1',opponent:'Carlo Biado Jr.',opponentRank:2,venue:'Cue Masters Billiards',date:'Feb 22, 2026',time:'2:10 PM',fmt:'9-Ball',type:'Tournament',score:'10-7',hcp:'None',myScore:10,p1accept:false,p2accept:false,me:'p1'},
  {id:'pm2',opponent:'Warren Kiamco',opponentRank:6,venue:'Break Point Billiards',date:'Feb 20, 2026',time:'7:30 PM',fmt:'9-Ball',type:'Money Game',score:'8-10',hcp:'+2 racks (you)',myScore:8,p1accept:false,p2accept:true,me:'p1'},
];

// Player's match history
const playerHistory=[
  {opponent:'Mark Santos',opponentRank:8,fmt:'9-Ball',type:'Tournament',score:'7-5',hcp:'None',venue:'Cue Masters Billiards',date:'Feb 18, 2026',result:'W',status:'Verified'},
  {opponent:'Ryan Cruz',opponentRank:9,fmt:'9-Ball',type:'Money Game',score:'10-8',hcp:'None',venue:'Break Point Billiards',date:'Feb 14, 2026',result:'W',status:'Verified'},
  {opponent:'Dennis Orcollo Jr.',opponentRank:3,fmt:'9-Ball',type:'Tournament',score:'5-10',hcp:'+2 racks (you)',venue:'Golden Cue – Cebu',date:'Feb 10, 2026',result:'L',status:'Verified'},
  {opponent:'Carlo Biado Jr.',opponentRank:2,fmt:'9-Ball',type:'Exhibition',score:'7-7',hcp:'None',venue:'Cue Masters Billiards',date:'Jan 30, 2026',result:'D',status:'Verified'},
  {opponent:'Gerry Villanueva',opponentRank:11,fmt:'9-Ball',type:'Money Game',score:'10-4',hcp:'None',venue:'Champions Arena',date:'Jan 25, 2026',result:'W',status:'Verified'},
  {opponent:'Jun Tupaz',opponentRank:5,fmt:'10-Ball',type:'Tournament',score:'4-10',hcp:'+3 racks (you)',venue:'Rack & Roll – Davao',date:'Jan 18, 2026',result:'L',status:'Verified'},
];

// Ranking history data (for SVG graph)
const rankHistory=[
  {month:'Aug',rank:4},{month:'Sep',rank:3},{month:'Oct',rank:4},{month:'Nov',rank:2},
  {month:'Dec',rank:2},{month:'Jan',rank:1},{month:'Feb',rank:1},
];

function buildPlayerPortal(){
  if(!app.user){return;}
  const p=PLAYERS.find(x=>x.name===app.user.name)||PLAYERS[0];
  const wins=playerHistory.filter(m=>m.result==='W').length;
  const losses=playerHistory.filter(m=>m.result==='L').length;
  const pct=Math.round(wins/(wins+losses||1)*100);

  document.getElementById('pp-subtitle').textContent=`${p.name} · ${p.region} · ${p.fmt}`;

  // Header stats
  document.getElementById('pp-hdr-stats').innerHTML=`
    <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--gold);">#${p.rank}</div><div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">National Rank</div></div>
    <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--grn3);">${wins}</div><div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Wins</div></div>
    <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#e55;">${losses}</div><div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Losses</div></div>
    <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--gold2);">${pct}%</div><div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Win Rate</div></div>`;

  // Show first tab
  ppTab(document.querySelector('.pp-tab'),'validation');
}

function ppTab(btn,tab){
  document.querySelectorAll('.pp-tab').forEach(b=>b.classList.remove('act'));
  if(btn) btn.classList.add('act');
  const c=document.getElementById('pp-content');
  const p=PLAYERS.find(x=>x.name===app.user?.name)||PLAYERS[0];

  if(tab==='validation'){
    const pending=playerPendingMatches;
    c.innerHTML=`
    <div class="card">
      <div class="ct">⚡ Pending Match Confirmations <span style="background:#e55;color:#fff;border-radius:10px;padding:2px 8px;font-size:.63rem;margin-left:6px;">${pending.length} pending</span></div>
      <p style="font-size:.78rem;color:var(--chalk);margin-bottom:1.2rem;line-height:1.6;">These matches were recorded by a Hall Owner and require your confirmation. A match is only official after <strong style="color:var(--gold);">both players confirm</strong>.</p>
      ${pending.length?pending.map((m,i)=>{
        const myAccepted=m.me==='p1'?m.p1accept:m.p2accept;
        const oppAccepted=m.me==='p1'?m.p2accept:m.p1accept;
        const statusLabel=myAccepted&&oppAccepted?'Fully Validated':myAccepted?'Accepted by You — Awaiting Opponent':oppAccepted?'Accepted by Opponent — Awaiting You':'Pending Both Players';
        const statusClass=myAccepted&&oppAccepted?'status-validated':oppAccepted?'status-partial':'status-pending';
        return`<div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:1.1rem;margin-bottom:.8rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:.8rem;">
            <div>
              <div style="font-weight:600;font-size:.92rem;">vs ${m.opponent} <span style="color:var(--chalk2);font-size:.75rem;">(#${m.opponentRank})</span></div>
              <div style="font-size:.73rem;color:var(--chalk);margin-top:4px;">
                <span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span>
                <span class="tag tgd" style="margin-left:3px;">${m.type}</span>
                · Score: <strong style="color:var(--gold);font-family:'DM Mono',monospace;">${m.score}</strong>
                ${m.hcp!=='None'?`· <span style="color:#e55;">${m.hcp}</span>`:''}
              </div>
              <div style="font-size:.7rem;color:var(--chalk2);margin-top:3px;">📍 ${m.venue} · 📅 ${m.date} ${m.time}</div>
            </div>
            <span class="tag ${statusClass}" style="white-space:nowrap;">${statusLabel}</span>
          </div>
          <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;">
            <div style="display:flex;gap:4px;align-items:center;font-size:.75rem;flex:1;">
              <div style="width:18px;height:18px;border-radius:50%;background:${myAccepted?'var(--grn2)':'rgba(255,255,255,.05)'};border:2px solid ${myAccepted?'var(--grn3)':'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:.6rem;">
                ${myAccepted?'✓':'—'}
              </div>
              <span style="color:${myAccepted?'var(--grn3)':'var(--chalk2)'};">You — ${myAccepted?'Confirmed':'Not yet confirmed'}</span>
              <span style="margin:0 6px;color:var(--border);">|</span>
              <div style="width:18px;height:18px;border-radius:50%;background:${oppAccepted?'var(--grn2)':'rgba(255,255,255,.05)'};border:2px solid ${oppAccepted?'var(--grn3)':'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:.6rem;">
                ${oppAccepted?'✓':'—'}
              </div>
              <span style="color:${oppAccepted?'var(--grn3)':'var(--chalk2)'};">${m.opponent.split(' ')[0]} — ${oppAccepted?'Confirmed':'Waiting'}</span>
            </div>
            ${!myAccepted?`<button class="btn btn-s btn-sm" onclick="playerAcceptMatch(${i})">✓ Accept Result</button>`:''}
          </div>
        </div>`;
      }).join(''):'<div style="color:var(--chalk2);font-size:.82rem;text-align:center;padding:2rem 0;">🎉 No pending match confirmations</div>'}
    </div>`;

  } else if(tab==='history'){
    let sort=app.ppSort||'date';
    c.innerHTML=`
    <div class="card">
      <div class="ct">📋 My Match History</div>
      <div style="display:flex;gap:7px;align-items:center;margin-bottom:1.1rem;flex-wrap:wrap;">
        <span style="font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Sort by:</span>
        <button class="tb${sort==='date'?' act':''}" style="flex:none;min-width:70px;" onclick="ppSort(this,'date')">Date</button>
        <button class="tb${sort==='type'?' act':''}" style="flex:none;min-width:80px;" onclick="ppSort(this,'type')">Match Type</button>
        <button class="tb${sort==='venue'?' act':''}" style="flex:none;min-width:70px;" onclick="ppSort(this,'venue')">Venue</button>
        <div style="margin-left:auto;font-family:'DM Mono',monospace;font-size:.7rem;color:var(--chalk2);">${playerHistory.length} verified matches</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="rt" style="min-width:640px;">
          <thead><tr>
            <th>Opponent</th><th>Format</th><th>Type</th><th>Score</th><th>Handicap</th><th>Venue</th><th>Date</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${ppSortHistory(sort).map(m=>`<tr>
              <td><div style="font-weight:600;">${m.opponent}</div><div style="font-size:.65rem;color:var(--chalk);">#${PLAYERS.find(p=>p.name===m.opponent)?.rank||'?'}</div></td>
              <td><span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span></td>
              <td style="font-size:.76rem;color:var(--chalk);">${m.type}</td>
              <td>
                <span style="font-family:'DM Mono',monospace;color:${m.result==='W'?'var(--grn3)':m.result==='L'?'#e55':'var(--gold)'};">${m.score}</span>
                <span class="tag ${m.result==='W'?'tok':m.result==='L'?'thc':'tgd'}" style="margin-left:4px;">${m.result==='W'?'WIN':m.result==='L'?'LOSS':'DRAW'}</span>
              </td>
              <td style="font-size:.73rem;color:${m.hcp!=='None'?'#e55':'var(--chalk2)'};">${m.hcp}</td>
              <td style="font-size:.73rem;color:var(--chalk);">${m.venue}</td>
              <td style="font-size:.72rem;color:var(--chalk2);">${m.date}</td>
              <td><span class="tag tok">✓ ${m.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  } else {
    // Tier system
    const totalMatches=p.mw+p.ml;
    const winPct=Math.round(p.mw/(totalMatches||1)*100);
    // Tier: Amateur → Skilled → Semi-Pro → Pro → Elite
    let tierName,tierClass;
    if(winPct>=85&&totalMatches>=30){tierName='Elite';   tierClass='tier-elite';}
    else if(winPct>=75&&totalMatches>=20){tierName='Pro';tierClass='tier-pro';}
    else if(winPct>=60&&totalMatches>=15){tierName='Semi-Pro';tierClass='tier-semipro';}
    else if(winPct>=45&&totalMatches>=8) {tierName='Skilled'; tierClass='tier-skilled';}
    else{tierName='Amateur';tierClass='tier-amateur';}
    const isOfficial=totalMatches>=10;

    // SVG ranking graph
    const pts=rankHistory;
    const maxRank=Math.max(...pts.map(p=>p.rank))+1;
    const gW=500,gH=140,padL=30,padR=10,padT=15,padB=25;
    const xStep=(gW-padL-padR)/(pts.length-1);
    const yScale=(gH-padT-padB)/(maxRank);
    const polyPts=pts.map((p,i)=>`${padL+i*xStep},${padT+(p.rank-1)*yScale}`).join(' ');
    const areaPath=`M${padL+0*xStep},${gH-padB} `+pts.map((p,i)=>`L${padL+i*xStep},${padT+(p.rank-1)*yScale}`).join(' ')+` L${padL+(pts.length-1)*xStep},${gH-padB} Z`;

    c.innerHTML=`
    <div class="g2" style="margin-bottom:1.1rem;">
      <div class="card">
        <div class="ct">👤 Player Profile</div>
        <div class="fg"><label>Monicker / Nickname</label><input type="text" id="pp-monicker" placeholder="e.g. The Magician" value="${p.name.includes('Efren')?'The Magician':''}"></div>
        <div class="fg"><label>City</label><input type="text" id="pp-city" placeholder="e.g. Quezon City" value="${p.region}"></div>
        <div class="fg"><label>Contact Number</label><input type="tel" id="pp-contact" placeholder="09xxxxxxxxx"></div>
        <div class="fg"><label>Facebook Page</label><input type="url" id="pp-fb" placeholder="https://facebook.com/yourpage"></div>
        <div class="fg"><label>Instagram</label><input type="url" id="pp-ig" placeholder="https://instagram.com/yourhandle"></div>
        <div class="fg"><label>TikTok</label><input type="url" id="pp-tt" placeholder="https://tiktok.com/@yourhandle"></div>
        <button class="btn btn-p" onclick="toast('✅ Profile saved!')">Save Changes</button>
      </div>
      <div>
        <div class="card" style="margin-bottom:1rem;">
          <div class="ct">🏆 Ranking & Tier</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.7rem;">
            <div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:3rem;color:var(--gold);line-height:1;">#${p.rank}</div>
              <div style="font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">National Rank</div>
            </div>
            <span class="tier-badge ${tierClass}">★ ${tierName}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:1rem;">
            <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;padding:.8rem;text-align:center;">
              <div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);margin-bottom:4px;">${isOfficial?'Official Rank':'Unofficial Rank'}</div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:${isOfficial?'var(--gold)':'var(--chalk)'};">#${p.rank}</div>
              <div style="font-size:.62rem;color:var(--chalk2);">${isOfficial?'Current · National':'Needs ${Math.max(0,10-totalMatches)} more matches'}</div>
            </div>
            <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;padding:.8rem;text-align:center;">
              <div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);margin-bottom:4px;">Verified Matches</div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--gold);">${totalMatches}</div>
              <div style="font-size:.62rem;color:var(--chalk2);"><span style="color:var(--grn3);">${p.mw}W</span> / <span style="color:#e55;">${p.ml}L</span> · ${winPct}% win</div>
            </div>
          </div>
          ${!isOfficial?`<div style="background:rgba(200,168,75,.08);border:1px solid var(--border);border-radius:8px;padding:.8rem;font-size:.76rem;color:var(--chalk);">⚠️ <strong style="color:var(--gold);">Unofficial ranking</strong> — play ${10-totalMatches} more verified matches to unlock official national rank.</div>`:''}
        </div>
        <div class="card">
          <div class="ct" style="margin-bottom:.8rem;">📈 Ranking History</div>
          <div style="display:flex;gap:6px;margin-bottom:.7rem;flex-wrap:wrap;">
            <button class="tb act" style="flex:none;font-size:.72rem;padding:4px 10px;" onclick="toast('Showing all-time graph')">All</button>
            <button class="tb" style="flex:none;font-size:.72rem;padding:4px 10px;" onclick="toast('Showing 2026 graph')">2026</button>
            <button class="tb" style="flex:none;font-size:.72rem;padding:4px 10px;" onclick="toast('Showing last 3 months')">3 Months</button>
          </div>
          <div class="rank-graph-wrap">
            <svg viewBox="0 0 ${gW} ${gH}" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(200,168,75,.25)"/>
                  <stop offset="100%" stop-color="rgba(200,168,75,.02)"/>
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              ${[1,2,3,4,5].map(r=>`<line x1="${padL}" y1="${padT+(r-1)*yScale}" x2="${gW-padR}" y2="${padT+(r-1)*yScale}" stroke="rgba(200,168,75,.08)" stroke-width="1"/><text x="${padL-4}" y="${padT+(r-1)*yScale+4}" text-anchor="end" font-size="9" fill="rgba(170,164,144,.5)">#${r}</text>`).join('')}
              <!-- Area fill -->
              <path d="${areaPath}" fill="url(#grd)"/>
              <!-- Line -->
              <polyline points="${polyPts}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round"/>
              <!-- Points -->
              ${pts.map((pt,i)=>`<circle cx="${padL+i*xStep}" cy="${padT+(pt.rank-1)*yScale}" r="4" fill="var(--gold)" stroke="var(--bg)" stroke-width="2"/>
              <text x="${padL+i*xStep}" y="${gH-6}" text-anchor="middle" font-size="9" fill="rgba(170,164,144,.6)">${pt.month}</text>`).join('')}
            </svg>
          </div>
          <div style="font-size:.7rem;color:var(--chalk2);text-align:center;margin-top:.5rem;">Lower = Better · Rank #1 is the highest</div>
        </div>
      </div>
    </div>`;
  }
}

function ppSort(btn,sort){
  app.ppSort=sort;
  btn.closest('.card').querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  ppTab(null,'history');
}
function ppSortHistory(sort){
  const d=[...playerHistory];
  if(sort==='type') d.sort((a,b)=>a.type.localeCompare(b.type));
  else if(sort==='venue') d.sort((a,b)=>a.venue.localeCompare(b.venue));
  return d;
}
function playerAcceptMatch(i){
  const m=playerPendingMatches[i];
  if(m.me==='p1') m.p1accept=true; else m.p2accept=true;
  if(m.p1accept&&m.p2accept){
    playerPendingMatches.splice(i,1);
    playerHistory.unshift({
      opponent:m.opponent,opponentRank:m.opponentRank,
      fmt:m.fmt,type:m.type,score:m.score,hcp:m.hcp,
      venue:m.venue,date:m.date,result:parseInt(m.score)>parseInt(m.score.split('-')[1])?'W':'L',
      status:'Verified'
    });
    toast(`✅ Match confirmed and now official! Rankings updated.`);
  } else {
    toast(`✅ Your confirmation recorded. Waiting for ${m.opponent.split(' ')[0]}…`);
  }
  ppTab(document.querySelector('.pp-tab.act'),'validation');
}

/* ══════════════════ PORTAL ══════════════════ */
const pendVal=[
  {p1:'Mark Santos',p2:'Ryan Cruz',fmt:'9-Ball',sc:'5-4',time:'Today 3:45 PM'},
  {p1:'Alex Cruz',p2:'Dennis Lim',fmt:'9-Ball',sc:'7-5',time:'Today 1:20 PM'},
  {p1:'Rico Santos',p2:'Jun Tupaz',fmt:'10-Ball',sc:'9-7',time:'Yesterday 9PM'},
];

// Simulated verified match history for this hall
const hallHistory=[
  {p1:'Efren Reyes Jr.',p2:'Carlo Biado Jr.',fmt:'9-Ball',type:'Tournament',sc:'10-7',raceTo:10,hcp:'None',date:'2026-02-22',ts:'Today 2:10 PM'},
  {p1:'Mark Santos',p2:'Dennis Orcollo Jr.',fmt:'9-Ball',type:'Money Game',sc:'10-6',raceTo:10,hcp:'None',date:'2026-02-22',ts:'Today 11:30 AM'},
  {p1:'Alex Cruz',p2:'Jun Tupaz',fmt:'10-Ball',type:'Exhibition',sc:'7-5',raceTo:7,hcp:'+2 racks',date:'2026-02-21',ts:'Yesterday 8:45 PM'},
  {p1:'Rico Santos',p2:'Ryan Cruz',fmt:'9-Ball',type:'Tournament',sc:'10-8',raceTo:10,hcp:'None',date:'2026-02-21',ts:'Yesterday 5:20 PM'},
  {p1:'Dennis Lim',p2:'Mark Santos',fmt:'9-Ball',type:'Money Game',sc:'10-4',raceTo:10,hcp:'+3 racks',date:'2026-02-20',ts:'Feb 20, 7:30 PM'},
  {p1:'Carlo Biado Jr.',p2:'Alex Cruz',fmt:'10-Ball',type:'Tournament',sc:'10-3',raceTo:10,hcp:'None',date:'2026-02-19',ts:'Feb 19, 3:00 PM'},
  {p1:'Jun Tupaz',p2:'Rico Santos',fmt:'9-Ball',type:'Exhibition',sc:'7-7',raceTo:7,hcp:'None',date:'2026-02-15',ts:'Feb 15, 6:00 PM'},
  {p1:'Ryan Cruz',p2:'Dennis Lim',fmt:'9-Ball',type:'Money Game',sc:'10-9',raceTo:10,hcp:'+1 rack',date:'2026-02-10',ts:'Feb 10, 9:00 PM'},
];

// Manual entry pending player acceptance
const manualPending=[];

function buildPortal(){ptab('matches');}

function ptab(tab){
  // Highlight active tile
  document.querySelectorAll('.pa-tile').forEach((t,i)=>{
    const tabs=['matches','history','profile'];
    t.style.borderColor=tabs[i]===tab?'var(--gold)':'var(--border)';
    t.style.background=tabs[i]===tab?'rgba(200,168,75,.08)':'';
  });

  const c=document.getElementById('portal-content');

  /* ── MATCH VALIDATION ── */
  if(tab==='matches'){
    c.innerHTML=`
    <div class="card" style="margin-bottom:1.1rem;">
      <div class="ct">⚡ Match Validations <span style="background:#e55;color:#fff;border-radius:10px;padding:2px 8px;font-size:.63rem;margin-left:6px;">${pendVal.length} pending</span></div>
      <p style="font-size:.78rem;color:var(--chalk);margin-bottom:1.1rem;">You are the 3rd and final verification layer. Only validate matches that actually took place at your hall.</p>
      ${pendVal.length?pendVal.map((m,i)=>`
        <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:1.1rem;margin-bottom:.7rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-weight:600;">${m.p1} vs ${m.p2}</div>
              <div style="font-size:.73rem;color:var(--chalk);margin-top:3px;"><span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span> · Score: <strong style="color:var(--gold);">${m.sc}</strong> · ${m.time}</div>
              <div style="font-size:.7rem;color:var(--chalk2);margin-top:3px;">✓ Both players confirmed</div>
            </div>
            <div style="display:flex;gap:7px;">
              <button class="btn btn-d btn-sm" onclick="valMatch(${i},false)">✗ Reject</button>
              <button class="btn btn-s btn-sm" onclick="valMatch(${i},true)">✓ Validate</button>
            </div>
          </div>
        </div>`).join('')
      :'<div style="color:var(--chalk2);font-size:.82rem;text-align:center;padding:1.5rem 0;">No pending validations</div>'}
    </div>

    <!-- MANUAL MATCH ENTRY -->
    <div class="card">
      <div class="ct">📝 Record a Match <span style="font-size:.6rem;letter-spacing:1px;color:var(--chalk);font-family:\'Barlow Condensed\',sans-serif;font-weight:400;text-transform:none;padding:2px 8px;border:1px solid var(--border);border-radius:10px;margin-left:6px;">For matches not recorded by players</span></div>
      <p style="font-size:.78rem;color:var(--chalk);margin-bottom:1.2rem;line-height:1.6;">Enter the details of a completed match. Both players will receive a notification and must <strong style="color:var(--gold);">accept</strong> before it counts toward rankings.</p>

      <div class="g2" style="margin-bottom:.9rem;">
        <div class="fg" style="margin-bottom:0;">
          <label>Game Format</label>
          <div class="tg"><button class="tb act" id="mfmt-9" onclick="setMFmt(this,'9-Ball')">9-Ball</button><button class="tb" id="mfmt-10" onclick="setMFmt(this,'10-Ball')">10-Ball</button></div>
        </div>
        <div class="fg" style="margin-bottom:0;">
          <label>Type of Match</label>
          <div class="tg">
            <button class="tb act" onclick="setMType(this,'Tournament')">🏆 Tournament</button>
            <button class="tb" onclick="setMType(this,'Money Game')">💰 Money Game</button>
            <button class="tb" onclick="setMType(this,'Exhibition')">🎱 Exhibition</button>
          </div>
        </div>
      </div>

      <div class="g2" style="margin-bottom:.9rem;">
        <!-- PLAYER 1 -->
        <div>
          <div class="fg" style="margin-bottom:.6rem;">
            <label>Player 1</label>
            <div class="ac-wrap">
              <div class="iw"><span class="ii">🎱</span>
                <input type="text" id="mp1-inp" placeholder="Search registered player…" oninput="acSearchM('mp1-inp','mp1-list',1)" autocomplete="off">
              </div>
              <div class="ac-list" id="mp1-list"></div>
            </div>
          </div>
          <div class="fg" style="margin-bottom:.6rem;">
            <label>Final Score (P1 racks won)</label>
            <select id="mp1-score" class="score-select" onchange="updateManualWinner()"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option><option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option><option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option><option value="24">24</option><option value="25">25</option></select>
          </div>
          <div class="fg" style="margin-bottom:0;">
            <label>Rack Handicap <span style="color:var(--chalk2);font-size:.58rem;">(+1 to +5)</span></label>
            <div class="rack-hcp-row" id="mp1-rack-row">
              <button class="rhcp-btn act" data-val="0" onclick="setMRackHcp(this,1)">None</button>
              <button class="rhcp-btn" data-val="1" onclick="setMRackHcp(this,1)">+1</button>
              <button class="rhcp-btn" data-val="2" onclick="setMRackHcp(this,1)">+2</button>
              <button class="rhcp-btn" data-val="3" onclick="setMRackHcp(this,1)">+3</button>
              <button class="rhcp-btn" data-val="4" onclick="setMRackHcp(this,1)">+4</button>
              <button class="rhcp-btn" data-val="5" onclick="setMRackHcp(this,1)">+5</button>
            </div>
          </div>
          <div class="fg" style="margin-top:.6rem;margin-bottom:0;">
            <label>Last Balls Spotted <span style="color:var(--chalk2);font-size:.58rem;">(tap multiple)</span></label>
            <div class="ball-hcp-grid" id="mp1-ball-grid" style="margin-top:4px;"></div>
          </div>
        </div>

        <!-- PLAYER 2 -->
        <div>
          <div class="fg" style="margin-bottom:.6rem;">
            <label>Player 2</label>
            <div class="ac-wrap">
              <div class="iw"><span class="ii">🎯</span>
                <input type="text" id="mp2-inp" placeholder="Search registered player…" oninput="acSearchM('mp2-inp','mp2-list',2)" autocomplete="off">
              </div>
              <div class="ac-list" id="mp2-list"></div>
            </div>
          </div>
          <div class="fg" style="margin-bottom:.6rem;">
            <label>Final Score (P2 racks won)</label>
            <select id="mp2-score" class="score-select" onchange="updateManualWinner()"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option><option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option><option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option><option value="24">24</option><option value="25">25</option></select>
          </div>
          <div class="fg" style="margin-bottom:0;">
            <label>Rack Handicap <span style="color:var(--chalk2);font-size:.58rem;">(+1 to +5)</span></label>
            <div class="rack-hcp-row" id="mp2-rack-row">
              <button class="rhcp-btn act" data-val="0" onclick="setMRackHcp(this,2)">None</button>
              <button class="rhcp-btn" data-val="1" onclick="setMRackHcp(this,2)">+1</button>
              <button class="rhcp-btn" data-val="2" onclick="setMRackHcp(this,2)">+2</button>
              <button class="rhcp-btn" data-val="3" onclick="setMRackHcp(this,2)">+3</button>
              <button class="rhcp-btn" data-val="4" onclick="setMRackHcp(this,2)">+4</button>
              <button class="rhcp-btn" data-val="5" onclick="setMRackHcp(this,2)">+5</button>
            </div>
          </div>
          <div class="fg" style="margin-top:.6rem;margin-bottom:0;">
            <label>Last Balls Spotted <span style="color:var(--chalk2);font-size:.58rem;">(tap multiple)</span></label>
            <div class="ball-hcp-grid" id="mp2-ball-grid" style="margin-top:4px;"></div>
          </div>
        </div>
      </div>

      <div id="m-entry-summary" style="display:none;background:rgba(200,168,75,.07);border:1px solid var(--border);border-radius:8px;padding:.85rem 1rem;margin-bottom:.9rem;font-size:.82rem;"></div>

      <button class="btn btn-p btn-f" onclick="submitManualMatch()" style="margin-top:.3rem;">📨 Record & Notify Players</button>

      <!-- PENDING PLAYER ACCEPTANCE -->
      <div id="manual-pending-list" style="margin-top:1.3rem;"></div>
    </div>`;

    // Init sub-components inside portal
    buildMBallGrid(1);
    buildMBallGrid(2);
    renderManualPending();

  /* ── MATCH HISTORY ── */
  } else if(tab==='history'){
    const today='2026-02-22', thisMonth='2026-02', thisYear='2026';
    c.innerHTML=`
    <div class="card">
      <div class="ct">📋 Match History — Your Venue</div>
      <div style="display:flex;gap:6px;margin-bottom:1.3rem;flex-wrap:wrap;">
        <button class="tb act" style="flex:none;min-width:80px;" onclick="filterHistory(this,'all')">All</button>
        <button class="tb" style="flex:none;min-width:80px;" onclick="filterHistory(this,'day')">Today</button>
        <button class="tb" style="flex:none;min-width:100px;" onclick="filterHistory(this,'month')">This Month</button>
        <button class="tb" style="flex:none;min-width:80px;" onclick="filterHistory(this,'year')">This Year</button>
      </div>
      <div id="history-summary" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:1.2rem;"></div>
      <div style="overflow-x:auto;">
        <table class="rt" style="min-width:720px;" id="history-table">
          <thead><tr>
            <th>Players</th><th>Format</th><th>Type</th><th>Score</th><th>Race To</th><th>Handicap</th><th>Date & Time</th>
          </tr></thead>
          <tbody id="history-tbody"></tbody>
        </table>
      </div>
    </div>`;
    filterHistory(document.querySelector('#portal-content .tb.act'),'all');

  /* ── HALL PROFILE ── */
  } else {
    c.innerHTML=`
    <div class="card">
      <div class="ct">🏢 Hall Profile</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
        <div class="fg"><label>Hall Name</label><input value="Cue Masters Billiards"></div>
        <div class="fg"><label>City</label><input value="Quezon City, NCR"></div>
      </div>
      <div class="fg"><label>Full Address</label><input value="123 Banawe St., Quezon City"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
        <div class="fg"><label>Tables</label><input type="number" value="12"></div>
        <div class="fg"><label>Operating Hours</label><input value="9AM – 12MN Daily"></div>
      </div>
      <div class="fg"><label>Contact Number</label><input value="0917-123-4567"></div>
      <div class="fg"><label>Facebook Page</label><input type="url" value="https://facebook.com/cuemasters"></div>
      <div class="fg"><label>Instagram / TikTok</label><input type="url" value="https://instagram.com/cuemasters"></div>
      <div class="fg"><label>Hall Description</label><textarea>Premier billiard hall in QC. Hosts regular 9-ball and 10-ball tournaments. Air-conditioned, food & drinks available.</textarea></div>
      <div style="display:flex;gap:9px;margin-top:.5rem;">
        <button class="btn btn-p" onclick="toast('✅ Profile updated!')">Save Changes</button>
        <button class="btn btn-g" onclick="toast('📸 Photo upload — coming soon.')">Upload Photos</button>
      </div>
    </div>`;
  }
}

/* ── History filter ── */
function filterHistory(btn, period){
  if(btn){document.querySelectorAll('#portal-content .tb').forEach(b=>b.classList.remove('act'));btn.classList.add('act');}
  const today='2026-02-22',thisMonth='2026-02',thisYear='2026';
  let data=hallHistory;
  if(period==='day') data=data.filter(m=>m.date===today);
  else if(period==='month') data=data.filter(m=>m.date.startsWith(thisMonth));
  else if(period==='year') data=data.filter(m=>m.date.startsWith(thisYear));

  // Summary stats
  const p9=data.filter(m=>m.fmt==='9-Ball').length;
  const p10=data.filter(m=>m.fmt==='10-Ball').length;
  const types={Tournament:0,'Money Game':0,Exhibition:0};
  data.forEach(m=>{if(types[m.type]!==undefined)types[m.type]++;});
  document.getElementById('history-summary').innerHTML=`
    <div style="background:rgba(200,168,75,.06);border:1px solid var(--border);border-radius:8px;padding:.8rem;text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--gold);">${data.length}</div>
      <div style="font-size:.63rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Total Matches</div>
    </div>
    <div style="background:rgba(52,130,219,.06);border:1px solid rgba(52,130,219,.18);border-radius:8px;padding:.8rem;text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:#5dade2;">${p9} <span style="font-size:.85rem;">9-Ball</span></div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:#bb8fce;">${p10} <span style="font-size:.85rem;">10-Ball</span></div>
    </div>
    <div style="background:rgba(31,140,78,.06);border:1px solid rgba(31,140,78,.18);border-radius:8px;padding:.8rem;font-size:.76rem;color:var(--chalk);">
      <div>🏆 ${types.Tournament} Tournament</div>
      <div style="margin:.3rem 0;">💰 ${types['Money Game']} Money Game</div>
      <div>🎱 ${types.Exhibition} Exhibition</div>
    </div>`;

  const tbody=document.getElementById('history-tbody');
  if(!data.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--chalk2);padding:2rem;">No matches found for this period</td></tr>`;return;}
  tbody.innerHTML=data.map(m=>{
    const w=parseInt(m.sc)>parseInt(m.sc.split('-')[1])?m.p1:m.p2;
    const s=m.sc.split('-');
    return`<tr>
      <td>
        <div style="font-weight:600;font-size:.85rem;">${m.p1} <span style="color:var(--chalk2);">vs</span> ${m.p2}</div>
        <div style="font-size:.65rem;color:var(--grn3);margin-top:2px;">🏆 ${w} wins</div>
      </td>
      <td><span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span></td>
      <td style="font-size:.76rem;color:var(--chalk);">${m.type}</td>
      <td><span style="font-family:'DM Mono',monospace;font-size:.9rem;color:var(--gold);">${m.sc}</span></td>
      <td style="font-size:.76rem;color:var(--chalk);">Race to ${m.raceTo}</td>
      <td style="font-size:.76rem;color:${m.hcp==='None'?'var(--chalk2)':'#e55'}">${m.hcp}</td>
      <td style="font-size:.72rem;color:var(--chalk2);">${m.ts}</td>
    </tr>`;
  }).join('');
}

/* ── Manual match entry state ── */
const mEntry={fmt:'9-Ball',type:'Tournament',raceTo:5,p1:'',p1id:null,p2:'',p2id:null,rack:[0,0],balls:[new Set(),new Set()]};

function setMFmt(btn,fmt){
  mEntry.fmt=fmt;
  btn.parentElement.querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  buildMBallGrid(1);buildMBallGrid(2);
}
function setMType(btn,type){
  mEntry.type=type;
  btn.parentElement.querySelectorAll('.tb').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
}
function buildMBallGrid(p){
  const grid=document.getElementById(`mp${p}-ball-grid`);
  if(!grid)return;
  const maxBall=mEntry.fmt==='10-Ball'?9:8;
  [...mEntry.balls[p-1]].forEach(b=>{if(b>maxBall)mEntry.balls[p-1].delete(b);});
  grid.innerHTML='';
  for(let b=3;b<=maxBall;b++){
    const btn=document.createElement('button');
    btn.className='ball-btn'+(mEntry.balls[p-1].has(b)?' sel':'');
    btn.textContent=b;
    btn.onclick=()=>{
      if(mEntry.balls[p-1].has(b)){mEntry.balls[p-1].delete(b);btn.classList.remove('sel');}
      else{mEntry.balls[p-1].add(b);btn.classList.add('sel');}
    };
    grid.appendChild(btn);
  }
}
function setMRackHcp(btn,p){
  const row=document.getElementById(`mp${p}-rack-row`);
  row.querySelectorAll('.rhcp-btn').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  mEntry.rack[p-1]=parseInt(btn.dataset.val)||0;
  // Mutual exclusivity
  if(mEntry.rack[p-1]>0||mEntry.balls[p-1].size>0){
    const other=p===1?2:1;
    mEntry.rack[other-1]=0;
    mEntry.balls[other-1].clear();
    const orow=document.getElementById(`mp${other}-rack-row`);
    if(orow) orow.querySelectorAll('.rhcp-btn').forEach((b,i)=>b.classList.toggle('act',i===0));
    buildMBallGrid(other);
  }
}
function acSearchM(inpId,listId,pNum){
  const val=document.getElementById(inpId).value.trim().toLowerCase();
  const list=document.getElementById(listId);
  if(val.length<2){list.classList.remove('open');return;}
  const other=pNum===1?mEntry.p2:mEntry.p1;
  const results=PLAYERS.filter(p=>p.name.toLowerCase().includes(val)&&p.name!==other);
  if(!results.length){list.classList.remove('open');return;}
  list.innerHTML=results.map(p=>`
    <div class="ac-item" onclick="selectMPlayer(${p.id},'${inpId}','${listId}',${pNum})">
      <div class="ac-av" style="background:${p.colors}">${getInit(p.name)}</div>
      <div><div style="font-weight:600;">${p.name}</div>
        <div style="font-size:.68rem;color:var(--chalk);">${p.region} · <span class="${p.fmt==='9-Ball'?'tag tn':'tag tt'}">${p.fmt}</span></div>
      </div>
      <div class="ac-rank">#${p.rank}</div>
    </div>`).join('');
  list.classList.add('open');
}
function selectMPlayer(id,inpId,listId,pNum){
  const p=PLAYERS.find(x=>x.id===id);
  document.getElementById(inpId).value=p.name;
  document.getElementById(listId).classList.remove('open');
  if(pNum===1){mEntry.p1=p.name;mEntry.p1id=id;}
  else{mEntry.p2=p.name;mEntry.p2id=id;}
}
function updateManualWinner(){
  const s1=parseInt(document.getElementById('mp1-score')?.value||0);
  const s2=parseInt(document.getElementById('mp2-score')?.value||0);
  const p1n=mEntry.p1||'Player 1';
  const p2n=mEntry.p2||'Player 2';
  const sumEl=document.getElementById('m-entry-summary');
  if(!sumEl)return;
  if(s1===0&&s2===0){sumEl.style.display='none';return;}
  const maxScore=Math.max(s1,s2);
  const winner=s1>s2?p1n:s2>s1?p2n:'Tie';
  sumEl.style.display='block';
  sumEl.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
    <div><span style="color:var(--chalk);">Final Score: </span><strong style="font-family:'DM Mono',monospace;color:var(--gold);">${s1} – ${s2}</strong></div>
    ${maxScore<5?'<span style="color:#e55;font-size:.75rem;">⚠️ Winning score must be at least 5 racks</span>':'<span style="color:var(--grn3);">🏆 Winner: '+winner+'</span>'}
  </div>`;
}
function submitManualMatch(){
  if(!mEntry.p1){toast('⚠️ Select Player 1.');return;}
  if(!mEntry.p2){toast('⚠️ Select Player 2.');return;}
  if(mEntry.p1id===mEntry.p2id){toast('⚠️ Players must be different.');return;}
  const s1=parseInt(document.getElementById('mp1-score').value);
  const s2=parseInt(document.getElementById('mp2-score').value);
  // Business rule: max score is 25 (enforced by dropdown), winning score must be at least 5
  const maxScore=Math.max(s1,s2);
  if(maxScore<5){toast('⚠️ The winning score must be at least 5 racks. Please correct the scores.');return;}
  if(s1===s2){toast('⚠️ Scores cannot be tied. One player must win.');return;}

  const winner=s1>s2?mEntry.p1:mEntry.p2;

  const hcpParts=[];
  if(mEntry.rack[0]>0) hcpParts.push(`${mEntry.p1.split(' ')[0]} +${mEntry.rack[0]} racks`);
  if(mEntry.rack[1]>0) hcpParts.push(`${mEntry.p2.split(' ')[0]} +${mEntry.rack[1]} racks`);
  const b1=[...mEntry.balls[0]].sort((a,b)=>a-b);
  const b2=[...mEntry.balls[1]].sort((a,b)=>a-b);
  if(b1.length) hcpParts.push(`${mEntry.p1.split(' ')[0]} spots ${b1.join(',')}-ball`);
  if(b2.length) hcpParts.push(`${mEntry.p2.split(' ')[0]} spots ${b2.join(',')}-ball`);

  const entry={
    p1:mEntry.p1,p2:mEntry.p2,fmt:mEntry.fmt,type:mEntry.type,
    sc:`${s1}-${s2}`,winner,
    hcp:hcpParts.join(' · ')||'None',
    status:'pending',
    ts:new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}),
    p1accept:false,p2accept:false
  };
  manualPending.push(entry);
  renderManualPending();

  // Reset form fields
  document.getElementById('mp1-inp').value='';
  document.getElementById('mp2-inp').value='';
  document.getElementById('mp1-score').value='0';
  document.getElementById('mp2-score').value='0';
  const sumEl=document.getElementById('m-entry-summary');
  if(sumEl) sumEl.style.display='none';
  mEntry.p1='';mEntry.p2='';mEntry.p1id=null;mEntry.p2id=null;
  mEntry.rack=[0,0];mEntry.balls=[new Set(),new Set()];
  [1,2].forEach(p=>{
    const row=document.getElementById(`mp${p}-rack-row`);
    if(row) row.querySelectorAll('.rhcp-btn').forEach((b,i)=>b.classList.toggle('act',i===0));
    buildMBallGrid(p);
  });

  toast(`📨 Match recorded! Notification sent to <strong>${entry.p1.split(' ')[0]}</strong> and <strong>${entry.p2.split(' ')[0]}</strong>. 🏆 Winner: <strong>${winner.split(' ')[0]}</strong>`);
}
function renderManualPending(){
  const el=document.getElementById('manual-pending-list');
  if(!el)return;
  if(!manualPending.length){el.innerHTML='';return;}
  el.innerHTML=`
    <div style="font-family:'Bebas Neue',sans-serif;font-size:.9rem;letter-spacing:2px;color:var(--gold);margin-bottom:.8rem;padding-top:.8rem;border-top:1px solid var(--border);">
      ⏳ Awaiting Player Acceptance <span style="background:var(--gold-dim);border:1px solid var(--border);border-radius:10px;padding:1px 8px;font-size:.6rem;margin-left:4px;">${manualPending.length}</span>
    </div>
    ${manualPending.map((m,i)=>`
    <div style="background:rgba(200,168,75,.04);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:.7rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:.7rem;">
        <div>
          <div style="font-weight:600;">${m.p1} vs ${m.p2}</div>
          <div style="font-size:.73rem;color:var(--chalk);margin-top:3px;">
            <span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span>
            <span class="tag tgd" style="margin-left:3px;">${m.type}</span>
            · Score: <strong style="color:var(--gold);">${m.sc}</strong>
            · 🏆 <strong style="color:var(--grn3);">${m.winner?.split(' ')[0]||'—'} wins</strong>
          </div>
          ${m.hcp!=='None'?`<div style="font-size:.7rem;color:#e55;margin-top:2px;">Hcp: ${m.hcp}</div>`:''}
        </div>
        <div style="font-size:.7rem;color:var(--chalk2);">${m.ts}</div>
      </div>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;font-size:.76rem;">
          <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${m.p1accept?'var(--grn3)':'var(--border)'};background:${m.p1accept?'var(--grn2)':''};display:flex;align-items:center;justify-content:center;font-size:.6rem;cursor:pointer;" onclick="simAccept(${i},1)">${m.p1accept?'✓':'?'}</div>
          <span style="color:${m.p1accept?'var(--grn3)':'var(--chalk)'};">${m.p1.split(' ')[0]} — ${m.p1accept?'Accepted':'Pending'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:.76rem;">
          <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${m.p2accept?'var(--grn3)':'var(--border)'};background:${m.p2accept?'var(--grn2)':''};display:flex;align-items:center;justify-content:center;font-size:.6rem;cursor:pointer;" onclick="simAccept(${i},2)">${m.p2accept?'✓':'?'}</div>
          <span style="color:${m.p2accept?'var(--grn3)':'var(--chalk)'};">${m.p2.split(' ')[0]} — ${m.p2accept?'Accepted':'Pending'}</span>
        </div>
      </div>
    </div>`).join('')}`;
}
function simAccept(i,p){
  // Simulate player accepting (in real app this would be triggered by the player's device)
  if(p===1) manualPending[i].p1accept=true;
  else manualPending[i].p2accept=true;
  if(manualPending[i].p1accept&&manualPending[i].p2accept){
    const m=manualPending.splice(i,1)[0];
    // Add to hall history
    hallHistory.unshift({...m,date:'2026-02-22',ts:'Just now'});
    toast(`✅ Both players accepted! Match recorded and rankings updated.`);
  } else {
    toast(`✅ ${p===1?manualPending[i]?.p1:manualPending[i]?.p2} accepted. Waiting for other player…`);
  }
  renderManualPending();
}

function valMatch(i,ok){
  pendVal.splice(i,1);
  ptab('matches');
  toast(ok?'✅ Match validated! Rankings updated.':'❌ Match rejected. Players notified.');
}

/* ══════════════════ PENDING NOTICE ══════════════════ */
function showPendNotice(){
  if(!app.user)return;
  document.getElementById('pend-area').innerHTML=`
    <div class="pend" onclick="showPendNotice_open()">
      <div style="font-size:1.4rem;">📨</div>
      <div>
        <div style="font-weight:600;font-size:.9rem;">Match Challenge — <span style="color:var(--gold);">Carlo Biado Jr.</span> challenges you to 9-Ball Race to 7</div>
        <div style="font-size:.73rem;color:var(--chalk);margin-top:2px;">Cue Masters Billiards, Quezon City · Tap to accept or decline</div>
      </div>
      <div style="margin-left:auto;"><span style="background:var(--red2);border:1px solid var(--red3);border-radius:10px;padding:3px 9px;font-size:.68rem;color:#e55;">Awaiting Reply</span></div>
    </div>`;
}
function showPendNotice_open(){
  document.getElementById('chal-from').textContent='Carlo Biado Jr.';
  document.getElementById('chal-fmt').textContent='9-Ball';
  document.getElementById('chal-race').textContent='Race to 7';
  document.getElementById('chal-venue').textContent='Cue Masters Billiards';
  document.getElementById('m-chal').classList.add('open');
}
function acceptChal(){
  closeM('m-chal');
  app.p1=app.user.name;app.p1id=PLAYERS.find(p=>p.name===app.user.name)?.id||1;
  app.p2='Carlo Biado Jr.';app.p2id=2;
  document.getElementById('p1-inp').value=app.p1;
  document.getElementById('p2-inp').value=app.p2;
  hcpState.rack=[0,0];hcpState.balls=[new Set(),new Set()];
  app.raceTo=7;
  document.querySelectorAll('.race-btn').forEach(b=>{b.classList.remove('act');if(b.textContent==='7')b.classList.add('act');});
  document.getElementById('pend-area').innerHTML='';
  sDone(1);sDone(2);sAct(3);
  showStreamPanel();
  toast(`✅ Challenge accepted! Proceed to stream setup.`);
  sv('match',document.querySelectorAll('.nb')[1]);
}
function declineChal(){closeM('m-chal');document.getElementById('pend-area').innerHTML='';toast('❌ Challenge declined.');}

/* ══════════════════ ADMIN PORTAL ══════════════════ */

// Registered player list with admin-editable status
const adminPlayers = [];

// Hall owner pending applications
const adminHalls = [];

// Pending match approvals (fully confirmed by both players, awaiting admin final sign-off)
const adminMatches = [];

const CAREER_TIERS=['Amateur','Skilled','Semi-Pro','Pro','Elite'];
const STATUS_OPTS=['active','suspended','pending','review'];

function buildAdmin(){
  if(app.user?.role!=='admin'){toast('⚠️ Admin access only.');return;}
  // Fetch real registrations then render
  fetch('/api/registrations')
    .then(r=>r.json())
    .then(regs=>{app.realRegs=regs;_renderAdmin();})
    .catch(()=>{app.realRegs=app.realRegs||[];_renderAdmin();});
}
function _renderAdmin(){
  const pendP=adminPlayers.filter(p=>p.status==='pending').length+(app.realRegs||[]).filter(r=>r.status==='pending').length;
  const pendH=adminHalls.filter(h=>h.status==='pending'||h.status==='review').length;
  const pendM=adminMatches.filter(m=>m.status==='pending'||m.status==='review').length;
  const el=id=>document.getElementById(id);
  el('adm-b-players').textContent=pendP;
  el('adm-b-halls').textContent=pendH;
  el('adm-b-matches').textContent=pendM;
  el('adm-stats').innerHTML=`
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--gold);">${adminPlayers.length+(app.realRegs||[]).filter(r=>r.status==='active').length}</div>
      <div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Players</div>
    </div>
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--gold);">${adminHalls.length+HALLS.length}</div>
      <div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Halls</div>
    </div>
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:#e55;">${pendP+pendH+pendM}</div>
      <div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--chalk);">Pending</div>
    </div>`;
  admTab(document.querySelector('.adm-tab.act')||document.querySelector('.adm-tab'), 'players');
}

function admTab(btn,tab){
  document.querySelectorAll('.adm-tab').forEach(b=>b.classList.remove('act'));
  if(btn) btn.classList.add('act');
  const c=document.getElementById('adm-content');
  app.admTab=tab;

  /* ── PLAYER REGISTRY ── */
  if(tab==='players'){
    const filterStat=app.admPlayerFilter||'all';
    const searchQ=(app.admPlayerQ||'').toLowerCase();
    let data=adminPlayers.filter(p=>{
      if(filterStat!=='all'&&p.status!==filterStat)return false;
      if(searchQ&&!p.name.toLowerCase().includes(searchQ))return false;
      return true;
    });
    // Real registrations from API
    const realRegs=app.realRegs||[];
    const pendingRegs=realRegs.filter(r=>r.status==='pending');
    const pendingRegsHtml=pendingRegs.length?`
    <div class="card" style="margin-bottom:1.1rem;border-color:rgba(200,168,75,.4);background:linear-gradient(145deg,rgba(200,168,75,.07),rgba(8,14,6,.95));">
      <div class="ct">🔔 New Registrations <span class="adm-badge" style="background:var(--gold);color:#080400;">${pendingRegs.length}</span></div>
      <p style="font-size:.76rem;color:var(--chalk);margin-bottom:1rem;">These people registered on pinoypool.com and are waiting for activation.</p>
      ${pendingRegs.map(r=>{
        const roleIcon={player:'🎱',owner:'🏢',scout:'👁️'}[r.role]||'🎱';
        const dt=new Date(r.submittedAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
        return`<div class="adm-row" style="border-color:rgba(200,168,75,.25);">
          <div style="display:flex;align-items:center;gap:.9rem;min-width:0;flex:1;">
            <div class="av" style="background:#1a3a22;font-size:.7rem;flex-shrink:0;">${r.firstName[0]}${r.lastName[0]}</div>
            <div style="min-width:0;">
              <div style="font-weight:600;font-size:.9rem;">${r.firstName} ${r.lastName} <span style="font-size:.65rem;color:var(--chalk);font-weight:400;">${roleIcon} ${r.role.toUpperCase()}</span></div>
              <div style="font-size:.72rem;color:var(--chalk);margin-top:2px;">${r.email||'<em>no email</em>'} ${r.phone?'· '+r.phone:''}</div>
              ${r.hallName?`<div style="font-size:.68rem;color:var(--chalk2);">Hall: ${r.hallName} · ${r.city||''}</div>`:''}
              <div style="font-size:.65rem;color:var(--chalk2);margin-top:2px;">Submitted: ${dt}</div>
            </div>
          </div>
          <div class="adm-actions">
            <span class="status-pill sp-pending">● pending</span>
            <button class="btn btn-s btn-sm" onclick="admApproveReg('${r.id}')">✓ Activate</button>
            <button class="btn btn-d btn-sm" onclick="admRejectReg('${r.id}')">✗ Reject</button>
          </div>
        </div>`;
      }).join('')}
    </div>`:'';
    c.innerHTML=pendingRegsHtml+`
    <div class="card">
      <div class="ct">🎱 Player Registry <span style="font-size:.7rem;color:var(--chalk);font-family:'Barlow Condensed',sans-serif;font-weight:400;text-transform:none;letter-spacing:0;">Manage player statuses and career tiers</span></div>
      <div style="display:flex;gap:.8rem;margin-bottom:1.1rem;flex-wrap:wrap;align-items:center;">
        <input type="text" id="adm-psearch" placeholder="🔍 Search player name…" value="${app.admPlayerQ||''}" oninput="app.admPlayerQ=this.value;admRefresh()" style="max-width:260px;flex:1;">
        <div class="tg" style="width:auto;flex-wrap:nowrap;">
          <button class="tb${filterStat==='all'?' act':''}" style="flex:none;padding:6px 12px;" onclick="app.admPlayerFilter='all';admRefresh()">All</button>
          <button class="tb${filterStat==='pending'?' act':''}" style="flex:none;padding:6px 12px;" onclick="app.admPlayerFilter='pending';admRefresh()">Pending</button>
          <button class="tb${filterStat==='active'?' act':''}" style="flex:none;padding:6px 12px;" onclick="app.admPlayerFilter='active';admRefresh()">Active</button>
          <button class="tb${filterStat==='suspended'?' act':''}" style="flex:none;padding:6px 12px;" onclick="app.admPlayerFilter='suspended';admRefresh()">Suspended</button>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:.7rem;color:var(--chalk2);">${data.length} players</span>
      </div>
      ${data.map((p,i)=>{
        const sClass={active:'sp-active',pending:'sp-pending',suspended:'sp-suspended',review:'sp-review'}[p.status]||'sp-pending';
        const tDef=CAREER_TIERS.indexOf(p.careerStatus);
        return`<div class="adm-row">
          <div style="display:flex;align-items:center;gap:.9rem;min-width:0;flex:1;">
            <div class="av" style="background:${p.colors||'#1a3a22'};flex-shrink:0;">${getInit(p.name)}</div>
            <div style="min-width:0;">
              <div style="font-weight:600;font-size:.9rem;">${p.name}</div>
              <div style="font-size:.7rem;color:var(--chalk);margin-top:2px;">${p.email} · ${p.region} · #${p.rank} National</div>
              <div style="font-size:.68rem;color:var(--chalk2);margin-top:1px;">Joined ${p.joined} · <span class="${p.fmt==='9-Ball'?'tag tn':'tag tt'}" style="font-size:.52rem;">${p.fmt}</span> · W:${p.mw} L:${p.ml}</div>
            </div>
          </div>
          <div class="adm-actions">
            <span class="status-pill ${sClass}">● ${p.status}</span>
            <select style="width:auto;padding:5px 9px;font-size:.78rem;" onchange="admSetPlayerStatus(${p.id},this.value)">
              ${STATUS_OPTS.map(s=>`<option value="${s}"${p.status===s?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
            </select>
            <select style="width:auto;padding:5px 9px;font-size:.78rem;" title="Career Status" onchange="admSetCareer(${p.id},this.value)">
              ${CAREER_TIERS.map(t=>`<option value="${t}"${p.careerStatus===t?' selected':''}>${t}</option>`).join('')}
            </select>
            ${p.status==='pending'?`<button class="btn btn-s btn-sm" onclick="admApprovePlayer(${p.id})">✓ Approve</button>`:''}
            ${p.status==='active'?`<button class="btn btn-d btn-sm" onclick="admSuspendPlayer(${p.id})">⊘ Suspend</button>`:''}
          </div>
        </div>`;
      }).join('')}
      ${!data.length?'<div style="color:var(--chalk2);font-size:.82rem;text-align:center;padding:1.5rem 0;">No players match this filter</div>':''}
    </div>`;

  /* ── HALL OWNERS ── */
  } else if(tab==='halls'){
    c.innerHTML=`
    <div class="card" style="margin-bottom:1.1rem;">
      <div class="ct">🏢 Hall Owner Applications <span style="font-family:'DM Mono',monospace;font-size:.65rem;font-weight:400;text-transform:none;letter-spacing:0;color:var(--chalk);">${adminHalls.filter(h=>h.status==='pending').length} pending review</span></div>
      <p style="font-size:.78rem;color:var(--chalk);margin-bottom:1.1rem;">Review and approve venue registrations. Approved halls get listed publicly and their owner receives portal access.</p>
      ${adminHalls.map((h,i)=>{
        const sClass={pending:'sp-pending',active:'sp-active',review:'sp-review',rejected:'sp-suspended'}[h.status]||'sp-pending';
        return`<div class="adm-row">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;">${h.name}</div>
              <span class="status-pill ${sClass}">● ${h.status}</span>
            </div>
            <div style="font-size:.73rem;color:var(--chalk);">Owner: <strong>${h.owner}</strong> · 📍 ${h.city} · ${h.tables} tables</div>
            <div style="font-size:.7rem;color:var(--chalk2);margin-top:2px;">${h.email} · ${h.contact} · Submitted ${h.submitted}</div>
            <div style="font-size:.7rem;color:var(--gold);margin-top:2px;">📘 ${h.fb}</div>
          </div>
          <div class="adm-actions">
            ${h.status==='pending'||h.status==='review'?`
              <button class="btn btn-d btn-sm" onclick="admRejectHall('${h.id}')">✗ Reject</button>
              <button class="btn btn-s btn-sm" onclick="admApproveHall('${h.id}')">✓ Approve & Grant Access</button>`
            :`<span style="font-size:.75rem;color:var(--chalk2);">Processed</span>`}
          </div>
        </div>`;
      }).join('')}
      ${!adminHalls.length?'<div style="color:var(--chalk2);font-size:.82rem;text-align:center;padding:1.5rem 0;">No hall applications yet</div>':''}
    </div>
    <div class="card">
      <div class="ct">✅ Registered Halls <span style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:400;text-transform:none;letter-spacing:0;color:var(--chalk);">${HALLS.length} approved venues</span></div>
      ${HALLS.map(h=>`
        <div class="adm-row">
          <div style="flex:1;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:1px;">${h.n}</div>
            <div style="font-size:.73rem;color:var(--chalk);">📍 ${h.c} · ${h.t} tables · ${h.fmt}</div>
          </div>
          <div class="adm-actions">
            <span class="status-pill ${h.open?'sp-active':'sp-suspended'}">● ${h.open?'Open':'Closed'}</span>
            <button class="btn btn-g btn-sm" onclick="toast('✏️ Edit feature — ${h.n}')">✏️ Edit</button>
          </div>
        </div>`).join('')}
      ${!HALLS.length?'<div style="color:var(--chalk2);font-size:.82rem;text-align:center;padding:1.5rem 0;">No approved halls yet</div>':''}
    </div>`;

  /* ── MATCH APPROVALS ── */
  } else if(tab==='matches'){
    c.innerHTML=`
    <div class="card">
      <div class="ct">⚡ Final Match Approvals <span style="font-family:'DM Mono',monospace;font-size:.65rem;font-weight:400;text-transform:none;letter-spacing:0;color:var(--chalk);">${adminMatches.filter(m=>m.status==='pending').length} awaiting approval</span></div>
      <p style="font-size:.78rem;color:var(--chalk);margin-bottom:1.1rem;">These matches have been confirmed by both players and the venue. Admin approval is the final step before rankings are updated.</p>
      ${adminMatches.map((m,i)=>{
        const sClass={pending:'sp-pending',approved:'sp-active',review:'sp-review',rejected:'sp-suspended'}[m.status]||'sp-pending';
        return`<div class="adm-row">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:.92rem;">${m.p1} <span style="color:var(--chalk2);">vs</span> ${m.p2}</div>
            <div style="font-size:.73rem;color:var(--chalk);margin-top:3px;">
              <span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span>
              <span class="tag tgd" style="margin-left:3px;">${m.type}</span>
              · Score: <strong style="font-family:'DM Mono',monospace;color:var(--gold);">${m.score}</strong>
              ${m.hcp!=='None'?`· <span style="color:#e55;">Hcp: ${m.hcp}</span>`:''}
            </div>
            <div style="font-size:.7rem;color:var(--chalk2);margin-top:2px;">📍 ${m.venue} · 📅 ${m.date}</div>
            <div style="display:flex;gap:8px;margin-top:4px;font-size:.68rem;">
              <span style="color:${m.p1ok?'var(--grn3)':'#e55'};">${m.p1ok?'✓':'✗'} ${m.p1.split(' ')[0]}</span>
              <span style="color:${m.p2ok?'var(--grn3)':'#e55'};">${m.p2ok?'✓':'✗'} ${m.p2.split(' ')[0]}</span>
              <span style="color:${m.venueOk?'var(--grn3)':'#e55'};">${m.venueOk?'✓':'✗'} Venue</span>
            </div>
          </div>
          <div class="adm-actions">
            <span class="status-pill ${sClass}">● ${m.status}</span>
            ${m.status==='pending'||m.status==='review'?`
              <button class="btn btn-d btn-sm" onclick="admRejectMatch('${m.id}')">✗ Reject</button>
              <button class="btn btn-s btn-sm" onclick="admApproveMatch('${m.id}')">✓ Approve & Update Rankings</button>`
            :`<span style="font-size:.75rem;color:var(--chalk2);">Processed</span>`}
          </div>
        </div>`;
      }).join('')}
      ${!adminMatches.length?'<div style="color:var(--chalk2);font-size:.82rem;text-align:center;padding:1.5rem 0;">No match approvals pending yet</div>':''}
    </div>`;

  /* ── REGISTER HALL OWNER ── */
  } else if(tab==='register-hall'){
    c.innerHTML=`
    <div class="card" style="max-width:700px;">
      <div class="ct">➕ Register New Hall Owner</div>
      <p style="font-size:.78rem;color:var(--chalk);margin-bottom:1.2rem;line-height:1.6;">Manually register a hall owner and grant them immediate portal access. They will be able to validate matches, manage their hall listing, and record matches at their venue.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
        <div class="fg"><label>Owner First Name</label><input type="text" id="rh-fn" placeholder="Juan"></div>
        <div class="fg"><label>Owner Last Name</label><input type="text" id="rh-ln" placeholder="dela Cruz"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
        <div class="fg"><label>Email Address</label><input type="email" id="rh-em" placeholder="owner@hallname.ph"></div>
        <div class="fg"><label>Mobile Number</label><input type="tel" id="rh-ph" placeholder="09xxxxxxxxx"></div>
      </div>
      <div class="fg"><label>Billiard Hall Name</label><input type="text" id="rh-hn" placeholder="e.g. Supreme Cue Billiards"></div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:.8rem;">
        <div class="fg"><label>Full Address</label><input type="text" id="rh-addr" placeholder="Street, Barangay, City, Province"></div>
        <div class="fg"><label>Number of Tables</label><input type="number" id="rh-tables" placeholder="e.g. 12" min="1"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
        <div class="fg"><label>Operating Hours</label><input type="text" id="rh-hrs" placeholder="9AM – 12MN daily"></div>
        <div class="fg"><label>Game Formats Offered</label>
          <div class="tg"><button class="tb act" onclick="solo(this)" id="rh-fmt-9">9-Ball</button><button class="tb" onclick="solo(this)" id="rh-fmt-10">10-Ball</button><button class="tb" onclick="solo(this)">Both</button></div>
        </div>
      </div>
      <div class="fg"><label>Facebook Page URL</label><input type="url" id="rh-fb" placeholder="https://facebook.com/yourhall"></div>
      <div style="background:rgba(200,168,75,.06);border:1px solid var(--border);border-radius:8px;padding:.9rem;margin-bottom:1rem;">
        <div style="font-size:.68rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:.5rem;">Access Credentials (auto-generated)</div>
        <div style="font-size:.78rem;color:var(--chalk);">A temporary login will be created and sent to the owner's email. They can change their password on first login.</div>
      </div>
      <div style="display:flex;gap:.8rem;">
        <button class="btn btn-g" style="flex:1;" onclick="admTab(null,'halls')">← Back</button>
        <button class="btn btn-p" style="flex:2;" onclick="admRegisterHallOwner()">✓ Register Hall Owner & Grant Access</button>
      </div>
    </div>`;
  }
}

function admRefresh(){admTab(document.querySelector('.adm-tab.act'),app.admTab||'players');}

/* ── Player actions ── */
function admSetPlayerStatus(id,status){
  const p=adminPlayers.find(x=>x.id===id);
  if(!p)return;
  p.status=status;
  admRefresh();
  toast(`✅ <strong>${p.name}</strong> status set to <strong>${status}</strong>.`);
}
function admSetCareer(id,tier){
  const p=adminPlayers.find(x=>x.id===id);
  if(!p)return;
  p.careerStatus=tier;
  admRefresh();
  toast(`✅ <strong>${p.name}</strong> career status → <strong>${tier}</strong>.`);
}
function admApprovePlayer(id){
  const p=adminPlayers.find(x=>x.id===id);
  if(!p)return;
  p.status='active';
  buildAdmin();
  toast(`✅ <strong>${p.name}</strong> approved and activated! Welcome notification sent.`);
}
function admApproveReg(id){
  fetch(`/api/registrations/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'active'})})
    .then(r=>r.json())
    .then(data=>{
      const r=data.entry;
      toast(`✅ <strong>${r.firstName} ${r.lastName}</strong> activated! They can now log in.`);
      buildAdmin();
    })
    .catch(()=>toast('⚠️ Could not update. Try again.'));
}
function admRejectReg(id){
  fetch(`/api/registrations/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'rejected'})})
    .then(r=>r.json())
    .then(data=>{
      const r=data.entry;
      toast(`✗ <strong>${r.firstName} ${r.lastName}</strong> registration rejected.`);
      buildAdmin();
    })
    .catch(()=>toast('⚠️ Could not update. Try again.'));
}
function admSuspendPlayer(id){
  const p=adminPlayers.find(x=>x.id===id);
  if(!p)return;
  p.status='suspended';
  buildAdmin();
  toast(`⊘ <strong>${p.name}</strong> has been suspended.`);
}

/* ── Hall actions ── */
function admApproveHall(id){
  const h=adminHalls.find(x=>x.id===id);
  if(!h)return;
  h.status='active';
  // Add to public HALLS list
  HALLS.push({n:h.name,c:h.city,t:h.tables,open:true,fmt:'9-Ball, 10-Ball',ap:0,fb:h.fb.replace('fb.com/','')});
  buildAdmin();
  toast(`✅ <strong>${h.name}</strong> approved! Hall is now live. <strong>${h.owner}</strong> granted portal access.`);
}
function admRejectHall(id){
  const h=adminHalls.find(x=>x.id===id);
  if(!h)return;
  h.status='rejected';
  buildAdmin();
  toast(`✗ <strong>${h.name}</strong> application rejected. Owner notified.`);
}

/* ── Match actions ── */
function admApproveMatch(id){
  const m=adminMatches.find(x=>x.id===id);
  if(!m)return;
  m.status='approved';
  // Add to dashboard log
  const lc=document.getElementById('dash-log');
  if(lc){
    const e=document.createElement('div');
    e.className='le lw';
    e.innerHTML=`<div><div style="font-weight:600;">${m.p1} vs ${m.p2}</div><div style="font-size:.72rem;color:var(--chalk);margin-top:2px;"><span class="tag ${m.fmt==='9-Ball'?'tn':'tt'}">${m.fmt}</span> <span class="tag tgd">${m.type}</span> · <span class="tag tok">✓ Admin Approved</span></div></div><div style="text-align:right;"><div style="font-family:'DM Mono',monospace;color:var(--gold);">${m.score}</div><div style="font-size:.67rem;color:var(--chalk2);">Just now</div></div>`;
    lc.prepend(e);
  }
  buildAdmin();
  toast(`✅ Match <strong>${m.p1} vs ${m.p2}</strong> approved! Rankings updated.`);
}
function admRejectMatch(id){
  const m=adminMatches.find(x=>x.id===id);
  if(!m)return;
  m.status='rejected';
  buildAdmin();
  toast(`✗ Match rejected. Both players and venue have been notified.`);
}

/* ── Register Hall Owner ── */
function admRegisterHallOwner(){
  const fn=document.getElementById('rh-fn')?.value.trim();
  const ln=document.getElementById('rh-ln')?.value.trim();
  const em=document.getElementById('rh-em')?.value.trim();
  const ph=document.getElementById('rh-ph')?.value.trim();
  const hn=document.getElementById('rh-hn')?.value.trim();
  const addr=document.getElementById('rh-addr')?.value.trim();
  const tables=parseInt(document.getElementById('rh-tables')?.value)||0;
  if(!fn||!ln||!em||!hn||!addr){toast('⚠️ Please fill in all required fields.');return;}
  const name=fn+' '+ln;
  // Add to hall applications as auto-approved
  const newId='h'+Date.now();
  adminHalls.unshift({id:newId,name:hn,owner:name,city:addr,tables,contact:ph||'—',email:em,fb:'—',status:'active',submitted:'2026-02-22'});
  HALLS.push({n:hn,c:addr,t:tables,open:true,fmt:'9-Ball, 10-Ball',ap:0,fb:'—'});
  buildAdmin();
  toast(`🎉 <strong>${name}</strong> registered as Hall Owner of <strong>${hn}</strong>! Portal access granted. Credentials sent to ${em}.`);
}

/* ── Stubs for removed scoreboard (v9 removed live scoreboard) ── */
function updateDots(){}
function addRL(){}
function renderRackLog(){}

/* ══════════════════ UTILS ══════════════════ */
function toast(msg){const t=document.getElementById('toast');t.innerHTML=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3200);}
function cap(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}
function getInit(n){return n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();}

/* ══════════════════ INIT ══════════════════ */
buildRaceRow();
buildBallGrid(1);
buildBallGrid(2);
updateDots();
updateBadge();

// Demo auto-login via URL param: ?demo=player | owner | scout
(function(){
  const params=new URLSearchParams(window.location.search);
  const demo=params.get('demo');
  if(!demo) return;
  const DEMOS={
    player:{name:'Efren Reyes Jr.',role:'player',initials:'ER',_toast:'🎱 Logged in as <strong>Efren Reyes Jr.</strong> — Player view'},
    owner:{name:'Ramon Dela Cruz',role:'owner',initials:'RC',hall:'Cue Masters Billiards',_toast:'🏢 Logged in as <strong>Ramon Dela Cruz</strong> — Hall Owner view'},
    scout:{name:'Mia Santos',role:'fan',initials:'MS',_toast:'👁 Logged in as <strong>Mia Santos</strong> — Scout / Fan view'},
    admin:{name:'Administrator',role:'admin',initials:'AD',_toast:'🔐 Logged in as <strong>Admin</strong> — Full system access'}
  };
  const u=DEMOS[demo];
  if(!u) return;
  const {_toast,...user}=u;
  setUser(user);
  setTimeout(()=>toast(_toast),400);
  // Auto-navigate to relevant portal
  if(demo==='owner') setTimeout(()=>sv('portal',document.getElementById('nb-portal')),800);
  if(demo==='player') setTimeout(()=>sv('player-portal',document.getElementById('nb-player-portal')),800);
  if(demo==='admin') setTimeout(()=>sv('admin',document.getElementById('nb-admin')),800);
})();
