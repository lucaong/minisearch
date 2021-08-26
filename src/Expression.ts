export interface OrExpression {
  type: 'or';
  children: Expression[];
}

export interface AndExpression {
  type: 'and';
  children: Expression[];
}

export interface TermExpression {
  type: 'term';
  text: string;
}

export type Expression = OrExpression | AndExpression | TermExpression

export const Expression = {
  check (expression: Expression | string | null): expression is Expression {
    return typeof expression !== 'string' && !!expression
  },
  terms (expression: Expression, processTerm?: (term: string) => string | false | null | undefined): string[] {
    switch (expression.type) {
      case 'or':
      case 'and':
        return expression.children.reduce(
          (terms, child) => terms.concat(Expression.terms(child, processTerm)), [] as string[])
      case 'term':
      {
        const term = processTerm ? processTerm(expression.text) : expression.text

        if (!term) return []

        return [term]
      }
    }
  }
}

export interface ParseOptions {
  implicitAnd: boolean,
  processTerm?: (term: string) => string | false | null | undefined
}

export const ParseOptions = {
  default: {
    implicitAnd: false
  } as ParseOptions
}
