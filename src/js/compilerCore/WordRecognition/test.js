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

/** 算术表达式
 * E1 -> T E1'
 * E1' -> + E1 | - E1 | epsilon
 * T -> R1 T'
 * T' -> * T | / T | % T | epsilon
 * R1 -> (E1) | C | V | F 
 * C -> num|char 
 * V -> id
 * F -> id(L)
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