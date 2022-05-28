const fs = require('fs');
const { WordRecognition } = require('../WordRecognition/WordRecognition')

// 用来求FIRST集以及FOLLOW集的
class Tool {
  constructor(filePath) {
    this.filePath = filePath;
    this.productions = [];  // 产生式集合
    this.splited = new Map();  // 分词后的产生式映射，
    this.Vt = new Set();
    this.Vn = new Set();
    this.firstSet = new Map();
    this.followSet = new Map();
    this.prevFollowSize = [];
    // 记录某非终结符是否可以推出epsilon
    this.epsilonMap = new Map();
    // 定义一些正则表达式 
    this.patternVN = /[A-Z][0-9]*\'*/g;
    this.patternVT = /[a-z]+|(\|\|)|(>=)|(<=)|(==)|(!=)|(\&\&)|(\+=)|(-=)|(\*=)|(\/=)|(%=)|(\+\+)|(--)|[\-\*\/%\(\),\+=!;{}<>]/g;
    // 注意这里不仅仅是上两的拼接，还加入了“|”
    this.patternAll = /[A-Z][0-9]*\'*|[a-z]+|(\|\|)|(>=)|(<=)|(==)|(!=)|(\&\&)|(\+=)|(-=)|(\*=)|(\/=)|(%=)|(\+\+)|(--)|[\-\*\/%\(\),\+=!;{}<>]/g;
  }
  processFile() {  // 读入文件
    let _this = this;
    return new Promise((resolve, reject) => {
      fs.readFile(this.filePath, 'utf8', (err, res) => {
        // 需要注意这里还是一个异步操作,封装一个promise
        if (err) {
          reject(err);
        } else {
          // 将每一行后添加一个空格，方便表示空行
          _this.productions = res.split(/[\r\n]+|\r|\n/g);
          resolve(_this.productions);
        }
      })
    })
  }
  splitOr(s) {   // 按单个|符号划分数组
    let s_ = [];
    let prev = 0, i = 1;
    for (i; i < s.length; i++) {
      // 避免匹配到||
      if (s[i] === '|' && s[i + 1] !== '|' && s[i - 1] !== '|') {
        s_.push(s.slice(prev, i));
        prev = i + 1;
      }
    }
    s_.push(s.slice(prev, i));
    return s_
  }
  splitProductions() {  // 分词并找到非终结集以及终结符集
    let ps = this.productions;
    ps.forEach((val, index, arr) => {
      let [front, last] = val.split('->').map(val => val.replace(/ /g, ''));
      // let last_ = last.split(/[^\|]\|[^\|]/);  // 单个|而非两个||  // ! 这个分词有问题，把前后的字符给占了；
      if (last === undefined) debugger
      let last_ = this.splitOr(last);
      let res = [];
      last_.forEach((val) => {
        let resOne = val.match(this.patternAll) || [];
        resOne.length && res.push(resOne);
      })
      // 加入分词映射
      this.splited.set(front, res);

      let resVN = last.match(this.patternVN) || [];
      let resVT = last.match(this.patternVT) || [];
      // 加入终结符集以及非终结符集
      resVN.forEach(val => { this.Vn.add(val) });
      this.Vn.add(front);
      resVT.forEach(val => { this.Vt.add(val) });
    })
  }
  isVn(s) {   // 判断是否是非终结符
    if (!s) return false;
    this.patternVN.lastIndex = 0;
    return this.patternVN.test(s);
  }
  isVt(s) {  // 判断是否是终结符
    if (!s) return false;
    this.patternVT.lastIndex = 0;
    return this.patternVT.test(s);
  }
  can2epsilon(X) {
    // TODO 如果这里栈溢出了，说明是文法产生了循环依赖，之后最好捕获这个异常做出友好的提示
    if (this.isVt(X)) return false;
    if (this.epsilonMap.has(X)) return this.epsilonMap.get(X);
    let res = this.splited.get(X).some((p) => {
      if (p.length === 1 && p[0] === 'epsilon') {
        return true;
      }
      let r = p.every((x) => {
        return this.can2epsilon(x);
      })
      return r;
    })
    this.epsilonMap.set(X, res);
    return res;
  }
  getFirst() {
    for (let [key, val] of this.splited) {
      for (let v of val) {
        this.getFirstOne(v, key);
      }
    }
  }
  getFirstOne(v, key) {  // 单个产生式创建First集(以|符号区分的)
    let id = v.join('');  // 作为First集的键
    let key2v = this.firstSet.get(key);
    if (key2v && key2v.has(id)) return key2v.get(id);
    let items = new Set();  // 将要加入的元素
    // 步骤一&&步骤二
    if (this.isVt(v[0])) {  // 由于我把epsilon也算作终结符了，所以这里是两步作为一步
      items.add(v[0]);
    }// 步骤三 
    else {
      if (!this.firstSet.has(v[0])) {
        for (let v_ of this.splited.get(v[0])) {
          this.getFirstOne(v_, v[0]);
        }
      }
      for (let [i, j] of this.firstSet.get(v[0])) {
        for (let n of j) {
          n !== 'epsilon' && items.add(n);
        }
      }
    }
    // 步骤四 
    if (this.can2epsilon(v[0])) {
      let flag = true;
      // 步骤四-1
      for (let i = 1; i < v.length; i++) {
        if (!this.can2epsilon(v[i])) {
          let res = this.getFirstOne(v.slice(i));
          res.forEach((v) => { items.add(v) });
          flag = false;
          break;
        }
      }
      // 步骤四-2
      if (flag) {
        items.add('epsilon')
      }
    }
    if (key && items.size !== 0) {
      if (this.firstSet.has(key)) {
        this.firstSet.get(key).set(id, items)
      } else {
        this.firstSet.set(key, new Map([[id, items]]));
      }
    }
    // ! first集有循环依赖问题吗
    return items;
  }
  getFollow() {  // 创建Follow集
    this.initFollow();
    do {
      this.getOnceFollow();
    } while (this.isChange())
  }
  initFollow() {
    let i = 0;
    for (let k of this.splited.keys()) {
      if (i === 0) {
        this.followSet.set(k, new Set('#'));
        this.prevFollowSize.push(1);
      } else {
        this.followSet.set(k, new Set());
        this.prevFollowSize.push(0);
      }
      i++;
    }
  }
  isChange() {
    let res = false;
    let i = 0;
    for (let m of this.followSet) {
      if (m.size !== this.prevFollowSize[i]) {
        res = true;
      }
      this.prevFollowSize[i++] = m.size;  // 更新
    }
    return res;
  }
  getOnceFollow() {
    for (let [kF, vF] of this.followSet) {
      for (let [kS, vS] of this.splited) {  // 从上往下找
        for (let arr of vS) {
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] === kF) {
              // 步骤二
              if (this.isVt(arr[i + 1])) {
                vF.add(arr[i + 1])
              } else if (this.isVn(arr[i + 1])) {  // 步骤三
                for (let set of this.firstSet.get(arr[i + 1]).values()) {
                  for (let s of set) {
                    if (s !== 'epsilon') {
                      vF.add(s);
                    }
                  }
                }
              }
              // 步骤四
              if (i === arr.length - 1 ||
                this.multi2epsilon(arr.slice(i + 1))) {
                let addItems = this.followSet.get(kS);
                for (let item of addItems) {
                  vF.add(item);
                }
              }
            }
          }
        }
      }
    }
  }
  multi2epsilon(arr) {
    let res = arr.every((e) => {
      return this.can2epsilon(e);
    })
    return res;
  }
  async init() {
    await this.processFile();
    this.splitProductions();
    this.getFirst();
    this.getFollow();
    // 然后直接使用实例上的属性就可以了
  }
}
/* 使用示范 */
async function example1() {
  const tool = new Tool('src/js/compilerCore/SyntacticParser/Grammar/expression.txt')
  tool.init().then((v) => {
    console.log(tool.splited);
    // 或follow集，first集等
  })
}
example1()
class PredictAnalysisor {
  constructor() {
    this.tool = null;
    this.preTable = {};
    this.i = 0;
    // this.input = input;
  }
  async init(filePath) {
    const tool = new Tool(filePath)
    await tool.init();
    this.tool = tool;
    console.log('-----------------------------预测分析相关--------------------------------');
  }
  add(X, a, s) {
    if (!(X in this.preTable)) {
      this.preTable[X] = {};
    }
    this.preTable[X][a] = s;
  }
  setTable() {
    for (let [X, S] of this.tool.firstSet) {
      for (let [x, s] of S) {
        for (let v of s) {
          this.add(X, v, [X, x])
          if (v == 'epsilon') {
            for (let i of this.tool.followSet.get(X)) {
              this.add(X, i, [X, x])
            }
          }
        }
      }
    }
  }
  analyse(input) {
    let stack = ['#', 'E'];
    while (stack[stack.length - 1] != '#') {
      let sym = input[this.i];
      let X = stack[stack.length - 1];
      stack.pop();
      if(X == sym){
        this.i++;
        continue
      }
      // let Grammar;
      try{
        var Grammar = this.preTable[X][sym];
      }catch{
        return 'error';
        let g = Grammar[1];
        g.split('').reverse().forEach((v)=>{
          stack.push(v);
        })
      }break;
    }
    return true;
  }
}
async function example2() {
  const PA = new PredictAnalysisor();
  await PA.init('src/js/compilerCore/SyntacticParser/Grammar/expression.txt');
  PA.setTable();
  console.log(PA.preTable);
  let res = PA.analyse(['typeint','+','typeint','*', 'typeint', '#']);
  console.log(res);
}
// example2();