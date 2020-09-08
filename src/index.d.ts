// Type definitions for MiniSearch

declare class MiniSearch<T = any> {
    constructor(options: Options<T>);

    documentCount: number;

    add(document: T): void;

    addAll(documents: T[]): void;

    addAllAsync(documents: T[], options?: { chunkSize?: number }): Promise<undefined>;

    autoSuggest(query: string, options?: SearchOptions<T>): Suggestion[];

    remove(document: T): void;

    removeAll(documents?: T[]): void;

    search(query: string, options?: SearchOptions<T>): SearchResult[];

    toJSON(): object;

    static getDefault(optionName: string): any;

    static loadJSON<T = any>(json: string, options: Options<T>): MiniSearch<T>;
}

export declare interface SearchOptions<T = any> {
  fields?: string[],

  filter?: (result: SearchResult) => boolean,

  boost?: { [fieldName: string]: number },

  prefix?: boolean
    | ((term: string, index: number, terms: string[]) => boolean),

  fuzzy?: boolean | number 
    | ((term: string, index: number, terms: string[]) => boolean | number),

  combineWith?: string,

  extractField?: (document: T, fieldName: string) => string,

  tokenize?: (text: string) => string[],

  processTerm?: (term: string) => string | null | undefined | false
}

export declare interface Options<T = any> {
  fields: string[],

  storeFields?: string[],

  idField?: string,

  extractField?: (document: T, fieldName: string) => string,

  tokenize?: (text: string, fieldName: string) => string[],

  processTerm?: (term: string, fieldName: string) => string | null | undefined | false,

  searchOptions?: SearchOptions<T>
}

export declare interface Suggestion {
  suggestion: string,

  score: number
}

export declare interface MatchInfo {
  [term: string]: string[]
}

export declare interface SearchResult {
  id: any,

  score: number,

  match: MatchInfo,

  [key: string]: any
}

export default MiniSearch
