
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

// ---- Lesson data ----
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
      {prompt:"① 「私は大学生です。」", accept:[/^저는\s*대학생(이에요|예요)\.?$/i], rationale:"‘대학생’は받침あり→‘이에요’", hint:"저는 + 名詞 + 이에요/예요"},
      {prompt:"② 「（さとうけん）です。」", accept:[/^제\s*이름은\s*사토\s*켄이에요\.?$/i,/^저는\s*사토\s*켄이에요\.?$/i], rationale:"両方OK", hint:"제 이름은 ~/저는 ~"},
      {prompt:"③ 「私は日本人です。」", accept:[/^저는\s*일본\s*사람이에요\.?$/i], rationale:"固定表現", hint:"저 + 일본 사람 + 이에요."}
    ]
  },
  copulaNouns: ["학생","유학생","회사원","의사","가수","선생님","친구","사람","한국인","일본인","중국人","미국인","베트남인","직원","연구원"],
  pronTargets: [
    "저는 김민수예요.",
    "이름이 뭐예요?",
    "저는 일본 사람이에요. 만나서 반가워요."
  ],
  shadowLines: [
    "민수: 안녕하세요?",
    "저는 김민수예요.",
    "이름이 뭐예요?",
    "유키: 안녕하세요?",
    "저는 다나카 유키예요.",
    "민수: 유키 씨는 일본 사람이에요?",
    "유키: 네, 저는 일본 사람이에요. 만나서 반가워요.",
    "민수: 만나서 반가워요."
  ]
};

let AUDIO_MAP = {}; // word -> filename
let VOCAB_CUES = {meta:{src:"audio/lesson_vocab_master.mp3"}, cues:{}};

// ---- Utils ----
function saveProg(delta){
  const key = 'coach_v431_prog';
  const p = JSON.parse(localStorage.getItem(key)||'{"voc":{"ok":0,"ng":0},"gram":{"ok":0,"ng":0},"cop":{"ok":0,"ng":0},"pron":{"ok":0,"ng":0},"last":""}');
  function add(sec, ok){ p[sec][ ok? "ok":"ng" ] += 1; }
  if(delta){ Object.entries(delta).forEach(([k,v])=>{ if(k==="last"){ p.last = v; } else add(k,v); }); }
  p.last = new Date().toLocaleString();
  localStorage.setItem(key, JSON.stringify(p));
  renderProg();
}
function renderProg(){
  const key = 'coach_v431_prog';
  const p = JSON.parse(localStorage.getItem(key)||'{}');
  const box = document.getElementById('prog');
  if(!box) return;
  box.innerHTML = p.last? `
    <div>最終更新: <b>${p.last}</b></div>
    <ul>
      <li>語彙クイズ: ✔${p.voc?.ok||0} / ✘${p.voc?.ng||0}</li>
      <li>文型（自由入力）: ✔${p.gram?.ok||0} / ✘${p.gram?.ng||0}</li>
      <li>コピュラ練習: ✔${p.cop?.ok||0} / ✘${p.cop?.ng||0}</li>
      <li>発音: ✔${p.pron?.ok||0} / ✘${p.pron?.ng||0}</li>
    </ul>` : "<div class='note'>まだ記録はありません。</div>";
}
document.getElementById('prog-reset').addEventListener('click', ()=>{ localStorage.removeItem('coach_v431_prog'); renderProg(); });

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
    if(!playWordAudio(word)){ alert("音声未登録："+word+"\\n→ data/vocab_cues.json か data/audio_map.json を設定してください。"); }
  });
  // try fetch cue/map
  fetch('data/vocab_cues.json', {cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j){ VOCAB_CUES=j; } }).catch(()=>{});
  fetch('data/audio_map.json', {cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j){ AUDIO_MAP=j; } }).catch(()=>{});
})();

