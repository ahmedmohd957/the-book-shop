import '../scss/style.scss';
import { getJSON } from './utils/getJSON';


// helper: grab a DOM element
const $ = el => document.querySelector(el);

let allBooks, 
    chosenCategory = 'all', 
    categories, 
    booksAddedToCart = [];


// helper: fetch a text/html file (and remove vite injections)
const fetchText = async url => (await (await (fetch(url))).text())
  .replace(/<script.+?vite\/client.+?<\/script>/g, '');

// helper: replace a DOM element with new element(s) from html string
function replaceElement(element, html, remove = true) {
  let div = document.createElement('div');
  div.innerHTML = html;
  for (let newElement of [...div.children]) {
    element.after(newElement, element);
  }
  remove && element.remove();
}

// mount components (tags like <component="app"> etc 
// will be replaced with content from the html folder)
async function componentMount() {
  while (true) {
    let c = $('component');
    if (!c) { break; }
    let src = `/html${c.getAttribute('src')}.html`;
    let html = await fetchText(src);
    replaceElement(c, html);
  }
}

// listen to click on all a tags
$('body').addEventListener('click', e => {
  let aElement = e.target.closest('a');
  if (!aElement) { return; }
  let href = aElement.getAttribute('href');
  // do nothing if external link (starts with http)
  if (href.indexOf('http') === 0) { return; }
  // do nothing if just '#'
  if (href === '#') { return; }
  // prevent page reload
  e.preventDefault();
  // 'navigate' / change url
  history.pushState(null, null, href);
  // load the page
  loadPage(href);
});

// when the user navigates back / forward -> load page
window.addEventListener('popstate', () => loadPage());

// load page - soft reload / à la SPA 
// (single page application) of the main content
const pageCache = {};
async function loadPage(src = location.pathname) {
  src = src === '/' ? 'start' : src;
  src = `/html/pages/${src}.html`;
  let html = pageCache[src] || await fetchText(src);
  pageCache[src] = html;
  $('main').innerHTML = html;
  // run componentMount (mount new components if any)
  componentMount();
  // display books

  if (location.pathname === '/' || location.pathname === 'start') {
    getAllBooks().then((books) => {
      displayBooks(books);
      getCategories();
      addFilters();
    });
  }
  
  if (location.pathname === '/shopping-cart') {
    displayShoppingCart();
  }
}

async function loadDetailsPage(bookId) {
  const src = `/html/pages/book.html?id=${bookId}`;
  let html = pageCache[src] || await fetchText(src);
  pageCache[src] = html;
  $('main').innerHTML = html;

  // run componentMount (mount new components if any)
  componentMount();

  const book = getBookById(bookId);
  displayBooksDetails(book);
}

async function getAllBooks() {
  allBooks = await getJSON('../json/books.json');
  return allBooks;
}

function getBooksByCategory(category) {
  const filteredBooks = allBooks.filter(book => book.category === category);
  return filteredBooks;
}

function getBookById(bookId) {
  const book = allBooks.find(book => book.id === bookId);
  return book;
}

function getCategories() {
  let withDuplicates = allBooks.map(book => book.category);
  categories = [...new Set(withDuplicates)];
  categories.sort();
}

function addFilters() {
  document.querySelector('.filters').innerHTML = `
    <label><span>Filter by categories:</span>
      <select class="categoryFilter">
        <option>all</option>
        ${categories.map(category => `<option>${category}</option>`).join('')}
      </select>
    </label>
  `;
  // add an event listener
  document.querySelector('.categoryFilter').addEventListener('change', event => {
    chosenCategory = event.target.value;
    if (chosenCategory === 'all') {
      displayBooks(allBooks);
    } else {
      const filteredBooks = getBooksByCategory(chosenCategory);
      displayBooks(filteredBooks);
    }
  });
}

function navigateToBookDetails(bookId) {
  const href = `book?id=${bookId}`;
  history.pushState(null, null, href);
  loadDetailsPage(bookId);
}

