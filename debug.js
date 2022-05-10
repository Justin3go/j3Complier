class test{
  constructor(){

  }
  I(){
    console.log(123);
  }
  G(){
    this.I();
  }
}
let t =new test();
t.G()