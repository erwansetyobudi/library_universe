import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';

const C=window.LIBRARY_UNIVERSE, app=document.getElementById('luApp'), host=document.getElementById('luViewport');
const statusEl=document.getElementById('luStatus'), tip=document.getElementById('luTooltip'), panel=document.getElementById('luPanel'), panelBody=document.getElementById('luPanelBody');
const range=document.getElementById('luRange'), playBtn=document.getElementById('luPlay'), restartBtn=document.getElementById('luRestart'), speedEl=document.getElementById('luSpeed');
const clockEl=document.getElementById('luClock'), countsEl=document.getElementById('luCounts'), startEl=document.getElementById('luStart'), endEl=document.getElementById('luEnd');

const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x010207,.00115);
const camera=new THREE.PerspectiveCamera(50,1,.1,6000); camera.position.set(0,190,560);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.55)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.9; host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true;controls.dampingFactor=.055;controls.minDistance=30;controls.maxDistance=1800;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.65,.34,.78);composer.addPass(bloom);
const world=new THREE.Group();scene.add(world);const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(99,99);
const nodeGeo=new THREE.IcosahedronGeometry(1,2), clickable=[], nodeMap=new Map(), labels=[], trails=[];
let data={nodes:[],loans:[]}, minMs=0,maxMs=1,currentMs=0,playing=false,lastT=0,nextNode=0,nextLoan=0,visibleLoans=0;

function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h)}addEventListener('resize',resize);resize();
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rand(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>new Intl.NumberFormat('id-ID').format(n||0);
function parseDate(s){const t=Date.parse(String(s).replace(' ','T'));return Number.isFinite(t)?t:0}
function dateLabel(ms){return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(ms))}
async function api(params){const u=new URL(C.api,location.href);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{headers:{Accept:'application/json'}}),txt=await r.text();let j;try{j=JSON.parse(txt)}catch{throw new Error('API bukan JSON: '+txt.slice(0,160))}if(!r.ok||!j.ok)throw new Error(j.error||'HTTP '+r.status);return j}

function starfield(){const g=new THREE.BufferGeometry(),a=new Float32Array(8500*3),r=rand(8721);for(let i=0;i<8500;i++){const R=500+r()*2600,t=r()*Math.PI*2,p=Math.acos(2*r()-1);a[i*3]=R*Math.sin(p)*Math.cos(t);a[i*3+1]=R*Math.cos(p);a[i*3+2]=R*Math.sin(p)*Math.sin(t)}g.setAttribute('position',new THREE.BufferAttribute(a,3));const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xc8d4ff,size:.75,transparent:true,opacity:.55,depthWrite:false}));scene.add(p);return p}const stars=starfield();

function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(210,248,255,.8)');g.addColorStop(.42,'rgba(90,155,255,.16)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}const glow=glowTexture();