function updateShoppingCartBadge() {
  const totalQuantity = booksAddedToCart.reduce((total, book) => total + book.quantity, 0);
  $('.badge').innerHTML = `${totalQuantity}`;
}

function handleAddToCartBtn(book) {
  const bookIndex = booksAddedToCart.findIndex((cartBook) => cartBook.id === book.id);

  if (bookIndex > -1) {
    booksAddedToCart[bookIndex].quantity += 1;
    booksAddedToCart[bookIndex].total += book.price;
  } else {
    booksAddedToCart.push({ id: book.id, quantity: 1, total: book.price, book: book });
  }

  // Update shopping cart badge number
  updateShoppingCartBadge();
}

function handleRemoveFromCartBtn(bookId) {
  const bookIndex = booksAddedToCart.findIndex((cartBook) => cartBook.id === bookId);

  if (bookIndex > -1) {
    if (booksAddedToCart[bookIndex].quantity > 1) {
      booksAddedToCart[bookIndex].quantity -= 1;
      booksAddedToCart[bookIndex].total -= booksAddedToCart[bookIndex].book.price;
    } else {
      booksAddedToCart.splice(bookIndex, 1);
    }
  }

  displayShoppingCart();
  updateShoppingCartBadge();
}

function displayBooks(books) {
  const bookList = $('#book-list');
  bookList.innerHTML = '';
  for (let book of books) {
    const card = document.createElement('div');
    card.className = 'col d-flex align-items-stretch';
    card.innerHTML = `
      <div class="card w-100">
        <img class="card-img-top book-card-img" src="${book.imageUrl}" alt="${book.title}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${book.title}</h5>
          <p class="card-text">${book.author}</p>
        </div>
        <div class="card-body d-flex flex-column">
          <p class="card-text"><b>${book.price} SEK</b></p>
          <a class="btn btn-primary atc-btn mt-auto">Add to Cart</a>
        </div>
      </div>
    `;
    card.addEventListener('click', () => {
      navigateToBookDetails(book.id);
    });
    const addToCartBtn = card.querySelector('.atc-btn');
    addToCartBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleAddToCartBtn(book);
    });
    bookList.appendChild(card);
  }
}

function displayBooksDetails(book) {
  document.getElementById("book-img").src = book.imageUrl;
  document.getElementById("book-title").textContent = book.title;
  document.getElementById("book-author").textContent = book.author;
  document.getElementById("book-category").textContent = book.category;
  document.getElementById("book-description").textContent = book.description;
  document.getElementById("book-price").textContent = `${book.price} SEK`;
  const atcBtn = document.getElementById('add-to-cart-btn');
  atcBtn.addEventListener('click', () => {
    handleAddToCartBtn(book);
  });
}

function displayShoppingCart() {
  const cartList = $('#cart-list');
  cartList.innerHTML = '';
  for (let addedBook of booksAddedToCart) {
    const cartItem = document.createElement('tr');
    cartItem.className = 'cart-book';
    cartItem.innerHTML = `
      <td>${addedBook.book.title}</td>
      <td><button class="btn btn-danger btn-sm remove-item">Remove</button></td>
      <td>${addedBook.quantity}</td>
      <td>${addedBook.book.price} SEK</td>
      <td>${addedBook.total} SEK</td>
    ` ;
    const removeBtn = cartItem.querySelector('.remove-item');
    removeBtn.addEventListener('click', () => {
      handleRemoveFromCartBtn(addedBook.id);
    });
    cartList.appendChild(cartItem);
  }
  const total = booksAddedToCart.reduce((acc, book) => acc + book.total, 0);
  const cartTotal = document.getElementById("cart-total");
  cartTotal.innerHTML = `<b>${total} SEK</b>`;
}


// initially, on hard load/reload:
// mount components and load the page
componentMount().then(x => loadPage());