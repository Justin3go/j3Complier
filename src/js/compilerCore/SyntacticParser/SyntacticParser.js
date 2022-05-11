/** 表达式使用文法如下
 * E -> E1 | E2 | E3 | E4              // 分别代表：表达式，算术，关系，布尔，赋值
 */

/** 算术表达式使用文法如下：
 * E1 -> T + E1 | T - E1 | T           // E1:<算术表达式> T:<项>
 * T -> R1 * T | R1 / T | R1 % T | R1  // R1:<因子>
 * R1 -> (E1) | C | V | F              // C:<常量> V:<变量> F:<函数调用>
 * C -> typenum|typechar                       // typenum:<数值型常量>  typechar:<字符型常量> 
 * V -> typeid                             // typeid:<标识符>
 * F -> typeid(L)                          // L:<实参列表>
 * L -> A | epsilon                    // A:<实参>
 * A -> E | E,A
 */

/** 关系表达式使用文法如下：
 * E2 -> E1OE1                          // O:<关系运算符>：<,>,>=,<=,==,!=
 * O -> > | < | >= | <= | == | !=
 */

/** 布尔表达式使用文法如下：
 * E3 -> B || E3 | B                    // 注意||是运算符，而不是或|, B:<布尔项>
 * B -> R2 && B | R2                    // R2:<布尔因子>
 * R2 -> E1 | E2 | !E3
 */

/** 赋值表达式使用文法如下：
 * E4 -> V E4' | R3 E4'' | E4'' R3
 * E4' -> = E | += E | -= E | *= E | /= E | %= E 
 * R3 -> V | F
 * E4'' -> ++ | --
 */

/***************************** 转换为LL1文法 ********************************/
/** 算术表达式
 * E1 -> T E1'
 * E1' -> + E1 | - E1 | epsilon
 * T -> R1 T'
 * T' -> * T | / T | % T | epsilon
 * R1 -> (E1) | C | V | F 
 * C -> typenum|typechar 
 * V -> typeid
 * F -> typeid(L)
 * L -> A | epsilon
 * A -> E A'
 * A' -> epsilon | ,A
 */

/** 布尔表达式
 * E3 -> B E3'
 * E3' -> || E3 | epsilon
 * B -> R2 B'
 * B' -> && B | epsilon
 * R2 -> E1 | E2 | !E3
 */

