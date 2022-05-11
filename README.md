# j3Complier
这是大三下学期做的编译原理的实验代码以及课程设计代码的仓库，客户端使用electron实现，后端大多数代码如果能用JS实现也是尽量使用的JS实现的
## 作用语言(sample语言)
C语言的简化形式，基本包括C语言的常用语法：
如：
- 表达式
  - 算术表达式
  - 布尔表达式
  - 关系表达式
  - 赋值表达式
- if语句
- for语句
- while和do_while语句
- 函数定义
- 函数声明
- 函数调用
- main函数识别
## 实现部分
- 词法分析(自动状态机)
- 语法分析(递归下降法)
## 预计实现
- 语义分析
- 中间代码生成
- 代码优化
- 目标代码生成
- 语法分析其他算法(预测分析法，OPG，LR)
## 测试
测试通过< src\js\compilerCore\testCase >中的所有案例；
如你发现识别sample语言中出现错误，欢迎提Iusse~
## 基本使用
### 词法分析器
```js
// src\js\compilerCore\WordRecognition\WordRecognition.js
const wr = new WordRecognition('./src/js/compilerCore/testCase/test.txt');
wr.start()
```
### 语法分析器
```js
// ParseSample为重写Expression的类，包括了除表达式的其他语法

async function example3() {
  const wr = new WordRecognition('./src/js/compilerCore/testCase/SyntacticParser/test12.txt');
  let [wInfo, error, tokensArr] = await wr.start();
  const PS = new ParseSample(tokensArr);
  await PS.init('./src/js/compilerCore/SyntacticParser/Grammar/G.txt')
  let res = PS.parser();
  console.log(res);
  printTree(res);
}
example3();
```
```js
/* 使用示范 */
async function example1() {
  const tool = new Tool('C:/My_app/code/j3Complier/src/js/compilerCore/SyntacticParser/Grammar/E.txt')
  tool.init().then((v) => {
    console.log(tool.splited);
    // 或follow集，first集等
  })
}
// example1()
```
## Tips
- 文法在src\js\compilerCore\SyntacticParser\Grammar文件下；
- [🔗查看文法对应命名请点击这里](https://mvt8uox695.feishu.cn/sheets/shtcnXGRYTfpCkkQ1YIW8Pd4sOe)
- 该文档还未完善，将在本学期代码完成后进一步完善文档，给个星星⭐吧，你的星星就是我持续完善的动力。