/* eslint-env jest */

import term from './term'

describe('A "term" query builder', () => {
  it('supports strings', () => {
    expect(term('cat'))
      .toEqual({
        type: 'term',
        text: 'cat'
      })
  })
})
