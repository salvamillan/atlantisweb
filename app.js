// Atlantis — demo bookstore (GitHub Pages)
// Endpoints (ajusta si tu ruta real difiere)
const API_BASE = "https://tpipaxfpf1.execute-api.eu-north-1.amazonaws.com";
const ENDPOINT_GET_CLIENT = `${API_BASE}/getClientDetails`; // GET ?id=
const ENDPOINT_GET_BOOKS = `${API_BASE}/getBooks`;          // GET

// UI refs
const loginCard = document.getElementById("loginCard");
const storeCard = document.getElementById("storeCard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const endpointLabel = document.getElementById("endpointLabel");

const userStatus = document.getElementById("userStatus");
const userPill = document.getElementById("userPill");
const logoutBtn = document.getElementById("logoutBtn");

const booksGrid = document.getElementById("booksGrid");
const booksError = document.getElementById("booksError");
const booksCount = document.getElementById("booksCount");
const refreshBtn = document.getElementById("refreshBtn");

const searchInput = document.getElementById("searchInput");
const genreSelect = document.getElementById("genreSelect");
const inStockOnly = document.getElementById("inStockOnly");

const statBooks = document.getElementById("statBooks");
const statInStock = document.getElementById("statInStock");
const statGenres = document.getElementById("statGenres");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartCloseBtn = document.getElementById("cartCloseBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartSubtitle = document.getElementById("cartSubtitle");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCartBtn");

endpointLabel.textContent = `${ENDPOINT_GET_CLIENT}?id=1111`;

const SESSION_KEY = "atlantis_session_v1";
const CART_KEY = "atlantis_cart_v1";

function setSession(session){ localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function getSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function getCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function setCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function showError(el, msg){ el.textContent = msg; el.hidden = false; }
function hideError(el){ el.textContent = ""; el.hidden = true; }

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatEUR(value){
  const n = Number(value ?? 0);
  return `${n.toFixed(0)} €`;
}

/* -------------------- AUTH -------------------- */
async function login(customerId, password){
  const url = `${ENDPOINT_GET_CLIENT}?id=${encodeURIComponent(customerId)}`;
  const resp = await fetch(url, { method: "GET" });
  const data = await resp.json().catch(() => ({}));

  if(!resp.ok){
    throw new Error(data?.message || `Error HTTP ${resp.status}`);
  }

  const customer = data?.customer;
  if(!customer) throw new Error("Respuesta inválida: falta customer");

  // Demo: compara password en frontend (ideal: token)
  if(String(customer.password) !== String(password)){
    throw new Error("Usuario o contraseña incorrectos");
  }

  const { password: _pw, ...safeCustomer } = customer;
  setSession({ customer: safeCustomer, loggedInAt: Date.now() });
  return safeCustomer;
}

function setAuthedUI(customer){
  loginCard.hidden = true;
  storeCard.hidden = false;

  userStatus.textContent = `${customer.Nombre} ${customer.Apellido} • ${customer.VIP ? "VIP" : "Cliente"}`;
  userPill.classList.add("authed");
  logoutBtn.hidden = false;
}

function setLoggedOutUI(){
  loginCard.hidden = false;
  storeCard.hidden = true;

  userStatus.textContent = "No autenticado";
  userPill.classList.remove("authed");
  logoutBtn.hidden = true;
}

/* -------------------- BOOKS -------------------- */
let lastBooksPayload = null;

async function fetchBooks(){
  const resp = await fetch(ENDPOINT_GET_BOOKS, { method: "GET" });
  const data = await resp.json().catch(() => ({}));
  if(!resp.ok) throw new Error(data?.message || `Error HTTP ${resp.status}`);
  if(!Array.isArray(data?.books)) throw new Error("Respuesta inválida: falta books[]");
  return data;
}

function renderGenres(books){
  const genres = Array.from(new Set(books.map(b => b.genero).filter(Boolean))).sort();
  genreSelect.innerHTML = `<option value="">Todos los géneros</option>`
    + genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
}

function computeStats(books){
  const total = books.length;
  const inStock = books.filter(b => Number(b.stock || 0) > 0).length;
  const genres = new Set(books.map(b => b.genero).filter(Boolean)).size;
  statBooks.textContent = total;
  statInStock.textContent = inStock;
  statGenres.textContent = genres;
}

function applyFilters(books){
  const q = (searchInput.value || "").trim().toLowerCase();
  const genre = genreSelect.value || "";
  const stockOnly = inStockOnly.checked;

  return books.filter(b => {
    const matchesQ =
      !q ||
      String(b.titulo || "").toLowerCase().includes(q) ||
      String(b.autor || "").toLowerCase().includes(q);

    const matchesGenre = !genre || String(b.genero) === genre;
    const matchesStock = !stockOnly || Number(b.stock || 0) > 0;

    return matchesQ && matchesGenre && matchesStock;
  });
}

function coverClassFromGenre(genre){
  const g = String(genre || "").toLowerCase();
  if(g.includes("suspense")) return "g-suspense";
  if(g.includes("romance")) return "g-romance";
  if(g.includes("fant")) return "g-fantasy";
  if(g.includes("hist")) return "g-history";
  return "g-default";
}

function renderBooks(books, total){
  booksGrid.innerHTML = "";
  booksCount.textContent = `Mostrando ${books.length} de ${total}`;

  if(books.length === 0){
    booksGrid.innerHTML = `<div class="muted">No hay resultados con esos filtros.</div>`;
    return;
  }

  for(const b of books){
    const stock = Number(b.stock ?? 0);
    const price = Number(b.precio ?? 0);

    const el = document.createElement("article");
    el.className = "bookCard";

    el.innerHTML = `
      <div class="cover"></div>
      <div class="cardBody">
        <div class="badgesRow">
          <span class="chip">${escapeHtml(b.genero ?? "sin género")}</span>
          <span class="chip">${escapeHtml(b.año ?? "s/año")}</span>
          <span class="chip">${stock > 0 ? "En stock" : "Sin stock"}</span>
        </div>
        <div class="titleRow">${escapeHtml(b.titulo ?? "Sin título")}</div>
        <div class="meta">${escapeHtml(b.autor ?? "Autor desconocido")}</div>

        <div class="bottomRow">
          <div>
            <div class="price">${formatEUR(price)}</div>
            <div class="stock">Stock: ${stock}</div>
          </div>
          <button class="buyBtn" ${stock > 0 ? "" : "disabled"} data-bookid="${escapeHtml(b.id)}">
            Comprar
          </button>
        </div>
      </div>
    `;

    booksGrid.appendChild(el);
  }

  // Wire buy buttons
  booksGrid.querySelectorAll(".buyBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-bookid");
      const book = lastBooksPayload?.books?.find(x => String(x.id) === String(id));
      if(book) addToCart(book, 1);
      openCart();
    });
  });
}

