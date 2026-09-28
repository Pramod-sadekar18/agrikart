/* ==========================================================================
   AgriKart - Orders (History / Details / Tracking)
   ========================================================================== */

const ORDERS_API = "/api/orders";


// ============================================================
// STATUS BADGE
// ============================================================

function statusBadgeClass(status) {
  if (status === "Delivered") return "bg-success";
  if (status === "Cancelled") return "bg-danger";
  return "bg-warning text-dark";
}


// ============================================================
// ORDER ROW
// ============================================================

function renderOrderRow(order) {
  return `
    <div class="cart-row">

      <div class="flex-grow-1">

        <div class="fw-semibold">
          ${order.id}
        </div>

        <div class="muted small">
          ${new Date(order.order_date).toLocaleDateString()}
          &middot;
          ${order.payment_method.toUpperCase()}
          &middot;
          ${formatPrice(Number(order.total_amount))}
        </div>

        <span class="badge ${statusBadgeClass(order.status)}">
          ${order.status}
        </span>

      </div>

      <div class="d-flex flex-column gap-2">

        <a
          href="order-details.html?id=${encodeURIComponent(order.id)}"
          class="btn btn-sm btn-outline-brand"
        >
          View Details
        </a>

        <a
          href="track-order.html?id=${encodeURIComponent(order.id)}"
          class="btn btn-sm btn-brand"
        >
          Track Order
        </a>

        ${(order.status === "Order Placed" || order.status === "Confirmed") ? `
  <button
    class="btn btn-sm btn-outline-danger"
    onclick="cancelOrder('${order.id}')"
  >
    Cancel Order
  </button>
` : ""}

      </div>

    </div>
  `;
}


// ============================================================
// GET ORDERS FROM FLASK
// ============================================================

async function fetchUserOrders() {

  const user = getCurrentUser();

  if (!user) {
    return [];
  }

  const response = await fetch(
    `${ORDERS_API}/${user.id}`
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.message || "Failed to load orders."
    );
  }

  return data.orders || [];
}


// ============================================================
// FIND ORDER BY ID
// ============================================================

async function getApiOrderById(orderId) {

  const orders = await fetchUserOrders();

  return orders.find(
    order => String(order.id) === String(orderId)
  ) || null;
}

// ============================================================
// MY ORDERS PAGE
// ============================================================

async function initOrdersPage() {

  const mount = document.getElementById("ordersMount");

  if (!mount) return;

  // Check login
  if (!requireLogin("Please login to view your orders.")) {
    return;
  }

  renderAccountSidebar("orders.html");

  // Loading
  mount.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border"></div>
      <p class="muted mt-2">
        Loading your orders...
      </p>
    </div>
  `;

  try {

    // Get logged-in user's orders from Flask
    const orders = await fetchUserOrders();

    // No orders
    if (!orders.length) {

      mount.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-bag-x"></i>

          <h5>No orders yet</h5>

          <p>
            Your placed orders will appear here.
          </p>

          <a
            href="products.html"
            class="btn btn-brand"
          >
            Start Shopping
          </a>
        </div>
      `;

      return;
    }

    // Display orders
    mount.innerHTML = orders
      .map(renderOrderRow)
      .join("");

  } catch (error) {

    console.error("Orders API Error:", error);

    mount.innerHTML = `
      <div class="empty-state">

        <i class="bi bi-exclamation-circle"></i>

        <h5>Unable to load orders</h5>

        <p>
          Please make sure Flask server is running.
        </p>

      </div>
    `;
  }
}


// ============================================================
// ORDER DETAILS PAGE
// ============================================================

