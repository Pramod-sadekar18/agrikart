/* ==========================================================================
   AgriKart - Core App Layer
   Backend Connected Version
   ========================================================================== */

const LS_KEYS = {
  user: "agrikart_user",
  cart: "agrikart_cart",
  wishlist: "agrikart_wishlist",
  addresses: "agrikart_addresses",
  orders: "agrikart_orders",
  recentlyViewed: "agrikart_recently_viewed"
};


/* ---------------- Local Storage Helpers ---------------- */

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


/* ---------------- User / Auth ---------------- */

function getUserProfile() {
  const localUser = localStorage.getItem("agrikart_user");

  if (localUser) {
    try {
      return JSON.parse(localUser);
    } catch (error) {
      console.error("Invalid local user data.");
    }
  }

  const sessionUser = sessionStorage.getItem("agrikart_user");

  if (sessionUser) {
    try {
      return JSON.parse(sessionUser);
    } catch (error) {
      console.error("Invalid session user data.");
    }
  }

  return null;
}

function isLoggedIn() {
  return !!getUserProfile();
}

function loginUser(identifier) {

  const existing = getUserProfile();

  const user = existing || {
    name: identifier.split("@")[0] || "Farmer",
    email: identifier,
    mobile: ""
  };

  lsSet(LS_KEYS.user, user);

  return user;
}

function registerUser(data) {

  lsSet(LS_KEYS.user, {
    name: data.name,
    email: data.email,
    mobile: data.mobile
  });

  return getUserProfile();
}

function updateUserProfile(patch) {

  const user = getUserProfile() || {};

  lsSet(LS_KEYS.user, {
    ...user,
    ...patch
  });

  return getUserProfile();
}

function logoutUser() {
  localStorage.removeItem("agrikart_user");
  sessionStorage.removeItem("agrikart_user");
}

function requireLogin(message = "Please login to continue.") {

  if (!isLoggedIn()) {

    sessionStorage.setItem(
      "agrikart_redirect",
      location.pathname.split("/").pop()
    );

    toast(message, "error");

    setTimeout(() => {
      location.href = "login.html";
    }, 700);

    return false;
  }

  return true;
}


/* ---------------- Cart ---------------- */

// Old localStorage cart functions are kept for compatibility
function getCart() {
  return lsGet(LS_KEYS.cart, []);
}

function saveCart(cart) {
  lsSet(LS_KEYS.cart, cart);
  updateHeaderCounts();
}


/* ==========================================================
   ADD TO CART
   Flask + MySQL
   ========================================================== */

async function addToCart(productId, qty = 1) {

  try {

    const response = await fetch(
      "http://127.0.0.1:5000/api/cart",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          user_id: getUserProfile()?.id,
          product_id: productId,
          quantity: qty
        })
      }
    );


    const data = await response.json();


    if (!data.success) {

      toast(
        data.message || "Failed to add product",
        "error"
      );

      return;
    }


    toast("Added to cart");


    // Update cart number from MySQL
    await updateHeaderCounts();


  } catch (error) {

    console.error(
      "Add to Cart Error:",
      error
    );

    toast(
      "Unable to connect to Flask server",
      "error"
    );
  }
}


/* ---------------- Old Cart Compatibility ---------------- */

function removeFromCart(productId) {

  saveCart(
    getCart().filter(
      i => i.productId !== productId
    )
  );

  toast("Removed from cart");
}


function updateCartQuantity(productId, qty) {

  const cart = getCart();

  const item = cart.find(
    i => i.productId === productId
  );

  if (item) {

    item.qty = Math.max(1, qty);

    saveCart(cart);
  }
}


function getCartCount() {

  return getCart().reduce(
    (sum, i) => sum + i.qty,
    0
  );
}


function getCartDetails() {

  return getCart()
    .map(i => ({
      ...i,
      product: getProductById(i.productId)
    }))
    .filter(i => i.product);
}


