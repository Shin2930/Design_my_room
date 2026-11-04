import * as THREE from "three";
import { importedModels } from "./assets/models/catalog.js?v=20261106-import-model";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/utils/SkeletonUtils.js";

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
    tv: { name: "ชั้นวางทีวี", w: 1.2, h: 0.4, color: "#8c8277", kind: "tv", placeableOn: ["table"] },
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
    w: 8,
    h: 8,
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
    wallMeshes3D = [],
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
  // วางไฟล์ .glb ไว้ในโฟลเดอร์ assets/models/<ประเภท> แล้วตั้ง path ให้ตรงกับรายการนี้
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
  function addWindowExterior(parent, width, round = false) {
    const exterior = new THREE.Mesh(
      round
        ? new THREE.CircleGeometry(width * 0.44, 32)
        : new THREE.PlaneGeometry(width * 0.88 * 0.9 * 0.95, 0.9),
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
    bed: "assets/models/beds/bed.glb",
    sofa: "assets/models/sofas/sofa.glb",
    desk: "assets/models/tables/modern_table.glb",
    dining: "assets/models/tables/modern_table.glb",
    wardrobe: "assets/models/wardrobes/wardrobe.glb",
    tv: "assets/models/tvs/tv.glb",
    plant: "assets/models/plants/plant_pot.glb",
    rug: "assets/models/rugs/carpet.glb",
    chair: "assets/models/chairs/modern_chair.glb",
    lamp: "assets/models/lamps/lamp.glb",
    window: "assets/models/windows/window.glb",
    door: "assets/models/doors/modern_door.glb",
  };
  const normalizeModelUrl = (url) => {
    const value = String(url || "");
    try {
      return decodeURIComponent(value).replace(/\\/g, "/").toLowerCase();
    } catch {
      return value.replace(/\\/g, "/").toLowerCase();
    }
  };
  const importedModelOptions = new Map(
    importedModels.map((model) => [normalizeModelUrl(model.model), model]),
  );
  const defaultBedModelUrl = normalizeModelUrl(glbModels.bed);
  const isDefaultBed = (it) =>
    it.kind === "bed" &&
    normalizeModelUrl(it.modelUrl || glbModels.bed) === defaultBedModelUrl;
  const malfoyModelUrl = importedModels.find((model) => model.id === "malfoy_character")?.model;
  const standardBedHeight = 0.95;
  const bedFloorInset = 0.04;
  const getBedFloorInset = (it) =>
    it.kind === "bed"
      ? normalizeModelUrl(it.modelUrl || glbModels.bed) === defaultBedModelUrl
        ? 0.65
        : bedFloorInset
      : 0;
  const standardTvHeight = 0.85;
  const standardChairHeight = 1.0;
  const standardLampHeight = 1.5;
  let bedContactShadowTexture3D = null;
  const getImportedModelOptions = (url) => {
    const normalizedUrl = normalizeModelUrl(url);
    return importedModelOptions.get(normalizedUrl)
      || importedModels.find((model) => {
        const catalogUrl = normalizeModelUrl(model.model);
        return normalizedUrl.endsWith(catalogUrl) || catalogUrl.endsWith(normalizedUrl);
      });
  };
  const glbCache = new Map();
  const previewModelCache = new Map();
  const modelLoadStates = new Map();
  const modelLabels = {
    bed: "เตียง", sofa: "โซฟา", desk: "โต๊ะทำงาน", dining: "โต๊ะอาหาร",
    wardrobe: "ตู้เสื้อผ้า", tv: "โทรทัศน์",
    plant: "ต้นไม้", rug: "พรม", chair: "เก้าอี้", lamp: "โคมไฟ",
    window: "หน้าต่าง", door: "ประตู", table: "โต๊ะ", decor: "อุปกรณ์และของตกแต่ง", character: "ตัวละคร",
  };
  function updateModelLoadUI(state) {
    const list = $("modelLoadList");
    if (!list) return;
    if (state.status === "ready") {
      state.row?.remove();
      state.row = null;
      if (!list.querySelector(".model-load-item")) {
        let empty = list.querySelector(".model-load-empty");
        if (!empty) {
          empty = document.createElement("p");
          empty.className = "model-load-empty";
          list.append(empty);
        }
        empty.textContent = "ไม่มีโมเดลที่กำลังโหลด";
      }
      return;
    }
    if (!state.row) {
      list.querySelector(".model-load-empty")?.remove();
      state.row = document.createElement("div");
      state.row.className = "model-load-item";
      state.name = document.createElement("div");
      state.name.className = "model-load-name";
      state.progress = document.createElement("progress");
      state.progress.max = 100;
      state.progress.className = "model-load-progress";
      state.detail = document.createElement("div");
      state.detail.className = "model-load-detail";
      state.row.append(state.name, state.progress, state.detail);
      list.append(state.row);
    }
    const labels = [...state.kinds].map((kind) => modelLabels[kind] || kind);
    state.name.textContent = labels.join(" / ");
    state.row.dataset.status = state.status;
    if (state.status === "loading" && state.total > 0) {
      const percent = Math.min(100, Math.round((state.loaded / state.total) * 100));
      state.progress.value = percent;
      state.detail.textContent = `กำลังโหลด ${percent}%`;
    } else if (state.status === "loading") {
      state.progress.removeAttribute("value");
      state.detail.textContent = "กำลังโหลด";
    } else {
      state.progress.value = 100;
      state.detail.textContent = "โหลดไม่สำเร็จ";
    }
  }
  function loadGLB(url, kind) {
    let state = modelLoadStates.get(url);
    if (!state) {
      state = { kinds: new Set(), status: "loading", loaded: 0, total: 0 };
      modelLoadStates.set(url, state);
    }
    if (kind) state.kinds.add(kind);
    if (state.status !== "ready") updateModelLoadUI(state);
    if (!glbCache.has(url)) {
      glbCache.set(url, new Promise((resolve, reject) => {
        gltfLoader.load(url, (gltf) => {
          state.status = "ready";
          updateModelLoadUI(state);
          resolve(gltf.scene);
        }, (event) => {
          state.loaded = event.loaded || 0;
          state.total = event.total || 0;
          updateModelLoadUI(state);
        }, (error) => {
          state.status = "error";
          updateModelLoadUI(state);
          reject(error);
        });
      }));
    }
    return glbCache.get(url);
  }
  const previewJobs = [];
  let previewJobActive = false, previewRenderer, previewScene, previewCamera;
  function renderModelPreview(image, url) {
    if (!url || image.dataset.previewQueued) return;
    image.dataset.previewQueued = "true";
    previewJobs.push(async () => {
      try {
        if (!previewModelCache.has(url)) previewModelCache.set(url, new Promise((resolve, reject) =>
          gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject),
        ));
        const source = await previewModelCache.get(url),
          model = SkeletonUtils.clone(source),
          bounds = new THREE.Box3().setFromObject(model),
          size = bounds.getSize(new THREE.Vector3()),
          center = bounds.getCenter(new THREE.Vector3()),
          scale = 2.2 / Math.max(size.x, size.y, size.z, 0.001);
        model.scale.multiplyScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.rotation.y += Math.PI / 5;
        if (!previewRenderer) {
          previewRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
          previewRenderer.setSize(96, 96);
          previewRenderer.setClearColor("#f3f5f6");
          previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
          previewScene = new THREE.Scene();
          previewScene.add(new THREE.HemisphereLight(0xffffff, 0x77716a, 2));
          const light = new THREE.DirectionalLight(0xffffff, 2);
          light.position.set(3, 5, 4);
          previewScene.add(light);
          previewCamera = new THREE.PerspectiveCamera(36, 1, 0.01, 20);
          previewCamera.position.set(2.5, 1.8, 2.5);
          previewCamera.lookAt(0, 0, 0);
        }
        previewScene.add(model);
        previewRenderer.render(previewScene, previewCamera);
        image.src = previewRenderer.domElement.toDataURL("image/webp", 0.82);
        previewScene.remove(model);
      } catch {
        image.classList.add("preview-unavailable");
      }
    });
    if (!previewJobActive) {
      previewJobActive = true;
      const next = async () => {
        const job = previewJobs.shift();
        if (job) {
          await job();
          requestAnimationFrame(next);
        } else previewJobActive = false;
      };
      requestAnimationFrame(next);
    }
  }
  const previewObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        previewObserver.unobserve(target);
        renderModelPreview(target, target.dataset.previewModel);
      }), { rootMargin: "120px" })
    : null;
  function catalogPreview(container, modelUrl, imageUrl) {
    const image = document.createElement("img");
    image.className = "model-preview";
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    if (imageUrl) {
      image.src = `${imageUrl}?v=20261104-preview-fill`;
      image.addEventListener("error", () => renderModelPreview(image, modelUrl), { once: true });
    } else {
      image.dataset.previewModel = modelUrl || "";
      if (previewObserver) previewObserver.observe(image);
      else renderModelPreview(image, modelUrl);
    }
    container.replaceChildren(image);
  }
  function normalizeTvWomanHead(model) {
    const pants = model.getObjectByName("Object_120");
    const headParts = ["Object_122", "Object_123"]
      .map((name) => model.getObjectByName(name))
      .filter((node) => node?.isSkinnedMesh);
    if (!pants?.isSkinnedMesh || headParts.length !== 2) return;

    model.updateMatrixWorld(true);
    pants.skeleton.update();
    headParts.forEach((node) => node.skeleton.update());

    const bodyBounds = new THREE.Box3().setFromObject(pants);
    const headBounds = new THREE.Box3().makeEmpty();
    headParts.forEach((node) => headBounds.union(new THREE.Box3().setFromObject(node)));
    const bodySize = bodyBounds.getSize(new THREE.Vector3());
    const headSize = headBounds.getSize(new THREE.Vector3());
    if (bodyBounds.isEmpty() || headBounds.isEmpty() || bodySize.x < 0.001) return;

    const headScale = Math.min(
      1,
      (Math.max(bodySize.x, bodySize.z) * 0.82) / Math.max(headSize.x, headSize.z, 0.001),
    );
    const headCenter = headBounds.getCenter(new THREE.Vector3());
    const bodyCenter = bodyBounds.getCenter(new THREE.Vector3());
    const targetHeadCenter = new THREE.Vector3(
      bodyCenter.x,
      bodyBounds.max.y + headSize.y * headScale * 0.52,
      bodyCenter.z,
    );
    const headPivot = new THREE.Group();
    headPivot.name = "tvWomanHeadPivot";
    headPivot.position.copy(targetHeadCenter);
    headPivot.rotation.y = Math.PI;
    model.add(headPivot);

    headParts.forEach((node) => {
      const geometry = node.geometry.clone();
      const sourcePositions = node.geometry.attributes.position;
      const targetPositions = geometry.attributes.position;
      const point = new THREE.Vector3();
      for (let index = 0; index < sourcePositions.count; index += 1) {
        point.fromBufferAttribute(sourcePositions, index);
        node.applyBoneTransform(index, point);
        point.applyMatrix4(node.matrixWorld);
        point.sub(headCenter).multiplyScalar(headScale);
        targetPositions.setXYZ(index, point.x, point.y, point.z);
      }
      geometry.deleteAttribute("skinIndex");
      geometry.deleteAttribute("skinWeight");
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      const normalizedHeadPart = new THREE.Mesh(geometry, node.material);
      normalizedHeadPart.name = node.name;
      normalizedHeadPart.castShadow = true;
      normalizedHeadPart.receiveShadow = true;
      normalizedHeadPart.frustumCulled = false;
      headPivot.add(normalizedHeadPart);
      node.visible = false;
    });
    model.updateMatrixWorld(true);
  }
  function getVisibleMeshBounds(root) {
    const bounds = new THREE.Box3().makeEmpty();
    root.traverse((node) => {
      if (!node.isMesh) return;
      for (let parent = node; parent; parent = parent.parent) {
        if (!parent.visible) return;
      }
      if (node.isSkinnedMesh) {
        node.skeleton.update();
        node.computeBoundingBox();
      }
      bounds.union(new THREE.Box3().setFromObject(node));
    });
    return bounds;
  }
  function bendMalfoyUpperArms(model) {
    const bendAngle = THREE.MathUtils.degToRad(-65);
    const normalizeBoneName = (name) => name.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const armBoneNames = new Set(
      ["Right_arm_0240", "Left_arm_082"].map(normalizeBoneName),
    );
    const armBones = new Map();
    model.traverse((node) => {
      if (!node.isSkinnedMesh || !node.skeleton) return;
      node.skeleton.bones.forEach((bone) => {
        const normalizedName = normalizeBoneName(bone.name);
        if (armBoneNames.has(normalizedName)) armBones.set(normalizedName, bone);
      });
    });
    armBones.forEach((bone) => {
      bone.rotation.x = bendAngle;
    });
    model.updateMatrixWorld(true);
    model.traverse((node) => {
      if (node.isSkinnedMesh) node.skeleton.update();
    });
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
    wallMeshes3D.forEach(({ mesh, side }) => {
      const outside =
        (side === "top" && camera3d.position.z < 0) ||
        (side === "left" && camera3d.position.x < 0) ||
        (side === "right" && camera3d.position.x > room.w) ||
        (side === "bottom" && camera3d.position.z > room.h);
      const material = mesh.material;
      if (material.transparent !== outside) {
        material.transparent = outside;
        material.depthWrite = !outside;
        material.needsUpdate = true;
      }
      material.opacity = outside ? 0.24 : 1;
    });
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
    // Walls are 0.12 m thick and their centers sit on the room boundary,
    // so usable space starts/ends 0.06 m inside. Keep furniture from overlapping.
    const wallInset = 0.06;
    const c = Math.abs(Math.cos(it.rot || 0)),
      s = Math.abs(Math.sin(it.rot || 0)),
      halfW = (c * it.w + s * it.h) / 2,
      halfH = (s * it.w + c * it.h) / 2,
      cx = Math.max(halfW + wallInset, Math.min(room.w - halfW - wallInset, it.x + it.w / 2)),
      cy = Math.max(halfH + wallInset, Math.min(room.h - halfH - wallInset, it.y + it.h / 2));
    return { ...it, x: cx - it.w / 2, y: cy - it.h / 2 };
  }
  function snapDoorToWall(it) {
    if (it.kind !== "door" && it.kind !== "window" && !it.wallMountable) return it;
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
    const wallMountHeight = it.wallMountable ? { lift: it.lift ?? 1.5 } : {};
    let rot = 0;
    if (wall === "left" || wall === "right") {
      rot = wall === "left" ? -Math.PI / 2 : Math.PI / 2;
      const x = wall === "left" ? it.h / 2 : room.w - it.h / 2,
        y = Math.max(it.w / 2, Math.min(room.h - it.w / 2, cy));
      return { ...it, ...wallMountHeight, x: x - it.w / 2, y: y - it.h / 2, rot };
    }
    rot = wall === "top" ? 0 : Math.PI;
    const x = Math.max(it.w / 2, Math.min(room.w - it.w / 2, cx)),
      y = wall === "top" ? it.h / 2 : room.h - it.h / 2;
    return { ...it, ...wallMountHeight, x: x - it.w / 2, y: y - it.h / 2, rot };
  }
  function snapDefaultBedHeadboardToWall(it) {
    if (!isDefaultBed(it)) return it;
    const wallInset = 0.06,
      snapDistance = 0.35,
      rot = it.rot || 0,
      centerX = it.x + it.w / 2,
      centerY = it.y + it.h / 2,
      // The default model is normalized so its headboard points along local -Y.
      headboardX = centerX + Math.sin(rot) * (it.h / 2),
      headboardY = centerY - Math.cos(rot) * (it.h / 2),
      [wall, gap] = [
        ["left", headboardX - wallInset],
        ["right", room.w - wallInset - headboardX],
        ["top", headboardY - wallInset],
        ["bottom", room.h - wallInset - headboardY],
      ].reduce((closest, candidate) =>
        candidate[1] < closest[1] ? candidate : closest,
      );
    if (gap > snapDistance) return it;

    let snapped;
    if (wall === "left") {
      snapped = {
        ...it,
        rot: -Math.PI / 2,
        x: wallInset + it.h / 2 - it.w / 2,
      };
    } else if (wall === "right") {
      snapped = {
        ...it,
        rot: Math.PI / 2,
        x: room.w - wallInset - it.h / 2 - it.w / 2,
      };
    } else if (wall === "top") {
      snapped = { ...it, rot: 0, y: wallInset };
    } else {
      snapped = { ...it, rot: Math.PI, y: room.h - wallInset - it.h };
    }
    return clampToRoom(snapped);
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
  function wallMountSide(it) {
    if (!it.wallMountable) return null;
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
  const isRoundWindow = (it) =>
    it.windowShape === "round" || normalizeModelUrl(it.modelUrl || "").endsWith("round-window.glb");
  function insideRoom(it) {
    return corners(it).every(
      ([x, y]) =>
        x >= -0.0001 &&
        y >= -0.0001 &&
        x <= room.w + 0.0001 &&
        y <= room.h + 0.0001,
    );
  }
  const getSurfaceType = (it) =>
    it.surfaceType || (["desk", "dining", "table"].includes(it.kind) ? "table" : null);
  const getSurfaceHeight = (it) =>
    it.surfaceHeight == null
      ? (getSurfaceType(it) === "table" ? 0.75 : 0)
      : Number(it.surfaceHeight) || 0;
  const getPlaceableOn = (it) => it.placeableOn || (it.kind === "tv" ? ["table"] : []);
  function fitsOnSurface(it, surface) {
    if (!getPlaceableOn(it).includes(getSurfaceType(surface))) return false;
    const polygon = corners(surface),
      x = it.x + it.w / 2,
      y = it.y + it.h / 2;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }
  function moveWithSurface(it, from, to) {
    const oldRotation = from.rot || 0,
      newRotation = to.rot || 0,
      delta = newRotation - oldRotation,
      dx = it.x + it.w / 2 - (from.x + from.w / 2),
      dy = it.y + it.h / 2 - (from.y + from.h / 2),
      localX = dx * Math.cos(oldRotation) + dy * Math.sin(oldRotation),
      localY = -dx * Math.sin(oldRotation) + dy * Math.cos(oldRotation),
      worldX = localX * Math.cos(newRotation) - localY * Math.sin(newRotation),
      worldY = localX * Math.sin(newRotation) + localY * Math.cos(newRotation),
      centerX = to.x + to.w / 2,
      centerY = to.y + to.h / 2;
    return {
      ...it,
      x: centerX + worldX - it.w / 2,
      y: centerY + worldY - it.h / 2,
      rot: (it.rot || 0) + delta,
    };
  }
  function moveSupportedItems(from, to) {
    items.forEach((it) => {
      if (it.supportId === from.id) applyPlacement(it, moveWithSurface(it, from, to));
    });
  }
  function placeOnSurface(it) {
    const surface = [...items].reverse().find((other) =>
      other.id !== it.id && fitsOnSurface(it, other),
    );
    if (surface) return { ...it, supportId: surface.id };
    const { supportId, ...onFloor } = it;
    return onFloor;
  }
  function applyPlacement(target, source) {
    Object.assign(target, source);
    if (!Object.prototype.hasOwnProperty.call(source, "supportId"))
      delete target.supportId;
    return target;
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
    const attached = items.filter((it) => it.supportId === candidate.id),
      attachedIds = new Set(attached.map((it) => it.id)),
      sourceSurface = items.find((item) => item.id === candidate.id) || candidate,
      carried = attached.map((it) => moveWithSurface(it, sourceSurface, candidate));
    if (
      carried.some((it) => !insideRoom(it) || !fitsOnSurface(it, candidate)) ||
      items.some((other) =>
        other.id !== ignoreId && !attachedIds.has(other.id) && overlaps(candidate, other) &&
        !(candidate.supportId === other.id && fitsOnSurface(candidate, other)),
      )
    ) return false;
    for (let i = 0; i < carried.length; i++) {
      if (items.some((other) =>
        other.id !== ignoreId && !attachedIds.has(other.id) && overlaps(carried[i], other),
      )) return false;
      for (let j = i + 1; j < carried.length; j++)
        if (overlaps(carried[i], carried[j])) return false;
    }
    return true;
  }
  function findFreePosition(it) {
    const wallGap = 0.05,
      hasWallGap = (candidate) => corners(candidate).every(
        ([x, y]) => x >= wallGap && y >= wallGap
          && x <= room.w - wallGap && y <= room.h - wallGap,
      );
    const center = {
      x: (room.w - it.w) / 2,
      y: (room.h - it.h) / 2,
    };
    const centered = { ...it, ...center };
    if (hasWallGap(centered) && canPlace(centered, null)) return center;
    for (let y = wallGap; y <= room.h - it.h - wallGap + 0.001; y += 0.25)
      for (let x = wallGap; x <= room.w - it.w - wallGap + 0.001; x += 0.25) {
        const candidate = { ...it, x, y };
        if (hasWallGap(candidate) && canPlace(candidate, null)) return { x, y };
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
    if (isRoundWindow(it)) {
      ctx.beginPath();
      ctx.arc(2, 3, Math.max(5, Math.min(10, Math.min(w, h) * 0.45)), 0, Math.PI * 2);
      ctx.fill();
    } else {
      roundRect(ctx, -w / 2 + 2, -h / 2 + 3, w, h, Math.min(9, u * 0.08), ctx.fillStyle);
    }
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
      if (isRoundWindow(it)) {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(5, Math.min(10, Math.min(w, h) * 0.45)), 0, Math.PI * 2);
        ctx.fillStyle = "#d6edf5";
        ctx.fill();
        ctx.strokeStyle = "#6e9eae";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = "#d6edf5";
        ctx.fillRect(-w / 2, -Math.max(3, h / 2), w, Math.max(6, h));
        ctx.strokeStyle = "#6e9eae";
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -Math.max(3, h / 2), w, Math.max(6, h));
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(0, h / 2);
        ctx.stroke();
      }
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
  function draw(updateScene3D = true) {
    const detachIds = new Set(
      items
        .filter((it) => {
          if (!it.supportId) return false;
          const support = items.find((other) => other.id === it.supportId);
          return !support || !fitsOnSurface(it, support);
        })
        .map((it) => it.id),
    );
    if (detachIds.size)
      items.forEach((it) => {
        if (detachIds.has(it.id)) delete it.supportId;
      });
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
    const doorway = room.doorway || [room.w * 0.37, room.w * 0.63];
    ctx.fillRect(x - 7, y + h, doorway[0] * u + 7, 8);
    ctx.fillRect(x + doorway[1] * u, y + h, (room.w - doorway[1]) * u + 7, 8);
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
      if (isRoundWindow(it)) {
        const markX = side === "left" ? x : side === "right" ? x + w : cx;
        const markY = side === "top" ? y : side === "bottom" ? y + h : cy;
        ctx.beginPath();
        ctx.arc(markX, markY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (side === "top") {
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
    const drawOrder = [...items].sort(
      (a, b) => Number(!!a.supportId) - Number(!!b.supportId),
    );
    drawOrder.filter((i) => i.kind === "rug").forEach(drawFurniture);
    drawOrder.filter((i) => i.kind !== "rug").forEach(drawFurniture);
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
    if (updateScene3D) render3D();
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
    applyPlacement(it, snapDefaultBedHeadboardToWall(it));
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
    $("objectX").value = selected.x.toFixed(1);
    $("objectY").value = selected.y.toFixed(1);
    $("objectLift").value = Number(selected.lift ?? (wallMountSide(selected) ? 1.5 : 0)).toFixed(1);
    $("liftField").hidden = !getPlaceableOn(selected).length && !selected.wallMountable;
    $("liftField").querySelector("label").textContent = selected.wallMountable
      ? "ความสูงจากพื้น (เมตร)"
      : "ยกอุปกรณ์สูงเพิ่ม (เมตร)";
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
    const found = [...items]
      .sort((a, b) => Number(!!a.supportId) - Number(!!b.supportId))
      .reverse()
      .find((it) => hitTest(p, it));
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
      const placement = placeOnSurface(candidate);
      if (canPlace(placement, it.id)) {
        moveSupportedItems(it, placement);
        applyPlacement(it, placement);
        if (it.modelFitW != null) {
          it.modelFitW = it.w;
          it.modelFitH = it.h;
        }
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
    candidate = snapDefaultBedHeadboardToWall(candidate);
    candidate = placeOnSurface(candidate);
    if (canPlace(candidate, it.id)) {
      moveSupportedItems(it, candidate);
      applyPlacement(it, candidate);
      if (it.wallMountable) $("objectLift").value = Number(it.lift ?? 1.5).toFixed(1);
    }
    $("objectX").value = it.x.toFixed(1);
    $("objectY").value = it.y.toFixed(1);
    draw();
  });
  canvas.addEventListener("pointerup", () => {
    if (dragging?.moved) status("อัปเดตตำแหน่งแล้ว");
    dragging = null;
  });
  importedModels.forEach((model) => {
    specs[model.id] = {
      name: model.name,
      w: model.w,
      h: model.h,
      color: model.color,
      kind: model.kind,
      placeableOn: model.placeableOn,
      surfaceType: model.surfaceType,
      surfaceHeight: model.surfaceHeight,
      wallMountable: model.wallMountable,
      preview: model.preview,
      modelUrl: model.model,
      axis: model.axis,
      rotationY: model.rotationY,
      visibleMeshes: model.visibleMeshes,
      windowShape: model.windowShape,
    };
    const button = document.createElement("button");
    button.type = "button";
    button.className = "furn";
    button.dataset.type = model.id;
    button.dataset.category = model.category;
    const icon = document.createElement("span");
    icon.className = "model-preview-slot";
    catalogPreview(icon, model.model, model.preview);
    const name = document.createElement("b");
    name.textContent = model.name;
    button.append(icon, name);
    $("catalog").append(button);
  });
  document.querySelectorAll(".furn").forEach((button) => {
    const slot = button.querySelector(".model-preview-slot");
    if (!slot) return;
    const spec = specs[button.dataset.type];
    catalogPreview(slot, spec?.modelUrl || glbModels[button.dataset.type], spec?.preview);
  });
  document.querySelectorAll(".template-icon").forEach((slot) => {
    slot.textContent = { bedroom: "🛏️", living: "🛋️", office: "🖥️" }[slot.parentElement.dataset.template];
  });
  document
    .querySelectorAll(".furn")
    .forEach((b) => b.addEventListener("click", () => addItem(b.dataset.type)));
  const catalogKindLabels = {
    all: "\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14",
    bed: "เตียง",
    sofa: "โซฟา",
    desk: "โต๊ะทำงาน",
    dining: "โต๊ะอาหาร",
    table: "โต๊ะ",
    wardrobe: "ตู้เสื้อผ้า",
    tv: "ชั้นวางทีวี",
    plant: "ต้นไม้",
    rug: "พรม",
    chair: "เก้าอี้",
    lamp: "โคมไฟ",
    window: "หน้าต่าง",
    door: "ประตู",
    decor: "อุปกรณ์และของตกแต่ง",
    character: "ตัวละคร",
  };
  const catalogKindIcons = {
    bed: "🛏️",
    sofa: "🛋️",
    desk: "🖥️",
    dining: "🍽️",
    table: "🪵",
    wardrobe: "🚪",
    tv: "📺",
    plant: "🪴",
    rug: "▧",
    chair: "🪑",
    lamp: "💡",
    window: "▤",
    door: "🚪",
    decor: "🔌",
    character: "🧙",
  };
  const catalogButtons = [...document.querySelectorAll(".furn")];
  catalogButtons.forEach((button) => {
    button.dataset.kind = specs[button.dataset.type]?.kind || button.dataset.type;
  });
  let catalogType = catalogButtons[0]?.dataset.kind || "";
  function updateCatalogTypeNav() {
    const typeCounts = new Map();
    catalogButtons.forEach((button) => {
      const kind = button.dataset.kind;
      typeCounts.set(kind, (typeCounts.get(kind) || 0) + 1);
    });
    if (!typeCounts.has(catalogType)) {
      catalogType = typeCounts.keys().next().value || "";
    }

    const navButtons = [];
    const addTypeButton = (kind, label, icon, count) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `catalog-type-button${catalogType === kind ? " active" : ""}`;
      button.dataset.kind = kind;
      button.dataset.label = label;
      button.title = `${label} (${count})`;
      button.setAttribute("aria-label", `${label}, ${count} items`);
      button.setAttribute("aria-pressed", String(catalogType === kind));
      const iconNode = document.createElement("span");
      iconNode.className = "catalog-nav-icon";
      iconNode.textContent = icon;
      const labelNode = document.createElement("span");
      labelNode.className = "catalog-nav-label";
      labelNode.textContent = label;
      button.append(iconNode, labelNode);
      navButtons.push(button);
    };

    typeCounts.forEach((count, kind) => {
      addTypeButton(kind, catalogKindLabels[kind] || kind, catalogKindIcons[kind] || "\ud83d\udce6", count);
    });
    $("catalogTypeNav").replaceChildren(...navButtons);
  }
  function filterCatalog() {
    const query = $("catalogSearch").value.trim().toLocaleLowerCase();
    let visible = 0;
    catalogButtons.forEach((button) => {
      const matches =
        button.dataset.kind === catalogType &&
        button.textContent.toLocaleLowerCase().includes(query);
      button.hidden = !matches;
      if (matches) visible++;
    });
    $("catalogEmpty").hidden = visible > 0;
  }
  updateCatalogTypeNav();
  filterCatalog();
  $("catalogSearch").addEventListener("input", filterCatalog);
  $("catalogTypeNav").addEventListener("click", (event) => {
    const button = event.target.closest(".catalog-type-button");
    if (!button) return;
    catalogType = button.dataset.kind;
    updateCatalogTypeNav();
    filterCatalog();
  });
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
      doorway: [0, 0.9],
      items: [
        ["bed", 2.15, 0],
        ["wardrobe", 0.05, 0.05],
        ["rug", 0.5, 1.2],
        ["lamp", 1.7, 0.05],
        ["plant", 3.45, 3],
        ["door", -0.39, 2.99, -Math.PI / 2],
      ],
    },
    living: {
      name: "ห้องนั่งเล่น",
      w: 4.5,
      h: 4,
      style: "warm",
      items: [
        ["sofa", 1.25, 0.05],
        ["tv", 1.5, 3.55],
        ["rug", 1.45, 0.85],
        ["antique_chair", 1.05, 2.5, -7 * Math.PI / 12],
        ["plant", 3.9, 0.05],
        ["lamp", 0.65, 0.05],
        ["desk", 1.7, 2.2],
      ],
    },
    office: {
      name: "ห้องทำงาน",
      w: 3.5,
      h: 3,
      style: "minimal",
      items: [
        ["desk", 0.05, 0.05],
        ["chair", 0.5, 0.9, Math.PI],
        ["wardrobe", 2.3, 0.05],
        ["rug", 0.05, 0.3],
        ["plant", 3, 2.5],
        ["lamp", 1.6, 0.05],
        ["window", -0.54, 2.04, -Math.PI / 2],
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
    room.doorway = template.doorway || null;
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
    items.forEach((it) => applyPlacement(it, snapDefaultBedHeadboardToWall(it)));
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
        if (i.modelFitW != null) {
          i.modelFitW *= scale;
          i.modelFitH *= scale;
        }
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
        if (i.modelFitW != null) {
          i.modelFitW *= 0.9;
          i.modelFitH *= 0.9;
        }
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
  $("objectLift").addEventListener("change", () => {
    if (!selected || (!getPlaceableOn(selected).length && !selected.wallMountable)) return;
    snapshot();
    selected.lift = Math.max(0, Math.min(2.4, Number($("objectLift").value) || 0));
    $("objectLift").value = selected.lift.toFixed(1);
    draw();
    status("ปรับความสูงอุปกรณ์แล้ว");
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
    const candidate = snapDefaultBedHeadboardToWall(
      snapDoorToWall(clampToRoom({ ...selected, [which]: v })),
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
    moveSupportedItems(selected, candidate);
    applyPlacement(selected, candidate);
    if (selected.modelFitW != null) {
      selected.modelFitW = selected.w;
      selected.modelFitH = selected.h;
    }
    draw();
    updateEditor();
  }
  $("objectW").addEventListener("change", () => updateDimension("w"));
  $("objectH").addEventListener("change", () => updateDimension("h"));
  function updatePosition() {
    if (!selected) return;
    const candidate = placeOnSurface(snapDefaultBedHeadboardToWall(snapDoorToWall(clampToRoom({
      ...selected,
      x: Number($("objectX").value) || 0,
      y: Number($("objectY").value) || 0,
    }))));
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
    moveSupportedItems(selected, candidate);
    applyPlacement(selected, candidate);
    draw();
    updateEditor();
  }
  $("objectX").addEventListener("change", updatePosition);
  $("objectY").addEventListener("change", updatePosition);
  $("rotateLeft").addEventListener("click", () => rotate(-Math.PI / 12));
  $("rotateRight").addEventListener("click", () => rotate(Math.PI / 12));
  function rotate(a) {
    if (!selected) return;
    const candidate = placeOnSurface({ ...selected, rot: (selected.rot || 0) + a });
    if (!canPlace(candidate, selected.id)) {
      status(
        insideRoom(candidate)
          ? "หมุนไม่ได้ เพราะเฟอร์นิเจอร์จะชนกัน"
          : "หมุนไม่ได้ เพราะเฟอร์นิเจอร์จะเกินขอบห้อง",
      );
      return;
    }
    snapshot();
    moveSupportedItems(selected, candidate);
    applyPlacement(selected, candidate);
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
      w: 8,
      h: 8,
      floor: palettes.modern.floor,
      wall: palettes.modern.wall,
      style: "modern",
      grid: true,
    };
    $("roomTitle").textContent = "ห้องของฉัน";
    $("roomW").value = 8;
    $("roomH").value = 8;
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
        startLift: Number(found.lift ?? (wallMountSide(found) ? 1.5 : 0)) || 0,
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
    if ((getPlaceableOn(it).length || it.wallMountable) && e.shiftKey) {
      it.lift = Math.max(0, Math.min(2.4, dragging3d.startLift + (dragging3d.startY - e.clientY) * 0.012));
      $("objectLift").value = it.lift.toFixed(1);
      draw();
      return;
    }
    if (!point) return;
    let candidate = clampToRoom({
      ...it,
      x: point.x - it.w / 2,
      y: point.z - it.h / 2,
    });
    candidate = placeOnSurface(snapDefaultBedHeadboardToWall(snapDoorToWall(candidate)));
    if (canPlace(candidate, it.id)) {
      moveSupportedItems(it, candidate);
      applyPlacement(it, candidate);
      if (it.wallMountable) $("objectLift").value = Number(it.lift ?? 1.5).toFixed(1);
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
  const getItemLift3D = (it) => {
    if (it.kind === "bed") return -getBedFloorInset(it);
    if (wallMountSide(it)) return Number(it.lift ?? 1.5) || 0;
    const surface = items.find((other) => other.id === it.supportId);
    return (surface ? getSurfaceHeight(surface) : 0) + (Number(it.lift) || 0);
  };
  const getBedWallContactOffset3D = (it) => {
    if (!isDefaultBed(it)) return { x: 0, z: 0 };
    const offset = 0.2,
      rotation = it.rot || 0;
    return {
      x: Math.sin(rotation) * offset + 0.05,
      z: -Math.cos(rotation) * offset,
    };
  };
  function addBedContactShadow(parent, item) {
    if (!bedContactShadowTexture3D) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
      gradient.addColorStop(0, "rgba(38, 25, 16, 0.24)");
      gradient.addColorStop(0.55, "rgba(38, 25, 16, 0.14)");
      gradient.addColorStop(1, "rgba(38, 25, 16, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      bedContactShadowTexture3D = new THREE.CanvasTexture(canvas);
      bedContactShadowTexture3D.colorSpace = THREE.SRGBColorSpace;
    }
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(item.w * 1.08, item.h * 1.08),
      new THREE.MeshBasicMaterial({
        map: bedContactShadowTexture3D,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = getBedFloorInset(item) + 0.003;
    shadow.renderOrder = 1;
    shadow.userData.isBedContactShadow = true;
    parent.add(shadow);
  }
  function render3D() {
    if (!scene3d) return;
    if (framedRoom3D !== `${room.w}x${room.h}`) frameCamera3D();
    updateRoomLighting3D();
    // While dragging in 3D, update existing object transforms only.
    // Rebuilding the entire scene on every pointermove causes visible flicker.
    if (dragging3d) {
      objectMeshes.forEach(({ mesh, it }) => {
        const bedContactOffset = getBedWallContactOffset3D(it);
        mesh.position.set(
          it.x + it.w / 2 + bedContactOffset.x,
          getItemLift3D(it),
          it.y + it.h / 2 + bedContactOffset.z,
        );
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
    wallMeshes3D = [];
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
    const wallWindows = { top: [], left: [], right: [], bottom: [] };
    items.forEach((it) => {
      const side = windowWall(it);
      if (!side) return;
      const center = side === "top" || side === "bottom"
        ? it.x + it.w / 2
        : it.y + it.h / 2;
      const round = isRoundWindow(it),
        radius = round ? Math.min(it.w / 2, 0.56) : 0,
        halfOpening = round ? radius : it.w * 0.45 * 0.95;
      wallWindows[side].push({
        from: center - halfOpening,
        to: center + halfOpening,
        round,
        radius,
      });
    });
    function wallSection(side, start, end, low, high) {
      if (end - start < 0.04 || high - low < 0.04) return;
      const horizontal = side === "top" || side === "bottom";
      const mesh = flatBox(
        scene3d,
        horizontal ? end - start : th,
        high - low,
        horizontal ? th : end - start,
        room.wall,
        horizontal ? (start + end) / 2 : side === "left" ? 0 : room.w,
        (low + high) / 2,
        side === "top" ? 0 : side === "bottom" ? room.h : (start + end) / 2,
      );
      wallMeshes3D.push({ mesh, side });
    }
    function roundWindowSurround(side, center, radius) {
      const shape = new THREE.Shape();
      shape.moveTo(-radius, -radius);
      shape.lineTo(radius, -radius);
      shape.lineTo(radius, radius);
      shape.lineTo(-radius, radius);
      shape.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 32 }),
        mat(room.wall),
      );
      mesh.receiveShadow = true;
      if (side === "top" || side === "bottom") {
        mesh.position.set(center, 1.5, (side === "top" ? 0 : room.h) - th / 2);
      } else {
        mesh.rotation.y = side === "left" ? -Math.PI / 2 : Math.PI / 2;
        mesh.position.set(side === "left" ? th / 2 : room.w - th / 2, 1.5, center);
      }
      scene3d.add(mesh);
      wallMeshes3D.push({ mesh, side });
    }
    function buildWall(side) {
      const length = side === "top" || side === "bottom" ? room.w : room.h,
        spans = [[0, length]];
      spans.forEach(([spanStart, spanEnd]) => {
        let cursor = spanStart;
        wallWindows[side]
          .sort((a, b) => a.from - b.from)
          .forEach(({ from, to, round, radius }) => {
            const start = Math.max(cursor, Math.min(spanEnd, from)),
              end = Math.max(start, Math.min(spanEnd, to));
            wallSection(side, cursor, start, 0, wallH);
            if (round) {
              wallSection(side, start, end, 0, 1.5 - radius);
              roundWindowSurround(side, (start + end) / 2, radius);
              wallSection(side, start, end, 1.5 + radius, wallH);
            } else {
              wallSection(side, start, end, 0, 0.94);
              wallSection(side, start, end, 2.06, wallH);
            }
            cursor = end;
          });
        wallSection(side, cursor, spanEnd, 0, wallH);
      });
    }
    buildWall("top");
    buildWall("left");
    buildWall("right");
    buildWall("bottom");
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
    box(scene3d, room.w - th, 0.16, 0.025, "#fffdf8", room.w / 2, 0.08, room.h - 0.07);
    items.forEach((it) => {
      const group = new THREE.Group();
      const bedContactOffset = getBedWallContactOffset3D(it);
      group.position.set(
        it.x + it.w / 2 + bedContactOffset.x,
        getItemLift3D(it),
        it.y + it.h / 2 + bedContactOffset.z,
      );
      group.rotation.y = -(it.rot || 0);
      group.userData.itemId = it.id;
      scene3d.add(group);
      objectMeshes.push({ mesh: group, it });
      const buildFurniture = () => {
        let modelUrl = it.modelUrl || glbModels[it.kind];
        if (modelUrl && normalizeModelUrl(modelUrl).includes("malfoy_draconia")) {
          modelUrl = malfoyModelUrl || modelUrl;
        }
        if (modelUrl) {
          const modelOptions = getImportedModelOptions(modelUrl) || {};
          const modelUrlKey = normalizeModelUrl(modelUrl);
          if (it.modelFootprintUrl !== modelUrlKey) {
            it.modelFitW = modelOptions.modelW ?? it.w;
            it.modelFitH = modelOptions.modelH ?? it.h;
          }
          const fitW = it.modelFitW ?? it.w;
          const fitH = it.modelFitH ?? it.h;
          const bedRotationY = modelOptions.bedRotationY ?? Math.PI;
          const sofaRotationY = modelOptions.sofaRotationY ?? Math.PI / 2;
          const tvRotationY = modelOptions.tvRotationY ?? 0;
          const chairRotationY = modelOptions.chairRotationY ?? Math.PI / 2;
          const tableRotationY = modelOptions.tableRotationY ?? Math.PI * 1.5;
          const tableTurnY = modelOptions.id && modelOptions.id !== "table" ? Math.PI / 2 : 0;
          // GLTFLoader already applies the GLB scene's up-axis conversion; keep
          // characters upright unless a specific model defines an extra tilt.
          const characterRotationX = it.rotationX ?? modelOptions.rotationX ?? 0;
          const characterRotationY = modelOptions.rotationY ?? it.rotationY ?? 0;
          const visibleCharacterMeshes = modelOptions.id
            ? modelOptions.visibleMeshes
            : it.visibleMeshes;
          loadGLB(modelUrl, it.kind).then((sourceModel) => {
            // ฉากอาจถูกวาดใหม่ระหว่างโหลด ให้เพิ่มโมเดลเฉพาะกลุ่มที่ยังอยู่ในฉาก
            if (group.parent !== scene3d || group.userData.glbLoaded) return;
            const model = SkeletonUtils.clone(sourceModel);
            if (modelOptions.id === "tv_woman_character") normalizeTvWomanHead(model);
            if (
              modelOptions.id === "malfoy_character"
              || normalizeModelUrl(modelUrl).includes("malfoy_draconia")
            ) bendMalfoyUpperArms(model);
            let sourceBounds = new THREE.Box3().makeEmpty();
            if (it.kind === "character") {
              model.updateMatrixWorld(true);
              model.traverse((node) => {
                if (!node.isMesh || !node.visible) return;
                if (node.isSkinnedMesh) node.skeleton.update();
                const meshBounds = new THREE.Box3().setFromObject(node);
                if (visibleCharacterMeshes?.length && !visibleCharacterMeshes.includes(node.name)) {
                  node.visible = false;
                  return;
                }
                sourceBounds.union(meshBounds);
              });
              if (sourceBounds.isEmpty()) sourceBounds.setFromObject(model);
            } else {
              sourceBounds.setFromObject(model);
            }
            // ครอบ GLB ด้วย pivot แยก เพื่อให้มุมเตียงหมุนทั้งลำดับชั้นของ mesh จริง
            const modelRoot = it.kind === "bed" || it.kind === "character" ? new THREE.Group() : model;
            if (it.kind === "bed") {
              modelRoot.rotation.y = bedRotationY;
            } else if (it.kind === "sofa") model.rotation.y += sofaRotationY;
            else if (it.kind === "tv") model.rotation.y += tvRotationY;
            else if (it.kind === "chair") model.rotation.y += chairRotationY + Math.PI;
            else if (it.kind === "table") model.rotation.y += tableRotationY + tableTurnY;
            else if (it.kind === "window") model.rotation.y += modelOptions.windowRotationY ?? -Math.PI / 2;
            else if (it.kind === "character") {
              modelRoot.rotation.set(
                characterRotationX,
                characterRotationY,
                0,
              );
              modelRoot.add(model);
            }
            const transformRoot = it.kind === "character" ? modelRoot : model;
            const box3 = it.kind === "character"
              ? sourceBounds.clone().applyMatrix4(
                  new THREE.Matrix4().makeRotationFromEuler(modelRoot.rotation),
                )
              : sourceBounds;
            const size = new THREE.Vector3();
            box3.getSize(size);
            const maxXZ = Math.max(size.x, size.z, 0.001);
            const targetXZ = Math.max(fitW, fitH);
            const footprintScale = targetXZ / maxXZ;
            const scale = it.kind === "character"
              ? 1.65 / Math.max(size.y, 0.001)
              : footprintScale;
            if (modelOptions.preserveModelScale) {
              model.scale.multiplyScalar(modelOptions.modelScale ?? 1);
            } else if (it.kind === "bed") {
              const swapsFootprintAxes = Math.abs(Math.sin(bedRotationY)) > Math.SQRT1_2;
              const bedWidth = fitW;
              const bedLength = fitH;
              if (normalizeModelUrl(modelUrl) === defaultBedModelUrl) {
                const scaleX = (swapsFootprintAxes ? bedLength : bedWidth) / Math.max(size.x, 0.001);
                const scaleZ = (swapsFootprintAxes ? bedWidth : bedLength) / Math.max(size.z, 0.001);
                const fitScale = Math.min(scaleX, scaleZ) * (modelOptions.modelScale ?? 1);
                model.scale.set(
                  scaleX * (modelOptions.modelScale ?? 1),
                  fitScale,
                  scaleZ * (modelOptions.modelScale ?? 1),
                );
              } else {
                model.scale.set(
                  ((swapsFootprintAxes ? bedLength : bedWidth) / Math.max(size.x, 0.001)) * model.scale.x,
                  ((modelOptions.modelHeight ?? standardBedHeight) / Math.max(size.y, 0.001)) * model.scale.y,
                  ((swapsFootprintAxes ? bedWidth : bedLength) / Math.max(size.z, 0.001)) * model.scale.z,
                );
                model.scale.multiplyScalar(modelOptions.modelScale ?? 1);
              }
            } else if (it.kind === "tv") {
              model.scale.multiplyScalar(standardTvHeight / Math.max(size.y, 0.001));
              model.updateMatrixWorld(true);
              const tvBounds = new THREE.Box3().setFromObject(model);
              const tvSize = tvBounds.getSize(new THREE.Vector3());
              const footprintScale = Math.min(
                1,
                fitW / Math.max(tvSize.x, 0.001),
                fitH / Math.max(tvSize.z, 0.001),
              );
              model.scale.multiplyScalar(footprintScale);
            } else if (it.kind === "lamp") {
              model.scale.multiplyScalar(standardLampHeight / Math.max(size.y, 0.001));
            } else if (it.kind === "chair") {
              model.scale.multiplyScalar(
                (standardChairHeight / Math.max(size.y, 0.001))
                * (modelOptions.chairScale ?? 1),
              );
            } else {
              if (it.kind === "character") modelRoot.scale.multiplyScalar(scale);
              else model.scale.multiplyScalar(scale);
            }
            let scaledBox;
            if (it.kind === "character") {
              scaledBox = box3.clone();
              scaledBox.min.multiplyScalar(scale);
              scaledBox.max.multiplyScalar(scale);
            } else {
              scaledBox = new THREE.Box3().setFromObject(model);
            }
            if (it.kind === "window" && !modelOptions.preserveModelScale) {
              const scaledSize = new THREE.Vector3();
              scaledBox.getSize(scaledSize);
              model.scale.y *= 1.12 / scaledSize.y;
              scaledBox = new THREE.Box3().setFromObject(model);
            }
            const modelCenter = scaledBox.getCenter(new THREE.Vector3());
            transformRoot.position.x -= modelCenter.x;
            transformRoot.position.y += (it.kind === "window" ? 0.94 : 0) - scaledBox.min.y;
            transformRoot.position.z -= modelCenter.z;
            model.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = it.kind !== "bed";
                node.receiveShadow = true;
              }
            });
            if (it.kind === "bed") modelRoot.add(model);
            modelRoot.updateMatrixWorld(true);
            const footprintBounds = getVisibleMeshBounds(modelRoot);
            const footprintSize = footprintBounds.getSize(new THREE.Vector3());
            const hasFootprint = !footprintBounds.isEmpty();
            const actualW = hasFootprint ? Math.max(0.001, footprintSize.x) : it.w;
            const actualH = hasFootprint ? Math.max(0.001, footprintSize.z) : it.h;
            const footprintChanged = hasFootprint && (
              Math.abs(actualW - it.w) > 0.01
              || Math.abs(actualH - it.h) > 0.01
            );
            const isTableSurface = ["desk", "dining", "table"].includes(it.kind);
            const nextSurfaceHeight = isTableSurface
              ? (modelOptions.surfaceHeight ?? (scaledBox.max.y - scaledBox.min.y))
              : null;
            const surfaceHeightChanged = nextSurfaceHeight != null
              && Math.abs((it.surfaceHeight ?? 0.75) - nextSurfaceHeight) > 0.005;
            if (surfaceHeightChanged) it.surfaceHeight = nextSurfaceHeight;
            if (hasFootprint) {
              it.w = actualW;
              it.h = actualH;
              it.modelFootprintUrl = modelUrlKey;
              applyPlacement(it, snapDefaultBedHeadboardToWall(it));
              const bedContactOffset = getBedWallContactOffset3D(it);
              group.position.x = it.x + it.w / 2 + bedContactOffset.x;
              group.position.z = it.y + it.h / 2 + bedContactOffset.z;
            }
            group.clear();
            group.add(modelRoot);
            if (it.kind === "bed") addBedContactShadow(group, it);
            if (it.kind === "bed") {
              // จัดฐานจากขอบเขตของ GLB หลังหมุนทั้งโมเดลแล้ว
              group.position.y = -getBedFloorInset(it);
            }
            if (it.kind === "window" && windowWall(it))
              addWindowExterior(group, it.w, isRoundWindow(it));
            group.userData.glbLoaded = true;
            if (surfaceHeightChanged) render3D();
            if (footprintChanged) {
              draw(false);
              if (selected?.id === it.id) updateEditor();
            }
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
          if (windowWall(it)) addWindowExterior(group, w, isRoundWindow(it));
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
