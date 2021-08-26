interface OrExpression {
  type: 'or';
  children: Expression[];
}

interface AndExpression {
  type: 'and';
  children: Expression[];
}

interface ExactExpression {
  type: 'exact';
  text: string;
}

interface WordExpression {
  type: 'word';
  text: string;
}

export type Expression = OrExpression | AndExpression | ExactExpression | WordExpression

export const Expression = {
  check (expression: Expression | null): expression is Expression {
    return !!expression
  },
  terms (expression: Expression, processTerm?: (term: string) => string | false | null | undefined): string[] {
    switch (expression.type) {
      case 'or':
      case 'and':
        return expression.children.reduce(
          (terms, child) => terms.concat(Expression.terms(child)), [] as string[])
      case 'word':
      case 'exact':
      {
        const term = processTerm
          ? processTerm(expression.text)
          : expression.text

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
