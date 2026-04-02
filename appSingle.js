'use strict';
/* =============================================
   RecehDEX App — Riche Chain DEX
   Factory: 0xAeEdf8B9925c6316171f7c2815e387DE596Fa11B
   Router:  0x8E9556415124b6C726D5C3610d25c24Be8AC2304
   Chain:   132026 (Riche Chain Mainnet)
   ============================================= */

// ─── CHAIN & CONTRACTS ───────────────────────────────────────────────────────
const CHAIN = {
  id: 132026,
  hex: '0x203FA',
  name: 'Riche Chain Mainnet',
  rpc: 'https://seed-richechain.com/',
  explorer: 'https://richescan.com/',
  symbol: 'RIC',
  decimals: 18
};
const C = {
  FACTORY: '0xAeEdf8B9925c6316171f7c2815e387DE596Fa11B',
  ROUTER:  '0x8E9556415124b6C726D5C3610d25c24Be8AC2304',
  WRIC:    '0xEa126036c94Ab6A384A25A70e29E2fE2D4a91e68'
};
// Token list JSON URL
const TOKEN_LIST_URL = 'https://raw.githubusercontent.com/cryptorecehcom/receh-dex/refs/heads/main/token-list/tokenlist.json';
const WRIC_LOGO = 'https://raw.githubusercontent.com/cryptorecehcom/receh-dex/refs/heads/main/tokenlogo/WRIC.png';

// ─── BUILT-IN TOKENS ─────────────────────────────────────────────────────────
const T_RIC  = { address:'NATIVE', symbol:'RIC',  name:'Riche Chain',  decimals:18, logoURI:WRIC_LOGO, isNative:true  };
const T_WRIC = { address:C.WRIC,   symbol:'WRIC', name:'Wrapped RIC',  decimals:18, logoURI:WRIC_LOGO, isNative:false };

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const ERC20 = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];
const FACTORY_ABI = [
  'function getPair(address,address) view returns (address)',
  'function allPairs(uint256) view returns (address)',
  'function allPairsLength() view returns (uint256)'
];
const PAIR_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];
const ROUTER_ABI = [
  'function WETH() view returns (address)',
  'function getAmountsOut(uint256,address[]) view returns (uint256[])',
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns (uint256[])',
  'function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns (uint256[])',
  'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256[])',
  'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)',
  'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns (uint256,uint256,uint256)',
  'function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)',
  'function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)'
];

// ─── STATE ───────────────────────────────────────────────────────────────────
const S = {
  provider: null, signer: null, account: null, chainOk: false,
  slippage: 0.5, liqSlippage: 0.5, deadline: 20,
  tIn: null, tOut: null,
  liqA: null, liqB: null,
  importA: null, importB: null,
  removePct: 50, currentPos: null,
  modalCtx: null,          // which button triggered token modal
  allTokens: [T_RIC, T_WRIC],
  customTokens: [],
  txns: [],
  positions: [],
  quoteTimer: null
};

// Persist
function load(k, def) { try { const v = localStorage.getItem('rdex_'+k); return v ? JSON.parse(v) : def; } catch { return def; } }
function save(k, v)   { try { localStorage.setItem('rdex_'+k, JSON.stringify(v)); } catch {} }
S.customTokens = load('custom', []);
S.txns         = load('txns', []);
S.slippage     = load('slip', 0.5);
S.deadline     = load('ddl', 20);

function allToks() { return [...S.allTokens, ...S.customTokens]; }
function routeAddr(t) { return t.isNative ? C.WRIC : t.address; }

// ─── PROVIDERS ───────────────────────────────────────────────────────────────
const readProv = () => new ethers.providers.JsonRpcProvider(CHAIN.rpc);
const router   = (sp) => new ethers.Contract(C.ROUTER,  ROUTER_ABI,  sp || readProv());
const factory  = (sp) => new ethers.Contract(C.FACTORY, FACTORY_ABI, sp || readProv());
const erc20    = (a,sp) => new ethers.Contract(a, ERC20, sp || readProv());
const pair     = (a,sp) => new ethers.Contract(a, PAIR_ABI, sp || readProv());

