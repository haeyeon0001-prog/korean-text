
// ---- Tabs ----
const tabs = document.querySelectorAll('.tab');
const btns = document.querySelectorAll('.tab-btn');
btns.forEach(b=>b.addEventListener('click', ()=>{
  btns.forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const id = b.dataset.tab;
  tabs.forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}));

const STATUS = document.getElementById('status');

// ---- Lesson data (inline to avoid fetch errors) ----
let LESSON = {
  lesson: 5,
  title: "자기소개（自己紹介）",
  vocab: [
    {ko:"안녕하세요", ja:"こんにちは"},
    {ko:"저", ja:"私（謙譲語）"},
    {ko:"이름", ja:"名前"},
    {ko:"뭐", ja:"何"},
    {ko:"씨", ja:"〜さん"},
    {ko:"어느 나라", ja:"どの国"},
    {ko:"사람", ja:"人"},
    {ko:"일본", ja:"日本"},
    {ko:"유학생", ja:"留学生"},
    {ko:"만나서 반가워요", ja:"お会いできて嬉しいです"}
  ],
  grammar: {
    items: [
      {prompt:"① ‘저는 ~예요/이에요’ で「私は大学生です。」", pattern:/^저는\s*대학생(이에요|예요)\.$/, rationale:"‘대학생’は받침あり→‘이에요’が自然", hint:"저는 + 名詞 + 이에요/예요"},
      {prompt:"② ‘이름이 뭐예요?’ に答える（さとうけん）", pattern:/^(제\s*이름은\s*사토\s*켄이에요\.|저는\s*사토\s*켄이에요\.)$/, rationale:"両方OK", hint:"제 이름은 ~/저는 ~"},
      {prompt:"③ ‘어느 나라 사람이에요?’（日本人）", pattern:/^저는\s*일본\s*사람이에요\.$/, rationale:"固定表現", hint:"저 + 일본 사람 + 이에요."}
    ]
  },
  substitution: [
    {title:"① 저는 ~예요/이에요", template:"저는 {NOUN}{COP}.", slot:"NOUN", options:["학생","유학생","회사원","의사","가수"], copRule:true, hint:"받침→이에요 / 無し→예요"},
    {title:"② {NAME} 씨は何人？", template:"{NAME} 씨는 어느 나라 사람이에요?", slot:"NAME", options:["유키","민수","지훈","사토 켄","다나카 유キ".replace("キ","키")]},
    {title:"③ 私は〜人です", template:"저는 {COUNTRY} 사람이에요.", slot:"COUNTRY", options:["일본","한국","중국","미국","베트남"]}
  ],
  pronTargets: [
    "저는 김민수예요.",
    "이름이 뭐예요?",
    "저는 일본 사람이에요. 만나서 반가워요."
  ],
  shadowLines: [
    "민수: 안녕하세요?",
    "저는 김민수예요.",
    "이름が 뭐예요?".replace("が","이"),
    "유키: 안녕하세요?",
    "저는 다나카 유키예요.",
    "민수: 유키 씨는 일본 사람이에요?",
    "유키: 네, 저는 일본 사람이에요. 만나서 반가워요.",
    "민수: 만나서 반가워요."
  ]
};

let AUDIO_MAP = {}; // word -> filename
let VOCAB_CUES = {meta:{src:"audio/lesson_vocab_master.mp3"}, cues:{}};

// helper
function hasBatchim(word){
  if(!word) return false;
  const ch = word.trim().slice(-1).charCodeAt(0);
  if(ch < 0xAC00 || ch > 0xD7A3) return false;
  const jong = (ch - 0xAC00) % 28;
  return jong !== 0;
}
function chooseCopula(noun){ return hasBatchim(noun) ? "이에요" : "예요"; }

