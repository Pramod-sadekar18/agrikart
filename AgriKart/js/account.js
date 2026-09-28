/* ==========================================================================
   AgriKart - Account Area (Dashboard / Profile / Addresses)
   ========================================================================== */

function getUserProfile() {

    const user = getCurrentUser();

    return user || {};
}

function renderAccountSidebar(activePage) {
  const mount = document.getElementById("accountSidebar");
  if (!mount) return;
  const links = [
    { href: "account.html", icon: "bi-speedometer2", label: "Dashboard" },
    { href: "profile.html", icon: "bi-person", label: "My Profile" },
    { href: "orders.html", icon: "bi-bag-check", label: "My Orders" },
    { href: "wishlist.html", icon: "bi-heart", label: "Wishlist" },
    { href: "cart.html", icon: "bi-cart3", label: "Cart" },
    { href: "addresses.html", icon: "bi-geo-alt", label: "Addresses" },
    { href: "track-order.html", icon: "bi-truck", label: "Track Orders" },
    { href: "change-password.html", icon: "bi-shield-lock", label: "Change Password" },
  ];
  mount.innerHTML = `
    <div class="text-center mb-3 pb-3 border-bottom">
      <i class="bi bi-person-circle" style="font-size:3rem;color:var(--ak-green-600)"></i>
      <div class="fw-bold mt-1">${getUserProfile()?.name || "Guest"}</div>
      <div class="muted small">${getUserProfile()?.email || ""}</div>
    </div>
    ${links.map(l => `<a href="${l.href}" class="${l.href === activePage ? "active" : ""}"><i class="bi ${l.icon}"></i> ${l.label}</a>`).join("")}
    <a href="#" onclick="logoutUser(); location.href='index.html'" class="text-danger"><i class="bi bi-box-arrow-right"></i> Logout</a>
  `;
}

function initAccountDashboard() {
  const mount = document.getElementById("dashboardMount");
  if (!mount) return;
  if (!requireLogin("Please login to view your account.")) return;
  renderAccountSidebar("account.html");

  const orders = getOrders();
  const pending = orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length;
  const delivered = orders.filter(o => o.status === "Delivered").length;

  document.getElementById("dashGreeting").textContent = `Hello, ${getUserProfile().name}!`;
  document.getElementById("statTotalOrders").textContent = orders.length;
  document.getElementById("statPendingOrders").textContent = pending;
  document.getElementById("statDeliveredOrders").textContent = delivered;
  document.getElementById("statWishlistItems").textContent = getWishlistCount();

  const recentOrders = document.getElementById("recentOrdersList");
  recentOrders.innerHTML = orders.length
    ? orders.slice(0, 3).map(o => renderOrderRow(o)).join("")
    : `<p class="muted">No orders yet. <a href="products.html">Start shopping</a></p>`;

  const recentViewed = document.getElementById("dashRecentlyViewed");
  const viewed = getRecentlyViewed();
  recentViewed.innerHTML = viewed.length
    ? `<div class="row row-cols-2 row-cols-md-4 g-3">${viewed.map(renderProductCard).join("")}</div>`
    : `<p class="muted">No recently viewed products.</p>`;
}

// =========================================================
// PROFILE PAGE - MYSQL / FLASK
// =========================================================

