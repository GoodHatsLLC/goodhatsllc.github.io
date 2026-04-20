import * as THREE from "https://esm.sh/three@0.176.0";
import { GLTFLoader } from "https://esm.sh/three@0.176.0/examples/jsm/loaders/GLTFLoader";

const sceneRoot = document.querySelector("[data-scene-root]");
const sceneStatus = document.querySelector("[data-scene-status]");

if (sceneRoot) {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery = window.matchMedia("(max-width: 820px)");
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !mobileQuery.matches,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.warn("3D scene unavailable", error);
  }

  if (renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, mobileQuery.matches ? 1.15 : 1.7),
    );
    renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
    sceneRoot.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      sceneRoot.clientWidth / sceneRoot.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.05, 10.4);

    const ambientLight = new THREE.AmbientLight(0xfff3e4, 1.6);
    const keyLight = new THREE.DirectionalLight(0xfff7ec, 2.6);
    keyLight.position.set(5, 7, 5.5);
    const fillLight = new THREE.PointLight(0xf8a348, 18, 22, 2);
    fillLight.position.set(-4.5, 2.3, 3.8);
    const rimLight = new THREE.PointLight(0xdb4a2b, 14, 20, 2);
    rimLight.position.set(3.5, 1.4, -4.2);
    scene.add(ambientLight, keyLight, fillLight, rimLight);

    const rig = new THREE.Group();
    const hatRig = new THREE.Group();
    rig.add(hatRig);
    scene.add(rig);

    rig.rotation.set(0.04, -0.18, 0.04);
    rig.position.y = -0.35;

    const state = {
      pointerX: 0,
      pointerY: 0,
      scroll: 0,
      inView: true,
      hatLoaded: false,
    };

    const loader = new GLTFLoader();
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x1e1e1e });
    const tempBox = new THREE.Box3();
    const tempSize = new THREE.Vector3();
    const tempCenter = new THREE.Vector3();

    const setStatus = (label) => {
      if (sceneStatus) {
        sceneStatus.textContent = label;
      }
    };

    setStatus("LOADING HAT MESH");

    loader.load(
      "./assets/cap.glb",
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (!child.isMesh) {
            return;
          }

          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          child.material = materials.map((material, index) =>
            new THREE.MeshStandardMaterial({
              color: material?.name === "gray_tone1" || index === 0 ? 0xf1efea : 0xdb4a2b,
              roughness: 0.95,
              metalness: 0,
            }),
          );

          if (child.material.length === 1) {
            [child.material] = child.material;
          }

          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(child.geometry, 28),
            edgeMaterial,
          );
          child.add(edges);
        });

        tempBox.setFromObject(model);
        tempBox.getSize(tempSize);
        tempBox.getCenter(tempCenter);

        model.position.sub(tempCenter);

        const maxDimension = Math.max(tempSize.x, tempSize.y, tempSize.z);
        const scale = (mobileQuery.matches ? 4.6 : 6.2) / maxDimension;
        model.scale.setScalar(scale);
        model.rotation.set(-0.62, -0.42, 0.08);
        model.position.set(0, -0.4, 0.42);

        hatRig.add(model);
        state.hatLoaded = true;
        setStatus("REAL HAT MESH");
      },
      undefined,
      () => {
        setStatus("HAT MESH FAILED");
      },
    );

    const heroSection = sceneRoot.closest(".hero");

    const resizeScene = () => {
      const width = sceneRoot.clientWidth;
      const height = sceneRoot.clientHeight;

      if (!width || !height) {
        return;
      }

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, mobileQuery.matches ? 1.15 : 1.7),
      );
      renderer.setSize(width, height);
    };

    const updateScroll = () => {
      if (!heroSection) {
        return;
      }

      const rect = heroSection.getBoundingClientRect();
      state.scroll = THREE.MathUtils.clamp(
        (window.innerHeight - rect.top) / (window.innerHeight + rect.height),
        0,
        1,
      );
    };

    const handlePointerMove = (event) => {
      const bounds = sceneRoot.getBoundingClientRect();

      if (!bounds.width || !bounds.height) {
        return;
      }

      state.pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      state.pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
    };

    const handlePointerLeave = () => {
      state.pointerX = 0;
      state.pointerY = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        state.inView = entry.isIntersecting;
      },
      { threshold: 0.08 },
    );
    observer.observe(sceneRoot);

    const pointerTarget = heroSection ?? sceneRoot;
    pointerTarget.addEventListener("pointermove", handlePointerMove);
    pointerTarget.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("resize", resizeScene);
    window.addEventListener("scroll", updateScroll, { passive: true });
    mobileQuery.addEventListener("change", resizeScene);

    resizeScene();
    updateScroll();

    const clock = new THREE.Clock();

    const render = () => {
      if (!state.inView) {
        requestAnimationFrame(render);
        return;
      }

      const elapsed = clock.getElapsedTime();
      const drift = reducedMotionQuery.matches ? 0.015 : Math.sin(elapsed * 0.9) * 0.05;
      const targetY = -0.18 + state.pointerX * 0.46 + state.scroll * 0.16;
      const targetX = 0.04 + state.pointerY * 0.18 + state.scroll * 0.04;
      const targetZ = 0.04 + state.pointerX * -0.05;

      rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, targetY, 0.06);
      rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, targetX, 0.06);
      rig.rotation.z = THREE.MathUtils.lerp(rig.rotation.z, targetZ, 0.04);
      rig.position.y = THREE.MathUtils.lerp(
        rig.position.y,
        -0.2 + drift - state.scroll * 0.16,
        0.08,
      );
      rig.position.x = THREE.MathUtils.lerp(rig.position.x, state.pointerX * 0.2, 0.06);

      if (state.hatLoaded) {
        hatRig.rotation.y += reducedMotionQuery.matches ? 0.0012 : 0.0024;
        hatRig.position.y = THREE.MathUtils.lerp(
          hatRig.position.y,
          -0.08 + drift * 0.55,
          0.08,
        );
      }

      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        10.4 - state.scroll * 0.35,
        0.05,
      );

      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };

    render();
  }
}
