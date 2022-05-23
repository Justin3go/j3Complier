import sys
import json


class Token(object):
    def __init__(self, word, tp, id, lineno):
        self.word = word
        self.tp = tp
        self.id = id
        self.lineno = lineno

    def __str__(self):
        return "token: {} type: {} lineno: {} id: {}".format(self.word, self.tp, self.lineno, self.id)

    def __eq__(self, other):
        return self.word == other


class analysis(object):
    def __init__(self):
        self.result = [];
        self.lineno = 1;
        self.key = [
            {
                "id": "001",
                "name": "include",
                "type": "关键字"
            },
            {
                "id": "002",
                "name": "void",
                "type": "关键字"
            },
            {
                "id": "003",
                "name": "main",
                "type": "关键字"
            },
            {
                "id": "004",
                "name": "if",
                "type": "关键字"
            },
            {
                "id": "005",
                "name": "else",
                "type": "关键字"
            },
            {
                "id": "006",
                "name": "int",
                "type": "关键字"
            },
            {
                "id": "007",
                "name": "long",
                "type": "关键字"
            },
            {
                "id": "008",
                "name": "float",
                "type": "关键字"
            },
            {
                "id": "009",
                "name": "short",
                "type": "关键字"
            },
            {
                "id": "0010",
                "name": "char",
                "type": "关键字"
            },
            {
                "id": "011",
                "name": "const",
                "type": "关键字"
            },
            {
                "id": "012",
                "name": "double",
                "type": "关键字"
            },
            {
                "id": "013",
                "name": "return",
                "type": "关键字"
            },
            {
                "id": "014",
                "name": "for",
                "type": "关键字"
            },
            {
                "id": "015",
                "name": "break",
                "type": "关键字"
            },
            {
                "id": "015",
                "name": "continue",
                "type": "关键字"
            },
            {
                "id": "016",
                "name": "do",
                "type": "关键字"
            },
            {
                "id": "017",
                "name": "while",
                "type": "关键字"
            }

        ]
        self.state = {
            2: {
                'id': "200",
                'type': '标识符'
            },
            5: {
                'id': "201",
                'type': '整数_十进制'
            },
            8: {
                'id': "202",
                'type': '整数_二进制'
            },
            10: {
                'id': "206",
                'type': '整数_十六进制'
            },
            12: {
                'id': "204",
                'type': '整数_八进制'
            },
            13: {
                'id': "205",
                'type': '浮点数'
            },
            14: {
                'id': "400",
                'type': 'erro'
            },
            16: {
                'id': "206",
                'type': '科学计数法'
            },
            17: {
                'id': "600",
                'type': '分隔符'
            },
            18: {
                'id': "700",
                'type': '运算符'
            },
            22: {
                'id': "800",
                'type': '关系运算符'
            },
            23: {
                'id': "900",
                'type': '布尔逻辑运算符'
            }
        }
        self.separate = {'{', '}', '<', '>', '(', ')', ',', ';'}
        self.operate = {'*', '%', '+', '-', '/','=','==','||','&&'}
        self.re_operate = {'<', '>', '!'}
        self.tokenObj = []
        self.flag = False
        self.memerState = 0

    def addToken(self, state, word):
        id = self.state.get(state).get("id")
        tp = self.state.get(state).get("type")
        if self.state.get(state).get("type") == "标识符":
            obj = self.findKey(word)
            if obj:
                id = obj.get("id")
                tp = obj.get("type")
        token = Token(word, tp, id, self.lineno)
        self.tokenObj.append(token)
        # self.result.append(
        #     "line " + str(self.lineno) + " : " + tp + " : " + word + " : ( " + id + " , " + str(
        #         word) + " )")
        self.result.append("line %-2d : %3s : '%2s' : ( %-2s , '%-2s' ) " % (self.lineno, tp, word, id, word))

    def get_token(self, line):
        pointer = 0
        if not self.flag:
            state = 0
        else:
            state = self.memerState
        token = ''
        while (pointer < len(line)):
            ch = line[pointer]
            if state == 0:

                if ch == '_' or self.isAlpha(ch):
                    state = 1
                    token += ch
                # elif ch == '+' or ch == '-':
                #     state = 3
                #     token += ch
                #     print(3)
                elif self.isDigit(ch) and ch != '0':
                    state = 4
                    token += ch
                elif ch == '0':
                    state = 6
                    token += ch
                elif ch in self.operate:
                    state = 18
                    token += ch
                elif ch in self.re_operate or ch == '=':
                    state = 22
                    token += ch
                elif ch in self.separate:
                    state = 17
                    token += ch

                elif ch == '/':
                    state = 19
                    token += ch
                elif ch == '!' or ch == '&' or ch == '|':
                    state = 23
                    token += ch

            elif state == 1:
                if self.isDigit(ch) or self.isAlpha(ch) or ch == '_':
                    state = 1
                    token += ch
                else:
                    state = 2
                    pointer -= 1
            elif state == 2:

                self.addToken(state, token)
                pointer -= 1
                token = ''
                state = 0
            elif state == 3:
                if self.isDigit(ch) and ch != '0':
                    state = 4
                    token += ch
                # elif ch == '0':
                #     state = 6
                #     token += ch
                elif self.isDigit(ch):
                    state = 5
                    token += ch
                elif ch == '+' or ch == '-' or ch == '=':
                    state = 18
                    pointer -= 1
                elif not self.isDigit(ch):
                    state = 18
                    pointer -= 1
                else:
                    state = 14
            elif state == 4:
                if self.isDigit(ch):
                    state = state
                    token += ch
                elif ch == '.':
                    state = 13
                    token += ch
                elif ch == 'e' or ch == 'E':
                    state = 15
                    token += ch
                else:
                    state = 5
                    pointer -= 1

            elif state == 5:
                self.addToken(state, token)
                pointer -= 1
                token = ''
                state = 0
            elif state == 6:
                # print(6)
                if ch == 'b' or ch == 'B':
                    state = 7
                    token += ch
                elif ch == 'x' or ch == 'X':
                    state = 9
                    token += ch
                    # print(token + "********")
                elif self.isDigit(ch) and ch < '8':
                    state = 11
                    token += ch
                elif ch == '.':
                    state = 13
                    token += ch
                elif self.isDigit(ch) or self.isAlpha(ch):
                    state = 14
                    token += ch
                else:
                    state = 5
                    pointer -= 1
            elif state == 7:
                if ch == '0' or ch == '1':
                    state = state
                    token += ch
                elif ch > '1' or self.isAlpha(ch):
                    state = 14
                    token += ch
                elif not self.isDigit(ch) and not self.isAlpha(ch):
                    state = 8
            elif state == 8:
                self.addToken(state, token)
                pointer -= 1
                token = ''
                state = 0
            elif state == 9:
                if self.isDigit(ch) or 'a' <= ch <= 'f' or 'A' <= ch <= 'F':
                    state = state
                    token += ch
                elif self.isDigit(ch) or self.isAlpha(ch):
                    state = 14
                    token += ch
                elif not self.isAlpha(ch) and not self.isDigit(ch):
                    state = 10
            elif state == 10:
                self.addToken(state, token)
                pointer -= 1
                token = ''
                state = 0
            elif state == 11:
                if self.isDigit(ch) and ch < '8':
                    state = state
                    token += ch
                elif ch > '7' or self.isAlpha(ch):
                    state = 14
                    token += ch
                elif ch == '.':
                    token += ch
                    state = 13
                elif not self.isAlpha(ch) and not self.isDigit(ch):
                    state = 12
            elif state == 12:
                self.addToken(state, token)
                pointer -= 1
                token = ''
                state = 0
            elif state == 13:
                if self.isDigit(ch):
                    state = 13
                    token += ch
                elif ch == 'e' or ch == 'E':
                    state = 15
                    token += ch
                else:
                    self.addToken(state, token)
                    pointer -= 1
                    token = ''
                    state = 0
            elif state == 14:
                if self.isDigit(ch) or self.isAlpha(ch):
                    state = state
                    token += ch
                else:
                    self.addToken(state, token)
                    pointer -= 1
                    token = ''
                    state = 0
            elif state == 15:
                if (self.isDigit(ch) and ch != 0) or ch == '+' or ch == '-':
                    state = 16
                    token += ch
                else:
                    state = 14
                    token += ch

            elif state == 16:
                if self.isDigit(ch) and ch != '0':
                    state = state
                    token += ch
                else:
                    self.addToken(state, token)
                    pointer -= 1
                    token = ''
                    state = 0
            elif state == 17:
                self.addToken(state, token)
                pointer -= 1
                token = ''
                state = 0
            elif state == 18:
                if ch == '=' or (token.endswith('+') and ch == '+') or (token.endswith('-') and ch == '-'):
                    token += ch
                    self.addToken(state, token)
                    token = ''
                    state = 0

                # elif (token.endswith('+') and ch == '-') or (token.endswith('-') and ch == '+'):
                #     token += ch
                #     state = 14
                else:

                    self.addToken(state, token)
                    pointer -= 1
                    # print(line[pointer])
                    token = ''
                    state = 0

            elif state == 19:
                if ch == '/' or ch == '*':
                    if ch == '*':
                        self.flag = True  # 直到出现 */
                    state = 20
                elif ch == '=':
                    state = 18
                    pointer -= 1
            elif state == 20:
                if self.flag:
                    self.memerState = state
                if ch != '*':
                    state = state
                else:
                    state = 21
            elif state == 21:
                if ch == '/':
                    state = 0
                    self.memerState = 0
                    self.flag = False
                else:
                    state = 20
            elif state == 22:
                if ch == '=':
                    token += ch
                    self.addToken(state, token)
                    token = ''
                    state = 0
                elif line[pointer - 1] in self.re_operate:
                    pointer -= 1
                    self.addToken(state, token)
                    token = ''
                    state = 0
            elif state == 23:
                if (token.endswith('&') and ch == '&') or (token.endswith('|') and ch == '|'):
                    token += ch

                else:
                    pointer -= 1
                self.addToken(state, token)
                token = ''
                state = 0
            pointer += 1

    def erro(self, token):
        print("erro")

    def readfile(self, filepath):
        with open(filepath, 'r', encoding="utf-8") as file:
            return [line.strip() for line in file]

    def findKey(self, name):
        for obj in self.key:
            if name == obj.get("name"):
                return obj

    def isDigit(self, ch):
        if '0' <= ch <= '9':
            return True;

    def isAlpha(self, ch):
        if ('a' <= ch <= 'z') or ('A' <= ch <= 'Z'):
            return True;


if __name__ == '__main__':

    token = analysis()
    lines = token.readfile(r'D:\data.txt')
    for line in lines:
        line += ' 0'
        token.get_token(line)
        token.lineno += 1
    for line in token.result:
        print(line)
    # for line in token.tokenObj:
    #     print(line)