// 其他的已经属于LL1文法了


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
    this.patternVT = /[a-z]+|(\|\|)|(>=)|(<=)|(==)|(!=)|(\&\&)|(\+=)|(-=)|(\*=)|(\/=)|(%=)|(\+\+)|(--)|[\-\*\/%\(\),\+=!;{}]/g;
    // 注意这里不仅仅是上两的拼接，还加入了“|”
    this.patternAll = /[A-Z][0-9]*\'*|[a-z]+|(\|\|)|(>=)|(<=)|(==)|(!=)|(\&\&)|(\+=)|(-=)|(\*=)|(\/=)|(%=)|(\+\+)|(--)|[\-\*\/%\(\),\+=!;{}]/g;
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
  const tool = new Tool('C:/My_app/code/j3Complier/src/js/compilerCore/SyntacticParser/Grammar/G.txt')
  tool.init().then((v) => {
    console.log(tool.splited);
  })
}
// example1()
// TODO 文法含有回溯，没解决，通过代码解决的E,R1,R2,E4,R3
// TODO 还有同类非终结符需要用终结符归类
class Expression {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.info = [];
    // TODO 把下方的映射单独封装到一个文件中
    this.codeMap = {
      'char': 101, 'int': 102, 'float': 103, 'break': 104,
      'const': 105, 'return': 106, 'void': 107, 'continue': 108,
      'do': 109, 'while': 110, 'if': 111, 'else': 112, 'for': 113,
      'true': 114, 'false': 115, 'double': 116, 'extern': 117, 'unsigned': 118,
      'register': 119, 'long': 120, 'static': 121,
      '{': 301, '}': 302, ';': 303, ',': 304,
      'typeint': 400, 'typechar': 500, 'typestr': 600, 'typeid': 700, 'typenum': 800,
      '(': 201, ')': 202, '[': 203, ']': 204, '!': 205, '*': 206,
      '/': 207, '%': 208, '+': 209, '-': 210, '<': 211, '<=': 212,
      '>': 213, '>=': 214, '==': 215, '!=': 216, '&&': 217, '||': 218,
      '=': 219, '+=': 220, '-=': 221, '*=': 222, '/=': 223, '%=': 224, '++': 225, '--': 226
    };
    this.reCodeMap = {
      '101': 'char', '102': 'int', '103': 'float', '104': 'break',
      '105': 'const', '106': 'return', '107': 'void', '108': 'continue',
      '109': 'do', '110': 'while', '111': 'if', '112': 'else', '113': 'for',
      '114': 'true', '115': 'false', '116': 'double', '117': 'extern', '118': 'unsigned',
      '119': 'register', '120': 'long', '121': 'static',
      '301': '{', '302': '}', '303': ';', '304': ',',
      '400': 'typeint', '500': 'typechar', '600': 'typestr', '700': 'typeid', '800': 'typenum',
      '201': '(', '202': ')', '203': '[', '204': ']', '205': '!', '206': '*',
      '207': '/', '208': '%', '209': '+', '210': '-', '211': '<', '212': '<=',
      '213': '>', '214': '>=', '215': '==', '216': '!=', '217': '&&', '218': '||',
      '219': '=', '220': '+=', '221': '-=', '222': '*=', '223': '/=', '224': '%=', '225': '++', '226': '--'
    }
    this.tool = null;
    this.res = {};
  }
  async init(filePath) {
    console.log('-----------------------------语法分析相关--------------------------------');
    const tool = new Tool(filePath)
    await tool.init();
    this.tool = tool;
  }
  updateToken(tokens) {  // 再次使用这个实例，不过使用不同的tokens
    this.tokens = tokens;
    this.pos = 0;
    this.info = [];  // TODO 最后在总控程序中，每行都要存储一下这个info，不然下次就会将其清除
  }
  testCode() {  // 测试种别码写对没有
    for (let k of Object.keys(this.codeMap)) {
      console.log(k === this.reCodeMap[this.codeMap[k]]);
    }
  }
  isMatch(c) {
    let code = this.codeMap[c];  // 转换为对应token
    if (!code) console.error('文法中非终结符未找到对应种别码');
    let curToken = this.tokens[this.pos];
    if (curToken === code) {
      this.pos++;  // 匹配了就消耗该字符
      return true;
    } else return false;
  }
  isCurInFirst(Xkey, X) {
    let token = this.tokens[this.pos];
    let sym = this.reCodeMap[token];
    if (this.tool.firstSet.get(Xkey).get(X) === undefined) debugger
    return this.tool.firstSet.get(Xkey).get(X).has(sym);
  }
  isCurInFollow(X) {
    if (this.pos >= this.tokens.length) return true;  // 为undefined说明已经消耗完token了，所以匹配epsilon消耗文法也没事；
    let token = this.tokens[this.pos];
    let sym = this.reCodeMap[token];
    return this.tool.followSet.get(X).has(sym);
  }
  hasEpsilon(X) {
    let res = Array.from(this.tool.firstSet.get(X).values()).some((v) => {
      return v.has('epsilon');
    });
    return res;
  }
  backPos(prevPos) {  // 为了在布尔表达式中修改pos值，同时不影响或的结果
    this.pos = prevPos;
    return false;
  }
  // * 如何需要建立语法树的话就需要每次return当前已经建立的树或者false
  E() {
    let prevPos = this.pos;  // ! 几个终结符或起来的不能消耗字符，这里要回去(E,R1,R2需要这样)
    let ctree = null;
    if (this.isCurInFirst('E', 'E1') &&
      (ctree = this.E1() ||  // 错了pos才需要回去
        this.backPos(prevPos))) {
      return { 'E1': ctree };  // 每一层加自身
    } else if (this.isCurInFirst('E', 'E2') &&
      (ctree = this.E2() ||
        this.backPos(prevPos))) {
      return { 'E2': ctree };  // 每一层加自身
    } else if (this.isCurInFirst('E', 'E3') &&
      (ctree = this.E3() ||
        this.backPos(prevPos))) {
      return { 'E3': ctree };  // 每一层加自身
    } else if (this.isCurInFirst('E', 'E4') &&
      (ctree = this.E4() ||
        this.backPos(prevPos))) {
      return { 'E4': ctree };  // 每一层加自身
    } else if (this.hasEpsilon('E') &&
      this.isCurInFollow('E')) {
      // 使用了epsilon  // TODO 不知道使用了epsilon有什么效果，该执行什么。
      // ? 应该是满足调节直接返回true就可以了，不消耗token，消耗文法，使用下一个文法符号
      return 'epsilon';  // 每一层加自身
    } else {
      return false;
    }
  }
  E1() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.T()) &&
      (ctree2 = this.E1_()))
      return { 'T': ctree1, "E1'": ctree2 };
    else return false;
  }
  E1_() {
    if (this.isMatch('+')) {
      let ctree = this.E1();
      return ctree ? { '+': '+', 'E1': ctree } : false;
    } else if (this.isMatch('-')) {
      let ctree = this.E1();
      return ctree ? { '-': '-', 'E1': ctree } : false;
    } else if (this.isCurInFollow("E1'")) {  // 这里就不用判断是否包含epsilon，因为直接可以判断
      return 'epsilon';
    }
    else {
      this.info.push([this.pos, '期待为+或-'])
      return false
    }
  }
  T() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.R1()) &&
      (ctree2 = this.T_()))
      return { 'R1': ctree1, "T'": ctree2 };
    else return false;
  }
  T_() {
    if (this.isMatch('*')) {
      let ctree = this.T();
      return ctree ? { '*': '*', 'T': ctree } : false;
    } else if (this.isMatch('/')) {
      let ctree = this.T();
      return ctree ? { '/': '/', 'T': ctree } : false;
    } else if (this.isMatch('%')) {
      let ctree = this.T();
      return ctree ? { '%': '%', 'T': ctree } : false;
    } else if (this.isCurInFollow("T'")) {
      return 'epsilon';
    }
    else {
      this.info.push([this.pos, '期待为*/%'])
      return false;
    }
  }
  R1() {
    let prevPos = this.pos;  // ! 几个终结符或起来的不能消耗字符，这里要回去
    let ctree = null;
    if (this.isMatch('(')) {
      ctree = this.E1();
      return (ctree && this.isMatch(')')) ?
        { '(': '(', 'E1': ctree, ')': ')' } :
        false;
    } else if (this.isCurInFirst('R1', 'C') &&
      (ctree = this.C() ||
        this.backPos(prevPos))) {
      return { 'C': ctree };
    } else if (this.isCurInFirst('R1', 'V') &&
      (ctree = this.V() ||
        this.backPos(prevPos))) {
      return { 'V': ctree };
    } else if (this.isCurInFirst('R1', 'F') &&
      (ctree = this.F() ||
        this.backPos(prevPos))) {
      return { 'F': ctree };
    } else {
      this.info.push([this.pos, '期待为（或CVF对应的非终结符'])
      return false;
    }
  }
  C() {
    // 这种直接非终结符也可以判断是否属于first集，但没必要
    if (this.isMatch('typeint')) {
      return 'typeint';
    } else if (this.isMatch('typechar')) {
      return 'typechar';
    } else {
      this.info.push([this.pos, '期待为数字型常量或字符型常量'])
      return false;
    }
  }
  V() {
    if (this.isMatch('typeid')) {
      return 'typeid';
    } else {
      this.info.push([this.pos, '期待为标识符'])
      return false;
    }
  }
  F() {
    let ctree = null;
    if (this.isMatch('typeid')) {
      return (this.isMatch('(') &&
        (ctree = this.L()) &&
        this.isMatch(')')) ?
        { 'typeid': 'typeid', '(': '(', 'L': ctree, ')': ')' } :
        false;
    } else {
      this.info.push([this.pos, '期待为标识符'])
      return false;
    }
  }
  L() {
    let ctree = null;
    if (ctree = this.A()) {
      return { 'A': ctree };
    } else if (this.isCurInFollow('L')) {
      return 'epsilon';
    } else return false;
  }
  A() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.E()) && (ctree2 = this.A_())) {
      return { 'E': ctree1, "A'": ctree2 };
    } return false;
  }
  A_() {
    if (this.isMatch(',')) {
      let ctree = this.A();
      return ctree ? { ',': ',', "A'": ctree } : false;
    } else if (this.isCurInFollow("A'")) {
      return 'epsilon';
    }
    else {
      this.info.push([this.pos, '期待为,'])
      return false
    }
  }
  E2() {
    let ctree1 = null, ctree2 = null, ctree3 = null;
    if ((ctree1 = this.E1) && (ctree2 = this.O()) && (ctree3 = this.E1)) {
      return { 'E1': ctree1, 'O': ctree2, 'E1': ctree3 };
    } else return false;
  }
  O() {
    if (this.isMatch('>')) return '>';
    else if (this.isMatch('<')) return '<';
    else if (this.isMatch('>=')) return '>=';
    else if (this.isMatch('<=')) return '<=';
    else if (this.isMatch('==')) return '==';
    else if (this.isMatch('!=')) return '!=';
    else {
      this.info.push([this.pos, '期待为比较符'])
      return false;
    }
  }
  E3() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.B()) && (ctree2 = this.E3_())) {
      return { 'B': ctree1, "E3'": ctree2 };
    } return false;
  }
  E3_() {
    if (this.isMatch('||')) {
      let ctree = this.E3();
      return ctree ? { '||': '||', 'E3': ctree } : false;
    } else if (this.isCurInFollow("E3'")) {
      return 'epsilon';
    } else {
      this.info.push([this.pos, '期待为||'])
      return false;
    }
  }
  B() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.R2()) && (ctree2 = this.B_())) {
      return { 'R2': ctree1, "B'": ctree2 };
    } return false;
  }
  B_() {
    if (this.isMatch('&&')) {
      let ctree = this.B();
      return ctree ? { '&&': '&&', 'B': ctree } : false;
    } else if (this.isCurInFollow("B'")) {
      return 'epsilon';
    } else {
      this.info.push([this.pos, '期待为&&'])
      return false;
    }
  }
  R2() {
    let prevPos = this.pos;  // ! 几个终结符或起来的不能消耗字符，这里要回去
    let ctree = null;
    if (this.isCurInFirst('R2', 'E1') &&
      (ctree = this.E1() ||
        this.backPos(prevPos)))
      return { 'E1': ctree };
    else if (this.isCurInFirst('R2', 'E2') &&
      (ctree = this.E2() ||
        this.backPos(prevPos)))
      return { 'E2': ctree };
    else if (this.isMatch('!')) {
      ctree = this.E3();
      return ctree ? { '!': '!', 'E3': ctree } : false;
    } else {
      this.info.push([this.pos, '期待为E1E2或！'])
      return false;
    }
  }
  E4() {
    let prevPos = this.pos;
    let ctree = null;
    if (this.isCurInFirst('E4', "VE4'") &&
      (ctree = this.V() ||
        this.backPos(prevPos))) {
      let ctree_ = this.E4_();
      return ctree_ ? { 'V': ctree, "E4'": ctree_ } : false;
    }
    else if (this.isCurInFirst('E4', "R3E4''") &&
      (ctree = this.R3() ||
        this.backPos(prevPos))) {
      let ctree_ = this.E4__();
      return ctree_ ? { 'R3': ctree, "E4''": ctree_ } : false;
    }
    else if (this.isCurInFirst('E4', "E4''R3") &&
      (ctree = this.E4__() ||
        this.backPos(prevPos))) {
      let ctree_ = this.R3();
      return ctree_ ? { "E4''": ctree, 'R3': ctree_ } : false;
    }
    else return false;
  }
  E4_() {
    // TODO 这里(这类)明显冗余了，后续需要优化
    if (this.isMatch('=')) {
      let ctree = this.E();
      return ctree ? { '=': '=', 'E': ctree } : false;
    } else if (this.isMatch('+=')) {
      let ctree = this.E();
      return ctree ? { '+=': '+=', 'E': ctree } : false;
    } else if (this.isMatch('-=')) {
      let ctree = this.E();
      return ctree ? { '-=': '-=', 'E': ctree } : false;
    } else if (this.isMatch('*=')) {
      let ctree = this.E();
      return ctree ? { '*=': '*=', 'E': ctree } : false;
    } else if (this.isMatch('/=')) {
      let ctree = this.E();
      return ctree ? { '/=': '/=', 'E': ctree } : false;
    } else if (this.isMatch('%=')) {
      let ctree = this.E();
      return ctree ? { '%=': '%=', 'E': ctree } : false;
    } else return false
  }
  R3() {
    let prevPos = this.pos;
    let ctree = null;
    if (this.isCurInFirst('R3', 'V') &&
      (ctree = this.V() ||
        this.backPos(prevPos)))
      return { 'V': ctree };
    else if (this.isCurInFirst('R3', 'F') &&
      (ctree = this.F() ||
        this.backPos(prevPos)))
      return { 'F': ctree };
    else return false;
  }
  E4__() {
    if (this.isMatch('++')) return '++';
    else if (this.isMatch('--')) return '--';
    else {
      this.info.push([this.pos, '期待为++或--']);
      return false;
    }
  }
}
function printTree(tree, op = 1) {
  for (let [k, v] of Object.entries(tree)) {
    console.log('-'.repeat(op) + k);
    if (typeof v !== 'object') {
      console.log('-'.repeat(op + 1) + v);
    } else {
      printTree(v, op + 1);
    }
  }
}

