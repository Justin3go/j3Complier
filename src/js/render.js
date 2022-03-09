const { ipcRenderer } = require('electron');
const fs = require('fs');

let inputText = document.querySelector('.left');
let analysisBox = document.querySelector('.top-content-text');
let reportBox = document.querySelector('.bottom-content-text');

ipcRenderer.on('process-code', (event, arg) => {
  let code = inputText.value;
  // TODO 调用api来编译code并生成报告
  analysisBox.innerHTML = htmlEscape(code);
  reportBox.innerHTML = '加载成功';
})

ipcRenderer.on('open-file', (event, arg) => {
  console.log('filepath: ',arg);
  fs.readFile(arg[0], (err, data)=>{
    if(err)console.log(err);  // 最好弹出模态框提示
    else {
      inputText.value = data;
    }
  })
})

inputText.addEventListener('drop', (e)=>{
  e.preventDefault(); // 取消默认
  e.stopPropagation(); // 阻止冒泡
  // TODO 放入多个文件需要友好提示只能一个
  let file = e.dataTransfer.files[0];  
  fs.readFile(file.path, (err, data)=>{
    if(err)console.log(err);  // 最好弹出模态框提示
    else {
      inputText.value = data;
    }
  })
});
inputText.addEventListener('dragover',(e)=>{
  e.preventDefault(); // 取消默认
  e.stopPropagation(); // 阻止冒泡
})

function htmlEscape(text){ 
  return text.replace(/[<>"&]/g, function(match, pos, originalText){
    switch(match){
    case "<": return "&lt;"; 
    case ">":return "&gt;";
    case "&":return "&amp;"; 
    case "\"":return "&quot;"; 
  } 
  }); 
}
