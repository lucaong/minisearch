/* eslint-env jest */

import and from './and'
import or from './or'
import term from './term'

describe('An "and" query builder', () => {
  it('supports strings', () => {
    expect(and('cat', 'dog'))
      .toEqual({
        type: 'and',
        children: [term('cat'), term('dog')]
      })
  })

  it('supports nested or expressions', () => {
    expect(and('cat', or('dog', 'horse')))
      .toEqual({
        type: 'and',
        children: [term('cat'), or('dog', 'horse')]
      })
  })

  it('supports nested and expressions', () => {
    expect(and('cat', and('dog', 'horse')))
      .toEqual({
        type: 'and',
        children: [term('cat'), and('dog', 'horse')]
      })
  })
})
