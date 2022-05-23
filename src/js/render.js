const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require("path");
const { exec } = require('child_process')

let inputText = document.querySelector('.left');
let analysisBox = document.querySelector('.top-content-text');
let reportBox = document.querySelector('.bottom-content-text');
let filepath = ''

ipcRenderer.on('process-code', (event, arg) => {
  let code = inputText.value;
  if (filepath == '') {
    reportBox.innerHTML = '加载文件失败';
  }
  // TODO 调用api来编译code并生成报告
  runExec('python -u src/js/compilerCore/objectCodeGeneration.py ' + filepath,)
  // exec('ls')
  // console.log('exec', filepath);
  // code = fs.readFileSync('./midcode.txt');
  // console.log(code.toString('utf-8'));
  // analysisBox.innerHTML = code.toString('utf-8');
  // reportBox.innerHTML = '加载成功';

})
ipcRenderer.on('process-reg', (event, arg) => {
  windowOpen();
})

ipcRenderer.on('open-file', (event, arg) => {
  console.log('filepath: ', arg);
  filepath = arg[0];
  fs.readFile(arg[0], (err, data) => {
    if (err) console.log(err);  // 最好弹出模态框提示
    else {
      inputText.value = data;
    }
  })
})

inputText.addEventListener('drop', (e) => {
  e.preventDefault(); // 取消默认
  e.stopPropagation(); // 阻止冒泡
  // TODO 放入多个文件需要友好提示只能一个
  let file = e.dataTransfer.files[0];
  fs.readFile(file.path, (err, data) => {
    if (err) console.log(err);  // 最好弹出模态框提示
    else {
      inputText.value = data;
    }
  })
});
inputText.addEventListener('dragover', (e) => {
  e.preventDefault(); // 取消默认
  e.stopPropagation(); // 阻止冒泡
})
// 使用 window.open 打开一个新的窗口
function windowOpen() {
  // window.open 来创建一个新的窗口时候，将会创建一个 BrowserWindow 的实例，并且将返回一个标识，这个界面通过标识来对这个新的窗口进行有限的控制.
  // window.open(url[, frameName][, features])
  // url String
  // frameName String (可选)
  // features String (可选)
  let url = "src/js/compilerCore/nfa/app/index.html";
  let winObj = window.open(url)
  console.log("winObj : " + winObj)
}

function htmlEscape(text) {
  return text.toString().replace(/[<>"&]/g, function (match, pos, originalText) {
    switch (match) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      // case "\"":return "&quot;"; 
    }
  });
}
let cmdPath = './'
function runExec (cmdStr) {
  workerProcess = exec(cmdStr, { cwd: cmdPath })
  // 打印正常的后台可执行程序输出
  workerProcess.stdout.on('data', function (data) {
    console.log('stdout: ' + data)
    // analysisBox.innerHTML = data;
  })
  // 打印错误的后台可执行程序输出
  workerProcess.stderr.on('data', function (data) {
    console.log('stderr: ' + data)
  })
  // 退出之后的输出
  workerProcess.on('close', function (code) {
    console.log('out code：' + code)
    // aftercall && aftercall();
  })
}

function deleteFile(url,name){
  var files = [];
      
  if( fs.existsSync(url) ) {    //判断给定的路径是否存在
         
      files = fs.readdirSync(url);    //返回文件和子目录的数组

      files.forEach(function(file,index){

          var curPath = path.join(url,file);

          if(fs.statSync(curPath).isDirectory()) { //同步读取文件夹文件，如果是文件夹，则函数回调
              deleteFile(curPath,name);
          } else {   
                 
              if(file.indexOf(name)>-1){    //是指定文件，则删除
                  fs.unlinkSync(curPath);
                  console.log("删除文件："+curPath);
              }
          }  
      });
  }else{
      console.log("给定的路径不存在！");
  }

}
