const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const mysql = require('mysql');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let mainWindow;
let connection;

// 创建 MySQL 连接
function createConnection(host, user, password, database) {
  connection = mysql.createConnection({
    host: host,
    user: user,
    password: password,
    database: database,
    authPluginName: 'mysql_native_password' // 使用 mysql_native_password 身份验证插件
  });

  connection.on('error', (err) => {
    console.error('MySQL connection error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
      console.log('Attempting to reconnect to MySQL...');
      createConnection(host, user, password, database);
    } else {
      throw err;
    }
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err.message);
    } else {
      console.log('Connected to MySQL database');
    }
  });
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadFile('index.html');

  createConnection('192.168.1.65', 'root', 'kkxx2020', 'jkwj'); // 默认连接信息

  // 注册 IPC 事件监听器
  ipcMain.on('query-mysql', handleQueryMysql);
  ipcMain.on('query-mysql-only', handleQueryMysqlOnly);
  ipcMain.on('insert-data', handleInsertData);
  ipcMain.on('change-db-connection', handleChangeDbConnection);
}

// 处理查询数据请求（导出）
function handleQueryMysql(event, { queries }) {
  const queryResults = [];

  queries.forEach((query, index) => {
    connection.query(query, (err, results) => {
      if (err) {
        event.sender.send('query-error', err.message);
      } else {
        queryResults.push({ index, results });
        if (queryResults.length === queries.length) {
          event.sender.send('query-results', queryResults);
          saveDeviceDataToXmlFile(queryResults);
        }
      }
    });
  });
}

// 处理查询数据请求（仅查询）
function handleQueryMysqlOnly(event, { queries }) {
  const queryResults = [];

  queries.forEach((query, index) => {
    connection.query(query, (err, results) => {
      if (err) {
        event.sender.send('query-error', err.message);
      } else {
        queryResults.push({ index, results });
        if (queryResults.length === queries.length) {
          event.sender.send('query-results', queryResults);
        }
      }
    });
  });
}

// 处理插入数据请求
function handleInsertData(event, { data }) {
  connection.query('INSERT INTO jkwj (boby) VALUES (?)', [data], (err, result) => {
    if (err) {
      event.sender.send('insert-result', 'Error inserting data: ' + err.message);
    } else {
      event.sender.send('insert-result', 'Data inserted successfully.');
    }
  });
}

// 处理切换数据库连接请求
function handleChangeDbConnection(event) {
  connection.end(); // 关闭当前连接

  // 创建自定义输入框
  const inputOptions = {
    type: 'info',
    buttons: ['确定', '取消'],
    title: '输入新的数据库连接信息',
    message: '请输入新的数据库连接信息:',
    inputs: [
      {
        label: '主机地址:',
        type: 'text',
        placeholder: '输入主机地址',
        value: 'localhost' // 默认值
      },
      {
        label: '用户名:',
        type: 'text',
        placeholder: '输入用户名',
        value: 'root' // 默认值
      },
      {
        label: '密码:',
        type: 'password',
        placeholder: '输入密码',
        value: '' // 默认为空
      },
      {
        label: '数据库名:',
        type: 'text',
        placeholder: '输入数据库名',
        value: 'my_database' // 默认值
      }
    ]
  };

  // 显示自定义输入框
  dialog.showMessageBox(inputOptions).then((result) => {
    if (result.response === 0) {
      const newConnectionInfo = {
        host: inputOptions.inputs[0].value,
        user: inputOptions.inputs[1].value,
        password: inputOptions.inputs[2].value,
        database: inputOptions.inputs[3].value
      };
      // 创建新的连接
      createConnection(newConnectionInfo.host, newConnectionInfo.user, newConnectionInfo.password, newConnectionInfo.database);
      event.sender.send('db-connection-changed', 'Database connection updated successfully.');
    }
  });
}

// 保存查询结果到 XML 文件
function saveDeviceDataToXmlFile(queryResults) {
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += '<DeviceManager version="2.0">\n';

  queryResults.forEach(queryResult => {
    queryResult.results.forEach(result => {
      const deviceMatch = result.boby.match(/<Device.*?\/>/);
      if (deviceMatch) {
        xmlContent += `\t${deviceMatch[0]}\n`;
      }
    });
  });

  xmlContent += '</DeviceManager>';

  // 显示保存对话框，获取用户选择的文件路径
  dialog.showSaveDialog(mainWindow, {
    defaultPath: '设备信息.xml', // 默认文件名
    filters: [{ name: 'XML Files', extensions: ['xml'] }] // 文件类型过滤器
  }).then((result) => {
    if (!result.canceled) {
      const filePath = result.filePath;
      fs.writeFile(filePath, xmlContent, (err) => {
        if (err) {
          console.error('保存xml文件出错:', err.message);
        } else {
          console.log('设备信息已保存为xml文件:', filePath);
        }
      });
    }
  }).catch((err) => {
    console.error('保存对话框出错:', err.message);
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
