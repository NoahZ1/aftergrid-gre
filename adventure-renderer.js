/* Full-screen voxel film stage, with procedural locations and camera choreography. */
(function(root){'use strict';
root.createAdventureRenderer=function(canvas){
 const {Game,N,ROLES,TYPES,FACTIONS,inside,key,dist,hash}=Aftergrid;
 const {SITES}=AftergridAdventure,ctx=canvas.getContext('2d'),TAU=Math.PI*2;
 let game=null,story=null,selected=null,motion=null,knownCells=[],cityMap=new Map(),unitMap=new Map(),ruinMap=new Map();
 let width=innerWidth,height=innerHeight,cam={x:18,y:18},zoom=1.4,target={x:18,y:18,zoom:1.4},scene='landing',cut=null,done=null,frameTime=0,active=true,landing=null;let reaction=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function planet(){return BIOMES[game?.biome]||BIOMES.ocean;}
 function hexRGB(hex){return hex.slice(1).match(/../g).map(s=>parseInt(s,16));}
 function rgb(a,f=1){return `rgb(${a.map(v=>Math.max(0,Math.min(255,Math.round(v*f)))).join(',')})`;}
const BIOMES={
 ocean:{ground:[42,71,80],sand:[134,153,150],plateau:[91,126,136],water:[20,91,143],trunk:[68,94,99],leaf:[82,162,177],ambient:'#061725',halo:'114,190,227'},
 inferno:{ground:[91,37,35],sand:[143,64,47],plateau:[119,52,45],water:[229,65,26],trunk:[75,40,38],leaf:[168,60,46],ambient:'#260907',halo:'255,99,55'},
 forest:{ground:[59,44,84],sand:[113,88,131],plateau:[105,82,130],water:[58,45,107],trunk:[100,69,105],leaf:[144,89,184],ambient:'#1a0928',halo:'193,133,241'}
};
function project(x,y,z=0){return{x:width*(width<700?.5:.67)+((x-y)-(cam.x-cam.y))*29*zoom,y:height*(width<700?.31:.47)+((x+y)-(cam.x+cam.y))*14.5*zoom-z*40*zoom};}
function elevation(x,y){return game.tile(x,y)==='plateau'?.48:game.tile(x,y)==='water'?.035:.17;}
function path(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function gray(n){n=Math.max(0,Math.min(255,Math.round(n)));return `rgb(${n},${n+Math.min(2,255-n)},${n})`;}
function voxel(x,y,z,w,d,h,tone=180,edge=false){const a=project(x-w/2,y-d/2,z+h),b=project(x+w/2,y-d/2,z+h),c=project(x+w/2,y+d/2,z+h),dd=project(x-w/2,y+d/2,z+h),e=project(x+w/2,y+d/2,z),f=project(x-w/2,y+d/2,z),g=project(x+w/2,y-d/2,z);const face=f=>Array.isArray(tone)?rgb(tone,f):gray(tone*f);path([dd,c,e,f],face(.49));path([b,c,e,g],face(.7));path([a,b,c,dd],face(1),edge?'#ffffff16':null,.5);}
function diamond(x,y,z,color='#fff',scale=.92,line=1){const s=scale/2;path([project(x-s,y-s,z),project(x+s,y-s,z),project(x+s,y+s,z),project(x-s,y+s,z)],null,color,line);}
function line3(a,b,col='#ffffff44',lw=1){const p=project(...a),q=project(...b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();}
function ring(x,y,z,r,color,alpha=1){const p=project(x,y,z);ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.ellipse(p.x,p.y,r*zoom,r*.49*zoom,0,0,TAU);ctx.strokeStyle=color;ctx.lineWidth=.8*zoom;ctx.stroke();ctx.restore();}
function glow(x,y,z,r=25,power=.2){const p=project(x,y,z),gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*zoom);gr.addColorStop(0,`rgba(237,245,230,${power})`);gr.addColorStop(1,'rgba(237,245,230,0)');ctx.fillStyle=gr;ctx.fillRect(p.x-r*zoom,p.y-r*zoom,r*zoom*2,r*zoom*2);}
function rebuild(){knownCells=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(game.seen[key(x,y)])knownCells.push({x,y});knownCells.sort((a,b)=>a.x+a.y-b.x-b.y);cityMap=new Map(game.cities.map(c=>[key(c.x,c.y),c]));unitMap=new Map(game.units.map(u=>[key(u.x,u.y),u]));ruinMap=new Map(game.ruins.filter(r=>!r.claimed).map(r=>[key(r.x,r.y),r]));}
function selUnit(){return selected?.type==='unit'?game.units.find(u=>u.id===selected.id):null;}
function selCity(){return selected?.type==='city'?game.cities.find(c=>c.id===selected.id):null;}
function surface(x,y,t){const k=key(x,y),v=game.visible.has(k),type=game.tile(x,y),h=elevation(x,y);ctx.globalAlpha=v?1:.3;const theme=planet(),tone=type==='sand'?theme.sand:type==='plateau'?theme.plateau:type==='water'?theme.water:theme.ground;
 voxel(x,y,0,.995,.995,h,tone,true);
 if(type==='water'){const s=hash(x,y,game.seed)*.4;line3([x-.2,y+s,h+.005],[x+.18,y+s,h+.005],game.biome==='inferno'?'#ffb16e88':'#bbdced44',.65);}
 if(type==='plateau'&&!unitMap.has(k)&&!cityMap.has(k)){const n=hash(x,y,game.seed+9);voxel(x-.15,y+.1,h,.35,.42,.11,theme.plateau);if(n>.7)voxel(x+.2,y-.2,h,.23,.2,.18,theme.ground);}
 if(type==='moss'&&!unitMap.has(k)&&!cityMap.has(k)&&!ruinMap.has(k)){const rand=hash(x,y,game.seed+3);if(rand>(game.biome==='forest'?.57:game.biome==='inferno'?.93:.86)){const z=h;voxel(x,y,z,.075,.075,.34,theme.trunk);voxel(x,y,z+.29,.32,.32,.2,theme.leaf);voxel(x-.1,y+.06,z+.43,.22,.23,.12,theme.leaf.map(v=>Math.min(255,v*1.16)));if(rand>.8)voxel(x+.08,y-.08,z+.55,.17,.17,.1,theme.leaf);}else if(rand<.2){for(let j=0;j<3;j++)voxel(x-.2+j*.15,y+.18-j*.08,h,.06,.06,.08+hash(x+j,y,3)*.1,theme.leaf);}}
 ctx.globalAlpha=1;
}
function shipModel(x,y,z,deployed=1,t=0,owner=game.player){
 const accent=hexRGB(FACTIONS[owner].color);
 const b=(dx,dy,dz,w,d,h,n)=>voxel(x+dx,y+dy,z+dz,w,d,h,n);
 b(0,0,.13,.58,.78,.16,174);b(0,.43,.15,.38,.25,.12,214);b(0,.57,.16,.23,.13,.06,198);
 b(0,-.04,.29,.46,.48,.13,218);b(0,-.04,.425,.1,.48,.015,accent);b(0,.26,.28,.36,.16,.07,64);b(0,.33,.33,.27,.05,.028,229);
 for(const dx of [-.37,.37]){b(dx,-.12,.08,.16,.59,.16,127);b(dx,-.12,.24,.17,.4,.07,205);b(dx,-.43,.12,.13,.07,.1,237);b(dx,.15,0,.065,.16,.1,116);}
 b(0,-.15,.43,.22,.28,.06,139);b(0,-.15,.49,.17,.19,.07,237);
 if(deployed>0){for(const sign of [-1,1]){b(sign*(.32+deployed*.12),.13,.035,.19*deployed,.24,.045,115);b(sign*(.32+deployed*.12),.13,.08,.13*deployed,.19,.008,220);}b(0,-.22,.56,.032,.032,.4*deployed,240);glow(x,y,z+.6,35,.12);}
}
function cityModel(c,t){const x=c.x,y=c.y,z=elevation(x,y),friendly=c.owner===game.player;ctx.globalAlpha=game.visible.has(key(x,y))?1:.45;
 ring(x,y,z+.01,23,friendly?'#eff6e2':'#88948b',.55);
 if(c.ship||['Haven','Relay','Arbor'].includes(c.name)){shipModel(x,y,z,1,t,c.owner);for(let i=0;i<c.data;i++)voxel(x-.34+i*.2,y-.3,z+.4,.1,.12,.16,221);if(c.lab)voxel(x+.3,y+.3,z+.12,.14,.14,.2,232);if(c.farm)for(let j=0;j<3;j++)voxel(x-.2+j*.2,y+.36,z,.1,.16,.09,planet().leaf);ctx.globalAlpha=1;return;}
 const block=(dx,dy,dz,w,d,h,tone)=>voxel(x+dx,y+dy,z+dz,w,d,h,tone);
 block(0,0,0,.84,.84,.1,104);block(0,0,.1,.64,.64,.16,175);block(0,0,.26,.52,.52,.14,91);block(0,0,.4,.39,.39,.25,201);block(0,0,.65,.43,.43,.045,238);block(0,0,.7,.25,.25,.28,183);block(0,0,.98,.18,.18,.05,249);block(0,0,1.03,.035,.035,.35,230);
 for(const [dx,dy]of [[-.3,-.3],[.3,-.3],[.3,.3],[-.3,.3]]){block(dx,dy,.1,.13,.13,.3,147);block(dx,dy,.4,.15,.15,.04,222);}
 for(let i=0;i<c.data;i++)block(.31,-.15+i*.26,.43,.12,.18,.29,220);
 if(c.farm)for(let j=0;j<4;j++)block(-.33+j*.2,.32,.12,.09,.17,.08,190);
 if(c.lab)block(-.31,-.02,.45,.16,.22,.2,245);
 glow(x,y,z+1.05,38,.16+Math.sin(t*.0015)*.035);ctx.globalAlpha=1;
}
function ruinModel(r,t){const x=r.x,y=r.y,z=elevation(x,y);voxel(x,y,z,.6,.6,.08,87);for(let i=0;i<4;i++){const dx=i%2?.23:-.23,dy=i<2?-.23:.23;voxel(x+dx,y+dy,z+.08,.13,.13,.3+(i%3)*.1,119);voxel(x+dx,y+dy,z+.38+(i%3)*.1,.17,.17,.05,175);}voxel(x,y,z+.2+Math.sin(t*.002)*.03,.11,.11,.14,244);glow(x,y,z+.25,27,.18);}
function actorPosition(u,t){let x=u.x,y=u.y,z=elevation(u.x,u.y);if(motion?.id===u.id){const a=Math.min(1,(t-motion.start)/motion.duration),e=1-Math.pow(1-a,3);x=motion.from.x+(u.x-motion.from.x)*e;y=motion.from.y+(u.y-motion.from.y)*e;z+=Math.sin(a*Math.PI)*.3;if(a>=1)motion=null;}if(cityMap.has(key(u.x,u.y))){x+=.36;y+=.36;}return{x,y,z};}
function unitModel(u,t,preview=false){const pos=actorPosition(u,t),{x,y}=pos,z=pos.z;const friendly=u.owner===game.player,chosen=selected?.type==='unit'&&selected.id===u.id,role=u.role,f=FACTIONS[u.owner].key;const ready=true;const scheme=f==='wayfarers'?{body:[209,161,99],accent:[242,135,58],light:[238,230,211],dark:[46,48,61]}:f==='foundry'?{body:[75,114,153],accent:[87,171,239],light:[210,224,235],dark:[36,47,61]}:{body:[85,122,66],accent:[214,69,122],light:[217,216,178],dark:[40,61,45]};const tone=scheme.body;
 ctx.save();if(!ready)ctx.globalAlpha=.86;
 const b=(dx,dy,dz,w,d,h,n=tone)=>voxel(x+dx,y+dy,z+dz,w,d,h,n);
 ctx.shadowColor='#000';ctx.shadowBlur=12*zoom;ring(x,y,z+.012,15,'#000',1);ctx.shadowBlur=0;
 if(chosen){ring(x,y,z+.015,21,'#eef7e4',.85);ring(x,y,z+.017,25,'#e5f3dd',.22);glow(x,y,z+.04,45,.09);}else if(friendly&&ready){ring(x,y,z+.02,15,'#eaf5df',.18);}else if(!friendly){ctx.setLineDash([3*zoom,4*zoom]);ring(x,y,z+.02,17,'#e8ece8',.75);ctx.setLineDash([]);}
 // Boots, jointed legs, layered torso, shoulders, face and head are actual voxel assemblies.
 const broad=role==='Bastion'?.38:role==='Runner'?.22:.28;
 b(-.09,.035,.015,.12,.21,.07,83);b(.09,.035,.015,.12,.21,.07,83);
 b(-.09,0,.085,.085,.1,.17,151);b(.09,0,.085,.085,.1,.17,151);
 b(-.09,.04,.17,.11,.14,.065,tone);b(.09,.04,.17,.11,.14,.065,tone);
 b(0,0,.25,broad,.22,.24,tone);b(0,0,.255,broad+.035,.255,.04,scheme.accent);
 b(0,-.005,.48,broad+.07,.25,.055,scheme.accent);b(0,.126,.37,.065,.016,.065,f==='foundry'?[255,182,57]:[70,224,240]);
 b(-broad*.64,0,.36,.11,.15,.16,scheme.accent);b(broad*.64,0,.36,.11,.15,.16,scheme.accent);
 b(-broad*.72,.015,.285,.08,.1,.08,102);b(broad*.72,.015,.285,.08,.1,.08,102);
 b(0,-.01,.55,.23,.22,.2,tone);b(0,.108,.6,.14,.025,.055,30);b(0,.127,.616,.13,.015,.018,[70,224,240]);
 b(0,-.12,.32,.19,.13,.22,83);b(-.065,-.19,.39,.03,.025,.1,216);b(.065,-.19,.39,.03,.025,.1,216);
 if(f==='wayfarers'){b(0,-.025,.75,.19,.21,.055,scheme.light);b(-.105,.005,.57,.055,.24,.16,scheme.light);b(.105,.005,.57,.055,.24,.16,scheme.light);b(0,-.025,.19,.36,.28,.09,scheme.accent);b(0,-.065,.3,.32,.24,.08,scheme.body);b(-.05,.14,.36,.06,.028,.15,scheme.accent);}
 if(f==='foundry'){b(-.09,-.025,.75,.035,.045,.12,155);b(.09,-.025,.75,.035,.045,.08,155);b(0,.13,.4,.085,.025,.055,[255,182,57]);b(-.22,0,.42,.1,.2,.13,scheme.accent);b(.22,0,.42,.1,.2,.13,scheme.accent);}
 if(f==='verdant'){b(-.12,-.01,.73,.05,.06,.16,130);b(-.19,-.01,.86,.18,.14,.07,[120,165,74]);b(.12,-.01,.73,.05,.06,.23,130);b(.19,-.01,.93,.17,.12,.07,[120,165,74]);b(0,-.16,.5,.28,.18,.08,scheme.accent);b(0,-.2,.58,.18,.13,.06,[120,165,74]);}
 if(role==='Surveyor'||role==='Pathfinder'){b(-.3,.04,.04,.035,.035,.8,166);b(-.3,.04,.83,.105,.105,.1,[70,224,240]);glow(x-.3,y+.04,z+.88,14,.15);}
 if(role==='Runner'){b(0,-.08,.78,.065,.08,.18,scheme.accent);b(0,-.14,.91,.05,.17,.055,scheme.light);b(0,-.22,.23,.14,.24,.035,146);}
 if(role==='Strider'){b(-.13,-.1,.17,.12,.14,.12,scheme.accent);b(.13,-.1,.17,.12,.14,.12,scheme.accent);b(0,-.2,.35,.22,.16,.25,139);b(0,-.28,.5,.15,.14,.08,[70,224,240]);}
 if(role==='Bastion'){b(.31,.07,.13,.12,.36,.49,scheme.accent);b(.31,.07,.62,.14,.4,.035,242);b(.385,.07,.32,.018,.08,.19,[70,224,240]);b(0,0,.49,.39,.28,.075,146);}
 if(role==='Pathfinder'){b(0,0,.75,.25,.24,.05,143);for(let i=0;i<3;i++)b(-.09+i*.09,0,.8,.045,.06,i===1?.14:.09,scheme.accent);b(0,-.09,.2,.38,.33,.08,scheme.accent);b(0,-.12,.28,.34,.32,.1,scheme.body);}
 ctx.restore();
 if(chosen){const p=project(x,y,z+1.02);const hp=u.hp/TYPES[role].hp;ctx.beginPath();ctx.arc(p.x,p.y,8*zoom,-Math.PI/2,-Math.PI/2+TAU*hp);ctx.strokeStyle='#f1f6ec';ctx.lineWidth=1.4*zoom;ctx.stroke();}
}
function reveal(x,y,r=5){for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++)if(inside(xx,yy)&&(xx-x)**2+(yy-y)**2<r*r){game.seen[key(xx,yy)]=true;game.visible.add(key(xx,yy));}}
function setWorld(adventure){story=adventure;game=new Game(story.seed,story.faction);game.cities=[game.cities[story.faction]];Object.assign(game.cities[0],{x:18,y:18,owner:story.faction});game.player=story.faction;game.units=[{id:999,owner:story.faction,role:'Surveyor',x:18,y:19,hp:6,acted:false}];game.ruins=[];game.seen.fill(false);game.visible=new Set();for(const p of Object.values(SITES))for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(inside(p.x+dx,p.y+dy))game.tiles[key(p.x+dx,p.y+dy)]='moss';for(const name of story.visited){const p=SITES[name];reveal(p.x,p.y,5);}const p=SITES[story.scene];cam={x:p.x,y:p.y};target={...cam,zoom:1.4};game.units[0].x=p.x;game.units[0].y=p.y+1;scene=story.scene;rebuild();}
function landmark(name,t){const site=SITES[name],x=site.x,y=site.y,z=elevation(x,y),theme=planet();const b=(dx,dy,dz,w,d,h,n)=>voxel(x+dx,y+dy,z+dz,w,d,h,n);
 if(name==='battle'){if(scene!=='battle')return;const color=[[211,120,56],[80,155,225],[139,170,68]][story.faction];const sway=Math.sin(t*.003)*.08;b(0,0,.2,.9,.8,1.4,color);b(0,0,1.6+sway,.75,.65,.5,color);b(0,.34,1.85+sway,.5,.08,.09,[255,66,66]);for(const sign of [-1,1]){b(sign*.65,0,.6,.3,.4,1.2,color);b(sign*.3,0,0,.25,.35,.4,70);}b(.9,.1,.4,.1,.1,2.2,[226,106,86]);ring(x,y,.15,70,'#ef6666',.6);if(reaction&&t-reaction.start<650){const hit=(t-reaction.start)/650;line3([x-1.3,y+1.5,.8],[x,y,1.2],reaction.good?'#f2fff0':'#ff5555',5*(1-hit));}return;}
 if(name==='landing'){shipModel(x,y,z,1,t);return;}
 if(name==='monument'||name==='vision'){
 b(0,0,0,2.7,2.7,.13,theme.plateau);b(0,0,.13,2.3,2.3,.16,102);for(const sign of[-1,1]){b(sign*.8,0,.29,.42,.65,2.2,135);b(sign*.8,0,2.49,.52,.75,.12,190);for(let j=0;j<4;j++)b(sign*.8,.34,.6+j*.42,.15,.03,.08,212);}b(-.17,0,2.61,1.8,.65,.24,163);b(.62,.12,2.85,.48,.45,.16,142);b(0,0,.3,.06,.06,2.1,226);for(let j=0;j<5;j++){const a=j/5*TAU,dx=Math.cos(a)*1.55,dy=Math.sin(a)*1.55;b(dx,dy,0,.22,.22,.12,90);b(dx,dy,.12,.18,.18,.2,165);b(dx-.045,dy+.095,.23,.035,.02,.035,23);b(dx+.045,dy+.095,.23,.035,.02,.035,23);}glow(x,y,z+1.3,120,.16);
 if(name==='vision'){const a=(Math.sin(t*.001)+1)/2;for(let i=0;i<9;i++){const dx=(i%3-1)*.4,dy=(Math.floor(i/3)-1)*.4;b(dx,dy,.4,.17,.17,.35+hash(i,story.seed,4)*.5,180+a*70);}for(let i=0;i<12;i++){const z1=.4+(t*.0005+i*.18)%2.3;voxel(x+Math.sin(i*3)*.9,y+Math.cos(i*3)*.9,z+z1,.025,.025,.08,[90,220,236]);}}
 return;}
 if(name==='survivor'){
 b(0,0,0,2.5,2,.1,82);b(0,-.7,.1,2,.24,1.2,theme.plateau);b(-.9,0,.1,.22,1.5,.9,theme.plateau);b(.9,-.2,.1,.22,1.1,.7,theme.plateau);b(-.3,-.35,1.3,1.3,1.1,.1,145);b(.55,.2,.1,.35,.35,.15,153);b(.55,.2,.25,.08,.08,.2,[255,179,86]);glow(x+.55,y+.2,z+.35,60,.25);
 unitModel({id:1000,owner:(story.faction+1)%3,role:'Surveyor',x:x+.2,y:y-.05,hp:6,acted:false},t);return;}
 if(name==='wreck'){
 shipModel(x,y,z,0,t,(story.faction+2)%3);for(let i=0;i<10;i++){const dx=Math.sin(i*2.4)*1.3,dy=Math.cos(i*2.1)*1.2;b(dx,dy,0,.12+hash(i,2,story.seed)*.25,.15,.1,110);}b(0,-.2,.3,.5,.5,.25,32);b(.15,-.2,.55,.06,.06,.025,[235,106,78]);return;}
 if(name==='tunnel'){
 b(0,0,0,3,3,.06,35);for(const sign of[-1,1]){b(sign*1.1,0,.06,.5,3,.4,theme.plateau);for(let i=0;i<3;i++)b(sign*1.1,-1+i,.46,.18,.2,.6+hash(i,sign,story.seed)*.4,115);}for(let i=0;i<5;i++)b(0,-.8+i*.4,.2,.7,.32,.06,97);b(.7,1.1,.4,.08,.08,.16,[255,182,85]);glow(x,y,z-.1,90,.08);return;}
 if(name==='observatory'){
 b(0,0,0,3,3,.12,theme.plateau);b(0,0,.12,1.8,1.8,.13,120);for(let i=0;i<4;i++){const angle=i*Math.PI/2,dx=Math.cos(angle)*1.1,dy=Math.sin(angle)*1.1;b(dx,dy,.12,.3,.3,1.6,109);}const spin=t*.00013;for(let i=0;i<24;i++){const a=i/24*TAU+spin;voxel(x+Math.cos(a)*1.55,y+Math.sin(a)*1.55,z+2.1+Math.sin(a)*.3,.2,.2,.16,i%3===0?[98,218,237]:174);}b(0,0,.25,.13,.13,1,225);glow(x,y,z+1.5,150,.15);return;}
 if(name==='core'||name==='ending'){
 b(0,0,0,3.6,3.6,.12,41);for(let j=0;j<3;j++)b(0,0,.12+j*.1,2.6-j*.5,2.6-j*.5,.1,70+j*25);
 const pulse=Math.sin(t*.002)*.1;for(let zz=-2;zz<=2;zz++)for(let xx=-2;xx<=2;xx++)for(let yy=-2;yy<=2;yy++)if(Math.abs(xx)+Math.abs(yy)+Math.abs(zz)<4)voxel(x+xx*.19,y+yy*.19,z+1.7+zz*.19+pulse,.17,.17,.17,xx===0||zz===0?[95,220,234]:[164,159,210]);
 for(let i=0;i<12;i++){const a=t*.00025+i/12*TAU;voxel(x+Math.cos(a)*1.4,y+Math.sin(a)*1.4,z+1.6+Math.sin(a*2)*.4,.12,.12,.12,169);}glow(x,y,z+1.65,170,.3);return;
 }
}
function play(sceneId,cb,instant=false){scene=sceneId;const p=SITES[sceneId],u=game.units[0],from={x:u.x,y:u.y},start=performance.now();done=cb;
 const duration=instant?0:reduced?300:sceneId==='landing'?3800:['vision','core'].includes(sceneId)?2400:1900;
 cut={scene:sceneId,start,duration,from,to:{x:p.x-1.3,y:p.y+1.5}};target={x:p.x-.4,y:p.y+.3,zoom:sceneId==='core'?1.7:sceneId==='monument'||sceneId==='vision'?1.75:1.6};
 if(sceneId==='landing'){cam={x:18,y:18};landing={start,duration};}
 for(let i=0;i<=30;i++){const a=i/30;reveal(from.x+(p.x-from.x)*a,from.y+(p.y-from.y)*a,4);}reveal(p.x,p.y,5);rebuild();
}
function render(t){ctx.fillStyle='#050607';ctx.fillRect(0,0,width,height);if(!game)return;const sky=ctx.createRadialGradient(width*.65,height*.4,0,width*.5,height*.5,width*.8);sky.addColorStop(0,planet().ambient);sky.addColorStop(1,'#050607');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 cam.x+=(target.x-cam.x)*.055;cam.y+=(target.y-cam.y)*.055;zoom+=(target.zoom-zoom)*.045;
 for(let i=0;i<50;i++){ctx.fillStyle='#d4e4de15';ctx.fillRect((hash(i,1,4)*width+Math.sin(t*.00005+i)*10)%width,hash(i,2,4)*height,1,1);}
 const u=game.units[0];if(cut){const a=cut.duration?Math.min(1,(t-cut.start)/cut.duration):1,e=a*a*(3-2*a);if(cut.scene!=='landing'){u.x=cut.from.x+(cut.to.x-cut.from.x)*e;u.y=cut.from.y+(cut.to.y-cut.from.y)*e;}if(a>=1){const callback=done;done=null;cut=null;landing=null;if(scene==='landing'){u.x=18;u.y=19;}if(callback)callback();}}
 const cells=knownCells.filter(c=>{const p=project(c.x,c.y);return p.x>-100&&p.x<width+100&&p.y>-150&&p.y<height+100;});for(const c of cells)surface(c.x,c.y,t);
 const sites=[...new Set(story.visited.map(s=>s==='vision'?'monument':s==='ending'?'core':s))];if(scene==='vision'){const i=sites.indexOf('monument');if(i>=0)sites[i]='vision';}sites.sort((a,b)=>SITES[a].x+SITES[a].y-SITES[b].x-SITES[b].y);
 for(const name of sites){if(landing&&name==='landing')continue;landmark(name,t);}
 if(landing){const a=Math.min(1,(t-landing.start)/landing.duration),drop=Math.min(1,a/.72);const altitude=Math.pow(1-drop,3)*7,z=elevation(18,18)+altitude;shipModel(18,18,z,Math.max(0,(a-.72)/.28),t);if(a<.74)for(const dx of[-.37,.37]){voxel(18+dx,18-.12,z-.22,.07,.12,.22,[85,220,240]);glow(18+dx,18-.12,z,44,.3);}if(a>.64){const dust=(a-.64)/.36;for(let i=0;i<14;i++){const angle=i/14*TAU;ctx.globalAlpha=(1-dust)*.6;voxel(18+Math.cos(angle)*(.3+dust*1.5),18+Math.sin(angle)*(.3+dust*1.5),.2+Math.sin(dust*Math.PI)*.15,.06,.06,.06,planet().sand);ctx.globalAlpha=1;}}}else unitModel(u,t);
 if(scene==='core'||scene==='vision'){const beam=project(SITES[scene].x,SITES[scene].y,3);const gradient=ctx.createLinearGradient(beam.x,0,beam.x,height*.7);gradient.addColorStop(0,'#9deef000');gradient.addColorStop(.8,'#9deef00b');gradient.addColorStop(1,'#9deef000');ctx.fillStyle=gradient;ctx.fillRect(beam.x-30*zoom,0,60*zoom,height*.7);}
}
new ResizeObserver(()=>{width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}).observe(canvas);
function frame(t){if(active&&t-frameTime>30){render(t);frameTime=t;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
return {setWorld,play,react(good){reaction={good,start:performance.now()};},skip(){if(cut)cut.start=performance.now()-cut.duration-1;},focus(){const p=SITES[scene];target={x:p.x-.4,y:p.y+.3,zoom:1.6};},pan(dx,dy){target.x-=dx/(58*zoom)+dy/(29*zoom);target.y+=dx/(58*zoom)-dy/(29*zoom);},zoom(delta){target.zoom=Math.max(.8,Math.min(2.8,target.zoom+delta));},setActive(a){active=a;}};
};
})(window);
