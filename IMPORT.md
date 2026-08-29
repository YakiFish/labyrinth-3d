# Labyrinth 3D 游戏 - 导入指南

## 当前状态
- 本地代码路径: `C:\Users\Mai\hermes-work\labyrinth-game\`
- 所有文件已通过本地 dev server 验证可访问
- StackBlitz 项目 `stackblitz-starters-hrkmespr` 是他人fork的空白starter，API 返回 403，无法直接写入

## 导入步骤

### 方法 1: 在 StackBlitz 手动上传
1. 打开 https://stackblitz.com/edit/stackblitz-starters-hrkmespr
2. 在左侧文件树中右键点击每个文件，选择"Replace with local file"
3. 从 `C:\Users\Mai\hermes-work\labyrinth-game\` 上传：
   - `index.html` (替换现有)
   - `controller.html` (新增)
   - `controller.css` (新增)
   - `controller.js` (新增)
   - `game.js` (替换现有)
   - `network.js` (新增)
   - `style.css` (替换现有)
   - `package.json` (替换现有)

### 方法 2: 从 GitHub 导入
1. 将本地仓库推送到 GitHub:
   ```bash
   cd C:\Users\Mai\hermes-work\labyrinth-game
   git remote add origin https://github.com/<your-username>/labyrinth-3d.git
   git push -u origin master
   ```
2. 在 StackBlitz 中打开 GitHub 仓库链接

## 游玩方式
1. 电脑端打开 index.html → 选择"电脑显示端"
2. 手机扫描二维码或复制链接
3. 手机选择"控制器" → 输入主机 ID
4. 开始游戏！

## 项目结构
```
labyrinth-game/
├── index.html        # 主入口 + 电脑显示端
├── controller.html   # 手机控制器
├── controller.css    # 控制器样式
├── controller.js     # 陀螺仪/D-Pad/滑动摇杆
├── game.js           # Three.js 3D 游戏逻辑
├── network.js        # PeerJS WebRTC 通信
├── style.css         # 全局样式
└── package.json      # 依赖
```

## 技术特性
- Three.js r128 3D 渲染
- 递归回溯算法生成随机迷宫
- PeerJS WebRTC 点对点通信
- DeviceOrientation API 陀螺仪控制
- Pointer Events 滑动摇杆
- 关卡递进系统
- 粒子特效 + 发光材质