// ---- Shadowing ----
(function(){
  const aud = document.getElementById('shadow-aud');
  const src = document.getElementById('shadow-src');
  const text = document.getElementById('shadow-text');
  text.innerHTML = LESSON.shadowLines.map(l=>`<div>${l}</div>`).join('');

  document.getElementById('shadow-loop').addEventListener('change', e=> aud.loop = e.target.checked);
  const rate = document.getElementById('shadow-rate'); const rv = document.getElementById('shadow-ratev');
  rate.addEventListener('input', ()=>{ aud.playbackRate = parseFloat(rate.value); rv.textContent = aud.playbackRate.toFixed(2)+"x"; });

  document.getElementById('shadow-play').addEventListener('click', async ()=>{
    try{ await aud.play(); }catch(err){ alert("再生できません。audio/lesson5_text.mp3 を配置するか、『音声を選ぶ』をご利用ください。\\n"+err); }
  });
  document.getElementById('shadow-pause').addEventListener('click', ()=> aud.pause());
  document.getElementById('shadow-pick').addEventListener('click', ()=>{
    const inp = document.createElement('input'); inp.type='file'; inp.accept='audio/*';
    inp.onchange = ()=>{ const f = inp.files && inp.files[0]; if(!f) return; const url = URL.createObjectURL(f); aud.src = url; aud.load(); aud.play().catch(()=>{}); src.textContent = url; };
    inp.click();
  });
  aud.addEventListener('loadeddata', ()=>{ src.textContent = aud.currentSrc || aud.src || "(未設定)"; });
})();

// ---- Vocab ----
function playWordAudio(word){
  if(AUDIO_MAP[word]){ new Audio("audio/"+AUDIO_MAP[word]).play(); return true; }
  const cue = VOCAB_CUES.cues[word]; const src = VOCAB_CUES.meta?.src;
  if(cue && src){
    const a = new Audio(src); a.currentTime = cue.start||0;
    a.play().then(()=>{
      const stop = cue.end||0; if(stop>cue.start){ const id = setInterval(()=>{ if(a.currentTime>=stop){ a.pause(); clearInterval(id);} }, 50); }
    }).catch(()=>{});
    return true;
  }
  return false;
}
(function(){
  const box = document.getElementById('vocab-list');
  const list = LESSON.vocab;
  box.innerHTML = "";
  list.forEach((v,i)=>{
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `<div><b class="ko" data-i="${i}" style="cursor:pointer">${v.ko}</b><span class="badge">日</span> ${v.ja}</div>`;
    box.appendChild(row);
  });
  box.addEventListener('click', e=>{
    const ko = e.target.closest('.ko'); if(!ko) return;
    const word = LESSON.vocab[Number(ko.dataset.i)].ko;
    if(!playWordAudio(word)){ alert("音声未登録："+word+"\\n→ data/vocab_cues.json（自動作成可）または data/audio_map.json を設定してください。"); }
  });

  // Try to fetch cue/map if exists (works on GitHub Pages)
  fetch('data/vocab_cues.json', {cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j){ VOCAB_CUES=j; } }).catch(()=>{});
  fetch('data/audio_map.json', {cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j){ AUDIO_MAP=j; } }).catch(()=>{});
})();

// ---- Vocab Quiz (falling) ----
(function(){
  const area = document.getElementById('fall-area');
  const easy = document.getElementById('easy');
  const rEl = document.getElementById('round');
  const sEl = document.getElementById('score');
  const tEl = document.getElementById('time');
  const start = document.getElementById('fall-start');

  let round=0, score=0, running=false, answered=false, timer=null, remain=0;

  function pickN(arr,n){ return arr.slice().sort(()=>Math.random()-0.5).slice(0,n); }
  function next(){
    running=true; answered=false; area.innerHTML=""; round++;
    if(round>5){ running=false; start.disabled=false; STATUS.textContent="語彙クイズ終了"; return; }
    rEl.textContent = round;
    const all = LESSON.vocab.slice();
    const target = all[Math.floor(Math.random()*all.length)];
    const distract = pickN(all.filter(x=>x!==target), 3);
    const options = pickN([target,...distract],4);
    const width = area.clientWidth || 600;
    options.forEach(opt=>{
      const el = document.createElement('div'); el.className='fall'; el.textContent=opt.ko;
      el.style.left = (Math.floor(Math.random()*(width-120))+10)+'px';
      const dur = (easy.checked? 8.5 : 6.0) + (Math.random()*1.5-0.5);
      el.style.setProperty('--dur', dur+'s');
      el.addEventListener('click', ()=>{
        if(answered) return; answered=true;
        if(opt===target){ el.style.borderColor='#2a6'; el.style.background='#eafff2'; score+=10; playWordAudio(opt.ko); }
        else{ el.style.borderColor='#c33'; el.style.background='#ffecec'; score-=5; }
        sEl.textContent=score; setTimeout(next, 600);
      });
      area.appendChild(el);
    });
    remain = easy.checked? 18: 10; tEl.textContent = remain;
    if(timer) clearInterval(timer);
    timer = setInterval(()=>{ remain--; tEl.textContent = remain; if(remain<=0){ clearInterval(timer); if(!answered){ score-=5; sEl.textContent=score; setTimeout(next, 300);} } }, 1000);
  }
  start.addEventListener('click', ()=>{ if(running) return; score=0; sEl.textContent=score; round=0; rEl.textContent=round; start.disabled=true; next(); });
})();

