/* ============================================
   Labyrinth 3D - 主游戏逻辑
   ============================================ */

class LabyrinthGame {
  constructor(canvas, network) {
    this.canvas = canvas;
    this.network = network;
    this.level = 1;
    this.score = 0;
    this.time = 0;
    this.isRunning = false;
    this.player = { x: 1, z: 1 };
    this.goal = { x: 0, z: 0 };
    this.maze = [];
    this.cellSize = 2;
    this.wallHeight = 1.8;
    this.particles = [];

    this.initThree();
    this.initLights();
    this.generateMaze();
    this.setupControls();
    this.animate();
  }

  // ===== Three.js 初始化 =====
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);
    this.scene.fog = new THREE.Fog(0x0f0f1a, 3, 25);

    this.camera = new THREE.PerspectiveCamera(
      65,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 12, 12);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 地面网格
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0x404060, 0.5));

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(10, 15, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    this.scene.add(dir);

    const playerLight = new THREE.PointLight(0x00aaff, 0.6, 10);
    playerLight.castShadow = true;
    this.playerLight = playerLight;
    this.scene.add(playerLight);

    // 目标光
    this.goalLight = new THREE.PointLight(0xffd700, 0.8, 6);
    this.scene.add(this.goalLight);
  }

  // ===== 迷宫生成 (递归回溯) =====
  generateMaze() {
    const w = 10 + this.level * 3;
    const h = 10 + this.level * 3;
    this.maze = Array.from({ length: h }, () => Array(w).fill(1));

    const visited = Array.from({ length: h }, () => Array(w).fill(false));
    const stack = [];
    const sx = 1, sz = 1;
    visited[sz][sx] = true;
    this.maze[sz][sx] = 0;
    stack.push([sx, sz]);

    const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    while (stack.length) {
      const [cx, cz] = stack[stack.length - 1];
      const neighbors = [];
      for (const [dx, dz] of dirs) {
        const nx = cx + dx, nz = cz + dz;
        if (nx > 0 && nx < w - 1 && nz > 0 && nz < h - 1 && !visited[nz][nx]) {
          neighbors.push([nx, nz, dx / 2, dz / 2]);
        }
      }
      if (neighbors.length) {
        const [nx, nz, bx, bz] = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.maze[cz + bz][cx + bx] = 0;
        this.maze[nz][nx] = 0;
        visited[nz][nx] = true;
        stack.push([nx, nz]);
      } else {
        stack.pop();
      }
    }

    // 终点
    this.goal = { x: w - 2, z: h - 2 };
    this.maze[this.goal.z][this.goal.x] = 2;

    this.rebuildWalls(w, h);
    this.resetPlayer();
    this.updateCamera();
  }

  rebuildWalls(w, h) {
    this.walls && this.walls.forEach(w => this.scene.remove(w));
    this.walls = [];
    this.decorations && this.decorations.forEach(d => this.scene.remove(d));
    this.decorations = [];

    // 墙体
    const wallGeo = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a4e,
      roughness: 0.7,
      metalness: 0.1,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.15 });

    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        if (this.maze[z][x] === 1) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(
            x * this.cellSize - (w * this.cellSize) / 2,
            this.wallHeight / 2,
            z * this.cellSize - (h * this.cellSize) / 2
          );
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
          this.walls.push(wall);

          // 发光线框
          const edges = new THREE.EdgesGeometry(wallGeo);
          const line = new THREE.LineSegments(edges, edgeMat);
          line.position.copy(wall.position);
          this.scene.add(line);
          this.decorations.push(line);
        }
      }
    }

    // 地面格子 (路径标记)
    const pathGeo = new THREE.PlaneGeometry(this.cellSize * 0.8, this.cellSize * 0.8);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e3a,
      roughness: 0.9,
    });
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        if (this.maze[z][x] === 0) {
          const tile = new THREE.Mesh(pathGeo, pathMat);
          tile.rotation.x = -Math.PI / 2;
          tile.position.set(
            x * this.cellSize - (w * this.cellSize) / 2,
            0.01,
            z * this.cellSize - (h * this.cellSize) / 2
          );
          this.scene.add(tile);
          this.decorations.push(tile);
        }
      }
    }

    // 目标
    this.goalMesh && this.scene.remove(this.goalMesh);
    this.goalLight && this.scene.remove(this.goalLight);
    this.particles = [];
    this.particleGroup && this.scene.remove(this.particleGroup);
    this.particleGroup = new THREE.Group();

    const goalGeo = new THREE.OctahedronGeometry(0.5, 0);
    const goalMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.goalMesh = new THREE.Mesh(goalGeo, goalMat);
    this.goalMesh.position.set(
      this.goal.x * this.cellSize - (w * this.cellSize) / 2,
      1,
      this.goal.z * this.cellSize - (h * this.cellSize) / 2
    );
    this.scene.add(this.goalMesh);

    this.goalLight = new THREE.PointLight(0xffd700, 1, 8);
    this.goalLight.position.copy(this.goalMesh.position);
    this.scene.add(this.goalLight);

    // 粒子环
    const particleGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat);
      const angle = (i / 20) * Math.PI * 2;
      const radius = 0.8 + Math.random() * 0.4;
      p.userData = { angle, radius, speed: 0.5 + Math.random() * 1.5, yOffset: Math.random() * Math.PI * 2 };
      this.particles.push(p);
      this.particleGroup.add(p);
    }
    this.particleGroup.position.copy(this.goalMesh.position);
    this.scene.add(this.particleGroup);

    this.mazeWidth = w;
    this.mazeHeight = h;
  }

  resetPlayer() {
    this.playerMesh && this.scene.remove(this.playerMesh);
    this.player = { x: 1, z: 1 };
    const geo = new THREE.SphereGeometry(0.4, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0066ff,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4,
    });
    this.playerMesh = new THREE.Mesh(geo, mat);
    this.playerMesh.castShadow = true;
    this.updatePlayerPosition();
    this.scene.add(this.playerMesh);
  }

  updatePlayerPosition() {
    const px = this.player.x * this.cellSize - (this.mazeWidth * this.cellSize) / 2;
    const pz = this.player.z * this.cellSize - (this.mazeHeight * this.cellSize) / 2;
    this.playerMesh.position.set(px, 0.5, pz);
    if (this.playerLight) this.playerLight.position.set(px, 2.5, pz);
  }

  // ===== 控制 =====
  setupControls() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      const { x, z } = this.player;
      const map = {
        ArrowUp: [0, -1], w: [0, -1],
        ArrowDown: [0, 1], s: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0],
      };
      const move = map[e.key];
      if (move && this.maze[z + move[1]]?.[x + move[0]] !== 1) {
        this.movePlayer(move[0], move[1]);
      }
    });

    // 触摸滑动 (显示端也支持滑动)
    let touchStart = null;
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.isRunning) return;
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    });
    this.canvas.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.tryMove(dx > 0 ? 1 : -1, 0);
      } else {
        this.tryMove(0, dy > 0 ? 1 : -1);
      }
    });

    // 网络数据
    this.network.onData = (data) => {
      if (!this.isRunning) return;
      if (data.type === 'move') this.tryMove(data.dx, data.dz);
    };
  }

  tryMove(dx, dz) {
    if (this.maze[this.player.z + dz]?.[this.player.x + dx] !== 1) {
      this.movePlayer(dx, dz);
    }
  }

  movePlayer(dx, dz) {
    this.player.x += dx;
    this.player.z += dz;
    this.score += 10;
    this.updatePlayerPosition();
    this.updateCamera();
    this.checkGoal();
    this.network.send({ type: 'player_update', x: this.player.x, z: this.player.z, score: this.score });
  }

  updateCamera() {
    const px = this.player.x * this.cellSize - (this.mazeWidth * this.cellSize) / 2;
    const pz = this.player.z * this.cellSize - (this.mazeHeight * this.cellSize) / 2;
    // 第三人称俯视角，跟随玩家
    const targetX = px + 5;
    const targetZ = pz + 5;
    const targetY = 10;
    this.camera.position.set(targetX, targetY, targetZ);
    this.camera.lookAt(px, 0, pz);
  }

  checkGoal() {
    if (this.player.x === this.goal.x && this.player.z === this.goal.z) {
      this.score += 200;
      this.level++;
      this.showMessage(`🎉 恭喜通关第 ${this.level - 1} 关！`);
      this.generateMaze();
      this.startGameLoop();
    }
  }

  showMessage(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(15,15,30,0.95); color: #ffd700; padding: 20px 40px;
      border-radius: 15px; font-size: 1.5em; font-weight: bold; z-index: 1000;
      border: 2px solid #ffd700; animation: fadeIn 0.5s ease;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  // ===== 游戏循环 =====
  startGameLoop() {
    this.isRunning = true;
    this.startTime = Date.now();
    this.score = 0;
    this.updateUI();
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.updateUI(), 1000);
  }

  updateUI() {
    this.time = Math.floor((Date.now() - this.startTime) / 1000);
    document.getElementById('score').textContent = this.score;
    document.getElementById('level').textContent = this.level;
    const m = Math.floor(this.time / 60);
    const s = this.time % 60;
    document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ===== 动画循环 =====
  animate() {
    const loop = () => {
      requestAnimationFrame(loop);
      const t = Date.now() * 0.001;

      // 目标旋转与发光
      if (this.goalMesh) {
        this.goalMesh.rotation.y = t * 1.5;
        this.goalMesh.rotation.x = Math.sin(t * 2) * 0.3;
        this.goalMesh.material.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.4;
        this.goalLight.intensity = 0.6 + Math.sin(t * 2) * 0.4;
      }

      // 粒子环绕
      if (this.particleGroup) {
        this.particles.forEach(p => {
          const ud = p.userData;
          ud.angle += ud.speed * 0.02;
          p.position.set(
            Math.cos(ud.angle) * ud.radius,
            Math.sin(t * 2 + ud.yOffset) * 0.4,
            Math.sin(ud.angle) * ud.radius
          );
        });
      }

      // 玩家球体呼吸效果
      if (this.playerMesh) {
        const scale = 1 + Math.sin(t * 2) * 0.05;
        this.playerMesh.scale.set(scale, scale, scale);
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

// ===== 入口 =====
let game;

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');
  const network = new GameNetwork();

  document.getElementById('btn-display').addEventListener('click', () => {
    network.initHost().then(({ url }) => {
      document.getElementById('qr-hint').classList.remove('hidden');
      document.getElementById('qr-url').value = url;
      document.getElementById('copy-url').addEventListener('click', () => {
        navigator.clipboard?.writeText(url);
        document.getElementById('copy-url').textContent = '✅ 已复制';
        setTimeout(() => document.getElementById('copy-url').textContent = '📋 复制链接', 2000);
      });
      showScreen('display');
      game = new LabyrinthGame(canvas, network);

      network.onPeerConnect = () => {
        document.getElementById('connection-status').querySelector('span').textContent = '✅ 控制器已连接';
        document.getElementById('connection-status').querySelector('.status-dot').style.background = '#00ff88';
        game.startGameLoop();
      };
    });
  });

  document.getElementById('btn-controller').addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('role', 'controller');
    location.href = url.toString();
  });

  // 检查 URL 参数
  const params = new URLSearchParams(location.search);
  if (params.get('role') === 'controller') {
    location.href = 'controller.html?host=' + params.get('host');
  }
});

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
}
