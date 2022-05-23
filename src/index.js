const { app, BrowserWindow, Menu, dialog, shell, webContents, } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}
// 导入热更新库(更新html时)
try {
  require('electron-reloader')(module, {});
} catch (_) { }


let mainWindow = null;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // mainWindow.webContents.openDevTools();
  // 从模板中创建菜单
  const myMenu = Menu.buildFromTemplate(template)
  // 设置为应用程序菜单
  Menu.setApplicationMenu(myMenu)
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// 创建菜单模板
var template = [
  {
    label: '文件',
    submenu: [
      {
        label: '打开文件',
        click: () => {
          dialog.showOpenDialog({
            properties: ['openFile', 'showHiddenFiles']
          }).then((res) => {
            mainWindow.webContents.send('open-file', res.filePaths)
          })
        }
      },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '编辑',
    // submenu 代表下一级菜单
    submenu: [
      { label: '子菜单一' },
      { label: '子菜单二' },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '词法分析',
    // submenu 代表下一级菜单
    submenu: [
      { label: '运行' },
      { label: 'reg_nfa_dfa',
      click: () => {
        // 通知渲染进程处理
        mainWindow.webContents.send('process-reg', 'hi')
      } },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '语法分析',
    // submenu 代表下一级菜单
    submenu: [
      { label: '递归下降' },
      { label: '子菜单二' },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '中间代码',
    // submenu 代表下一级菜单
    submenu: [
      { label: '运行' },
      { label: '子菜单二' },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '目标代码生成',
    // submenu 代表下一级菜单
    submenu: [
      {
        label: '运行',
        click: () => {
          // 通知渲染进程处理
          mainWindow.webContents.send('process-code', 'hi')
        }
      },
      { label: '子菜单二' },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '查看',
    // submenu 代表下一级菜单
    submenu: [
      { label: '子菜单一' },
      { label: '子菜单二' },
      { label: '子菜单三' },
      { label: '子菜单四' },
    ],
  },
  {
    label: '帮助',
    // submenu 代表下一级菜单
    submenu: [
      {
        label: '点击帮助',
        click: () => {
          shell.openExternal('https://justin3go.com/%E6%8E%A8%E8%8D%90/%E6%A0%88%E5%B8%A7.html');
        }
      },
      {
        label: '打开调试',
        click: () => {
          mainWindow.webContents.openDevTools();
        }
      },
      {
        label: '关于',
        click: () => {
          shell.openExternal('https://justin3go.com/');
        }
      },
    ],
  },
]