// ---- Grammar Free Input & Substitution ----
(function(){
  // Free
  const box = document.getElementById('gram-free');
  box.innerHTML = "";
  LESSON.grammar.items.forEach((g,idx)=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `<div>${idx+1}. ${g.prompt}</div>
      <input type="text" id="gq${idx}" placeholder="入力してください。" style="width:16em">
      <button id="gb${idx}" type="button">答え合わせ</button>
      <div id="gr${idx}" class="note"></div>`;
    box.appendChild(div);
    document.getElementById('gb'+idx).addEventListener('click', ()=>{
      const v = (document.getElementById('gq'+idx).value||'').trim();
      const ok = g.pattern.test(v);
      document.getElementById('gr'+idx).innerHTML = ok? `<span class="correct">✔ OK</span> ${g.rationale}`: `<span class="incorrect">✘ もう一度</span> ${g.hint}`;
    });
  });
  // Substitution
  const box2 = document.getElementById('gram-sub'); box2.innerHTML="";
  LESSON.substitution.forEach((it,i)=>{
    const div = document.createElement('div'); div.className='card';
    const opts = it.options.map(o=>`<span class="badge">${o}</span>`).join(" ");
    div.innerHTML = `<div><b>${it.title}</b></div>
      <div class="note">選択肢：${opts}</div>
      <div style="margin:6px 0">${it.template.replace("{"+it.slot+"}", `<input type="text" id="sub${i}" placeholder="${it.slot} を入力" style="width:14em">`).replace("{COP}", it.copRule? "(이에요/예요)": "")}</div>
      <button id="subb${i}" type="button">答え合わせ</button>
      <div id="subr${i}" class="note"></div>`;
    box2.appendChild(div);
    document.getElementById('subb'+i).addEventListener('click', ()=>{
      const input = (document.getElementById('sub'+i).value||'').trim();
      const ok = it.options.some(o=>o.replace(/\s+/g,' ').trim() === input.replace(/\s+/g,' ').trim());
      const cop = it.copRule? chooseCopula(input): "";
      const out = it.template.replace("{"+it.slot+"}", input).replace("{COP}", cop);
      document.getElementById('subr'+i).innerHTML = ok? `<span class="correct">✔ 正解</span> → <b>${out}</b>` : `<span class="incorrect">✘ もう一度</span> 例：<b>${it.template.replace("{"+it.slot+"}", it.options[0]).replace("{COP}", it.copRule? chooseCopula(it.options[0]): "")}</b>`;
    });
  });
})();

