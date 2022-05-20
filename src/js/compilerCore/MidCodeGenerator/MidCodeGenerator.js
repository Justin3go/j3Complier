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
  const tool = new Tool('C:/My_app/code/j3Complier/src/js/compilerCore/SyntacticParser/Grammar/E.txt')
  tool.init().then((v) => {
    console.log(tool.splited);
    // 或follow集，first集等
  })
}
// example1()

class MidCodeGenerator {
  constructor(tokens, srcWord) {
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
    // * 中间代码生成相关
    this.srcWord = srcWord;  // 符号表需要对应真实的名字
    this.NXQ_ = 0;  // 指向即将自动生成的四元式编号
    this.tempVar = {};  // 临时变量的存储位置
    this.midCode = {};
    this.CONST_TABLE = {};
    this.scopeCount = 0;   // todo 作用域编号，每发现(进入)一个新的作用域，编号要加一，而退出作用域和下面不一样，不需要减一
    this.scopePath = [0];  // todo 进入和退出需要压栈和出栈
    this.VAR_TABLE = {};
    this.FUN_TABLE = {};
    this.STR_TABLE = {};   // todo delete
  }
  async init(filePath) {
    console.log('-----------------------------语法分析相关--------------------------------');
    const tool = new Tool(filePath)
    await tool.init();
    this.tool = tool;
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
  backPos(prevPos, prevIndex, nxq) {
    this.pos = prevPos;
    this.INDEX = prevIndex;
    if (nxq !== undefined) this.deleteAfterNXQ(nxq);  // ! 在中间代码生成中，还要删除试探生成的中间代码
    return false;
  }
  parser() {
    while (!this.isMatch('main')) {
      let ctree = null;
      if (ctree = this.S1()) {
        if (ctree === 'epsilon') break;
      } else {
        this.getNext(); // 尝试下一个字符
      }
    }
    if (this.isMatch('(') && this.isMatch(')')) {
      this.genCode('main', undefined, undefined, undefined);
    } else {
      this.error('main()无法识别');
    }
    if (this.S5()) {
      this.genCode('sys', undefined, undefined, undefined);
    } else {
      this.getNext();
    }
    // while (ctree = this.F4()) {  // ! F4就是函数块
    //   if (ctree === 'epsilon') break;
    //   this.res.push(ctree)
    // }
    this.F4();
    return this.midCode;
  }
  /** 中间代码生成所新增函数 */
  NXQ() {  // 自动加一
    return this.NXQ_++;
  }
  genCode(op, arg1, arg2, result) {
    this.midCode[this.NXQ()] = [op, arg1, arg2, result];
    return true;
  }
  newTemp(X) {  // X为文法符号
    if (!(X in this.tempVar)) {
      this.tempVar[X] = [];
    }
    let len = this.tempVar[X].length;
    this.tempVar[X][len] = undefined;  // 初始化可以占据数组长度
    return X + '$' + len;  // ! 返回如E$0,E$1,每次调用往后增加
  }

  getRealTempPos(nt) {
    let [X, pos] = nt.split('$');
    return [X, pos];
  }
  getCurTempPosStr(X) {   // ! 不用每次都传来传去，每次都是使用最新的就可以了，因为都是刚刚申请的变量
    let len = this.tempVar[X].length;
    return X + '$' + (len - 1);
  }
  merge(P1, P2) { // 合并两个四元式链，返回链首(P2 != 0, 否则会形成环)
    if (P2 == 0) return P1;
    else {
      let P = P2;
      while (this.midCode[P][3] != 0) {
        P = this.midCode[P][3];
      }
      this.midCode[P][3] = P1;  // P1在前，P2在后
      return P2;
    }
  }
  backPatch(P, t) {  // 将链首所连接的每个四元式的第四个分量都改写为t
    let Q = P;
    while (Q != 0) {
      let m = this.midCode[Q][3];
      this.midCode[Q][3] = t;
      Q = m;
    }
    return true;
  }
  // ! 注意每次使用需要在isMatch之前使用，否则获取的就是下一个字符了，因为isMatch会移动指针
  getSrcWord() {  // 返回当前真实的名字，而不是像typeid这样的类型
    let line = this.lines[this.INDEX];
    if (line === undefined) return undefined;
    let curWord = this.srcWord[line][this.pos][1];
    return curWord;
  }
  // 下面这三个函数处理作用域相关
  inScope() {
    let count = ++this.scopeCount;
    this.scopePath.push(count);
    return true;
  }
  outScope() {
    this.scopePath.pop();
    return true;
  }
  getScopePath() {
    return this.scopePath.join('/');
  }
  // todo 后续可能要单独检查不同符号表中是否有相同的名字，这应该也是不允许的，需要报错
  getVarEntry(word) {  // 检查是否已经声明，同时返回对应指针，在我的代码中返回的是对应键值
    if (word in this.FUN_TABLE) this.error(`函数声明${word}不能这样使用`);
    else if (word in this.CONST_TABLE) this.error(`不能修改常量${word}`);
    else if (!(word in this.VAR_TABLE)) this.error(`变量${word}未声明`);
    else if (word in this.VAR_TABLE) {
      return ['vartable', word, this.getScopePath()];  // ! 这是正确返回，第一个为表名
    } else return undefined;  // ! 统一错误返回
  }
  getEntry(word) {  // 可以是常量，也可以是变量，因为能使用常量的地方一定能使用变量，但能使用变量的地方不一定能使用常量
    if (word in this.FUN_TABLE) this.error(`函数声明${word}不能这样使用`);
    else if (!(word in this.CONST_TABLE) && !(word in this.VAR_TABLE)) {
      this.error(`${word}未声明就使用`);
    }
    if (word in this.CONST_TABLE) {
      return ['consttable', word];
    } else if (word in this.VAR_TABLE) {
      return ['vartable', word, this.getScopePath()];
    }
    return undefined;  // ! 统一错误返回
  }
  getFunEntry(word) {
    if (!(word in this.FUN_TABLE)) {
      this.error(`函数${word}未声明就使用`);
      return undefined;
    } else {
      return ['funtable', word];
    }
  }
  /** 递归下降法文法对应函数 */
  // * 表达式
  // ! 调用了某个函数时，就可以使用该函数的临时变量对当前函数的临时变量进行赋值
  // ! E_函数里属于E，在其中对临时变量进行操作就是对this.tempVar.E进行操作
  // ! 为了方便，直接使用文法符号本身+$+数字代替其.PLACE，其他的语义变量则不变，以小写形式加在其后面
  assignTemp(X1, X2) {  // X1 = X2 // * 都是对应最新的进行赋值
    let X1place = this.tempVar[X1];
    let X2place = this.tempVar[X2];
    X1place[X1place.length - 1] = X2place[X2place.length - 1];
  }
  assignOther(X, something) {  // * 对最新一个进行赋值
    let Xplace = this.tempVar[X];
    Xplace[Xplace.length - 1] = something;
  }
  deleteAfterNXQ(nxq) {   // 删除nxq之后的中间代码，包括nxq
    this.NXQ_ = nxq;
    while (nxq in this.midCode) {
      delete this.midCode[nxq];
      nxq++;
    }
    return true;
  }
  isE3(prevP, prevI) {
    let curP = this.pos;
    let curI = this.INDEX;
    let end;
    if (curI == prevI) end = curP;
    else end = this.tokens[this.lines[prevI]].length - 1;
    let line = this.tokens[this.lines[prevI]];
    let flag = line.slice(prevP, end).some((v) => {
      return v == '217' || v == '218';
    })
    return flag;
  }

  E() {  // * over
    let prevP = this.pos;
    let prevI = this.INDEX;
    let prevNXQ = this.NXQ_;
    // this.newTemp('E'); // ! 新增一个临时变量存储
    if (this.isCurInFirst('E', 'E4')
      && (this.E4() || this.backPos(prevP, prevI, prevNXQ))) {
      // this.assignTemp('E', 'E4');  // 赋值表达式没有
      return true;
    } else if (this.isCurInFirst('E', 'E3')
      && (this.E3() || this.backPos(prevP, prevI, prevNXQ))
      && (this.isE3(prevP, prevI) || this.backPos(prevP, prevI, prevNXQ))) {
      // this.assignTemp('E', 'E3');  // todo 算术表达式会走这里，并且backPos回来生成的四元式也没有删除
      return true;
    } else if (this.isCurInFirst('E', 'E2')
      && (this.E2() || this.backPos(prevP, prevI, prevNXQ))) {
      // this.assignTemp('E', 'E2');  // todo
      return true;
    } else if (this.isCurInFirst('E', 'E1')
      && (this.E1() || this.backPos(prevP, prevI, prevNXQ))) {
      this.newTemp('E');
      this.assignTemp('E', 'E1');  // 有
      return true;
    } else {
      return false;
    }
  }
  E1() {  // * over
    if (this.I() && this.E1_()) {
      return true;
    } else {
      return false;
    }
  }
  E1_() {  // * over
    this.newTemp('E1');  // 这里申请值
    if (this.isMatch('+') && this.E1()) {  // 必须在使用了E1之后获取和申请
      let nt1 = this.getCurTempPosStr('E1');
      let nt2 = this.newTemp('E1');
      let nt3 = this.getCurTempPosStr('I');
      this.genCode('+', nt1, nt3, nt2);  // 结果也存在E1里面，算了，万一后面不行呢
      return true;
    } else if (this.isMatch('-') && this.E1()) {
      let nt1 = this.getCurTempPosStr('E1');
      let nt2 = this.newTemp('E1');
      let nt3 = this.getCurTempPosStr('I');
      this.genCode('-', nt1, nt3, nt2);
      return true;
    } else if (this.isCurInFollow("E1'")) {
      this.assignTemp('E1', 'I');
      return true;
    } else {
      return this.error('期待为+或-');
    }
  }
  I() {  // * over
    this.newTemp('I');
    if (this.I1() && this.I_()) {
      return true;
    } else {
      return false;
    }
  }
  I_() {  // * over
    if (this.isMatch('*') && this.I()) {
      let nt1 = this.getCurTempPosStr('I');
      let nt2 = this.newTemp('I');
      let nt3 = this.getCurTempPosStr('I1');
      this.genCode('*', nt1, nt3, nt2);  // 结果也存在I中
      return true;
    } else if (this.isMatch('/') && this.I()) {
      let nt1 = this.getCurTempPosStr('I');
      let nt2 = this.newTemp('I');
      let nt3 = this.getCurTempPosStr('I1');
      this.genCode('/', nt1, nt3, nt2);
      return true;
    } else if (this.isMatch('%') && this.I()) {
      let nt1 = this.getCurTempPosStr('I');
      let nt2 = this.newTemp('I');
      let nt3 = this.getCurTempPosStr('I1');
      this.genCode('%', nt1, nt3, nt2);
      return true;
    } else if (this.isCurInFollow("I'")) {
      this.assignTemp('I', 'I1');
      return true;
    } else {
      return this.error('期待为*/%');
    }
  }
  I1() {  // todo 如果要做自减需要改这里,不知道函数调用该返回什么
    let prevP = this.pos;
    let prevI = this.INDEX;
    let prevNXQ = this.NXQ_;
    this.newTemp('I1');
    let word;
    let nt;
    if (this.isMatch('(') && this.E1() && this.isMatch(')')) {
      this.assignTemp('I1', 'E1');
      return true;
    } else if (this.isCurInFirst('I1', 'C')
      && ((word = this.C()) || this.backPos(prevP, prevI, prevNXQ))) {
      this.assignOther('I1', word);
      return true;
    } else if (this.isCurInFirst('I1', 'F')
      && ((nt = this.F()) || this.backPos(prevP, prevI, prevNXQ))) {
      this.assignOther('I1', nt);
      return true;
    } else if (this.isCurInFirst('I1', 'V')
      && ((word = this.V()) || this.backPos(prevP, prevI, prevNXQ))) {
      let entry = this.getVarEntry(word);
      this.assignOther('I1', entry);
      return true;
    } else {
      return this.error('期待为（或CVF对应的非终结符');
    }
  }
  C() {  // * over
    let word = this.getSrcWord();
    if (this.isMatch('typeint')) {   // 整数
      return word;
    } else if (this.isMatch('typenum')) {   // 实数
      return word;
    } else if (this.isMatch('typechar')) {
      return word;
    } else {
      return this.error('期待为数字型常量或字符型常量');
    }
  }
  V() {  // * over
    let word = this.getSrcWord();
    if (this.isMatch('typeid')) {
      return word;
    } else {
      return this.error('期待为标识符');
    }
  }

  // * 函数调用
  F() {
    let word = this.getSrcWord();
    let nt = this.newTemp('F');
    if (this.isMatch('typeid')) {
      let f1 = this.isMatch('(');
      let f2 = this.L();
      let f3 = this.isMatch(')');
      this.genCode('call', word, undefined, nt);
      return (f1 && f2 && f3) ? nt : false;
    } else {
      return this.error('期待为标识符');
    }
  }
  L() {
    let f = this.A();
    if (f) {
      return true;
    } else if (this.isCurInFollow('L')) {
      return true;
    } else {
      return false;
    }
  }
  A() {
    if (this.E()
      && this.genCode('para', this.getCurTempPosStr('E'), undefined, undefined)
      && this.A_()) {
      return true;
    } else {
      return false;
    }
  }
  A_() {
    if (this.isMatch(',')) {
      let f = this.A();
      return f;
    } else if (this.isCurInFollow("A'")) {
      return true;
    } else {
      return this.error('期待为,');
    }
  }


  E2() {  // * o
    let f1 = this.E1();
    let place1 = this.getCurTempPosStr('E1');

    let rop = this.O();

    let f2 = this.E1();
    let place2 = this.getCurTempPosStr('E1');

    if (f1 && rop && f2) {
      this.tempVar.I3tc = this.NXQ_;  // ! 除place外的其他语义变量是这样命名的
      this.tempVar.I3fc = this.NXQ_ + 1;
      this.tempVar.E2tc = this.NXQ_;
      this.tempVar.E2fc = this.NXQ_ + 1;
      this.genCode('j' + rop, place1, place2, 0);
      this.genCode('j', undefined, undefined, 0);
      return true;
    } else {
      return false;
    }
  }
  O() {  // * o
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
    if (this.I2() && this.E3_()) {
      return true;
    } else {
      return false;
    }
  }
  E3_() {
    if (this.isMatch('||')) {
      this.tempVar.E3fc = this.tempVar.I2fc;
      this.tempVar.E3tc = this.tempVar.I2tc;
      this.backPatch(this.tempVar.E3fc, this.NXQ_);
      let f = this.E3();
      this.tempVar.E3fc = this.tempVar.I2fc;
      this.tempVar.E3tc = this.tempVar.I2tc;
      return f;
    } else if (this.isCurInFollow("E3'")) {
      return 'epsilon';
    } else {
      return this.error('期待为||');
    }
  }
  I2() {
    if (this.I3() && this.I2_()) {
      return true;
    } else {
      return false;
    }
  }
  I2_() {
    if (this.isMatch('&&')) {  // 每当执行到&&的时候开始回填
      this.tempVar.I2tc = this.tempVar.I3tc;  // ! 新增
      this.tempVar.I2fc = this.tempVar.I3fc;
      this.backPatch(this.tempVar.I2tc, this.NXQ_)  // 是i3
      let f = this.I2();
      this.tempVar.I2tc = this.tempVar.I3tc;
      this.tempVar.I2fc = this.tempVar.I3fc;
      return f;
    } else if (this.isCurInFollow("I2'")) {
      return true;
    } else {
      return this.error('期待为&&');
    }
  }
  I3() {  // * o 
    let prevP = this.pos;
    let prevI = this.INDEX;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('I3', 'E2')
      && (this.E2() || this.backPos(prevP, prevI, prevNXQ))) {
      // 相关语义动作放到了E2中执行
      this.tempVar.E3tc = this.tempVar.E2tc;
      this.tempVar.E3fc = this.tempVar.E2fc;
      return true;
    } else if (this.isCurInFirst('I3', 'E1')
      && (this.E1() || this.backPos(prevP, prevI, prevNXQ))) {
      this.tempVar.I3tc = this.NXQ_;
      this.tempVar.I3fc = this.NXQ_ + 1;
      let place = this.getCurTempPosStr('E1');  // 获取入口
      this.genCode('jnz', place, undefined, 0);
      this.genCode('j', undefined, undefined, 0);
      return true;
    } else if (this.isMatch('!') && this.E3()) {
      this.tempVar.I3tc = this.tempVar.E3fc;   // todo 说明这里需要E3里赋值真假出口的语义变量
      this.tempVar.I3fc = this.tempVar.E3tc;
      return true;
    } else {
      return this.error('期待为E1E2或！');
    }
  }
  E4() {  // * over
    if(this.INDEX == 9)debugger
    let word = this.getSrcWord();
    if (this.isMatch('typeid')
      && this.isMatch('=')
      && this.E()) {
      let place = this.getCurTempPosStr('E');
      let entry = this.getVarEntry(word);
      this.genCode('=', place, undefined, entry);
      return true;
    }
    else {
      return this.error('期待为E4');
    }
  }


