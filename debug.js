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
let obj = { 'a': 1, 'b': 2, 'c': { 'd': 3, 'e': { 'f': 4 } } };
printTree(obj)