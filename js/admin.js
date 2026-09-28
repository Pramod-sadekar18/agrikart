const ADMIN_AUTH_KEY = "agrikart_admin_auth";
const adminGate = document.getElementById("adminGate");
const adminApp = document.getElementById("adminApp");
const productModal = new bootstrap.Modal(document.getElementById("productModal"));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function adminHeaders(extra = {}) {
  return { ...extra, Authorization: `Basic ${sessionStorage.getItem(ADMIN_AUTH_KEY) || ""}` };
}

async function adminFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: adminHeaders(options.headers || {})
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    signOut();
    throw new Error("Admin session expired. Sign in again.");
  }
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function showAdmin() {
  adminGate.hidden = true;
  adminApp.hidden = false;
  document.getElementById("adminIdentity").textContent = "Administrator";
  refreshDashboard();
}

function signOut() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  adminApp.hidden = true;
  adminGate.hidden = false;
  document.getElementById("adminPassword").value = "";
}

document.getElementById("adminLogin").addEventListener("submit", async event => {
  event.preventDefault();
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;
  const credentials = btoa(`${username}:${password}`);
  const error = document.getElementById("loginError");
  error.textContent = "";
  try {
    const response = await fetch("/api/admin/session", { headers: { Authorization: `Basic ${credentials}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Sign in failed.");
    sessionStorage.setItem(ADMIN_AUTH_KEY, credentials);
    showAdmin();
  } catch (loginError) {
    error.textContent = loginError.message;
  }
});

document.getElementById("logoutButton").addEventListener("click", signOut);
document.getElementById("refreshButton").addEventListener("click", refreshDashboard);

document.querySelectorAll("[data-admin-tab]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-admin-tab]").forEach(tab => tab.classList.toggle("active", tab === button));
    document.getElementById("overviewView").hidden = button.dataset.adminTab !== "overview";
    document.getElementById("productsView").hidden = button.dataset.adminTab !== "products";
    if (button.dataset.adminTab === "products") loadProducts();
  });
});

function setHealth(prefix, healthy, text) {
  document.getElementById(`${prefix}HealthDot`).className = `health-dot ${healthy ? "health-good" : "health-bad"}`;
  document.getElementById(`${prefix}HealthText`).textContent = text;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

async function refreshDashboard() {
  const [healthResult, overviewResult] = await Promise.allSettled([
    fetch("/api/health").then(async response => ({ ok: response.ok, data: await response.json() })),
    adminFetch("/api/admin/overview")
  ]);

  if (healthResult.status === "fulfilled") {
    const health = healthResult.value;
    setHealth("api", health.ok, health.ok ? "Operational" : "Degraded");
    setHealth("db", health.data.database === "connected", health.data.database === "connected" ? "Connected" : "Unavailable");
  } else {
    setHealth("api", false, "Unavailable");
    setHealth("db", false, "Unknown");
  }

  if (overviewResult.status === "fulfilled") renderOverview(overviewResult.value);
  else document.getElementById("metricGrid").innerHTML = `<p class="admin-error">${escapeHtml(overviewResult.reason.message)}</p>`;

  document.getElementById("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderOverview(data) {
  const metrics = data.metrics;
  const cards = [
    ["Products", metrics.product_count, "bi-box-seam"],
    ["Customers", metrics.customer_count, "bi-people"],
    ["Open orders", metrics.open_order_count, "bi-receipt"],
    ["Gross sales", money(metrics.gross_sales), "bi-cash-stack"]
  ];
  document.getElementById("metricGrid").innerHTML = cards.map(([label, value, icon]) => `
    <article class="metric-card"><span><i class="bi ${icon}"></i> ${label}</span><strong>${escapeHtml(value)}</strong></article>
  `).join("");

  const orders = document.getElementById("recentOrders");
  orders.innerHTML = data.recent_orders.length ? data.recent_orders.map(order => `
    <tr><td>${escapeHtml(order.id)}</td><td>${escapeHtml(order.shipping_name)}</td><td><span class="status-label">${escapeHtml(order.status)}</span></td><td class="text-end">${money(order.total_amount)}</td></tr>
  `).join("") : `<tr><td colspan="4" class="empty-note">No orders yet.</td></tr>`;

  const alerts = document.getElementById("stockAlerts");
  alerts.innerHTML = data.stock_alerts.length ? data.stock_alerts.map(item => `
    <div class="stock-alert"><span>${escapeHtml(item.name)}</span><strong>${item.stock === 0 ? "Out of stock" : `${item.stock} left`}</strong></div>
  `).join("") : `<p class="empty-note">All products have healthy stock.</p>`;
}

async function loadCategories() {
  const data = await adminFetch("/api/admin/categories");
  document.getElementById("productCategory").innerHTML = data.categories.map(category =>
    `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`
  ).join("");
}

async function loadProducts() {
  const rows = document.getElementById("productRows");
  rows.innerHTML = `<tr><td colspan="6" class="empty-note">Loading products...</td></tr>`;
  try {
    const data = await adminFetch("/api/admin/products");
    rows.innerHTML = data.products.map(product => `
      <tr>
        <td><img class="product-image" src="${escapeHtml(product.image)}" alt="" onerror="this.hidden=true"><span>${escapeHtml(product.name)}</span></td>
        <td>${escapeHtml(product.category_id)}</td><td>${escapeHtml(product.brand)}</td>
        <td>${money(product.price)}</td><td><span class="status-label">${escapeHtml(product.stock_status)}</span></td>
        <td><button class="edit-product" type="button" data-edit-product="${product.id}" title="Edit product" aria-label="Edit ${escapeHtml(product.name)}"><i class="bi bi-pencil"></i></button></td>
      </tr>
    `).join("");
    rows.querySelectorAll("[data-edit-product]").forEach(button => {
      button.addEventListener("click", () => editProduct(data.products.find(item => item.id === Number(button.dataset.editProduct))));
    });
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="6" class="admin-error">${escapeHtml(error.message)}</td></tr>`;
  }
}

function resetProductForm(product = null) {
  document.getElementById("productForm").reset();
  const imagePreview = document.getElementById("productImagePreview");
  document.getElementById("productId").value = product?.id || "";
  document.getElementById("productModalTitle").textContent = product ? "Edit product" : "Add product";
  document.getElementById("saveProductButton").textContent = product ? "Save changes" : "Save product";
  imagePreview.hidden = !product?.image;
  imagePreview.src = product?.image || "";
  if (!product) return;
  document.getElementById("productName").value = product.name;
  document.getElementById("productCategory").value = product.category_id;
  document.getElementById("productBrand").value = product.brand;
  document.getElementById("productSubcategory").value = product.subcategory || "";
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productOriginalPrice").value = product.original_price;
  document.getElementById("productDiscount").value = product.discount;
  document.getElementById("productStock").value = product.stock;
  document.getElementById("productImage").value = product.image;
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productFeatures").value = (product.features || []).join("\n");
  document.getElementById("productSpecs").value = Object.entries(product.specifications || {}).map(([key, value]) => `${key}: ${value}`).join("\n");
}

async function editProduct(product) {
  await loadCategories();
  resetProductForm(product);
  document.getElementById("productFormError").textContent = "";
  productModal.show();
}

document.getElementById("addProductButton").addEventListener("click", async () => {
  await loadCategories();
  resetProductForm();
  document.getElementById("productFormError").textContent = "";
  productModal.show();
});

document.getElementById("productImage").addEventListener("input", event => {
  const preview = document.getElementById("productImagePreview");
  preview.src = event.target.value;
  preview.hidden = !event.target.value;
});

document.getElementById("productImageFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  const error = document.getElementById("productFormError");
  const preview = document.getElementById("productImagePreview");
  const fileInput = event.target;
  error.textContent = "";
  if (file.size > 5 * 1024 * 1024) {
    error.textContent = "Image uploads must be 5 MB or smaller.";
    fileInput.value = "";
    return;
  }

  const localPreview = URL.createObjectURL(file);
  preview.src = localPreview;
  preview.hidden = false;
  fileInput.disabled = true;
  try {
    const upload = new FormData();
    upload.append("image", file);
    const result = await adminFetch("/api/admin/uploads", { method: "POST", body: upload });
    document.getElementById("productImage").value = result.image;
    preview.src = result.image;
  } catch (uploadError) {
    error.textContent = uploadError.message;
    preview.hidden = true;
  } finally {
    URL.revokeObjectURL(localPreview);
    fileInput.disabled = false;
    fileInput.value = "";
  }
});

document.getElementById("productForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = document.getElementById("productId").value;
  const specifications = {};
  for (const line of document.getElementById("productSpecs").value.split("\n")) {
    const separator = line.indexOf(":");
    if (separator > 0) specifications[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  const payload = {
    name: document.getElementById("productName").value,
    category_id: document.getElementById("productCategory").value,
    brand: document.getElementById("productBrand").value,
    subcategory: document.getElementById("productSubcategory").value,
    price: document.getElementById("productPrice").value,
    original_price: document.getElementById("productOriginalPrice").value,
    discount: document.getElementById("productDiscount").value,
    stock: document.getElementById("productStock").value,
    image: document.getElementById("productImage").value,
    description: document.getElementById("productDescription").value,
    features: document.getElementById("productFeatures").value.split("\n").map(value => value.trim()).filter(Boolean),
    specifications
  };
  const error = document.getElementById("productFormError");
  error.textContent = "";
  const button = document.getElementById("saveProductButton");
  button.disabled = true;
  try {
    await adminFetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    productModal.hide();
    await Promise.all([loadProducts(), refreshDashboard()]);
  } catch (saveError) {
    error.textContent = saveError.message;
  } finally {
    button.disabled = false;
  }
});

if (sessionStorage.getItem(ADMIN_AUTH_KEY)) {
  adminFetch("/api/admin/session").then(showAdmin).catch(() => {});
}