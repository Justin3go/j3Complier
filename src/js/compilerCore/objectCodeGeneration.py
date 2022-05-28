import sys
import switch
import intermediateCodeGeneration


class work(object):
    def __init__(self, i, c, v, f):
        self.intermediateCodeList = i
        self.constList = c
        self.variableList = v
        self.functionList = f

        self.objectCodeList = []

        self.objRes = ''

        self.index = 0

        self.ssOffset = 2

        self.offset = 0

        self.infuction = False

        self.dataSegmentHead = 532

    def addCode(self, string):
        self.objectCodeList.append('\t' + string)
        print(str(self.objectCodeList[len(self.objectCodeList) - 1]))
        self.objRes = self.objRes + '\t' + string + '\n'

    def addCode1(self, string):
        self.objectCodeList.append(string)
        print(str(self.objectCodeList[len(self.objectCodeList) - 1]))
        self.objRes = self.objRes + string + '\n'

    def addindex(self, string):
        self.objectCodeList.append('_' + str(self.index) + ':' + "\t" + string)
        print(str(self.objectCodeList[len(self.objectCodeList) - 1]))
        self.objRes = self.objRes + '_' + \
            str(self.index) + ':' + "\t" + string + '\n'

    def start(self):
        for gencode in self.intermediateCodeList:
            if(str(gencode.set).isdigit()):
                gencode.set = int(gencode.set) - 1
            self.replaceAddress()
            if(gencode.sym == 'main'):
                self.main()
            elif(gencode.sym == '+'):
                self.add()
            elif(gencode.sym == '-'):
                self.substraction()
            elif(gencode.sym == '*'):
                self.multiplication()
            elif(gencode.sym == '/'):
                self.division()
            elif(gencode.sym == '%'):
                self.remainder()
            elif(gencode.sym == '='):
                self.assign()
            elif(gencode.sym == 'j<'):
                self.less()
            elif(gencode.sym == 'j<='):
                self.lessOrEqual()
            elif(gencode.sym == 'j>'):
                self.greater()
            elif(gencode.sym == 'j>='):
                self.greaterOrEqual()
            elif(gencode.sym == 'j=='):
                self.equal()
            elif(gencode.sym == 'j!='):
                self.notEqual()
            elif(gencode.sym == 'j!'):
                self.noty()
            elif(gencode.sym == 'j'):
                self.jump()
            elif(gencode.sym == 'jz'):
                self.zeroJump()
            elif(gencode.sym == 'jnz'):
                self.notZeroJump()
            elif(gencode.sym == 'para'):
                self.parameter()
            elif(gencode.sym == 'call'):
                self.callFuction()
            elif(gencode.sym == 'ret'):
                self.returns()
            elif(gencode.sym == 'sys'):
                self.end()
            else:
                self.ssOffset = 2
                self.infuction = True
                self.functionDefinition()
                # print('funcDef:' + str(gencode.sym))
                print('')
            self.index += 1
        self.readWrite()
        self.addCode1("code ends")
        self.addCode1("end start")

        return self.objRes

        print('-------------------------------------------------------')
        print('常量表:')
        for i in self.constList:
            print(str(i.entrance) + ', ' + str(i.type) +
                  ', ' + str(i.name) + ', ' + str(i.value))
        print('-------------------------------------------------------')
        print('变量表:')
        for i in self.variableList:
            print(str(i.entrance) + ', ' + str(i.type) + ', ' + str(i.name) +
                  ', ' + str(i.value) + ', ' + i.scope + ', ' + i.address)
        print('-------------------------------------------------------')
        print('函数表:')
        for i in self.functionList:
            print(str(i.entrance) + ', ' + str(i.returnType) + ', ' + str(i.name) + ', ' + str(i.paramNum) + ' ',
                  end='')
            for t in i.param:
                print(t + ' ', end='')
            print(' ')
        print('-------------------------------------------------------')
        print(self.objRes)
        pass

    def checkFun(self, name):
        for i in self.functionList:
            if(i.name == name):
                return True
        return False

    def checkConst(self, name):
        for i in self.constList:
            if(i.name == name):
                return True
        return False

    def replaceAddress(self):
        gencode = self.intermediateCodeList[self.index]
        if('T' in str(gencode.term1)):
            gencode.term1 = "es:[" + \
                str(int(gencode.term1.split("T")[1]) * 2) + "]"
            # print(str(gencode.term1.split("T")))
        elif(not self.checkFun(str(gencode.term1)) and not str(gencode.term1).isdigit()):
            gencode.term1 = self.getAddress(gencode.term1, gencode.scope)

        if ('T' in str(gencode.term2)):
            gencode.term2 = "es:[" + \
                str(int(gencode.term2.split("T")[1]) * 2) + "]"
            # print(str(gencode.term1.split("T")))
        elif (not self.checkFun(str(gencode.term2)) and not str(gencode.term2).isdigit()):
            gencode.term2 = self.getAddress(gencode.term2, gencode.scope)

        if ('T' in str(gencode.set)):
            gencode.set = "es:[" + str(int(gencode.set.split("T")[1]) * 2) + "]"
            # print(str(gencode.term1.split("T")))
        elif (not str(gencode.set).isdigit() and not gencode.set == ''):
            gencode.set = self.getAddress(gencode.set, gencode.scope)
        elif (str(gencode.set).isdigit() and not gencode.set == ''):
            if(int(gencode.set) == len(self.intermediateCodeList) - 1 and not self.infuction):
                gencode.set = 'quit'
            else:
                gencode.set = '_' + str(int(gencode.set))

    def getVar(self, name, scope):
        targerVar = ''
        index = 0
        tindex = 0
        for i in self.variableList:
            if(i.name == name and i.scope in scope):
                targerVar = i
                tindex = index
            index += 1
        return tindex

    def getAddress(self, name, scope):
        address = ''
        while(scope != ''):
            i = self.getVar(name, scope)
            if(self.variableList[i] == ''):
                return name
            if(self.variableList[i].scope != scope):
                if(self.variableList[i].address == ''):
                    if(self.infuction):
                        self.variableList[i].address = 'ss:[bp-' + \
                            str(self.ssOffset) + ']'
                        self.ssOffset += 2
                        self.addCode("sub sp, 2")
                        return self.variableList[i].address
                    else:
                        self.variableList[i].address = 'ds:[' + \
                            str(int(self.dataSegmentHead) +
                                int(self.offset)) + ']'
                        self.offset += 2
                        return self.variableList[i].address
                else:
                    return self.variableList[i].address
            elif (self.infuction and self.variableList[i].address == ''):
                self.variableList[i].address = 'ss:[bp-' + \
                    str(int(self.ssOffset)) + ']'
                self.ssOffset += 2
                self.addCode("sub sp, 2")
                return self.variableList[i].address
            elif(self.variableList[i].address == ''):
                self.variableList[i].address = 'ds:[' + \
                    str(int(self.dataSegmentHead) + int(self.offset)) + ']'
                self.offset += 2
                return self.variableList[i].address
            else:
                return self.variableList[i].address
        return address
        pass

    def main(self):
        self.addCode1("assume cs:code,ds:data,ss:stack,es:extended")
        self.addCode("")
        self.addCode1("extended segment")
        self.addCode("db 1024 dup (0)")
        self.addCode1("extended ends")
        self.addCode("")
        self.addCode1("stack segment")
        self.addCode("db 1024 dup (0)")
        self.addCode1("stack ends")
        self.addCode1("")
        self.addCode1("data segment")
        self.addCode("_buff_p db 256 dup (24h)")
        self.addCode("_buff_s db 256 dup (0)")
        self.addCode("_msg_p db 0ah,'Output:',0")
        self.addCode("_msg_s db 0ah,'Input:',0")
        self.addCode1("data ends")
        self.addCode("")
        self.addCode1("code segment")
        self.addCode1("start:\tmov ax,extended")
        self.addCode("mov es,ax")
        self.addCode("mov ax,stack")
        self.addCode("mov ss,ax")
        self.addCode("mov sp,1024")
        self.addCode("mov bp,sp")
        self.addCode("mov ax,data")
        self.addCode("mov ds,ax")
        self.addCode("")

    def end(self):
        self.addCode1("quit: mov ah,4ch")
        self.addCode1("    INT 21H")
        self.addCode("")

    def add(self):
        self.addindex(
            "MOV AX, " + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "ADD AX, " + str(self.intermediateCodeList[self.index].term2))
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",AX")
        self.addCode("")

    def substraction(self):
        self.addindex(
            "MOV AX, " + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "SUB AX, " + str(self.intermediateCodeList[self.index].term2))
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",AX")
        self.addCode("")
        pass

    def multiplication(self):
        self.addindex(
            "MOV AX, " + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "MOV BX, " + str(self.intermediateCodeList[self.index].term2))
        self.addCode("MUL BX")
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",AX")
        self.addCode("")
        pass

    def division(self):
        self.addindex(
            "MOV AX, " + str(self.intermediateCodeList[self.index].term1))
        self.addCode("MOV DX, 0")
        self.addCode(
            "MOV BX, " + str(self.intermediateCodeList[self.index].term2))
        self.addCode("DIV BX")
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",AX")
        self.addCode("")
        pass

    def remainder(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode("MOV DX, 0")
        self.addCode(
            "MOV BX, " + str(self.intermediateCodeList[self.index].term2))
        self.addCode("DIV BX")
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",DX")
        self.addCode("")
        pass

    def assign(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",AX")
        self.addCode("")
        pass

    def less(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "CMP AX," + str(self.intermediateCodeList[self.index].term2))
        self.addCode("JB " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def lessOrEqual(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "CMP AX," + str(self.intermediateCodeList[self.index].term2))
        self.addCode("JNA " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def greater(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "CMP AX," + str(self.intermediateCodeList[self.index].term2))
        self.addCode("JA " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def greaterOrEqual(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "CMP AX," + str(self.intermediateCodeList[self.index].term2))
        self.addCode("JNB " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def equal(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "CMP AX," + str(self.intermediateCodeList[self.index].term2))
        self.addCode("JE " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def notEqual(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "CMP AX," + str(self.intermediateCodeList[self.index].term2))
        self.addCode("JNE " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def noty(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode("CMP AX,0")
        self.addCode("JE " + str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def jump(self):
        self.addindex("JMP far ptr " +
                      str(self.intermediateCodeList[self.index].set))
        self.addCode("")
        pass

    def notzeroJump(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode("CMP AX,0")
        self.addCode("JNE _" + str(self.index) + "NE")
        self.addCode("JMP far ptr " +
                     str(self.intermediateCodeList[self.index].set))
        self.addCode("_" + str(self.index) + "NE: NOP")
        self.addCode("")
        pass

    def ZeroJump(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode("CMP AX,0")
        self.addCode("JE _" + str(self.index) + "EZ")
        self.addCode("JMP far ptr " +
                     str(self.intermediateCodeList[self.index].set))
        self.addCode("_" + str(self.index) + "EZ: NOP")
        self.addCode("")
        pass

    def parameter(self):
        self.addindex(
            "MOV AX," + str(self.intermediateCodeList[self.index].term1))
        self.addCode("PUSH AX")
        self.addCode("")
        pass

    def callFuction(self):
        self.addindex(
            "CALL _" + str(self.intermediateCodeList[self.index].term1))
        self.addCode(
            "MOV " + str(self.intermediateCodeList[self.index].set) + ",AX")
        self.addCode("")
        pass

    def returns(self):
        if (self.intermediateCodeList[self.index] == ""):
            self.addindex(
                "MOV AX," + str(self.intermediateCodeList[self.index].term1))
            self.addCode("MOV SP,BP")
        else:
            self.addindex("MOV SP,BP")
        self.addCode("POP BP")
        self.addCode("RET")
        self.addCode("")
        pass

    def functionDefinition(self):
        self.addCode(
            "_" + str(self.intermediateCodeList[self.index].sym) + ":\tPUSH BP")
        self.addCode("MOV BP,SP")
        self.addCode("")
        pass

    def readWrite(self):
        self.addCode1("_read:\tpush bp")
        self.addCode("mov bp,sp")
        self.addCode("mov bx,offset _msg_s")
        self.addCode("call _print")
        self.addCode("mov bx,offset _buff_s")
        self.addCode("mov di,0")

        self.addCode1("_r_lp_1:\tmov ah,1")
        self.addCode("int 21h")
        self.addCode("cmp al,0dh")
        self.addCode("je _r_brk_1")
        self.addCode("mov ds:[bx+di],al")
        self.addCode("inc di")
        self.addCode("jmp short _r_lp_1")

        self.addCode1("_r_brk_1:\tmov ah,2")
        self.addCode("mov dl,0ah")
        self.addCode("int 21h")
        self.addCode("mov ax,0")
        self.addCode("mov si,0")
        self.addCode("mov cx,10")

        self.addCode1("_r_lp_2:\tmov dl,ds:[bx+si]")
        self.addCode("cmp dl,30h")
        self.addCode("jb _r_brk_2")
        self.addCode("cmp dl,39h")
        self.addCode("ja _r_brk_2")
        self.addCode("sub dl,30h")
        self.addCode("mov ds:[bx+si],dl")
        self.addCode("mul cx")
        self.addCode("mov dl,ds:[bx+si]")
        self.addCode("mov dh,0")
        self.addCode("add ax,dx")
        self.addCode("inc si")
        self.addCode("jmp short _r_lp_2")

        self.addCode1("_r_brk_2:\tmov cx,di")
        self.addCode("mov si,0")

        self.addCode1("_r_lp_3:\tmov byte ptr ds:[bx+si],0")
        self.addCode("loop _r_lp_3")
        self.addCode("mov sp,bp")
        self.addCode("pop bp")
        self.addCode("ret")

        self.addCode1("_write:\tpush bp")
        self.addCode("mov bp,sp")
        self.addCode("mov bx,offset _msg_p")
        self.addCode("call _print")
        self.addCode("mov ax,ss:[bp+4]")
        self.addCode("mov bx,10")
        self.addCode("mov cx,0")

        self.addCode1("_w_lp_1:\tmov dx,0")
        self.addCode("div bx")
        self.addCode("push dx")
        self.addCode("inc cx")
        self.addCode("cmp ax,0")
        self.addCode("jne _w_lp_1")
        self.addCode("mov di ,offset _buff_p")

        self.addCode1("_w_lp_2:\tpop ax")
        self.addCode("add ax,30h")
        self.addCode("mov ds:[di],al")
        self.addCode("inc di")
        self.addCode("loop _w_lp_2")
        self.addCode("mov dx,offset _buff_p")
        self.addCode("mov ah,09h")
        self.addCode("int 21h")
        self.addCode("mov cx,di")
        self.addCode("sub cx,offset _buff_p")
        self.addCode("mov di,offset _buff_p")

        self.addCode1("_w_lp_3:\tmov al,24h")
        self.addCode("mov ds:[di],al")
        self.addCode("inc di")
        self.addCode("loop _w_lp_3")
        self.addCode("mov ax,di")
        self.addCode("sub ax,offset _buff_p")
        self.addCode("mov sp,bp")
        self.addCode("pop bp")
        self.addCode("ret 2")

        self.addCode1("_print:\tmov si,0")
        self.addCode("mov di,offset _buff_p")

        self.addCode1("_p_lp_1:\tmov al,ds:[bx+si]")
        self.addCode("cmp al,0")
        self.addCode("je _p_brk_1")
        self.addCode("mov ds:[di],al")
        self.addCode("inc si")
        self.addCode("inc di")
        self.addCode("jmp short _p_lp_1")

        self.addCode1("_p_brk_1:\tmov dx,offset _buff_p")
        self.addCode("mov ah,09h")
        self.addCode("int 21h")
        self.addCode("mov cx,si")
        self.addCode("mov di,offset _buff_p")

        self.addCode1("_p_lp_2:\tmov al,24h")
        self.addCode("mov ds:[di],al")
        self.addCode("inc di")
        self.addCode("loop _p_lp_2")
        self.addCode("ret")


if __name__ == '__main__':
    path = sys.argv[1]
    print(path)
    # path = r'src/js/compilerCore/testCase/MidCodeGenerator/test1.txt'
    token = switch.analysis()
    lines = token.readfile(path)
    for line in lines:
        line += ' 0'
        token.get_token(line)
        token.lineno += 1
    token = token.tokenObj
    aa = intermediateCodeGeneration.work(token)
    aa.start()

    bb = work(aa.intermediateCodeList, aa.constList,
              aa.variableList, aa.functionList)
    midCode = bb.start()
    with open('./midcode.txt', 'w') as f:
        f.write(str(midCode))
