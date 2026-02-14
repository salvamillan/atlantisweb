const API_BASE = "https://tpipaxfpf1.execute-api.eu-north-1.amazonaws.com";
const ENDPOINT_GET_CLIENT = `${API_BASE}/getClientDetails`;
const ENDPOINT_GET_BOOKS = `${API_BASE}/getBooks`;

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginCard = document.getElementById("loginCard");
const storeCard = document.getElementById("storeCard");
const booksGrid = document.getElementById("booksGrid");
const userStatus = document.getElementById("userStatus");
const logoutBtn = document.getElementById("logoutBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const id = document.getElementById("customerId").value;
  const password = document.getElementById("password").value;

  try {
    const resp = await fetch(`${ENDPOINT_GET_CLIENT}?id=${id}`);
    const data = await resp.json();

    if (!resp.ok) throw new Error(data.message);

    if (data.customer.password !== password) {
      throw new Error("Contraseña incorrecta");
    }

    userStatus.textContent = `Hola ${data.customer.Nombre}`;
    logoutBtn.hidden = false;
    loginCard.hidden = true;
    storeCard.hidden = false;

    loadBooks();

  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", () => {
  loginCard.hidden = false;
  storeCard.hidden = true;
  logoutBtn.hidden = true;
  userStatus.textContent = "No autenticado";
});

async function loadBooks() {
  const resp = await fetch(ENDPOINT_GET_BOOKS);
  const data = await resp.json();

  booksGrid.innerHTML = "";

  data.books.forEach(book => {
    const div = document.createElement("div");
    div.className = "book";
    div.innerHTML = `
      <strong>${book.titulo}</strong><br/>
      Autor: ${book.autor}<br/>
      Precio: ${book.precio}€<br/>
      Stock: ${book.stock}
    `;
    booksGrid.appendChild(div);
  });
}
