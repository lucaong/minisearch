class TokenSet {
  constructor (tree = {}, prefix = '') {
    this._tree = tree
    this._prefix = prefix
  }

  add (token) {
    const chars = token.split('')
    const leaf = chars.reduce((tree, char) => {
      tree[char] = tree[char] || {}
      return tree[char]
    }, this._tree)
    leaf._$ = true
  }

  atPrefix (prefix) {
    if (!prefix.startsWith(this._prefix)) { throw new Error('Mismatched prefix') }
    const subtree = prefix.slice(this._prefix.length).split('').reduce((tree, char) => {
      if (tree == null) { return null }
      return tree[char]
    }, this._tree) || {}
    return new TokenSet(subtree, prefix)
  }

  includes (token) {
    const chars = token.split('')
    const leaf = chars.reduce((tree, char) => {
      if (tree === false || tree == null) { return false }
      return tree[char]
    }, this._tree)
    return !!(leaf && leaf._$)
  }

  toArray () {
    let array = []
    for (let token of this) {
      array.push(token)
    }
    return array
  }

  [Symbol.iterator] () {
    return new TokenSetIterator(this)
  }
}

TokenSet.fromArray = function (tokens) {
  const set = new TokenSet()
  if (tokens) {
    tokens.forEach(token => set.add(token))
  }
  return set
}

TokenSet.of = function () {
  return TokenSet.fromArray(Array.prototype.slice.call(arguments, 0))
}

class TokenSetIterator {
  constructor (set) {
    const tree = set._tree
    this.set = set
    this.path = [{ node: tree, keys: Object.keys(tree) }]
  }

  next () {
    const value = this.dive()
    this.backtrack()
    return value
  }

  dive () {
    if (this.path.length === 0) { return { done: true } }
    const [{node, keys}] = this.path
    if (keys.length === 0) { return { done: true } }
    if (keys[0] === '_$') { return { done: false, value: this.value() } }
    this.path.unshift({ node: node[keys[0]], keys: Object.keys(node[keys[0]]) })
    return this.dive()
  }

  backtrack () {
    if (this.path.length === 0) { return }
    this.path[0].keys.shift()
    if (this.path[0].keys.length > 0) { return }
    this.path.shift()
    this.backtrack()
  }

  value () {
    return this.set._prefix + this.path
      .map(({keys: [key]}) => key)
      .filter(key => key !== '_$')
      .reverse().join('')
  }
}

export default TokenSet
export { TokenSetIterator }
