/* ============================================
   Labyrinth 3D - 手机控制器逻辑
   支持: 触控 D-Pad + 陀螺仪 + 滑动摇杆
   ============================================ */

class ControllerApp {
  constructor() {
    this.network = new GameNetwork();
    this.mode = 'touch';
    this.hostId = null;
    this.gyro = { pitch: 0, roll: 0, yaw: 0 };
    this.calibration = { pitch: 0, roll: 0 };
    this.lastMove = 0;
    this.moveThrottle = 180;
  }

  init() {
    const params = new URLSearchParams(location.search);
    this.hostId = params.get('host');

    if (this.hostId) {
      document.getElementById('host-id').value = this.hostId;
      this.connectToHost();
    }

    document.getElementById('btn-connect').addEventListener('click', () => {
      this.hostId = document.getElementById('host-id').value.trim();
      if (this.hostId) this.connectToHost();
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        document.getElementById(`mode-${mode}`).classList.add('active');
        this.mode = mode;
        if (mode === 'gyro') this.requestGyroPermission();
      });
    });

    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.sendMove(btn.dataset.dir);
      });
      btn.addEventListener('pointerup', (e) => e.preventDefault());
      btn.addEventListener('pointerleave', (e) => e.preventDefault());
    });

    document.getElementById('btn-calibrate')?.addEventListener('click', () => {
      this.calibration = { pitch: this.gyro.pitch, roll: this.gyro.roll };
      const btn = document.getElementById('btn-calibrate');
      btn.textContent = '✅ 已校准';
      setTimeout(() => btn.textContent = '🎯 校准', 1500);
    });

    this.initJoystick();
  }

  async connectToHost() {
    const statusEl = document.getElementById('conn-status');
    statusEl.textContent = '⏳ 连接中...';
    statusEl.className = 'conn-status pending';

    try {
      await this.network.initController(this.hostId);
      this.network.updateStatus('connected');
      document.getElementById('connect-form').classList.add('hidden');
      document.getElementById('controller-ui').classList.remove('hidden');

      this.network.conn.on('data', (data) => {
        if (data.type === 'pong') {
          const latency = Math.round(performance.now() - data.ts);
          const latEl = document.getElementById('latency');
          if (latEl) latEl.textContent = latency;
        }
        if (data.type === 'player_update') {
          const scoreEl = document.getElementById('score');
          if (scoreEl) scoreEl.textContent = data.score;
        }
      });

      this.requestGyroPermission();
    } catch (err) {
      statusEl.textContent = '❌ 连接失败';
      statusEl.className = 'conn-status error';
      alert('连接失败: ' + err.message + '\n请检查主机 ID 是否正确。');
    }
  }

  sendMove(dir) {
    const now = Date.now();
    if (now - this.lastMove < this.moveThrottle) return;
    this.lastMove = now;

    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dz] = dirs[dir] || [0, 0];
    if (dx || dz) {
      this.network.send({ type: 'move', dx, dz });
      this.flashButton(dir);
    }
  }

  flashButton(dir) {
    const btn = document.querySelector(`.dpad-btn[data-dir="${dir}"]`);
    if (btn) {
      btn.style.background = '#00ff88';
      btn.style.transform = 'scale(0.92)';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.transform = '';
      }, 100);
    }
  }

  requestGyroPermission() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then((state) => { if (state === 'granted') this.startGyro(); })
          .catch(console.error);
      } else {
        this.startGyro();
      }
    } catch (e) {
      console.warn('陀螺仪不可用:', e);
    }
  }

  startGyro() {
    let lastGyroMove = 0;
    window.addEventListener('deviceorientation', (e) => {
      this.gyro.pitch = e.beta || 0;
      this.gyro.roll = e.gamma || 0;
      this.gyro.yaw = e.alpha || 0;
      this.updateGyroUI();

      if (this.mode === 'gyro') {
        const now = Date.now();
        if (now - lastGyroMove < this.moveThrottle) return;
        const pitch = this.gyro.pitch - this.calibration.pitch;
        const roll = this.gyro.roll - this.calibration.roll;
        const threshold = 10;
        let dx = 0, dz = 0;
        if (roll > threshold) dx = 1;
        else if (roll < -threshold) dx = -1;
        if (pitch > threshold) dz = 1;
        else if (pitch < -threshold) dz = -1;
        if (dx || dz) {
          lastGyroMove = now;
          this.sendMove(dz === -1 ? 'up' : dz === 1 ? 'down' : dx === -1 ? 'left' : 'right');
        }
      }
    });
  }

  updateGyroUI() {
    [
      { id: 'gyro-x', val: this.gyro.roll },
      { id: 'gyro-y', val: this.gyro.pitch },
      { id: 'gyro-z', val: this.gyro.yaw },
    ].forEach(({ id, val }) => {
      const el = document.getElementById(id);
      if (el) {
        const pct = Math.min(100, Math.max(-100, (val / 90) * 100));
        el.style.width = pct + '%';
        el.style.background = Math.abs(pct) > 60 ? '#ff4444' : Math.abs(pct) > 25 ? '#ffaa00' : '#00ff88';
      }
    });
  }

  initJoystick() {
    const canvas = document.getElementById('joystick');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxR = 55;
    let dragging = false;
    let knobX = cx, knobY = cy;
    let lastSend = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,170,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 十字线
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 摇杆
      ctx.beginPath();
      ctx.arc(knobX, knobY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,170,255,0.9)';
      ctx.fill();
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    draw();

    const handle = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
      knobX = cx + dx;
      knobY = cy + dy;
      draw();
      const now = Date.now();
      if (now - lastSend > this.moveThrottle) {
        lastSend = now;
        const nx = dx / maxR, ny = dy / maxR;
        if (Math.abs(nx) > 0.35) this.sendMove(nx > 0 ? 'right' : 'left');
        if (Math.abs(ny) > 0.35) this.sendMove(ny > 0 ? 'down' : 'up');
      }
    };

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      const r = canvas.getBoundingClientRect();
      handle(e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const r = canvas.getBoundingClientRect();
      handle(e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('pointerup', (e) => {
      dragging = false;
      knobX = cx; knobY = cy;
      draw();
      canvas.releasePointerCapture(e.pointerId);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.ControllerApp = new ControllerApp();
  window.ControllerApp.init();
});
