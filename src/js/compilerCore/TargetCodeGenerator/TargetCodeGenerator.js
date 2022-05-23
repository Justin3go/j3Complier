const fs = require('fs');


// TODO 语义分析的作用域路径可能需要改
class TargetCodeGenerator {
  constructor(symbolPath, midCodePath) {
    this.symbolPath = symbolPath;
    this.midCodePath = midCodePath;
    this.initStart = `
    assume cs:code,ds:data,ss:stack,es:extended

    extended segment
      db 1024 dup (0)
    extended ends

    stack segment
      db 1024 dup (0)
    stack ends

    data segment
      _buff_p db 256 dup (24h)
      _buff_s db 256 dup (0)
      _msg_p db 0ah,'Output:',0
      _msg_s db 0ah,'Input:',0
      _n dw 0
    data ends

    code segment
    start:	mov ax,extended
      mov es,ax
      mov ax,stack
      mov ss,ax
      mov sp,1024
      mov bp,sp
      mov ax,data
      mov ds,ax
    `;
    this.initEnd = `
    
    `
    this.CONST_TABLE = null;
    this.VAR_TABLE = null;
    this.FUN_TABLE = null;
    this.midCode = null;

    this.targetCode = [];
    this.targetCodeString = '';
    this.index = 0;
    this.ssOffset = 2;
    this.offset = 0;
    this.infuction = false;
    this.dataSegHead =532;
  }
  isNum(s){
    return !Number.isNaN(Number(s));
  }
  getMidCodeLen(){
    let len = 0;
    Object.keys(this.midCode).forEach(()=>{
      len++;
    })
    return len;
  }
  processFile() {
    let _this = this;
    let readSymbolPromise = new Promise((resolve, reject) => {
      fs.readFile(this.symbolPath, 'utf8', (err, res) => {
        if (err) {
          reject(err);
        } else {
          let {CONST_TABLE, VAR_TABLE, FUN_TABLE} = JSON.parse(res);
          _this.CONST_TABLE = CONST_TABLE;
          _this.VAR_TABLE = VAR_TABLE;
          _this.FUN_TABLE = FUN_TABLE;
          resolve();
        }
      })
    })
    let readMidCodePromise = new Promise((resolve, reject) => {
      fs.readFile(this.midCodePath, 'utf8', (err, res) => {
        if (err) {
          reject(err);
        } else {
          _this.midCode = JSON.parse(res);
          resolve();
        }
      })
    })
    return Promise.all([readSymbolPromise, readMidCodePromise]);
  }
  addCode1(s){
    this.targetCode.push(`\t${s}`);
    this.targetCodeString += `\t${s}\n`;
  }
  addCode2(s){
    this.targetCode.push(s);
    this.targetCodeString += `${s}\n`;
  }
  addIndex(s){
    this.targetCode.push(`_${this.index}:\t${s}`);
    this.targetCodeString += `_${this.index}:\t${s}\n`;
  }
  start(){  // TODO
    for(let code of Object.values(this.midCode)){
      this.replaceAddress();  // todo
      if(code[0] == 'main'){
        this.main();
      }else if(code[0] == '+'){
        this.add();
      }else if(code[0] == '-'){
        this.substracion();
      }else if(code[0] == '*'){
        this.multiplication();
      }else if(code[0] == '/'){
        this.division();
      }else if(code[0] == '%'){
        this.remainder();
      }else if(code[0] == '='){
        this.assign();
      }else if(code[0] == 'j<'){
        this.less();
      }else if(code[0] == 'j<='){
        this.lessOrEqual();
      }else if(code[0] == 'j>'){
        this.greater();
      }else if(code[0] == 'j>='){
        this.greaterOrEqual();
      }else if(code[0] == 'j=='){
        this.equal();
      }else if(code[0] == 'j!='){
        this.notEqual();
      }else if(code[0] == 'j!'){
        this.noty();
      }else if(code[0] == 'j'){
        this.jump();
      }else if(code[0] == 'jz'){
        this.ZeroJump();
      }else if(code[0] == 'jnz'){
        this.notzeroJump();
      }else if(code[0] == 'para'){
        this.parameter();
      }else if(code[0] == 'call'){
        this.callFun();
      }else if(code[0] == 'ret'){
        this.ret();
      }else if(code[0] =='sys'){
        this.end();
      }else{
        this.ssOffset = 2;
        this.infuction = true;
        this.funDefine();
      }
      this.index++;
    }
    this.readWrite();
    this.addCode1('code ends');
    this.addCode1('code start');

    return history.targetCodeString;
    
  }
  checkFun(name){
    return name in this.FUN_TABLE;
  }
  checkConst(name){
    return name in this.CONST_TABLE;
  }
  replaceAddress(){
    let code = this.midCode[this.index];
    if('T' in code[1]){
      code[1] = `es:[${parseInt(code[1].split('T')[1])*2}]`;
    }else if(!(this.checkFun(code[1])) && !this.isNum(code[1])){
      code[1] = this.getAddress(code[1], code[4]);
    }
    if('T' in code[2]){
      code[2] = `es:[${parseInt(code[2].split('T')[1])*2}]`;
    }else if(!(this.checkFun(code[2])) && !this.isNum(code[2])){
      code[2] = this.getAddress(code[2], code[4]);
    }
    if('T' in code[3]){
      code[3] = `es:[${parseInt(code[3].split('T')[1])*2}]`;
    }else if(!this.isNum(code[3]) && code[3] != ''){
      code[3] = this.getAddress(code[3], code[4]);
    }else if(this.isNum(code[3]) && code[3] != ''){
      if(code[3] == this.getMidCodeLen()-1 && !this.infuction){
        code[3] = 'quit';
      }else {
        code[3] = `_${code[3]}`;
      }
    }
  }
  getVar(){

  }
  getAddress(name, scope){
    let address = '';
    // if()

  }
  main(){}
  end(){}
  add(){}
  substracion(){}
  multiplication(){}
  division(){}
  remainder(){}
  assign(){}
  less(){}
  lessOrEqual(){}
  greater(){}
  greaterOrEqual(){}
  equal(){}
  notEqual(){}
  noty(){}
  jump(){}
  notzeroJump(){}
  ZeroJump(){}
  parameter(){}
  callFun(){}
  ret(){}
  funDefine(){}
  readWrite(){}
}

async function example1(){
  let symbolPath = 'src/js/compilerCore/symbol.json';
  let midCodePath = 'src/js/compilerCore/midcode.json';
  const TCG = new TargetCodeGenerator(symbolPath, midCodePath);
  await TCG.processFile();
  console.log('over...');
}
example1() 