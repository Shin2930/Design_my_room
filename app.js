import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";

(() => {
  const canvas = document.getElementById("plan"),
    ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const palettes = {
    modern: { floor: "#8b5e3c", wall: "#f4f2ec", furniture: "#82958a" },
    minimal: { floor: "#eeeeea", wall: "#ffffff", furniture: "#c9c9c2" },
    scandi: { floor: "#e8d6bb", wall: "#fbf8f0", furniture: "#b5a18a" },
    warm: { floor: "#cda984", wall: "#f5e8d6", furniture: "#9b6c4e" },
  };
  const specs = {
    bed: { name: "เตียงนอน", w: 1.8, h: 2, color: "#d9c8b8", kind: "bed" },
    livingpack: { name: "ชุดเฟอร์นิเจอร์ห้องนั่งเล่น", w: 2.8, h: 2, color: "#82958a", kind: "livingpack" },
    sofa: { name: "โซฟา", w: 2, h: 0.9, color: "#82958a", kind: "sofa" },
    desk: { name: "โต๊ะทำงาน", w: 1.2, h: 0.6, color: "#bd9870", kind: "desk" },
    dining: {
      name: "โต๊ะอาหาร",
      w: 1.4,
      h: 0.8,
      color: "#bd9870",
      kind: "dining",
    },
    wardrobe: {
      name: "ตู้เสื้อผ้า",
      w: 1.2,
      h: 0.6,
      color: "#a87953",
      kind: "wardrobe",
    },
    tv: { name: "ชั้นวางทีวี", w: 1.5, h: 0.4, color: "#8c8277", kind: "tv" },
    plant: { name: "ต้นไม้", w: 0.5, h: 0.5, color: "#548260", kind: "plant" },
    rug: { name: "พรม", w: 1.6, h: 1.2, color: "#c7b7a1", kind: "rug" },
    chair: { name: "เก้าอี้", w: 0.6, h: 0.6, color: "#a87953", kind: "chair" },
    lamp: { name: "โคมไฟ", w: 0.4, h: 0.4, color: "#d9bd6b", kind: "lamp" },
    window: {
      name: "หน้าต่าง",
      w: 1.2,
      h: 0.12,
      color: "#8ab8c9",
      kind: "window",
    },
    door: { name: "ประตู", w: 0.9, h: 0.12, color: "#8b6246", kind: "door" },
  };
  let room = {
    w: 3.5,
    h: 3.5,
    floor: "#8b5e3c",
    wall: "#f4f2ec",
    style: "modern",
    grid: true,
  };
  let items = [],
    selected = null,
    dragging = null,
    history = [];
  let view = { scale: 1, ox: 0, oy: 0, unit: 90 };
  let scene3d = null,
    camera3d = null,
    renderer3d = null,
    controls3d = null,
    raycaster3d = null,
    mouse3d = null,
    objectMeshes = [],
    framedRoom3D = null,
    directionalLight3D = null,
    litRoom3D = null;
  function init3D() {
    const c = $("plan3d");
    scene3d = new THREE.Scene();
    scene3d.background = new THREE.Color("#eef1ed");
    camera3d = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    renderer3d = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer3d.shadowMap.enabled = true;
    renderer3d.outputColorSpace = THREE.SRGBColorSpace;
    renderer3d.toneMapping = THREE.ACESFilmicToneMapping;
    renderer3d.toneMappingExposure = 1.1;
    controls3d = new OrbitControls(camera3d, c);
    controls3d.enableDamping = true;
    frameCamera3D();
    raycaster3d = new THREE.Raycaster();
    mouse3d = new THREE.Vector2();
    scene3d.add(new THREE.HemisphereLight(0xffffff, 0x9a907e, 0.9));
    directionalLight3D = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight3D.castShadow = true;
    directionalLight3D.shadow.mapSize.set(1024, 1024);
    scene3d.add(directionalLight3D, directionalLight3D.target);
    updateRoomLighting3D();
    resize3D();
    animate3D();
  }
  function resize3D() {
    if (!renderer3d) return;
    const wrap = $("view3dWrap"),
      w = Math.max(1, wrap.clientWidth),
      h = Math.max(1, wrap.clientHeight);
    renderer3d.setSize(w, h, false);
    camera3d.aspect = w / h;
    camera3d.updateProjectionMatrix();
  }
  function frameCamera3D() {
    const size = Math.max(room.w, room.h);
    camera3d.position.set(
      room.w / 2 + size * 0.25,
      size * 1.1,
      room.h / 2 + size * 1.1,
    );
    controls3d.target.set(room.w / 2, 0, room.h / 2);
    controls3d.update();
    framedRoom3D = `${room.w}x${room.h}`;
  }
  function updateRoomLighting3D() {
    const dimensions = `${room.w}x${room.h}`;
    if (!directionalLight3D || litRoom3D === dimensions) return;
    const size = Math.max(room.w, room.h),
      extent = Math.hypot(room.w, room.h) / 2 + 2.6;
    directionalLight3D.position.set(
      room.w / 2 - size * 0.2,
      size * 2.4,
      room.h / 2 + size * 0.2,
    );
    directionalLight3D.target.position.set(room.w / 2, 0, room.h / 2);
    const shadowCamera = directionalLight3D.shadow.camera;
    Object.assign(shadowCamera, {
      near: 0.1,
      far: size * 4 + 3,
      left: -extent,
      right: extent,
      top: extent,
      bottom: -extent,
    });
    shadowCamera.updateProjectionMatrix();
    litRoom3D = dimensions;
  }
  const cameraKeys3D = new Set();
  let cameraMoveTime3D = 0;
  function moveCamera3D(delta) {
    if ($("view3dWrap").style.display === "none") {
      cameraKeys3D.clear();
      return;
    }
    if (!cameraKeys3D.size) return;
    const forward = controls3d.target.clone().sub(camera3d.position);
    forward.y = 0;
    if (forward.lengthSq() > 1e-6) forward.normalize();
    else forward.set(0, 0, -1);
    const right = forward.clone().cross(camera3d.up).normalize(),
      distance = Math.max(room.w, room.h, 1) * 0.5 * delta,
      movement = new THREE.Vector3();
    if (cameraKeys3D.has("w")) movement.add(forward);
    if (cameraKeys3D.has("s")) movement.sub(forward);
    if (cameraKeys3D.has("d")) movement.add(right);
    if (cameraKeys3D.has("a")) movement.sub(right);
    if (cameraKeys3D.has("e")) movement.y += 1;
    if (cameraKeys3D.has("q")) movement.y -= 1;
    if (movement.lengthSq()) {
      movement.normalize().multiplyScalar(distance);
      camera3d.position.add(movement);
      controls3d.target.add(movement);
    }
  }
  let dragging3d = null;
  const gltfLoader = new GLTFLoader();
  // วางไฟล์ .glb ไว้ในโฟลเดอร์ assets/models แล้วตั้งชื่อให้ตรงกับรายการนี้
  let exteriorTexture3D = null;
  function getExteriorTexture3D() {
    if (exteriorTexture3D) return exteriorTexture3D;
    exteriorTexture3D = new THREE.TextureLoader().load(
      "assets/picture/BKK-002_bangkok-cityscape-midnight-view-_ADS.jpg",
    );
    exteriorTexture3D.colorSpace = THREE.SRGBColorSpace;
    exteriorTexture3D.repeat.x = 0.64;
    exteriorTexture3D.offset.x = 0.18;
    return exteriorTexture3D;
  }
  function addWindowExterior(parent, width) {
    const exterior = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.88 * 0.9 * 0.95, 0.9),
      new THREE.MeshBasicMaterial({
        map: getExteriorTexture3D(),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    exterior.position.set(0, 1.5, -0.14);
    parent.add(exterior);
  }
  const glbModels = {
    bed: "assets/models/bed.glb",
    sofa: "assets/models/sofa.glb",
    desk: "assets/models/modern_table.glb",
    dining: "assets/models/modern_table.glb",
    wardrobe: "assets/models/wardrobe.glb",
    tv: "assets/models/tv.glb",
    livingpack: "assets/models/tinylivingpack.glb",
    plant: "assets/models/plant_pot.glb",
    rug: "assets/models/carpet.glb",
    chair: "assets/models/modern_chair.glb",
    lamp: "assets/models/lamp.glb",
    window: "assets/models/window.glb",
    door: "assets/models/modern_door.glb",
  };
  const glbCache = new Map();
  function loadGLB(url) {
    if (!glbCache.has(url)) {
      glbCache.set(url, new Promise((resolve, reject) => {
        gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
      }));
    }
    return glbCache.get(url);
  }
  function pointerToFloor(e) {
    const r = $("plan3d").getBoundingClientRect();
    mouse3d.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse3d.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster3d.setFromCamera(mouse3d, camera3d);
    const point = new THREE.Vector3();
    return raycaster3d.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      point,
    )
      ? point
      : null;
  }
  function animate3D() {
    if (!renderer3d) return;
    requestAnimationFrame(animate3D);
    const now = performance.now();
    moveCamera3D(Math.min((now - cameraMoveTime3D) / 1000, 0.05));
    cameraMoveTime3D = now;
    controls3d.update();
    renderer3d.render(scene3d, camera3d);
  }
  function snapshot() {
    history.push(
      JSON.stringify({ room, items, selectedId: selected?.id || null }),
    );
    if (history.length > 40) history.shift();
  }
  function corners(it) {
    const a = it.rot || 0,
      c = Math.cos(a),
      s = Math.sin(a),
      hw = it.w / 2,
      hh = it.h / 2,
      cx = it.x + hw,
      cy = it.y + hh;
    return [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  }
  function clampToRoom(it) {
    const c = Math.abs(Math.cos(it.rot || 0)),
      s = Math.abs(Math.sin(it.rot || 0)),
      halfW = (c * it.w + s * it.h) / 2,
      halfH = (s * it.w + c * it.h) / 2,
      cx = Math.max(halfW, Math.min(room.w - halfW, it.x + it.w / 2)),
      cy = Math.max(halfH, Math.min(room.h - halfH, it.y + it.h / 2));
    return { ...it, x: cx - it.w / 2, y: cy - it.h / 2 };
  }
  function snapDoorToWall(it) {
    if (it.kind !== "door" && it.kind !== "window") return it;
    const cx = it.x + it.w / 2,
      cy = it.y + it.h / 2,
      points = corners(it),
      xs = points.map(([x]) => x),
      ys = points.map(([, y]) => y),
      gaps = [
        ["left", Math.min(...xs), cx],
        ["right", room.w - Math.max(...xs), room.w - cx],
        ["top", Math.min(...ys), cy],
        ["bottom", room.h - Math.max(...ys), room.h - cy],
      ],
      [wall, gap] = gaps.reduce((a, b) =>
        b[1] < a[1] || (b[1] === a[1] && b[2] < a[2]) ? b : a,
      );
    if (gap > 0.35) return it;
    let rot = 0;
    if (wall === "left" || wall === "right") {
      rot = wall === "left" ? -Math.PI / 2 : Math.PI / 2;
      const x = wall === "left" ? it.h / 2 : room.w - it.h / 2,
        y = Math.max(it.w / 2, Math.min(room.h - it.w / 2, cy));
      return { ...it, x: x - it.w / 2, y: y - it.h / 2, rot };
    }
    rot = wall === "top" ? 0 : Math.PI;
    const x = Math.max(it.w / 2, Math.min(room.w - it.w / 2, cx)),
      y = wall === "top" ? it.h / 2 : room.h - it.h / 2;
    return { ...it, x: x - it.w / 2, y: y - it.h / 2, rot };
  }
  function windowWall(it) {
    if (it.kind !== "window") return null;
    const cx = it.x + it.w / 2,
      cy = it.y + it.h / 2,
      walls = [
        ["left", Math.abs(cx - it.h / 2)],
        ["right", Math.abs(cx - (room.w - it.h / 2))],
        ["top", Math.abs(cy - it.h / 2)],
        ["bottom", Math.abs(cy - (room.h - it.h / 2))],
      ],
      [wall, distance] = walls.reduce((a, b) => (b[1] < a[1] ? b : a));
    return distance < 0.02 ? wall : null;
  }
  function insideRoom(it) {
    return corners(it).every(
      ([x, y]) =>
        x >= -0.0001 &&
        y >= -0.0001 &&
        x <= room.w + 0.0001 &&
        y <= room.h + 0.0001,
    );
  }
  function overlaps(a, b) {
    if (a.kind === "rug" || b.kind === "rug") return false;
    const A = corners(a),
      B = corners(b);
    for (const poly of [A, B])
      for (let i = 0; i < 4; i++) {
        const p = poly[i],
          q = poly[(i + 1) % 4],
          axis = [-(q[1] - p[1]), q[0] - p[0]];
        const pa = A.map((v) => v[0] * axis[0] + v[1] * axis[1]),
          pb = B.map((v) => v[0] * axis[0] + v[1] * axis[1]);
        if (
          Math.max(...pa) <= Math.min(...pb) + 0.0001 ||
          Math.max(...pb) <= Math.min(...pa) + 0.0001
        )
          return false;
      }
    return true;
  }
  function canPlace(candidate, ignoreId = candidate.id) {
    if (!insideRoom(candidate)) return false;
    return !items.some(
      (other) => other.id !== ignoreId && overlaps(candidate, other),
    );
  }
  function findFreePosition(it) {
    for (let y = 0; y <= room.h - it.h + 0.001; y += 0.25)
      for (let x = 0; x <= room.w - it.w + 0.001; x += 0.25) {
        const candidate = { ...it, x, y };
        if (canPlace(candidate, null)) return { x, y };
      }
    return null;
  }
  function id() {
    return Math.random().toString(36).slice(2, 10);
  }
  function status(msg) {
    $("status").textContent = msg;
    setTimeout(() => {
      if ($("status").textContent === msg) $("status").textContent = "";
    }, 2400);
  }
  function resizeCanvas() {
    const wrap = canvas.parentElement.getBoundingClientRect(),
      ratio = Math.min(
        (wrap.width - 36) / (room.w * 100 + 50),
        (wrap.height - 36) / (room.h * 100 + 50),
      );
    const cssW = Math.max(
        260,
        Math.min(wrap.width - 20, (room.w * 100 + 50) * ratio),
      ),
      cssH = Math.max(
        260,
        Math.min(wrap.height - 20, (room.h * 100 + 50) * ratio),
      );
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.unit = Math.min((cssW - 70) / room.w, (cssH - 70) / room.h);
    view.ox = (cssW - room.w * view.unit) / 2;
    view.oy = (cssH - room.h * view.unit) / 2;
    draw();
  }
  function roundRect(c, x, y, w, h, r, fill, stroke) {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.stroke();
    }
  }
  function drawFurniture(it) {
    const u = view.unit,
      cx = view.ox + (it.x + it.w / 2) * u,
      cy = view.oy + (it.y + it.h / 2) * u,
      w = it.w * u,
      h = it.h * u;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(it.rot || 0);
    ctx.fillStyle = "rgba(31,39,32,.13)";
    roundRect(
      ctx,
      -w / 2 + 2,
      -h / 2 + 3,
      w,
      h,
      Math.min(9, u * 0.08),
      ctx.fillStyle,
    );
    const color = it.color;
    if (it.kind === "rug") {
      roundRect(ctx, -w / 2, -h / 2, w, h, 5, color, "rgba(88,74,58,.55)");
      ctx.strokeStyle = "#ffffff99";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    } else if (it.kind === "bed") {
      roundRect(ctx, -w / 2, -h / 2, w, h, 5, "#a88b6b", "#80674f");
      roundRect(
        ctx,
        -w / 2 + 4,
        -h / 2 + 4,
        w - 8,
        h * 0.24,
        4,
        "#f7f2e9",
        "#d2c7b9",
      );
      roundRect(
        ctx,
        -w / 2 + 4,
        -h / 2 + h * 0.29,
        w - 8,
        h * 0.66,
        3,
        color,
        "#c7b6a4",
      );
      ctx.strokeStyle = "#ffffffaa";
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + h * 0.3);
      ctx.lineTo(0, h / 2 - 5);
      ctx.stroke();
    } else if (it.kind === "sofa") {
      roundRect(ctx, -w / 2, -h / 2, w, h, 7, color, "#58685f");
      roundRect(
        ctx,
        -w / 2 + 4,
        -h / 2 + 4,
        w - 8,
        h * 0.27,
        4,
        "#657b70",
        "#52675d",
      );
      roundRect(
        ctx,
        -w / 2 + 4,
        -h / 2 + h * 0.34,
        w / 2 - 6,
        h * 0.58,
        5,
        color,
        "#ffffff66",
      );
      roundRect(
        ctx,
        2,
        -h / 2 + h * 0.34,
        w / 2 - 6,
        h * 0.58,
        5,
        color,
        "#ffffff66",
      );
      roundRect(
        ctx,
        -w / 2 - 2,
        -h / 2 + 3,
        Math.max(5, w * 0.09),
        h - 6,
        3,
        "#607368",
      );
      roundRect(
        ctx,
        w / 2 - Math.max(5, w * 0.09),
        -h / 2 + 3,
        Math.max(5, w * 0.09),
        h - 6,
        3,
        "#607368",
      );
    } else if (it.kind === "plant") {
      roundRect(ctx, -w / 2, -h / 2, w, h, 4, "#c58d68", "#9e6d50");
      ctx.beginPath();
      ctx.arc(0, -h * 0.08, Math.min(w, h) * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-w * 0.13, -h * 0.12, Math.min(w, h) * 0.19, 0, Math.PI * 2);
      ctx.fillStyle = "#76a17a";
      ctx.fill();
    } else if (it.kind === "chair" || it.kind === "lamp") {
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.43, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff99";
      ctx.stroke();
      if (it.kind === "lamp") {
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(w, h) * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff4c2";
        ctx.fill();
      }
    } else if (it.kind === "window") {
      ctx.fillStyle = "#d6edf5";
      ctx.fillRect(-w / 2, -Math.max(3, h / 2), w, Math.max(6, h));
      ctx.strokeStyle = "#6e9eae";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -Math.max(3, h / 2), w, Math.max(6, h));
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, h / 2);
      ctx.stroke();
    } else if (it.kind === "door") {
      ctx.fillStyle = "#d9c3a5";
      ctx.fillRect(-w / 2, -Math.max(3, h / 2), w, Math.max(6, h));
      ctx.strokeStyle = "#8b6246";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -Math.max(3, h / 2), w, Math.max(6, h));
      ctx.beginPath();
      ctx.arc(-w / 2, 0, w, 0, Math.PI / 2);
      ctx.stroke();
    } else {
      roundRect(ctx, -w / 2, -h / 2, w, h, 4, color, "#00000038");
      if (it.kind === "desk" || it.kind === "dining") {
        ctx.strokeStyle = "#ffffff99";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.36, -h * 0.25);
        ctx.lineTo(w * 0.36, -h * 0.25);
        ctx.stroke();
      }
      if (it.kind === "tv") {
        ctx.fillStyle = "#222";
        roundRect(ctx, -w * 0.38, -h * 0.28, w * 0.76, h * 0.4, 2, "#252a28");
        ctx.fillStyle = "#9fb5a5";
        ctx.fillRect(-w * 0.34, -h * 0.24, w * 0.68, h * 0.32);
      }
      if (it.kind === "wardrobe") {
        ctx.strokeStyle = "#ffffff88";
        ctx.beginPath();
        ctx.moveTo(0, -h / 2 + 4);
        ctx.lineTo(0, h / 2 - 4);
        ctx.stroke();
        ctx.fillStyle = "#f4e7d5";
        ctx.beginPath();
        ctx.arc(-3, 0, 1.5, 0, Math.PI * 2);
        ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (selected && selected.id === it.id) {
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0058a3";
      ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
      ctx.setLineDash([]);
      ctx.fillStyle = "#0058a3";
      ctx.beginPath();
      ctx.arc(w / 2 + 4, -h / 2 - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function draw() {
    const cw = parseFloat(canvas.style.width) || canvas.width,
      ch = parseFloat(canvas.style.height) || canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
    const u = view.unit,
      x = view.ox,
      y = view.oy,
      w = room.w * u,
      h = room.h * u;
    ctx.fillStyle = room.floor;
    ctx.fillRect(x, y, w, h);
    if (room.grid) {
      ctx.save();
      ctx.strokeStyle = "#77777718";
      ctx.lineWidth = 1;
      for (let i = 0; i <= room.w * 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (i * u) / 2, y);
        ctx.lineTo(x + (i * u) / 2, y + h);
        ctx.stroke();
      }
      for (let i = 0; i <= room.h * 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + (i * u) / 2);
        ctx.lineTo(x + w, y + (i * u) / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // wall strips with open doorway on lower wall
    ctx.fillStyle = room.wall;
    ctx.fillRect(x - 7, y - 7, w + 14, 8);
    ctx.fillRect(x - 7, y - 7, 8, h + 14);
    ctx.fillRect(x + w - 1, y - 7, 8, h + 14);
    ctx.fillStyle = "#d1cfc7";
    ctx.fillRect(x - 7, y + h, w * 0.37 + 7, 8);
    ctx.fillRect(x + w * 0.63, y + h, w * 0.37 + 7, 8);
    ctx.strokeStyle = "#b7b8b0";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    items.filter((i) => i.kind === "window").forEach((it) => {
      const side = windowWall(it),
        span = it.w * 0.9 * 0.95 * u,
        cx = x + (it.x + it.w / 2) * u,
        cy = y + (it.y + it.h / 2) * u;
      if (!side) return;
      ctx.fillStyle = "#d6edf5";
      ctx.strokeStyle = "#6e9eae";
      ctx.lineWidth = 1.5;
      if (side === "top") {
        ctx.fillRect(cx - span / 2, y - 7, span, 15);
        ctx.strokeRect(cx - span / 2, y - 7, span, 15);
      } else if (side === "bottom") {
        ctx.fillRect(cx - span / 2, y + h - 7, span, 15);
        ctx.strokeRect(cx - span / 2, y + h - 7, span, 15);
      } else if (side === "left") {
        ctx.fillRect(x - 7, cy - span / 2, 15, span);
        ctx.strokeRect(x - 7, cy - span / 2, 15, span);
      } else {
        ctx.fillRect(x + w - 7, cy - span / 2, 15, span);
        ctx.strokeRect(x + w - 7, cy - span / 2, 15, span);
      }
    });
    items.filter((i) => i.kind === "rug").forEach(drawFurniture);
    items.filter((i) => i.kind !== "rug").forEach(drawFurniture);
    if (room.grid) {
      ctx.fillStyle = "#68716a";
      ctx.font = "11px Kanit";
      ctx.textAlign = "center";
      ctx.fillText(room.w + " ม.", x + w / 2, y - 19);
      ctx.save();
      ctx.translate(x - 22, y + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(room.h + " ม.", 0, 0);
      ctx.restore();
    }
    $("roomMeta").textContent = room.w + " × " + room.h + " เมตร";
    $("areaValue").textContent = (room.w * room.h).toFixed(1) + " ตร.ม.";
    $("itemCount").textContent = items.length + " ชิ้น";
    render3D();
  }
  function addItem(type) {
    const s = specs[type];
    if (!s) return;
    const it = { ...s, color: s.color, id: id(), x: 0, y: 0, rot: 0 };
    const pos = findFreePosition(it);
    if (!pos) {
      status("พื้นที่ไม่พอหรือไม่มีตำแหน่งว่างสำหรับ" + it.name);
      return;
    }
    snapshot();
    it.x = pos.x;
    it.y = pos.y;
    items.push(it);
    selected = it;
    draw();
    updateEditor();
    status("เพิ่ม" + it.name + "แล้ว");
  }
  function updateEditor() {
    const has = !!selected;
    $("nothingSelected").hidden = has;
    $("objectEditor").hidden = !has;
    if (!has) return;
    $("objectName").value = selected.name;
    $("objectW").value = selected.w;
    $("objectH").value = selected.h;
    $("objectColor").value = selected.color;
    $("objectX").value = selected.x.toFixed(1);
    $("objectY").value = selected.y.toFixed(1);
    $("objectLift").value = (Number(selected.lift) || 0).toFixed(1);
    $("liftField").hidden = selected.kind !== "tv";
  }
  function getPointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function localPointer(p, it) {
    const u = view.unit,
      cx = view.ox + (it.x + it.w / 2) * u,
      cy = view.oy + (it.y + it.h / 2) * u,
      dx = p.x - cx,
      dy = p.y - cy,
      rot = -(it.rot || 0);
    return {
      x: dx * Math.cos(rot) - dy * Math.sin(rot),
      y: dx * Math.sin(rot) + dy * Math.cos(rot),
    };
  }
  function hitResizeHandle(p, it) {
    if (!selected || selected.id !== it.id) return false;
    const q = localPointer(p, it),
      u = view.unit;
    return (
      Math.hypot(q.x - ((it.w * u) / 2 + 4), q.y - ((-it.h * u) / 2 - 4)) <= 11
    );
  }
  function hitTest(p, it) {
    const q = localPointer(p, it);
    return (
      Math.abs(q.x) <= (it.w * view.unit) / 2 + 5 &&
      Math.abs(q.y) <= (it.h * view.unit) / 2 + 5
    );
  }
  canvas.addEventListener("pointerdown", (e) => {
    const p = getPointer(e);
    if (selected && hitResizeHandle(p, selected)) {
      dragging = {
        mode: "resize",
        id: selected.id,
        startX: p.x,
        startY: p.y,
        centerX: view.ox + (selected.x + selected.w / 2) * view.unit,
        centerY: view.oy + (selected.y + selected.h / 2) * view.unit,
        origX: selected.x,
        origY: selected.y,
        origW: selected.w,
        origH: selected.h,
        rot: selected.rot || 0,
        moved: false,
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    const found = [...items].reverse().find((it) => hitTest(p, it));
    if (found) {
      selected = found;
      dragging = {
        mode: "move",
        id: found.id,
        startX: p.x,
        startY: p.y,
        origX: found.x,
        origY: found.y,
        moved: false,
      };
      canvas.setPointerCapture(e.pointerId);
      updateEditor();
      draw();
    } else {
      selected = null;
      updateEditor();
      draw();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = getPointer(e),
      it = items.find((i) => i.id === dragging.id);
    if (!it) return;
    if (
      !dragging.moved &&
      Math.abs(p.x - dragging.startX) + Math.abs(p.y - dragging.startY) > 2
    ) {
      snapshot();
      dragging.moved = true;
    }
    if (dragging.mode === "resize") {
      const dx = p.x - dragging.centerX,
        dy = p.y - dragging.centerY,
        rot = -dragging.rot,
        lx = dx * Math.cos(rot) - dy * Math.sin(rot),
        ly = dx * Math.sin(rot) + dy * Math.cos(rot),
        w = Math.max(0.2, Math.min(5, (Math.abs(lx) * 2) / view.unit)),
        h = Math.max(0.2, Math.min(5, (Math.abs(ly) * 2) / view.unit)),
        candidate = {
          ...it,
          w,
          h,
          x: dragging.origX + (dragging.origW - w) / 2,
          y: dragging.origY + (dragging.origH - h) / 2,
        };
      if (canPlace(candidate, it.id)) {
        Object.assign(it, {
          x: candidate.x,
          y: candidate.y,
          w: candidate.w,
          h: candidate.h,
        });
        $("objectW").value = it.w.toFixed(1);
        $("objectH").value = it.h.toFixed(1);
        $("objectX").value = it.x.toFixed(1);
        $("objectY").value = it.y.toFixed(1);
      }
      draw();
      return;
    }
    let candidate = clampToRoom({
      ...it,
      x: dragging.origX + (p.x - dragging.startX) / view.unit,
      y: dragging.origY + (p.y - dragging.startY) / view.unit,
    });
    candidate = snapDoorToWall(candidate);
    // Snap unrotated furniture flush to the nearest wall in 2D.
    const wallSnap = 0.35;
    if (candidate.kind !== "door" && candidate.kind !== "window" && Math.abs(candidate.rot || 0) < 0.001) {
      if (candidate.x < wallSnap) candidate.x = 0;
      if (room.w - candidate.x - candidate.w < wallSnap) candidate.x = room.w - candidate.w;
      if (candidate.y < wallSnap) candidate.y = 0;
      if (room.h - candidate.y - candidate.h < wallSnap) candidate.y = room.h - candidate.h;
    }
    if (canPlace(candidate, it.id)) {
      it.x = candidate.x;
      it.y = candidate.y;
      it.rot = candidate.rot;
    }
    $("objectX").value = it.x.toFixed(1);
    $("objectY").value = it.y.toFixed(1);
    draw();
  });
  canvas.addEventListener("pointerup", () => {
    if (dragging?.moved) status("อัปเดตตำแหน่งแล้ว");
    dragging = null;
  });
  document
    .querySelectorAll(".furn")
    .forEach((b) => b.addEventListener("click", () => addItem(b.dataset.type)));
  let catalogCategory = "all";
  function filterCatalog() {
    const query = $("catalogSearch").value.trim().toLocaleLowerCase();
    let visible = 0;
    document.querySelectorAll(".furn").forEach((button) => {
      const matches =
        (catalogCategory === "all" || button.dataset.category === catalogCategory) &&
        button.textContent.toLocaleLowerCase().includes(query);
      button.hidden = !matches;
      if (matches) visible++;
    });
    $("catalogEmpty").hidden = visible > 0;
  }
  $("catalogSearch").addEventListener("input", filterCatalog);
  document.querySelectorAll(".catalog-filter").forEach((button) =>
    button.addEventListener("click", () => {
      catalogCategory = button.dataset.category;
      document.querySelectorAll(".catalog-filter").forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle("active", active);
        filter.setAttribute("aria-pressed", active);
      });
      filterCatalog();
    }),
  );
  document.querySelectorAll(".style-btn").forEach((b) =>
    b.addEventListener("click", () => {
      snapshot();
      document
        .querySelectorAll(".style-btn")
        .forEach((x) => x.classList.toggle("active", x === b));
      room.style = b.dataset.style;
      const p = palettes[b.dataset.style];
      room.floor = p.floor;
      room.wall = p.wall;
      $("floorColor").value = p.floor;
      $("wallColor").value = p.wall;
      $("roomTitle").textContent = "ห้องของฉัน";
      draw();
      status("เปลี่ยนสไตล์ห้องแล้ว");
    }),
  );
  const roomTemplates = {
    bedroom: {
      name: "ห้องนอน",
      w: 4,
      h: 3.5,
      style: "scandi",
      items: [
        ["bed", 1.75, 0.25],
        ["wardrobe", 0.15, 0.25],
        ["rug", 1.85, 1.6],
        ["lamp", 1.3, 1],
        ["plant", 3.3, 2.8],
      ],
    },
    living: {
      name: "ห้องนั่งเล่น",
      w: 4.5,
      h: 4,
      style: "warm",
      items: [
        ["sofa", 1.25, 0.45],
        ["tv", 1.5, 3.5],
        ["rug", 1.45, 0.75],
        ["chair", 0.5, 2.45, Math.PI / 2],
        ["plant", 3.85, 0.35],
        ["lamp", 3.75, 3.25],
        ["desk", 0.2, 3.15],
      ],
    },
    office: {
      name: "ห้องทำงาน",
      w: 3.5,
      h: 3,
      style: "minimal",
      items: [
        ["desk", 0.8, 0.3],
        ["chair", 1.1, 1, -Math.PI / 2],
        ["wardrobe", 2.1, 0.3],
        ["rug", 0.8, 0.65],
        ["plant", 0.2, 2.2],
        ["lamp", 2.9, 1.2],
      ],
    },
  };
  function applyRoomTemplate(key) {
    const template = roomTemplates[key];
    if (!template) return;
    snapshot();
    room.w = template.w;
    room.h = template.h;
    room.style = template.style;
    const palette = palettes[template.style];
    room.floor = palette.floor;
    room.wall = palette.wall;
    items = template.items.map(([kind, x, y, rot = 0]) => ({
      ...specs[kind],
      id: id(),
      x,
      y,
      rot,
    }));
    selected = null;
    $("roomW").value = room.w;
    $("roomH").value = room.h;
    $("floorColor").value = room.floor;
    $("wallColor").value = room.wall;
    $("showGrid").checked = room.grid;
    document
      .querySelectorAll(".style-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.style === room.style),
      );
    document
      .querySelectorAll(".room-template")
      .forEach((b) => b.classList.toggle("active", b.dataset.template === key));
    $("roomTitle").textContent = template.name;
    resizeCanvas();
    updateEditor();
    status("โหลดแบบ" + template.name + "แล้ว");
  }
  document
    .querySelectorAll(".room-template")
    .forEach((b) =>
      b.addEventListener("click", () => applyRoomTemplate(b.dataset.template)),
    );
  function changeRoom() {
    const nextRoom = {
      ...room,
      w: Math.max(3, Math.min(12, Number($("roomW").value) || room.w)),
      h: Math.max(3, Math.min(12, Number($("roomH").value) || room.h)),
    };
    const previousRoom = room,
      previousItems = items,
      selectedId = selected?.id;
    room = nextRoom;
    items = [];
    let adjusted = false;
    for (const original of previousItems) {
      const i = { ...original },
        originalX = i.x,
        originalY = i.y,
        originalW = i.w,
        originalH = i.h;
      const c = Math.abs(Math.cos(i.rot || 0)),
        s = Math.abs(Math.sin(i.rot || 0));
      while (true) {
        const scale = Math.min(
          1,
          room.w / i.w,
          room.h / i.h,
          room.w / (i.w * c + i.h * s),
          room.h / (i.w * s + i.h * c),
        );
        if (scale >= 1) break;
        i.w = Math.max(0.2, i.w * scale);
        i.h = Math.max(0.2, i.h * scale);
        adjusted = true;
      }
      const halfW = (i.w * c + i.h * s) / 2,
        halfH = (i.w * s + i.h * c) / 2,
        minX = Math.max(0, halfW - i.w / 2),
        maxX = Math.min(room.w - i.w, room.w - halfW - i.w / 2),
        minY = Math.max(0, halfH - i.h / 2),
        maxY = Math.min(room.h - i.h, room.h - halfH - i.h / 2);
      i.x = Math.max(minX, Math.min(maxX, i.x));
      i.y = Math.max(minY, Math.min(maxY, i.y));
      let pos = canPlace(i) ? { x: i.x, y: i.y } : findFreePosition(i);
      while (!pos && (i.w > 0.2 || i.h > 0.2)) {
        i.w = Math.max(0.2, i.w * 0.9);
        i.h = Math.max(0.2, i.h * 0.9);
        pos = findFreePosition(i);
      }
      if (!pos) {
        room = previousRoom;
        items = previousItems;
        $("roomW").value = room.w;
        $("roomH").value = room.h;
        status("ห้องเล็กเกินไปสำหรับเฟอร์นิเจอร์ทั้งหมด");
        return;
      }
      i.x = pos.x;
      i.y = pos.y;
      if (
        i.x !== originalX ||
        i.y !== originalY ||
        i.w !== originalW ||
        i.h !== originalH
      )
        adjusted = true;
      items.push(i);
    }
    const nextItems = items;
    room = previousRoom;
    items = previousItems;
    snapshot();
    room = nextRoom;
    items = nextItems;
    selected = items.find((i) => i.id === selectedId) || null;
    $("roomW").value = room.w;
    $("roomH").value = room.h;
    resizeCanvas();
    updateEditor();
    if (adjusted) status("จัดตำแหน่งและปรับขนาดเฟอร์นิเจอร์ให้พอดีกับห้องแล้ว");
  }
  $("roomW").addEventListener("change", changeRoom);
  $("roomH").addEventListener("change", changeRoom);
  $("floorColor").addEventListener("input", () => {
    room.floor = $("floorColor").value;
    draw();
  });
  $("wallColor").addEventListener("input", () => {
    room.wall = $("wallColor").value;
    draw();
  });
  $("showGrid").addEventListener("change", () => {
    room.grid = $("showGrid").checked;
    draw();
  });
  $("objectName").addEventListener("change", () => {
    if (selected) {
      selected.name = $("objectName").value;
      draw();
    }
  });
  $("objectColor").addEventListener("input", () => {
    if (selected) {
      selected.color = $("objectColor").value;
      draw();
    }
  });
  $("objectLift").addEventListener("change", () => {
    if (!selected || selected.kind !== "tv") return;
    snapshot();
    selected.lift = Math.max(0, Math.min(2.4, Number($("objectLift").value) || 0));
    $("objectLift").value = selected.lift.toFixed(1);
    draw();
    status("ปรับความสูงทีวีแล้ว");
  });
  function updateDimension(which) {
    if (!selected) return;
    const v = Math.max(
      0.2,
      Math.min(
        5,
        Number($(which === "w" ? "objectW" : "objectH").value) || 0.5,
      ),
    );
    const candidate = snapDoorToWall(
      clampToRoom({ ...selected, [which]: v }),
    );
    if (!canPlace(candidate, selected.id)) {
      status(
        insideRoom(candidate)
          ? "ปรับขนาดไม่ได้ เพราะเฟอร์นิเจอร์จะชนกัน"
          : "ปรับขนาดไม่ได้ เพราะเฟอร์นิเจอร์จะเกินขอบห้อง",
      );
      updateEditor();
      return;
    }
    snapshot();
    Object.assign(selected, candidate);
    draw();
    updateEditor();
  }
  $("objectW").addEventListener("change", () => updateDimension("w"));
  $("objectH").addEventListener("change", () => updateDimension("h"));
  function updatePosition() {
    if (!selected) return;
    const candidate = snapDoorToWall(clampToRoom({
      ...selected,
      x: Number($("objectX").value) || 0,
      y: Number($("objectY").value) || 0,
    }));
    if (!canPlace(candidate, selected.id)) {
      status(
        insideRoom(candidate)
          ? "ตำแหน่งนี้มีเฟอร์นิเจอร์อยู่แล้ว"
          : "ตำแหน่งนี้เกินขอบห้อง",
      );
      updateEditor();
      return;
    }
    snapshot();
    selected.x = candidate.x;
    selected.y = candidate.y;
    selected.rot = candidate.rot;
    draw();
    updateEditor();
  }
  $("objectX").addEventListener("change", updatePosition);
  $("objectY").addEventListener("change", updatePosition);
  $("rotateLeft").addEventListener("click", () => rotate(-Math.PI / 12));
  $("rotateRight").addEventListener("click", () => rotate(Math.PI / 12));
  function rotate(a) {
    if (!selected) return;
    const candidate = { ...selected, rot: (selected.rot || 0) + a };
    if (!canPlace(candidate, selected.id)) {
      status(
        insideRoom(candidate)
          ? "หมุนไม่ได้ เพราะเฟอร์นิเจอร์จะชนกัน"
          : "หมุนไม่ได้ เพราะเฟอร์นิเจอร์จะเกินขอบห้อง",
      );
      return;
    }
    snapshot();
    selected.rot = candidate.rot;
    draw();
  }
  $("deleteBtn").addEventListener("click", () => {
    if (!selected) return;
    snapshot();
    items = items.filter((i) => i.id !== selected.id);
    selected = null;
    draw();
    updateEditor();
    status("ลบเฟอร์นิเจอร์แล้ว");
  });
  $("undoBtn").addEventListener("click", () => {
    const last = history.pop();
    if (!last) {
      status("ไม่มีรายการให้ย้อนกลับ");
      return;
    }
    const s = JSON.parse(last);
    room = s.room;
    items = s.items;
    selected = items.find((i) => i.id === s.selectedId) || null;
    $("roomW").value = room.w;
    $("roomH").value = room.h;
    $("floorColor").value = room.floor;
    $("wallColor").value = room.wall;
    $("showGrid").checked = room.grid;
    document
      .querySelectorAll(".style-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.style === room.style),
      );
    $("roomTitle").textContent = "ห้องของฉัน";
    resizeCanvas();
    updateEditor();
    status("ย้อนกลับแล้ว");
  });
  function project() {
    return { version: 1, room, items, updatedAt: new Date().toISOString() };
  }
  $("saveBtn").addEventListener("click", () => {
    try {
      localStorage.setItem("roomStudioProject", JSON.stringify(project()));
      status("บันทึกแบบไว้ในเบราว์เซอร์แล้ว");
    } catch (e) {
      status("บันทึกไม่สำเร็จ");
    }
  });
  $("loadBtn").addEventListener("click", () => {
    const raw = localStorage.getItem("roomStudioProject");
    if (!raw) {
      status("ยังไม่มีแบบที่บันทึกไว้");
      return;
    }
    try {
      snapshot();
      const p = JSON.parse(raw);
      room = p.room;
      items = p.items || [];
      selected = null;
      $("roomW").value = room.w;
      $("roomH").value = room.h;
      $("floorColor").value = room.floor;
      $("wallColor").value = room.wall;
      $("showGrid").checked = room.grid;
      document
        .querySelectorAll(".style-btn")
        .forEach((b) =>
          b.classList.toggle("active", b.dataset.style === room.style),
        );
      $("roomTitle").textContent = "ห้องของฉัน";
      resizeCanvas();
      updateEditor();
      status("โหลดแบบสำเร็จ");
    } catch (e) {
      status("ไฟล์บันทึกเสียหาย");
    }
  });
  $("newBtn").addEventListener("click", () => {
    if (!confirm("เริ่มแบบใหม่และลบเฟอร์นิเจอร์ทั้งหมดหรือไม่?")) return;
    snapshot();
    items = [];
    selected = null;
    room = {
      w: 3.5,
      h: 3.5,
      floor: palettes.modern.floor,
      wall: palettes.modern.wall,
      style: "modern",
      grid: true,
    };
    $("roomTitle").textContent = "ห้องของฉัน";
    $("roomW").value = 3.5;
    $("roomH").value = 3.5;
    $("floorColor").value = room.floor;
    $("wallColor").value = room.wall;
    $("showGrid").checked = true;
    document
      .querySelectorAll(".style-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.style === "modern"),
      );
    resizeCanvas();
    updateEditor();
    status("สร้างห้องใหม่แล้ว");
  });
  $("exportBtn").addEventListener("click", () => {
    const old = selected;
    selected = null;
    draw();
    const a = document.createElement("a");
    a.download = "room-studio-plan.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    selected = old;
    draw();
    status("ส่งออกแปลนเป็น PNG แล้ว");
  });
  $("view2dBtn").addEventListener("click", () => {
    $("canvas2dWrap").style.display = "grid";
    $("view3dWrap").style.display = "none";
    $("view2dBtn").classList.add("primary");
    $("view3dBtn").classList.remove("primary");
    $("bottomHint").textContent =
      "คลิกเพื่อเลือก · ลากเพื่อย้าย · ลากจุดมุมสีเขียวเพื่อปรับขนาด · ใช้แผงด้านขวาเพื่อหมุนหรือลบ";
    resizeCanvas();
  });
  $("view3dBtn").addEventListener("click", () => {
    $("canvas2dWrap").style.display = "none";
    $("view3dWrap").style.display = "block";
    $("view3dBtn").classList.add("primary");
    $("view2dBtn").classList.remove("primary");
    $("bottomHint").textContent =
      "ลากเฟอร์นิเจอร์เพื่อย้าย · ปรับขนาดในแปลน 2D · ลากพื้นที่ว่างเพื่อหมุน · เลื่อนเพื่อซูม";
    try {
      if (!renderer3d) init3D();
      else resize3D();
      render3D();
    } catch (e) {
      $("view2dBtn").click();
      status("อุปกรณ์นี้เปิดมุมมอง 3D ไม่ได้ จึงแสดงแปลน 2D แทน");
    }
  });
  $("plan3d").addEventListener("pointerdown", (e) => {
    if (!renderer3d || e.button !== 0) return;
    const r = renderer3d.domElement.getBoundingClientRect();
    mouse3d.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse3d.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster3d.setFromCamera(mouse3d, camera3d);
    const hits = raycaster3d.intersectObjects(
      objectMeshes.map((o) => o.mesh),
      true,
    );
    let found = null;
    if (hits.length) {
      let mesh = hits[0].object;
      while (mesh && !mesh.userData.itemId) mesh = mesh.parent;
      found = items.find((it) => it.id === mesh?.userData.itemId) || null;
    }
    if (found) {
      selected = found;
      dragging3d = {
        id: found.id,
        startX: e.clientX,
        startY: e.clientY,
        startLift: Number(found.lift) || 0,
        moved: false,
      };
      controls3d.enabled = false;
      renderer3d.domElement.setPointerCapture(e.pointerId);
      updateEditor();
      draw();
    } else {
      selected = null;
      updateEditor();
      draw();
    }
  });
  $("plan3d").addEventListener("pointermove", (e) => {
    if (!dragging3d || !renderer3d) return;
    const point = pointerToFloor(e);
    if (!point) return;
    const it = items.find((i) => i.id === dragging3d.id);
    if (!it) return;
    if (
      !dragging3d.moved &&
      Math.abs(e.clientX - dragging3d.startX) +
        Math.abs(e.clientY - dragging3d.startY) >
        3
    ) {
      snapshot();
      dragging3d.moved = true;
    }
    if (!dragging3d.moved) return;
    // Drag vertically with the mouse while keeping the object on its current floor position.
    if (it.kind === "tv" && e.shiftKey) {
      it.lift = Math.max(0, Math.min(2.4, dragging3d.startLift + (dragging3d.startY - e.clientY) * 0.012));
      $("objectLift").value = it.lift.toFixed(1);
      draw();
      return;
    }
    let candidate = clampToRoom({
      ...it,
      x: point.x - it.w / 2,
      y: point.z - it.h / 2,
    });
    candidate = snapDoorToWall(candidate);
    // Snap furniture to a wall when it is dragged close to the room edge.
    const snap = 0.35;
    if (candidate.kind !== "door" && candidate.kind !== "window" && Math.abs(candidate.rot || 0) < 0.001) {
      if (candidate.x < snap) candidate.x = 0;
      if (room.w - (candidate.x + candidate.w) < snap) candidate.x = room.w - candidate.w;
      if (candidate.y < snap) candidate.y = 0;
      if (room.h - (candidate.y + candidate.h) < snap) candidate.y = room.h - candidate.h;
    }
    if (canPlace(candidate, it.id)) {
      it.x = candidate.x;
      it.y = candidate.y;
      it.rot = candidate.rot;
    }
    $("objectX").value = it.x.toFixed(1);
    $("objectY").value = it.y.toFixed(1);
    draw();
  });
  function endDrag3D() {
    if (!dragging3d) return;
    const moved = dragging3d.moved;
    dragging3d = null;
    if (controls3d) controls3d.enabled = true;
    if (moved) status("ย้ายเฟอร์นิเจอร์ในมุมมอง 3D แล้ว");
  }
  $("plan3d").addEventListener("pointerup", endDrag3D);
  $("plan3d").addEventListener("pointercancel", endDrag3D);
  function render3D() {
    if (!scene3d) return;
    if (framedRoom3D !== `${room.w}x${room.h}`) frameCamera3D();
    updateRoomLighting3D();
    // While dragging in 3D, update existing object transforms only.
    // Rebuilding the entire scene on every pointermove causes visible flicker.
    if (dragging3d) {
      objectMeshes.forEach(({ mesh, it }) => {
        mesh.position.set(it.x + it.w / 2, Number(it.lift) || 0, it.y + it.h / 2);
        mesh.rotation.y = -(it.rot || 0);
      });
      return;
    }
    while (scene3d.children.length > 3) {
      const o = scene3d.children[3];
      scene3d.remove(o);
      o.traverse?.((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
          if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
          else n.material.dispose();
        }
      });
    }
    objectMeshes = [];
    const mat = (color, roughness = 0.85) =>
      new THREE.MeshStandardMaterial({ color: color || "#b5a18a", roughness });
    function box(parent, w, h, d, color, x, y, z) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(0.04, w),
          Math.max(0.04, h),
          Math.max(0.04, d),
        ),
        mat(color),
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function flatBox(parent, w, h, d, color, x, y, z) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(0.04, w),
          Math.max(0.04, h),
          Math.max(0.04, d),
        ),
        mat(color || "#b5a18a", 0.9),
      );
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function cylinder(parent, top, bottom, h, color, x, y, z) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(top, bottom, h, 16),
        mat(color),
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    flatBox(
      scene3d,
      room.w,
      0.12,
      room.h,
      room.floor,
      room.w / 2,
      -0.06,
      room.h / 2,
    );
    const wallH = 2.6,
      th = 0.12;
    const wallWindows = { top: [], left: [], right: [] };
    items.forEach((it) => {
      const side = windowWall(it);
      if (!side || side === "bottom") return;
      const center = side === "top" ? it.x + it.w / 2 : it.y + it.h / 2;
      wallWindows[side].push([
        center - it.w * 0.45 * 0.95,
        center + it.w * 0.45 * 0.95,
      ]);
    });
    function wallSection(side, start, end, low, high) {
      if (end - start < 0.04 || high - low < 0.04) return;
      const horizontal = side === "top";
      flatBox(
        scene3d,
        horizontal ? end - start : th,
        high - low,
        horizontal ? th : end - start,
        room.wall,
        horizontal ? (start + end) / 2 : side === "left" ? 0 : room.w,
        (low + high) / 2,
        horizontal ? 0 : (start + end) / 2,
      );
    }
    function buildWall(side) {
      const length = side === "top" ? room.w : room.h;
      let cursor = 0;
      wallWindows[side]
        .sort((a, b) => a[0] - b[0])
        .forEach(([from, to]) => {
          const start = Math.max(cursor, Math.min(length, from)),
            end = Math.max(start, Math.min(length, to));
          wallSection(side, cursor, start, 0, wallH);
          wallSection(side, start, end, 0, 0.94);
          wallSection(side, start, end, 2.06, wallH);
          cursor = end;
        });
      wallSection(side, cursor, length, 0, wallH);
    }
    buildWall("top");
    buildWall("left");
    buildWall("right");
    box(scene3d, room.w - th, 0.16, 0.025, "#fffdf8", room.w / 2, 0.08, 0.07);
    box(scene3d, 0.025, 0.16, room.h - th, "#fffdf8", 0.07, 0.08, room.h / 2);
    box(
      scene3d,
      0.025,
      0.16,
      room.h - th,
      "#fffdf8",
      room.w - 0.07,
      0.08,
      room.h / 2,
    );
    items.forEach((it) => {
      const group = new THREE.Group();
      group.position.set(it.x + it.w / 2, Number(it.lift) || 0, it.y + it.h / 2);
      group.rotation.y = -(it.rot || 0);
      group.userData.itemId = it.id;
      scene3d.add(group);
      objectMeshes.push({ mesh: group, it });
      const buildFurniture = () => {
        const modelUrl = glbModels[it.kind];
        if (modelUrl) {
          loadGLB(modelUrl).then((sourceModel) => {
            // ฉากอาจถูกวาดใหม่ระหว่างโหลด ให้เพิ่มโมเดลเฉพาะกลุ่มที่ยังอยู่ในฉาก
            if (group.parent !== scene3d || group.userData.glbLoaded) return;
            const model = sourceModel.clone(true);
            if (it.kind === "bed") model.rotation.y -= Math.PI / 2;
            else if (it.kind === "sofa") model.rotation.y += Math.PI / 2;
            else if (it.kind === "window") model.rotation.y -= Math.PI / 2;
            const box3 = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box3.getSize(size);
            const maxXZ = Math.max(size.x, size.z, 0.001);
            const targetXZ = Math.max(it.w, it.h);
            const scale = targetXZ / maxXZ;
            model.scale.multiplyScalar(scale);
            let scaledBox = new THREE.Box3().setFromObject(model);
            if (it.kind === "window") {
              const scaledSize = new THREE.Vector3();
              scaledBox.getSize(scaledSize);
              model.scale.y *= 1.12 / scaledSize.y;
              scaledBox = new THREE.Box3().setFromObject(model);
            }
            model.position.x -= (scaledBox.min.x + scaledBox.max.x) / 2;
            model.position.y += (it.kind === "window" ? 0.94 : 0) - scaledBox.min.y;
            model.position.z -= (scaledBox.min.z + scaledBox.max.z) / 2;
            model.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            group.clear();
            group.add(model);
            if (it.kind === "window" && windowWall(it))
              addWindowExterior(group, it.w);
            group.userData.glbLoaded = true;
          }).catch((error) => {
            console.warn(`โหลดโมเดล ${modelUrl} ไม่สำเร็จ ใช้โมเดลสำรองแทน`, error);
          });
        }
        const w = it.w,
          d = it.h,
          c = it.color;
        if (it.kind === "bed") {
          box(group, w * 0.96, 0.22, d * 0.96, "#89694e", 0, 0.2, 0);
          box(group, w * 0.94, 0.2, d * 0.9, "#f7f2e9", 0, 0.41, 0);
          box(group, w * 0.94, 0.09, d * 0.56, c, 0, 0.54, d * 0.15);
          box(group, w * 0.98, 0.72, 0.1, "#89694e", 0, 0.56, -d * 0.46);
          for (const x of [-0.25, 0.25])
            box(group, w * 0.4, 0.1, d * 0.14, "#fffdf8", x * w, 0.57, -d * 0.31);
          for (const x of [-0.42, 0.42])
            for (const z of [-0.42, 0.42])
              box(group, 0.07, 0.16, 0.07, "#76583f", x * w, 0.08, z * d);
        } else if (it.kind === "sofa") {
          box(group, w * 0.9, 0.28, d * 0.86, "#765f50", 0, 0.2, 0);
          box(group, w * 0.82, 0.22, d * 0.66, c, 0, 0.42, d * 0.08);
          box(group, w * 0.9, 0.52, 0.14, c, 0, 0.62, -d * 0.39);
          box(group, 0.16, 0.43, d * 0.9, c, -w * 0.42, 0.43, 0);
          box(group, 0.16, 0.43, d * 0.9, c, w * 0.42, 0.43, 0);
          for (const x of [-0.21, 0.21]) {
            box(group, w * 0.38, 0.12, d * 0.5, "#d6ded7", x * w, 0.57, 0.04);
            box(group, w * 0.38, 0.32, 0.1, "#d6ded7", x * w, 0.72, -d * 0.31);
          }
          for (const x of [-0.4, 0.4])
            for (const z of [-0.32, 0.32])
              box(group, 0.05, 0.12, 0.05, "#5c493b", x * w, 0.06, z * d);
        } else if (it.kind === "plant") {
          cylinder(group, d * 0.22, d * 0.16, 0.3, "#b87852", 0, 0.15, 0);
          cylinder(group, d * 0.22, d * 0.22, 0.035, "#5f4737", 0, 0.31, 0);
          for (const [x, y, z, s] of [
            [0, 0.55, 0, 0.22],
            [-0.13, 0.48, 0.03, 0.17],
            [0.13, 0.5, -0.03, 0.18],
            [0, 0.69, 0.03, 0.16],
            [-0.04, 0.57, -0.12, 0.15],
          ]) {
            const leaf = new THREE.Mesh(
              new THREE.SphereGeometry(s, 12, 10),
              mat(c || "#548260"),
            );
            leaf.position.set(x, y, z);
            leaf.scale.set(0.8, 1.3, 0.8);
            leaf.castShadow = true;
            group.add(leaf);
          }
        } else if (it.kind === "chair") {
          box(group, w * 0.9, 0.1, d * 0.9, c, 0, 0.44, 0);
          box(group, w * 0.9, 0.42, 0.09, c, 0, 0.68, -d * 0.4);
          for (const x of [-0.38, 0.38])
            for (const z of [-0.35, 0.35])
              box(group, 0.045, 0.42, 0.045, "#6c5848", x * w, 0.21, z * d);
        } else if (it.kind === "lamp") {
          cylinder(group, 0.14, 0.17, 0.045, "#77736b", 0, 0.02, 0);
          cylinder(group, 0.025, 0.035, 1.2, "#77736b", 0, 0.64, 0);
          cylinder(group, 0.09, 0.22, 0.28, c || "#d9bd6b", 0, 1.36, 0);
          cylinder(group, 0.06, 0.06, 0.04, "#fff1bd", 0, 1.2, 0);
        } else if (it.kind === "window") {
          const frame = "#f4f2ec";
          box(group, w, 0.07, 0.08, frame, 0, 2.02, 0);
          box(group, w, 0.07, 0.08, frame, 0, 0.98, 0);
          box(group, 0.07, 1.08, 0.08, frame, -w / 2 + 0.035, 1.5, 0);
          box(group, 0.07, 1.08, 0.08, frame, w / 2 - 0.035, 1.5, 0);
          if (windowWall(it)) addWindowExterior(group, w);
          const pane = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.88, 0.9, 0.025),
            new THREE.MeshStandardMaterial({
              color: "#ffffff",
              roughness: 0.15,
              metalness: 0.1,
              transparent: true,
              opacity: 0.12,
              depthWrite: false,
            }),
          );
          pane.position.set(0, 1.5, 0);
          group.add(pane);
          box(group, 0.035, 0.9, 0.035, frame, 0, 1.5, -0.025);
        } else if (it.kind === "door") {
          box(group, w, 2.05, 0.07, c, 0, 1.025, 0);
          box(group, w * 0.72, 1.72, 0.025, "#a87b58", 0, 1.1, -0.048);
          const knob = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 12, 10),
            mat("#d8b46a", 0.35),
          );
          knob.position.set(w * 0.34, 1, -0.06);
          group.add(knob);
        } else if (it.kind === "rug") {
          flatBox(group, w, 0.025, d, c, 0, 0.015, 0);
          flatBox(group, w * 0.88, 0.008, 0.018, "#f2e9dc", 0, 0.033, -d * 0.4);
          flatBox(group, w * 0.88, 0.008, 0.018, "#f2e9dc", 0, 0.033, d * 0.4);
        } else if (it.kind === "desk" || it.kind === "dining") {
          box(group, w, 0.08, d, c, 0, 0.74, 0);
          box(group, w * 0.82, 0.12, 0.06, "#815f43", 0, 0.63, -d * 0.38);
          for (const x of [-0.42, 0.42])
            for (const z of [-0.38, 0.38])
              box(group, 0.06, 0.7, 0.06, "#7b6047", x * w, 0.35, z * d);
          if (it.kind === "desk")
            box(group, w * 0.34, 0.09, d * 0.3, "#a87953", 0, 0.61, -d * 0.3);
        } else if (it.kind === "tv") {
          box(group, w, 0.42, d, c, 0, 0.23, 0);
          box(group, w * 0.78, 0.46, 0.045, "#171a19", 0, 0.78, -d / 2 - 0.025);
          box(group, w * 0.73, 0.4, 0.008, "#70858a", 0, 0.79, -d / 2 - 0.051);
          box(group, w * 0.22, 0.025, d * 0.65, "#4c4036", -w * 0.3, 0.46, 0);
          box(group, w * 0.22, 0.025, d * 0.65, "#4c4036", w * 0.3, 0.46, 0);
        } else if (it.kind === "wardrobe") {
          box(group, w, 2, d, c, 0, 1, 0);
          box(group, 0.018, 1.86, 0.018, "#76583f", 0, 1, -d / 2 - 0.012);
          for (const x of [-0.08, 0.08])
            box(group, 0.025, 0.06, 0.025, "#d9bd8c", x, 1, -d / 2 - 0.03);
        } else {
          box(group, w, 0.75, d, c, 0, 0.375, 0);
        }
      };
      buildFurniture();
    });
  }
  window.addEventListener("resize", () => {
    resizeCanvas();
    resize3D();
  });
  window.addEventListener("keydown", (e) => {
    const key = e.code.slice(3).toLowerCase(),
      active = document.activeElement,
      typing =
        active.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
    if (
      $("view3dWrap").style.display !== "none" &&
      ["w", "a", "s", "d", "q", "e"].includes(key) &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      !typing
    ) {
      cameraKeys3D.add(key);
      e.preventDefault();
    }
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selected &&
      document.activeElement.tagName !== "INPUT"
    ) {
      snapshot();
      items = items.filter((i) => i.id !== selected.id);
      selected = null;
      draw();
      updateEditor();
    }
    if (e.key === "Escape") {
      selected = null;
      updateEditor();
      draw();
    }
  });
  window.addEventListener("keyup", (e) => cameraKeys3D.delete(e.code.slice(3).toLowerCase()));
  window.addEventListener("blur", () => cameraKeys3D.clear());
  resizeCanvas();
  updateEditor();
  $("view3dBtn").click();
})();