function getCartTotals() {

  const items = getCartDetails();

  const itemTotal =
    items.reduce(
      (s, i) =>
        s + i.product.price * i.qty,
      0
    );

  const mrpTotal =
    items.reduce(
      (s, i) =>
        s + i.product.originalPrice * i.qty,
      0
    );

  const discount =
    mrpTotal - itemTotal;

  const delivery =
    itemTotal > 999 || itemTotal === 0
      ? 0
      : 49;

  const tax =
    Math.round(itemTotal * 0.05);

  const total =
    itemTotal + delivery + tax;

  return {
    itemTotal,
    mrpTotal,
    discount,
    delivery,
    tax,
    total,
    count:
      items.reduce(
        (s, i) => s + i.qty,
        0
      )
  };
}


function clearCart() {
  saveCart([]);
}


/* ---------------- Wishlist ---------------- */
/* ---------------- Wishlist ---------------- */

const WISHLIST_API =
  "http://127.0.0.1:5000/api/wishlist";

function getCurrentUserId() {
  const user = getUserProfile();

  if (!user || !user.id) {
    return null;
  }

  return Number(user.id);
}

let API_WISHLIST = [];


/* Load Wishlist from Flask + MySQL */
async function loadWishlistFromAPI() {
  try {
    const response = await fetch(
      `${WISHLIST_API}/${getCurrentUserId()}`
    );

    const data = await response.json();

    if (data.success) {
      API_WISHLIST = data.items.map(
        item => Number(item.product_id)
      );
    } else {
      API_WISHLIST = [];
    }

  } catch (error) {
    console.error(
      "Wishlist Load Error:",
      error
    );

    API_WISHLIST = [];
  }

  return API_WISHLIST;
}


/* Check Wishlist */
function isWishlisted(productId) {
  return API_WISHLIST.includes(
    Number(productId)
  );
}


/* Add to Wishlist */
async function addToWishlist(productId) {
  try {
    const response = await fetch(
      WISHLIST_API,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          user_id: getCurrentUserId(),
          product_id: Number(productId)
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(
        data.message ||
        "Failed to add wishlist",
        "error"
      );
      return;
    }

    if (
      !API_WISHLIST.includes(
        Number(productId)
      )
    ) {
      API_WISHLIST.push(
        Number(productId)
      );
    }

    toast("Added to wishlist");

    await updateHeaderCounts();

  } catch (error) {
    console.error(
      "Wishlist Add Error:",
      error
    );

    toast(
      "Unable to connect to Flask server",
      "error"
    );
  }
}


