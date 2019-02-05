import React from 'react'
import fetch from 'unfetch'
import MiniSearch from '../../src/MiniSearch.js'

class App extends React.PureComponent {
  constructor (props) {
    super(props)
    const miniSearch = new MiniSearch({
      fields: ['artist', 'title'],
      processTerm: (term, _fieldName) => (term.length <= 1 || stopWords.has(term)) ? null : term.toLowerCase()
    })
    ;['handleSearchChange', 'handleSearchKeyDown', 'handleSuggestionClick',
      'handleSearchClear', 'handleAppClick', 'setSearchOption',
      'performSearch'].forEach((method) => {
      this[method] = this[method].bind(this)
    })
    this.searchInputRef = React.createRef()
    this.state = {
      matchingSongs: [],
      songsById: null,
      searchValue: '',
      ready: false,
      suggestions: [],
      selectedSuggestion: -1,
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        fields: ['title', 'artist'],
        combineWith: 'OR'
      },
      miniSearch
    }
  }

  componentDidMount () {
    fetch('billboard_1965-2015.json')
      .then(response => response.json())
      .then((allSongs) => {
        const songsById = allSongs.reduce((byId, song) => {
          byId[song.id] = song
          return byId
        }, {})
        const { miniSearch } = this.state
        miniSearch.addAll(allSongs)
        this.setState({ songsById, ready: true })
      })
  }

  handleSearchChange ({ target: { value } }) {
    this.setState({ searchValue: value })
    const matchingSongs = value.length > 1 ? this.searchSongs(value) : []
    const selectedSuggestion = -1
    const suggestions = this.getSuggestions(value)
    this.setState({ matchingSongs, suggestions, selectedSuggestion })
  }

  handleSearchKeyDown ({ which, key, keyCode }) {
    let { suggestions, selectedSuggestion, searchValue } = this.state
    if (key === 'ArrowDown') {
      selectedSuggestion = Math.min(selectedSuggestion + 1, suggestions.length - 1)
      searchValue = suggestions[selectedSuggestion].suggestion
    } else if (key === 'ArrowUp') {
      selectedSuggestion = Math.max(0, selectedSuggestion - 1)
      searchValue = suggestions[selectedSuggestion].suggestion
    } else if (key === 'Enter' || key === 'Escape') {
      selectedSuggestion = -1
      suggestions = []
      this.searchInputRef.current.blur()
    } else {
      return
    }
    const matchingSongs = this.searchSongs(searchValue)
    this.setState({ suggestions, selectedSuggestion, searchValue, matchingSongs })
  }

  handleSuggestionClick (i) {
    let { suggestions } = this.state
    const searchValue = suggestions[i].suggestion
    const matchingSongs = this.searchSongs(searchValue)
    this.setState({ searchValue, matchingSongs, suggestions: [], selectedSuggestion: -1 })
  }

  handleSearchClear () {
    this.setState({ searchValue: '', matchingSongs: [], suggestions: [], selectedSuggestion: -1 })
  }

  handleAppClick () {
    this.setState({ suggestions: [], selectedSuggestion: -1 })
  }

  setSearchOption (option, valueOrFn) {
    if (typeof valueOrFn === 'function') {
      this.setState(({ searchOptions }) => ({
        searchOptions: { ...searchOptions, [option]: valueOrFn(searchOptions[option]) }
      }), this.performSearch)
    } else {
      this.setState(({ searchOptions }) => ({
        searchOptions: { ...searchOptions, [option]: valueOrFn }
      }), this.performSearch)
    }
  }

  searchSongs (query) {
    const { miniSearch, songsById, searchOptions } = this.state
    return miniSearch.search(query, searchOptions).map(({ id }) => songsById[id])
  }

  performSearch () {
    const { searchValue } = this.state
    const matchingSongs = this.searchSongs(searchValue)
    this.setState({ matchingSongs })
  }

  getSuggestions (query) {
    const { miniSearch, searchOptions } = this.state
    const prefix = (term, i, terms) => i === terms.length - 1
    return miniSearch.autoSuggest(query, { ...searchOptions, prefix, boost: { artist: 5 } })
      .filter(({ suggestion, score }, _, [first]) => score > first.score / 4)
      .slice(0, 5)
  }

  render () {
    const { matchingSongs, searchValue, ready, suggestions, selectedSuggestion, searchOptions } = this.state
    return (
      <div className='App' onClick={this.handleAppClick}>
        <article className='main'>
          {
            ready
              ? <Header
                onChange={this.handleSearchChange} onKeyDown={this.handleSearchKeyDown}
                selectedSuggestion={selectedSuggestion} onSuggestionClick={this.handleSuggestionClick}
                onSearchClear={this.handleSearchClear} value={searchValue} suggestions={suggestions}
                searchInputRef={this.searchInputRef} searchOptions={searchOptions} setSearchOption={this.setSearchOption} />
              : <Loader />
          }
          {
            matchingSongs && matchingSongs.length > 0
              ? <SongList songs={matchingSongs} />
              : (ready && <Explanation />)
          }
        </article>
      </div>
    )
  }
}

