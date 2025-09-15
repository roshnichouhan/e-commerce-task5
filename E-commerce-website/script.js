// ----- CONFIG -----
const API_URL = "https://fakestoreapi.com/products";
const CART_KEY = "techstore_cart";

// ----- UTILS -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function readCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}
function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  const cart = readCart();
  const countEl = document.getElementById("cart-count");
  if (countEl) countEl.innerText = cart.reduce((s,i)=>s+i.qty,0);
}

// ----- INDEX PAGE: fetch & render products -----
async function fetchProducts() {
  const res = await fetch(API_URL);
  return await res.json();
}

async function initIndexPage() {
  const productList = document.getElementById("product-list");
  if (!productList) return;
  // fill categories
  const categorySelect = document.getElementById("category-filter");
  const allProducts = await fetchProducts();
  const cats = [...new Set(allProducts.map(p=>p.category))];
  cats.forEach(c=>{
    const op = document.createElement("option");
    op.value = c; op.innerText = c[0].toUpperCase()+c.slice(1);
    categorySelect.appendChild(op);
  });

  // show products (with optional filter)
  function showProducts(list) {
    productList.innerHTML = "";
    list.forEach(p=>{
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        <h3>${p.title.length>50? p.title.slice(0,50)+"...": p.title}</h3>
        <div class="price">$${p.price.toFixed(2)}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <a class="btn btn-secondary" href="product.html?id=${p.id}">View</a>
          <button class="btn btn-primary" data-id="${p.id}">Add</button>
        </div>
      `;
      productList.appendChild(card);
    });
  }

  // initial
  showProducts(allProducts);

  // search
  const search = document.getElementById("search");
  search && search.addEventListener("input", (e)=>{
    const v = e.target.value.toLowerCase();
    showProducts(allProducts.filter(p => p.title.toLowerCase().includes(v)));
  });

  // category & price filters
  categorySelect && categorySelect.addEventListener("change", (e)=>{
    const cat = e.target.value;
    let filtered = allProducts;
    if (cat !== "all") filtered = filtered.filter(p => p.category === cat);
    showProducts(filtered);
  });

  const priceSelect = document.getElementById("price-filter");
  priceSelect && priceSelect.addEventListener("change", (e)=>{
    const v = e.target.value;
    let filtered = allProducts.slice();
    if (v === "low") filtered = filtered.filter(p => p.price < 100);
    if (v === "mid") filtered = filtered.filter(p => p.price >=100 && p.price <= 500);
    if (v === "high") filtered = filtered.filter(p => p.price > 500);
    showProducts(filtered);
  });

  // add to cart (event delegation)
  productList.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-id]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const product = allProducts.find(p=>p.id===id);
    addToCart(product);
  });
}

// ----- ADD TO CART (stores items with qty) -----
function addToCart(product) {
  if (!product) return;
  const cart = readCart();
  const idx = cart.findIndex(i=>i.id === product.id);
  if (idx > -1) {
    cart[idx].qty += 1;
  } else {
    cart.push({ id: product.id, title: product.title, price: product.price, img: product.image, qty: 1 });
  }
  writeCart(cart);
  alert(product.title.split(" ").slice(0,4).join(" ") + " added to cart");
}

// ----- CART PAGE: render & actions -----
function initCartPage() {
  const cartItemsEl = document.getElementById("cart-items");
  if (!cartItemsEl) return;
  function render() {
    const cart = readCart();
    cartItemsEl.innerHTML = "";
    if (cart.length === 0) {
      cartItemsEl.innerHTML = "<p>Your cart is empty.</p>";
      document.getElementById("total-price").innerText = "Total: $0.00";
      return;
    }
    cart.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML = `
        <img src="${item.img}" alt="${item.title}">
        <div style="flex:1">
          <h4>${item.title}</h4>
          <div class="price">$${item.price.toFixed(2)}</div>
        </div>
        <div class="qty">
          <button data-act="dec" data-idx="${idx}">-</button>
          <div>${item.qty}</div>
          <button data-act="inc" data-idx="${idx}">+</button>
        </div>
        <div>
          <button data-act="remove" data-idx="${idx}">Remove</button>
        </div>
      `;
      cartItemsEl.appendChild(row);
    });
    const total = cart.reduce((s,i)=>s + i.price * i.qty, 0);
    document.getElementById("total-price").innerText = `Total: $${total.toFixed(2)}`;
  }
  render();

  cartItemsEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const idx = Number(btn.dataset.idx);
    const cart = readCart();
    if (act === "inc") cart[idx].qty++;
    if (act === "dec") { cart[idx].qty = Math.max(1, cart[idx].qty - 1); }
    if (act === "remove") cart.splice(idx,1);
    writeCart(cart);
    render();
  });

  // checkout dummy
  const checkout = document.getElementById("checkout-btn");
  checkout && checkout.addEventListener("click", () => {
    alert("This is a dummy checkout. Integrate payment gateway to complete.");
  });
}

// ----- PRODUCT DETAIL PAGE -----
async function initProductPage() {
  const detailEl = document.getElementById("product-detail");
  if (!detailEl) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    detailEl.innerHTML = "<p>Product ID missing.</p>";
    return;
  }
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const p = await res.json();
    detailEl.innerHTML = `
      <div class="detail-img"><img src="${p.image}" alt="${p.title}" loading="lazy"></div>
      <div class="detail-info">
        <h2>${p.title}</h2>
        <p class="price">$${p.price.toFixed(2)}</p>
        <p>${p.description}</p>
        <div style="margin-top:12px">
          <button id="buy-now" class="btn btn-primary">Add to Cart</button>
        </div>
      </div>
    `;
    document.getElementById("buy-now").addEventListener("click", () => {
      addToCart({ id: p.id, title: p.title, price: p.price, image: p.image });
    });
  } catch (err) {
    detailEl.innerHTML = "<p>Failed to load product.</p>";
    console.error(err);
  }
}

// ----- INIT: decide which page we're on -----
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  initIndexPage();
  initCartPage();
  initProductPage();
});
