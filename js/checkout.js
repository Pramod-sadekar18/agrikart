/* ==========================================================================
   AgriKart - Checkout & Order Success
   Connected to Flask + MySQL
   ========================================================================== */

const API_BASE = "/api";


async function initCheckoutPage() {
  const mount = document.getElementById("checkoutMount");

  if (!mount) return;

  if (!requireLogin("Please login to checkout.")) return;

  const user = getCurrentUser();

  if (!user) {
    toast("Please login to checkout.", "error");
    return;
  }

// ============================================================
// GET CART FROM FLASK + MYSQL
// ============================================================

let cartResponse;

try {

  cartResponse = await fetch(
    `${API_BASE}/cart/${user.id}`
  );

  const cartData = await cartResponse.json();

  if (!cartData.success) {
    throw new Error(
      cartData.message || "Failed to load cart."
    );
  }

  const cartItems = cartData.items || [];

  if (cartItems.length === 0) {

    mount.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-cart-x"></i>

        <h5>Your cart is empty</h5>

        <a
          href="products.html"
          class="btn btn-brand"
        >
          Continue Shopping
        </a>
      </div>
    `;

    return;
  }

  // Convert MySQL cart format
  // into checkout format
  var items = cartItems.map(item => ({
    product: {
      id: item.product_id,
      name: item.name,
      brand: item.brand,
      price: Number(item.price),
      originalPrice: Number(item.original_price),
      discount: Number(item.discount),
      image: item.image,
      stock: item.stock
    },
    qty: Number(item.quantity)
  }));

} catch (error) {

  console.error(
    "Cart API Error:",
    error
  );

  mount.innerHTML = `
    <div class="empty-state">

      <i class="bi bi-exclamation-circle"></i>

      <h5>Unable to load cart</h5>

      <p class="muted">
        Please make sure Flask server is running.
      </p>

    </div>
  `;

  return;
}

  const itemTotal = items.reduce(
  (sum, item) =>
    sum + item.product.price * item.qty,
  0
);

const mrpTotal = items.reduce(
  (sum, item) =>
    sum +
    (item.product.originalPrice || item.product.price) *
    item.qty,
  0
);

const discount = mrpTotal - itemTotal;

const delivery =
  itemTotal >= 999 ? 0 : 50;

const tax =
  itemTotal * 0.05;

const total =
  itemTotal + delivery + tax;

const totals = {
  itemTotal,
  mrpTotal,
  discount,
  delivery,
  tax,
  total
};
  // ------------------------------------------------------------
  // Get addresses from Flask + MySQL
  // ------------------------------------------------------------

  let addresses = [];

  try {
    const response = await fetch(
      `${API_BASE}/addresses/${user.id}`
    );

    const data = await response.json();

    if (data.success) {
      addresses = data.addresses || [];
    }
  } catch (error) {
    console.error("Address API Error:", error);

    mount.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-exclamation-circle"></i>
        <h5>Unable to load addresses</h5>
        <p class="muted">Please make sure Flask server is running.</p>
      </div>`;

    return;
  }


  // ------------------------------------------------------------
  // Render Checkout
  // ------------------------------------------------------------

  mount.innerHTML = `
    <div class="row g-4">

      <div class="col-lg-8">

        <!-- DELIVERY ADDRESS -->
        <div class="filter-box mb-3">

          <h5>
            <i class="bi bi-geo-alt text-green"></i>
            Delivery Address
          </h5>

          <div id="checkoutAddressList">

            ${
              addresses.length
                ? addresses.map((a, idx) => `
                  <div class="form-check border-bottom py-2">

                    <input
                      class="form-check-input"
                      type="radio"
                      name="selectedAddress"
                      value="${a.id}"
                      id="addr-${a.id}"
                      ${
                        Number(a.is_default) === 1 || idx === 0
                          ? "checked"
                          : ""
                      }
                    >

                    <label
                      class="form-check-label"
                      for="addr-${a.id}"
                    >
                      <strong>${a.name}</strong>
                      (${a.type}) &middot;
                      ${a.mobile}

                      <br>

                      <span class="muted small">
                        ${a.address},
                        ${a.city},
                        ${a.state}
                        - ${a.pincode}
                      </span>

                    </label>

                  </div>
                `).join("")
                : `
                  <p class="muted">
                    No saved address yet. Please add one below.
                  </p>
                `
            }

          </div>

          <button
            class="btn btn-sm btn-outline-brand mt-2"
            id="addNewAddressBtn"
          >
            + Add New Address
          </button>


          <!-- QUICK ADDRESS FORM -->

          <form
            id="quickAddressForm"
            class="row g-2 mt-2 d-none"
          >

            <div class="col-md-6">
              <input
                class="form-control"
                name="name"
                placeholder="Full Name"
                required
              >
            </div>

            <div class="col-md-6">
              <input
                class="form-control"
                name="mobile"
                placeholder="Mobile Number"
                required
              >
            </div>

            <div class="col-12">
              <input
                class="form-control"
                name="address"
                placeholder="Address"
                required
              >
            </div>

            <div class="col-md-4">
              <input
                class="form-control"
                name="city"
                placeholder="City"
                required
              >
            </div>

            <div class="col-md-4">
              <input
                class="form-control"
                name="state"
                placeholder="State"
                required
              >
            </div>

            <div class="col-md-4">
              <input
                class="form-control"
                name="pincode"
                placeholder="PIN Code"
                required
              >
            </div>

            <input
              type="hidden"
              name="type"
              value="Home"
            >

            <div class="col-12">
              <button class="btn btn-brand btn-sm">
                Save Address
              </button>
            </div>

          </form>

        </div>


        <!-- ORDER SUMMARY -->

        <div class="filter-box mb-3">

          <h5>
            <i class="bi bi-receipt text-green"></i>
            Order Summary
          </h5>

          ${items.map(i => `
            <div class="d-flex justify-content-between border-bottom py-2">

              <span>
                ${i.product.name} × ${i.qty}
              </span>

              <span>
                ${formatPrice(i.product.price * i.qty)}
              </span>

            </div>
          `).join("")}

        </div>


        <!-- PAYMENT -->

        <div class="filter-box">

          <h5>
            <i class="bi bi-credit-card text-green"></i>
            Payment Method
          </h5>

          ${
            [
              ["upi", "UPI (Google Pay / PhonePe / Paytm)"],
              ["card", "Credit / Debit Card"],
              ["netbanking", "Net Banking"],
              ["cod", "Cash on Delivery"]
            ]
            .map(([val, label], idx) => `
              <div class="form-check py-1">

                <input
                  class="form-check-input"
                  type="radio"
                  name="paymentMethod"
                  value="${val}"
                  id="pm-${val}"
                  ${idx === 0 ? "checked" : ""}
                >

                <label
                  class="form-check-label"
                  for="pm-${val}"
                >
                  ${label}
                </label>

              </div>
            `)
            .join("")
          }

          <p class="small muted mt-2">
            <i class="bi bi-info-circle"></i>
            This is a demo checkout.
            No real payment will be processed.
          </p>

        </div>

      </div>


      <!-- PRICE DETAILS -->

      <div class="col-lg-4">

        <div class="filter-box">

          <h5 class="mb-3">
            Price Details
          </h5>

          <div class="d-flex justify-content-between small mb-2">
            <span>Item Total</span>
            <span>${formatPrice(totals.itemTotal)}</span>
          </div>

          <div class="d-flex justify-content-between small mb-2 text-success">
            <span>Discount</span>
            <span>-${formatPrice(totals.discount)}</span>
          </div>

          <div class="d-flex justify-content-between small mb-2">
            <span>Delivery</span>
            <span>
              ${
                totals.delivery === 0
                  ? "FREE"
                  : formatPrice(totals.delivery)
              }
            </span>
          </div>

          <div class="d-flex justify-content-between small mb-2">
            <span>Tax (5%)</span>
            <span>${formatPrice(totals.tax)}</span>
          </div>

          <hr>

          <div class="d-flex justify-content-between fw-bold fs-5 mb-3">
            <span>Total</span>
            <span>${formatPrice(totals.total)}</span>
          </div>

          <button
            class="btn btn-brand w-100"
            id="placeOrderBtn"
          >
            Place Order
          </button>

        </div>

      </div>

    </div>
  `;


  // ------------------------------------------------------------
  // ADD NEW ADDRESS BUTTON
  // ------------------------------------------------------------

  document
    .getElementById("addNewAddressBtn")
    .addEventListener("click", () => {

      document
        .getElementById("quickAddressForm")
        .classList.remove("d-none");

    });


  // ------------------------------------------------------------
  // ADD ADDRESS → MYSQL
  // ------------------------------------------------------------

  document
    .getElementById("quickAddressForm")
    .addEventListener("submit", async (e) => {

      e.preventDefault();

      const form = e.target;

      const addressData = {
        user_id: user.id,
        type: form.type.value,
        name: form.name.value.trim(),
        mobile: form.mobile.value.trim(),
        address: form.address.value.trim(),
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        pincode: form.pincode.value.trim(),
        is_default: addresses.length === 0
      };


      try {

        const response = await fetch(
          `${API_BASE}/addresses`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify(addressData)
          }
        );


        const data = await response.json();


        if (!data.success) {
          toast(
            data.message || "Failed to add address.",
            "error"
          );
          return;
        }


        toast("Address added successfully");

        // Reload checkout with new address
        await initCheckoutPage();

      } catch (error) {

        console.error("Add Address Error:", error);

        toast(
          "Unable to add address. Please check Flask server.",
          "error"
        );

      }

    });


  // ------------------------------------------------------------
  // PLACE ORDER → FLASK + MYSQL
  // ------------------------------------------------------------

  document
    .getElementById("placeOrderBtn")
    .addEventListener("click", async () => {

      const selected =
        document.querySelector(
          'input[name="selectedAddress"]:checked'
        );


      if (!selected) {

        toast(
          "Please add or select a delivery address",
          "error"
        );

        return;
      }


      const address =
        addresses.find(
          a => String(a.id) === selected.value
        );


      if (!address) {

        toast(
          "Selected address not found.",
          "error"
        );

        return;
      }


      const paymentElement =
        document.querySelector(
          'input[name="paymentMethod"]:checked'
        );


      if (!paymentElement) {

        toast(
          "Please select a payment method.",
          "error"
        );

        return;
      }


      const paymentMethod =
        paymentElement.value;


      // Convert frontend cart format to API format

      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.qty
      }));


      const orderData = {

        user_id: user.id,

        items: orderItems,

        address: {
          name: address.name,
          mobile: address.mobile,
          address: address.address,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          type: address.type || "Home"
        },

        payment_method: paymentMethod

      };


      const button =
        document.getElementById("placeOrderBtn");


      button.disabled = true;
      button.innerHTML =
        `<span class="spinner-border spinner-border-sm"></span> Placing Order...`;


      try {

        const response = await fetch(
          `${API_BASE}/orders`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify(orderData)
          }
        );


        const data = await response.json();


        if (!data.success) {

          toast(
            data.message || "Failed to place order.",
            "error"
          );

          button.disabled = false;
          button.innerHTML = "Place Order";

          return;
        }


        // Save successful API response temporarily
        sessionStorage.setItem(
          "agrikart_last_order",
          JSON.stringify({
            ...data.order,
            address: address,
            date: new Date().toISOString()
          })
        );


        // Clear frontend cart if function exists
        if (typeof clearCart === "function") {
          clearCart();
        }


        // Go to success page
        location.href =
          "order-success.html?id=" +
          encodeURIComponent(data.order_id);

      } catch (error) {

        console.error("Place Order Error:", error);

        toast(
          "Unable to place order. Please make sure Flask is running.",
          "error"
        );

        button.disabled = false;
        button.innerHTML = "Place Order";

      }

    });

}