const SongList = ({ songs }) => (
  <ul className='SongList'>
    { songs.map(({ id, ...props }) => <Song {...props} key={id} />) }
  </ul>
)

const Song = ({ title, artist, year, rank }) => (
  <li className='Song'>
    <h3>{ capitalize(title) }</h3>
    <dl>
      <dt>Artist:</dt> <dd>{ capitalize(artist) }</dd>
      <dt>Year:</dt> <dd>{ year }</dd>
      <dt>Billboard Position:</dt> <dd>{ rank }</dd>
    </dl>
  </li>
)

const Header = (props) => (
  <header className='Header'>
    <h1>Song Search</h1>
    <SearchBox {...props} />
  </header>
)

const SearchBox = ({ onChange, onKeyDown, onSuggestionClick, onSearchClear, value, suggestions, selectedSuggestion, searchInputRef, searchOptions, setSearchOption }) => (
  <div className='SearchBox'>
    <div className='Search'>
      <input type='text' value={value} onChange={onChange} onKeyDown={onKeyDown} ref={searchInputRef}
        autoComplete='none' autoCorrect='none' autoCapitalize='none' spellCheck='false' />
      <button className='clear' onClick={onSearchClear}>&times;</button>
    </div>
    {
      suggestions && suggestions.length > 0 &&
      <SuggestionList items={suggestions}
        selectedSuggestion={selectedSuggestion}
        onSuggestionClick={onSuggestionClick} />
    }
    <AdvancedOptions options={searchOptions} setOption={setSearchOption} />
  </div>
)

const SuggestionList = ({ items, selectedSuggestion, onSuggestionClick }) => (
  <ul className='SuggestionList'>
    {
      items.map(({ suggestion }, i) =>
        <Suggestion value={suggestion} selected={selectedSuggestion === i}
          onClick={(event) => onSuggestionClick(i, event)} key={i} />)
    }
  </ul>
)

const Suggestion = ({ value, selected, onClick }) => (
  <li className={`Suggestion ${selected ? 'selected' : ''}`} onClick={onClick}>{ value }</li>
)

const AdvancedOptions = ({ options, setOption }) => {
  const setField = (field) => ({ target: { checked } }) => {
    setOption('fields', (fields) => {
      return checked ? [...fields, field] : fields.filter(f => f !== field)
    })
  }
  const setKey = (key, trueValue = true, falseValue = false) => ({ target: { checked } }) => {
    setOption(key, checked ? trueValue : falseValue)
  }
  const { fields, combineWith, fuzzy, prefix } = options
  return (
    <details className='AdvancedOptions'>
      <summary>Advanced options</summary>
      <div className='options'>
        <div>
          <b>Search in fields:</b>
          <label>
            <input type='checkbox' checked={fields.includes('title')} onChange={setField('title')} />
            Title
          </label>
          <label>
            <input type='checkbox' checked={fields.includes('artist')} onChange={setField('artist')} />
            Artist
          </label>
        </div>
        <div>
          <b>Search options:</b>
          <label><input type='checkbox' checked={!!prefix} onChange={setKey('prefix')} /> Prefix</label>
          <label><input type='checkbox' checked={!!fuzzy} onChange={setKey('fuzzy', 0.2)} /> Fuzzy</label>
        </div>
        <div>
          <b>Combine terms with:</b>
          <label>
            <input type='radio' checked={combineWith === 'OR'}
              onChange={setKey('combineWith', 'OR', 'AND')} /> OR
          </label>
          <label><input type='radio' checked={combineWith === 'AND'}
            onChange={setKey('combineWith', 'AND', 'OR')} /> AND</label>
        </div>
      </div>
    </details>
  )
}

const Explanation = () => (
  <p>
    This is a demo of the <a
      href='https://github.com/lucaong/minisearch'>MiniSearch</a> JavaScript
    library: try searching through more than 5000 top songs and artists
    in <em>Billboard Hot 100</em> from year 1965 to 2015. This example
    demonstrates search (with prefix and fuzzy match) and auto-completion.
  </p>
)

const Loader = ({ text }) => (
  <div className='Loader'>{ text || 'loading...' }</div>
)

const capitalize = (string) => string.replace(/(\b\w)/gi, (char) => char.toUpperCase())

const stopWords = new Set(['the', 'a', 'an', 'and'])

export default App