async function loadBooksAndRender(){
  hideError(booksError);
  refreshBtn.disabled = true;

  try{
    const payload = await fetchBooks();
    lastBooksPayload = payload;

    renderGenres(payload.books);
    computeStats(payload.books);

    const filtered = applyFilters(payload.books);
    renderBooks(filtered, payload.total ?? payload.books.length);

  }catch(e){
    showError(booksError, e.message || "Error cargando libros");
    booksGrid.innerHTML = "";
    booksCount.textContent = "";
  }finally{
    refreshBtn.disabled = false;
  }
}

/* -------------------- CART -------------------- */
function cartItemKey(book){
  return String(book.id);
}

function addToCart(book, qty){
  const cart = getCart();
  const key = cartItemKey(book);
  const existing = cart.find(i => i.key === key);
  const stock = Number(book.stock ?? 0);
  if(existing){
    existing.qty = Math.min(existing.qty + qty, stock || existing.qty + qty);
  }else{
    cart.push({
      key,
      id: String(book.id),
      titulo: String(book.titulo ?? ""),
      autor: String(book.autor ?? ""),
      precio: Number(book.precio ?? 0),
      genero: String(book.genero ?? ""),
      qty: Math.min(qty, stock || qty)
    });
  }
  setCart(cart);
  updateCartUI();
}

function removeFromCart(key){
  const cart = getCart().filter(i => i.key !== key);
  setCart(cart);
  updateCartUI();
}

function changeQty(key, delta){
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if(!item) return;

  // enforce stock if we can find book
  const book = lastBooksPayload?.books?.find(x => String(x.id) === String(item.id));
  const stock = Number(book?.stock ?? item.qty + delta);

  item.qty = item.qty + delta;
  if(item.qty <= 0){
    removeFromCart(key);
    return;
  }
  item.qty = Math.min(item.qty, stock || item.qty);

  setCart(cart);
  updateCartUI();
}