/* 使用示范 */
async function example2() {
  const wr = new WordRecognition('C:/My_app/code/j3Complier/src/js/compilerCore/testCase/语法分析用例.txt');
  let [wInfo, error, tokensArr] = await wr.start();
  const exp = new Expression([]);
  await exp.init('C:/My_app/code/j3Complier/src/js/compilerCore/SyntacticParser/Grammar/expression.txt')
  console.log('*'.repeat(20) + 'first集' + '*'.repeat(20));
  console.log(exp.tool.firstSet);
  console.log('*'.repeat(20) + 'follow集' + '*'.repeat(20));
  console.log(exp.tool.followSet);
  let sInfo = {};
  for (let [line, tokens] of Object.entries(tokensArr)) {
    exp.updateToken(tokens)
    let res = exp.E();
    exp.info.length && (sInfo[line] = exp.info); // 收集日志信息
    if (res) {
      console.log('*'.repeat(20) + `第${Number(line) + 1}行语句` + '*'.repeat(20));
      console.log(tokens);
      printTree(res);
    }
  }
  console.log('*'.repeat(20) + '语法分析日志信息' + '*'.repeat(20));
  console.log(sInfo);
}
// example2();
// TODO TOKEN转换为流的话该如何记录其中的行号呢，就是错误处理的时候需要

