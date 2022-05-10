const fs = require('fs');

class WordRecognition {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    // 定义一些正则模式，偷懒~，本质也是状态图
    this.patten0_9 = /[0-9]/i;
    this.patten1_9 = /[1-9]/i;
    this.patten0 = /0/i;
    this.patten0_7 = /[0-7]/i;
    this.pattenx = /x/i;
    this.pattena_f = /[a-z]/i;
    this.patten$_a_f = /[$_a-z]/i;
    this.pattenBoundary = /[{};,\s]/i;
    // 定义一些符号
    this.operation1 = ['+', '-', '*', '/', '=', '>', '<', '[', ']', '(', ')', '!', '%', '&', '|'];
    this.operation2 = ['+=', '-=', '*=', '/=', '%=', '++', '--', '>=', '<=', '==', '!=', '&&', '||'];
    this.operation3 = ['>==', '<=='];
    // 定义对应种别码
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
      ',': 901, ';': 902,  //TODO 还要加入到语法分析中
    };
    this.errorPos = [];
    // 定义(){}[]以及消耗的位置
    this.matchedPos = { '(': [-1, -1], '[': [-1, -1], '{': [-1, -1] };
    this.matchPair = { '{': '}', '[': ']', '(': ')' };
  };
  processFile() {
    let _this = this;
    return new Promise((resolve, reject) => {
      fs.readFile(this.filePath, 'utf8', (err, res) => {
        // 需要注意这里还是一个异步操作,封装一个promise
        if (err) {
          reject(err);
        } else {
          // 将每一行后添加一个空格，方便表示空行
          _this.data = res.replace(/(\r\n)|\r|\n/g, ' \r\n').split(/\r\n/g);
          resolve(_this.data);
        }
      })
    })
  };
  recognizeInt(row, pos) {
    // 仅识别当前行，并且要传入一个字符(这里是索引)
    // 如果返回的pos为空格,;,运算符等，那么pos初--pos末就是整数，如果是字母，那么则什么都不是，需要在主函数里解决
    let state = 0;
    while (pos < row.length) {  // 书写状态图
      switch (state) {
        case 0:
          if (this.patten1_9.test(row[pos])) state = 1;
          else if (this.patten0.test(row[pos])) state = 3;
          else return [-1, pos];  // 到这里就不是了，主函数判断是否不为-1且移动了距离；
          pos++;
          break;
        case 1:
          if (this.patten0_9.test(row[pos])) {
            state = 1;
            pos++;
          }
          else state = 2;
          break;
        case 2:
          return [state, pos];  // 着种情况单独执行，多执行了依次循环中的pos++
        case 3:
          if (this.patten0_7.test(row[pos])) {
            state = 3;
            pos++;
          }
          else if (this.pattenx.test(row[pos])) {
            state = 5;
            pos++;
          }
          else state = 4;
          break;
        case 4:
          return [state, pos];
        case 5:
          if (this.patten0_9.test(row[pos]) ||
            this.pattena_f.test(row[pos]))
            state = 6;
          else return [-1, pos]  // 0x，pos移动的两位不是整数
          pos++;
          break;
        case 6:
          if (this.patten0_9.test(row[pos]) ||
            this.pattena_f.test(row[pos])) {
            state = 6;
            pos++;
          }
          else state = 7;
          break;
        case 7:
          return [state, pos];
      }
      // pos++;  // 应该把这个放在--pos的上面0
    }
    return [state, pos]; // 代表一行执行完了从pos到结尾都是数字
  };
  recognizeNum(row, pos, i) {  // 传入i方便记录错误的行号
    let state = 0;
    if (i !== 0) i = i || -1;
    while (pos < row.length) {
      switch (state) {
        case 0:
          if (this.patten1_9.test(row[pos])) {
            state = 1;
            pos++;
          } else if (row[pos] == 0) {
            state = 2;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望是一个数字，但无法将该位识别为数字。']);
            state = 16;
          }
          break;
        case 1:
          if (this.patten0_9.test(row[pos])) {
            state = 1;
            pos++;
          } else if (this.isSeparator(row, pos)) {
            state = 15;  // 是终态就不需要pos++了
          } else if (row[pos] === 'E' || row[pos] === 'e') {
            state = 10;
            pos++;
          } else if (row[pos] === '.') {
            state = 8;
            pos++;
          } else {
            this.errorPos.push([i, pos, '无法识别：后面的字符不能紧挨着前面的数字']);
            state = 16;
          }
          break;
        case 2:
          if (this.patten0_7.test(row[pos])) {
            state = 3;
            pos++;
          } else if (this.pattenx.test(row[pos])) {
            state = 5;
            pos++;
          } else if (row[pos] === '.') {
            state = 8;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：0后面跟的数字不对']);
            state = 16;
          }
          break;
        case 3:
          if (this.patten0_7.test(row[pos])) {
            state = 3;
            pos++;
          } else {
            state = 4;
          }
          break;
        case 4:
          return [state, pos];
        case 5:
          if (this.patten0_9.test(row[pos]) ||
            this.pattena_f.test(row[pos])) {
            state = 6;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望为16进制，但不是']);
            state = 16;
          }
          break;
        case 6:
          if (this.patten0_9.test(row[pos]) ||
            this.pattena_f.test(row[pos])) {
            state = 6;
            pos++;
          } else {
            state = 7;
          }
          break;
        case 7:
          return [state, pos];
        case 8:
          if (this.patten0_9.test(row[pos])) {
            state = 9;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望是浮点数，但小数点后跟的字符不对']);
            state = 16;
          }
          break;
        case 9:
          if (this.patten0_9.test(row[pos])) {
            state = 9;
            pos++;
          } else if (this.isSeparator(row, pos)) {
            state = 14;
          } else if (row[pos] === 'E' || row[pos] === 'e') {
            state = 10;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望为小数或科学计数']);
            state = 16;
          }
          break;
        case 10:
          if (row[pos] === '+' || row[pos] === '-') {
            state = 11;
            pos++;
          } else if (this.patten0_9.test(row[pos])) {
            state = 12;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望为数字或正负号']);
            state = 16;
          }
          break;
        case 11:
          if (this.patten0_9.test(row[pos])) {
            state = 12;
            pos++;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望后面跟的是数字']);
            state = 16;
          }
          break;
        case 12:
          if (this.patten0_9.test(row[pos])) {
            state = 12;
            pos++;
          } else if (this.isSeparator(row, pos)) {
            state = 13;
          } else {
            this.errorPos.push([i, pos, '识别错误：期望为数字或者分节符'])
            state = 16;
          }
          break;
        case 13:
          return [state, pos];
        case 14:
          return [state, pos];
        case 15:
          return [state, pos];
        case 16:
          return [state, pos];
      }
    }
    return [state, pos];
  }
  recognizeId(row, pos) {
    // 第一个字符必须是字母、下划线、美元符号
    // 后面其他字符可以包含数字
    let state = 0;
    while (pos < row.length) {
      switch (state) {
        case 0:
          if (this.patten$_a_f.test(row[pos])) state = 1;
          else return [-1, pos];
          pos++;
          break;
        case 1:
          if (this.patten$_a_f.test(row[pos]) ||
            this.patten0_9.test(row[pos])) {
            state = 1;
            pos++;
          }
          else state = 2;
          break;
        case 2:
          return [state, pos];
      }
      // pos++;
    }
    return [state, pos];
  };
  compare([p1, p2], [p3, p4]) {
    // return 前小于等于后就是true，代表不需要处理
    if (p1 < p3) return true;
    else if (p1 === p3) {
      if (p2 <= p4) return true;
      else return false;
    } else return false;
  }
  isMatch(i, pos) {  // (){}[]可能嵌套，相比于""更复杂，所以单独处理
    // 该函数无返回值，只是用来判断符号是否匹配，收集错误信息而已
    let prevI = i, prevPos = pos;  // 收集错误信息的时候使用
    let count = 1;
    let line = this.data[i];
    let len = line.length;
    let key = line[pos];  // 确定是哪个符号
    let mkey = this.matchPair[key];
    // key为右半部时，this.matchedPos[key]为undefined
    if (this.compare([i, pos], this.matchedPos[key] || [-1, -1])) {
      // 代表不需要处理
      return;
    }
    if (key === '}' || key === ']' || key === ')') {
      // 不可能先出现右半部
      this.errorPos.push([prevI, prevPos, `未匹配：符号${key}前面没有匹配的另一半符号`]);
      return;
    }
    // 处理当前行
    for (pos = pos + 1; pos < len; pos++) {
      if (line[pos] === '/') {
        let [tmp1, tmp2] = this.clearNotes(i, pos);
        if (tmp1 !== -1 || tmp2 !== -1) { // 说明是注释,跳过注释
          if (tmp1 !== i) {
            i = tmp1 - 1
            break;
          }
          pos = tmp2;
          if (pos >= len) break;
        }
      }
      if (line[pos] === key) count++;
      else if (line[pos] === mkey) count--;
      if (count === 0) {
        // 记录当前位置
        this.matchedPos[key] = [i, pos + 1];
        return // 匹配完成
      }
    }
    // 如果count没有减为0，匹配后续行
    if (count !== 0) {
      for (i = i + 1; i < this.data.length; i++) {
        line = this.data[i];
        len = line.length;
        for (pos = 0; pos < len; pos++) {
          if (line[pos] === '/') {
            let [tmp1, tmp2] = this.clearNotes(i, pos);
            if (tmp1 !== -1 || tmp2 !== -1) { // 说明是注释,跳过注释
              if (tmp1 !== i) {
                i = tmp1;
                break;
              }
              // TODO 这里跳过应该和start函数那样跳过注释，这里直接跳过整行了，不想改了
              pos = tmp2;
              if (pos >= len) break;
            }
          }
          if (line[pos] === key) count++;
          else if (line[pos] === mkey) count--;
          if (count === 0) {
            this.matchedPos[key] = [i, pos];
            return //匹配完成；
          }
        }
      }
    }
    if (count !== 0) {
      // 收集错误信息
      this.errorPos.push([prevI, prevPos, '未匹配：从该符号起的对应符号数量不匹配'])
      return;
    }
  }
  recognizeOperation(i, pos) {
    let row = this.data[i];
    let op1 = row[pos];
    let op2 = op1 + row[pos + 1];  // TODO 有可能为非数，但是不影响
    let op3 = op2 + row[pos + 2];
    // 超前搜索技术
    if (this.operation3.indexOf(op3) !== -1) {
      return pos + 3;  // 说明pos--pos+2是运算符
    } else if (this.operation2.indexOf(op2) !== -1) {
      return pos + 2;
    } else if (this.operation1.indexOf(op1) !== -1) {
      if (['[', ']', '(', ')'].indexOf(op1) !== -1) {
        this.isMatch(i, pos);
      }
      return pos + 1;
    } else {
      return pos;  // 没有移动说明不是运算符
    }
  }
  isSeparator(row, pos) {
    return pos >= row.length ||
      pos < 0 ||
      this.pattenBoundary.test(row[pos]) ||
      this.operation1.indexOf(row[pos]) !== -1;
  }
  clearNotes(i, pos) {
    let row = this.data[i];
    let len = this.data.length;
    if (row[pos] === '/' && (row[pos + 1] && row[pos + 1] === '/')) {
      return [i + 1, 0]; // 跳过该行，从第二行的首位开始
    } else if (row[pos] === '/' && (row[pos + 1] && row[pos + 1] === '*')) {
      let index = row.search(/\*\//);
      if (index !== -1) {
        return [i, index + 2]; // 当前行能找到另一半匹配的
      }
      for (i = i + 1; i < len; i++) {
        row = this.data[i];
        index = row.search(/\*\//);
        if (index !== -1) {
          if (index + 2 >= row.length) {
            return [i + 1, 0]; // 跳转到下一行
          } else {
            return [i, index + 2]
          }
        }
      }
      return [len - 1, (this.data[len - 1]).length]
    } else return [-1, -1]  // 说明不是注释
  }
  transCode(str, type, state) {
    if (type) {
      // ... 还要判断是什么数字
      if (type === 'typenum') {
        if (state === 15 || state === 1) return 400;
        else return 800;
        // TODO 不够详细
      }
      else if (type === 'typestr' && str.length > 3) return 600;
      else if (type === 'typestr' && str.length === 3) return 500;
    }
    // 未传type
    return this.codeMap[str] || 700; // 未找到的话就是标识符
  }
  recognizeStr(row, pos) {
    let key = row[pos];  // ' 与 "
    if (key !== '\'' && key !== '\"') return -1;
    let match = row.indexOf(key, pos + 1);
    return match + 1  // 0 代表未找到
  }
  isSpaceLine(line) {
    return line.replace(/[\s(\r\n)(\n\r)\r\n]/g, '').length === 0;
  }
  transTokens(tokens) {
    let res = {};
    for (let [k, v] of Object.entries(tokens)) {
      let r = v.map((e) => e[0]);
      res[k] = r;
    }
    return res;
  }
  // 整合其他函数并循环调用
  async start() {
    // ...
    const res = {};  // 存放识别的结果
    const info = [];  // 存放识别的过程信息
    await this.processFile();
    let len = this.data.length;
    let flag = 0; // 如果不等于0，则j要从flag开始，而不是从0
    label: for (let i = 0; i < len; i++) {
      let line = this.data[i];
      if (this.isSpaceLine(line)) continue;  // 是空行就跳过
      res[i] = [];  // key为行号， val为token数组
      for (let j = 0; j < line.length;) {
        if (flag !== 0) {
          j = flag;
          flag = 0;  // 只用一次
          if (j >= line.length) break;
        }
        let c = line[j];
        // 先判断是不是界符
        if (this.pattenBoundary.test(c)) {
          // 执行一些操作
          // TODO 处理{}可能不匹配的错误情况
          if (c === '{' || c === '}') {
            this.isMatch(i, j);
          }
          if (c !== ' ') {
            info.push(`识别出界符：${c}`);
            res[i].push([this.transCode(c), c]);
          }
          j++;
          continue;
        } else if (this.operation1.indexOf(c) !== -1) {
          // 说明是运算符，先看看是不是注释，是跳过该行
          let [tmp1, tmp2] = this.clearNotes(i, j);
          if (tmp1 !== -1 || tmp2 !== -1) { // 说明是注释,跳过注释
            if ((res[i]).length === 0) delete res[i];
            i = tmp1 - 1;  // 循环中会自动加1，这里减一才是跳转到的具体行
            flag = tmp2;
            continue label;
          }
          // 再去试一试超前搜索
          let prev = j;
          j = this.recognizeOperation(i, j);
          let str = line.slice(prev, j);
          info.push(`识别出运算符：${str}`);  // TODO 如果后面紧接着还是运算符，比如长度为4====，就会识别成两个运算符，但其实该报错
          res[i].push([this.transCode(str), str]);
        } else if (this.patten0_9.test(c)) {
          // 数字开头
          let state = -1,
            prev = j;
          [state, j] = this.recognizeNum(line, j, i);
          // 判断下一个字符是不是分割符，否则报错
          if (this.isSeparator(line, j) && this.isSeparator(line, prev - 1)) {
            // ...
            let str = line.slice(prev, j);
            info.push(`识别出数字：${str}，状态码为：${state}`);
            // state来区分是几进制，这里仅识别了整数
            res[i].push([this.transCode(str, 'typenum', state), str]);
          } else {
            // recognizeNum里面已经做了更详细的错误处理，这里就不重复添加了
            let isHave = this.errorPos.some((val, index, arr) => {
              return val[0] === i && val[1] === j;
            })
            !isHave && this.errorPos.push([i, j, '无法识别：前后包含非法字符']);
            break;  // 错了跳过该行
          }
        } else if (this.patten$_a_f.test(c) ||
          this.patten0_9.test(c)) {
          let state = -1,
            prev = j;
          [state, j] = this.recognizeId(line, j);
          if (this.isSeparator(line, j) && this.isSeparator(line, prev - 1)) {
            // ...
            let str = line.slice(prev, j);
            info.push(`识别出标识符或保留字：${str}，状态码为：${state}`);
            res[i].push([this.transCode(str), str]);
          } else {
            let isHave = this.errorPos.some((val, index, arr) => {
              return val[0] === i && val[1] === j;
            })
            !isHave && this.errorPos.push([i, j, '无法识别：前后包含非法字符']);
            break;  // 错了跳过该行
          }
        } else if (c === '\'' || c === '\"') {
          // 代表是字符串
          let prev = j;
          j = this.recognizeStr(line, j);
          if (j !== 0) {
            let str = line.slice(prev, j);
            info.push(`识别出字符串或字符：${str}`);
            res[i].push([this.transCode(str, 'typestr'), str]);
          } else {
            let isHave = this.errorPos.some((val, index, arr) => {
              return val[0] === i && val[1] === j;
            })
            !isHave && this.errorPos.push([i, prev, '未匹配：未找到另外一半对应的\'或\"']);
            break;
          }
        } else {
          info.push('其他情况...')
          j++;
        }
      }
      if ((res[i]).length === 0) delete res[i];
    }
    info.push('识别完成...')
    // -------打印信息--------
    console.log('---------------------------词法分析相关------------------------------');
    console.log('日志信息：', info);
    console.log('错误情况：', this.errorPos);
    console.log('最终结果：', res);
    return [info, this.errorPos, this.transTokens(res)];
  };
}

// const wr = new WordRecognition('C:/My_app/code/j3Complier/src/js/compilerCore/testCase/test.txt');
// wr.start()
// wr.processFile()

exports.WordRecognition = WordRecognition;