async function initOrderDetailsPage() {

  const mount =
    document.getElementById(
      "orderDetailsMount"
    );

  if (!mount) return;


  if (
    !requireLogin(
      "Please login to view order details."
    )
  ) {
    return;
  }


  renderAccountSidebar("orders.html");

  const orderId = new URLSearchParams(window.location.search).get("id");

  if (!orderId) {

    mount.innerHTML = `
      <div class="empty-state">

        <i class="bi bi-exclamation-circle"></i>

        <h5>Order not found</h5>

      </div>
    `;

    return;
  }


  // Loading

  mount.innerHTML = `
    <div class="text-center py-5">

      <div class="spinner-border"></div>

      <p class="muted mt-2">
        Loading order details...
      </p>

    </div>
  `;


  try {

    const order =
      await getApiOrderById(orderId);


    if (!order) {

      mount.innerHTML = `
        <div class="empty-state">

          <i class="bi bi-exclamation-circle"></i>

          <h5>Order not found</h5>

        </div>
      `;

      return;
    }


    mount.innerHTML = `

      <div
        class="d-flex justify-content-between
        align-items-start flex-wrap mb-3"
      >

        <div>

          <h4 class="mb-1">
            Order ${order.id}
          </h4>

          <span class="muted small">
            Placed on
            ${new Date(
      order.order_date
    ).toLocaleString()}
          </span>

        </div>

        <span
          class="badge
          ${statusBadgeClass(order.status)}
          fs-6"
        >
          ${order.status}
        </span>

      </div>


      <div class="row g-4">


        <!-- LEFT -->

        <div class="col-lg-8">


          <!-- ORDER SUMMARY -->

          <div class="filter-box mb-3">

            <h6>Order Summary</h6>

            <div
              class="d-flex justify-content-between
              border-bottom py-2"
            >

              <span>Item Total</span>

              <span>
                ${formatPrice(
      Number(order.item_total)
    )}
              </span>

            </div>


            <div
              class="d-flex justify-content-between
              border-bottom py-2"
            >

              <span>Discount</span>

              <span>
                -
                ${formatPrice(
      Number(order.discount)
    )}
              </span>

            </div>


            <div
              class="d-flex justify-content-between
              border-bottom py-2"
            >

              <span>Delivery</span>

              <span>
                ${Number(order.delivery_charges) === 0
        ? "FREE"
        : formatPrice(
          Number(
            order.delivery_charges
          )
        )
      }
              </span>

            </div>


            <div
              class="d-flex justify-content-between
              border-bottom py-2"
            >

              <span>Tax</span>

              <span>
                ${formatPrice(
        Number(order.tax)
      )}
              </span>

            </div>


            <div
              class="d-flex justify-content-between
              fw-bold pt-2"
            >

              <span>Total</span>

              <span>
                ${formatPrice(
        Number(order.total_amount)
      )}
              </span>

            </div>

          </div>


          <!-- DELIVERY ADDRESS -->

          <div class="filter-box">

            <h6>Delivery Address</h6>

            <p class="mb-0">

              <strong>
                ${order.shipping_name}
              </strong>

              &middot;

              ${order.shipping_mobile}

              <br>

              ${order.shipping_address},
              ${order.shipping_city},
              ${order.shipping_state}
              -
              ${order.shipping_pincode}

            </p>

          </div>


        </div>


        <!-- RIGHT -->

        <div class="col-lg-4">


          <!-- PAYMENT -->

          <div class="filter-box mb-3">

            <h6>Payment</h6>

            <p>

              Method:
              <strong>
                ${order.payment_method.toUpperCase()}
              </strong>

              <br>

              Status:
              ${order.payment_status}

            </p>

          </div>


          <!-- DELIVERY -->

          <div class="filter-box">

            <h6>Expected Delivery</h6>

            <p>

              ${order.expected_delivery
        ? new Date(
          order.expected_delivery
        ).toLocaleDateString()
        : "Not available"
      }

            </p>


            <a
              href="track-order.html?id=${encodeURIComponent(
        order.id
      )}"
              class="btn btn-brand w-100"
            >
              Track Order
            </a>

          </div>


        </div>


      </div>
    `;


  } catch (error) {

    console.error(
      "Order Details API Error:",
      error
    );

    mount.innerHTML = `
      <div class="empty-state">

        <i class="bi bi-exclamation-circle"></i>

        <h5>Unable to load order</h5>

        <p>
          Please make sure Flask server is running.
        </p>

      </div>
    `;
  }
}


// ============================================================
// ORDER TIMELINE
// ============================================================

// ============================================================
// AUTOMATIC DATE-BASED ORDER STATUS
// ============================================================

function getAutoOrderStatus(order) {

  // Cancelled order should always remain cancelled
  if (order.status === "Cancelled") {
    return "Cancelled";
  }

  const orderDate = new Date(order.order_date);
  const today = new Date();

  // Compare only dates, not time
  orderDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysPassed = Math.floor(
    (today - orderDate) /
    (1000 * 60 * 60 * 24)
  );

  if (daysPassed >= 5) {
    return "Delivered";
  }

  if (daysPassed === 4) {
    return "Out for Delivery";
  }

  if (daysPassed === 3) {
    return "Shipped";
  }

  if (daysPassed === 2) {
    return "Packed";
  }

  if (daysPassed === 1) {
    return "Confirmed";
  }

  return "Order Placed";
}


// ============================================================
// ORDER TIMELINE
// ============================================================