/* Remove from Wishlist */
async function removeFromWishlist(productId) {
  try {
    const response = await fetch(
      `${WISHLIST_API}/${getCurrentUserId()}/${productId}`,
      {
        method: "DELETE"
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(
        data.message ||
        "Failed to remove wishlist",
        "error"
      );
      return;
    }

    API_WISHLIST =
      API_WISHLIST.filter(
        id =>
          id !== Number(productId)
      );

    toast("Removed from wishlist");

    await updateHeaderCounts();

  } catch (error) {
    console.error(
      "Wishlist Remove Error:",
      error
    );

    toast(
      "Unable to connect to Flask server",
      "error"
    );
  }
}


/* Toggle Wishlist */
async function toggleWishlist(productId) {

  if (isWishlisted(productId)) {
    await removeFromWishlist(productId);
  } else {
    await addToWishlist(productId);
  }

}


/* Wishlist Count */
function getWishlistCount() {
  return API_WISHLIST.length;
}





/* ---------------- Recently Viewed ---------------- */

function addRecentlyViewed(productId) {

  let list = lsGet(
    LS_KEYS.recentlyViewed,
    []
  );

  list = [
    productId,
    ...list.filter(
      id => id !== productId
    )
  ].slice(0, 8);

  lsSet(
    LS_KEYS.recentlyViewed,
    list
  );
}

function getRecentlyViewed() {

  return lsGet(
    LS_KEYS.recentlyViewed,
    []
  )
    .map(id => getProductById(id))
    .filter(Boolean);
}


/* ---------------- Addresses ---------------- */

function getAddresses() {

  return lsGet(
    LS_KEYS.addresses,
    []
  );
}

function saveAddresses(list) {

  lsSet(
    LS_KEYS.addresses,
    list
  );
}

function addAddress(addr) {

  const list = getAddresses();

  addr.id = Date.now();

  if (list.length === 0) {
    addr.isDefault = true;
  }

  list.push(addr);

  saveAddresses(list);

  return addr;
}

function updateAddress(id, patch) {

  const list =
    getAddresses().map(
      a =>
        a.id === id
          ? { ...a, ...patch }
          : a
    );

  saveAddresses(list);
}

function deleteAddress(id) {

  saveAddresses(
    getAddresses().filter(
      a => a.id !== id
    )
  );
}

function setDefaultAddress(id) {

  saveAddresses(
    getAddresses().map(
      a => ({
        ...a,
        isDefault: a.id === id
      })
    )
  );
}


/* ---------------- Orders ---------------- */

function getOrders() {

  return lsGet(
    LS_KEYS.orders,
    []
  ).sort(
    (a, b) => b.id - a.id
  );
}

function getOrderDetails(orderId) {

  return getOrders().find(
    o =>
      String(o.id) ===
      String(orderId)
  );
}

const ORDER_STATUSES = [
  "Order Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered"
];

function createOrder({
  items,
  address,
  paymentMethod,
  totals
}) {

  const orders =
    lsGet(
      LS_KEYS.orders,
      []
    );

  const order = {

    id:
      "AGK" +
      Date.now()
        .toString()
        .slice(-8),

    date:
      new Date().toISOString(),

    items,
    address,
    paymentMethod,
    totals,

    status:
      "Order Placed",

    paymentStatus:
      paymentMethod === "cod"
        ? "Pending (COD)"
        : "Paid",

    expectedDelivery:
      new Date(
        Date.now() +
        5 * 86400000
      ).toISOString()
  };


  orders.push(order);

  lsSet(
    LS_KEYS.orders,
    orders
  );

  clearCart();

  return order;
}

function trackOrder(orderId) {

  const order =
    getOrderDetails(orderId);

  if (!order) {
    return null;
  }

  return {
    status: order.status,
    expectedDelivery:
      order.expectedDelivery,
    address: order.address
  };
}


/* ---------------- Toasts ---------------- */

function toast(
  message,
  type = "success"
) {

  let host =
    document.getElementById(
      "toastHost"
    );

  if (!host) {

    host =
      document.createElement(
        "div"
      );

    host.id = "toastHost";

    document.body.appendChild(
      host
    );
  }


  const el =
    document.createElement(
      "div"
    );

  el.className =
    "ak-toast" +
    (type === "error"
      ? " error"
      : "");

  el.innerHTML = `
    <i class="bi ${
      type === "error"
        ? "bi-exclamation-circle"
        : "bi-check-circle"
    }"></i>
    <span>${message}</span>
  `;

  host.appendChild(el);

  setTimeout(
    () => el.remove(),
    2800
  );
}


/* ---------------- Formatting Helpers ---------------- */

function formatPrice(n) {

  return "₹" +
    Number(n).toLocaleString(
      "en-IN"
    );
}

function renderStars(rating) {

  const full =
    Math.floor(rating);

  const half =
    rating - full >= 0.5;

  let html = "";


  for (
    let i = 0;
    i < full;
    i++
  ) {

    html +=
      '<i class="bi bi-star-fill"></i>';
  }


  if (half) {

    html +=
      '<i class="bi bi-star-half"></i>';
  }


  for (
    let i =
      full + (half ? 1 : 0);
    i < 5;
    i++
  ) {

    html +=
      '<i class="bi bi-star"></i>';
  }


  return `
    <span class="stars">
      ${html}
    </span>
  `;
}


/* ---------------- Product Card Renderer ---------------- */

function renderProductCard(product) {

  const wished =
    isWishlisted(product.id);

  const stockClass =
    product.stock === 0
      ? "out"
      : (
          product.stock <= 5
            ? "low"
            : "in"
        );


  return `
  <div class="col">

    <div class="product-card">

      ${
        product.discount
          ? `<span class="badge-discount">
               ${product.discount}% OFF
             </span>`
          : ""
      }


      <button
        class="wishlist-btn ${
          wished ? "active" : ""
        }"
        onclick="
          toggleWishlist(${product.id});
          this.classList.toggle('active')
        "
        aria-label="Toggle wishlist">

        <i class="bi ${
          wished
            ? "bi-heart-fill"
            : "bi-heart"
        }"></i>

      </button>


      <a
        href="product-details.html?id=${product.id}"
        class="pc-img-wrap">

        <img
          src="${product.image}"
          alt="${product.name}">

      </a>


      <div class="pc-body">

        <div class="pc-cat">
          ${product.category.replace("-", " ")}
        </div>


        <a
          href="product-details.html?id=${product.id}"
          class="pc-name text-decoration-none text-dark">

          ${product.name}

        </a>


        <div class="d-flex align-items-center gap-2">

          <span class="rating-pill">

            ${product.rating}

            <i
              class="bi bi-star-fill"
              style="font-size:.65rem">
            </i>

          </span>


          <span
            class="muted"
            style="font-size:.78rem">

            (${product.reviewCount})

          </span>

        </div>


        <div class="d-flex align-items-center gap-2">

          <span class="price-final">

            ${formatPrice(product.price)}

          </span>


          <span class="price-strike">

            ${formatPrice(
              product.originalPrice
            )}

          </span>

        </div>


        <span
          class="stock-badge ${stockClass}">

          ${product.stockStatus}

        </span>

      </div>


      <div class="pc-footer">

        <button
          class="btn btn-outline-brand"
          onclick="
            location.href=
            'product-details.html?id=${product.id}'
          ">

          Quick View

        </button>


        <button
          class="btn btn-brand"
          ${
            product.stock === 0
              ? "disabled"
              : ""
          }
          onclick="
            addToCart(${product.id})
          ">

          Add to Cart

        </button>

      </div>

    </div>

  </div>
  `;
}


/* ==========================================================
   Navbar / Footer
   ========================================================== */
async function updateHeaderCounts() {

  // Wishlist count from Flask + MySQL
  try {
    await loadWishlistFromAPI();

    document
      .querySelectorAll(".wishlist-count")
      .forEach(el => {
        el.textContent =
          getWishlistCount();
      });

  } catch (error) {
    console.error(
      "Wishlist Count Error:",
      error
    );

    document
      .querySelectorAll(".wishlist-count")
      .forEach(el => {
        el.textContent = "0";
      });
  }


  // Cart count from Flask + MySQL
  try {
    
    const response =
      await fetch(
        `http://127.0.0.1:5000/api/cart/${getCurrentUserId()}`      );

    const data =
      await response.json();

    const cartCount =
      data.success
        ? data.items.reduce(
            (total, item) =>
              total +
              Number(item.quantity),
            0
          )
        : 0;

    document
      .querySelectorAll(".cart-count")
      .forEach(el => {
        el.textContent =
          cartCount;
      });

  } catch (error) {

    console.error(
      "Cart Count Error:",
      error
    );

    document
      .querySelectorAll(".cart-count")
      .forEach(el => {
        el.textContent = "0";
      });
  }
}
// ---------------------------------------------------------
function renderNavbar() {

  const mount =
    document.getElementById(
      "navbar-placeholder"
    );

  if (!mount) {
    return;
  }


  const user =
    getUserProfile();

  const cats =
    getCategories().slice(
      0,
      7
    );


  mount.innerHTML = `

  <div class="announce-bar">
    Free delivery on orders above ₹999
    &nbsp;|&nbsp;
    ${TAGLINE}
  </div>


  <nav class="ak-navbar">

    <div class="container py-2">

      <div
        class="d-flex align-items-center gap-3">

        <button
          class="btn d-lg-none"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#mobileMenu"
          aria-label="Menu">

          <i
            class="bi bi-list fs-3 text-green">
          </i>

        </button>


        <a
          href="index.html"
          class="ak-logo">

          <i class="bi bi-flower2"></i>
          AgriKart
          <span class="dot">.</span>

        </a>


       <form
  class="flex-grow-1 d-none d-md-flex"
  onsubmit="
    event.preventDefault();

    const searchValue = this.q.value.trim().toLowerCase();

    if (searchValue === 'all products') {
      location.href = 'products.html';
    } else {
      location.href =
        'search.html?q=' +
        encodeURIComponent(this.q.value);
    }
  ">

          <div class="input-group">

            <input
              type="search"
              name="q"
              class="form-control"
              placeholder="Search for seeds, fertilizers, tools...">


            <button
              class="btn btn-brand"
              type="submit">

              <i class="bi bi-search"></i>

            </button>

          </div>

        </form>


        <div
          class="ms-auto d-flex align-items-center gap-3">


          <div class="dropdown">

            <button
              class="btn d-flex align-items-center gap-1"
              data-bs-toggle="dropdown">

              <i
                class="bi bi-person-circle fs-5">
              </i>


              <span
                class="d-none d-lg-inline">

                ${
                  user
                    ? "Hi, " +
                      user.name.split(" ")[0]
                    : "Account"
                }

              </span>

            </button>


            <ul
              class="dropdown-menu dropdown-menu-end">

              ${
                user
                  ? `

                    <li>
                      <a
                        class="dropdown-item"
                        href="account.html">
                        My Account
                      </a>
                    </li>

                    <li>
                      <a
                        class="dropdown-item"
                        href="orders.html">
                        My Orders
                      </a>
                    </li>

                    <li>
                      <a
                        class="dropdown-item"
                        href="wishlist.html">
                        Wishlist
                      </a>
                    </li>

                    <li>
                      <a
                        class="dropdown-item"
                        href="addresses.html">
                        Addresses
                      </a>
                    </li>

                    <li>
                      <hr class="dropdown-divider">
                    </li>

                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        onclick="
                          logoutUser();
                          location.href='index.html'
                        ">
                        Logout
                      </a>
                    </li>

                  `
                  : `

                    <li>
                      <a
                        class="dropdown-item"
                        href="login.html">
                        Login
                      </a>
                    </li>

                    <li>
                      <a
                        class="dropdown-item"
                        href="register.html">
                        Register
                      </a>
                    </li>

                  `
              }

            </ul>

          </div>


          <a
            href="wishlist.html"
            class="icon-badge text-dark">

            <i
              class="bi bi-heart fs-5">
            </i>

            <span
              class="badge-count wishlist-count">

              ${getWishlistCount()}

            </span>

          </a>


          <a
            href="cart.html"
            class="icon-badge text-dark">

            <i
              class="bi bi-cart3 fs-5">
            </i>

            <span
              class="badge-count cart-count">

              0

            </span>

          </a>

        </div>

      </div>

    </div>


    <div class="ak-cat-bar d-none d-lg-block">

      <div class="container">

        ${
          cats.map(
            c =>
              `<a href="category.html?cat=${c.id}">
                ${c.name}
              </a>`
          ).join("")
        }

        <a href="products.html">
          All Products
        </a>

      </div>

    </div>

  </nav>


  <div
    class="offcanvas offcanvas-start"
    tabindex="-1"
    id="mobileMenu">

    <div class="offcanvas-header">

      <span class="ak-logo">

        <i class="bi bi-flower2"></i>
        AgriKart

      </span>


      <button
        class="btn-close"
        data-bs-dismiss="offcanvas">
      </button>

    </div>


    <div class="offcanvas-body">

      <form
        class="mb-3"
        onsubmit="
          event.preventDefault();
          location.href=
          'search.html?q=' +
          encodeURIComponent(this.q.value)
        ">

        <div class="input-group">

          <input
            type="search"
            name="q"
            class="form-control"
            placeholder="Search...">


          <button
            class="btn btn-brand">

            <i class="bi bi-search"></i>

          </button>

        </div>

      </form>


      <div
        class="list-group list-group-flush">

        <a
          href="index.html"
          class="list-group-item">
          Home
        </a>

        <a
          href="products.html"
          class="list-group-item">
          All Products
        </a>

        ${
          getCategories()
            .map(
              c =>
                `<a
                  href="category.html?cat=${c.id}"
                  class="list-group-item">
                  ${c.name}
                </a>`
            )
            .join("")
        }

        <a
          href="cart.html"
          class="list-group-item">
          Cart
        </a>

        <a
          href="wishlist.html"
          class="list-group-item">
          Wishlist
        </a>

        ${
          user
            ? `<a
                href="account.html"
                class="list-group-item">
                My Account
              </a>`
            : `<a
                href="login.html"
                class="list-group-item">
                Login / Register
              </a>`
        }

      </div>

    </div>

  </div>


  <div id="toastHost"></div>

  `;
}


const TAGLINE =
  "Everything You Need to Grow";


function renderFooter() {

  const mount =
    document.getElementById(
      "footer-placeholder"
    );

  if (!mount) {
    return;
  }


  mount.innerHTML = `

  <footer
    class="ak-footer pt-5 pb-3 mt-5">

    <div class="container">

      <div class="row g-4">

        <div class="col-6 col-lg-3">

          <h6>
            <i class="bi bi-flower2"></i>
            AgriKart
          </h6>

          <p class="small">

            ${TAGLINE}.
            Quality agricultural products
            delivered to your doorstep.

          </p>

        </div>


        <div class="col-6 col-lg-3">

          <h6>Shop</h6>

          <ul class="list-unstyled small">

            <li>
              <a href="products.html">
                All Products
              </a>
            </li>

            <li>
              <a href="category.html?cat=seeds">
                Seeds
              </a>
            </li>

            <li>
              <a href="category.html?cat=fertilizers">
                Fertilizers
              </a>
            </li>

            <li>
              <a href="category.html?cat=agri-equipment">
                Equipment
              </a>
            </li>

          </ul>

        </div>


        <div class="col-6 col-lg-3">

          <h6>Account</h6>

          <ul class="list-unstyled small">

            <li>
              <a href="account.html">
                My Account
              </a>
            </li>

            <li>
              <a href="orders.html">
                My Orders
              </a>
            </li>

            <li>
              <a href="wishlist.html">
                Wishlist
              </a>
            </li>

            <li>
              <a href="track-order.html">
                Track Order
              </a>
            </li>

          </ul>

        </div>


        <div class="col-6 col-lg-3">

          <h6>Newsletter</h6>

          <p class="small">
            Get farming tips & deals in your inbox.
          </p>


          <form
            class="d-flex gap-2"
            onsubmit="
              event.preventDefault();
              toast('Subscribed successfully!')
            ">

            <input
              type="email"
              class="form-control form-control-sm"
              placeholder="Email address"
              required>


            <button
              class="btn btn-accent btn-sm">

              Join

            </button>

          </form>

        </div>

      </div>


      <hr class="border-secondary mt-4">


      <p
        class="small text-center mb-0">

        © 2026 AgriKart.
        All rights reserved.
        Demo storefront — not a real store.

      </p>

    </div>

  </footer>

  `;
}


/* ---------------- Page Init ---------------- */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    // Load Wishlist from Flask + MySQL first
    await loadWishlistFromAPI();

    // Render navbar after wishlist is loaded
    renderNavbar();

    // Render footer
    renderFooter();

    // Update Wishlist + Cart counts
    await updateHeaderCounts();

  }
);