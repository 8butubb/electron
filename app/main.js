const { app, BrowserWindow, dialog } = require('electron');
const mysql = require('mysql');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadFile('index.html');

  // 监听来自渲染器进程的消息
  win.webContents.on('message', (event, message) => {
    if (message.type === 'query-mysql') {
      const { host, user, password, database, query } = message.payload;

      // 创建 MySQL 连接池
      const pool = mysql.createPool({
        host,
        user,
        password,
        database,
      });

      // 执行查询
      pool.query(query, (err, results) => {
        if (err) {
          // 将错误信息发送回渲染器进程
          win.webContents.send('error', err.message);
          return;
        }

        // 将查询结果发送回渲染器进程
        win.webContents.send('results', results);
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
