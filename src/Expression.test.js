/* eslint-env jest */

import { Expression } from './Expression'
import { term, and, or } from './query'

describe('An "and" query builder', () => {
  it('extracts terms from a term expression', () => {
    expect(Expression.terms(term('horse')))
      .toEqual(['horse'])
  })

  it('extracts terms from a complex expression', () => {
    expect(Expression.terms(or(and('cat', 'dog'), 'horse')))
      .toEqual(['cat', 'dog', 'horse'])
  })

  it('applies term processing to terms', () => {
    console.log(Expression.terms(or(and('cat', 'dog'), 'horse'), term => term + '!'))
    expect(Expression.terms(or(and('cat', 'dog'), 'horse'), term => term + '!'))
      .toEqual(['cat!', 'dog!', 'horse!'])
  })
})
