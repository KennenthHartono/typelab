const COMMON_WORDS = [
  "time","year","people","way","day","man","thing","woman","life","child","world","school",
  "state","family","student","group","country","problem","hand","part","place","case","week",
  "company","system","program","question","work","government","number","night","point","home",
  "water","room","mother","area","money","story","fact","month","lot","right","study","book",
  "eye","job","word","business","issue","side","kind","head","house","service","friend","father",
  "power","hour","game","line","end","member","law","car","city","community","name","president",
  "team","minute","idea","body","information","back","parent","face","others","level","office",
  "door","health","person","art","war","history","party","result","change","morning","reason",
  "research","girl","guy","moment","air","teacher","force","education","foot","boy","age","policy",
  "process","music","market","sense","nation","plan","college","interest","death","experience",
  "effect","use","class","control","care","field","development","role","effort","rate","heart",
  "drug","show","leader","light","voice","wife","whole","police","mind","price","report","decision",
  "son","hope","view","relationship","town","road","arm","value","difference","paper","land"
];

const QUOTES = [
  "The only way to do great work is to love what you do. If you have not found it yet, keep looking, and do not settle.",
  "It is during our darkest moments that we must focus to see the light. Success is not final, failure is not fatal.",
  "In three words I can sum up everything I have learned about life: it goes on, no matter what happens around us.",
  "The way to get started is to quit talking and begin doing the work that matters most to you and to others.",
  "Life is what happens when you are busy making other plans, so try to notice the small moments as they pass.",
  "The future belongs to those who believe in the beauty of their dreams and are willing to work quietly toward them.",
  "Whether you think you can or you think you cannot, you are right, because belief shapes the effort you give.",
  "The purpose of our lives is to be happy, and that happiness grows from the small choices we make each day."
];

const CODE_SNIPPETS = {
  javascript: [
`function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
`class Stack {
  #items = [];
  push(value) {
    this.#items.push(value);
  }
  pop() {
    return this.#items.pop();
  }
}`
  ],
  python: [
`def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + [pivot] + quicksort(right)`,
`class Node:
    def __init__(self, value):
        self.value = value
        self.next = None

    def __repr__(self):
        return f"Node({self.value})"`
  ],
  cpp: [
`int binarySearch(std::vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`
  ],
  html: [
`<article class="card">
  <header>
    <h2>Title</h2>
  </header>
  <p>Some descriptive text goes here.</p>
</article>`
  ],
  css: [
`.button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}`
  ],
  json: [
`{
  "name": "typelab",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "serve ."
  }
}`
  ],
  sql: [
`SELECT users.name, COUNT(orders.id) AS total
FROM users
LEFT JOIN orders ON orders.user_id = users.id
GROUP BY users.name
ORDER BY total DESC;`
  ]
};

function randomWords(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]);
  }
  return out;
}

function randomNumbers(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + Math.floor(Math.random() * 4);
    let n = "";
    for (let j = 0; j < len; j++) n += Math.floor(Math.random() * 10);
    out.push(n);
  }
  return out;
}

function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function randomSnippet(language) {
  const pool = CODE_SNIPPETS[language] || CODE_SNIPPETS.javascript;
  return pool[Math.floor(Math.random() * pool.length)];
}

export { COMMON_WORDS, QUOTES, CODE_SNIPPETS, randomWords, randomNumbers, randomQuote, randomSnippet };
