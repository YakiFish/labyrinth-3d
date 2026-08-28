# 🏰 Labyrinth 3D - 双屏联动迷宫冒险

**手机 + 电脑 联动 3D 迷宫游戏**

## 🎮 玩法说明

1. **电脑端**：打开 `index.html`，选择"电脑显示端" → 生成主机 ID 和二维码
2. **手机端**：扫描二维码（或手动输入主机 ID）→ 连接 → 用陀螺仪/触控控制角色移动
3. **目标**：从迷宫起点移动到金色目标点通关

## 🕹️ 控制方式

| 模式 | 说明 |
|------|------|
| 🕹️ 触控 D-Pad | 屏幕方向键或滑动摇杆 |
| 📐 陀螺仪 | 倾斜手机控制方向（支持校准） |
| ⌨️ 手动 | 屏幕按钮点击移动 |

## 🚀 快速开始

### 本地运行
```bash
npm install
npm start
# 电脑打开 http://localhost:8080
# 手机访问同一局域网 IP
```

### StackBlitz 部署
1. 在 StackBlitz 中打开项目
2. 将所有代码文件复制进去
3. 点击 Share → 用手机打开链接
4. 手机选择"控制器"，输入主机 ID

## 📁 文件结构

```
labyrinth-game/
├── index.html        # 主入口（电脑显示端 + 启动页）
├── controller.html   # 手机控制器
├── controller.css    # 控制器样式
├── controller.js     # 控制器逻辑
├── game.js           # 游戏主逻辑 (Three.js 3D)
├── network.js        # PeerJS WebRTC 网络层
├── style.css         # 全局样式
└── package.json      # 依赖
```

## 🔧 技术栈

- **Three.js r128** - 3D 渲染
- **PeerJS 1.5.2** - WebRTC 点对点通信
- **DeviceOrientation API** - 手机陀螺仪
- **Pointer Events** - 触控摇杆

## 🎯 特性

- ✅ 递归回溯算法生成随机迷宫
- ✅ 第三人称 3D 视角
- ✅ 玩家光效跟随
- ✅ 目标旋转发光 + 粒子环
- ✅ 关卡递进（迷宫越来越大）
- ✅ 计分系统和计时器
- ✅ 实时延迟显示