function spiralPos(id,index){const r=rand(hash(id)),arm=index%4,rank=Math.floor(index/4),radius=25+Math.sqrt(rank+1)*13.5;const angle=rank*.25+arm*Math.PI/2+r()*.4;return new THREE.Vector3(Math.cos(angle)*radius,(r()-.5)*70,Math.sin(angle)*radius)}
function addLabel(obj,text){if(labels.length>220)return;const d=document.createElement('div');d.className='lu-burst-label';d.textContent=text.length>35?text.slice(0,34)+'…':text;host.appendChild(d);labels.push({el:d,obj,born:performance.now()})}
function birth(n,index,instant=false){
 if(nodeMap.has(n.id))return;
 const pos=spiralPos(n.id,index), size=.55+Math.min(2.6,Math.log10(2+n.items)*.65);
 const mat=new THREE.MeshBasicMaterial({color:0xdff8ff,transparent:true,opacity:instant?.9:0});
 const m=new THREE.Mesh(nodeGeo,mat);m.position.copy(pos);m.scale.setScalar(instant?size:.01);m.userData={...n,type:'biblio',base:size,born:performance.now(),instant};world.add(m);clickable.push(m);nodeMap.set(n.id,m);
 const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0x91dfff,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}));halo.scale.set(size*7,size*7,1);m.add(halo);
 if(n.items>0){const ring=Math.min(9,2.5+Math.log2(n.items+1)*1.5),pts=[];for(let k=0;k<=48;k++){const a=k/48*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*ring,0,Math.sin(a)*ring))}const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x655bd6,transparent:true,opacity:.13}));m.add(l)}
 if(!instant && labels.length<220)addLabel(m,n.title);
}
function loanTrail(l){
 const target=nodeMap.get(l.biblio_id);if(!target)return;
 const end=target.position.clone(),r=rand(hash(l.member_id)),ang=r()*Math.PI*2,rad=170+r()*240;
 const start=new THREE.Vector3(Math.cos(ang)*rad,(r()-.5)*180,Math.sin(ang)*rad);
 const mid=start.clone().lerp(end,.5);mid.y+=50+(r()*80);
 const curve=new THREE.QuadraticBezierCurve3(start,mid,end),pts=curve.getPoints(28);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffbd69,transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false}));world.add(line);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.65,8,6),new THREE.MeshBasicMaterial({color:0xffe1a3,transparent:true,opacity:1,blending:THREE.AdditiveBlending}));world.add(dot);
 trails.push({line,dot,curve,start:performance.now(),dur:900+Math.random()*800,meta:l});if(trails.length>120){const z=trails.shift();world.remove(z.line,z.dot);z.line.geometry.dispose();z.line.material.dispose();z.dot.geometry.dispose();z.dot.material.dispose()}
 visibleLoans++;
}
function resetTo(ms){
 [...world.children].forEach(o=>{world.remove(o)});clickable.length=0;nodeMap.clear();labels.splice(0).forEach(x=>x.el.remove());trails.length=0;nextNode=0;nextLoan=0;visibleLoans=0;currentMs=ms;
 while(nextNode<data.nodes.length && data.nodes[nextNode]._t<=ms){birth(data.nodes[nextNode],nextNode,true);nextNode++}
 while(nextLoan<data.loans.length && data.loans[nextLoan]._t<=ms){visibleLoans++;nextLoan++}
 updateUI();
}
function updateTimeline(){
 while(nextNode<data.nodes.length && data.nodes[nextNode]._t<=currentMs){birth(data.nodes[nextNode],nextNode,false);nextNode++}
 let emitted=0;while(nextLoan<data.loans.length && data.loans[nextLoan]._t<=currentMs){if(emitted<14)loanTrail(data.loans[nextLoan]);else visibleLoans++;nextLoan++;emitted++}
}
function updateUI(){range.value=Math.round((currentMs-minMs)/(maxMs-minMs)*1000)||0;clockEl.textContent=dateLabel(currentMs);countsEl.textContent=`${fmt(nextNode)} koleksi • ${fmt(visibleLoans)} peminjaman`}
function updateLabels(){const rect=host.getBoundingClientRect(),v=new THREE.Vector3(),now=performance.now(),dist=camera.position.distanceTo(controls.target);for(let i=labels.length-1;i>=0;i--){const L=labels[i],age=now-L.born;if(age>3600||dist>700){L.el.remove();labels.splice(i,1);continue}L.obj.getWorldPosition(v);v.project(camera);L.el.style.left=((v.x*.5+.5)*rect.width)+'px';L.el.style.top=((-v.y*.5+.5)*rect.height)+'px';L.el.style.opacity=String(Math.max(0,1-age/3600))}}
function animate(t){
 requestAnimationFrame(animate);const dt=Math.min(50,t-lastT||16);lastT=t;
 if(playing){const span=maxMs-minMs;currentMs+=dt/1000*(span/(75/Number(speedEl.value)));if(currentMs>=maxMs){currentMs=maxMs;playing=false;playBtn.textContent='▶'}updateTimeline();updateUI()}
 nodeMap.forEach(m=>{if(!m.userData.instant){const a=Math.min(1,(t-m.userData.born)/750),k=1-Math.pow(1-a,3);m.scale.setScalar(m.userData.base*k);m.material.opacity=.9*k}});
 for(let i=trails.length-1;i>=0;i--){const tr=trails[i],u=(t-tr.start)/tr.dur;if(u>=1){world.remove(tr.dot);tr.dot.geometry.dispose();tr.dot.material.dispose();tr.line.material.opacity*=.96;if(tr.line.material.opacity<.01){world.remove(tr.line);tr.line.geometry.dispose();tr.line.material.dispose();trails.splice(i,1)}}else{tr.dot.position.copy(tr.curve.getPoint(Math.max(0,u)));tr.dot.material.opacity=Math.sin(Math.PI*u)}}
 stars.rotation.y+=.000018;world.rotation.y+=.000035;controls.update();updateLabels();composer.render()
}requestAnimationFrame(animate);