// ---- Pronunciation (simple SR + jamo/token hybrid) ----
(function(){
  const list = document.getElementById('pron-list');
  const sel = document.getElementById('pron-select');
  LESSON.pronTargets.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; list.appendChild(li); const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); });
  const out = document.getElementById('pron-out');
  const start = document.getElementById('pron-start'); const stop = document.getElementById('pron-stop');
  let rec=null;
  function norm(s){ return (s||"").toLowerCase().replace(/[.,!?~、。！？·:;'"()\[\]{}ー-]/g,' ').replace(/\s+/g,' ').trim(); }
  function jamo(s){
    const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
    const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let out=""; for(let ch of (s||"")){ const c=ch.charCodeAt(0); if(c>=0xAC00&&c<=0xD7A3){ const x=c-0xAC00; out+=CHO[Math.floor(x/588)]+JUNG[Math.floor((x%588)/28)]+JONG[x%28]; } else if(/\s/.test(ch)) out+=" "; }
    return out.replace(/\s+/g,' ').trim();
  }
  function sim(a,b){
    a=norm(a); b=norm(b);
    const A=a.split(" "), B=b.split(" ");
    const setA=new Set(A), setB=new Set(B);
    let inter=0; setA.forEach(x=>{ if(setB.has(x)) inter++; });
    const token=(A.length&&B.length)? (inter/A.length+inter/B.length)/2: 0;
    const ja=jamo(a), jb=jamo(b);
    const m=Math.max(ja.length, jb.length)||1;
    let dp=Array(ja.length+1).fill(0).map(()=>Array(jb.length+1).fill(0));
    for(let i=0;i<=ja.length;i++) dp[i][0]=i;
    for(let j=0;j<=jb.length;j++) dp[0][j]=j;
    for(let i=1;i<=ja.length;i++){ for(let j=1;j<=jb.length;j++){ const cost=ja[i-1]===jb[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost); } }
    const jamoSim = 1 - dp[ja.length][jb.length]/m;
    return Math.max((token*0.5 + jamoSim*0.5), jamoSim);
  }
  start.addEventListener('click', ()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ alert("このブラウザは音声認識に対応していません（Chrome系推奨）。"); return; }
    rec = new SR(); rec.lang="ko-KR"; rec.interimResults=false; rec.maxAlternatives=1;
    start.disabled=true; stop.disabled=true; out.textContent="録音中...";
    const target = sel.value;
    rec.onresult = e=>{ const said = e.results[0][0].transcript.trim(); const sc = sim(said, target); const judge = sc>=0.85? "✔ かなり良い": (sc>=0.7? "△ もう少し": "✘ 要練習"); out.innerHTML=`あなた: <b>${said}</b><br>目標: <b>${target}</b><br>一致度: <b>${(sc*100).toFixed(0)}%</b> ${judge}`; start.disabled=false; stop.disabled=true; };
    rec.onerror = e=>{ out.textContent="音声認識エラー: "+e.error; start.disabled=false; stop.disabled=true; };
    rec.onend = ()=>{ if(start.disabled){ start.disabled=false; stop.disabled=true; } };
    rec.start();
  });
  stop.addEventListener('click', ()=>{ if(rec) rec.stop(); });
})();

// ---- Progress ----
(function(){
  function render(){
    const p = JSON.parse(localStorage.getItem('coach_v42_prog')||'{}');
    const box = document.getElementById('prog');
    box.innerHTML = Object.entries(p).map(([k,v])=>`<div>${k}: <b>${v}</b></div>`).join('') || "<div class='note'>まだ記録はありません。</div>";
  }
  document.getElementById('prog-reset').addEventListener('click', ()=>{ localStorage.removeItem('coach_v42_prog'); render(); });
  render();
})();

