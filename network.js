/* ============================================
   Labyrinth 3D - 网络通信层 (PeerJS WebRTC)
   基于 PeerJS，专为无公网 IP 的 StackBlitz 优化
   ============================================ */

class GameNetwork {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.onData = null;
    this.onPeerConnect = null;
    this.latency = 0;
    this.pingInterval = null;
  }

  // ===== 创建主机 (电脑显示端) =====
  async initHost() {
    return new Promise((resolve, reject) => {
      try {
        // 使用 debug: true 方便本地调试，生产可关闭
        this.peer = new Peer();

        this.peer.on('open', (id) => {
          console.log('📡 主机 ID:', id);
          this.isHost = true;
          const url = `${location.origin}${location.pathname}?role=controller&host=${id}`;
          resolve({ url, hostId: id });
        });

        this.peer.on('connection', (conn) => {
          console.log('✅ 控制器连接:', conn.peer);
          this.conn = conn;
          this.setupConnection();

          // 开始 ping 测延迟
          this.pingInterval = setInterval(() => this.ping(), 2000);
        });

        this.peer.on('error', (err) => {
          console.error('Peer 错误:', err);
          // 如果 PeerJS 服务器不可用，提示备用方案
          if (err.type === 'peer-unavailable') {
            alert('无法连接到信令服务器。请检查网络连接。');
          }
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // ===== 创建控制器 (手机端) =====
  initController(hostId) {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer();
        this.isHost = false;

        this.peer.on('open', () => {
          console.log('📱 控制器已创建，连接主机:', hostId);
          this.conn = this.peer.connect(hostId, { reliable: true });

          this.conn.on('open', () => {
            console.log('✅ 已连接到主机');
            this.setupConnection();
            this.pingInterval = setInterval(() => this.ping(), 2000);
            resolve();
          });

          this.conn.on('error', (err) => {
            console.error('连接失败:', err);
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          console.error('Peer 错误:', err);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // ===== 设置连接事件 =====
  setupConnection() {
    if (!this.conn) return;

    this.conn.on('data', (data) => {
      if (this.onData) this.onData(data);
    });

    this.conn.on('close', () => {
      console.log('❌ 连接断开');
      this.updateStatus('disconnected');
    });

    this.conn.on('error', (err) => {
      console.error('连接错误:', err);
    });
  }

  // ===== 发送数据 =====
  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  // ===== Ping 测延迟 =====
  ping() {
    const t0 = performance.now();
    this.send({ type: 'ping', ts: t0 });
    this._pingSentAt = t0;
  }

  // ===== 状态更新 =====
  updateStatus(status) {
    const el = document.getElementById('conn-status');
    if (!el) return;
    const states = {
      connected: { text: '✅ 已连接', cls: 'ok' },
      connecting: { text: '⏳ 连接中...', cls: 'pending' },
      disconnected: { text: '❌ 已断开', cls: 'error' },
    };
    const s = states[status] || states.disconnected;
    el.textContent = s.text;
    el.className = 'conn-status ' + s.cls;
  }
}

// ===== 导出给其他脚本 =====
if (typeof window !== 'undefined') {
  window.GameNetwork = GameNetwork;
}