function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(clickable,false)[0]}
renderer.domElement.addEventListener('pointermove',e=>{const h=hit(e);renderer.domElement.style.cursor=h?'pointer':'grab';if(!h){tip.style.display='none';return}const d=h.object.userData;tip.style.display='block';tip.style.left=(e.clientX-app.getBoundingClientRect().left+12)+'px';tip.style.top=(e.clientY-app.getBoundingClientRect().top+12)+'px';tip.innerHTML=`<b>${esc(d.title)}</b><br><small>${esc(d.date)} • ${fmt(d.items)} eksemplar</small>`});
renderer.domElement.addEventListener('click',async e=>{const h=hit(e);if(!h)return;const d=h.object.userData;panel.classList.add('open');panelBody.innerHTML='<div class="eyebrow">BIBLIOGRAPHY STAR</div><h2>'+esc(d.title)+'</h2><p>Memuat detail…</p>';try{const x=await api({action:'detail',id:d.id}),z=x.data;panelBody.innerHTML=`<div class="eyebrow">BIBLIOGRAPHY STAR</div><h2>${esc(z.title)}</h2><div class="stat"><span>Input</span><b>${esc(z.input_date)}</b></div><div class="stat"><span>Eksemplar</span><b>${fmt(z.item_count)}</b></div><div class="stat"><span>Peminjaman</span><b>${fmt(z.loan_count)}</b></div><div class="stat"><span>Tahun terbit</span><b>${esc(z.publish_year||'-')}</b></div><p>${z.items.slice(0,8).map(x=>'<code>'+esc(x)+'</code>').join(' · ')}</p><p><a href="${C.detail}${z.id}">Buka detail bibliografi →</a></p>`}catch(err){panelBody.innerHTML='<h2>Gagal memuat</h2><p>'+esc(err.message)+'</p>'}});
document.getElementById('luClose').addEventListener('click',()=>panel.classList.remove('open'));
playBtn.addEventListener('click',()=>{playing=!playing;playBtn.textContent=playing?'❚❚':'▶'});
restartBtn.addEventListener('click',()=>{playing=false;playBtn.textContent='▶';resetTo(minMs)});
range.addEventListener('input',()=>{playing=false;playBtn.textContent='▶';resetTo(minMs+(maxMs-minMs)*(Number(range.value)/1000))});

(async()=>{
 try{
  statusEl.textContent='Membaca rentang data…';const b=await api({action:'bootstrap'});startEl.textContent=b.min_date;endEl.textContent=b.max_date;
  statusEl.textContent='Memuat peristiwa koleksi & peminjaman…';const e=await api({action:'events',start:b.min_date,end:b.max_date,limit:5000});
  data.nodes=e.nodes.map(x=>({...x,_t:parseDate(x.date)})).sort((a,b)=>a._t-b._t);data.loans=e.loans.map(x=>({...x,_t:parseDate(x.date)})).sort((a,b)=>a._t-b._t);
  minMs=parseDate(b.min_date+' 00:00:00');maxMs=parseDate(b.max_date+' 23:59:59');currentMs=minMs;resetTo(minMs);
  statusEl.textContent=`${fmt(b.counts.biblio)} bibliografi • ${fmt(b.counts.items)} eksemplar • ${fmt(b.counts.loans)} transaksi${e.truncated?' • mode performa':''}`;
  camera.position.set(0,210,610);controls.target.set(0,0,0);controls.update();
 }catch(err){console.error(err);statusEl.textContent='Error: '+err.message;panel.classList.add('open');panelBody.innerHTML='<div class="eyebrow">ERROR</div><h2>Universe gagal dimuat</h2><p>'+esc(err.message)+'</p>'}
})();
