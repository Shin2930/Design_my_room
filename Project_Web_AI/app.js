import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

(() => {
const canvas=document.getElementById('plan'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const palettes={
 modern:{floor:'#8b5e3c',wall:'#000000',furniture:'#82958a'},
 minimal:{floor:'#eeeeea',wall:'#ffffff',furniture:'#c9c9c2'},
 scandi:{floor:'#e8d6bb',wall:'#fbf8f0',furniture:'#b5a18a'},
 warm:{floor:'#cda984',wall:'#f5e8d6',furniture:'#9b6c4e'}
};
const specs={
 bed:{name:'เตียงนอน',w:1.8,h:2,color:'#d9c8b8',kind:'bed'},
 sofa:{name:'โซฟา',w:2,h:.9,color:'#82958a',kind:'sofa'},
 desk:{name:'โต๊ะทำงาน',w:1.2,h:.6,color:'#bd9870',kind:'desk'},
 dining:{name:'โต๊ะอาหาร',w:1.4,h:.8,color:'#bd9870',kind:'dining'},
 wardrobe:{name:'ตู้เสื้อผ้า',w:1.2,h:.6,color:'#a87953',kind:'wardrobe'},
 tv:{name:'ชั้นวางทีวี',w:1.5,h:.4,color:'#8c8277',kind:'tv'},
 plant:{name:'ต้นไม้',w:.5,h:.5,color:'#548260',kind:'plant'},
 rug:{name:'พรม',w:1.6,h:1.2,color:'#c7b7a1',kind:'rug'},
 chair:{name:'เก้าอี้',w:.6,h:.6,color:'#a87953',kind:'chair'},
 lamp:{name:'โคมไฟ',w:.4,h:.4,color:'#d9bd6b',kind:'lamp'},
 window:{name:'หน้าต่าง',w:1.2,h:.12,color:'#8ab8c9',kind:'window'},
 door:{name:'ประตู',w:.9,h:.12,color:'#8b6246',kind:'door'}
};
let room={w:6,h:5,floor:'#8b5e3c',wall:'#000000',style:'modern',grid:true};
let items=[],selected=null,dragging=null,history=[];
let view={scale:1,ox:0,oy:0,unit:90};
let scene3d=null,camera3d=null,renderer3d=null,controls3d=null,raycaster3d=null,mouse3d=null,objectMeshes=[];
function init3D(){const c=$('plan3d');scene3d=new THREE.Scene();scene3d.background=new THREE.Color('#eef1ed');camera3d=new THREE.PerspectiveCamera(45,1,.1,1000);camera3d.position.set(room.w*1.35,room.h*1.15,room.w*1.5);renderer3d=new THREE.WebGLRenderer({canvas:c,antialias:true});renderer3d.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer3d.shadowMap.enabled=true;renderer3d.outputColorSpace=THREE.SRGBColorSpace;controls3d=new OrbitControls(camera3d,c);controls3d.enableDamping=true;controls3d.target.set(room.w/2,0,room.h/2);raycaster3d=new THREE.Raycaster();mouse3d=new THREE.Vector2();scene3d.add(new THREE.HemisphereLight(0xffffff,0x9a907e,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-room.w,room.h*2,room.h);scene3d.add(light);resize3D();animate3D()}
function resize3D(){if(!renderer3d)return;const wrap=$('view3dWrap'),w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);renderer3d.setSize(w,h,false);camera3d.aspect=w/h;camera3d.updateProjectionMatrix()}
let dragging3d=null;
function pointerToFloor(e){const r=$('plan3d').getBoundingClientRect();mouse3d.x=((e.clientX-r.left)/r.width)*2-1;mouse3d.y=-((e.clientY-r.top)/r.height)*2+1;raycaster3d.setFromCamera(mouse3d,camera3d);const point=new THREE.Vector3();return raycaster3d.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point)?point:null}
function animate3D(){if(!renderer3d)return;requestAnimationFrame(animate3D);controls3d.update();renderer3d.render(scene3d,camera3d)}
function render3D(){if(!scene3d)return;while(scene3d.children.length>2){const o=scene3d.children[2];scene3d.remove(o);o.traverse?.(n=>{if(n.geometry)n.geometry.dispose();if(n.material){if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material.dispose()}});if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}}objectMeshes=[];const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color:color||'#b5a18a',roughness});function box(parent,w,h,d,color,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.04,w),Math.max(.04,h),Math.max(.04,d)),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}function flatBox(parent,w,h,d,color,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.04,w),Math.max(.04,h),Math.max(.04,d)),new THREE.MeshBasicMaterial({color:color||'#b5a18a'}));mesh.position.set(x,y,z);parent.add(mesh);return mesh}flatBox(scene3d,room.w,.12,room.h,room.floor,room.w/2,-.06,room.h/2);const wallH=2.6,th=.12;flatBox(scene3d,room.w,wallH,th,room.wall,room.w/2,wallH/2,0);flatBox(scene3d,th,wallH,room.h,room.wall,0,wallH/2,room.h/2);flatBox(scene3d,th,wallH,room.h,room.wall,room.w,wallH/2,room.h/2);items.forEach(it=>{const group=new THREE.Group();group.position.set(it.x+it.w/2,0,it.y+it.h/2);group.rotation.y=-(it.rot||0);group.userData.itemId=it.id;const w=it.w,d=it.h,color=it.color;let height=.75;if(it.kind==='bed'){height=.45;box(group,w,height,d,color,0,height/2,0);box(group,w*.92,.16,d*.22,'#f7f2e9',0,height+.08,-d*.34)}else if(it.kind==='sofa'){height=.65;box(group,w,.28,d,color,0,.25,0);box(group,w,.55,.18,color,0,.62,-d*.4);box(group,.16,.45,d,color,-w*.43,.48,0);box(group,.16,.45,d,color,w*.43,.48,0)}else if(it.kind==='plant'){height=.55;box(group,w*.75,.35,d*.75,'#b87852',0,.18,0);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),mat('#548260'));leaf.position.set(0,.58,0);group.add(leaf)}else if(it.kind==='chair'||it.kind==='lamp'){height=it.kind==='chair'?.5:.8;box(group,w,.12,d,color,0,.4,0);if(it.kind==='chair')box(group,.12,.35,.12,color,0,.2,0)}else if(it.kind==='window'||it.kind==='door'){height=it.kind==='door'?2.05:1.1;box(group,w,height,.06,color,0,height/2,0)}else{height=it.kind==='wardrobe'?2:it.kind==='tv'?.65:.75;box(group,w,height,d,color,0,height/2,0);if(it.kind==='tv')box(group,w*.75,.42,.04,'#252a28',0,height*.7,-d/2-.025)}scene3d.add(group);objectMeshes.push({mesh:group,it})});controls3d.target.set(room.w/2,0,room.h/2);controls3d.update()}
function snapshot(){history.push(JSON.stringify({room,items,selectedId:selected?.id||null}));if(history.length>40)history.shift();}
function corners(it){const a=it.rot||0,c=Math.cos(a),s=Math.sin(a),hw=it.w/2,hh=it.h/2,cx=it.x+hw,cy=it.y+hh;return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>[cx+x*c-y*s,cy+x*s+y*c])}
function overlaps(a,b){if(a.kind==='rug'||b.kind==='rug')return false;const A=corners(a),B=corners(b);for(const poly of [A,B])for(let i=0;i<4;i++){const p=poly[i],q=poly[(i+1)%4],axis=[-(q[1]-p[1]),q[0]-p[0]];const pa=A.map(v=>v[0]*axis[0]+v[1]*axis[1]),pb=B.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.max(...pa)<=Math.min(...pb)+.0001||Math.max(...pb)<=Math.min(...pa)+.0001)return false}return true}
function canPlace(candidate,ignoreId=candidate.id){if(candidate.x<0||candidate.y<0||candidate.x+candidate.w>room.w+.0001||candidate.y+candidate.h>room.h+.0001)return false;return !items.some(other=>other.id!==ignoreId&&overlaps(candidate,other))}
function findFreePosition(it){for(let y=0;y<=room.h-it.h+.001;y+=.25)for(let x=0;x<=room.w-it.w+.001;x+=.25){const candidate={...it,x,y};if(canPlace(candidate,null))return {x,y}}return null}
function id(){return Math.random().toString(36).slice(2,10);}
function status(msg){$('status').textContent=msg;setTimeout(()=>{if($('status').textContent===msg)$('status').textContent=''},2400);}
function resizeCanvas(){
 const wrap=canvas.parentElement.getBoundingClientRect(),ratio=Math.min((wrap.width-36)/(room.w*100+50),(wrap.height-36)/(room.h*100+50));
 const cssW=Math.max(260,Math.min(wrap.width-20,(room.w*100+50)*ratio)),cssH=Math.max(260,Math.min(wrap.height-20,(room.h*100+50)*ratio));
 const dpr=window.devicePixelRatio||1;canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 view.unit=Math.min((cssW-70)/room.w,(cssH-70)/room.h);view.ox=(cssW-room.w*view.unit)/2;view.oy=(cssH-room.h*view.unit)/2;draw();
}
function roundRect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function drawFurniture(it){
 const u=view.unit,cx=view.ox+(it.x+it.w/2)*u,cy=view.oy+(it.y+it.h/2)*u,w=it.w*u,h=it.h*u;
 ctx.save();ctx.translate(cx,cy);ctx.rotate(it.rot||0);
 ctx.fillStyle='rgba(31,39,32,.13)';roundRect(ctx,-w/2+2,-h/2+3,w,h,Math.min(9,u*.08),ctx.fillStyle);
 const color=it.color;
 if(it.kind==='rug'){roundRect(ctx,-w/2,-h/2,w,h,5,color,'rgba(88,74,58,.55)');ctx.strokeStyle='#ffffff99';ctx.lineWidth=1.5;ctx.strokeRect(-w/2+5,-h/2+5,w-10,h-10)}
 else if(it.kind==='bed'){
  roundRect(ctx,-w/2,-h/2,w,h,5,'#a88b6b','#80674f');roundRect(ctx,-w/2+4,-h/2+4,w-8,h*.24,4,'#f7f2e9','#d2c7b9');
  roundRect(ctx,-w/2+4,-h/2+h*.29,w-8,h*.66,3,color,'#c7b6a4');ctx.strokeStyle='#ffffffaa';ctx.beginPath();ctx.moveTo(0,-h/2+h*.3);ctx.lineTo(0,h/2-5);ctx.stroke();
 }else if(it.kind==='sofa'){
  roundRect(ctx,-w/2,-h/2,w,h,7,color,'#58685f');roundRect(ctx,-w/2+4,-h/2+4,w-8,h*.27,4,'#657b70','#52675d');
  roundRect(ctx,-w/2+4,-h/2+h*.34,w/2-6,h*.58,5,color,'#ffffff66');roundRect(ctx,2,-h/2+h*.34,w/2-6,h*.58,5,color,'#ffffff66');
  roundRect(ctx,-w/2-2,-h/2+3,Math.max(5,w*.09),h-6,3,'#607368');roundRect(ctx,w/2-Math.max(5,w*.09),-h/2+3,Math.max(5,w*.09),h-6,3,'#607368');
 }else if(it.kind==='plant'){
  roundRect(ctx,-w/2,-h/2,w,h,4,'#c58d68','#9e6d50');ctx.beginPath();ctx.arc(0,-h*.08,Math.min(w,h)*.34,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.beginPath();ctx.arc(-w*.13,-h*.12,Math.min(w,h)*.19,0,Math.PI*2);ctx.fillStyle='#76a17a';ctx.fill();
 }else if(it.kind==='chair'||it.kind==='lamp'){
  ctx.beginPath();ctx.arc(0,0,Math.min(w,h)*.43,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#ffffff99';ctx.stroke();if(it.kind==='lamp'){ctx.beginPath();ctx.arc(0,0,Math.min(w,h)*.2,0,Math.PI*2);ctx.fillStyle='#fff4c2';ctx.fill()}
 }else if(it.kind==='window'){
  ctx.fillStyle='#d6edf5';ctx.fillRect(-w/2,-Math.max(3,h/2),w,Math.max(6,h));ctx.strokeStyle='#6e9eae';ctx.lineWidth=2;ctx.strokeRect(-w/2,-Math.max(3,h/2),w,Math.max(6,h));ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(0,h/2);ctx.stroke();
 }else if(it.kind==='door'){
  ctx.fillStyle='#d9c3a5';ctx.fillRect(-w/2,-Math.max(3,h/2),w,Math.max(6,h));ctx.strokeStyle='#8b6246';ctx.lineWidth=2;ctx.strokeRect(-w/2,-Math.max(3,h/2),w,Math.max(6,h));ctx.beginPath();ctx.arc(-w/2,0,w,0,Math.PI/2);ctx.stroke();
 }else{
  roundRect(ctx,-w/2,-h/2,w,h,4,color,'#00000038');
  if(it.kind==='desk'||it.kind==='dining'){ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.36,-h*.25);ctx.lineTo(w*.36,-h*.25);ctx.stroke()}
  if(it.kind==='tv'){ctx.fillStyle='#222';roundRect(ctx,-w*.38,-h*.28,w*.76,h*.4,2,'#252a28');ctx.fillStyle='#9fb5a5';ctx.fillRect(-w*.34,-h*.24,w*.68,h*.32)}
  if(it.kind==='wardrobe'){ctx.strokeStyle='#ffffff88';ctx.beginPath();ctx.moveTo(0,-h/2+4);ctx.lineTo(0,h/2-4);ctx.stroke();ctx.fillStyle='#f4e7d5';ctx.beginPath();ctx.arc(-3,0,1.5,0,Math.PI*2);ctx.arc(3,0,1.5,0,Math.PI*2);ctx.fill()}
 }
 if(selected&&selected.id===it.id){ctx.setLineDash([5,3]);ctx.lineWidth=2;ctx.strokeStyle='#176b50';ctx.strokeRect(-w/2-4,-h/2-4,w+8,h+8);ctx.setLineDash([]);ctx.fillStyle='#176b50';ctx.beginPath();ctx.arc(w/2+4,-h/2-4,4,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
function draw(){
 const cw=parseFloat(canvas.style.width)||canvas.width,ch=parseFloat(canvas.style.height)||canvas.height;ctx.clearRect(0,0,cw,ch);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,ch);
 const u=view.unit,x=view.ox,y=view.oy,w=room.w*u,h=room.h*u;
 ctx.fillStyle=room.floor;ctx.fillRect(x,y,w,h);
 if(room.grid){ctx.save();ctx.strokeStyle='#77777718';ctx.lineWidth=1;for(let i=0;i<=room.w*2;i++){ctx.beginPath();ctx.moveTo(x+i*u/2,y);ctx.lineTo(x+i*u/2,y+h);ctx.stroke()}for(let i=0;i<=room.h*2;i++){ctx.beginPath();ctx.moveTo(x,y+i*u/2);ctx.lineTo(x+w,y+i*u/2);ctx.stroke()}ctx.restore()}
 // wall strips with open doorway on lower wall
 ctx.fillStyle=room.wall;ctx.fillRect(x-7,y-7,w+14,8);ctx.fillRect(x-7,y-7,8,h+14);ctx.fillRect(x+w-1,y-7,8,h+14);
 ctx.fillStyle='#d1cfc7';ctx.fillRect(x-7,y+h,w*.37+7,8);ctx.fillRect(x+w*.63,y+h,w*.37+7,8);
 ctx.strokeStyle='#b7b8b0';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);
 items.filter(i=>i.kind==='rug').forEach(drawFurniture);items.filter(i=>i.kind!=='rug').forEach(drawFurniture);
 if(room.grid){ctx.fillStyle='#68716a';ctx.font='11px Kanit';ctx.textAlign='center';ctx.fillText(room.w+' ม.',x+w/2,y-19);ctx.save();ctx.translate(x-22,y+h/2);ctx.rotate(-Math.PI/2);ctx.fillText(room.h+' ม.',0,0);ctx.restore()}
 $('roomMeta').textContent=room.w+' × '+room.h+' เมตร';$('areaValue').textContent=(room.w*room.h).toFixed(1)+' ตร.ม.';$('itemCount').textContent=items.length+' ชิ้น';
 render3D();
}
function addItem(type){const s=specs[type];if(!s)return;const it={...s,color:s.color,id:id(),x:0,y:0,rot:0};const pos=findFreePosition(it);if(!pos){status('พื้นที่ไม่พอหรือไม่มีตำแหน่งว่างสำหรับ'+it.name);return}snapshot();it.x=pos.x;it.y=pos.y;items.push(it);selected=it;draw();updateEditor();status('เพิ่ม'+it.name+'แล้ว')}
function updateEditor(){
 const has=!!selected;$('nothingSelected').hidden=has;$('objectEditor').hidden=!has;if(!has)return;
 $('objectName').value=selected.name;$('objectW').value=selected.w;$('objectH').value=selected.h;$('objectColor').value=selected.color;$('objectX').value=selected.x.toFixed(1);$('objectY').value=selected.y.toFixed(1);
}
function getPointer(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function localPointer(p,it){const u=view.unit,cx=view.ox+(it.x+it.w/2)*u,cy=view.oy+(it.y+it.h/2)*u,dx=p.x-cx,dy=p.y-cy,rot=-(it.rot||0);return{x:dx*Math.cos(rot)-dy*Math.sin(rot),y:dx*Math.sin(rot)+dy*Math.cos(rot)}}
function hitResizeHandle(p,it){if(!selected||selected.id!==it.id)return false;const q=localPointer(p,it),u=view.unit;return Math.hypot(q.x-(it.w*u/2+4),q.y-(-it.h*u/2-4))<=11}
function hitTest(p,it){const q=localPointer(p,it);return Math.abs(q.x)<=it.w*view.unit/2+5&&Math.abs(q.y)<=it.h*view.unit/2+5}
canvas.addEventListener('pointerdown',e=>{const p=getPointer(e);if(selected&&hitResizeHandle(p,selected)){dragging={mode:'resize',id:selected.id,startX:p.x,startY:p.y,centerX:view.ox+(selected.x+selected.w/2)*view.unit,centerY:view.oy+(selected.y+selected.h/2)*view.unit,origX:selected.x,origY:selected.y,origW:selected.w,origH:selected.h,rot:selected.rot||0,moved:false};canvas.setPointerCapture(e.pointerId);return}const found=[...items].reverse().find(it=>hitTest(p,it));if(found){selected=found;dragging={mode:'move',id:found.id,startX:p.x,startY:p.y,origX:found.x,origY:found.y,moved:false};canvas.setPointerCapture(e.pointerId);updateEditor();draw()}else{selected=null;updateEditor();draw()}});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const p=getPointer(e),it=items.find(i=>i.id===dragging.id);if(!it)return;if(!dragging.moved&&Math.abs(p.x-dragging.startX)+Math.abs(p.y-dragging.startY)>2){snapshot();dragging.moved=true;}if(dragging.mode==='resize'){const dx=p.x-dragging.centerX,dy=p.y-dragging.centerY,rot=-dragging.rot,lx=dx*Math.cos(rot)-dy*Math.sin(rot),ly=dx*Math.sin(rot)+dy*Math.cos(rot),w=Math.max(.2,Math.min(5,Math.abs(lx)*2/view.unit)),h=Math.max(.2,Math.min(5,Math.abs(ly)*2/view.unit)),candidate={...it,w,h,x:dragging.origX+(dragging.origW-w)/2,y:dragging.origY+(dragging.origH-h)/2};if(canPlace(candidate,it.id)){Object.assign(it,{x:candidate.x,y:candidate.y,w:candidate.w,h:candidate.h});$('objectW').value=it.w.toFixed(1);$('objectH').value=it.h.toFixed(1);$('objectX').value=it.x.toFixed(1);$('objectY').value=it.y.toFixed(1)}draw();return}const candidate={...it,x:Math.max(0,Math.min(room.w-it.w,dragging.origX+(p.x-dragging.startX)/view.unit)),y:Math.max(0,Math.min(room.h-it.h,dragging.origY+(p.y-dragging.startY)/view.unit))};if(canPlace(candidate,it.id)){it.x=candidate.x;it.y=candidate.y}$('objectX').value=it.x.toFixed(1);$('objectY').value=it.y.toFixed(1);draw()});
canvas.addEventListener('pointerup',()=>{if(dragging?.moved)status('อัปเดตตำแหน่งแล้ว');dragging=null});
document.querySelectorAll('.furn').forEach(b=>b.addEventListener('click',()=>addItem(b.dataset.type)));
document.querySelectorAll('.style-btn').forEach(b=>b.addEventListener('click',()=>{snapshot();document.querySelectorAll('.style-btn').forEach(x=>x.classList.toggle('active',x===b));room.style=b.dataset.style;const p=palettes[b.dataset.style];room.floor=p.floor;room.wall=p.wall;$('floorColor').value=p.floor;$('wallColor').value=p.wall;$('roomTitle').textContent='ห้องของฉัน';draw();status('เปลี่ยนสไตล์ห้องแล้ว')}));
function changeRoom(){snapshot();room.w=Math.max(3,Math.min(12,Number($('roomW').value)||6));room.h=Math.max(3,Math.min(12,Number($('roomH').value)||5));$('roomW').value=room.w;$('roomH').value=room.h;items.forEach(i=>{i.x=Math.max(0,Math.min(room.w-i.w,i.x));i.y=Math.max(0,Math.min(room.h-i.h,i.y))});resizeCanvas();updateEditor()}
$('roomW').addEventListener('change',changeRoom);$('roomH').addEventListener('change',changeRoom);
$('floorColor').addEventListener('input',()=>{room.floor=$('floorColor').value;draw()});$('wallColor').addEventListener('input',()=>{room.wall=$('wallColor').value;draw()});$('showGrid').addEventListener('change',()=>{room.grid=$('showGrid').checked;draw()});
$('objectName').addEventListener('change',()=>{if(selected){selected.name=$('objectName').value;draw()}});
$('objectColor').addEventListener('input',()=>{if(selected){selected.color=$('objectColor').value;draw()}});
function updateDimension(which){if(!selected)return;const v=Math.max(.2,Math.min(5,Number($(which==='w'?'objectW':'objectH').value)||.5));const candidate={...selected,[which]:v};candidate.x=Math.min(candidate.x,Math.max(0,room.w-candidate.w));candidate.y=Math.min(candidate.y,Math.max(0,room.h-candidate.h));if(!canPlace(candidate,selected.id)){status('ปรับขนาดไม่ได้ เพราะเฟอร์นิเจอร์จะชนกัน');updateEditor();return}snapshot();Object.assign(selected,candidate);draw();updateEditor()}
$('objectW').addEventListener('change',()=>updateDimension('w'));$('objectH').addEventListener('change',()=>updateDimension('h'));
function updatePosition(){if(!selected)return;const candidate={...selected,x:Math.max(0,Math.min(room.w-selected.w,Number($('objectX').value)||0)),y:Math.max(0,Math.min(room.h-selected.h,Number($('objectY').value)||0))};if(!canPlace(candidate,selected.id)){status('ตำแหน่งนี้มีเฟอร์นิเจอร์อยู่แล้ว');updateEditor();return}snapshot();selected.x=candidate.x;selected.y=candidate.y;draw();updateEditor()}
$('objectX').addEventListener('change',updatePosition);$('objectY').addEventListener('change',updatePosition);
$('rotateLeft').addEventListener('click',()=>rotate(-Math.PI/12));$('rotateRight').addEventListener('click',()=>rotate(Math.PI/12));
function rotate(a){if(!selected)return;const candidate={...selected,rot:(selected.rot||0)+a};if(!canPlace(candidate,selected.id)){status('หมุนไม่ได้ เพราะเฟอร์นิเจอร์จะชนกัน');return}snapshot();selected.rot=candidate.rot;draw()}
$('deleteBtn').addEventListener('click',()=>{if(!selected)return;snapshot();items=items.filter(i=>i.id!==selected.id);selected=null;draw();updateEditor();status('ลบเฟอร์นิเจอร์แล้ว')});
$('undoBtn').addEventListener('click',()=>{const last=history.pop();if(!last){status('ไม่มีรายการให้ย้อนกลับ');return}const s=JSON.parse(last);room=s.room;items=s.items;selected=items.find(i=>i.id===s.selectedId)||null;$('roomW').value=room.w;$('roomH').value=room.h;$('floorColor').value=room.floor;$('wallColor').value=room.wall;$('showGrid').checked=room.grid;document.querySelectorAll('.style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style===room.style));$('roomTitle').textContent='ห้องของฉัน';resizeCanvas();updateEditor();status('ย้อนกลับแล้ว')});
function project(){return {version:1,room,items,updatedAt:new Date().toISOString()}}
$('saveBtn').addEventListener('click',()=>{try{localStorage.setItem('roomStudioProject',JSON.stringify(project()));status('บันทึกแบบไว้ในเบราว์เซอร์แล้ว')}catch(e){status('บันทึกไม่สำเร็จ')}})
$('loadBtn').addEventListener('click',()=>{const raw=localStorage.getItem('roomStudioProject');if(!raw){status('ยังไม่มีแบบที่บันทึกไว้');return}try{snapshot();const p=JSON.parse(raw);room=p.room;items=p.items||[];selected=null;$('roomW').value=room.w;$('roomH').value=room.h;$('floorColor').value=room.floor;$('wallColor').value=room.wall;$('showGrid').checked=room.grid;document.querySelectorAll('.style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style===room.style));$('roomTitle').textContent='ห้องของฉัน';resizeCanvas();updateEditor();status('โหลดแบบสำเร็จ')}catch(e){status('ไฟล์บันทึกเสียหาย')}})
$('newBtn').addEventListener('click',()=>{if(!confirm('เริ่มแบบใหม่และลบเฟอร์นิเจอร์ทั้งหมดหรือไม่?'))return;snapshot();items=[];selected=null;room={w:6,h:5,floor:palettes.modern.floor,wall:palettes.modern.wall,style:'modern',grid:true};$('roomTitle').textContent='ห้องของฉัน';$('roomW').value=6;$('roomH').value=5;$('floorColor').value=room.floor;$('wallColor').value=room.wall;$('showGrid').checked=true;document.querySelectorAll('.style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style==='modern'));resizeCanvas();updateEditor();status('สร้างห้องใหม่แล้ว')});
$('exportBtn').addEventListener('click',()=>{const old=selected;selected=null;draw();const a=document.createElement('a');a.download='room-studio-plan.png';a.href=canvas.toDataURL('image/png');a.click();selected=old;draw();status('ส่งออกแปลนเป็น PNG แล้ว')});
$('view2dBtn').addEventListener('click',()=>{$('canvas2dWrap').style.display='grid';$('view3dWrap').style.display='none';$('view2dBtn').classList.add('primary');$('view3dBtn').classList.remove('primary');$('bottomHint').textContent='คลิกเพื่อเลือก · ลากเพื่อย้าย · ลากจุดมุมสีเขียวเพื่อปรับขนาด · ใช้แผงด้านขวาเพื่อหมุนหรือลบ';resizeCanvas()});
$('view3dBtn').addEventListener('click',()=>{$('canvas2dWrap').style.display='none';$('view3dWrap').style.display='block';$('view3dBtn').classList.add('primary');$('view2dBtn').classList.remove('primary');$('bottomHint').textContent='ลากเฟอร์นิเจอร์เพื่อย้าย · ปรับขนาดในแปลน 2D · ลากพื้นที่ว่างเพื่อหมุน · เลื่อนเพื่อซูม';if(!renderer3d)init3D();else resize3D();render3D()});
$('plan3d').addEventListener('pointerdown',e=>{if(!renderer3d||e.button!==0)return;const r=renderer3d.domElement.getBoundingClientRect();mouse3d.x=((e.clientX-r.left)/r.width)*2-1;mouse3d.y=-((e.clientY-r.top)/r.height)*2+1;raycaster3d.setFromCamera(mouse3d,camera3d);const hits=raycaster3d.intersectObjects(objectMeshes.map(o=>o.mesh),true);let found=null;if(hits.length){let mesh=hits[0].object;while(mesh&&!mesh.userData.itemId)mesh=mesh.parent;found=items.find(it=>it.id===mesh?.userData.itemId)||null}if(found){selected=found;dragging3d={id:found.id,startX:e.clientX,startY:e.clientY,moved:false};controls3d.enabled=false;renderer3d.domElement.setPointerCapture(e.pointerId);updateEditor();draw()}else{selected=null;updateEditor();draw()}});
$('plan3d').addEventListener('pointermove',e=>{if(!dragging3d||!renderer3d)return;const point=pointerToFloor(e);if(!point)return;const it=items.find(i=>i.id===dragging3d.id);if(!it)return;if(!dragging3d.moved&&Math.abs(e.clientX-dragging3d.startX)+Math.abs(e.clientY-dragging3d.startY)>3){snapshot();dragging3d.moved=true}if(!dragging3d.moved)return;const candidate={...it,x:Math.max(0,Math.min(room.w-it.w,point.x-it.w/2)),y:Math.max(0,Math.min(room.h-it.h,point.z-it.h/2))};if(canPlace(candidate,it.id)){it.x=candidate.x;it.y=candidate.y}$('objectX').value=it.x.toFixed(1);$('objectY').value=it.y.toFixed(1);draw()});
function endDrag3D(){if(!dragging3d)return;const moved=dragging3d.moved;dragging3d=null;if(controls3d)controls3d.enabled=true;if(moved)status('ย้ายเฟอร์นิเจอร์ในมุมมอง 3D แล้ว')}
$('plan3d').addEventListener('pointerup',endDrag3D);$('plan3d').addEventListener('pointercancel',endDrag3D);
// GLB/GLTF furniture loader. Files are read from assets/models/furniture/.
const furnitureModelFiles={
 bed:'bed.glb', sofa:'sofa.glb', desk:'desk.glb', dining:'dining-table.glb',
 wardrobe:'wardrobe.glb', tv:'tv-stand.glb', plant:'plant.glb', rug:'rug.glb',
 chair:'chair.glb', lamp:'floor-lamp.glb'
};
const furnitureModelCache=new Map();
const furnitureModelPending=new Map();
const gltfLoader=new GLTFLoader();
function loadFurnitureModel(kind){
 const file=furnitureModelFiles[kind];
 if(!file||!gltfLoader)return Promise.resolve(null);
 if(furnitureModelCache.has(kind))return Promise.resolve(furnitureModelCache.get(kind));
 if(furnitureModelPending.has(kind))return furnitureModelPending.get(kind);
 const promise=new Promise(resolve=>{
   gltfLoader.load('assets/models/furniture/'+file,gltf=>{
     const model=gltf.scene;
     model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
     furnitureModelCache.set(kind,model);resolve(model);
   },undefined,()=>resolve(null));
 }).finally(()=>furnitureModelPending.delete(kind));
 furnitureModelPending.set(kind,promise);return promise;
}
function fitFurnitureModel(source,it){
 const model=source.clone(true);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 if(size.x<1e-5||size.y<1e-5||size.z<1e-5)return null;
 model.position.set(0,0,0);
 model.scale.set(it.w/size.x,Math.max(.15,(furnitureModelFiles[it.kind]&&it.kind==='bed') ? .45 : 1.0)/size.y,it.h/size.z);
 const scaledBounds=new THREE.Box3().setFromObject(model);
 model.position.y-=scaledBounds.min.y;
 return model;
}
function render3D(){
 if(!scene3d)return;
 // While dragging in 3D, update existing object transforms only.
 // Rebuilding the entire scene on every pointermove causes visible flicker.
 if(dragging3d){
   objectMeshes.forEach(({mesh,it})=>{
     mesh.position.set(it.x+it.w/2,0,it.y+it.h/2);
     mesh.rotation.y=-(it.rot||0);
   });
   return;
 }
 while(scene3d.children.length>2){
   const o=scene3d.children[2];scene3d.remove(o);
   o.traverse?.(n=>{if(n.geometry)n.geometry.dispose();if(n.material){if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material.dispose()}});
 }
 objectMeshes=[];
 const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color:color||'#b5a18a',roughness});
 function box(parent,w,h,d,color,x,y,z){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.04,w),Math.max(.04,h),Math.max(.04,d)),mat(color));
   mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 function flatBox(parent,w,h,d,color,x,y,z){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.04,w),Math.max(.04,h),Math.max(.04,d)),new THREE.MeshBasicMaterial({color:color||'#b5a18a'}));
   mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 flatBox(scene3d,room.w,.12,room.h,room.floor,room.w/2,-.06,room.h/2);
 const wallH=2.6,th=.12;
 flatBox(scene3d,room.w,wallH,th,room.wall,room.w/2,wallH/2,0);
 flatBox(scene3d,th,wallH,room.h,room.wall,0,wallH/2,room.h/2);
 flatBox(scene3d,th,wallH,room.h,room.wall,room.w,wallH/2,room.h/2);
 items.forEach(it=>{
   const group=new THREE.Group();
   group.position.set(it.x+it.w/2,0,it.y+it.h/2);
   group.rotation.y=-(it.rot||0);group.userData.itemId=it.id;
   scene3d.add(group);objectMeshes.push({mesh:group,it});
   const fallback=()=>{
     while(group.children.length){const child=group.children.pop();child.parent=null}
     const w=it.w,d=it.h,c=it.color;
     if(it.kind==='bed'){
       box(group,w,.42,d,c,0,.21,0);box(group,w*.92,.13,d*.25,'#f7f2e9',0,.49,-d*.32);
     }else if(it.kind==='sofa'){
       box(group,w,.25,d,c,0,.22,0);box(group,w,.48,.16,c,0,.56,-d*.4);
       box(group,.14,.4,d,c,-w*.43,.42,0);box(group,.14,.4,d,c,w*.43,.42,0);
       box(group,w*.38,.12,d*.52,'#c7cfc8',-w*.2,.42,0);box(group,w*.38,.12,d*.52,'#c7cfc8',w*.2,.42,0);
     }else if(it.kind==='plant'){
       const pot=new THREE.Mesh(new THREE.CylinderGeometry(d*.27,d*.2,.34,16),mat('#b87852'));pot.position.y=.17;group.add(pot);
       const leaves=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.18,Math.min(w,d)*.38),16,12),mat(c||'#548260'));leaves.position.y=.58;group.add(leaves);
     }else if(it.kind==='chair'){
       box(group,w,.12,d,c,0,.42,0);box(group,w*.8,.38,.1,c,0,.64,-d*.42);
       for(const x of [-.36,.36])for(const z of [-.34,.34])box(group,.045,.38,.045,'#6c5848',x*w, .19,z*d);
     }else if(it.kind==='lamp'){
       const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.65,12),mat('#77736b'));pole.position.y=.34;group.add(pole);
       const shade=new THREE.Mesh(new THREE.CylinderGeometry(.08,.22,.2,16),mat(c||'#d9bd6b'));shade.position.y=.78;group.add(shade);
     }else if(it.kind==='rug'){
       flatBox(group,w,.035,d,c,0,.02,0);
     }else if(it.kind==='desk'||it.kind==='dining'){
       box(group,w,.09,d,c,0,.72,0);
       for(const x of [-.42,.42])for(const z of [-.38,.38])box(group,.07,.7,.07,'#7b6047',x*w,.35,z*d);
     }else if(it.kind==='tv'){
       box(group,w,.48,d,c,0,.25,0);box(group,w*.78,.45,.035,'#202522',0,.82,-d/2-.025);
     }else if(it.kind==='wardrobe'){
       box(group,w,2,d,c,0,1,0);box(group,.025,1.8,.025,'#e7d7c5',0,1,-d/2-.012);
     }else{
       box(group,w,.75,d,c,0,.375,0);
     }
   };
   loadFurnitureModel(it.kind).then(source=>{
     if(!scene3d||!group.parent)return;
     if(source){
       const model=source.clone(true);model.traverse(n=>{if(n.isMesh){if(n.geometry)n.geometry=n.geometry.clone();if(n.material)n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone()}});const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
       if(size.x>.0001&&size.y>.0001&&size.z>.0001){
         const targetHeight=it.kind==='bed'?.48:it.kind==='rug'?.06:it.kind==='plant'?.85:it.kind==='lamp'?.9:it.kind==='wardrobe'?2:it.kind==='tv'?.8:it.kind==='chair'?.9:it.kind==='sofa'?.9:it.kind==='desk'||it.kind==='dining'?.78:.75;
         model.scale.set(it.w/size.x,targetHeight/size.y,it.h/size.z);
         const fitted=new THREE.Box3().setFromObject(model);model.position.y-=fitted.min.y;
         model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
         group.add(model);
       }else fallback();
     }else fallback();
   }).catch(fallback);
 });
 controls3d.target.set(room.w/2,0,room.h/2);controls3d.update();
}
window.addEventListener('resize',()=>{resizeCanvas();resize3D()});
window.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&selected&&document.activeElement.tagName!=='INPUT'){items=items.filter(i=>i.id!==selected.id);selected=null;draw();updateEditor()}if(e.key==='Escape'){selected=null;updateEditor();draw()}});
resizeCanvas();updateEditor();
})();
