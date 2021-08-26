import { TermExpression } from '../Expression'

export default function term (text: string): TermExpression {
  return {
    type: 'term',
    text
  }
}
