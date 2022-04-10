const { regex2post, NFA } = require('../')

function reg2nfa(regex){
  const post = regex2post(regex);
  return NFA.createFromPostfixExpression(post)
}
console.log(reg2nfa('(a|b)*(aa|bb)(a|b)*'));