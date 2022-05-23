const fs = require('fs');

class Interpreter{
  constructor(symbolPath, midCodePath){
    this.symbolPath = symbolPath;
    this.midCodePath = midCodePath;

    this.CONST_TABLE = null;
    this.VAR_TABLE = null;
    this.FUN_TABLE = null;
    this.midCode = null;

    this.tempVar = {};
    this.VAR = {};
  }
  async processFile() {
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
          // console.log(_this.Obj2Arr(_this.midCode));
        }
      })
    })
    return Promise.all([readSymbolPromise, readMidCodePromise]);
  }
  Obj2Arr(obj){
    let arr = [];
    let i = 0;
    while(i in obj){
      arr[i] = obj[i];
      i++;
    }
    return arr;
  }
  start(){
    let codeArr = this.Obj2Arr(this.midCode);
    let len = codeArr.length;
    let pc = 0;
    while(pc < len){
      let one = codeArr[pc];
      let key = one[3];
      let op = one[0];
      let term1 = one[1];
      let term2 = one[2];
      // 1.变量--arr， 2.临时变量--含T， 3.数字--不动
      if(term1 instanceof Array){
        term1 = this.tempVar[term1[1]];
      }else if(/T/.test(term1)){
        term1 = this.tempVar[term1];
      }
      if(term2 instanceof Array){
        term2 = this.tempVar[term1[2]];
      }else if(/T/.test(term2)){
        term2 = this.tempVar[term2];
      }
      if(key instanceof Array){
        key = key[1];
      }
      switch(op){
        case '+':
          this.tempVar[key] = term1 + term2;
          break;
        case '-':
          this.tempVar[key] = term1 - term2;
          break;
        case '*':
          this.tempVar[key]= term1 * term2;
          break;
        case '/':
          this.tempVar[key] = term1 / term2;
          break;
        case '%':
          this.tempVar[key] = term1 % term2;
          break;
        case '=':
          this.tempVar[key] = term1;
          break;
        case 'j<':
          if(term1 < term2){
            pc = key;
          }
          break;
        case 'j<=':
          if(term1 <= term2){
            pc = key;
          }
          break;
        case 'j>':
          if(term1 > term2){
            pc = key;
          }
          break;
        case 'j>=':
          if(term1 >= term2){
            pc = key;
          }
          break;
        case 'j==':
          if(term1 = term2){
            pc = key;
          }
          break;
        case 'j!=':
          if(term1 != term2){
            pc = key;
          }
          break;
        case 'j!':
          if(!term1){
            pc = key;
          }
          break;
        case 'j':
          pc = key;
          break;
        case 'jz':
          if(term1 == 0){
            pc = key;
          }
          break;
        case 'jnz':
          if(term1 != 0){
            pc = key;
          }
          break;
        case 'para':
          
          break;
        case 'call':
          break;
        case 'ret':
          break;
        case 'sys':
          break;
// todo 函数调用
      }
    }
  }
}

async function example1(){
  let symbolPath = 'src/js/compilerCore/symbol.json';
  let midCodePath = 'src/js/compilerCore/midcode.json';
  const interpreter = new Interpreter(symbolPath, midCodePath);
  interpreter.processFile().then(()=>{
    console.log(interpreter.midCode);
    console.log(interpreter.Obj2Arr(interpreter.midCode));
    console.log('over...');
  });
}
example1() 