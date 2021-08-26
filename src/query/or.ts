import { AndExpression, Expression, OrExpression } from '../Expression'
import term from './term'

export default function or (...expressions: Array<AndExpression | OrExpression | string>): Expression {
  return {
    type: 'or',
    children: expressions.map(expression => Expression.check(expression) ? expression : term(expression))
  }
}