// ---- Vocab Quiz (prompt & ko-only chips) ----
(function(){
  const area = document.getElementById('fall-area');
  const easy = document.getElementById('easy');
  const rEl = document.getElementById('round');
  const sEl = document.getElementById('score');
  const tEl = document.getElementById('time');
  const pEl = document.getElementById('fall-prompt');
  const start = document.getElementById('fall-start');

  let round=0, score=0, running=false, answered=false, timer=null, remain=0;

  function pickN(arr,n){ return arr.slice().sort(()=>Math.random()-0.5).slice(0,n); }
  function next(){
    running=true; answered=false; area.innerHTML=""; round++;
    if(round>5){ running=false; start.disabled=false; STATUS.textContent="語彙クイズ終了"; return; }
    rEl.textContent = round;
    const all = LESSON.vocab.slice();
    const target = all[Math.floor(Math.random()*all.length)];
    // ★ 変更：お題は【日本語】で表示
    pEl.textContent = `【${target.ja}】に合う韓国語をクリック`;
    const distract = pickN(all.filter(x=>x!==target), 3);
    const options = pickN([target,...distract],4);
    const width = area.clientWidth || 600;
    options.forEach(opt=>{
      const el = document.createElement('div'); el.className='fall';
      el.textContent = opt.ko; // ★ 韓国語のみ表示
      el.style.left = (Math.floor(Math.random()*(width-140))+10)+'px';
      const dur = (easy.checked? 8.5 : 6.0) + (Math.random()*1.5-0.5);
      el.style.setProperty('--dur', dur+'s');
      el.addEventListener('click', ()=>{
        if(answered) return; answered=true;
        if(opt===target){ el.style.borderColor='#2a6'; el.style.background='#eafff2'; score+=10; playWordAudio(opt.ko); saveProg({"voc":true}); }
        else{ el.style.borderColor='#c33'; el.style.background='#ffecec'; score-=5; saveProg({"voc":false}); }
        sEl.textContent=score; setTimeout(next, 600);
      });
      area.appendChild(el);
    });
    remain = easy.checked? 18: 10; tEl.textContent = remain;
    if(timer) clearInterval(timer);
    timer = setInterval(()=>{ remain--; tEl.textContent = remain; if(remain<=0){ clearInterval(timer); if(!answered){ score-=5; sEl.textContent=score; saveProg({"voc":false}); setTimeout(next, 300);} } }, 1000);
  }
  start.addEventListener('click', ()=>{ if(running) return; score=0; sEl.textContent=score; round=0; rEl.textContent=round; start.disabled=true; next(); });
})();

// ---- Grammar Free Input (same as 4.3) ----
(function(){
  function norm(s){ return (s||"").trim().replace(/\s+/g,' ').replace(/[．。]/g,'.'); }
  const box = document.getElementById('gram-free');
  box.innerHTML = "";
  LESSON.grammar.items.forEach((g,idx)=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `<div>${idx+1}. ${g.prompt}</div>
      <input type="text" id="gq${idx}" placeholder="入力してください。" style="width:20em">
      <button id="gb${idx}" type="button">答え合わせ</button>
      <div id="gr${idx}" class="note"></div>`;
    box.appendChild(div);
    document.getElementById('gb'+idx).addEventListener('click', ()=>{
      const v = norm(document.getElementById('gq'+idx).value||'');
      const ok = g.accept.some(rx=> rx.test(v));
      document.getElementById('gr'+idx).innerHTML = ok? `<span class="correct">✔ 正解</span> ${g.rationale}`: `<span class="incorrect">✘ もう一度</span> ${g.hint}`;
      saveProg({"gram": ok});
    });
  });
})();

// ---- Copula Trainer & Blank Quiz ----
(function(){
  function hasBatchim(word){
    const ch = word.trim().slice(-1).charCodeAt(0);
    if(isNaN(ch) || ch < 0xAC00 || ch > 0xD7A3) return false;
    const jong = (ch - 0xAC00) % 28;
    return jong !== 0;
  }
  function chooseCopula(noun){ return hasBatchim(noun) ? "이에요" : "예요"; }
  const nouns = ["학생","유학생","회사원","의사","가수","선생님","친구","사람","한국인","日本人".replace("日本人","일본인"),"중국인","미국인","베트남인","직원","연구원"];

  const box = document.getElementById('copula');
  function render(){
    box.innerHTML = "";
    for(let i=0;i<5;i++){
      const n = nouns[Math.floor(Math.random()*nouns.length)];
      const div = document.createElement('div'); div.className='card';
      div.innerHTML = `(${i+1}) <b>${n}</b> → 「저는 ____」
        <label><input type="radio" name="cp${i}" value="이에요">이에요</label>
        <label><input type="radio" name="cp${i}" value="예요">예요</label>
        <button id="cpb${i}" type="button">判定</button>
        <div id="cpr${i}" class="note"></div>`;
      box.appendChild(div);
      document.getElementById('cpb'+i).addEventListener('click', ()=>{
        const sel = (document.querySelector(`input[name="cp${i}"]:checked`)||{}).value;
        const need = chooseCopula(n);
        const ok = sel===need;
        document.getElementById('cpr'+i).innerHTML = ok? `<span class="correct">✔ 正解</span> 「${n}」は${hasBatchim(n)?"子音終わり（받침あり）":"母音終わり（받침なし）"} → <b>${need}</b>` :
          `<span class="incorrect">✘</span> 正しくは <b>${need}</b>（${hasBatchim(n)?"받침あり":"받침なし"}）`;
        saveProg({"cop":ok});
      });
    }
    const again = document.createElement('button'); again.textContent="➕ 5問追加"; again.addEventListener('click', render); box.appendChild(again);
  }
  render();

  const box2 = document.getElementById('copula-quiz');
  const words = nouns.slice(0,8);
  words.forEach((w,i)=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `(${i+1}) 저는 ${w}<input id="bq${i}" style="width:5em" placeholder="( )">.` +
      `<button id="bqb${i}" type="button">判定</button> <span id="bqr${i}" class="note"></span>`;
    box2.appendChild(div);
    document.getElementById('bqb'+i).addEventListener('click', ()=>{
      const val = (document.getElementById('bq'+i).value||'').trim();
      const need = chooseCopula(w);
      const ok = val===need;
      document.getElementById('bqr'+i).innerHTML = ok? `<span class="correct">✔</span>` : `<span class="incorrect">✘</span> 正しくは <b>${need}</b>`;
      saveProg({"cop":ok});
    });
  });
})();

