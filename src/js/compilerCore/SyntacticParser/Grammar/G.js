/** 表达式
 * E -> E1 | E2 | E3 | E4
 * 
 * E1 -> I + E1 | I - E1 | I
 * I -> I1 * I | I1 / I | I1 % I | I1
 * I1 -> (E1) | C | V | F
 * C -> typenum | typechar
 * V -> typeid
 * F -> typeid(L) 
 * L -> A | epsilon
 * A -> E | E,A
 * 
 * E2 -> E1 O E1
 * O -> > | < | >= | <= | == | != 
 * 
 * E3 -> I2 || E3 | I2
 * I2 -> I3 && I2 | I3
 * I3 -> E1 | E2 | ! E3
 * 
 * E4 -> typeid = E
 */

/**
 * S -> S1 | S2
 * S1 -> U | F1 | epsilon
 * U -> C1 | V1
 * C1 -> const C2 T
 * C2 -> int | char | float
 * T -> typeid = C; | typeid = C,T
 * V1 -> V2 T1
 * T1 -> V4; | V4,T1
 * V4 -> V | V = E
 * V2 -> int | char | float
 * F1 -> F2 typeid(L1);
 * F2 -> int | char | float | void
 * L1 -> A1 | epsilon
 * A1 -> V2 | V2,A1
 * 
 * S2 -> S3 | S4 | S5
 * S3 -> S6 | S7
 * S6 -> E4;
 * S7 -> F;
 * S4 -> X1 | X2 | X3 | X4 | X5
 * S5 -> { T3 }
 * T3 -> S | S T3
 * X1 -> if(E)S | if(E)S else S
 * X2 -> for(E;E;E)P
 * X3 -> while(E)P
 * X4 -> do P1 while(E);
 * P -> S1 | P2 | P1
 * P1 -> { T4 }
 * T4 -> P | P T4
 * P2 -> P3 | X2 | X3 | X4 | X5 | X6 | X7
 * P3 -> if(E)P | if(E)P else P
 * X5 -> return; | return E;
 * X6 -> break;
 * X7 -> continue;
 */

/**
 * F3 -> F2 tyepid(L2) S5
 * L2 -> A2 | epsilon
 * A2 -> V2 typeid | V2 typeid,A2
 * 
 * M -> S1 main() S5 F4
 * F4 -> F3 F4 | epsilon
 */