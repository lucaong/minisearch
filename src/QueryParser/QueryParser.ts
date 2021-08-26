import { Grammars, IToken } from 'ebnf'
import * as grammar from './grammar'
import { Expression, ParseOptions } from './types'

const andParser = new Grammars.W3C.Parser(grammar.implicitAnd)
const orParser = new Grammars.W3C.Parser(grammar.implicitOr)

function convertTokenToExpression (token: IToken, options: ParseOptions): Expression | null {
  let children: Expression[]

  switch (token.type) {
    case 'value':
      return convertTokenToExpression(token.children[0], options)
    case 'And':
      children = token.children
        .map((child) => convertTokenToExpression(child, options))
        .filter(Expression.check)

      return children.length === 1
        ? children[0]
        : {
            type: 'and',
            children
          }
    case 'Or':
      children = token.children
        .map((child) => convertTokenToExpression(child, options))
        .filter(Expression.check)

      return children.length === 1
        ? children[0]
        : {
            type: 'or',
            children
          }
    case 'term':
      children = token.children
        .map((child) => convertTokenToExpression(child, options))
        .filter(Expression.check)

      if (children.length > 1) throw new Error('Invalid term')

      return children.length > 0 ? children[0] : null
    case 'word':
    {
      const trimmed = token.text.trim()
      const text = options.processTerm ? options.processTerm(trimmed) : trimmed

      if (!text) return null

      return {
        type: 'word',
        text
      }
    }
    case 'exact':
    {
      const trimmed = token.text.trim()
      const innerText = trimmed.substr(1, trimmed.length - 2)
      const text = options.processTerm ? options.processTerm(innerText) : innerText

      if (!text) return null

      return {
        type: 'exact',
        text
      }
    }
    case 'nested':
      if (token.children.length !== 1) throw new Error('Invalid nested expression')

      return convertTokenToExpression(token.children[0], options)
  }

  return null
}

export default class QueryParser {
  parse (text: string, options: ParseOptions = ParseOptions.default): Expression | null {
    const parser = options.implicitAnd ? andParser : orParser
    const token = parser.getAST(text)

    return convertTokenToExpression(token, options)
  }
}
