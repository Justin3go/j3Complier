const { lexer } = require('./lexer')

// 1. 需要词法分析的代码
let stream = `int= a = 10
//1234
int b = 20`
// 2. 开始词法分析

lexer.start(stream);

// 3. 词法分析结束后, 获取生成的tokens
let parsedTokens = lexer.DFA.result.tokens;

// 4. 做你想做的
parsedTokens.forEach((token) => {
  console.log(token);
});