/* ==========================================================================
   ORDER SUCCESS PAGE
   ========================================================================== */

function initOrderSuccessPage() {

  const mount =
    document.getElementById("orderSuccessMount");

  if (!mount) return;


  const savedOrder =
    sessionStorage.getItem("agrikart_last_order");


  if (!savedOrder) {

    mount.innerHTML = `
      <div class="empty-state">

        <i class="bi bi-exclamation-circle"></i>

        <h5>Order not found</h5>

        <a
          href="index.html"
          class="btn btn-brand"
        >
          Go Home
        </a>

      </div>
    `;

    return;
  }


  const order =
    JSON.parse(savedOrder);


  mount.innerHTML = `

    <div class="text-center py-4">

      <i
        class="bi bi-check-circle-fill text-success"
        style="font-size:4rem"
      ></i>

      <h3 class="fw-bold mt-3">
        Order Placed Successfully!
      </h3>

      <p class="muted">
        Thank you for shopping with AgriKart.
      </p>


      <div
        class="filter-box d-inline-block text-start mt-3"
        style="min-width:320px"
      >

        <div class="d-flex justify-content-between">
          <span>Order ID</span>
          <strong>${order.id}</strong>
        </div>

        <div class="d-flex justify-content-between">
          <span>Order Date</span>
          <span>
            ${new Date(order.date).toLocaleDateString()}
          </span>
        </div>

        <div class="d-flex justify-content-between">
          <span>Total Amount</span>
          <strong>
            ${formatPrice(order.total_amount)}
          </strong>
        </div>

        <div class="d-flex justify-content-between">
          <span>Delivery Address</span>

          <span class="text-end">
            ${order.address.city},
            ${order.address.state}
          </span>
        </div>

      </div>


      <div
        class="d-flex justify-content-center gap-2 mt-4 flex-wrap"
      >

        <a
          href="track-order.html?id=${order.id}"
          class="btn btn-brand"
        >
          Track Order
        </a>

        <a
          href="orders.html"
          class="btn btn-outline-brand"
        >
          View My Orders
        </a>

        <a
          href="products.html"
          class="btn btn-outline-secondary"
        >
          Continue Shopping
        </a>

      </div>

    </div>
  `;
}