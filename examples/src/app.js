import React from 'react'
import fetch from 'unfetch'
import MiniSearch from '../../src/MiniSearch.js'

class App extends React.Component {
  constructor (props) {
    super(props)
    const miniSearch = new MiniSearch({
      fields: ['artist', 'title'],
      searchOptions: { fuzzy: 0.2, prefix: true }
    })
    this.handleSearchChange = this.handleSearchChange.bind(this)
    this.handleSearchKeyDown = this.handleSearchKeyDown.bind(this)
    this.handleSuggestionClick = this.handleSuggestionClick.bind(this)
    this.handleSearchClear = this.handleSearchClear.bind(this)
    this.handleAppClick = this.handleAppClick.bind(this)
    this.searchInputRef = React.createRef()
    this.state = {
      matchingSongs: [],
      songsById: null,
      searchValue: '',
      ready: false,
      suggestions: [],
      selectedSuggestion: -1,
      miniSearch
    }
  }

  componentDidMount () {
    fetch('billboard_1965-2015.json')
      .then(response => response.json())
      .then((allSongs) => {
        const songsById = allSongs.reduce((byId, song) => ({ ...byId, [song.id]: song }), {})
        const { miniSearch } = this.state
        miniSearch.addAll(allSongs)
        this.setState({ songsById, ready: true })
      })
  }

  handleSearchChange ({ target: { value } }) {
    this.setState({ searchValue: value })
    const matchingSongs = this.searchSongs(value)
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
    } else if (key === 'Enter') {
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

  searchSongs (query) {
    const { miniSearch, songsById } = this.state
    return miniSearch.search(query).map(({ id }) => songsById[id])
  }

  getSuggestions (query) {
    const { miniSearch } = this.state
    return miniSearch.autoSuggest(query)
      .filter(({ suggestion }) => suggestion.length > 3)
      .slice(0, 5)
  }

  render () {
    const { matchingSongs, searchValue, ready, suggestions, selectedSuggestion } = this.state
    return (
      <div className='App' onClick={this.handleAppClick}>
        <article className='main'>
          {
            ready
              ? <Header
                onChange={this.handleSearchChange} onKeyDown={this.handleSearchKeyDown}
                selectedSuggestion={selectedSuggestion} onSuggestionClick={this.handleSuggestionClick}
                onSearchClear={this.handleSearchClear} value={searchValue} suggestions={suggestions}
                searchInputRef={this.searchInputRef} />
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

const SearchBox = ({ onChange, onKeyDown, onSuggestionClick, onSearchClear, value, suggestions, selectedSuggestion, searchInputRef }) => (
  <div className='SearchBox'>
    <div className='Search'>
      <input type='text' value={value} onChange={onChange} onKeyDown={onKeyDown} ref={searchInputRef} />
      <button className='clear' onClick={onSearchClear}>&times;</button>
    </div>
    {
      suggestions && suggestions.length > 0 &&
      <SuggestionList items={suggestions}
        selectedSuggestion={selectedSuggestion}
        onSuggestionClick={onSuggestionClick} />
    }
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

const Explanation = () => (
  <p>
    This is a demo of <a href='https://github.com/lucaong/minisearch'>MiniSearch</a>:
    try searching through a database of more than 5000 top songs in <em>Billboard
    Hot 100</em> from year 1965 to 2015. This example demonstrates search (with
    prefix and fuzzy match) and auto-completion.
  </p>
)

const Loader = ({ text }) => (
  <div className='Loader'>{ text || 'loading...' }</div>
)

const capitalize = (string) => string.replace(/(\b\w)/gi, (char) => char.toUpperCase())

export default App
