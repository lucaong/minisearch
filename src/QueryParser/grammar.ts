export const implicitOr = `
value ::= Or
Or ::= And (OR? And)*
And ::= term (AND term)*
term ::= exact | word | nested
word ::= SPACE? ([#x21] | [#x23-#x27] | [#x30-#x5B] | [#x5D-#xFFFF])+ SPACE?
exact ::= SPACE? QUOTE (([#x20-#x21] | [#x23-#x5B] | [#x5D-#xFFFF]) | #x5C (#x22 | #x5C | #x2F | #x62 | #x66 | #x6E | #x72 | #x74))* QUOTE SPACE?
nested ::= SPACE? LPAREN Or RPAREN SPACE?

OR ::= 'OR'
AND ::= 'AND'
SPACE ::= [#x20#x09#x0A#x0D]+
QUOTE ::= '"'
LPAREN ::= '('
RPAREN ::= ')'
`

export const implicitAnd = `
value ::= And
And ::= Or (AND? Or)*
Or ::= term (OR term)*
term ::= exact | word | nested
word ::= SPACE? ([#x21] | [#x23-#x27] | [#x30-#x5B] | [#x5D-#xFFFF])+ SPACE?
exact ::= SPACE? QUOTE (([#x20-#x21] | [#x23-#x5B] | [#x5D-#xFFFF]) | #x5C (#x22 | #x5C | #x2F | #x62 | #x66 | #x6E | #x72 | #x74))* QUOTE SPACE?
nested ::= SPACE? LPAREN Or RPAREN SPACE?

OR ::= 'OR'
AND ::= 'AND'
SPACE ::= [#x20#x09#x0A#x0D]+
QUOTE ::= '"'
LPAREN ::= '('
RPAREN ::= ')'
`