function calcCart(){
  const cart = getCart();
  const count = cart.reduce((s,i) => s + (Number(i.qty)||0), 0);
  const total = cart.reduce((s,i) => s + (Number(i.qty)||0) * (Number(i.precio)||0), 0);
  return { cart, count, total };
}

function updateCartUI(){
  const { cart, count, total } = calcCart();
  cartCount.textContent = String(count);
  cartSubtitle.textContent = `${count} artículo${count === 1 ? "" : "s"}`;
  cartTotalEl.textContent = formatEUR(total);

  cartItemsEl.innerHTML = "";
  if(cart.length === 0){
    cartItemsEl.innerHTML = `<div class="muted">Tu carrito está vacío.</div>`;
    return;
  }

  for(const item of cart){
    const row = document.createElement("div");
    row.className = "cartItem";
    row.innerHTML = `
      <div>
        <div class="name">${escapeHtml(item.titulo)}</div>
        <div class="sub">${escapeHtml(item.autor)} • ${escapeHtml(item.genero)} • ${formatEUR(item.precio)}</div>
        <button class="btn btn-ghost tinyBtn" data-remove="${escapeHtml(item.key)}" style="margin-top:10px; padding:8px 10px; border-radius:12px;">Eliminar</button>
      </div>
      <div class="qtyRow">
        <button class="qtyBtn" aria-label="Restar" data-dec="${escapeHtml(item.key)}">−</button>
        <strong>${item.qty}</strong>
        <button class="qtyBtn" aria-label="Sumar" data-inc="${escapeHtml(item.key)}">+</button>
      </div>
    `;
    cartItemsEl.appendChild(row);
  }

  cartItemsEl.querySelectorAll("[data-remove]").forEach(b => {
    b.addEventListener("click", () => removeFromCart(b.getAttribute("data-remove")));
  });
  cartItemsEl.querySelectorAll("[data-dec]").forEach(b => {
    b.addEventListener("click", () => changeQty(b.getAttribute("data-dec"), -1));
  });
  cartItemsEl.querySelectorAll("[data-inc]").forEach(b => {
    b.addEventListener("click", () => changeQty(b.getAttribute("data-inc"), +1));
  });
}

function openCart(){
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden","false");
}
function closeCart(){
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden","true");
}

cartBtn.addEventListener("click", openCart);
cartOverlay.addEventListener("click", closeCart);
cartCloseBtn.addEventListener("click", closeCart);

checkoutBtn.addEventListener("click", () => {
  const { cart, count, total } = calcCart();
  if(count === 0){
    alert("Tu carrito está vacío.");
    return;
  }
  alert(`Compra simulada ✅\n\nArtículos: ${count}\nTotal: ${formatEUR(total)}\n\nGracias por comprar en Atlantis.`);
  setCart([]);
  updateCartUI();
  closeCart();
});

clearCartBtn.addEventListener("click", () => {
  setCart([]);
  updateCartUI();
});

/* -------------------- EVENTS -------------------- */
loginForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideError(loginError);

  const customerId = document.getElementById("customerId").value.trim();
  const password = document.getElementById("password").value;

  try{
    const customer = await login(customerId, password);
    setAuthedUI(customer);
    await loadBooksAndRender();
  }catch(e){
    showError(loginError, e.message || "Error de autenticación");
  }
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  setLoggedOutUI();
});

refreshBtn.addEventListener("click", loadBooksAndRender);
searchInput.addEventListener("input", () => {
  if(lastBooksPayload) renderBooks(applyFilters(lastBooksPayload.books), lastBooksPayload.total ?? lastBooksPayload.books.length);
});
genreSelect.addEventListener("change", () => {
  if(lastBooksPayload) renderBooks(applyFilters(lastBooksPayload.books), lastBooksPayload.total ?? lastBooksPayload.books.length);
});
inStockOnly.addEventListener("change", () => {
  if(lastBooksPayload) renderBooks(applyFilters(lastBooksPayload.books), lastBooksPayload.total ?? lastBooksPayload.books.length);
});

/* -------------------- INIT -------------------- */
(function init(){
  updateCartUI();

  const session = getSession();
  if(session?.customer){
    setAuthedUI(session.customer);
    loadBooksAndRender();
  }else{
    setLoggedOutUI();
  }
})();
