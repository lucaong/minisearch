import { Grammars, IToken } from 'ebnf'
import * as grammar from './grammar'
import { Expression, isExpression, ParseOptions } from './types'

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
        .filter(isExpression)

      return children.length === 1
        ? children[0]
        : {
            type: 'and',
            children
          }
    case 'Or':
      children = token.children
        .map((child) => convertTokenToExpression(child, options))
        .filter(isExpression)

      return children.length === 1
        ? children[0]
        : {
            type: 'or',
            children
          }
    case 'term':
      children = token.children
        .map((child) => convertTokenToExpression(child, options))
        .filter(isExpression)

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
    default:
      console.error(token)
      throw new Error('Failed to parse token')
  }
}

export default class QueryParser {
  parse (text: string, options: ParseOptions = ParseOptions.default): Expression | null {
    try {
      const parser = options.implicitAnd ? andParser : orParser
      const token = parser.getAST(text)

      return convertTokenToExpression(token, options)
    } catch (e) {
      return null
    }
  }
}