async function initProfilePage() {

    const form = document.getElementById("profileForm");

    if (!form) return;

    if (!requireLogin("Please login to view your profile.")) {
        return;
    }

    renderAccountSidebar("profile.html");

    const user = getCurrentUser();

    if (!user || !user.id) {
        alert("User information not found. Please login again.");
        window.location.href = "login.html";
        return;
    }

    try {

        // -----------------------------------------
        // Get profile from MySQL
        // -----------------------------------------

        const response = await fetch(
            `http://127.0.0.1:5000/api/profile/${user.id}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            alert(data.message || "Failed to load profile.");
            return;
        }

        const profile = data.user;

        // Fill form
        form.name.value = profile.name || "";
        form.email.value = profile.email || "";
        form.mobile.value = profile.mobile || "";


        // -----------------------------------------
        // Update profile
        // -----------------------------------------

        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            const name = form.name.value.trim();
            const email = form.email.value.trim().toLowerCase();
            const mobile = form.mobile.value.trim();

            if (!name || !email) {

                alert("Name and email are required.");
                return;
            }

            const saveButton = form.querySelector(
                "button[type='submit']"
            );

            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = "Saving...";
            }

            try {

                const updateResponse = await fetch(
                    `http://127.0.0.1:5000/api/profile/${user.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            name: name,
                            email: email,
                            mobile: mobile
                        })
                    }
                );

                const updateData = await updateResponse.json();

                if (!updateResponse.ok || !updateData.success) {

                    alert(
                        updateData.message ||
                        "Failed to update profile."
                    );

                    return;
                }


                // Update stored user information
                localStorage.setItem(
                    "agrikart_user",
                    JSON.stringify(updateData.user)
                );

                sessionStorage.setItem(
                    "agrikart_user",
                    JSON.stringify(updateData.user)
                );


                // Update navbar/sidebar
                renderNavbar();
                renderAccountSidebar("profile.html");

                alert("Profile updated successfully.");

            } catch (error) {

                console.error("Profile Update Error:", error);

                alert(
                    "Cannot connect to server. Make sure Flask is running."
                );

            } finally {

                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = "Save Changes";
                }
            }

        });

    } catch (error) {

        console.error("Profile Load Error:", error);

        alert(
            "Cannot connect to server. Make sure Flask is running."
        );
    }
}

