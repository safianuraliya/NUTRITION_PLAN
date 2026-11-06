// main.js - starts the Electron app and opens the first page
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    title: 'NutritionPlan'
  });
  // the pages are inside the "renderer" folder
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', function () { app.quit(); });