// ─── UTILS ───────────────────────────────────────────────────────────────────
function short(a) { return a ? a.slice(0,6)+'…'+a.slice(-4) : ''; }
function fmt(bn, dec=18, dp=6) {
  if (!bn) return '0';
  try {
    const n = parseFloat(ethers.utils.formatUnits(bn, dec));
    if (n===0) return '0';
    if (n<0.000001) return '<0.000001';
    return n.toFixed(dp).replace(/\.?0+$/,'');
  } catch { return '0'; }
}
function parse(v, dec=18) {
  try { return ethers.utils.parseUnits(String(v), dec); }
  catch { return ethers.BigNumber.from(0); }
}
function ddl() { return Math.floor(Date.now()/1000) + S.deadline*60; }
function minAmt(bn) {
  const bps = Math.floor(10000 - S.slippage*100);
  return bn.mul(bps).div(10000);
}
function minAmtLiq(bn) {
  const bps = Math.floor(10000 - S.liqSlippage*100);
  return bn.mul(bps).div(10000);
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function showTx(t,s) { $('txTitle').textContent=t||'Processing…'; $('txMsg').textContent=s||'Confirm in wallet'; $('txMask').classList.add('show'); }
function hideTx()    { $('txMask').classList.remove('show'); }

function toast(msg, type='info', ms=4000) {
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.innerHTML = `<span class="ti"></span><span>${msg}</span>`;
  $('toastStack').appendChild(el);
  setTimeout(()=>{ el.style.animation='toastOut .3s ease forwards'; setTimeout(()=>el.remove(),300); }, ms);
}

function openModal(id)  { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// ─── BACKGROUND CANVAS ───────────────────────────────────────────────────────
function initCanvas() {
  const c = $('bgCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, particles = [];
  function resize() {
    W = c.width  = window.innerWidth;
    H = c.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  for (let i=0;i<60;i++) particles.push({
    x:Math.random()*1920, y:Math.random()*1080,
    vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
    r:Math.random()*1.5+.5,
    c:Math.random()>.5?'rgba(0,200,255,':'rgba(148,0,255,'
  });
  function draw() {
    ctx.clearRect(0,0,W,H);
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.c+'0.7)';
      ctx.fill();
    });
    // connect nearby
    for(let i=0;i<particles.length;i++) {
      for(let j=i+1;j<particles.length;j++) {
        const d=Math.hypot(particles[i].x-particles[j].x, particles[i].y-particles[j].y);
        if(d<120) {
          ctx.beginPath();
          ctx.strokeStyle=`rgba(0,200,255,${.15*(1-d/120)})`;
          ctx.lineWidth=.5;
          ctx.moveTo(particles[i].x,particles[i].y);
          ctx.lineTo(particles[j].x,particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── TOKEN LIST (from JSON URL, with CORS proxy fallback) ────────────────────
async function loadTokenList() {
  if (!TOKEN_LIST_URL) return;

  // Try direct fetch first; if blocked by CORS use a public proxy
  const urls = [
    TOKEN_LIST_URL,
    'https://corsproxy.io/?' + encodeURIComponent(TOKEN_LIST_URL),
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(TOKEN_LIST_URL)
  ];

  let data = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      data = await res.json();
      if (data && Array.isArray(data.tokens)) break; // success
      data = null;
    } catch(e) { data = null; }
  }

  if (!data || !Array.isArray(data.tokens)) {
    console.warn('Token list unavailable from all sources.');
    return;
  }

  // Filter to this chain only, skip WRIC (already built-in)
  const wricLower = C.WRIC.toLowerCase();
  const seen = new Set(S.allTokens.map(t => t.address.toLowerCase()));

  data.tokens
    .filter(t => !t.chainId || t.chainId === CHAIN.id)   // only our chain
    .forEach(t => {
      const addr = (t.address || '').toLowerCase();
      if (!addr || addr === wricLower || seen.has(addr)) return; // skip dups & WRIC
      S.allTokens.push({
        address:  t.address,
        symbol:   t.symbol  || '???',
        name:     t.name    || t.symbol || '???',
        decimals: t.decimals ?? 18,
        logoURI:  t.logoURI || '',
        isNative: false
      });
      seen.add(addr);
    });

  console.log('Token list loaded. Total tokens:', S.allTokens.length);
}

// ─── WALLET ───────────────────────────────────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) { toast('No wallet detected. Install MetaMask.','err'); return; }
  try {
    showTx('Connecting…','Approve in your wallet');
    await window.ethereum.request({ method:'eth_requestAccounts' });
    S.provider = new ethers.providers.Web3Provider(window.ethereum);
    S.signer   = S.provider.getSigner();
    S.account  = await S.signer.getAddress();
    await ensureChain();
    closeModal('walletModalWrap');
    updateWalletUI();
    refreshBals();
    loadPositions();
    toast('Wallet connected!','ok');
    hideTx();
  } catch(e) {
    hideTx();
    if (e.code===4001) toast('Connection rejected.','warn');
    else toast('Connect failed: '+(e.message||e),'err');
  }
}
async function ensureChain() {
  try {
    const net = await S.provider.getNetwork();
    if (net.chainId !== CHAIN.id) await switchChain();
    S.chainOk = true;
  } catch { S.chainOk = false; }
}
async function switchChain() {
  try {
    await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{chainId:CHAIN.hex}] });
  } catch(e) {
    if (e.code===4902) {
      await window.ethereum.request({ method:'wallet_addEthereumChain', params:[{
        chainId:CHAIN.hex, chainName:CHAIN.name, rpcUrls:[CHAIN.rpc],
        nativeCurrency:{name:CHAIN.name,symbol:CHAIN.symbol,decimals:18},
        blockExplorerUrls:[CHAIN.explorer]
      }]});
    } else throw e;
  }
}
function disconnectWallet() {
  S.provider=null; S.signer=null; S.account=null; S.chainOk=false;
  updateWalletUI();
  closeModal('wdWrap');
  toast('Disconnected.','info');
  updateSwapBtn();
  $('balIn').textContent='Balance: —';
  $('balOut').textContent='Balance: —';
  $('wdBal').textContent='0 RIC';
}
function updateWalletUI() {
  const wpText = $('wpText');
  if (S.account) {
    wpText.textContent = short(S.account);
    $('wdAddr').textContent = short(S.account);
    $('wdExplorer').href = CHAIN.explorer+'address/'+S.account;
    updateWdBal();
    // Update mobile wallet area
    const mwa = $('mobWalletArea');
    mwa.innerHTML = `<div class="mob-wallet-info"><span class="mob-addr">${short(S.account)}</span><span class="mob-act">Connected</span></div><button class="ghost-btn" id="mobDisconnectBtn">Disconnect</button>`;
    $('mobDisconnectBtn')?.addEventListener('click',()=>{ disconnectWallet(); closeMobMenu(); });
  } else {
    wpText.textContent = 'Connect';
    $('mobWalletArea').innerHTML = `<button class="action-btn" id="mobConnectBtn">Connect Wallet</button>`;
    $('mobConnectBtn')?.addEventListener('click',()=>{ openModal('walletModalWrap'); closeMobMenu(); });
  }
}
async function updateWdBal() {
  if (!S.account||!S.provider) return;
  try {
    const b = await S.provider.getBalance(S.account);
    $('wdBal').textContent = parseFloat(ethers.utils.formatEther(b)).toFixed(4)+' RIC';
  } catch {}
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navTo(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-link,.mob-link').forEach(l=>{
    l.classList.toggle('active', l.dataset.page===page);
  });
  const pg = $('page-'+page);
  if (pg) pg.classList.add('active');
  if (page==='pool') loadPositions();
}
function closeMobMenu() {
  $('mobMenu').classList.remove('open');
  $('mobOverlay').classList.remove('show');
  $('burgerBtn').classList.remove('open');
}

// ─── TOKEN MODAL ─────────────────────────────────────────────────────────────
function openTokModal(ctx) {
  S.modalCtx = ctx;
  $('tokSearch').value = '';
  $('clearSearch').style.display='none';
  renderTokList('');
  openModal('tokModalWrap');
  setTimeout(()=>$('tokSearch').focus(),150);
}
function closeTokModal() {
  closeModal('tokModalWrap');
  S.modalCtx = null;
}

function renderTokList(q) {
  const all = allToks();
  const search = q.trim().toLowerCase();
  const list = search
    ? all.filter(t =>
        t.symbol.toLowerCase().includes(search) ||
        t.name.toLowerCase().includes(search) ||
        t.address.toLowerCase().includes(search)
      )
    : all;

  // Common chips
  const chips = $('commonChips');
  chips.innerHTML = '';
  all.slice(0, 8).forEach(t => {
    const b = document.createElement('button');
    b.className = 'tok-chip';
    const logoHtml = t.logoURI
      ? `<img src="${t.logoURI}" onerror="this.style.display='none'" alt=""/>`
      : '';
    b.innerHTML = logoHtml + escHtml(t.symbol);
    b.addEventListener('click', () => selectTok(t));
    chips.appendChild(b);
  });

  const inner = $('tokListInner');
  inner.innerHTML = '';

  // If search looks like a full address not already in list
  if (search.startsWith('0x') && search.length === 42 &&
      !all.find(x => x.address.toLowerCase() === search)) {
    fetchAddrToken(search);
  }

  if (list.length === 0) {
    inner.innerHTML = '<div class="loading-row">No tokens found</div>';
    return;
  }

  list.forEach(t => {
    const safeId = 'tbal_' + t.address.replace(/[^a-zA-Z0-9]/g, '_');
    const row = document.createElement('div');
    row.className = 'tok-item';
    const ico = t.logoURI
      ? `<div class="tok-ico"><img src="${t.logoURI}" alt="" onerror="this.style.display='none';this.parentNode.textContent='${escHtml(t.symbol.slice(0,2))}'"/></div>`
      : `<div class="tok-ico">${escHtml(t.symbol.slice(0,2))}</div>`;
    row.innerHTML = `
      ${ico}
      <div class="tok-inf">
        <div class="tok-sym">${escHtml(t.symbol)}</div>
        <div class="tok-name">${escHtml(t.name)}</div>
      </div>
      <div class="tok-bal" id="${safeId}">—</div>
    `;
    row.addEventListener('click', () => selectTok(t));
    inner.appendChild(row);
    // Load balance async without blocking render
    if (S.account) {
      getBal(t, S.account)
        .then(b => {
          const el = document.getElementById(safeId);
          if (el) el.textContent = fmt(b, t.decimals, 4);
        })
        .catch(() => {});
    }
  });
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function fetchAddrToken(addr) {
  try {
    const c = erc20(addr);
    const [name, sym, dec] = await Promise.all([c.name(), c.symbol(), c.decimals()]);
    const t = { address: addr, name, symbol: sym, decimals: dec, logoURI: '', isNative: false };
    // Add to session list so it shows up
    if (!S.allTokens.find(x => x.address.toLowerCase() === addr.toLowerCase())) {
      S.allTokens.push(t);
    }
    const inner = $('tokListInner');
    if (!inner) return;
    const row = document.createElement('div');
    row.className = 'tok-item';
    row.innerHTML = `
      <div class="tok-ico">${escHtml(sym.slice(0,2))}</div>
      <div class="tok-inf">
        <div class="tok-sym">${escHtml(sym)} <span style="font-size:10px;color:var(--yellow);margin-left:4px">Custom</span></div>
        <div class="tok-name">${escHtml(name)} · ${short(addr)}</div>
      </div>
    `;
    row.addEventListener('click', () => {
      // Auto-save to custom list when selected
      if (!S.customTokens.find(x => x.address.toLowerCase() === addr.toLowerCase())) {
        S.customTokens.push(t);
        save('custom', S.customTokens);
      }
      selectTok(t);
    });
    // Prepend so it's first
    inner.insertBefore(row, inner.firstChild);
  } catch(e) {
    console.warn('fetchAddrToken failed:', e);
  }
}

function selectTok(t) {
  const ctx = S.modalCtx;
  if (!ctx) return;

  // Validate same-token selections before closing
  if (ctx==='liqA' && S.liqB && S.liqB.address===t.address) {
    toast('Cannot select the same token for both sides.','warn'); return;
  }
  if (ctx==='liqB' && S.liqA && S.liqA.address===t.address) {
    toast('Cannot select the same token for both sides.','warn'); return;
  }
  if (ctx==='importA' && S.importB && S.importB.address===t.address) {
    toast('Cannot select the same token for both sides.','warn'); return;
  }
  if (ctx==='importB' && S.importA && S.importA.address===t.address) {
    toast('Cannot select the same token for both sides.','warn'); return;
  }

  closeTokModal(); // safe to close now

  if (ctx==='in') {
    // If same as tOut, swap them
    if (S.tOut && S.tOut.address===t.address) { S.tOut=S.tIn; updateOutUI(); }
    S.tIn=t; updateInUI();
  } else if (ctx==='out') {
    if (S.tIn && S.tIn.address===t.address) { S.tIn=S.tOut; updateInUI(); }
    S.tOut=t; updateOutUI();
  } else if (ctx==='liqA') {
    S.liqA=t; updateLiqUI();
  } else if (ctx==='liqB') {
    S.liqB=t; updateLiqUI();
  } else if (ctx==='importA') {
    S.importA=t;
    const el=$('importSymA'); if(el) el.textContent=t.symbol;
    // Also show logo if any
    const lg=$('importLogoA'); if(lg){ if(t.logoURI){lg.src=t.logoURI;lg.style.display='';}else lg.style.display='none'; }
    checkImport();
  } else if (ctx==='importB') {
    S.importB=t;
    const el=$('importSymB'); if(el) el.textContent=t.symbol;
    const lg=$('importLogoB'); if(lg){ if(t.logoURI){lg.src=t.logoURI;lg.style.display='';}else lg.style.display='none'; }
    checkImport();
  }
  refreshBals();
}

function setTokUI(logoId, symId, t) {
  const logo = $(logoId);
  const sym  = $(symId);
  if (!t) return;
  sym.textContent = t.symbol;
  if (t.logoURI) { logo.src=t.logoURI; logo.style.display=''; }
  else           { logo.src=''; logo.style.display='none'; }
}
function updateInUI() {
  if (!S.tIn) return;
  setTokUI('logoIn','symIn',S.tIn);
  getQuote(); updateSwapBtn();
}
function updateOutUI() {
  if (!S.tOut) return;
  setTokUI('logoOut','symOut',S.tOut);
  getQuote(); updateSwapBtn();
}

// ─── BALANCES ─────────────────────────────────────────────────────────────────
async function getBal(t, addr) {
  if (!addr) return ethers.BigNumber.from(0);
  const p = S.provider || readProv();
  return t.isNative ? p.getBalance(addr) : erc20(t.address,p).balanceOf(addr);
}
async function refreshBals() {
  if (!S.account) return;
  if (S.tIn)  getBal(S.tIn,  S.account).then(b=>{ $('balIn').textContent  = 'Balance: '+fmt(b,S.tIn.decimals,6); }).catch(()=>{});
  if (S.tOut) getBal(S.tOut, S.account).then(b=>{ $('balOut').textContent = 'Balance: '+fmt(b,S.tOut.decimals,6); }).catch(()=>{});
  if (S.liqA) getBal(S.liqA, S.account).then(b=>{ $('liqBalA').textContent = 'Balance: '+fmt(b,S.liqA.decimals,6); }).catch(()=>{});
  if (S.liqB) getBal(S.liqB, S.account).then(b=>{ $('liqBalB').textContent = 'Balance: '+fmt(b,S.liqB.decimals,6); }).catch(()=>{});
}

// ─── SWAP QUOTE ───────────────────────────────────────────────────────────────
async function getQuote() {
  const amtStr = $('amountIn').value;
  if (!S.tIn||!S.tOut||!amtStr||parseFloat(amtStr)<=0) {
    $('amountOut').value='';
    $('swapDetails').style.display='none';
    return;
  }
  try {
    const prov = S.provider||readProv();
    const r = router(prov);
    const amtIn = parse(amtStr, S.tIn.decimals);
    const path  = [routeAddr(S.tIn), routeAddr(S.tOut)];
    const outs  = await r.getAmountsOut(amtIn, path);
    const amtOut = outs[outs.length-1];
    $('amountOut').value = fmt(amtOut, S.tOut.decimals, 8);

    // Rate
    const rateNum = parseFloat(ethers.utils.formatUnits(amtOut,S.tOut.decimals)) / parseFloat(amtStr);
    $('swapRate').textContent = `1 ${S.tIn.symbol} = ${rateNum.toFixed(6)} ${S.tOut.symbol}`;

    // Price impact
    try {
      const f = factory(prov);
      const pa = await f.getPair(routeAddr(S.tIn),routeAddr(S.tOut));
      if (pa!==ethers.constants.AddressZero) {
        const pr = pair(pa,prov);
        const [r0,r1] = await pr.getReserves();
        const t0 = await pr.token0();
        const rIn = routeAddr(S.tIn).toLowerCase()===t0.toLowerCase() ? r0 : r1;
        const impact = parseFloat(amtIn.toString()) / (parseFloat(rIn.toString())+parseFloat(amtIn.toString())) * 100;
        const el = $('priceImpact');
        el.textContent = impact.toFixed(2)+'%';
        el.className = impact<1?'imp-low':impact<5?'imp-mid':'imp-high';
      }
    } catch {}

    $('minRcv').textContent  = `${fmt(minAmt(amtOut),S.tOut.decimals,6)} ${S.tOut.symbol}`;
    $('lpFee').textContent   = `${(parseFloat(amtStr)*0.003).toFixed(6)} ${S.tIn.symbol}`;
    $('swapRoute').textContent = `${S.tIn.symbol} → ${S.tOut.symbol}`;
    $('swapDetails').style.display='flex';
    updateSwapBtn();
  } catch(e) {
    $('amountOut').value='';
    $('swapDetails').style.display='none';
    if (e.message&&e.message.includes('INSUFFICIENT_LIQUIDITY')) toast('No liquidity for this pair.','warn');
    updateSwapBtn();
  }
}

// ─── SWAP BUTTON ─────────────────────────────────────────────────────────────
function updateSwapBtn() {
  const btn = $('swapBtn');
  const amtIn  = $('amountIn').value;
  const amtOut = $('amountOut').value;
  btn.onclick = null;
  if (!S.account) {
    btn.textContent='Connect Wallet'; btn.disabled=false;
    btn.onclick=()=>openModal('walletModalWrap'); return;
  }
  if (!S.tIn||!S.tOut)         { btn.textContent='Select Tokens';         btn.disabled=true; return; }
  if (!amtIn||+amtIn<=0)        { btn.textContent='Enter Amount';          btn.disabled=true; return; }
  if (!amtOut||+amtOut<=0)      { btn.textContent='Insufficient Liquidity';btn.disabled=true; return; }
  const imp = $('priceImpact');
  if (imp.classList.contains('imp-high')) {
    btn.textContent=`Swap Anyway (High Impact)`; btn.className='action-btn warn';
  } else {
    btn.textContent=`Swap ${S.tIn.symbol} → ${S.tOut.symbol}`; btn.className='action-btn';
  }
  btn.disabled=false; btn.onclick=doSwap;
}

// ─── EXECUTE SWAP ─────────────────────────────────────────────────────────────
async function doSwap() {
  if (!S.signer) { openModal('walletModalWrap'); return; }
  await ensureChain();
  if (!S.chainOk) { toast('Switch to Riche Chain first.','err'); return; }

  const amtInStr  = $('amountIn').value;
  const amtOutStr = $('amountOut').value;
  if (!amtInStr||!amtOutStr) return;

  const amtIn  = parse(amtInStr,  S.tIn.decimals);
  const amtOut = parse(amtOutStr, S.tOut.decimals);
  const minOut = minAmt(amtOut);
  const dl     = ddl();
  const path   = [routeAddr(S.tIn), routeAddr(S.tOut)];
  const r      = router(S.signer);

  try {
    showTx('Preparing Swap…','Checking allowance');
    // Approve if needed
    if (!S.tIn.isNative) {
      const tok = erc20(S.tIn.address, S.signer);
      const al  = await tok.allowance(S.account, C.ROUTER);
      if (al.lt(amtIn)) {
        showTx('Approve '+S.tIn.symbol,'Confirm approval in wallet');
        const tx = await tok.approve(C.ROUTER, ethers.constants.MaxUint256);
        showTx('Approving…','Waiting for confirmation');
        await tx.wait();
        toast(S.tIn.symbol+' approved!','ok');
      }
    }
    showTx('Confirm Swap','Approve in wallet');
    let tx;
    if      (S.tIn.isNative)  tx = await r.swapExactETHForTokens(minOut, path, S.account, dl, { value:amtIn });
    else if (S.tOut.isNative) tx = await r.swapExactTokensForETH(amtIn, minOut, path, S.account, dl);
    else                      tx = await r.swapExactTokensForTokens(amtIn, minOut, path, S.account, dl);

    showTx('Submitted','Hash: '+short(tx.hash));
    addTx(tx.hash, `Swap ${amtInStr} ${S.tIn.symbol} → ${amtOutStr} ${S.tOut.symbol}`, 'pending');
    const rc = await tx.wait();
    hideTx();
    if (rc.status===1) {
      updTx(tx.hash,'ok');
      toast(`✓ Swapped ${amtInStr} ${S.tIn.symbol} → ${amtOutStr} ${S.tOut.symbol}`,'ok',6000);
      $('amountIn').value=''; $('amountOut').value='';
      $('swapDetails').style.display='none';
      refreshBals();
    } else { updTx(tx.hash,'fail'); toast('Swap failed.','err'); }
    updateSwapBtn();
  } catch(e) {
    hideTx();
    if (e.code===4001||e.code==='ACTION_REJECTED') toast('Rejected.','warn');
    else if (e.message&&e.message.includes('INSUFFICIENT_OUTPUT_AMOUNT')) toast('Price moved. Increase slippage.','err');
    else toast('Swap error: '+(e.reason||e.message||'Unknown'),'err');
  }
}

// ─── LIQUIDITY UI ─────────────────────────────────────────────────────────────
function updateLiqUI() {
  const a=S.liqA, b=S.liqB;
  if (a) {
    $('liqSymA').textContent  = a.symbol; setLogo('liqLogoA',a);
    $('liqSymA2').textContent = a.symbol; setLogo('liqLogoA2',a);
    $('liqLblA').textContent  = a.symbol+' Amount';
  }
  if (b) {
    $('liqSymB').textContent  = b.symbol; setLogo('liqLogoB',b);
    $('liqSymB2').textContent = b.symbol; setLogo('liqLogoB2',b);
    $('liqLblB').textContent  = b.symbol+' Amount';
  }
  if (a && b) {
    $('liqPrompt').classList.add('hidden');
    $('liqForm').classList.remove('hidden');
    checkPoolInfo();
    checkLiqApprovals();
  }
  updateAddLiqBtn();
}
function setLogo(id, t) {
  const el=$(id); if(!el) return;
  if(t.logoURI){el.src=t.logoURI;el.style.display='';}
  else{el.src='';el.style.display='none';}
}

async function checkPoolInfo() {
  if (!S.liqA||!S.liqB) return;
  try {
    const f = factory();
    const pa = await f.getPair(routeAddr(S.liqA), routeAddr(S.liqB));
    if (pa===ethers.constants.AddressZero) {
      $('liqStatus').textContent='New Pool'; $('liqStatus').style.color='var(--yellow)';
      $('liqRate').textContent='—'; $('liqShare').textContent='100%';
    } else {
      const pr = pair(pa);
      const [r0,r1] = await pr.getReserves();
      const t0 = await pr.token0();
      const aIs0 = routeAddr(S.liqA).toLowerCase()===t0.toLowerCase();
      const rA   = aIs0?r0:r1, rB=aIs0?r1:r0;
      const rate = parseFloat(ethers.utils.formatUnits(rB,S.liqB.decimals)) /
                   parseFloat(ethers.utils.formatUnits(rA,S.liqA.decimals));
      $('liqRate').textContent=`1 ${S.liqA.symbol} = ${rate.toFixed(6)} ${S.liqB.symbol}`;
      $('liqStatus').textContent='Pool Exists'; $('liqStatus').style.color='var(--green)';
      const amtA = $('liqAmtA').value;
      if (amtA&&+amtA>0) {
        const inA = parse(amtA,S.liqA.decimals);
        const sh  = parseFloat(inA.toString())/(parseFloat(rA.toString())+parseFloat(inA.toString()))*100;
        $('liqShare').textContent=sh.toFixed(4)+'%';
      }
    }
  } catch {}
}

async function onLiqAmtAChange() {
  if (!S.liqA||!S.liqB) return;
  const amtA = $('liqAmtA').value;
  if (!amtA||+amtA<=0) return;
  try {
    const f  = factory();
    const pa = await f.getPair(routeAddr(S.liqA),routeAddr(S.liqB));
    if (pa!==ethers.constants.AddressZero) {
      const pr = pair(pa);
      const [r0,r1] = await pr.getReserves();
      const t0 = await pr.token0();
      const aIs0 = routeAddr(S.liqA).toLowerCase()===t0.toLowerCase();
      const rA=aIs0?r0:r1, rB=aIs0?r1:r0;
      const inA  = parse(amtA,S.liqA.decimals);
      const inB  = inA.mul(rB).div(rA);
      $('liqAmtB').value = fmt(inB,S.liqB.decimals,8);
    }
    checkPoolInfo();
  } catch {}
  updateAddLiqBtn();
  checkLiqApprovals();
}

async function checkLiqApprovals() {
  if (!S.account||!S.liqA||!S.liqB) return;
  const amtA=$('liqAmtA').value, amtB=$('liqAmtB').value;
  if (!amtA||!amtB) return;

  const row = $('liqApproveRow');
  row.innerHTML='';

  async function mkApproveBtn(tok, amt, label) {
    if (tok.isNative) return;
    try {
      const c = erc20(tok.address, S.provider||readProv());
      const al= await c.allowance(S.account, C.ROUTER);
      if (al.lt(parse(amt,tok.decimals))) {
        const btn=document.createElement('button');
        btn.textContent=`Approve ${label}`;
        btn.style.cssText='flex:1;padding:10px;border-radius:8px;background:rgba(0,200,255,.06);border:1px solid rgba(0,200,255,.28);color:var(--cyan);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;font-family:var(--body)';
        btn.addEventListener('click',()=>approveTok(tok, btn));
        row.appendChild(btn);
      }
    } catch {}
  }
  await mkApproveBtn(S.liqA, amtA, S.liqA.symbol);
  await mkApproveBtn(S.liqB, amtB, S.liqB.symbol);
}

async function approveTok(tok, btn) {
  if (!S.signer) return;
  try {
    showTx(`Approve ${tok.symbol}`,'Confirm in wallet');
    const c  = erc20(tok.address, S.signer);
    const tx = await c.approve(C.ROUTER, ethers.constants.MaxUint256);
    await tx.wait();
    toast(`${tok.symbol} approved!`,'ok');
    btn.disabled=true;
    hideTx();
  } catch(e) {
    hideTx();
    if(e.code!==4001) toast('Approval failed.','err');
    else toast('Rejected.','warn');
  }
}

function updateAddLiqBtn() {
  const btn=$('addLiqBtn');
  btn.onclick=null;
  if (!S.account)  { btn.textContent='Connect Wallet'; btn.disabled=false; btn.onclick=()=>openModal('walletModalWrap'); return; }
  if (!S.liqA||!S.liqB) { btn.textContent='Select Tokens'; btn.disabled=true; return; }
  const a=$('liqAmtA').value, b=$('liqAmtB').value;
  if (!a||!b||+a<=0||+b<=0) { btn.textContent='Enter Amounts'; btn.disabled=true; return; }
  btn.textContent='Add Liquidity'; btn.disabled=false; btn.onclick=doAddLiq;
}

async function doAddLiq() {
  if (!S.signer) { openModal('walletModalWrap'); return; }
  await ensureChain(); if(!S.chainOk){toast('Switch to Riche Chain.','err');return;}
  const amtAStr=$('liqAmtA').value, amtBStr=$('liqAmtB').value;
  const amtA=parse(amtAStr,S.liqA.decimals), amtB=parse(amtBStr,S.liqB.decimals);
  const minA=minAmtLiq(amtA), minB=minAmtLiq(amtB);
  const r=router(S.signer), dl=ddl();
  try {
    showTx('Adding Liquidity…','Confirm in wallet');
    let tx;
    if (S.liqA.isNative) {
      tx=await r.addLiquidityETH(routeAddr(S.liqB),amtB,minB,minA,S.account,dl,{value:amtA});
    } else if (S.liqB.isNative) {
      tx=await r.addLiquidityETH(routeAddr(S.liqA),amtA,minA,minB,S.account,dl,{value:amtB});
    } else {
      tx=await r.addLiquidity(routeAddr(S.liqA),routeAddr(S.liqB),amtA,amtB,minA,minB,S.account,dl);
    }
    addTx(tx.hash,`Add Liquidity ${S.liqA.symbol}/${S.liqB.symbol}`,'pending');
    showTx('Submitted…','Waiting for confirmation');
    const rc=await tx.wait(); hideTx();
    if(rc.status===1){
      updTx(tx.hash,'ok');
      toast(`Liquidity added! ${S.liqA.symbol}/${S.liqB.symbol}`,'ok',6000);
      $('liqAmtA').value=''; $('liqAmtB').value='';
      refreshBals(); loadPositions();
    } else { updTx(tx.hash,'fail'); toast('Failed.','err'); }
  } catch(e) {
    hideTx();
    if(e.code===4001) toast('Rejected.','warn');
    else toast('Error: '+(e.reason||e.message||''),'err');
  }
}

// ─── POOL POSITIONS ───────────────────────────────────────────────────────────
async function loadPositions() {
  if (!S.account) {
    $('poolList').innerHTML='<div class="cyber-card empty-pool"><div class="ep-icon">◈</div><p>Connect wallet</p><span>to see your positions</span></div>';
    return;
  }
  $('poolList').innerHTML='<div class="cyber-card empty-pool"><div class="ep-icon" style="animation:spin 1s linear infinite">◈</div><p>Loading…</p></div>';

  const f    = factory();
  const prov = readProv();
  const positions = [];
  const seenPairs = new Set(); // deduplicate by pair contract address

  // All non-native tokens from list (excluding WRIC — already covered by native RIC path)
  const erc20Toks = allToks().filter(t =>
    !t.isNative && t.address.toLowerCase() !== C.WRIC.toLowerCase()
  );

  const tryPair = async (tA, tB) => {
    try {
      // Both routeAddr calls resolve to WETH-equivalent for native, so
      // RIC/TOKEN and WRIC/TOKEN would resolve to the same pair — deduplicate.
      const pa = await f.getPair(routeAddr(tA), routeAddr(tB));
      if (pa === ethers.constants.AddressZero) return;
      const paLower = pa.toLowerCase();
      if (seenPairs.has(paLower)) return;   // already added this pool
      seenPairs.add(paLower);

      const pr    = pair(pa, prov);
      const lpBal = await pr.balanceOf(S.account);
      if (lpBal.isZero()) return;

      const [ts, reserves, t0addr] = await Promise.all([
        pr.totalSupply(),
        pr.getReserves(),
        pr.token0()
      ]);
      const [r0, r1] = reserves;
      const aIs0 = routeAddr(tA).toLowerCase() === t0addr.toLowerCase();
      const rA   = aIs0 ? r0 : r1;
      const rB   = aIs0 ? r1 : r0;
      const myA  = ts.isZero() ? ethers.BigNumber.from(0) : rA.mul(lpBal).div(ts);
      const myB  = ts.isZero() ? ethers.BigNumber.from(0) : rB.mul(lpBal).div(ts);
      const sh   = ts.isZero() ? ethers.BigNumber.from(0) : lpBal.mul(10000).div(ts);

      // Always display native RIC (not WRIC) as the pair label when one side is native/WRIC
      const displayA = tA.isNative ? T_RIC : tA;
      const displayB = tB.isNative ? T_RIC : tB;

      positions.push({ tA: displayA, tB: displayB, lpBal, ts, pa, myA, myB, sh });
    } catch(e) {
      console.warn('tryPair error:', e);
    }
  };

  // Native RIC vs every ERC-20 token (covers WRIC pools too via routeAddr)
  for (const t of erc20Toks) await tryPair(T_RIC, t);

  // ERC-20 vs ERC-20 pairs (no native, no WRIC)
  for (let i = 0; i < erc20Toks.length; i++) {
    for (let j = i + 1; j < erc20Toks.length; j++) {
      await tryPair(erc20Toks[i], erc20Toks[j]);
    }
  }

  S.positions = positions;
  renderPositions(positions);
}

function renderPositions(pos) {
  const el=$('poolList');
  if(!pos.length){
    el.innerHTML='<div class="cyber-card empty-pool"><div class="ep-icon">◈</div><p>No positions found</p><span>Add liquidity to get started</span></div>';
    return;
  }
  el.innerHTML='';
  pos.forEach((p,i)=>{
    const d=document.createElement('div');
    d.className='pool-pos';
    const sh=(p.sh.toNumber()/100).toFixed(4);
    d.innerHTML=`
      <div class="pos-hd">
        <span class="pos-pair">${p.tA.symbol}/${p.tB.symbol}</span>
        <div class="pos-acts">
          <button class="pos-add" onclick="goAddLiq(${i})">Add</button>
          <button class="pos-rm"  onclick="openRemove(${i})">Remove</button>
        </div>
      </div>
      <div class="pos-data">
        <div class="pos-row"><span>Your ${p.tA.symbol}</span><span class="mono">${fmt(p.myA,p.tA.decimals,6)}</span></div>
        <div class="pos-row"><span>Your ${p.tB.symbol}</span><span class="mono">${fmt(p.myB,p.tB.decimals,6)}</span></div>
        <div class="pos-row"><span>Pool Share</span><span class="mono">${sh}%</span></div>
        <div class="pos-row"><span>LP Tokens</span><span class="mono">${fmt(p.lpBal,18,8)}</span></div>
        <div class="pos-row"><span>Pair</span><span class="mono"><a href="${CHAIN.explorer}address/${p.pa}" target="_blank" style="color:var(--cyan);text-decoration:none">${short(p.pa)} ↗</a></span></div>
      </div>
    `;
    el.appendChild(d);
  });
}
window.goAddLiq = (i) => {
  const p=S.positions[i]; if(!p) return;
  S.liqA=p.tA; S.liqB=p.tB;
  navTo('liquidity');
  setTimeout(updateLiqUI,50);
};
window.openRemove = (i) => {
  S.currentPos=i;
  const p=S.positions[i]; if(!p) return;
  $('rmSymA').textContent=p.tA.symbol;
  $('rmSymB').textContent=p.tB.symbol;
  updateRemoveOutput(50);
  openModal('removeMWrap');
};

function updateRemoveOutput(pct) {
  S.removePct=pct;
  const p=S.positions[S.currentPos]; if(!p) return;
  $('rmPctVal').textContent=pct+'%';
  $('rmAmtA').textContent=fmt(p.myA.mul(pct).div(100),p.tA.decimals,6);
  $('rmAmtB').textContent=fmt(p.myB.mul(pct).div(100),p.tB.decimals,6);
  const sl=$('rmSlider');
  sl.style.background=`linear-gradient(to right,var(--cyan) ${pct}%,var(--bg3) ${pct}%)`;
  const btn=$('removeLiqBtn');
  if(S.account){btn.disabled=false; btn.onclick=()=>doRemoveLiq(pct);}
}

async function approveLP() {
  const p=S.positions[S.currentPos]; if(!p||!S.signer) return;
  try {
    showTx('Approve LP Token','Confirm in wallet');
    const c=pair(p.pa,S.signer);
    const tx=await c.approve(C.ROUTER,ethers.constants.MaxUint256);
    await tx.wait(); hideTx();
    toast('LP approved!','ok');
    $('approveLPBtn').disabled=true;
    $('removeLiqBtn').disabled=false;
  } catch(e){hideTx();toast('LP approval failed.','err');}
}

async function doRemoveLiq(pct) {
  const p=S.positions[S.currentPos]; if(!p||!S.signer) return;
  await ensureChain(); if(!S.chainOk){toast('Switch chain.','err');return;}
  const lpAmt=p.lpBal.mul(pct).div(100);
  const minA=minAmtLiq(p.myA.mul(pct).div(100));
  const minB=minAmtLiq(p.myB.mul(pct).div(100));
  const r=router(S.signer), dl=ddl();
  try {
    showTx('Removing Liquidity…','Confirm in wallet');
    let tx;
    if(p.tA.isNative||p.tB.isNative){
      const tok=p.tA.isNative?p.tB:p.tA;
      const mt=p.tA.isNative?minB:minA;
      const me=p.tA.isNative?minA:minB;
      tx=await r.removeLiquidityETH(routeAddr(tok),lpAmt,mt,me,S.account,dl);
    } else {
      tx=await r.removeLiquidity(routeAddr(p.tA),routeAddr(p.tB),lpAmt,minA,minB,S.account,dl);
    }
    addTx(tx.hash,`Remove Liq ${p.tA.symbol}/${p.tB.symbol}`,'pending');
    showTx('Submitted','Waiting…');
    const rc=await tx.wait(); hideTx();
    if(rc.status===1){
      updTx(tx.hash,'ok');
      toast('Liquidity removed!','ok',6000);
      closeModal('removeMWrap');
      refreshBals(); loadPositions();
    } else { updTx(tx.hash,'fail'); toast('Failed.','err'); }
  } catch(e){
    hideTx();
    if(e.code===4001) toast('Rejected.','warn');
    else toast('Error: '+(e.reason||e.message||''),'err');
  }
}

// ─── IMPORT POOL ─────────────────────────────────────────────────────────────
async function checkImport() {
  if (!S.importA || !S.importB) return;
  const d   = $('importDetails');
  const btn = $('confirmImportBtn');
  d.style.display = 'flex';
  d.innerHTML = '<div class="detail-row"><span style="color:var(--txt2)">Searching for pool…</span></div>';
  btn.disabled = true;
  try {
    const f  = factory();
    const pa = await f.getPair(routeAddr(S.importA), routeAddr(S.importB));
    if (pa === ethers.constants.AddressZero) {
      d.innerHTML = `<div class="detail-row"><span style="color:var(--yellow)">Pool not found</span><span style="font-size:11px;color:var(--txt3)">Add liquidity to create</span></div>`;
      btn.disabled = true;
    } else {
      const pr = pair(pa);
      const [reserves, ts, t0addr] = await Promise.all([pr.getReserves(), pr.totalSupply(), pr.token0()]);
      const [r0, r1] = reserves;
      const aIs0 = routeAddr(S.importA).toLowerCase() === t0addr.toLowerCase();
      const rA = aIs0 ? r0 : r1;
      const rB = aIs0 ? r1 : r0;
      let myLP = '—';
      if (S.account) {
        try { myLP = fmt(await pr.balanceOf(S.account), 18, 8); } catch {}
      }
      d.innerHTML = `
        <div class="detail-row"><span>Address</span><span><a href="${CHAIN.explorer}address/${pa}" target="_blank" style="color:var(--cyan);text-decoration:none">${short(pa)} ↗</a></span></div>
        <div class="detail-row"><span>${escHtml(S.importA.symbol)} Reserve</span><span>${fmt(rA, S.importA.decimals, 4)}</span></div>
        <div class="detail-row"><span>${escHtml(S.importB.symbol)} Reserve</span><span>${fmt(rB, S.importB.decimals, 4)}</span></div>
        <div class="detail-row"><span>Total LP Supply</span><span>${fmt(ts, 18, 4)}</span></div>
        <div class="detail-row"><span>Your LP Balance</span><span>${myLP}</span></div>
      `;
      btn.disabled = false;
    }
  } catch(e) {
    d.innerHTML = `<div class="detail-row" style="color:var(--red)"><span>Error: ${escHtml(e.reason || e.message || 'Unknown')}</span></div>`;
  }
}

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────────
function addTx(h,l,s){ S.txns.unshift({h,l,s,t:Date.now()}); if(S.txns.length>8) S.txns.pop(); save('txns',S.txns); renderTxns(); }
function updTx(h,s)  { const t=S.txns.find(x=>x.h===h); if(t){t.s=s; save('txns',S.txns); renderTxns();} }
function renderTxns() {
  const el=$('txsList');
  if(!S.txns.length){ el.innerHTML='<p class="empty-msg">No transactions</p>'; return; }
  el.innerHTML='';
  S.txns.slice(0,6).forEach(tx=>{
    const d=document.createElement('div');
    d.className='tx-item';
    const ico=tx.s==='ok'?'tx-ok':tx.s==='fail'?'tx-fail':'tx-pend';
    const sym=tx.s==='ok'?'✓':tx.s==='fail'?'✕':'⏳';
    d.innerHTML=`<span class="tx-txt">${tx.l}</span><span class="${ico}">${sym}</span><a class="tx-link" href="${CHAIN.explorer}tx/${tx.h}" target="_blank">↗</a>`;
    el.appendChild(d);
  });
}

// ─── CUSTOM TOKEN ─────────────────────────────────────────────────────────────
async function fetchCustomPreview(addr) {
  if(!addr.startsWith('0x')||addr.length!==42){ $('customPreview').classList.add('hidden'); return; }
  try {
    const c=erc20(addr);
    const [name,sym,dec]=await Promise.all([c.name(),c.symbol(),c.decimals()]);
    $('prevName').textContent=`${name} (${sym})`;
    $('prevAddr').textContent=addr;
    $('prevLogo').src='';
    $('customPreview').classList.remove('hidden');
    return {address:addr,name,symbol:sym,decimals:dec,logoURI:''};
  } catch { $('customPreview').classList.add('hidden'); return null; }
}

function renderCustomToks() {
  const el = $('customTokList');
  if (!S.customTokens.length) { el.innerHTML = '<p class="empty-msg">None added</p>'; return; }
  el.innerHTML = '';
  S.customTokens.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'tok-item';
    d.innerHTML = `
      <div class="tok-ico">${t.symbol.slice(0,2)}</div>
      <div class="tok-inf"><div class="tok-sym">${t.symbol}</div><div class="tok-name">${t.name}</div></div>
      <button class="del-tok" data-i="${i}" title="Remove">✕</button>
    `;
    d.querySelector('.del-tok').addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.i);
      const removed = S.customTokens.splice(idx, 1)[0];
      save('custom', S.customTokens);
      // Remove from allTokens too
      S.allTokens = S.allTokens.filter(x => x.address.toLowerCase() !== removed.address.toLowerCase());
      renderCustomToks();
      toast(`${removed.symbol} removed.`, 'info');
    });
    el.appendChild(d);
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  initCanvas();
  renderTxns();
  renderCustomToks();

  // Start with base tokens, then load remote list (adds to S.allTokens in-place)
  // Base = RIC + WRIC only; custom tokens added after
  S.allTokens = [T_RIC, T_WRIC];

  // Merge saved custom tokens (skip any that overlap with base)
  const baseAddrs = new Set([T_RIC.address.toLowerCase(), T_WRIC.address.toLowerCase()]);
  S.customTokens
    .filter(t => !baseAddrs.has(t.address.toLowerCase()))
    .forEach(t => { S.allTokens.push(t); baseAddrs.add(t.address.toLowerCase()); });

  // Load remote list async — will append to S.allTokens
  loadTokenList().then(() => {
    // After list loaded, also append custom tokens that weren't yet in list
    S.customTokens.forEach(t => {
      const a = t.address.toLowerCase();
      if (!S.allTokens.find(x => x.address.toLowerCase() === a)) {
        S.allTokens.push(t);
      }
    });
    // If token modal is open, refresh it
    if ($('tokModalWrap').classList.contains('open')) {
      renderTokList($('tokSearch').value);
    }
  });

  // ── NAV ──
  document.querySelectorAll('.nav-link[data-page],.mob-link[data-page]').forEach(el=>{
    el.addEventListener('click',()=>{ navTo(el.dataset.page); closeMobMenu(); });
  });

  // ── HAMBURGER ──
  $('burgerBtn').addEventListener('click',()=>{
    const open = $('mobMenu').classList.toggle('open');
    $('mobOverlay').classList.toggle('show',open);
    $('burgerBtn').classList.toggle('open',open);
  });
  $('mobOverlay').addEventListener('click',closeMobMenu);

  // ── WALLET BUTTON ──
  $('walletBtn').addEventListener('click',()=>{
    if(S.account) openModal('wdWrap');
    else openModal('walletModalWrap');
  });
  $('mobConnectBtn')?.addEventListener('click',()=>{ openModal('walletModalWrap'); closeMobMenu(); });

  // ── CONNECT OPTIONS ──
  $('connMM').addEventListener('click',()=>connectWallet());
  $('connTrust').addEventListener('click',()=>connectWallet());
  $('connCB').addEventListener('click',()=>connectWallet());
  $('closeWalletModal').addEventListener('click',()=>closeModal('walletModalWrap'));
  $('closeWdModal').addEventListener('click',()=>closeModal('wdWrap'));
  $('disconnectBtn').addEventListener('click',disconnectWallet);

  // ── TOKEN MODAL ──
  $('closeTokModal').addEventListener('click',closeTokModal);
  $('tokSearch').addEventListener('input',e=>{
    const v=e.target.value;
    $('clearSearch').style.display=v?'':'none';
    renderTokList(v);
  });
  $('clearSearch').addEventListener('click',()=>{ $('tokSearch').value=''; $('clearSearch').style.display='none'; renderTokList(''); });
  $('manageBtn').addEventListener('click',()=>{ closeTokModal(); renderCustomToks(); openModal('manageMWrap'); });

  // ── SWAP ──
  $('pickIn').addEventListener('click',()=>openTokModal('in'));
  $('pickOut').addEventListener('click',()=>openTokModal('out'));
  $('flipBtn').addEventListener('click',()=>{
    const tmp=S.tIn; S.tIn=S.tOut; S.tOut=tmp;
    updateInUI(); updateOutUI();
    const v=$('amountOut').value; $('amountIn').value=v||''; $('amountOut').value='';
    getQuote(); refreshBals();
  });
  $('amountIn').addEventListener('input',()=>{
    clearTimeout(S.quoteTimer);
    S.quoteTimer=setTimeout(getQuote,500);
  });
  // % buttons
  document.querySelectorAll('.pct[data-p]').forEach(b=>{
    b.addEventListener('click',async()=>{
      if(!S.account||!S.tIn) return;
      const pct=parseInt(b.dataset.p);
      const bal=await getBal(S.tIn,S.account).catch(()=>ethers.BigNumber.from(0));
      $('amountIn').value=fmt(bal.mul(pct).div(100),S.tIn.decimals,8);
      getQuote();
    });
  });
  $('refreshBtn').addEventListener('click',()=>{
    $('refreshBtn').classList.add('spin');
    getQuote().finally(()=>setTimeout(()=>$('refreshBtn').classList.remove('spin'),600));
  });
  $('settingsBtn').addEventListener('click',()=>$('settPanel').classList.toggle('open'));

  // Slippage
  document.querySelectorAll('.slip-b[data-s]').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.slip-b[data-s]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      S.slippage=parseFloat(b.dataset.s);
      $('customSlip').value='';
      save('slip',S.slippage);
    });
  });
  $('customSlip').addEventListener('input',e=>{
    const v=parseFloat(e.target.value);
    if(v>0&&v<=50){ S.slippage=v; document.querySelectorAll('.slip-b[data-s]').forEach(b=>b.classList.remove('active')); save('slip',S.slippage); }
  });
  $('txDeadline').value=S.deadline;
  $('txDeadline').addEventListener('input',e=>{ S.deadline=parseInt(e.target.value)||20; save('ddl',S.deadline); });
  $('clearTxs').addEventListener('click',()=>{ S.txns=[]; save('txns',S.txns); renderTxns(); });

  // ── LIQUIDITY ──
  $('liqPickA').addEventListener('click',()=>openTokModal('liqA'));
  $('liqPickB').addEventListener('click',()=>openTokModal('liqB'));
  $('liqPickA2').addEventListener('click',()=>openTokModal('liqA'));
  $('liqPickB2').addEventListener('click',()=>openTokModal('liqB'));
  $('liqAmtA').addEventListener('input',()=>{ clearTimeout(S.quoteTimer); S.quoteTimer=setTimeout(onLiqAmtAChange,500); });
  $('liqAmtB').addEventListener('input',()=>{ updateAddLiqBtn(); checkLiqApprovals(); });
  $('liqSettBtn').addEventListener('click',()=>$('liqSettPanel').classList.toggle('open'));
  document.querySelectorAll('.slip-b[data-ls]').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.slip-b[data-ls]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      S.liqSlippage=parseFloat(b.dataset.ls);
    });
  });
  // Balance shortcut
  $('liqBalA').addEventListener('click',async()=>{
    if(!S.account||!S.liqA) return;
    const b=await getBal(S.liqA,S.account).catch(()=>ethers.BigNumber.from(0));
    $('liqAmtA').value=fmt(b,S.liqA.decimals,8);
    onLiqAmtAChange();
  });
  $('liqBalB').addEventListener('click',async()=>{
    if(!S.account||!S.liqB) return;
    const b=await getBal(S.liqB,S.account).catch(()=>ethers.BigNumber.from(0));
    $('liqAmtB').value=fmt(b,S.liqB.decimals,8);
    updateAddLiqBtn();
  });

  // ── POOL ──
  $('goAddLiqBtn').addEventListener('click',()=>navTo('liquidity'));
  $('refreshPoolBtn').addEventListener('click',()=>{
    $('refreshPoolBtn').classList.add('spin');
    loadPositions().finally(()=>setTimeout(()=>$('refreshPoolBtn').classList.remove('spin'),800));
  });
  $('importPoolBtn').addEventListener('click',()=>openModal('importMWrap'));

  // ── REMOVE LIQ ──
  $('closeRemoveM').addEventListener('click',()=>closeModal('removeMWrap'));
  $('rmSlider').addEventListener('input',e=>updateRemoveOutput(parseInt(e.target.value)));
  document.querySelectorAll('.pct[data-rp]').forEach(b=>{
    b.addEventListener('click',()=>{ const pct=parseInt(b.dataset.rp); $('rmSlider').value=pct; updateRemoveOutput(pct); });
  });
  $('approveLPBtn').addEventListener('click',approveLP);

  // ── IMPORT POOL ──
  $('closeImportM').addEventListener('click',()=>closeModal('importMWrap'));
  $('importPickA').addEventListener('click',()=>openTokModal('importA'));
  $('importPickB').addEventListener('click',()=>openTokModal('importB'));
  $('confirmImportBtn').addEventListener('click',()=>{
    if(S.importA&&S.importB){ toast(`Pool ${S.importA.symbol}/${S.importB.symbol} imported!`,'ok'); closeModal('importMWrap'); loadPositions(); }
  });

  // ── MANAGE TOKENS ──
  $('closeManageM').addEventListener('click',()=>closeModal('manageMWrap'));
  let customTimer;
  $('customAddr').addEventListener('input',e=>{
    clearTimeout(customTimer);
    customTimer=setTimeout(()=>fetchCustomPreview(e.target.value),600);
  });
  $('importCustomBtn').addEventListener('click', async () => {
    const addr = $('customAddr').value.trim();
    if (!addr.startsWith('0x') || addr.length !== 42) { toast('Enter a valid contract address.', 'err'); return; }
    // Block WRIC re-import
    if (addr.toLowerCase() === C.WRIC.toLowerCase()) { toast('WRIC is already a built-in token.', 'warn'); return; }
    const t = await fetchCustomPreview(addr);
    if (!t) { toast('Cannot fetch token. Check address.', 'err'); return; }
    if (S.customTokens.find(x => x.address.toLowerCase() === addr.toLowerCase())) { toast('Already added.', 'warn'); return; }
    if (S.allTokens.find(x => x.address.toLowerCase() === addr.toLowerCase())) { toast('Already in list.', 'warn'); return; }
    S.customTokens.push(t);
    S.allTokens.push(t);
    save('custom', S.customTokens);
    toast(`${t.symbol} added!`, 'ok');
    $('customAddr').value = ''; $('customPreview').classList.add('hidden');
    renderCustomToks();
  });

  // ── CLOSE MODALS ON BG CLICK ──
  document.querySelectorAll('.modal-wrap').forEach(w=>{
    w.addEventListener('click',e=>{ if(e.target===w){ w.classList.remove('open'); S.modalCtx=null; } });
  });

  // ── METAMASK EVENTS ──
  if(window.ethereum){
    window.ethereum.on('accountsChanged',accs=>{
      if(!accs.length) disconnectWallet();
      else { S.account=accs[0]; updateWalletUI(); refreshBals(); loadPositions(); }
    });
    window.ethereum.on('chainChanged',()=>window.location.reload());
    window.ethereum.request({method:'eth_accounts'}).then(accs=>{
      if(accs.length) connectWallet();
    }).catch(()=>{});
  }

  console.log('🚀 RecehDEX ready | Factory:',C.FACTORY,' Router:',C.ROUTER);
});