function initAddressesPage() {
  const mount = document.getElementById("addressList");
  if (!mount) return;

  if (!requireLogin("Please login to view your addresses.")) return;

  renderAccountSidebar("addresses.html");

  const user = getCurrentUser();
  if (!user || !user.id) return;

  const API = "http://127.0.0.1:5000/api/addresses";
  let addresses = [];

  const modalEl = document.getElementById("addressModal");
  const modal = new bootstrap.Modal(modalEl);
  const addrForm = document.getElementById("addressForm");

  // LOAD ADDRESSES FROM MYSQL
  async function loadAddresses() {
    try {
      const response = await fetch(`${API}/${user.id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load addresses");
      }

      addresses = data.addresses.map(a => ({
        ...a,
        isDefault: Boolean(a.is_default)
      }));

      render();
    } catch (error) {
      console.error(error);

      mount.innerHTML = `
        <div class="alert alert-danger">
          Failed to load addresses.
        </div>
      `;
    }
  }

  // DISPLAY ADDRESSES
  function render() {
    mount.innerHTML = addresses.length
      ? addresses.map(a => `
        <div class="address-card ${a.isDefault ? "default" : ""} mb-3">

          <div class="d-flex justify-content-between">
            <span class="badge text-bg-light">${a.type}</span>

            ${a.isDefault
              ? '<span class="badge bg-success">Default</span>'
              : ""}
          </div>

          <div class="fw-semibold mt-2">
            ${a.name} &middot; ${a.mobile}
          </div>

          <div class="muted small">
            ${a.address}, ${a.city}, ${a.state} - ${a.pincode}
          </div>

          <div class="mt-2 d-flex gap-2">

            <button
              class="btn btn-sm btn-outline-brand"
              onclick="editAddress(${a.id})">
              Edit
            </button>

            <button
              class="btn btn-sm btn-outline-danger"
              onclick="removeAddress(${a.id})">
              Delete
            </button>

            ${!a.isDefault
              ? `<button
                   class="btn btn-sm btn-link"
                   onclick="makeDefault(${a.id})">
                   Set as Default
                 </button>`
              : ""}
          </div>

        </div>
      `).join("")
      : `
        <div class="empty-state">
          <i class="bi bi-geo-alt"></i>
          <h5>No saved addresses</h5>
        </div>
      `;
  }

  // ADD NEW ADDRESS
  document.getElementById("addAddressBtn").addEventListener("click", () => {

    addrForm.reset();
    addrForm.dataset.editId = "";

    document.getElementById("addressModalTitle").textContent =
      "Add New Address";

    modal.show();
  });

  // ADD / EDIT
  addrForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      user_id: user.id,
      type: addrForm.type.value,
      name: addrForm.name.value.trim(),
      mobile: addrForm.mobile.value.trim(),
      address: addrForm.address.value.trim(),
      city: addrForm.city.value.trim(),
      state: addrForm.state.value.trim(),
      pincode: addrForm.pincode.value.trim(),
      is_default: false
    };

    if (
      !data.name ||
      !data.mobile ||
      !data.address ||
      !data.city ||
      !data.state ||
      !data.pincode
    ) {
      toast("Please fill all fields", "error");
      return;
    }

    try {
      let response;

      if (addrForm.dataset.editId) {

        // EDIT
        const id = Number(addrForm.dataset.editId);

        const oldAddress = addresses.find(a => a.id === id);

        data.is_default = oldAddress
          ? oldAddress.isDefault
          : false;

        response = await fetch(`${API}/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });

      } else {

        // ADD
        data.is_default = addresses.length === 0;

        response = await fetch(API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Address save failed");
      }

      modal.hide();

      toast(
        addrForm.dataset.editId
          ? "Address updated successfully"
          : "Address added successfully"
      );

      await loadAddresses();

    } catch (error) {
      console.error(error);
      toast(error.message || "Something went wrong", "error");
    }
  });

  // EDIT ADDRESS
  window.editAddress = (id) => {

    const a = addresses.find(x => x.id === id);

    if (!a) return;

    addrForm.type.value = a.type;
    addrForm.name.value = a.name;
    addrForm.mobile.value = a.mobile;
    addrForm.address.value = a.address;
    addrForm.city.value = a.city;
    addrForm.state.value = a.state;
    addrForm.pincode.value = a.pincode;

    addrForm.dataset.editId = id;

    document.getElementById("addressModalTitle").textContent =
      "Edit Address";

    modal.show();
  };

  // DELETE ADDRESS
  window.removeAddress = async (id) => {

    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/${id}?user_id=${user.id}`,
        {
          method: "DELETE"
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Delete failed");
      }

      toast("Address deleted successfully");

      await loadAddresses();

    } catch (error) {
      console.error(error);
      toast(error.message || "Delete failed", "error");
    }
  };

  // SET DEFAULT ADDRESS
  window.makeDefault = async (id) => {

    try {
      const response = await fetch(
        `${API}/${id}/default`,
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

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to set default");
      }

      toast("Default address updated");

      await loadAddresses();

    } catch (error) {
      console.error(error);
      toast(error.message || "Something went wrong", "error");
    }
  };

  // FIRST LOAD
  loadAddresses();
}

// =========================================================
// CHANGE PASSWORD PAGE - MYSQL / FLASK
// =========================================================

async function initChangePasswordPage() {

    const form = document.getElementById("changePasswordForm");

    if (!form) return;

    if (!requireLogin("Please login to change your password.")) {
        return;
    }

    renderAccountSidebar("change-password.html");

    const user = getCurrentUser();

    if (!user || !user.id) {
        alert("User information not found. Please login again.");
        window.location.href = "login.html";
        return;
    }

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const currentPassword = form.currentPassword.value.trim();
        const newPassword = form.newPassword.value.trim();
        const confirmPassword = form.confirmPassword.value.trim();

        // Check empty fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert("Please fill all fields.");
            return;
        }

        // Check new password and confirm password
        if (newPassword !== confirmPassword) {
            alert("New password and confirm password do not match.");
            return;
        }

        // Prevent same password
        if (currentPassword === newPassword) {
            alert("New password must be different from current password.");
            return;
        }

        const changeButton = form.querySelector(
            "button[type='submit']"
        );

        if (changeButton) {
            changeButton.disabled = true;
            changeButton.textContent = "Changing...";
        }

        try {

            const response = await fetch(
                "http://127.0.0.1:5000/api/change-password",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {

                alert(
                    data.message ||
                    "Failed to change password."
                );

                return;
            }

            alert("Password changed successfully.");

            form.reset();

        } catch (error) {

            console.error("Change Password Error:", error);

            alert(
                "Cannot connect to server. Make sure Flask is running."
            );

        } finally {

            if (changeButton) {
                changeButton.disabled = false;
                changeButton.textContent = "Change Password";
            }
        }
    });
}