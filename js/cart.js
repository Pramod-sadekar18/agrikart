/* ==========================================================================
   AgriKart - Cart Page
   Backend Connected Version
   ========================================================================== */

async function initCartPage() {

  const mount = document.getElementById("cartMount");

  if (!mount) return;

  const API_URL = "/api";

  // Get logged-in user's ID
  const userId = getCurrentUserId();

  // Login required
  if (!userId) {
    mount.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-person-circle"></i>
        <h5>Please login to view your cart</h5>
        <a href="login.html" class="btn btn-brand">
          Login
        </a>
      </div>
    `;
    return;
  }


  // ---------------------------------------------------------
  // Load cart from Flask + MySQL
  // ---------------------------------------------------------

  async function loadCart() {

    try {

      const response =
        await fetch(`${API_URL}/cart/${userId}`);

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Failed to load cart"
        );
      }

      render(data.items);

      // Update navbar cart count
      await updateHeaderCounts();

    } catch (error) {

      console.error(
        "Cart API Error:",
        error
      );

      mount.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-exclamation-triangle"></i>
          <h5>Unable to load cart</h5>
          <p>Please make sure Flask server is running.</p>
        </div>
      `;
    }
  }


  // ---------------------------------------------------------
  // Render cart
  // ---------------------------------------------------------

  function render(items) {

    if (items.length === 0) {

      mount.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-cart-x"></i>
          <h5>Your cart is empty</h5>
          <p>Looks like you haven't added anything yet.</p>

          <a
            href="products.html"
            class="btn btn-brand">

            Continue Shopping

          </a>
        </div>
      `;

      return;
    }


    // -------------------------------------------------------
    // Calculate totals
    // -------------------------------------------------------

    let itemTotal = 0;
    let mrpTotal = 0;

    items.forEach(item => {

      itemTotal +=
        Number(item.price) *
        Number(item.quantity);

      mrpTotal +=
        Number(
          item.original_price ||
          item.price
        ) *
        Number(item.quantity);
    });

    const discount =
      mrpTotal - itemTotal;

    const delivery =
      itemTotal >= 500
        ? 0
        : 40;

    const tax =
      itemTotal * 0.05;

    const total =
      itemTotal +
      delivery +
      tax;


    // -------------------------------------------------------
    // Cart HTML
    // -------------------------------------------------------

    mount.innerHTML = `
      <div class="row g-4">

        <div class="col-lg-8">

          <div id="cartItemsList"></div>

          <a
            href="products.html"
            class="btn btn-outline-brand">

            <i class="bi bi-arrow-left"></i>
            Continue Shopping

          </a>

        </div>


        <div class="col-lg-4">

          <div class="filter-box">

            <h5 class="mb-3">
              Price Details
            </h5>

            <div class="d-flex justify-content-between small mb-2">

              <span>Item Total</span>

              <span>
                ${formatPrice(itemTotal)}
              </span>

            </div>


            <div class="d-flex justify-content-between small mb-2 text-success">

              <span>Discount</span>

              <span>
                -${formatPrice(discount)}
              </span>

            </div>


            <div class="d-flex justify-content-between small mb-2">

              <span>Delivery Charges</span>

              <span>
                ${
                  delivery === 0
                    ? "FREE"
                    : formatPrice(delivery)
                }
              </span>

            </div>


            <div class="d-flex justify-content-between small mb-2">

              <span>Tax (5%)</span>

              <span>
                ${formatPrice(tax)}
              </span>

            </div>


            <hr>


            <div class="d-flex justify-content-between fw-bold fs-5 mb-3">

              <span>Total</span>

              <span>
                ${formatPrice(total)}
              </span>

            </div>


            <button
              class="btn btn-brand w-100"
              onclick="location.href='checkout.html'">

              Proceed to Checkout

            </button>

          </div>

        </div>

      </div>
    `;


    // -------------------------------------------------------
    // Display cart items
    // -------------------------------------------------------

    document.getElementById(
      "cartItemsList"
    ).innerHTML =

      items.map(item => `

        <div class="cart-row">

          <img
            src="${item.image}"
            alt="${item.name}">


          <div class="flex-grow-1">

            <a
              href="product-details.html?id=${item.product_id}"
              class="fw-semibold text-dark text-decoration-none">

              ${item.name}

            </a>


            <div class="muted small">

              ${item.brand || ""}

            </div>


            <div class="fw-bold text-green">

              ${formatPrice(item.price)}

            </div>

          </div>


          <div class="qty-control">

            <button
              onclick="
                cartChangeQty(
                  ${item.product_id},
                  -1
                )
              ">

              <i class="bi bi-dash"></i>

            </button>


            <span>
              ${item.quantity}
            </span>


            <button
              onclick="
                cartChangeQty(
                  ${item.product_id},
                  1
                )
              ">

              <i class="bi bi-plus"></i>

            </button>

          </div>


          <div
            class="fw-bold"
            style="width:90px;text-align:right">

            ${formatPrice(
              Number(item.price) *
              Number(item.quantity)
            )}

          </div>


          <div class="d-flex flex-column gap-1">

            <button
              class="btn btn-sm btn-link text-danger"
              onclick="
                cartRemove(
                  ${item.product_id}
                )
              ">

              <i class="bi bi-trash"></i>
              Remove

            </button>


            <button
              class="btn btn-sm btn-link"
              onclick="
                cartMoveToWishlist(
                  ${item.product_id}
                )
              ">

              <i class="bi bi-heart"></i>
              Move to Wishlist

            </button>

          </div>

        </div>

      `).join("");
  }


  // ---------------------------------------------------------
  // Change quantity
  // ---------------------------------------------------------

  window.cartChangeQty =
    async function(productId, delta) {

      try {

        const response =
          await fetch(
            `${API_URL}/cart/${userId}`
          );

        const data =
          await response.json();

        const item =
          data.items.find(
            i =>
              Number(i.product_id) ===
              Number(productId)
          );

        if (!item) return;

        const newQuantity =
          Number(item.quantity) +
          Number(delta);

        if (newQuantity < 1) {
          return;
        }


        const updateResponse =
          await fetch(
            `${API_URL}/cart/${userId}/${productId}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                quantity: newQuantity
              })
            }
          );


        const updateData =
          await updateResponse.json();


        if (!updateData.success) {

          alert(
            updateData.message ||
            "Unable to update quantity."
          );

          return;
        }


        await loadCart();

      } catch (error) {

        console.error(
          "Quantity Update Error:",
          error
        );

        alert(
          "Unable to update cart."
        );
      }
    };


  // ---------------------------------------------------------
  // Remove product
  // ---------------------------------------------------------

  window.cartRemove =
    async function(productId) {

      try {

        const response =
          await fetch(
            `${API_URL}/cart/${userId}/${productId}`,
            {
              method: "DELETE"
            }
          );


        const data =
          await response.json();


        if (!data.success) {

          alert(
            data.message ||
            "Unable to remove product."
          );

          return;
        }


        await loadCart();

      } catch (error) {

        console.error(
          "Remove Cart Error:",
          error
        );

        alert(
          "Unable to remove product."
        );
      }
    };


  // ---------------------------------------------------------
  // Move to Wishlist
  // ---------------------------------------------------------

  window.cartMoveToWishlist =
    async function(productId) {

      try {

        if (
          typeof addToWishlist ===
          "function"
        ) {

          await addToWishlist(
            productId
          );
        }

        await cartRemove(
          productId
        );

      } catch (error) {

        console.error(
          "Move to Wishlist Error:",
          error
        );
      }
    };


  // ---------------------------------------------------------
  // Start
  // ---------------------------------------------------------

  await loadCart();
}