  S() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let prevNXQ = this.NXQ_;
    let ctree = null;
    if (this.isCurInFirst('S', 'S1')
      && ((ctree = this.S1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S1': ctree };
    } else if (this.isCurInFirst('S', 'S2')
      && ((ctree = this.S2()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S2': ctree };
    } else {
      return false;
    }
  }
  S1() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('S1', 'U')
      && ((ctree = this.U()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'U': ctree };
    } else if (this.isCurInFirst('S1', 'F1')
      && ((ctree = this.F1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'F1': ctree };
    } else if (this.isCurInFollow('S1')) {
      return 'epsilon';  // ! 这里不能改，因为主控程序要区分
    } else {
      return false;
    }
  }
  U() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('U', 'C1')
      && ((ctree = this.C1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'C1': ctree };
    } else if (this.isCurInFirst('U', 'V1')
      && ((ctree = this.V1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'V1': ctree };
    } else {
      return false;
    }
  }
  // * 常量声明语句
  entryConst(id, key, val) {  // 对二维符号表进行赋值，以变量名作为列键(id)，常量类型、值作为行键(key)
    let table = this.CONST_TABLE;
    if (!(id in table)) {
      table[id] = {};
    }
    table[id][key] = val; // table['A'][type'] = int , table['A']['val'] = 123
  }
  // ! 将return的语法树改为了需要return的综合属性，
  // ! 然后如果不需要传递的话就直接return true或false了，
  // ! 不需要再把递归调用的过程以语法树的结构记录下来了
  // ! 把ctree改为f
  // ! 传递的属性命名为大写
  // ! 返回的typeid或typeint等type...需要获取类型对应的真实值
  C1() {
    if (this.isMatch('const')) {
      let TYPE = this.C2();   // 执行完ConstHead
      let f = this.T(TYPE);  // 传递
      // 所有执行完，即ConstDCL执行完
      return (TYPE && f);  // ! 比如这里是return的bool
    } else {
      return this.error('期待为const开始');
    }
  }
  C2() {
    // 执行ConstType,这里不需要改，直接返回对应的类型就可以了
    if (this.isMatch('int')) {
      return 'int';   // ! 而这里就是return的属性供上层使用
    } else if (this.isMatch('char')) {
      return 'char';
    } else if (this.isMatch('float')) {
      return 'float';
    } else {
      return this.error('期待为intcharfloat');
    }
  }
  T(TYPE) {  // 这里会修改符号表
    let word = this.getSrcWord();  // 获取下面typeid对应的真实名
    if (this.isMatch('typeid')) {
      let f = this.isMatch('=');
      let VAL = this.C();  // todo 这里需要返回值
      // 执行完一次ConstTDef
      this.entryConst(word, 'type', TYPE);
      this.entryConst(word, 'val', VAL);
      let f1 = this.T_(TYPE); // 这里也可能需要type
      return (f && VAL && f1);
    } else {
      return this.error('期待为标识符');
    }
  }
  T_(TYPE) {
    if (this.isMatch(';')) {
      return ';';
    } else if (this.isMatch(',')) {
      let f = this.T(TYPE);
      return f;
    } else {
      return this.error('期待为;,');
    }
  }
  // * 常量声明语句通过测试...

  // * 变量声明语句
  entryVar(id, type, val) {  // 这里就一次性赋值完type与val，因为有可能第二次重复声明val没有，所以就要赋val为undifined
    let table = this.VAR_TABLE;
    let path = this.getScopePath();
    if (!(id in table)) {
      table[id] = {};  // 以路径为key
    }
    if (!(path in table[id])) {
      table[id][path] = {};
    }
    table[id][path]['type'] = type;
    // ! 不传val，在js中就自动为undefined，所以这里也是直接赋值
    table[id][path]['val'] = val;
  }
  V1() {
    let TYPE;
    if ((TYPE = this.V2()) && this.T1(TYPE)) {
      return true;
    } else {
      return false;
    }
  }
  T1(TYPE) {
    if (this.V4(TYPE) && this.T1_(TYPE)) {
      return true;
    } else {
      return false;
    }
  }
  T1_(TYPE) {
    if (this.isMatch(';')) {
      return true;
    } else if (this.isMatch(',')) {
      let f = this.T1(TYPE);
      return f;
    } else {
      return this.error('期待为;,');
    }
  }
  V4(TYPE) {
    let typeid;
    if ((typeid = this.V()) && this.V4_(typeid, TYPE)) {
      return true;
    } else {
      return false;
    }
  }
  V4_(typeid, TYPE) {  // 变量名与变量类型  //  算术表达式需要返回值，声明时怎么调用中间代码产生对应的结果呢？
    if (this.isMatch('=') && this.E()) {
      let VAL = this.getCurTempPosStr('E');
      this.entryVar(typeid, TYPE, VAL);
      this.genCode('=', VAL, undefined, typeid);
      return true;
    } else if (this.isCurInFollow("V4'")) {
      this.entryVar(typeid, TYPE);
      return true;
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
  // * 变量声明语句测试基本通过，未测试作用域下的情况以及未结合算术表达式(E)进行测试...

  // * 函数声明语句
  entryFun(id, funtype, argtype) {  // val同样可以为空，代表只声明了类型，未声明值。
    let table = this.FUN_TABLE;
    if (!(id in table)) {
      table[id] = [funtype];  // 第一次才需要记录函数类型
    }
    if (argtype !== undefined) table[id].push(argtype);  // 后面直接添加参数类型就可以了,并且不能添加undefined，这样才能随时知道参数个数
  }
  F1() {
    let TYPE;
    let word;
    if ((TYPE = this.F2())
      && (word = this.getSrcWord())  // ! 这里需要在match之前获取typeid对应的真实值
      && this.isMatch('typeid')
      && this.isMatch('(')
      && this.L1(TYPE, word)
      && this.isMatch(')')
      && this.isMatch(';')) {
      return true;
    } else {
      return this.error('期待为F1');
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
  L1(TYPE, word) {
    let f = this.A1(TYPE, word);
    if (f) {
      return true;
    } else if (this.isCurInFollow('L1')) {
      this.entryFun(word, TYPE);  // 表示没有函数参数
      return true;
    } else {
      return false;
    }
  }
  A1(TYPE, word) {
    let TYPE_;
    if ((TYPE_ = this.V2()) && this.A1_(TYPE, word, TYPE_)) {
      return true;
    } else {
      return false;
    }
  }
  A1_(TYPE, word, TYPE_) {
    // 第一次调用添加函数类型和一个参数类型，后续调用都是添加参数类型
    this.entryFun(word, TYPE, TYPE_);  // 因为A1中都是先执行V2再调用的该函数，即每次在V2结束后就可以加入表中了
    if (this.isMatch(',')) {
      let f = this.A1(TYPE, word);
      return f;
    } else if (this.isCurInFollow("A1'")) {
      return true;
    } else {
      return this.error('期待为A1_');
    }
  }
  // * 函数声明测试通过...


  S2() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('S2', 'S3')
      && ((ctree = this.S3()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S3': ctree };
    } else if (this.isCurInFirst('S2', 'S4')
      && ((ctree = this.S4()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S4': ctree };
    } else if (this.isCurInFirst('S2', 'S5')
      && ((ctree = this.S5()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S5': ctree };
    } else {
      return false;
    }
  }
  S3() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('S3', 'S6')
      && ((ctree = this.S6()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S6': ctree };
    } else if (this.isCurInFirst('S3', 'S7')
      && ((ctree = this.S7()) || this.backPos(prevP, prevI, prevNXQ))) {
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
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('S4', 'X1')
      && ((ctree = this.X1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X1': ctree };
    } else if (this.isCurInFirst('S4', 'X2')
      && ((ctree = this.X2()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X2': ctree };
    } else if (this.isCurInFirst('S4', 'X3')
      && ((ctree = this.X3()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X3': ctree };
    } else if (this.isCurInFirst('S4', 'X4')
      && ((ctree = this.X4()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X4': ctree };
    } else if (this.isCurInFirst('S4', 'X5')
      && ((ctree = this.X5()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X5': ctree };
    } else {
      return false;
    }
  }
  S5() {  // ! 作用域，我定义在了外层的函数上
    if (this.isMatch('{')) {
      let f1 = this.T3();
      let f2 = this.isMatch('}');
      return f1 && f2;
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
  // * if语句
  X1() {
    if (this.isMatch('if')
      && this.isMatch('(')
      && this.E3()  // ? 要不这里直接改为E3?
      && this.isMatch(')')
      && this.backPatch(this.tempVar.E3tc, this.NXQ_)  // ! 这里应该加入
      && (this.tempVar.X1chain = this.tempVar.E3fc)  // ! Efc-->E3fc
      && this.S()
      && this.X1_()) {
      return true;
    } else {
      return this.error('期待为X1')
    }
  }
  X1_() {
    if (this.isMatch('else')) {
      let q = this.NXQ_;
      this.genCode('j', undefined, undefined, 0);
      this.backPatch(this.tempVar.X1chain, this.NXQ_);
      this.tempVar.X1chain = this.merge(this.tempVar.X1chain, q); // !
      let f = this.S();
      return f;
    } else if (this.isCurInFollow("X1'")) {
      return true;
    } else {
      return this.error('期待为X1_');
    }
  }
  // * for语句
  X2() {
    let place;
    if (this.isMatch('for')
      && this.isMatch('(')
      && this.E()
      && this.genCode('=', this.getCurTempPosStr('E'), undefined, this.newTemp('X2'))
      && (this.tempVar.X2test = this.NXQ_)
      && this.isMatch(';')
      && this.E()
      && (place = this.newTemp('X2'))
      && this.genCode('=', this.getCurTempPosStr('E'), undefined, place)
      && (this.tempVar.X2chain = this.NXQ_)
      && this.genCode('jz', place, undefined, 0)
      && (this.tempVar.X2right = this.NXQ_)
      && this.genCode('j', undefined, undefined, 0)
      && (this.tempVar.X2inc = this.NXQ_)
      && this.isMatch(';')
      && this.E()
      && this.genCode('j', undefined, undefined, this.tempVar.X2test)
      && this.backPatch(this.tempVar.X2right, this.NXQ_)
      && this.isMatch(')')
      && this.P()) {
      // this.backPatch(this.tempVar.Pchain, this.NXQ_);
      this.genCode('j', undefined, undefined, this.tempVar.X2inc);
      // this.tempVar.X2chain = this.merge(this.tempVar.X2chain, this.tempVar.Pbrk);  // todo need Pbrk
      return true;
    } else {
      return this.error('期待为X2');
    }
  }

  X3() {
    if (this.isMatch('while')
      && this.isMatch('(')
      && this.E()
      && this.isMatch(')')
      && this.P()) {
      return true;
    } else {
      return this.error('期待为X3');
    }
  }
  // * do_while语句
  X4() {
    if (this.isMatch('do')
      && (this.tempVar.X4head = this.NXQ_)
      && this.P1()
      && this.isMatch('while')
      && this.backPatch(this.tempVar.P1chain, this.NXQ_)  // todo need P1chain
      && this.isMatch('(')
      && this.E()
      && this.isMatch(')')
      && this.isMatch(';')) {
      return true;
    } else {
      return this.error('期待为X4');
    }
  }

  P() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('P', 'S1')
      && ((ctree = this.S1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S1': ctree };
    } else if (this.isCurInFirst('P', 'P2')
      && ((ctree = this.P2()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'P2': ctree };
    } else if (this.isCurInFirst('P', 'P1')
      && ((ctree = this.P1()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'P1': ctree };
    } else if (this.isCurInFirst('P', 'S5')  // TODO 这里直接加了S5,粒度可能太高了
      && ((ctree = this.S5()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'S5': ctree }
    } else {
      return false;
    }
  }
  P1() {  //  这个复合语句只是控制语句的块，并没有进入作用域
    if (this.isMatch('{')) {
      let f1 = this.T4();
      this.backPatch(this.tempVar.E3tc, this.tempVar.X4head); // !
      this.tempVar.X4head = this.tempVar.E3fc;
      let f2 = this.isMatch('}');
      return f1 && f2;
    } else {
      return this.error('期待为P1');
    }
  }
  T4() {
    if (this.P() && this.T4_()) {
      return true;
    } else {
      return false;
    }
  }
  T4_() {
    if (this.isCurInFollow("T4'")) {
      return true;
    } else if (this.T4()) {
      return true;
    } else {
      return false;
    }
  }
  P2() {
    let prevP = this.pos;
    let prevI = this.INDEX;
    let ctree = null;
    let prevNXQ = this.NXQ_;
    if (this.isCurInFirst('P2', 'P3')
      && ((ctree = this.P3()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'P3': ctree };
    } else if (this.isCurInFirst('P2', 'X2')
      && ((ctree = this.X2()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X2': ctree };
    } else if (this.isCurInFirst('P2', 'X3')
      && ((ctree = this.X3()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X3': ctree };
    } else if (this.isCurInFirst('P2', 'X4')
      && ((ctree = this.X4()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X4': ctree };
    } else if (this.isCurInFirst('P2', 'X5')
      && ((ctree = this.X5()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X5': ctree };
    } else if (this.isCurInFirst('P2', 'X6')
      && ((ctree = this.X6()) || this.backPos(prevP, prevI, prevNXQ))) {
      return { 'X6': ctree };
    } else if (this.isCurInFirst('P2', 'X7')
      && ((ctree = this.X7()) || this.backPos(prevP, prevI, prevNXQ))) {
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
    if (this.isMatch('else')) {
      let ctree = this.P();
      return ctree ? { 'else': 'else', 'P': ctree } : false;
    } else if (this.isCurInFollow("P3'")) {
      return 'epsilon';
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
  // * 函数定义
  F3() { // ! 作用域在函数内才有
    let word;
    if ((this.tempVar.F3type = this.F2())
      && (word = this.getSrcWord())
      && this.isMatch('typeid')
      && this.genCode(word, undefined, undefined, undefined)
      && this.isMatch('(')
      && this.inScope()  // ! 进入作用域
      && (this.L2())
      && this.isMatch(')')
      && (this.S5())) {
      this.outScope();  // ! 退出作用域
      this.genCode('ret', undefined, undefined, undefined)
      return true;
    } else {
      return this.error('期待为F3')
    }
  }
  L2() {
    if (this.A2()) {
      return true;
    } else if (this.isCurInFollow('L2')) {
      return true;
    } else {
      return false;
    }
  }
  A2() {
    let word;
    let type;
    if ((type = this.V2())
      && (word = this.getSrcWord())
      && this.isMatch('typeid')
      && (this.entryVar(word, type))  // !
      && this.A2_()) {
      return true;
    } else {
      return this.error('期待为A2');
    }
  }
  A2_() {
    if (this.isMatch(',')) {
      let f = this.A2();
      return f;
    } else if (this.isCurInFollow("A2'")) {
      return true;
    } else {
      return this.error('期待为A2_');
    }
  }

  F4() {
    if (this.F3() && this.F4()) {
      return true;
    } else if (this.isCurInFollow('F4')) {
      return true;
    } else {
      return false;
    }
  }
  trans$place() {  // 将映射的转换为最真实、里面的，并且重新为临时变量命名
    let flag = true;
    let tempCount = 0;
    let tempMap = {};
    while(flag){
      flag = false;
      Object.keys(this.midCode).forEach((k)=>{
        let line = this.midCode[k];
        line.forEach((v, i)=>{
          if(/\$/.test(v)){
            let [X, n] = v.split('$');
            if(this.tempVar[X][n] !== undefined){
              this.midCode[k][i] = this.tempVar[X][n];
              flag = true;  // 变化了就赋值为true，直到不再变化才跳出循环
            }else{
              if(v in tempMap){
                this.midCode[k][i] = tempMap[v]
              }else{
                let sym = '__T' + tempCount++;
                this.midCode[k][i] = sym;
                tempMap[v] = sym;  // 记录，下次遇到同名的好使用
              }
            }
          }
        })  
      })
    }
    return this.midCode;
  }
}

function flatObj(arr2) {
  let arr1 = [];
  Object.values(arr2).forEach((v) => {
    arr1.push(...v);
  })
  return arr1;
}
/* 使用示范 */
async function example3() {
  const wr = new WordRecognition('./src/js/compilerCore/testCase/SyntacticParser/test.txt');
  let [wInfo, error, tokensArr, srcWord] = await wr.start();
  const MCG = new MidCodeGenerator(tokensArr, srcWord);
  await MCG.init('./src/js/compilerCore/SyntacticParser/Grammar/G.txt')
  MCG.parser();
  console.log('--------------------中间代码---------------------');
  console.log(MCG.CONST_TABLE);
  console.log(MCG.VAR_TABLE);
  console.log(MCG.FUN_TABLE);
  console.log(MCG.midCode);
  console.log(MCG.trans$place());
  console.log('over...');
}
example3();