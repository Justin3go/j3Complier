import fs from 'fs';

class WordRecognition {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    // 定义一些正则模式
    this.patten0_9 = /[0-9]/i;
    this.patten1_9 = /[1-9]/i;
    this.patten0 = /0/i;
    this.patten0_7 = /[0-7]/i;
    this.pattenx = /x/i;
    this.pattena_f = /[a-f]/i;
    this.patten$_a_f = /[$_a-f]/i;
  };
  processFile() {
    let _this = this;
    return new Promise((resolve, reject) => {
      fs.readFile(this.filePath, 'utf8', (err, res) => {
        // 需要注意这里还是一个异步操作,封装一个promise
        if (err) {
          reject(err);
        } else {
          _this.data = res.split(/[\r\n]+|\r|\n/);
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
          break;
        case 1:
          if (this.patten0_9.test(row[pos])) state = 1;
          else state = 2;
          break;
        case 2:
          return [state, --pos];  // 着种情况单独执行，多执行了依次循环中的pos++
        case 3:
          if (this.patten0_7.test(row[pos])) state = 3;
          else if (this.pattenx.test(row[pos])) state = 5;
          else state = 4;
          break;
        case 4:
          return [state, --pos];
        case 5:
          if (this.patten0_9.test(row[pos]) ||
            this.pattena_f.test(row[pos]))
            state = 6;
          else return [-1, pos]  // 0x，pos移动的两位不是整数
          break;
        case 6:
          if (this.patten0_9.test(row[pos]) ||
            this.pattena_f.test(row[pos]))
            state = 6;
          else state = 7;
          break;
        case 7:
          return [state, --pos];
      }
      pos++;
    }
    return [state, pos]; // 代表一行执行完了从pos到结尾都是数字
  };
  recognizeId(row, pos) {
    // 第一个字符必须是字母、下划线、美元符号
    // 后面其他字符可以包含数字
    let state = 0;
    while(pos < row.length){
      switch(state){
        case 0:
          if(this.patten$_a_f.test(row[pos])) state = 1;
          else return [-1, pos];
          break;
        case 1:
          if(this.patten$_a_f.test(row[pos]) || 
          this.patten0_9.test(row[pos]))
          state = 1;
          else state = 2;
          break;
        case 2:
          return [state, --pos];
      }
      pos++;
    }
  };
  // 整合其他函数并循环调用
  start() {
    // ...
  };
}
export default WordRecognition;
/**
 * 测试1
 */
const wr = new WordRecognition('')
let testRow = ' a 234b 0xa4 023 dqfef $dwd 23wd';
let state, pos;
[state, pos] = wr.recognizeInt(testRow, 3);
console.log(state, pos);
[state, pos] = wr.recognizeInt(testRow, 8);
console.log(state, pos);
[state, pos] = wr.recognizeInt(testRow, 13);
console.log(state, pos);
/**
 * 测试2
 */
 testRow = 'dqfef $dwd 23wd';
console.log('*'.repeat(80));
[state, pos] = wr.recognizeId(testRow, 0);
console.log(state, pos);
[state, pos] = wr.recognizeId(testRow, 6);
console.log(state, pos);
[state, pos] = wr.recognizeId(testRow, 12);
console.log(state, pos);