// ---- Pronunciation (two modes) ----
(function(){
  const list = document.getElementById('pron-list');
  const sel = document.getElementById('pron-select');
  const targets = [
    "저는 김민수예요.",
    "이름이 뭐예요?",
    "저는 일본 사람이에요. 만나서 반가워요."
  ];
  targets.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; list.appendChild(li); const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); });
  const out = document.getElementById('pron-out');
  const start = document.getElementById('pron-start'); const stop = document.getElementById('pron-stop');
  const recAudio = document.getElementById('rec-play');
  const deviceNote = document.getElementById('device-note');
  const modeRadios = document.querySelectorAll('input[name="prmode"]');
  let rec=null, mediaRec=null, chunks=[];

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

  function setDeviceNote(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const ua = navigator.userAgent||"";
    const isiOS = /iPhone|iPad|iPod/.test(ua);
    deviceNote.textContent = SR? "評価モードが使えます。" : "この端末はWeb Speech未対応のため『録音のみ』をご利用ください。";
    if(isiOS) deviceNote.textContent += "（iOS Safari/Chromeは音声認識非対応）";
  }
  setDeviceNote();

  start.addEventListener('click', async ()=>{
    const mode = [...modeRadios].find(r=>r.checked).value;
    if(mode==="sr"){
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SR){ alert("この端末は評価モードが使えません。『録音のみ』に切り替えてください。"); return; }
      rec = new SR(); rec.lang="ko-KR"; rec.interimResults=false; rec.maxAlternatives=1;
      start.disabled=true; stop.disabled=true; out.textContent="録音中...";
      const target = document.getElementById('pron-select').value;
      rec.onresult = e=>{ const said = e.results[0][0].transcript.trim(); const sc = sim(said, target); const judge = sc>=0.85? "✔ かなり良い": (sc>=0.7? "△ もう少し": "✘ 要練習"); out.innerHTML=`あなた: <b>${said}</b><br>目標: <b>${target}</b><br>一致度: <b>${(sc*100).toFixed(0)}%</b> ${judge}`; start.disabled=false; stop.disabled=true; saveProg({"pron": sc>=0.7}); };
      rec.onerror = e=>{ out.textContent="音声認識エラー: "+e.error; start.disabled=false; stop.disabled=true; };
      rec.onend = ()=>{ if(start.disabled){ start.disabled=false; stop.disabled=true; } };
      rec.start();
    } else {
      try{
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        const mediaRec = new MediaRecorder(stream);
        const chunks=[]; mediaRec.ondataavailable = e=>{ if(e.data.size>0) chunks.push(e.data); };
        mediaRec.onstop = ()=>{
          const blob = new Blob(chunks, {type:'audio/webm'});
          const url = URL.createObjectURL(blob);
          const recAudio = document.getElementById('rec-play');
          recAudio.src = url; recAudio.style.display = 'block'; out.textContent="録音の再生・保存ができます（評価は行いません）。";
          saveProg({"pron": true});
        };
        mediaRec.start(); start.disabled=true; stop.disabled=false; out.textContent="録音中...（停止で保存）";
        stop.onclick = ()=>{ if(mediaRec.state!=="inactive"){ mediaRec.stop(); start.disabled=false; stop.disabled=true; } };
      }catch(err){
        alert("マイクにアクセスできません: "+err.message);
      }
    }
  });
})();

// ---- Progress initial render ----
renderProg();