function renderOrderTimeline(order) {

  const statuses = [
    "Order Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered"
  ];

  // Get status according to order date
  const currentStatus =
    getAutoOrderStatus(order);


  // Cancelled order
  if (currentStatus === "Cancelled") {

    return `
      <div class="empty-state">

        <i class="bi bi-x-circle"></i>

        <h5>Order Cancelled</h5>

        <p>
          Order ${order.id} has been cancelled.
        </p>

      </div>
    `;
  }


  // Find current status position
  let currentIndex =
    statuses.indexOf(currentStatus);


  if (currentIndex === -1) {
    currentIndex = 0;
  }


  return `

    <ul class="order-timeline">

      ${statuses
        .map((status, index) => {

          let className = "";

          // Previous steps completed
          if (index < currentIndex) {
            className = "done";
          }

          // Current step
          if (index === currentIndex) {
            className = "done current";
          }

          return `
            <li class="${className}">
              ${status}
            </li>
          `;

        })
        .join("")}

    </ul>


    <p class="text-center muted">

      Expected delivery:

      <strong>

        ${
          order.expected_delivery
            ? new Date(
                order.expected_delivery
              ).toLocaleDateString()
            : "Not available"
        }

      </strong>

    </p>


    <p class="text-center small">

      Delivering to:

      ${order.shipping_address},
      ${order.shipping_city}

    </p>

  `;
}
// ============================================================
// TRACK ORDER PAGE
// ============================================================

async function initTrackOrderPage() {

  const mount =
    document.getElementById(
      "trackOrderMount"
    );

  if (!mount) return;


  if (
    !requireLogin(
      "Please login to track your order."
    )
  ) {
    return;
  }


  renderAccountSidebar(
    "track-order.html"
  );


  const orderId = new URLSearchParams(window.location.search).get("id");


  // Loading

  mount.innerHTML = `
    <div class="text-center py-5">

      <div class="spinner-border"></div>

      <p class="muted mt-2">
        Loading tracking information...
      </p>

    </div>
  `;


  try {

    const orders =
      await fetchUserOrders();


    // No orders

    if (!orders.length) {

      mount.innerHTML = `
        <div class="empty-state">

          <i class="bi bi-truck"></i>

          <h5>No orders to track</h5>

          <a
            href="products.html"
            class="btn btn-brand"
          >
            Start Shopping
          </a>

        </div>
      `;

      return;
    }


    // ========================================================
    // SPECIFIC ORDER
    // ========================================================

    if (orderId) {

      const order =
        orders.find(
          o =>
            String(o.id) ===
            String(orderId)
        );


      if (!order) {

        mount.innerHTML = `
          <div class="empty-state">

            <i
              class="bi
              bi-exclamation-circle"
            ></i>

            <h5>
              Order not found
            </h5>

          </div>
        `;

        return;
      }


      mount.innerHTML = `

        <h5>
          Tracking Order ${order.id}
        </h5>

        ${renderOrderTimeline(order)}

      `;

      return;
    }


    // ========================================================
    // SELECT ORDER
    // ========================================================

    mount.innerHTML = `

      <div class="mb-3">

        <label
          class="form-label"
        >
          Select an order to track
        </label>


        <select
          class="form-select"
          id="trackOrderSelect"
        >

          ${orders
        .map(
          order => `
                <option
                  value="${order.id}"
                >
                  ${order.id}
                  -
                  ${new Date(
            order.order_date
          ).toLocaleDateString()}
                </option>
              `
        )
        .join("")}

        </select>

      </div>


      <div id="trackResult">

        ${renderOrderTimeline(
          orders[0]
        )}

      </div>

    `;


    // Select change

    const select =
      document.getElementById(
        "trackOrderSelect"
      );

    const result =
      document.getElementById(
        "trackResult"
      );


    if (select && result) {

      select.addEventListener(
        "change",
        () => {

          const selectedOrder =
            orders.find(
              order =>
                String(order.id) ===
                String(select.value)
            );


          if (selectedOrder) {

            result.innerHTML =
              renderOrderTimeline(
                selectedOrder
              );

          }

        }
      );

    }


  } catch (error) {

    console.error(
      "Track Order API Error:",
      error
    );

    mount.innerHTML = `
      <div class="empty-state">

        <i
          class="bi
          bi-exclamation-circle"
        ></i>

        <h5>
          Unable to load tracking
        </h5>

        <p>
          Please make sure Flask server is running.
        </p>

      </div>
    `;
  }
}

// ============================================================
// CANCEL ORDER
// ============================================================

// ============================================================
// CANCEL ORDER
// ============================================================

async function cancelOrder(orderId) {

  const user = getCurrentUser();

  if (!user) {
    alert("Please login first.");
    return;
  }

  const confirmCancel = confirm(
    "Are you sure you want to cancel this order?"
  );

  if (!confirmCancel) {
    return;
  }

  try {

    const response = await fetch(
      `${ORDERS_API}/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          user_id: user.id
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      alert(
        data.message ||
        "Unable to cancel order."
      );
      return;
    }

    alert("Order cancelled successfully.");

    // Reload My Orders page
    initOrdersPage();

  } catch (error) {

    console.error(
      "Cancel Order Error:",
      error
    );

    alert(
      "Unable to cancel order. Please make sure Flask server is running."
    );
  }
}
    
