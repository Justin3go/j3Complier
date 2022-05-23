import switch


class constant(object):
    def __init__(self, entrance, name, type, value):
        self.entrance = entrance
        self.name = name
        self.type = type
        self.value = value
        self.scope = '/0'
        self.address = ''


class variable(object):
    def __init__(self, entrance, name, type, value, scope):
        self.entrance = entrance
        self.name = name
        self.type = type
        self.value = value
        self.scope = scope
        self.address = ''


class function(object):
    def __init__(self, entrance, name, type, param, paramNum):
        self.entrance = entrance
        self.name = name
        self.returnType = type
        self.param = param
        self.paramNum = paramNum


class gencode(object):
    def __init__(self, no, sym, term1, term2, set, scope):
        self.no = no
        self.sym = sym
        self.term1 = term1
        self.term2 = term2
        self.set = set
        self.scope = scope


class TF(object):
    def __init__(self, TC, FC):
        self.TC = TC
        self.FC = FC


class work(object):

    def __init__(self, tokens):
        self.pointer = -1
        self.tokens = tokens
        self.token = tokens[0]
        self.indentify = -1
        self.isErr = False
        self.isFirst = True
        self.pointRes = ''
        self.errRes = ''
        self.interRes = ''

        self.constList = []
        self.constId = 1
        self.constType = ''
        self.constName = ''
        self.constValue = ''

        self.variableList = []
        self.variableId = 1
        self.variableType = ''
        self.variableName = ''
        self.variableValue = ''

        self.pointerScope = 0
        self.nowScope = '/0'

        self.assignName = ''

        self.functionList = []
        self.functionId = 1
        self.funcName = ''
        self.returnType = ''
        self.param = []
        self.paramNum = 0
        self.nowParamType = ''

        self.hdyfuncName = ''
        self.hdyreturnType = ''
        self.hdyparam = []
        self.hdyparamNum = 0
        self.hdynowParamType = ''

        self.dyfuncName = ''
        self.dyparam = []
        self.dyparamNum = 0
        self.dynowParamType = ''

        self.intermediateCodeList = []
        self.icnum = 1

        self.tId = -1

        self.BRK = 0
        self.CONT = 0

        self.bpNum = 4

    def start(self):
        # print(len(self.tokens))
        chain = 0

        self.functionList.append(function(1, 'read', 'int', '', 0))
        self.functionList.append(function(2, 'write', 'void', ['int'], 1))
        self.functionId = 3

        while (self.pointer < len(self.tokens) - 1):
            chain = self.program(chain)
        print('-------------------------------------------------------')
        # print(self.pointRes)
        res = [self.pointRes, self.errRes]
        print('-------------------------------------------------------')
        print('常量表:')
        for i in self.constList:
            print(str(i.entrance) + ', ' + str(i.type) +
                  ', ' + str(i.name) + ', ' + str(i.value))
        print('-------------------------------------------------------')
        print('变量表:')
        for i in self.variableList:
            print(str(i.entrance) + ', ' + str(i.type) + ', ' +
                  str(i.name) + ', ' + str(i.value) + ', ' + i.scope)
        print('-------------------------------------------------------')
        print('函数表:')
        for i in self.functionList:
            print(str(i.entrance) + ', ' + str(i.returnType) + ', ' +
                  str(i.name) + ', ' + str(i.paramNum) + ' ', end='')
            for t in i.param:
                print(t + ' ', end='')
            print(' ')
        print('-------------------------------------------------------')
        # no, sym, term1, term2, set
        print('中间代码:')
        for i in self.intermediateCodeList:
            print(str(i.no) + ', ' + str(i.sym) + ', ' +
                  str(i.term1) + ', ' + str(i.term2) + ', ' + str(i.set))
            self.interRes += str(i.no) + ', ' + str(i.sym) + ', ' + \
                str(i.term1) + ', ' + str(i.term2) + ', ' + str(i.set) + '\n'
        res = [self.pointRes, self.errRes, self.interRes]
        return res

    def merge(self, p1, p2):
        if(p2 == 0):
            return p1
        else:
            p = p2
            while(self.getgencode(p) != -1 and self.getgencode(p).set != 0):
                p = self.getgencode(p).set
            if(p1 != 0):
                self.intermediateCodeList[p1 - 1].set = p
            return p2
        pass

    def backPatch(self, p, t):
        q = p
        while(q != 0 and self.getgencode(q) != -1):
            m = self.getgencode(q).set
            self.intermediateCodeList[q-1].set = t
            q = m
        pass

    def getgencode(self, no):
        for i in self.intermediateCodeList:
            if(i.no == no):
                return i

        return -1

    def addgencode(self, sym, term1, term2, set):
        self.intermediateCodeList.append(
            gencode(self.icnum, sym, term1, term2, set, self.nowScope))
        self.icnum += 1
        pass

    def newt(self):
        self.tId += 1
        return 'T' + str(self.tId)

    def checkConst(self, wordname, type, value, scope):
        flag = True
        for i in self.constList:
            if(i.name == wordname):
                print('err:发现同名常量声明，请检查！')
                flag = False
                pass
        for i in self.variableList:
            if(i.name == wordname and i.scope == scope):
                print('err:发现同定义域下存在同名变量声明，请检查！')
                flag = False
                pass
        if(flag):
            print('point:未发现同名常量声明，已正确加入到常量表中')
            newConst = constant(self.constId, wordname, type, value)
            self.constList.append(newConst)
            self.constId += 1
        pass

    def checkAssign(self):
        # print('0/1/2'.find('0/1'))
        # print(self.nowScope)
        flag = False
        flag2 = True
        for i in self.constList:
            if(i.name == self.assignName and self.nowScope.find(i.scope) == 0):
                print('err:发现当前赋值表达式被赋值数据' + str(self.assignName) + '为常量类型，请检查！')
                flag = True
                pass
        for i in self.variableList:
            if(i.name == self.assignName and self.nowScope.find(i.scope) == 0):
                print('point:在变量表中找到当前被赋值数据' + str(self.assignName) +
                      ',属于先声明再使用。其声明的作用域为:"' + i.scope)
                flag2 = False
                pass

        if(flag):
            print('err:当前赋值表达式被赋值' + str(self.assignName) + '数据为常量类型')
        elif(flag2):
            print('err:在变量表中没有找到当前被赋值数据' + str(self.assignName) + ',属于未声明就使用。')

    def addConst(self, wordname, type, value):
        self.checkConst(wordname, type, value, self.nowScope)
        pass

    def checkVariable(self, wordname, type, value, scope):
        flag = True
        for i in self.variableList:
            if(i.name == wordname and i.scope == scope):
                print('err:发现同定义域下存在同名变量声明，请检查！')
                # print(wordname)
                flag = False
                pass
        for i in self.constList:
            if(i.name == wordname):
                print('err:发现同名常量声明，请检查！')
                # print(wordname)
                flag = False
                pass
        if(flag):
            print('point:未发现同名同定义域变量声明，已正确加入到变量表中')
            # print(wordname)
            newVariable = variable(
                self.variableId, wordname, type, value, self.nowScope)
            self.variableList.append(newVariable)
            self.variableId += 1
        pass

    def addVariable(self, wordname, type, value):
        self.checkVariable(wordname, type, value, self.nowScope)
        pass

    def checkFunction(self):
        flag = True
        for i in self.functionList:
            if(i.name == self.funcName and i.returnType == self.returnType and self.paramNum == i.paramNum and self.param == i.param):
                flag = False
                print('err:当前函数声明为重复声明，请检查!')
        for i in self.variableList:
            if(i.name == self.funcName):
                print('err:发现当前函数声明存在同名变量声明，请检查！')
                flag = False
                pass
        for i in self.constList:
            if(i.name == self.funcName):
                print('err:发现当前函数声明存在同名常量声明，请检查！')
                flag = False
                pass

        if(flag):
            print('point:未发现重复声明的函数声明，已正确加入到函数表中')
            self.functionList.append(function(
                self.functionId, self.funcName, self.returnType, self.param, self.paramNum))
            self.functionId += 1
        pass

    def addFunction(self):
        # print(str(self.funcName) + ', ' + str(self.returnType) + ', ' + str(self.paramNum))
        # if(self.paramNum > 0):
        #     print('该函数声明的参数类型是:',end='')
        #     for i in self.param:
        #         print(i + ' ',end='')
        #     print(' ')
        self.checkFunction()
        pass

    def checkdyFunction(self):

        print(str(self.dyfuncName) + ' ' + str(self.dyparamNum) + ' ', end='')
        for i in self.dyparam:
            print(i + ' ', end='')
        print('')
        flag = True
        for i in self.functionList:
            if(i.name == self.dyfuncName and self.dyparamNum == i.paramNum and self.dyparam == i.param):
                flag = False
                print('point:当前函数调用语句' + self.dyfuncName + '()' + '有声明，属于先声明后调用')
                # print(self.dyfuncName)
        if(flag):
            print('err:未发现当前函数调用语句' + self.dyfuncName + '()' + '的声明，属于未声明就调用')

    def checkhdyFunction(self):
        flag = True
        for i in self.functionList:
            if(i.name == self.hdyfuncName and i.returnType == self.hdyreturnType and self.hdyparamNum == i.paramNum and self.hdyparam == i.param):
                flag = False
                print('point:当前函数定义语句有声明，属于先声明后定义')
        if(flag):
            print('err:未发现当前函数定义语句的声明，属于未声明就定义')
        pass

    def checkdyVar(self, wordname):
        type = 'null'
        for i in self.variableList:
            if (i.name == wordname and self.nowScope.find(i.scope) == 0):
                print('point:发现当前变量表中存在函数调用的变量')
                # print(wordname)
                type = i.type
                pass
        for i in self.constList:
            if (i.name == wordname):
                print('point:发现当前函数调用参数为常数，请检查！')
                # print(wordname)
                type = 'null'
                pass
        return type

        pass

    def checkVar(self, wordname):
        type = 'null'
        for i in self.variableList:
            if (i.name == wordname and self.nowScope.find(i.scope) == 0):
                print('point:发现变量表中存在当前标志符,故为变量')
                # print(wordname)
                type = i.type
                pass
        for i in self.constList:
            if (i.name == wordname):
                print('point:发现当前标志符代表常数,故为常量')
                # print(wordname)
                type = 'const'
                pass
        return type

    def printIndentify(self):
        i = -1
        while i < self.indentify:
            i = i + 1
            print('---', end="")
            self.pointRes = self.pointRes + '---'

    def aexpr(self):
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析算数表达式')
        self.pointRes = self.pointRes + '分析算数表达式' + '\n'
        Place = ''
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            # print(self.indentify)
            Place = self.token.word
            term1 = self.aterm()
            while(self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
                if(self.token.word == '+' or self.token.word == '-' and self.pointer < len(self.tokens) - 1):
                    # term1 = self.tokens[self.pointer - 1].word
                    Place = self.newt()
                    op = self.token.word
                    self.token = self.getnexttoken()
                    term2 = self.aterm()
                    self.addgencode(op, term1, term2, Place)
                    term1 = Place
                else:
                    self.pointer = self.pointer - 1
                    self.token = self.tokens[self.pointer]
                    Place = term1
                    break
            self.printIndentify()
            print('算数表达式分析结束')
            self.pointRes = self.pointRes + '算数表达式分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
        else:
            self.printIndentify()
            print('算数表达式分析结束')
            self.pointRes = self.pointRes + '算数表达式分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
        print('A ' + Place)
        return Place

    def aterm(self):
        Place = self.token.word
        term1 = self.afactor()
        while(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if (self.token.word == '*' or self.token.word == '/' or self.token.word == '%' and self.pointer < len(self.tokens) - 1):
                Place = self.newt()
                op = self.token.word
                # term1 = self.tokens[self.pointer - 1].word
                self.token = self.getnexttoken()
                term2 = self.afactor()
                self.addgencode(op, term1, term2, Place)
                term1 = Place
            else:
                self.pointer = self.pointer - 1
                self.token = self.tokens[self.pointer]
                Place = term1
                break
        print('T ' + Place)
        return Place
        # if(self.pointer == len(self.tokens) - 1 and self.token.id == '200'):
        #     self.printIndentify()
        #     print('point:算数表达式的判别的是变量')
        #     self.pointRes = self.pointRes + 'point:算数表达式的判别的是变量' + '\n'

    def afactor(self):
        Place = ''
        if (self.token.word == '(' and self.pointer < len(self.tokens) - 1):
            # self.token = self.getnexttoken()
            Place = self.aexpr()
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.word != ')'):
                print('err:缺少)')
                self.ErrRes = self.errRes + 'err:缺少)' + '\n'
                self.pointer = len(self.tokens) - 1
            else:
                print('yes')
                # self.pointer = self.pointer + 1

        elif(self.token.word == '-' and self.pointer < len(self.tokens) - 1):
            Place = self.aexpr()
            self.addgencode('@', Place, '', Place)
        elif(self.token.id == '200' and self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.word == '('):
                dyn = self.dyfuncName = self.tokens[self.pointer - 1].word
                self.dyparam = []
                self.dyparamNum = 0
                self.argumentList()
                Place = self.newt()
                if (dyn == self.dyfuncName):
                    self.addgencode('call', self.dyfuncName, '', Place)
                else:
                    self.addgencode('call', dyn, '', Place)
                    self.dyfuncName = dyn

            else:
                Place = self.tokens[self.pointer - 1].word
                varRes = self.checkVar(self.tokens[self.pointer - 1].word)
                # print(varRes)
                # print(varRes == 'int')
                if(varRes == 'int' or varRes == 'char' or varRes == 'float'):
                    self.printIndentify()
                    print('point:算数表达式的判别的是变量')
                    self.pointRes = self.pointRes + 'point:算数表达式的判别的是变量' + '\n'
                elif(varRes == 'const'):
                    self.printIndentify()
                    print('point:算数表达式的判别的是常量')
                    self.pointRes = self.pointRes + 'point:算数表达式的判别的是常量' + '\n'
                else:
                    print('err:算数表达式的判别的是未定义标志符')
                    self.errRes = self.errRes + 'point:算数表达式的判别的是常量' + '\n'
                self.pointer = self.pointer - 1

        elif(self.token.id == '201' or self.token.id == '202' or self.token.id == '203' or self.token.id == '204' or self.token.id == '205' or self.token.id == '206'):
            Place = self.tokens[self.pointer].word
            self.printIndentify()
            print('point:算数表达式的判别的是常量')
            self.pointRes = self.pointRes + 'point:算数表达式的判别的是常量' + '\n'
        print('F ' + Place)
        return Place
        # self.pointer = self.pointer - 1

        # else:
        #     self.pointer = self.pointer - 1

        # else:
        #     print('第' + str(self.pointer + 1) +'个token没有问题')
        # print('',end='')

    def bexpr(self):
        self.indentify = self.indentify + 1
        # print(self.indentify)
        self.printIndentify()
        print('分析布尔表达式')
        self.pointRes = self.pointRes + '分析布尔表达式' + '\n'
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        btres1 = self.bterm()
        while(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.word == '||' and self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
                self.backPatch(btres1.FC, self.icnum)
                btres2 = self.bfactor()

                btres1.FC = btres2.FC
                btres1.TC = self.merge(btres2.TC, btres1.TC)
            else:
                if (self.pointer < len(self.tokens) - 1):
                    self.pointer = self.pointer - 1
                    self.token = self.tokens[self.pointer]
                break
        self.printIndentify()
        print('布尔表达式分析结束')
        self.pointRes = self.pointRes + '布尔表达式分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1

        return btres1

    def bterm(self):
        bfres1 = self.bfactor()
        while(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if (self.token.word == '&&' and self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
                self.backPatch(bfres1.TC, self.icnum)
                bfres2 = self.bfactor()

                bfres1.TC = bfres2.TC
                bfres1.FC = self.merge(bfres2.FC, bfres1.FC)
            else:
                if(self.pointer < len(self.tokens) - 1):
                    self.pointer = self.pointer - 1
                    self.token = self.tokens[self.pointer]
                break
        if (self.pointer == len(self.tokens) - 1 and self.token.id == '200'):
            self.printIndentify()
            print('point:布尔表达式的判别的是变量')
            self.pointRes = self.pointRes + 'point:布尔表达式的判别的是变量' + '\n'
        return bfres1

    def bfactor(self):
        tf = TF(0, 0)
        # print(str(tf.TC) +'  '+str(tf.FC))
        if (self.token.word == '!' and self.pointer < len(self.tokens) - 1):
            # self.token = self.getnexttoken()
            resArray = self.bexpr()
            tf.TC = resArray.FC
            tf.FC = resArray.TC
        else:
            self.pointer = self.pointer - 1
            rop1 = self.aexpr()
            if(self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析关系表达式')
            self.pointRes = self.pointRes + '分析关系表达式' + '\n'
            if(self.token.word == '>' or self.token.word == '<' or self.token.word == '==' or self.token.word == '>=' or self.token.word == '<='):
                op = self.token.word
                if(self.pointer != len(self.tokens) - 1):
                    rop2 = self.aexpr()
                    tf.TC = self.icnum
                    tf.FC = self.icnum + 1
                    self.addgencode('j' + op, rop1, rop2, 0)
                    self.addgencode('j', '', '', 0)
                else:
                    print('err:关系表达式的右边缺少')
                    self.errRes = self.errRes + 'err:关系表达式的右边缺少' + '\n'

                    self.pointer = len(self.tokens) - 1
            # elif(self.token.word != 'i'):
            elif (self.token.id == '200'):
                tf.TC = self.icnum
                tf.FC = self.icnum + 1
                self.addgencode('jnz', self.token.word, '', 0)
                self.addgencode('j', '', '', 0)
                self.printIndentify()
                print('point:布尔表达式的判别的是变量')
                self.pointRes = self.pointRes + 'point:布尔表达式的判别的是变量' + '\n'
                self.pointer = self.pointer - 1
            elif (self.token.id == '201' or self.token.id == '202' or self.token.id == '203' or self.token.id == '204' or self.token.id == '205' or self.token.id == '206'):
                self.printIndentify()
                print('point:布尔表达式的判别的是常量')
                self.pointRes = self.pointRes + 'point:布尔表达式的判别的是常量' + '\n'
                # self.pointer = self.pointer - 1
            elif(self.token.word == ',' or self.token.word == ')'):
                self.printIndentify()
                print('point:布尔表达式的判别可能为函数传参')
                self.pointRes = self.pointRes + 'point:布尔表达式的判别可能为函数传参' + '\n'
                self.pointer = self.pointer - 1
            elif (self.token.word == ';'):
                self.printIndentify()
                print('point:布尔表达式的判别为分隔符;')
                self.pointRes = self.pointRes + 'point:布尔表达式的判别为分隔符;' + '\n'
                # self.pointer = self.pointer - 1
            elif (self.token.word == '&&' or self.token.word == '||'):
                self.pointer = self.pointer - 1
                tf.TC = self.icnum
                tf.FC = self.icnum + 1
                rop2 = self.aexpr()
                self.addgencode('jnz', rop1, rop2, 0)
                self.addgencode('j', '', '', 0)
                self.pointer = self.pointer - 1
            else:
                # print('err:布尔表达式判断出其他错误')
                # self.errRes = self.errRes + 'err:布尔表达式判断出其他错误' + '\n'
                # self.pointer = len(self.tokens) - 1
                self.pointer = self.pointer - 1

            self.printIndentify()
            print('关系表达式分析结束')
            self.pointRes = self.pointRes + '关系表达式分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
        return tf

    def expression(self):
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析表达式')
        self.pointRes = self.pointRes + '分析表达式' + '\n'
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        Place = self.token.word
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析赋值表达式')
        self.pointRes = self.pointRes + '分析赋值表达式' + '\n'
        if(self.token.id == '200' and self.pointer < len(self.tokens) - 1):
            term1 = self.token.word
            self.token = self.getnexttoken()
            if(self.token.word == '='):
                op = self.token.word
                # self.pointer = self.pointer - 1
                self.assignName = self.tokens[self.pointer - 1].word
                term2 = self.expression()
                self.addgencode(op, term2, '', term1)
            else:
                self.pointer = self.pointer - 2
                Place = self.aexpr()

        elif(self.token.id == '201' or self.token.id == '202' or self.token.id == '203' or self.token.id == '204' or self.token.id == '205' or self.token.id == '206'):
            self.printIndentify()
            print('point:表达式判定的是常量')
            self.pointRes = self.pointRes + 'point:表达式判定的是常量' + '\n'
            # self.pointer = self.pointer + 1
        else:
            self.pointer = self.pointer - 2
            Place = self.aexpr()
        self.printIndentify()

        print('赋值表达式分析结束')
        self.pointRes = self.pointRes + '赋值表达式分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        self.printIndentify()
        print('表达式分析结束')
        self.pointRes = self.pointRes + '表达式分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return Place

    def argumentList(self):
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == ')'):
            self.dyparam = []
            self.dyparamNum = 0
            self.checkdyFunction()
            self.printIndentify()
            print('point:算数表达式的判别的是函数调用')
            self.pointRes = self.pointRes + 'point:算数表达式的判别的是函数调用' + '\n'
        else:
            self.pointer = self.pointer - 1
            self.List()

    def List(self):
        self.Argument()

    def Argument(self):
        Place = self.aexpr()
        self.addgencode('para', Place, '', '')
        self.dyparam.append(self.checkdyVar(self.token.word))
        if(self.pointer > len(self.tokens) - 1):
            return
        if(self.pointer == len(self.tokens) - 1):
            self.pointer = self.pointer - 1
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        self.dyparamNum += 1
        if (self.token.word == ',' and self.pointer < len(self.tokens) - 1):
            Place = self.aexpr()
            self.addgencode('para', Place, '', '')
            self.dyparam.append(self.checkdyVar(self.token.word))
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()

            if(self.token.word == ')'):
                self.checkdyFunction()
                self.printIndentify()
                print('point:函数调用带有传参')
                self.pointRes = self.pointRes + 'point:函数调用带有传参' + '\n'
            elif (self.pointer < len(self.tokens) - 1):
                self.pointer = self.pointer - 1
                self.Argument()
            else:
                self.printIndentify()
                print("err:函数调用没有右括号")
        elif(self.token.word == ')'):
            self.checkdyFunction()
            self.printIndentify()
            print('point:函数调用带有传参')
            self.pointRes = self.pointRes + 'point:函数调用带有传参' + '\n'
        else:
            print('err:函数调用没有右括号')
            self.errRes = self.errRes + 'err:函数调用没有右括号' + '\n'
            print(self.token.word)
            print(self.token.lineno)

            self.pointer = len(self.tokens) - 1

    def match(self, word):
        if(self.token == word):
            self.token = self.getnexttoken()
            return
        else:
            print('err')

    def getnexttoken(self):
        self.pointer = self.pointer + 1
        return self.tokens[self.pointer]

    def declareSentence(self):
        chain = 0
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析声明语句')
        self.pointRes = self.pointRes + '分析声明语句' + '\n'
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.word == 'const'):
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('分析常量声明语句')
                self.pointRes = self.pointRes + '分析常量声明语句' + '\n'
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if(self.token.word == 'int' or self.token.word == 'char' or self.token.word == 'float'):
                    self.constType = self.token.word
                    self.constTable()
                else:
                    # self.printIndentify()
                    print('err:常量声明中常量类型输入错误')
                    self.errRes = self.errRes + 'err:常量声明中常量类型输入错误' + '\n'

                    self.pointer = len(self.tokens) - 1
                self.printIndentify()
                print('常量声明语句分析结束')
                self.pointRes = self.pointRes + '常量声明语句分析结束' + '\n'
                # print(self.indentify)
                self.indentify = self.indentify - 1

            elif(self.token.word == 'int' or self.token.word == 'char' or self.token.word == 'float' or self.token.word == 'void'):
                self.variableType = self.token.word
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if(self.token.id == '200'):
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if(self.token.word != '('):
                        self.pointer = self.pointer - 2
                        self.indentify = self.indentify + 1
                        self.printIndentify()
                        print('分析变量声明语句')
                        self.pointRes = self.pointRes + '分析变量声明语句' + '\n'
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                        if(self.token.id == '200'):
                            self.variableName = self.token.word
                            Place1 = self.token.word
                            self.varTable(Place1)
                            self.varTables(Place1)
                        else:
                            # self.printIndentify()
                            print('err:变量声明中所声明的变量不是标志符')
                            self.errRes = self.errRes + 'err:变量声明中所声明的变量不是标志符' + '\n'

                            self.pointer = len(self.tokens) - 1
                        self.printIndentify()
                        print('变量声明语句分析结束')
                        self.pointRes = self.pointRes + '变量声明语句分析结束' + '\n'
                        # print(self.indentify)
                        self.indentify = self.indentify - 1
                    else:
                        self.indentify = self.indentify + 1
                        self.printIndentify()
                        print('分析函数声明语句')
                        self.pointRes = self.pointRes + '分析函数声明语句' + '\n'
                        self.funcName = self.tokens[self.pointer - 1].word
                        self.returnType = self.tokens[self.pointer - 2].word
                        self.paramNum = 0
                        self.param = []
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                        if (self.token.word != ')'):
                            self.pointer = self.pointer - 1
                            self.funcDeclare()
                            if (self.pointer < len(self.tokens) - 1):
                                self.token = self.getnexttoken()
                            if(self.token.word != ')'):
                                # self.printIndentify()
                                print('err:函数声明缺少）')
                                self.errRes = self.errRes + 'err:函数声明缺少）' + '\n'

                                self.pointer = len(self.tokens) - 1
                            else:
                                self.printIndentify()
                                print('函数声明判别初步完成')
                                self.pointRes = self.pointRes + '函数声明判别初步完成' + '\n'
                            if(self.pointer < len(self.tokens) - 1):
                                self.token = self.getnexttoken()
                            self.addFunction()
                            if (self.token.word == ';'):
                                self.printIndentify()
                                print('函数声明判别完成')
                                self.pointRes = self.pointRes + '函数声明判别完成' + '\n'
                            else:
                                # self.printIndentify()
                                print('err:函数声明缺少;')
                                self.errRes = self.errRes + 'err:函数声明缺少;' + \
                                    ' 错误行数出现在第' + \
                                    str(self.token.lineno) + '行上' + '\n'

                                self.pointer = len(self.tokens) - 1
                        else:
                            self.paramNum = 0
                            self.param = []
                            self.printIndentify()
                            print('函数声明无参且含右括号')
                            self.pointRes = self.pointRes + '函数声明无参且含右括号' + '\n'
                            if (self.pointer < len(self.tokens) - 1):
                                self.token = self.getnexttoken()
                            if (self.token.word == ';'):
                                self.printIndentify()
                                print('函数声明判别完成')
                                self.pointRes = self.pointRes + '函数声明判别完成' + '\n'
                            else:
                                # self.printIndentify()
                                print('err:函数声明缺少;')
                                self.errRes = self.errRes + 'err:函数声明缺少;' + \
                                    ' 错误行数出现在第' + \
                                    str(self.token.lineno) + '行上' + '\n'

                                self.pointer = len(self.tokens) - 1
                        self.printIndentify()
                        print('函数声明语句分析结束')
                        self.pointRes = self.pointRes + '函数声明语句分析结束' + '\n'
                        # print(self.indentify)
                        self.indentify = self.indentify - 1

                else:
                    # self.printIndentify()
                    print('err:变量声明或函数声明判别有误')
                    self.errRes = self.errRes + 'err:变量声明或函数声明判别有误' + '\n'

                    self.pointer = len(self.tokens) - 1
                pass

            else:
                self.printIndentify()
                self.pointer = self.pointer - 1
                print('声明语句判断不存在')
                self.pointRes = self.pointRes + '声明语句判断不存在' + '\n'

        self.printIndentify()
        print('声明语句分析结束')
        self.pointRes = self.pointRes + '声明语句分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return chain

    def constTable(self):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.id == '200'):
            self.constName = self.token.word
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.word == '='):
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if(self.token.id == '201' or self.token.id == '202' or self.token.id == '203' or self.token.id == '204' or self.token.id == '205' or self.token.id == '206'):
                    self.constValue = self.token.word
                    self.constTables()
                else:
                    # self.printIndentify()
                    print('err:常数声明所赋值不是常数')
                    self.errRes = self.errRes + 'err:常数声明所赋值不是常数' + '\n'

                    self.pointer = len(self.tokens) - 1
            else:
                # self.printIndentify()
                print('err:常数声明缺少等号')
                self.errRes = self.errRes + 'err:常数声明缺少等号' + '\n'

                self.pointer = len(self.tokens) - 1
        else:
            # self.printIndentify()
            print('err:常数声明被赋值不是标志符')
            self.errRes = self.errRes + 'err:常数声明被赋值不是标志符' + '\n'

            self.pointer = len(self.tokens) - 1
        pass

    def constTables(self):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == ';'):
            self.printIndentify()
            print('point:常数声明判定完成')
            self.addConst(self.constName, self.constType, self.constValue)
            self.pointRes = self.pointRes + 'point:常数声明判定完成' + '\n'
        elif(self.token.word == ','):
            self.addConst(self.constName, self.constType, self.constValue)
            self.constTable()
        else:
            # self.printIndentify()
            print('err:常数声明不正确')
            self.errRes = self.errRes + 'err:常数声明不正确' + '\n'

            self.pointer = len(self.tokens) - 1

    def varTable(self, Place1):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == '='):
            self.printIndentify()
            print('point:当前变量声明有赋值')
            self.pointRes = self.pointRes + 'point:当前变量声明有赋值' + '\n'
            Place2 = self.aexpr()
            self.addgencode('=', Place2, '', Place1)
            if (self.token.id == '201' or self.token.id == '202' or self.token.id == '203' or self.token.id == '204' or self.token.id == '205' or self.token.id == '206' or self.token.word == ')'):
                self.variableValue = 'null'
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
            else:
                self.variableValue = 'null'
            # print(self.variableName + ', ' + self.variableType + ', ' + self.variableValue)
            # self.addVariable(self.variableName,self.variableType,self.variableValue)
        else:
            self.variableValue = 'null'
            self.printIndentify()
            print('point:当前变量声明并未赋值')
            self.pointRes = self.pointRes + 'point:当前变量声明并未赋值' + '\n'

        pass

    def varTables(self, Place1):
        # if(self.pointer < len(self.tokens) - 1):
        #     self.token = self.getnexttoken()
        if(self.token.word == ',' and self.pointer < len(self.tokens) - 1):
            self.addVariable(self.variableName,
                             self.variableType, self.variableValue)
            self.token = self.getnexttoken()
            if (self.token.id == '200'):
                self.variableName = self.token.word
                Place1 = self.token.word
                self.varTable(Place1)
                self.varTables(Place1)
            else:
                # self.printIndentify()
                print('err:变量声明中所声明的变量不是标志符')
                self.errRes = self.errRes + 'err:变量声明中所声明的变量不是标志符' + '\n'

                self.pointer = len(self.tokens) - 1
        elif(self.token.word == ';'):
            self.addVariable(self.variableName,
                             self.variableType, self.variableValue)
            self.printIndentify()
            print('point:变量声明判定结束')
            self.pointRes = self.pointRes + 'point:变量声明判定结束' + '\n'
        else:
            # self.printIndentify()
            print('err:变量声明缺少;')
            self.errRes = self.errRes + 'err:变量声明缺少;' + '\n'

            self.pointer = len(self.tokens) - 1

    def funcDeclare(self):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == 'int' or self.token.word == 'char' or self.token.word == 'float'):
            self.paramNum = self.paramNum + 1
            self.param.append(str(self.token.word))
            self.printIndentify()
            print('point:此时判定声明函数中有参数类型')
            self.pointRes = self.pointRes + 'point:此时判定声明函数中有参数类型' + '\n'
            self.funcDeclares()
        else:
            self.pointer = self.pointer - 1
            # self.printIndentify()
            print('err:声明函数中不是函数类型')
            self.errRes = self.errRes + 'err:声明函数中不是函数类型' + '\n'

            self.pointer = len(self.tokens) - 1
        pass

    def funcDeclares(self):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == ','):
            self.printIndentify()
            print('point:此时判定声明函数后续还有参数类型')
            self.pointRes = self.pointRes + 'point:此时判定声明函数后续还有参数类型' + '\n'
            self.funcDeclare()
        else:
            self.pointer = self.pointer - 1
            self.printIndentify()
            print('point:此时判定声明函数中后续没有参数类型了')
            self.pointRes = self.pointRes + 'point:此时判定声明函数中后续没有参数类型了' + '\n'

    def sentence(self, chain):
        # print(str(chain) +',' + str(self.icnum))
        self.backPatch(chain, self.icnum)
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析语句')
        self.pointRes = self.pointRes + '分析语句' + '\n'
        chain = self.implementSentence(chain)
        self.declareSentence()
        self.printIndentify()
        print('语句分析结束')
        self.pointRes = self.pointRes + '语句分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return chain

    def implementSentence(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析控制语句')
        self.pointRes = self.pointRes + '分析控制语句' + '\n'
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.id == '200'):
                term1 = self.token.word
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if(self.token.word == '='):
                    self.printIndentify()
                    print('point:判断出为赋值语句')
                    self.pointRes = self.pointRes + 'point:判断出为赋值语句' + '\n'
                    self.indentify = self.indentify + 1
                    self.printIndentify()
                    print('分析赋值语句')
                    self.assignName = self.tokens[self.pointer - 1].word
                    self.pointRes = self.pointRes + '分析赋值语句' + '\n'
                    op = self.token.word
                    term2 = self.expression()
                    self.addgencode(op, term2, '', term1)
                    chain = 0
                    # if (self.pointer < len(self.tokens) - 1):
                    if(self.token.word != ';'):
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                    if(self.token.word != ';'):
                        # self.printIndentify()
                        print('err:赋值语句缺少;号')
                        self.errRes = self.errRes + 'err:赋值语句缺少;号' + '\n'
                        self.pointer = len(self.tokens) - 1
                    else:
                        self.checkAssign()
                        self.printIndentify()
                        print('point:赋值语句判断完成')
                        self.pointRes = self.pointRes + 'point:赋值语句判断完成' + '\n'
                        # self.pointer = self.pointer - 1
                    self.printIndentify()
                    print('赋值语句分析结束')
                    self.pointRes = self.pointRes + '赋值语句分析结束' + '\n'
                    # print(self.indentify)
                    self.indentify = self.indentify - 1
                elif(self.token.word == '('):
                    self.indentify = self.indentify + 1
                    self.printIndentify()
                    print('分析函数调用语句')
                    self.pointRes = self.pointRes + '分析函数调用语句' + '\n'
                    dyn = self.dyfuncName = self.tokens[self.pointer - 1].word

                    self.dyparam = []
                    self.dyparamNum = 0
                    self.argumentList()
                    if(dyn == self.dyfuncName):
                        self.addgencode('call', self.dyfuncName,
                                        '', self.newt())
                    else:
                        self.addgencode('call', dyn, '', self.newt())
                        self.dyfuncName = dyn
                    if(self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if (self.token.word != ';'):
                        # self.printIndentify()
                        print('err:函数调用语句缺少;号')
                        self.errRes = self.errRes + 'err:函数调用语句缺少;号' + '\n'

                        self.pointer = len(self.tokens) - 1
                    self.printIndentify()
                    print('函数语句分析结束')
                    self.pointRes = self.pointRes + '函数语句分析结束' + '\n'
                    # print(self.indentify)
                    self.indentify = self.indentify - 1
            elif(self.token.word == '{'):
                self.pointerScope += 1
                self.nowScope = self.nowScope + '/' + str(self.pointerScope)
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('分析复合语句')
                self.pointRes = self.pointRes + '分析复合语句' + '\n'
                chain = self.sentenceList(chain)
                self.printIndentify()
                print('point:复合语句分析完毕')
                self.pointRes = self.pointRes + 'point:复合语句分析完毕' + '\n'
                # print(self.indentify)
                self.indentify = self.indentify - 1
            elif (self.token.word == 'if'):
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('分析if语句')
                self.pointRes = self.pointRes + '分析if语句' + '\n'
                chain = self.isIf()
                self.printIndentify()
                print('if语句分析结束')
                self.pointRes = self.pointRes + 'if语句分析结束' + '\n'
                # print(self.indentify)
                self.indentify = self.indentify - 1
                pass
            elif (self.token.word == 'for'):
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('for分析语句')
                self.pointRes = self.pointRes + 'for分析语句' + '\n'
                chain = self.isFor(chain)
                self.printIndentify()
                print('for语句分析结束')
                self.pointRes = self.pointRes + 'for语句分析结束' + '\n'

                # print(self.indentify)
                self.indentify = self.indentify - 1
                pass
            elif (self.token.word == 'while'):
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('while分析语句')
                self.pointRes = self.pointRes + 'while分析语句' + '\n'
                chain = self.isWhile(chain)
                self.printIndentify()
                print('while语句分析结束')
                self.pointRes = self.pointRes + 'while语句分析结束' + '\n'
                # print(self.indentify)
                self.indentify = self.indentify - 1
                pass
            elif (self.token.word == 'do'):
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('分析do-while语句')
                self.pointRes = self.pointRes + '分析do-while语句' + '\n'
                chain = self.doWhile(chain)
                self.printIndentify()
                print('do-while语句分析结束')
                self.pointRes = self.pointRes + 'do-while语句分析结束' + '\n'
                # print(self.indentify)
                self.indentify = self.indentify - 1
                pass
            elif (self.token.word == 'return'):
                self.indentify = self.indentify + 1
                self.printIndentify()
                print('分析return语句')
                self.pointRes = self.pointRes + '分析return语句' + '\n'
                chain = self.isReturn(chain)
                self.printIndentify()
                print('return语句分析结束')
                self.pointRes = self.pointRes + 'return语句分析结束' + '\n'
                # print(self.indentify)
                self.indentify = self.indentify - 1
                pass
            elif (self.token.word == 'break'):
                print('err:在非循环语句中检测到break语句，请检查！')
                self.printIndentify()
                print('point:控制语句判断出当前语句不属于控制语句')
                self.pointRes = self.pointRes + 'point:控制语句判断出当前语句不属于控制语句' + '\n'
                # self.pointer = self.pointer - 1
                if(self.tokens[self.pointer + 1].word == ';'):
                    self.pointer = self.pointer + 1
                pass
            elif (self.token.word == 'continue'):
                print('err:在非循环语句中检测到continue语句，请检查！')
                self.printIndentify()
                print('point:控制语句判断出当前语句不属于控制语句')
                self.pointRes = self.pointRes + 'point:控制语句判断出当前语句不属于控制语句' + '\n'
                # self.pointer = self.pointer - 1
                if (self.tokens[self.pointer + 1].word == ';'):
                    self.pointer = self.pointer + 1
                pass
            else:
                self.printIndentify()
                print('point:控制语句判断出当前语句不属于控制语句')
                self.pointRes = self.pointRes + 'point:控制语句判断出当前语句不属于控制语句' + '\n'
                self.pointer = self.pointer - 1
        self.printIndentify()
        print('控制语句分析结束')
        self.pointRes = self.pointRes + '控制语句分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return chain

        pass

    def sentenceList(self, chain):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        while(self.token.word != '}' and self.pointer < len(self.tokens) - 1):
            self.pointer = self.pointer - 1
            chain = self.sentence(chain)
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
        #
        # if(self.pointer < len(self.tokens) - 1):
        #     self.token = self.tokens[self.pointer]
        if(self.token.word != '}'):
            # self.printIndentify()
            print('err:语句表判断出缺少}')
            self.errRes = self.errRes + 'err:语句表判断出缺少}' + '\n'

            self.pointer = len(self.tokens) - 1
        else:
            self.nowScope = self.nowScope[1:].split("/")
            # print(self.nowScope)
            self.nowScope.pop()
            # print(self.nowScope)
            self.nowScope = '/' + '/'.join(self.nowScope)
            # print(self.nowScope)

            # self.nowScope.join("/")
        # print('return :' + str(chain))
        return chain

    def isIf(self):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        self.printIndentify()
        print('point:初步判定为if语句')
        self.pointRes = self.pointRes + 'point:初步判定为if语句' + '\n'
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析if语句')
        self.pointRes = self.pointRes + '分析if语句' + '\n'
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if (self.token.word == '('):
            tf = self.bexpr()
            if(self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if (self.token.word == ')'):
                self.backPatch(tf.TC, self.icnum)
                s1chain = self.sentence(0)  # 这里需要添加函数结构
                ifres = self.isIfs(tf.FC, s1chain)
                self.printIndentify()
                print('point:if语句判定完成')
                self.pointRes = self.pointRes + 'point:if语句判定完成' + '\n'
            else:
                # self.printIndentify()
                print('err:if语句没有右括号')
                self.errRes = self.errRes + 'err:if语句没有右括号' + '\n'

                self.pointer = len(self.tokens) - 1
            # elif(self.tokens[])
        else:
            # self.printIndentify()
            print('err:if语句没有左括号')
            self.errRes = self.errRes + 'err:if语句没有左括号' + '\n'

            self.pointer = len(self.tokens) - 1
            # self.sentence()
        self.printIndentify()
        print('if语句分析结束')
        self.pointRes = self.pointRes + 'if语句分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return ifres

    def isIfs(self, fc, s1chain):
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == 'else'):
            self.printIndentify()
            print('point:进入判断else语句')
            self.pointRes = self.pointRes + 'point:进入判断else语句' + '\n'
            q = self.icnum
            self.addgencode('j', '', '', 0)
            self.backPatch(fc, self.icnum)
            tchain = self.merge(s1chain, q)
            # print('tchain' + str(tchain))
            s2chain = self.sentence(0)
            return self.merge(tchain, s2chain)
        else:
            self.pointer = self.pointer - 1
            return self.merge(s1chain, fc)

    def isFor(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        chain = 0
        sbrk = 0
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == '('):
            self.printIndentify()
            print('开始判断第一个表达式')
            self.pointRes = self.pointRes + '开始判断第一个表达式' + '\n'
            Place1 = self.expression()
            self.printIndentify()
            print('第一个表达式判断结束')
            self.pointRes = self.pointRes + '第一个表达式判断结束' + '\n'
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.word == ';'):
                self.printIndentify()
                print('第一个表达式验证完毕')
                ftest = self.icnum
                self.pointRes = self.pointRes + '第一个表达式验证完毕' + '\n'
                self.printIndentify()
                print('开始判断第二个表达式')
                self.pointRes = self.pointRes + '开始判断第二个表达式' + '\n'
                tf = self.bexpr()
                self.printIndentify()
                print('第二个表达式判断结束')
                self.pointRes = self.pointRes + '第二个表达式判断结束' + '\n'
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if (self.token.word == ';'):
                    self.printIndentify()
                    print('第二个表达式验证完毕')
                    achain = tf.FC
                    aright = tf.TC
                    ainc = self.icnum
                    atest = ftest
                    self.pointRes = self.pointRes + '第二个表达式验证完毕' + '\n'
                    self.printIndentify()
                    print('开始判断第三个表达式')
                    self.pointRes = self.pointRes + '开始判断第三个表达式' + '\n'
                    Place2 = self.expression()
                    self.printIndentify()
                    print('第三个表达式判断结束')
                    self.pointRes = self.pointRes + '第三个表达式判断结束' + '\n'
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if (self.token.word == ')'):
                        self.printIndentify()
                        print('第三个表达式验证完毕')
                        self.pointRes = self.pointRes + '第三个表达式验证完毕' + '\n'

                        self.addgencode('j', '', '', str(atest))
                        self.backPatch(aright, self.icnum)
                        bchain = achain
                        binc = ainc
                        schain = self.xh(chain)
                        self.merge(bchain, sbrk)
                        self.backPatch(schain, self.icnum)
                        self.backPatch(self.CONT, self.icnum)
                        self.addgencode('j', '', '', str(binc))
                        chain = self.merge(bchain, sbrk)
                        self.backPatch(bchain, self.icnum)

                        self.CONT = 0

                        chain = self.merge(chain, self.BRK)
                        self.BRK = 0
                    else:
                        # self.printIndentify()
                        print('err:for循环条件语句缺少)')
                        self.errRes = self.errRes + 'err:for循环条件语句缺少)' + '\n'
                        self.pointer = len(self.tokens) - 1
                else:
                    # self.printIndentify()
                    print('err:for循环第二个表达式缺少;')
                    self.errRes = self.errRes + 'err:for循环第二个表达式缺少;' + '\n'

                    self.pointer = len(self.tokens) - 1
            else:
                # self.printIndentify()
                print('err:for循环第一个表达式缺少;')
                self.errRes = self.errRes + 'err:for循环第一个表达式缺少;' + '\n'

                self.pointer = len(self.tokens) - 1
        else:
            # self.printIndentify()
            print('err:for循环语句缺少(')
            self.errRes = self.errRes + 'err:for循环语句缺少(' + '\n'
            self.pointer = len(self.tokens) - 1

        return chain
        pass

    def isWhile(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        chain = wq = wdchain = wdq = schain = 0
        wq = self.icnum
        Place = ''
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == '('):
            self.printIndentify()
            print('point:开始检查while循环条件表达式')
            self.pointRes = self.pointRes + 'point:开始检查while循环条件表达式' + '\n'
            tf = self.bexpr()
            self.backPatch(tf.TC, self.icnum)
            wdchain = tf.FC
            wdq = wq
            self.printIndentify()
            print('point:while循环条件表达式检查结束')
            self.pointRes = self.pointRes + 'point:while循环条件表达式检查结束' + '\n'
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.word == ')'):
                schain = self.xh(chain)
                self.backPatch(schain, wdq)
                print(str(schain)+' , '+str(wdq))
                self.backPatch(self.CONT, self.icnum)
                self.CONT = 0
                self.addgencode('j', '', '', str(wdq))
                chain = wdchain

                chain = self.merge(chain, self.BRK)
                self.BRK = 0
            else:
                # self.printIndentify()
                print('err:while循环判断条件缺少)')
                self.errRes = self.errRes + 'err:while循环判断条件缺少)' + '\n'

                self.pointer = len(self.tokens) - 1
        else:
            # self.printIndentify()
            print('err:while循环判断条件缺少(')
            self.errRes = self.errRes + 'err:while循环判断条件缺少(' + '\n'

            self.pointer = len(self.tokens) - 1

        return chain

    def doWhile(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        chain = head = uhead = schain = 0
        dhead = self.icnum
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == '{'):
            self.pointerScope += 1
            self.nowScope = self.nowScope + '/' + str(self.pointerScope)
            schain = self.xhb(chain)
            self.backPatch(chain, self.icnum)
            self.backPatch(self.CONT, self.icnum)
            if (self.token.word == '}'):
                # if (self.tokens[self.pointer] != '}'):
                #     if (self.pointer < len(self.tokens) - 1):
                #         self.token = self.getnexttoken()
                if(self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                # else:
                #     print('err:do-while语句缺少while关键字')
                if (self.token.word == 'while'):
                    uhead = dhead
                    self.backPatch(schain, self.icnum)
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    # else:
                    #     print('err:do-while语句缺少(')
                    if (self.token.word == '('):
                        tf = self.bexpr()
                        self.backPatch(tf.TC, uhead)
                        chain = tf.FC
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                        # else:
                        #     print('err:do-while语句缺少)')
                        if (self.token.word == ')'):
                            if (self.pointer < len(self.tokens) - 1):
                                self.token = self.getnexttoken()
                            if (self.token.word == ';' or self.pointer < len(self.tokens) - 1):
                                chain = self.merge(chain, self.BRK)
                                self.BRK = 0
                                self.printIndentify()
                                print('point:do-while语句判定完成')
                                self.pointRes = self.pointRes + 'point:do-while语句判定完成' + '\n'

                            else:
                                print('err:do-while语句缺少;')
                                self.errRes = self.errRes + 'err:do-while语句缺少;' + '\n'

                                self.pointer = len(self.tokens) - 1
                        else:
                            print('err:do-while语句缺少)')
                            self.errRes = self.errRes + 'err:do-while语句缺少)' + '\n'

                            self.pointer = len(self.tokens) - 1
                    else:
                        print('err:do-while语句缺少(')
                        self.errRes = self.errRes + 'err:do-while语句缺少(' + '\n'

                        self.pointer = len(self.tokens) - 1
                else:
                    print('err:do-while语句缺少while关键字')
                    self.errRes = self.errRes + 'err:do-while语句缺少while关键字' + '\n'

                    self.pointer = len(self.tokens) - 1
            else:
                print('err:do-while语句缺少}')
                self.errRes = self.errRes + 'err:do-while语句缺少}' + '\n'

                self.pointer = len(self.tokens) - 1
        else:
            print('err:do-while语句缺少{')
            self.errRes = self.errRes + 'err:do-while语句缺少{' + '\n'

            self.pointer = len(self.tokens) - 1
        return chain

    def isReturn(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.word == ';'):
                self.printIndentify()
                print('point:return语句返回的是空')
                self.pointRes = self.pointRes + 'point:return语句返回的是空' + '\n'
            else:
                self.pointer = self.pointer - 1
                if (self.pointer < len(self.tokens) - 1):
                    Place = self.aexpr()
                    self.addgencode('ret', Place, '', '')
                    # print(self.token.word)
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if(self.token.word == ';'):
                        self.printIndentify()
                        print('point:return语句返回的是一个表达式')
                        self.pointRes = self.pointRes + 'point:return语句返回的是一个表达式' + '\n'
                    else:
                        print('err:return语句缺少;号')
                        self.errRes = self.errRes + 'err:return语句缺少;号' + '\n'

                        self.pointer = len(self.tokens) - 1
                        if(self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                else:
                    print('err:return语句缺少;号')
                    self.errRes = self.errRes + 'err:return语句缺少;号' + '\n'

                    self.pointer = len(self.tokens) - 1

        else:
            print('err:return语句缺少;号')
            self.errRes = self.errRes + 'err:return语句缺少;号' + '\n'

            self.pointer = len(self.tokens) - 1
        return chain

    def isBreak(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.word != ';'):
                print('err:break语句缺少;号')
                self.errRes = self.errRes + 'err:break语句缺少;号' + '\n'
                self.pointer = len(self.tokens) - 1
            else:

                brk = self.BRK
                self.BRK = self.icnum
                self.addgencode("j", "", "", 0)
                self.BRK = self.merge(self.BRK, brk)
                chain = 0

                self.printIndentify()
                print('point:break语句检查完毕')
                self.pointRes = self.pointRes + 'point:break语句检查完毕' + '\n'
        else:
            print('err:break语句缺少;号')
            self.errRes = self.errRes + 'err:break语句缺少;号' + '\n'

            self.pointer = len(self.tokens) - 1
        return chain
        pass

    def isContinue(self):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if (self.token.word != ';'):
                print('err:continue语句缺少;号')
                self.errRes = self.errRes + 'err:continue语句缺少;号' + '\n'
                self.pointer = len(self.tokens) - 1
            else:
                cont = self.CONT
                self.CONT = self.icnum
                self.addgencode("j", "", "", 0)
                self.CONT = self.merge(self.CONT, cont)
                chain = 0
                self.printIndentify()
                print('point:continue语句检查完毕')
                self.pointRes = self.pointRes + 'point:continue语句检查完毕' + '\n'
        else:
            print('err:continue语句缺少;号')
            self.errRes = self.errRes + 'err:continue语句缺少;号' + '\n'

            self.pointer = len(self.tokens) - 1
        pass

    def xh(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        # if(self.token.word == 'if' and self.tokens[self.pointer].word != 'if'):
        #     self.token = self.getnexttoken()
        self.backPatch(chain, self.icnum)
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == '{'):
            self.pointerScope += 1
            self.nowScope = self.nowScope + '/' + str(self.pointerScope)
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析循环复用语句')
            self.pointRes = self.pointRes + '分析循环复用语句' + '\n'
            chain = self.xhb(chain)
            self.printIndentify()
            print('循环复用语句分析结束')
            self.pointRes = self.pointRes + '循环复用语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
        elif (self.token.word == 'if'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析循环if语句')
            self.pointRes = self.pointRes + '分析循环if语句' + '\n'
            chain = self.isxhIf(chain)
            self.printIndentify()
            print('循环if语句分析结束')
            self.pointRes = self.pointRes + '循环if语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.word == 'for'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析for语句')
            self.pointRes = self.pointRes + '分析for语句' + '\n'
            chain = self.isFor(chain)
            self.printIndentify()
            print('for语句分析结束')
            self.pointRes = self.pointRes + 'for语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.word == 'while'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析while语句')
            self.pointRes = self.pointRes + '分析while语句' + '\n'
            chain = self.isWhile(chain)
            self.printIndentify()
            print('while语句分析结束')
            self.pointRes = self.pointRes + 'while语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.word == 'do'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析do-while语句')
            self.pointRes = self.pointRes + '分析do-while语句' + '\n'
            chain = self.doWhile(chain)
            self.printIndentify()
            print('do-while语句分析结束')
            self.pointRes = self.pointRes + 'do-while语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.word == 'return'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析return语句')
            self.pointRes = self.pointRes + '分析return语句' + '\n'
            chain = self.isReturn(chain)
            self.printIndentify()
            print('return语句分析结束')
            self.pointRes = self.pointRes + 'return语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.word == 'break'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析break语句')
            self.pointRes = self.pointRes + '分析break语句' + '\n'
            chain = self.isBreak(chain)
            self.printIndentify()
            print('break语句分析结束')
            self.pointRes = self.pointRes + 'break语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.word == 'continue'):
            self.indentify = self.indentify + 1
            self.printIndentify()
            print('分析continue语句')
            self.pointRes = self.pointRes + '分析continue语句' + '\n'
            self.isContinue()
            self.printIndentify()
            print('continue语句分析结束')
            self.pointRes = self.pointRes + 'continue语句分析结束' + '\n'
            # print(self.indentify)
            self.indentify = self.indentify - 1
            pass
        elif (self.token.id == '200'):
            term1 = self.token.word
            if(self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
                if (self.token.word == '='):
                    op = self.token.word
                    self.printIndentify()
                    print('point:判断出为赋值语句')
                    self.pointRes = self.pointRes + 'point:判断出为赋值语句' + '\n'
                    self.indentify = self.indentify + 1
                    self.printIndentify()
                    print('分析赋值语句')
                    self.assignName = self.tokens[self.pointer - 1].word
                    self.pointRes = self.pointRes + '分析赋值语句' + '\n'
                    term2 = self.expression()
                    self.addgencode(op, term2, '', term1)
                    chain = 0
                    # if (self.pointer < len(self.tokens) - 1):
                    if(self.token.id == '201' or self.token.id == '202' or self.token.id == '203' or self.token.id == '204' or self.token.id == '205' or self.token.id == '206' and self.pointer < len(self.tokens) - 1):
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                    if (self.token.word != ';' and self.pointer < len(self.tokens) - 1):
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                    if (self.token.word != ';' and self.pointer < len(self.tokens) - 1):
                        # self.printIndentify()
                        print('err:赋值语句缺少;号')
                        self.errRes = self.errRes + 'err:赋值语句缺少;号' + '\n'

                        self.pointer = len(self.tokens) - 1
                    else:
                        # self.token = self.getnexttoken()
                        # if(self.token.word != '}'):
                        #     self.pointer = self.pointer - 1
                        #     self.token = self.tokens[self.pointer]
                        self.checkAssign()
                        self.printIndentify()
                        print('point:赋值语句判断完成')
                        self.pointRes = self.pointRes + 'point:赋值语句判断完成' + '\n'

                    self.printIndentify()
                    print('赋值语句分析结束')
                    self.pointRes = self.pointRes + '赋值语句分析结束' + '\n'
                    # print(self.indentify)
                    self.indentify = self.indentify - 1
                elif (self.token.word == '('):
                    self.indentify = self.indentify + 1
                    self.printIndentify()
                    print('分析函数调用语句')
                    self.pointRes = self.pointRes + '分析函数调用语句' + '\n'
                    dyn = self.dyfuncName = self.tokens[self.pointer - 1].word
                    self.dyparam = []
                    self.dyparamNum = 0
                    self.argumentList()
                    if (dyn == self.dyfuncName):
                        self.addgencode('call', self.dyfuncName,
                                        '', self.newt())
                    else:
                        self.addgencode('call', dyn, '', self.newt())
                        self.dyfuncName = dyn
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if (self.token.word != ';'):
                        # self.printIndentify()
                        print('err:函数调用语句缺少;号')
                        self.errRes = self.errRes + 'err:函数调用语句缺少;号' + '\n'

                        self.pointer = len(self.tokens) - 1
                    self.printIndentify()
                    print('函数语句分析结束')
                    self.pointRes = self.pointRes + '函数语句分析结束' + '\n'
                    # print(self.indentify)
                    self.indentify = self.indentify - 1
                else:
                    self.pointer = self.pointer - 1
        # elif(self.token.word == ';'):
        #     self.declareSentence()
        else:
            # self.pointer = self.pointer - 1
            self.declareSentence()
        return chain

    def xhb(self, chain):
        chain = self.xh(chain)
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()

        while (self.token.word != '}' and self.pointer < len(self.tokens) - 1):
            self.pointer = self.pointer - 1
            chain = self.xh(chain)
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            # self.token = self.tokens[self.pointer]

        # self.token = self.getnexttoken()
        if (self.token.word != '}'):
            print('err:循环语句表判断出缺少}')
            self.errRes = self.errRes + 'err:循环语句表判断出缺少}' + '\n'

            self.pointer = len(self.tokens) - 1

        else:
            self.nowScope = self.nowScope[1:].split("/")
            # print(self.nowScope)
            self.nowScope.pop()
            # print(self.nowScope)
            self.nowScope = '/' + '/'.join(self.nowScope)
            # print(self.nowScope)

            # self.nowScope.join("/")
        return chain

    def isxhIf(self, chain):
        # self.token = self.getnexttoken()
        # self.pointer = self.pointer - 1
        # self.pointer < len(self.tokens) - 1
        self.printIndentify()
        print('point:初步判定为if语句')
        self.pointRes = self.pointRes + 'point:初步判定为if语句' + '\n'
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析if语句')
        self.pointRes = self.pointRes + '分析if语句' + '\n'
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if (self.token.word == '('):
            tf = self.bexpr()
            if(self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if (self.token.word == ')'):
                self.backPatch(tf.TC, self.icnum)
                self.printIndentify()
                s1chain = self.xh(0)  # 这里需要添加函数结构
                xhifres = self.isxhIfs(tf.FC, s1chain)
                self.printIndentify()
                print('point:循环if语句判定完成')
                self.pointRes = self.pointRes + 'point:循环if语句判定完成' + '\n'
            else:
                print('err:循环if语句没有右括号')
                self.errRes = self.errRes + 'err:循环if语句没有右括号' + '\n'

                self.pointer = len(self.tokens) - 1
        else:
            print('err:循环if语句没有左括号')
            self.errRes = self.errRes + 'err:循环if语句没有左括号' + '\n'

            self.pointer = len(self.tokens) - 1
            # self.sentence()
        self.printIndentify()
        print('循环if语句分析结束')
        self.pointRes = self.pointRes + '循环if语句分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return xhifres

    def isxhIfs(self, fc, s1chain):
        if(self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == 'else'):
            self.printIndentify()
            print('point:进入判断xhelse语句')
            self.pointRes = self.pointRes + 'point:进入判断xhelse语句' + '\n'
            q = self.icnum
            self.addgencode('j', '', '', 0)
            self.backPatch(fc, self.icnum)
            tchain = self.merge(s1chain, q)
            s2chain = self.xh(0)
            return self.merge(tchain, s2chain)
        else:
            self.pointer = self.pointer - 1
            return self.merge(s1chain, fc)

    def hdy(self, chain):
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析函数定义语句')
        self.pointRes = self.pointRes + '分析函数定义语句' + '\n'
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == 'int' or self.token.word == 'char' or self.token.word == 'float' or self.token.word == 'void'):
            self.hdyreturnType = self.token.word
            self.hdyparamNum = 0
            self.hdyparam = []
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.id == '200'):
                self.hdyfuncName = self.token.word
                self.addgencode(self.hdyfuncName, '', '', '')
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if (self.token.word == '('):
                    self.pointerScope += 1
                    self.nowScope = self.nowScope + '/' + str(self.pointerScope)
                    chain = self.hdcl(chain)
                    self.bpNum = 4
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if (self.token.word == ')'):
                        if (self.pointer < len(self.tokens) - 1):
                            self.token = self.getnexttoken()
                        if (self.token.word == '{'):
                            self.indentify = self.indentify + 1
                            self.printIndentify()
                            print('分析复合语句')
                            self.pointRes = self.pointRes + '分析复合语句' + '\n'
                            chain = self.sentenceList(chain)
                            self.printIndentify()
                            print('point:复合语句分析完毕')
                            self.pointRes = self.pointRes + 'point:复合语句分析完毕' + '\n'
                            # print(self.indentify)
                            self.indentify = self.indentify - 1
                        else:
                            print('err:函数定义语句中复合语句缺少{')
                            self.errRes = self.errRes + \
                                'err:函数定义语句中复合语句缺少{' + '\n'
                            self.pointer = len(self.tokens) - 1
                    else:
                        print('err:函数定义语句缺少)')
                        self.errRes = self.errRes + 'err:函数定义语句缺少)' + '\n'
                        self.pointer = len(self.tokens) - 1
                else:
                    print('err:函数定义语句缺少(')
                    self.errRes = self.errRes + 'err:函数定义语句缺少(' + '\n'
                    self.pointer = len(self.tokens) - 1
            else:
                print('err:函数定义语句中函数类型后面跟的不是标志符')
                self.errRes = self.errRes + 'err:函数定义语句中函数类型后面跟的不是标志符' + '\n'
                self.pointer = len(self.tokens) - 1
        else:
            self.printIndentify()
            print('point:判定不是函数定义语句')
            self.pointRes = self.pointRes + 'point:判定不是函数定义语句' + '\n'

        self.checkhdyFunction()
        self.printIndentify()
        print('函数定义语句分析结束')
        self.pointRes = self.pointRes + '函数定义语句分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        self.addgencode('ret', '', '', '')
        return chain

    def hdcl(self, chain):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == 'int' or self.token.word == 'char' or self.token.word == 'float'):
            self.hdyparamNum += 1
            self.hdyparam.append(self.token.word)
            self.variableType = self.token.word
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
                if (self.token.id == '200'):
                    self.variableName = self.token.word
                    self.variableValue = 'null'
                    self.addVariable(self.variableName,
                                     self.variableType, self.variableValue)
                    self.variableList[len(
                        self.variableList) - 1].address = 'ss:[bp+' + str(self.bpNum) + ']'
                    self.bpNum += 2
                    chain = self.hdcls(chain)
                else:
                    print('err:函数定义语句变量不是标志符')
                    self.errRes = self.errRes + 'err:函数定义语句变量不是标志符' + '\n'
                    self.pointer = len(self.tokens) - 1
        else:
            self.hdyparamNum = 0
            self.hdyparam = []
            self.printIndentify()
            print('point:函数定义语句无参数')
            self.pointRes = self.pointRes + 'point:函数定义语句的参数变量类型有误' + '\n'
            self.pointer = self.pointer - 1
        return chain

    def hdcls(self, chain):
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
            if(self.token.word == ','):
                self.printIndentify()
                print('point:判定此时函数定义语句后续还有参数')
                self.pointRes = self.pointRes + 'point:判定此时函数定义语句后续还有参数' + '\n'
                chain = self.hdcl(chain)
            else:
                self.pointer = self.pointer - 1
                self.printIndentify()
                print('point:函数定义参数处理完毕')
                self.pointRes = self.pointRes + 'point:函数定义参数处理完毕' + '\n'
        return chain

    def program(self, chain):
        chain = 0
        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析程序')
        self.pointRes = self.pointRes + '分析程序' + '\n'
        self.addgencode('main', '', '', '')
        while(True):
            chain = self.declareSentence()
            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.word == 'main'):
                self.pointer = self.pointer - 1
                break
            else:
                self.pointer = self.pointer - 1

        self.indentify = self.indentify + 1
        self.printIndentify()
        print('分析main函数语句')
        self.pointRes = self.pointRes + '分析main函数语句' + '\n'
        if (self.pointer < len(self.tokens) - 1):
            self.token = self.getnexttoken()
        if(self.token.word == 'main'):

            if (self.pointer < len(self.tokens) - 1):
                self.token = self.getnexttoken()
            if(self.token.word == '('):
                if (self.pointer < len(self.tokens) - 1):
                    self.token = self.getnexttoken()
                if (self.token.word == ')'):
                    if (self.pointer < len(self.tokens) - 1):
                        self.token = self.getnexttoken()
                    if (self.token.word == '{'):
                        self.pointerScope += 1
                        self.nowScope = self.nowScope + \
                            '/' + str(self.pointerScope)
                        self.indentify = self.indentify + 1
                        self.printIndentify()
                        print('分析复合语句')
                        self.pointRes = self.pointRes + '分析复合语句' + '\n'
                        chain = self.sentenceList(chain)
                        self.printIndentify()
                        print('point:复合语句分析完毕')
                        self.pointRes = self.pointRes + 'point:复合语句分析完毕' + '\n'
                        # print(self.indentify)
                        self.indentify = self.indentify - 1
                        self.addgencode('sys', '', '', '_')
                        self.printIndentify()
                        print('main函数语句分析结束')
                        self.pointRes = self.pointRes + 'main函数语句分析结束' + '\n'
                        # print(self.indentify)
                        self.indentify = self.indentify - 1
                        chain = self.HK(chain)
                    else:
                        print('err:main函数语句中的复合语句缺少{')
                        self.errRes = self.errRes + \
                            'err:main函数语句中的复合语句缺少{' + '\n'
                        self.pointer = len(self.tokens) - 1
                else:
                    print('err:main函数语句中的缺少)')
                    self.errRes = self.errRes + 'err:main函数语句中的缺少)' + '\n'
                    self.pointer = len(self.tokens) - 1
            else:
                print('err:main函数语句中的缺少(')
                self.errRes = self.errRes + 'err:main函数语句中的缺少(' + '\n'
                self.pointer = len(self.tokens) - 1
        else:
            print('err:main函数语句中的缺少main')
            self.errRes = self.errRes + 'err:main函数语句中的缺少main' + '\n'
            self.pointer = len(self.tokens) - 1
        self.printIndentify()
        print('程序分析结束')
        self.pointRes = self.pointRes + '程序分析结束' + '\n'
        # print(self.indentify)
        self.indentify = self.indentify - 1
        return chain

    def HK(self, chain):
        if(self.pointer < len(self.tokens) - 1):
            chain = self.hdy(chain)
            chain = self.HK(chain)
        return chain


if __name__ == '__main__':
    token = switch.analysis()
    lines = token.readfile(r'D:\data.txt')
    for line in lines:
        line += ' 0'
        token.get_token(line)
        token.lineno += 1
    token = token.tokenObj
    for t in token:
        print(t)
    aa = work(token)
    aa.start()
