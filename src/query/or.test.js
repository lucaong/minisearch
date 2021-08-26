/* eslint-env jest */

import and from './and'
import or from './or'
import term from './term'

describe('An "or" query builder', () => {
  it('supports strings', () => {
    expect(or('cat', 'dog'))
      .toEqual({
        type: 'or',
        children: [term('cat'), term('dog')]
      })
  })

  it('supports nested or expressions', () => {
    expect(or('cat', or('dog', 'horse')))
      .toEqual({
        type: 'or',
        children: [term('cat'), or('dog', 'horse')]
      })
  })

  it('supports nested and expressions', () => {
    expect(or('cat', and('dog', 'horse')))
      .toEqual({
        type: 'or',
        children: [term('cat'), and('dog', 'horse')]
      })
  })
})
