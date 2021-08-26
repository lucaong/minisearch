import { AndExpression, Expression, OrExpression } from '../Expression'
import term from './term'

export default function and (...expressions: Array<AndExpression | OrExpression | string>): Expression {
  return {
    type: 'and',
    children: expressions.map(expression => Expression.check(expression) ? expression : term(expression))
  }
}