// 1.终结符if调用match函数
// 2.非终结符对应递归调用
// 3.带或的就每次if判断其first集
// 4.都不满足判断follow集，然后如果有epsilon就使用epsilon
// ? 无或又包含终结符就直接跳过4，两个非终结符我记得能判断吧，不太确定
// ! 只有显式的epsilon需要判断，非显式的会自动递归调用显式的函数
// 5.报错
class ParseSample {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.lines = Object.keys(tokens);
    this.INDEX = 0;
    this.info = [];
    // TODO 把下方的映射单独封装到一个文件中
    this.codeMap = {
      'char': 101, 'int': 102, 'float': 103, 'break': 104,
      'const': 105, 'return': 106, 'void': 107, 'continue': 108,
      'do': 109, 'while': 110, 'if': 111, 'else': 112, 'for': 113,
      'true': 114, 'false': 115, 'double': 116, 'extern': 117, 'unsigned': 118,
      'register': 119, 'long': 120, 'static': 121, 'main': 122,
      '{': 301, '}': 302, ';': 303, ',': 304,
      'typeint': 400, 'typechar': 500, 'typestr': 600, 'typeid': 700, 'typenum': 800,
      '(': 201, ')': 202, '[': 203, ']': 204, '!': 205, '*': 206,
      '/': 207, '%': 208, '+': 209, '-': 210, '<': 211, '<=': 212,
      '>': 213, '>=': 214, '==': 215, '!=': 216, '&&': 217, '||': 218,
      '=': 219, '+=': 220, '-=': 221, '*=': 222, '/=': 223, '%=': 224,
      '++': 225, '--': 226, '&': 227, '|': 228,
      ',': 901, ';': 902,
    };
    this.reCodeMap = {
      '101': 'char', '102': 'int', '103': 'float', '104': 'break',
      '105': 'const', '106': 'return', '107': 'void', '108': 'continue',
      '109': 'do', '110': 'while', '111': 'if', '112': 'else', '113': 'for',
      '114': 'true', '115': 'false', '116': 'double', '117': 'extern', '118': 'unsigned',
      '119': 'register', '120': 'long', '121': 'static', '122': 'main',
      '301': '{', '302': '}', '303': ';', '304': ',',
      '400': 'typeint', '500': 'typechar', '600': 'typestr', '700': 'typeid', '800': 'typenum',
      '201': '(', '202': ')', '203': '[', '204': ']', '205': '!', '206': '*',
      '207': '/', '208': '%', '209': '+', '210': '-', '211': '<', '212': '<=',
      '213': '>', '214': '>=', '215': '==', '216': '!=', '217': '&&', '218': '||',
      '219': '=', '220': '+=', '221': '-=', '222': '*=', '223': '/=', '224': '%=',
      '225': '++', '226': '--', '227': '&', '228': '|',
      '901': ',', '902': ';',
    }
    this.tool = null;
    this.res = [];
  }
  async init(filePath) {
    console.log('-----------------------------语法分析相关--------------------------------');
    const tool = new Tool(filePath)
    await tool.init();
    this.tool = tool;
  }
  // ! 总控程序中这个可能不需要
  updateToken(tokens) {  // 再次使用这个实例，不过使用不同的tokens
    this.tokens = tokens;
    this.pos = 0;
    this.info = [];  // TODO 最后在总控程序中，每行都要存储一下这个info，不然下次就会将其清除
  }
  testCode() {  // 测试种别码写对没有
    for (let k of Object.keys(this.codeMap)) {
      console.log(k === this.reCodeMap[this.codeMap[k]]);
    }
  }
  getCurToken() {
    let line = this.lines[this.INDEX];
    if (line === undefined) return undefined;
    let curToken = this.tokens[line][this.pos];
    return curToken;
  }
  isMatch(c) {
    let code = this.codeMap[c];  // 转换为对应token
    if (!code) console.error('文法中非终结符未找到对应种别码');
    let curToken = this.getCurToken();
    if (curToken === code) {
      this.getNext();
      return true;
    } else return false;
  }
  getNext() {
    this.pos++;  // 消耗该字符
    let line = this.lines[this.INDEX];
    if (this.pos >= this.tokens[line].length) {
      this.INDEX++;  // 跳到下一行开始
      this.pos = 0;
    }
  }
  isCurInFirst(Xkey, X) {
    let token = this.getCurToken();
    let sym = this.reCodeMap[token];
    if (this.tool.firstSet.get(Xkey).get(X) === undefined) debugger
    return this.tool.firstSet.get(Xkey).get(X).has(sym);
  }
  isCurInFollow(X) {
    if (this.lines[this.INDEX] === undefined) return true;  // 为undefined说明已经消耗完token了，所以匹配epsilon消耗文法也没事；
    let token = this.getCurToken();
    let sym = this.reCodeMap[token];
    return this.tool.followSet.get(X).has(sym);
  }
  // 应该不需要
  hasEpsilon(X) {
    let res = Array.from(this.tool.firstSet.get(X).values()).some((v) => {
      return v.has('epsilon');
    });
    return res;
  }
  error(s) {
    this.info.push([this.lines[this.INDEX], this.pos, s]);
    return false;
  }
  parser() {
    while (!this.isMatch('main')) {
      let ctree = null;
      if (ctree = this.S1()) {
        if (ctree === 'epsilon') break;
        this.res.push(ctree);
      } else {
        this.getNext(); // 尝试下一个字符
      }
    }
    if (this.isMatch('(') && this.isMatch(')')) {
      this.res.push('main()')
    } else {
      this.error('main()无法识别');
    }
    let ctree = null;
    if (ctree = this.S5()) {
      this.res.push(ctree)
    } else {
      this.getNext();
    }
    // while (ctree = this.F4()) {  // ! F4就是函数块
    //   if (ctree === 'epsilon') break;
    //   this.res.push(ctree)
    // }
    if (ctree = this.F4()) {
      this.res.push(ctree);
    }
    return this.res;
  }
  backPos(prevPos, prevIndex) {  // 为了在布尔表达式中修改pos值，同时不影响或的结果
    this.pos = prevPos;
    this.INDEX = prevIndex;
    return false;
  }
  E() {  // todo 全部改为之前的那种样子
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('E', 'E4')
      && ((ctree = this.E4()) || this.backPos(prevP, prevI))) {
      return { 'E4': ctree };
    } else if (this.isCurInFirst('E', 'E3')
      && ((ctree = this.E3()) || this.backPos(prevP, prevI))) {
      return { 'E3': ctree };
    } else if (this.isCurInFirst('E', 'E2')
      && ((ctree = this.E2()) || this.backPos(prevP, prevI))) {
      return { 'E2': ctree };
    } else if (this.isCurInFirst('E', 'E1')
      && ((ctree = this.E1()) || this.backPos(prevP, prevI))) {
      return { 'E1': ctree };
    } else {
      return false;
    }
  }
  E1() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.I()) && (ctree2 = this.E1_())) {
      return { 'I': ctree1, "E1'": ctree2 };
    } else {
      return false;
    }
  }
  E1_() {
    let ctree = null;
    if (this.isMatch('+')) {
      ctree = this.E1();
      return ctree ? { '+': '+', 'E1': ctree } : false;
    } else if (this.isMatch('-')) {
      ctree = this.E1();
      return ctree ? { '-': '-', 'E1': ctree } : false;
    } else if (this.isCurInFollow("E1'")) {  // 直接有epsilon，所以不用判断是否有
      return 'epsilon';
    } else {
      return this.error('期待为+或-');
    }
  }
  I() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.I1()) && (ctree2 = this.I_())) {
      return { 'I1': ctree1, "I'": ctree2 };
    } else {
      return false;
    }
  }
  I_() {
    let ctree = null;
    if (this.isMatch('*')) {
      ctree = this.I();
      return ctree ? { '*': '*', 'I': ctree } : false;
    } else if (this.isMatch('/')) {
      ctree = this.I();
      return ctree ? { '/': '/', 'I': ctree } : false;
    } else if (this.isMatch('%')) {
      ctree = this.I();
      return ctree ? { '%': '%', 'I': ctree } : false;
    } else if (this.isCurInFollow("I'")) {
      return 'epsilon';
    } else {
      return this.error('期待为*/%');
    }
  }
  I1() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isMatch('(')) {
      ctree = this.E1();
      return (ctree && this.isMatch(')'))
        ? { '(': '(', 'E1': ctree, ')': ')' }
        : false;
    } else if (this.isCurInFirst('I1', 'C')
      && ((ctree = this.C()) || this.backPos(prevP, prevI))) {
      return { 'C': ctree };
    } else if (this.isCurInFirst('I1', 'F')
      && ((ctree = this.F()) || this.backPos(prevP, prevI))) {
      return { 'F': ctree };
    } else if (this.isCurInFirst('I1', 'V')
      && ((ctree = this.V()) || this.backPos(prevP, prevI))) {
      return { 'V': ctree };
    } else {
      return this.error('期待为（或CVF对应的非终结符');
    }
  }
  C() {
    if (this.isMatch('typeint')) {   // 整数
      return 'typeint';
    } else if (this.isMatch('typenum')) {   // 实数
      return 'typenum';
    } else if (this.isMatch('typechar')) {
      return 'typechar';
    } else {
      return this.error('期待为数字型常量或字符型常量');
    }
  }
  V() {
    if (this.isMatch('typeid')) {
      return 'typeid';
    } else {
      return this.error('期待为标识符');
    }
  }
  F() {
    if (this.isMatch('typeid')) {
      let ctree = null;
      return (this.isMatch('(')
        && (ctree = this.L())
        && this.isMatch(')'))
        ? { 'typeid': 'typeid', '(': '(', 'L': ctree, ')': ')' }
        : false;
    } else {
      return this.error('期待为标识符');
    }
  }
  L() {
    let ctree = this.A();
    if (ctree) {
      return { 'A': ctree };
    } else if (this.isCurInFollow('L')) {
      return 'epsilon';
    } else {
      return false;
    }
  }
  A() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.E()) && (ctree2 = this.A_())) {
      return { 'E': ctree1, "A'": ctree2 };
    } else {
      return false;
    }
  }
  A_() {
    if (this.isCurInFollow("A'")) {
      return 'epsilon';
    } else if (this.isMatch(',')) {
      let ctree = this.A();
      return ctree ? { ',': ',', "A'": ctree } : false;
    } else {
      return this.error('期待为,');
    }
  }
  E2() {
    let ctree1 = null;
    let ctree2 = null;
    let ctree3 = null;
    if ((ctree1 = this.E1()) && (ctree2 = this.O()) && (ctree3 = this.E1())) {
      return { 'E1': ctree1, 'O': ctree2, 'E1': ctree3 };
    } else {
      return false;
    }
  }
  O() {
    if (this.isMatch('>')) return '>';
    else if (this.isMatch('<')) return '<';
    else if (this.isMatch('>=')) return '>=';
    else if (this.isMatch('<=')) return '<=';
    else if (this.isMatch('==')) return '==';
    else if (this.isMatch('!=')) return '!=';
    else {
      return this.error('期待为比较符');
    }
  }
  E3() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.I2()) && (ctree2 = this.E3_())) {
      return { 'I2': ctree1, "E3'": ctree2 };
    } else {
      return false;
    }
  }
  E3_() {
    if (this.isMatch('||')) {
      let ctree = this.E3();
      return ctree ? { '||': '||', 'E3': ctree } : false;
    } else if (this.isCurInFollow("E3'")) {
      return 'epsilon';
    } else {
      return this.error('期待为||');
    }
  }
  I2() {
    let ctree1 = null, ctree2 = null;
    if ((ctree1 = this.I3()) && (ctree2 = this.I2_())) {
      return { 'I3': ctree1, "I2'": ctree2 };
    } else {
      return false;
    }
  }
  I2_() {
    if (this.isMatch('&&')) {
      let ctree = this.I2();
      return ctree ? { '&&': '&&', 'I2': ctree } : false;
    } else if(this.isCurInFollow("I2'")){
      return 'epsilon';
    } else {
      return this.error('期待为&&');
    }
  }
  I3() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('I3', 'E2')
      && ((ctree = this.E2()) || this.backPos(prevP, prevI))) {
      return { 'E2': ctree };
    } else if (this.isCurInFirst('I3', 'E1')
      && ((ctree = this.E1()) || this.backPos(prevP, prevI))) {
      return { 'E1': ctree };
    } else if (this.isMatch('!')) {
      ctree = this.E3();
      return ctree ? { '!': '!', 'E3': ctree } : false;
    } else {
      return this.error('期待为E1E2或！');
    }
  }
  E4() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree1 = null;
    let ctree2 = null;
    if (this.isCurInFirst('E4', "VE4'")
      && ((ctree1 = this.V()) || this.backPos(prevP, prevI))) {
      ctree2 = this.E4_();
      return ctree2 ? { 'V': ctree1, "E4'": ctree2 } : false;
    } else if (this.isCurInFirst('E4', "RE4''")
      && ((ctree1 = this.R()) || this.backPos(prevP, prevI))) {
      ctree2 = this.E4__();
      return ctree2 ? { 'R': ctree1, "E4''": ctree2 } : false;
    } else if (this.isCurInFirst('E4', "E4''R")
      && ((ctree1 = this.E4__()) || this.backPos(prevP, prevI))) {
      ctree2 = this.R();
      return ctree2 ? { "E4''": ctree1, 'R': ctree2 } : false;
    } else {
      return false;
    }
  }
  E4_() {
    // TODO 这里(这类)明显冗余了，后续需要优化
    if (this.isMatch('=')) {
      let ctree = this.E();
      return ctree ? { '=': '=', 'E': ctree } : false;
    } else if (this.isMatch('+=')) {
      let ctree = this.E();
      return ctree ? { '+=': '+=', 'E': ctree } : false;
    } else if (this.isMatch('-=')) {
      let ctree = this.E();
      return ctree ? { '-=': '-=', 'E': ctree } : false;
    } else if (this.isMatch('*=')) {
      let ctree = this.E();
      return ctree ? { '*=': '*=', 'E': ctree } : false;
    } else if (this.isMatch('/=')) {
      let ctree = this.E();
      return ctree ? { '/=': '/=', 'E': ctree } : false;
    } else if (this.isMatch('%=')) {
      let ctree = this.E();
      return ctree ? { '%=': '%=', 'E': ctree } : false;
    } else {
      return this.error('期待为=或某等');
    }
  }
  R() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('R', 'V')
      && ((ctree = this.V()) || this.backPos(prevP, prevI))) {
      return { 'V': ctree };
    } else if (this.isCurInFirst('R', 'F')
      && ((ctree = this.F()) || this.backPos(prevP, prevI))) {
      return { 'F': ctree };
    } else {
      return false;
    }
  }
  E4__() {
    if (this.isMatch('++')) {
      return '++';
    }
    else if (this.isMatch('--')) {
      return '--';
    }
    else {
      return this.error('期待为++或--');
    }
  }
  S() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('S', 'S1')
      && ((ctree = this.S1()) || this.backPos(prevP, prevI))) {
      return { 'S1': ctree };
    } else if (this.isCurInFirst('S', 'S2')
      && ((ctree = this.S2()) || this.backPos(prevP, prevI))) {
      return { 'S2': ctree };
    } else {
      return false;
    }
  }
  S1() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('S1', 'U')
      && ((ctree = this.U()) || this.backPos(prevP, prevI))) {
      return { 'U': ctree };
    } else if (this.isCurInFirst('S1', 'F1')
      && ((ctree = this.F1()) || this.backPos(prevP, prevI))) {
      return { 'F1': ctree };
    } else if (this.isCurInFollow('S1')) {
      return 'epsilon';
    } else {
      return false;
    }
  }
  U() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('U', 'C1')
      && ((ctree = this.C1()) || this.backPos(prevP, prevI))) {
      return { 'C1': ctree };
    } else if (this.isCurInFirst('U', 'V1')
      && ((ctree = this.V1()) || this.backPos(prevP, prevI))) {
      return { 'V1': ctree };
    } else {
      return false;
    }
  }
  C1() {
    if (this.isMatch('const')) {
      let ctree1 = this.C2();
      let ctree2 = this.T();
      return (ctree1 && ctree2) ? { 'const': 'const', 'C2': ctree1, 'T': ctree2 } : false;
    } else {
      return this.error('期待为const开始');
    }
  }
  C2() {
    if (this.isMatch('int')) {
      return 'int';
    } else if (this.isMatch('char')) {
      return 'char';
    } else if (this.isMatch('float')) {
      return 'float';
    } else {
      return this.error('期待为intcharfloat');
    }
  }
  T() {
    if (this.isMatch('typeid')) {
      let f = this.isMatch('=');
      let ctree1 = this.C();
      let ctree2 = this.T_();
      return (f && ctree1 && ctree2)
        ? { 'typeid': 'typeid', 'C': ctree1, "T'": ctree2 }
        : false;
    } else {
      return this.error('期待为标识符');
    }
  }
  T_() {
    if (this.isMatch(';')) {
      return ';';
    } else if (this.isMatch(',')) {
      let ctree = this.T();
      return ctree ? { ',': ',', 'T': ctree } : false;
    } else {
      return this.error('期待为;,');
    }
  }
  V1() {
    let ctree1 = null;
    let ctree2 = null
    if ((ctree1 = this.V2()) && (ctree2 = this.T1())) {
      return { 'V2': ctree1, 'T1': ctree2 };
    } else {
      return false;
    }
  }
  T1() {
    let ctree1 = null;
    let ctree2 = null
    if ((ctree1 = this.V4()) && (ctree2 = this.T1_())) {
      return { 'V4': ctree1, "T1'": ctree2 };
    } else {
      return false;
    }
  }
  T1_() {
    if (this.isMatch(';')) {
      return ';';
    } else if (this.isMatch(',')) {
      let ctree = this.T1();
      return ctree ? { ',': ',', 'T1': ctree } : false;
    } else {
      return this.error('期待为;,');
    }
  }
  V4() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.V()) && (ctree2 = this.V4_())) {
      return { 'V': ctree1, "V4'": ctree2 };
    } else {
      return false;
    }
  }
  V4_() {
    if (this.isCurInFollow("V4'")) {
      return 'epsilon';
    } else if (this.isMatch('=')) {
      let ctree = this.E();
      return ctree ? { '=': '=', 'E': ctree } : false;
    } else {
      return this.error('期待为=');
    }
  }
  V2() {
    if (this.isMatch('int')) {
      return 'int';
    } else if (this.isMatch('char')) {
      return 'char';
    } else if (this.isMatch('float')) {
      return 'float';
    } else {
      return this.error('期待为intcharfloat');
    }
  }
  F1() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.F2())
      && this.isMatch('typeid')
      && this.isMatch('(')
      && (ctree2 = this.L1())
      && this.isMatch(')')
      && this.isMatch(';')) {
      return { 'F2': ctree1, 'typeid': 'typeid', '(': '(', 'L1': ctree2, ')': ')', ';': ';' };
    } else {
      return this.error('期待为F1');  // TODO 后续再把这个错误做个解释
    }
  }
  F2() {
    if (this.isMatch('int')) {
      return 'int';
    } else if (this.isMatch('char')) {
      return 'char';
    } else if (this.isMatch('float')) {
      return 'float';
    } else if (this.isMatch('void')) {
      return 'void';
    } else {
      return this.error('期待为intcharfloatvoid');
    }
  }
  L1() {
    let ctree = this.A1();
    if (ctree) {
      return { 'A1': ctree };
    } else if (this.isCurInFollow('L1')) {
      return 'epsilon';
    } else {
      return false;
    }
  }
  A1() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.V2()) && (ctree2 = this.A1_())) {
      return { 'V2': ctree1, "A1'": ctree2 };
    } else {
      return false;
    }
  }
  A1_() {
    if (this.isCurInFollow("A1'")) {
      return 'epsilon';
    } else if (this.isMatch(',')) {
      let ctree = this.A1();
      return ctree ? { ',': ',', 'A1': ctree } : false;
    } else {
      return this.error('期待为A1_');
    }
  }
  S2() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('S2', 'S3')
      && ((ctree = this.S3()) || this.backPos(prevP, prevI))) {
      return { 'S3': ctree };
    } else if (this.isCurInFirst('S2', 'S4')
      && ((ctree = this.S4()) || this.backPos(prevP, prevI))) {
      return { 'S4': ctree };
    } else if (this.isCurInFirst('S2', 'S5')
      && ((ctree = this.S5()) || this.backPos(prevP, prevI))) {
      return { 'S5': ctree };
    } else {
      return false;
    }
  }
  S3() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('S3', 'S6')
      && ((ctree = this.S6()) || this.backPos(prevP, prevI))) {
      return { 'S6': ctree };
    } else if (this.isCurInFirst('S3', 'S7')
      && ((ctree = this.S7()) || this.backPos(prevP, prevI))) {
      return { 'S7': ctree };
    } else {
      return false;
    }
  }
  S6() {
    let ctree = this.E4();
    if (ctree && this.isMatch(';')) {
      return { 'E4': ctree, ';': ';' };
    } else {
      return this.error('期待为S6');
    }
  }
  S7() {
    let ctree = this.F();
    if (ctree && this.isMatch(';')) {
      return { 'F': ctree, ';': ';' };
    } else {
      return this.error('期待为S7');
    }
  }
  S4() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('S4', 'X1')
      && ((ctree = this.X1()) || this.backPos(prevP, prevI))) {
      return { 'X1': ctree };
    } else if (this.isCurInFirst('S4', 'X2')
      && ((ctree = this.X2()) || this.backPos(prevP, prevI))) {
      return { 'X2': ctree };
    } else if (this.isCurInFirst('S4', 'X3')
      && ((ctree = this.X3()) || this.backPos(prevP, prevI))) {
      return { 'X3': ctree };
    } else if (this.isCurInFirst('S4', 'X4')
      && ((ctree = this.X4()) || this.backPos(prevP, prevI))) {
      return { 'X4': ctree };
    } else if (this.isCurInFirst('S4', 'X5')
      && ((ctree = this.X5()) || this.backPos(prevP, prevI))) {
      return { 'X5': ctree };
    } else {
      return false;
    }
  }
  S5() {
    if (this.isMatch('{')) {
      let ctree = this.T3();
      let f = this.isMatch('}');
      return (ctree && f) ? { '{': '{', 'T3': ctree, '}': '}' } : false;
    } else {
      return this.error('期待为S5')
    }
  }
  T3() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.S()) && (ctree2 = this.T3_())) {
      return { 'S': ctree1, "T3'": ctree2 };
    } else {
      return false;
    }
  }
  T3_() {
    let ctree = null;
    if (this.isCurInFollow("T3'")) {
      return 'epsilon';
    } else if (ctree = this.T3()) {
      return { 'T3': ctree };
    } else {
      return false;
    }
  }
  X1() {
    let ctree1 = null;
    let ctree2 = null;
    let ctree3 = null;
    if (this.isMatch('if')
      && this.isMatch('(')
      && (ctree1 = this.E())
      && this.isMatch(')')
      && (ctree2 = this.S())
      && (ctree3 = this.X1_())) {
      return { 'if': 'if', '(': '(', 'E': ctree1, ')': ')', 'S': ctree2, "X1'": ctree3 };
    } else {
      return this.error('期待为X1')
    }
  }
  X1_() {
    if (this.isCurInFollow("X1'")) {
      return 'epsilon';
    } else if (this.isMatch('else')) {
      let ctree = this.S();
      return ctree ? { 'else': 'else', 'S': ctree } : false;
    } else {
      return this.error('期待为X1_');
    }
  }
  X2() {
    let ctree1 = null;
    let ctree2 = null;
    let ctree3 = null;
    let ctree4 = null;
    if (this.isMatch('for')
      && this.isMatch('(')
      && (ctree1 = this.E())
      && this.isMatch(';')
      && (ctree2 = this.E())
      && this.isMatch(';')
      && (ctree3 = this.E())
      && this.isMatch(')')
      && (ctree4 = this.P())) {
      return {
        'for': 'for',
        '(': '(',
        'E': ctree1,
        ';': ';',
        'E': ctree2,
        ';': ';',
        'E': ctree3,
        ')': ')',
        'P': ctree4
      };
    } else {
      return this.error('期待为X2')  // TODO 检查一遍error前是否有return
    }
  }
  X3() {
    let ctree1 = null;
    let ctree2 = null;
    if (this.isMatch('while')
      && this.isMatch('(')
      && (ctree1 = this.E())
      && this.isMatch(')')
      && (ctree2 = this.P())) {
      return {
        'while': 'while',
        '(': '(',
        'E': ctree1,
        ')': ')',
        'P': ctree2
      }
    } else {
      return this.error('期待为X3');
    }
  }
  X4() {
    let ctree1 = null;
    let ctree2 = null;
    if (this.isMatch('do')
      && (ctree1 = this.P1())
      && this.isMatch('while')
      && this.isMatch('(')
      && (ctree2 = this.E())
      && this.isMatch(')')
      && this.isMatch(';')) {
      return {
        'do': 'do',
        'P1': ctree1,
        'while': 'while',
        '(': '(',
        'E': ctree2,
        ')': ')',
        ';': ';'
      };
    } else {
      return this.error('期待为X4');
    }
  }
  P() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('P', 'S1')
      && ((ctree = this.S1()) || this.backPos(prevP, prevI))) {
      return { 'S1': ctree };
    } else if (this.isCurInFirst('P', 'P2')
      && ((ctree = this.P2()) || this.backPos(prevP, prevI))) {
      return { 'P2': ctree };
    } else if (this.isCurInFirst('P', 'P1')
      && ((ctree = this.P1()) || this.backPos(prevP, prevI))) {
      return { 'P1': ctree };
    } else {
      return false;
    }
  }
  P1() {
    if (this.isMatch('{')) {
      let ctree = this.T4();
      let f = this.isMatch('}');
      return (ctree && f) ? { '{': '{', 'T4': ctree, '}': '}' } : false;
    } else {
      return this.error('期待为P1');
    }
  }
  T4() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.P()) && (ctree2 = this.T4_())) {
      return { 'P': ctree1, "T4'": ctree2 };
    } else {
      return false;
    }
  }
  T4_() {
    let ctree = null;
    if (this.isCurInFollow("T4'")) {
      return 'epsilon';
    } else if (ctree = this.T4()) {
      return { 'T4': ctree };
    } else {
      return false;
    }
  }
  P2() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    if (this.isCurInFirst('P2', 'P3')
      && ((ctree = this.P3()) || this.backPos(prevP, prevI))) {
      return { 'P3': ctree };
    } else if (this.isCurInFirst('P2', 'X2')
      && ((ctree = this.X2()) || this.backPos(prevP, prevI))) {
      return { 'X2': ctree };
    } else if (this.isCurInFirst('P2', 'X3')
      && ((ctree = this.X3()) || this.backPos(prevP, prevI))) {
      return { 'X3': ctree };
    } else if (this.isCurInFirst('P2', 'X4')
      && ((ctree = this.X4()) || this.backPos(prevP, prevI))) {
      return { 'X4': ctree };
    } else if (this.isCurInFirst('P2', 'X5')
      && ((ctree = this.X5()) || this.backPos(prevP, prevI))) {
      return { 'X5': ctree };
    } else if (this.isCurInFirst('P2', 'X6')
      && ((ctree = this.X6()) || this.backPos(prevP, prevI))) {
      return { 'X6': ctree };
    } else if (this.isCurInFirst('P2', 'X7')
      && ((ctree = this.X7()) || this.backPos(prevP, prevI))) {
      return { 'X7': ctree };
    } else {
      return false;
    }
  }
  P3() {
    let ctree1 = null;
    let ctree2 = null;
    let ctree3 = null;
    if (this.isMatch('if')
      && this.isMatch('(')
      && (ctree1 = this.E())
      && this.isMatch(')')
      && (ctree2 = this.P())
      && (ctree3 = this.P3_())) {
      return {
        'if': 'if',
        '(': '(',
        "E": ctree1,
        ')': ')',
        'P': ctree2,
        "P3'": ctree3
      }
    } else {
      return this.error('期待为P3')
    }
  }
  P3_() {
    if (this.isCurInFollow("P3'")) {
      return 'epsilon';
    } else if (this.isMatch('else')) {
      let ctree = this.P();
      return ctree ? { 'else': 'else', 'P': ctree } : false;
    } else {
      return this.error('期待为P3_');
    }
  }
  X5() {
    if (this.isMatch('return')) {
      let ctree = this.X5_();
      return ctree ? { 'return': 'return', "X5'": ctree } : false;
    } else {
      return this.error('期待为X5');
    }
  }
  X5_() {
    let ctree = null;
    if (this.isMatch(';')) {
      return ';';
    } else if ((ctree = this.E())
      && this.isMatch(';')) {
      return { 'E': ctree, ';': ';' };
    } else {
      return this.error('期待为X5_');
    }
  }
  X6() {
    if (this.isMatch('break') && this.isMatch(';')) {
      return { 'break': 'break', ';': ';' };
    } else {
      return this.error('期待为X6');
    }
  }
  X7() {
    if (this.isMatch('continue') && this.isMatch(';')) {
      return { 'continue': 'continue', ';': ';' };
    } else {
      return this.error('期待为X7');
    }
  }
  F3() {
    let ctree1 = null;
    let ctree2 = null;
    let ctree3 = null;
    if ((ctree1 = this.F2())
      && this.isMatch('typeid')
      && this.isMatch('(')
      && (ctree2 = this.L2())
      && this.isMatch(')')
      && (ctree3 = this.S5())) {
      return {
        'F2': ctree1,
        'typeid': 'typeid',
        '(': '(',
        'L2': ctree2,
        ')': ')',
        'S5': ctree3
      }
    } else {
      return this.error('期待为F3')
    }
  }
  L2() {
    let ctree = null;
    if (ctree = this.A2()) {
      return { 'A2': ctree };
    } else if (this.isCurInFollow('L2')) {
      return 'epsilon';
    } else {
      return false;
    }
  }
  A2() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.V2())
      && this.isMatch('typeid')
      && (ctree2 = this.A2_())) {
      return {
        'V2': ctree1,
        'typeid': 'typeid',
        "A2'": ctree2
      }
    } else {
      return this.error('期待为A2');
    }
  }
  A2_() {
    if (this.isCurInFollow("A2'")) {
      return 'epsilon';
    } else if (this.isMatch(',')) {
      let ctree = this.A2();
      return ctree ? { ',': ',', 'A2': ctree } : false;
    } else {
      return this.error('期待为A2_');
    }
  }
  M() {  // ! 这个方法就是parser方法，不需要
    let ctree1 = null;
    let ctree2 = null;
    let ctree3 = null;
    if ((ctree1 = this.S1())
      && this.isMatch('main')
      && this.isMatch('(')
      && this.isMatch(')')
      && (ctree2 = this.S5())
      && (ctree3 = this.F4())) {
      return {
        'S1': ctree1,
        'main': 'main',
        '(': '(',
        ')': ')',
        'S5': ctree2,
        'F4': ctree3
      }
    } else {
      return this.error('期待为M');
    }
  }
  F4() {
    let ctree1 = null;
    let ctree2 = null;
    if ((ctree1 = this.F3()) && (ctree2 = this.F4())) {
      return {
        'F3': ctree1,
        'F4': ctree2
      }
    } else if (this.isCurInFollow('F4')) {
      return 'epsilon';
    } else {
      return false;
    }
  }
}
// TODO 最后记得加let prevP I

function flatObj(arr2) {
  let arr1 = [];
  Object.values(arr2).forEach((v) => {
    arr1.push(...v);
  })
  return arr1;
}
/* 使用示范 */
async function example3() {
  const wr = new WordRecognition('/home/code/j3Complier/src/js/compilerCore/testCase/1.txt');
  let [wInfo, error, tokensArr] = await wr.start();
  const PS = new ParseSample(tokensArr);
  await PS.init('/home/code/j3Complier/src/js/compilerCore/SyntacticParser/Grammar/G.txt')
  let res = PS.parser();
  console.log(res);
  printTree(res);
}
example3();
// 700,219,700,201,202,902