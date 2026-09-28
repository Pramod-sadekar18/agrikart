/* ==========================================================================
   AgriKart - Wishlist Page
   Backend Connected Version
   ========================================================================== */

async function initWishlistPage() {

  const mount =
    document.getElementById(
      "wishlistMount"
    );

  if (!mount) return;


  // ---------------------------------------------------------
  // Check login
  // ---------------------------------------------------------

  const userId =
    getCurrentUserId();

  if (!userId) {

    mount.innerHTML = `
      <div class="empty-state">

        <i class="bi bi-person-circle"></i>

        <h5>Please login to view your wishlist</h5>

        <a
          href="login.html"
          class="btn btn-brand">

          Login

        </a>

      </div>
    `;

    return;
  }


  // ---------------------------------------------------------
  // Load wishlist from MySQL
  // ---------------------------------------------------------

  await loadWishlistFromAPI();


  // ---------------------------------------------------------
  // Render wishlist
  // ---------------------------------------------------------

  render();


  function render() {

    const items =
      API_WISHLIST
        .map(id =>
          getProductById(id)
        )
        .filter(Boolean);


    if (items.length === 0) {

      mount.innerHTML = `
        <div class="empty-state">

          <i class="bi bi-heart"></i>

          <h5>Your wishlist is empty</h5>

          <p>
            Save products you love for later.
          </p>

          <a
            href="products.html"
            class="btn btn-brand">

            Browse Products

          </a>

        </div>
      `;

      return;
    }


    mount.innerHTML = items.map(
      p => `

      <div class="wishlist-row">

        <img
          src="${p.image}"
          alt="${p.name}">


        <div class="flex-grow-1">

          <a
            href="product-details.html?id=${p.id}"
            class="fw-semibold text-dark text-decoration-none">

            ${p.name}

          </a>


          <div>

            ${renderStars(p.rating)}

            <span class="muted small">

              (${p.reviewCount})

            </span>

          </div>


          <div class="fw-bold text-green">

            ${formatPrice(p.price)}

            <span class="price-strike">

              ${formatPrice(p.originalPrice)}

            </span>

          </div>


          <span
            class="stock-badge ${
              p.stock === 0
                ? "out"
                : p.stock <= 5
                  ? "low"
                  : "in"
            }">

            ${p.stockStatus}

          </span>

        </div>


        <div class="d-flex flex-column gap-2">

          <button
            class="btn btn-brand btn-sm"
            ${
              p.stock === 0
                ? "disabled"
                : ""
            }
            onclick="
              addToCart(${p.id})
            ">

            Add to Cart

          </button>


          <button
            class="btn btn-outline-secondary btn-sm"
            onclick="
              wlRemove(${p.id})
            ">

            <i class="bi bi-trash"></i>

            Remove

          </button>

        </div>

      </div>

      `
    ).join("");
  }


  // ---------------------------------------------------------
  // Remove from Wishlist
  // ---------------------------------------------------------

  window.wlRemove =
    async function(id) {

      await removeFromWishlist(id);

      // Reload wishlist after removing
      await loadWishlistFromAPI();

      render();

      await updateHeaderCounts();
    };
}