'use strict';
const {Adventure}=AftergridAdventure,$=id=>document.getElementById(id),renderer=createAdventureRenderer($('board'));
const ART={
 focus:'<circle cx="12" cy="12" r="5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
 journal:'<path d="M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4ZM12 6v16M7 8h2m-2 4h2m6-4h2m-2 4h2"/>',
 fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 menu:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
 resume:'<path d="m6 5 11 7-11 7ZM20 5v14"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',check:'<path d="m5 12 5 5L20 6"/>',skip:'<path d="m4 5 7 7-7 7m8-14 7 7-7 7m9-14v14"/>',
 signal:'<circle cx="12" cy="17" r="2"/><path d="M6 12a8 8 0 0 1 12 0M3 8a13 13 0 0 1 18 0M12 19v3"/>',
 monument:'<path d="M4 21V5h5v16m6 0V5h5v16M3 3h18M3 21h18M9 8h6"/>',
 wreck:'<path d="m3 17 4-9h5l4 5 5 1-3 6H6ZM8 8V4m2 8 3 3-4 2m8-10 3-3"/>',
 decode:'<path d="m4 8 3-5 3 5-3 5Zm10-5h6v6h-6ZM5 18h5m-3-3v6m8-6 6 6m0-6-6 6"/>',
 hand:'<path d="M8 13V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 8-10 9-13 4l-4-5a2 2 0 0 1 3-3l2 2"/>',
 break:'<path d="M5 3h7l-3 6 6 3-4 9h8V3M3 21h5m0-12-4 2 3 3"/>',
 help:'<path d="m3 12 5 7 5-2 8-8-3-3-7 6-5-3ZM9 16l5-5m1-7 3 2"/>',
 speak:'<path d="M3 4h18v13h-8l-6 5v-5H3ZM7 8h10M7 12h6"/>',
 listen:'<path d="M8 8a5 5 0 0 1 10 0c0 6-5 4-5 9a3 3 0 0 1-6 0M11 8a2 2 0 0 1 4 0c0 3-4 2-4 5"/>',
 record:'<path d="M5 3h14v18H5ZM8 7h8m-8 4h8m-8 4h5"/>',
 trail:'<path d="M4 20h4v-4h4v-4h4V8h4M16 4h4v4"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 fragment:'<path d="m12 2 8 10-8 10-8-10ZM12 2v20M4 12h16"/>',
 descend:'<path d="M12 3v15m-6-6 6 6 6-6M4 22h16"/>',
 scan:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M2 12h20"/>',
 repair:'<path d="M15 3a5 5 0 0 0-5 7L3 17l4 4 7-7a5 5 0 0 0 7-5l-4 3-5-5Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 shield:'<path d="m12 2 8 4v7c0 6-8 9-8 9s-8-3-8-9V6ZM8 12l3 3 5-6"/>',
 wayfarers:'<path d="m12 3 7 5v8l-7 5-7-5V8ZM7 10h10M9 13h6M12 15v3"/>',
 foundry:'<path d="M5 6h14v13H5ZM9 2v4m6-4v4M8 10h2m4 0h2M9 15h6M2 9v7m20-7v7"/>',
 verdant:'<path d="M12 22V6m0 8L5 7V2m7 9 7-6V1M5 7H1m18-2h4M8 21l-4-4m12 4 4-4"/>'
};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ART[n]||ART.fragment}</svg>`;
for(const[id,name]of Object.entries({focus:'focus',journalButton:'journal',fullscreen:'fullscreen',menuButton:'menu',skip:'skip',resume:'resume',start:'play',cancel:'close',replace:'check',closeJournal:'close'}))$(id).innerHTML=icon(name);
document.querySelectorAll('[data-faction]').forEach((b,i)=>b.innerHTML=icon(['wayfarers','foundry','verdant'][i]));
const KEY='aftergrid-adventure-v1',preview=Math.max(0,Math.min(999999,Number(new URLSearchParams(location.search).get('preview'))||0));
let adventure=null,chosen=0,busy=false,first=true,drag=null,narrativeToken=0;
const SEEN_KEY='aftergrid-gre-seen-v1';
let seenQuestions=[];try{seenQuestions=JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');if(!Array.isArray(seenQuestions))seenQuestions=[];}catch{}
function markSeen(index){if(preview)return;if(!seenQuestions.includes(index))seenQuestions.push(index);try{localStorage.setItem(SEEN_KEY,JSON.stringify(seenQuestions));}catch{}}
let timerTick=performance.now();
function timedChallenge(){return adventure&&!adventure.studyFeedback?adventure.getChallenge():null;}
function updatePace(){const now=performance.now(),delta=now-timerTick;timerTick=now;
 const q=timedChallenge(),running=q&&!busy&&$('menu').hidden&&$('journal').hidden&&!document.hidden;
 if(!q){$('pace').hidden=true;return;}
 const key=q.key+':'+q.index;if(!adventure.responseClock||adventure.responseClock.key!==key)adventure.responseClock={key,ms:0};
 if(running)adventure.responseClock.ms+=delta;
 const seconds=Math.floor(adventure.responseClock.ms/1000),quant=q.type.startsWith('Quantitative'),target=quant?75:60;
 $('pace').hidden=false;$('pace').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} / ${target}s target`+(running?'':' · paused');
 $('pace').title='Training sprint goal: 60s verbal / 75s quant. GRE section averages are about 90s verbal / 105s quant. Accuracy comes first.';
}
function paceSummary(){const records=(adventure.study?.review||[]).filter(r=>r.firstTry&&Number.isFinite(r.seconds));if(!records.length)return 'First-answer pace appears after a question.';
 const correct=records.filter(r=>r.correct).length,accuracy=Math.round(correct/records.length*100),avg=Math.round(records.reduce((s,r)=>s+r.seconds,0)/records.length),fast=records.every(r=>r.seconds<=(r.type.startsWith('Quantitative')?75:60));
 return `${accuracy}% first-try · ${avg}s avg · ${records.length>=5&&accuracy>=90&&fast?'Incredible pace':accuracy<90?'Accuracy first':fast?'On sprint pace':'Build steady speed'}`;
}
setInterval(updatePace,100);document.addEventListener('visibilitychange',()=>{updatePace();save();});window.addEventListener('pagehide',()=>{updatePace();save();});
function randomSeed(){const n=new Uint32Array(1);crypto.getRandomValues(n);return n[0]%999999+1;}
function save(){if(!preview&&adventure)try{localStorage.setItem(KEY,adventure.serialize());}catch{} }
function setFaction(i){chosen=i;$('campaignHint').textContent=window.AftergridAdventure.CAMPAIGNS[i].task;document.querySelectorAll('[data-faction]').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
function showMenu(){if(busy)return;$('menu').hidden=false;$('resume').hidden=!adventure;$('confirm').hidden=true;setFaction(adventure?.faction??chosen);}
function renderChapter(){const chapter=adventure.chapter();const activeQuestion=timedChallenge();if(activeQuestion)markSeen(activeQuestion.index);$('chapter').textContent=chapter.subtitle;$('sceneTitle').textContent=chapter.title;$('narration').textContent=chapter.body;$('puzzlePrompt').textContent=chapter.puzzle||'';$('puzzlePrompt').hidden=!chapter.puzzle;$('storyCopy').scrollTop=0;$('consequence').textContent=chapter.consequence;$('choices').replaceChildren();$('story').classList.toggle('study-question',!!chapter.puzzle);
 for(const c of chapter.choices){const wrap=document.createElement('div');wrap.className='choice';const button=document.createElement('button');button.className='bubble';button.innerHTML=icon(c.icon);if(/^[•— ]+$/.test(c.label)){button.textContent=c.label;button.classList.add('pattern');}button.setAttribute('aria-label',c.label);button.dataset.tip=c.id==='continueStudy'?'Continue':c.id.startsWith('answer')?(chapter.subtitle.startsWith('GUARDIAN')?'Counter':'Solve'):({signal:'Follow',monument:'Explore',wreck:'Search',decode:'Decode',touch:'Touch',force:'Open',aid:'Help',question:'Question',listen:'Listen',record:'Recover',trail:'Follow',memory:'Replay',fragment:'Keep',witness:'Find',beneath:'Descend',rescue:'Rescue',scan:'Record',stabilize:'Repair',descend:'Descend',survivor:'Return',free:'Free',protect:'Protect',reveal:'Reveal',again:'Begin'})[c.id]||'Explore';button.onclick=()=>choose(c.id);const label=document.createElement('span');label.textContent=c.label;label.onclick=()=>button.click();wrap.append(button,label);$('choices').append(wrap);}
 $('vitals').hidden=!adventure.hazards;$('vitals').setAttribute('aria-label',`Suit integrity ${adventure.integrity} of 3`);$('vitals').replaceChildren(...Array.from({length:3},(_,i)=>{const dot=document.createElement('i');dot.className=i<adventure.integrity?'intact':'broken';return dot;}));
 $('progress').replaceChildren(...Array.from({length:4},(_,i)=>{const d=document.createElement('i');if(i<adventure.clues.length)d.className='found';return d;}));$('progress').setAttribute('aria-label',`${adventure.clues.length} independent pieces of evidence recovered`);document.body.classList.remove('cinematic');$('skip').hidden=true;busy=false;timerTick=performance.now();updatePace();$('announcement').textContent=chapter.title;
}
function playScene(instant=false){busy=true;document.body.classList.add('cinematic');$('story').setAttribute('aria-hidden','true');$('skip').hidden=instant;renderer.play(adventure.scene,()=>{$('story').removeAttribute('aria-hidden');renderChapter();save();},instant);}
function begin(seed=randomSeed()){let next=new Adventure(seed,chosen);if(!preview&&adventure){for(let i=0;i<100&&next.secretKey===adventure.secretKey;i++)next=new Adventure((seed+i+1)%999999+1,chosen);}adventure=next;adventure.setQuestionDeck(seenQuestions);$('menu').hidden=true;$('confirm').hidden=true;$('journal').hidden=true;renderer.setWorld(adventure);save();playScene();first=false;}
function choose(id){if(busy||!adventure)return;if(adventure.scene==='ending'&&!adventure.studyFeedback){showMenu();return;}updatePace();const question=timedChallenge(),elapsed=(adventure.responseClock?.ms||0)/1000;const firstTry=question&&!(adventure.study?.review||[]).some(r=>r.questionId===question.index);const previous=adventure.scene;if(!adventure.choose(id))return;if(question&&id.startsWith('answer')){const record=adventure.study.review.at(-1);record.seconds=Number(elapsed.toFixed(1));record.firstTry=firstTry;adventure.studyFeedback.explanation+=` Time: ${record.seconds}s. `+paceSummary();}save();if(previous===adventure.scene){renderer.react?.(id==='answer0');renderChapter();}else playScene();}
$('start').onclick=()=>{if(adventure&&adventure.scene!=='ending')$('confirm').hidden=false;else begin();};$('replace').onclick=()=>begin();$('cancel').onclick=()=>{$('confirm').hidden=true;};$('resume').onclick=()=>{$('menu').hidden=true;};$('menuButton').onclick=showMenu;document.querySelectorAll('[data-faction]').forEach(b=>b.onclick=()=>setFaction(Number(b.dataset.faction)));
$('focus').onclick=()=>renderer.focus();$('skip').onclick=()=>renderer.skip();
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
let memoryPage=0;
function renderMemory(){
 const records=[{title:'Pace report',text:paceSummary()+' · Sprint goals: 60s verbal / 75s quant. Retries excluded.'},...adventure.clues.map(c=>({title:c.title,text:c.text}))];
 for(const item of adventure.study?.review||[])records.push({title:item.type+' · Question',text:item.question},{title:(item.correct?'Correct · ':'Review · ')+item.type,text:'Answer: '+item.answer+'. '+item.explanation+(Number.isFinite(item.seconds)?' Time: '+item.seconds+'s.':'')});
 if(!records.length)records.push({title:'No memories yet',text:'Explore the ruins and answer challenges to collect evidence.'});
 memoryPage=Math.max(0,Math.min(records.length-1,memoryPage));$('clues').replaceChildren();$('path').replaceChildren();
 const record=records[memoryPage],h=document.createElement('h3'),p=document.createElement('p');h.textContent=record.title;p.textContent=record.text;$('clues').append(h,p);
 const nav=document.createElement('div');nav.className='journal-pages';
 for(const direction of [-1,1]){const button=document.createElement('button');button.className='bubble';button.innerHTML=icon('play');button.setAttribute('aria-label',direction<0?'Previous memory':'Next memory');button.dataset.tip=direction<0?'Previous':'Next';if(direction<0)button.style.transform='rotate(180deg)';button.disabled=direction<0?memoryPage===0:memoryPage===records.length-1;button.onclick=()=>{memoryPage+=direction;renderMemory();};nav.append(button);}
 const count=document.createElement('span');count.textContent=(memoryPage+1)+' / '+records.length;nav.insertBefore(count,nav.lastChild);$('path').append(nav);
}
$('journalButton').onclick=()=>{if(!adventure||busy)return;memoryPage=0;$('journalTitle').textContent=adventure.planet.name;renderMemory();$('journal').hidden=false;};
$('closeJournal').onclick=()=>{$('journal').hidden=true;};
// Frameless, one-word hints for every bubble, on hover and keyboard focus.
function showTip(button){if(!button||!button.dataset.tip)return;const r=button.getBoundingClientRect(),tip=$('tooltip');tip.textContent=button.dataset.tip;tip.hidden=false;const above=r.top>65;tip.style.left=Math.max(45,Math.min(innerWidth-45,r.left+r.width/2))+'px';tip.style.top=(above?r.top-9:r.bottom+30)+'px';}
function hideTip(){$('tooltip').hidden=true;}
document.addEventListener('pointerover',e=>showTip(e.target.closest('button[data-tip]')));document.addEventListener('pointerout',e=>{if(e.target.closest('button[data-tip]'))hideTip();});document.addEventListener('focusin',e=>showTip(e.target.closest('button[data-tip]')));document.addEventListener('focusout',hideTip);document.addEventListener('click',hideTip);
const canvas=$('board');canvas.addEventListener('pointerdown',e=>{if(busy)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointermove',e=>{if(!drag)return;renderer.pan(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();if(!busy)renderer.zoom(-e.deltaY*.001);},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){hideTip();$('journal').hidden=true;if(adventure)$('menu').hidden=true;}if(['1','2','3','4','5'].includes(e.key)&&$('menu').hidden&&$('journal').hidden&&!busy){const c=adventure?.chapter().choices[Number(e.key)-1];if(c)choose(c.id);}if(e.key.toLowerCase()==='f')renderer.focus();});
try{if(!preview){const raw=localStorage.getItem(KEY);if(raw){adventure=Adventure.restore(raw);chosen=adventure.faction;renderer.setWorld(adventure);playScene(true);first=false;}}}catch{adventure=null;}
if(preview){chosen=0;begin(preview);}else if(!adventure){const backdrop=new Adventure(8,0);renderer.setWorld(backdrop);renderer.play('landing',()=>{},true);showMenu();}