// ---- AutoCut (Web Audio API: silence detection) ----
(function(){
  const aud = document.getElementById('ac-aud');
  const thInput = document.getElementById('ac-th');
  const thVal = document.getElementById('ac-thv');
  const gapInput = document.getElementById('ac-gap');
  const btnAnalyze = document.getElementById('ac-analyze');
  const list = document.getElementById('ac-list');
  const btnSave = document.getElementById('ac-save');
  const inputImport = document.getElementById('ac-import');

  thInput.addEventListener('input', ()=> thVal.textContent = thInput.value);

  async function analyze(){
    const url = 'audio/lesson_vocab_master.mp3';
    list.innerHTML = "<div class='note'>解析中…</div>";
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('音声が見つかりません: '+url);
      const buf = await res.arrayBuffer();
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const audio = await ctx.decodeAudioData(buf);
      const ch = audio.numberOfChannels>1? audio.getChannelData(0): audio.getChannelData(0);
      const sr = audio.sampleRate;
      // 短時間エネルギー
      const win = Math.floor(sr*0.02); // 20ms
      const hop = Math.floor(sr*0.01); // 10ms
      const rms = [];
      let i=0;
      while(i+win <= ch.length){
        let s=0;
        for(let k=0;k<win;k++){ const v = ch[i+k]; s += v*v; }
        rms.push(Math.sqrt(s/win));
        i += hop;
      }
      const th = parseFloat(thInput.value);
      const minGapSec = Math.max(0.05, Math.min(1.5, (parseInt(gapInput.value)||250)/1000));
      // 無音フラグ
      const silent = rms.map(v=> v < th ? 1 : 0);
      // サイレント→ボイストランジションで区切り候補
      const cuts = [];
      let prevVoice = false;
      for(let idx=1; idx<silent.length; idx++){
        const voice = !silent[idx];
        if(voice && !prevVoice){ // 無音→発声
          const t = idx*hop/sr;
          if(cuts.length===0 || (t - cuts[cuts.length-1]) >= minGapSec){
            cuts.push(t);
          }
        }
        prevVoice = voice;
      }
      // 語彙数に合わせて区間を生成
      const words = LESSON.vocab.map(v=>v.ko);
      const cues = {};
      for(let w=0; w<words.length; w++){
        const start = cuts[w] ?? (w===0?0: (cues[words[w-1]].end + 0.4));
        const end = (w+1<cuts.length? cuts[w+1] : (start+1.2));
        cues[words[w]] = {start: Math.max(0, +(start.toFixed(2))), end: Math.max(0, +(end.toFixed(2)))};
      }
      VOCAB_CUES = {meta:{src:url}, cues};
      renderList();
    }catch(err){
      list.innerHTML = "<div class='incorrect'>解析に失敗しました。"+err.message+"</div>";
    }
  }

  function renderList(){
    list.innerHTML = "";
    const words = LESSON.vocab.map(v=>v.ko);
    words.forEach(w=>{
      const c = VOCAB_CUES.cues[w] || {start:0, end:1};
      const row = document.createElement('div'); row.className='ac-item';
      row.innerHTML = `<div><b>${w}</b></div>
        <div>開始 <input type="number" step="0.01" value="${c.start}" data-w="${w}" data-k="start" style="width:120px"></div>
        <div>終了 <input type="number" step="0.01" value="${c.end}" data-w="${w}" data-k="end" style="width:120px"></div>
        <div><button data-play="${w}" type="button">▶ 試聴</button></div>`;
      list.appendChild(row);
    });
    list.addEventListener('input', e=>{
      const inp = e.target;
      if(inp.tagName==='INPUT' && inp.dataset.w){
        const w = inp.dataset.w; const k = inp.dataset.k; const v = parseFloat(inp.value)||0;
        VOCAB_CUES.cues[w] = VOCAB_CUES.cues[w]||{start:0, end:1};
        VOCAB_CUES.cues[w][k] = v;
      }
    }, {once:true});
    list.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-play]'); if(!btn) return;
      const w = btn.dataset.play; const c = VOCAB_CUES.cues[w]; if(!c) return;
      const a = new Audio(VOCAB_CUES.meta.src); a.currentTime = c.start||0;
      a.play().then(()=>{
        const stop = c.end||0; if(stop>c.start){ const id = setInterval(()=>{ if(a.currentTime>=stop){ a.pause(); clearInterval(id);} }, 50); }
      }).catch(()=>{});
    }, {once:true});
  }

  btnAnalyze.addEventListener('click', analyze);
  btnSave.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(VOCAB_CUES, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vocab_cues.json'; a.click();
  });
  inputImport.addEventListener('change', ()=>{
    const f = inputImport.files && inputImport.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ()=>{ try{ VOCAB_CUES = JSON.parse(r.result); renderList(); }catch(e){ alert('JSON読み込みに失敗:'+e.message); } }; r.readAsText(f);
  });
})();
