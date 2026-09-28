/* ==========================================================================
   AgriKart - Product Browsing (Home / Products / Category / Search / Details)
   ========================================================================== */

function qs(param) {
  return new URLSearchParams(location.search).get(param);
}


/* ---------------- Home Page ---------------- */

async function initHomePage() {

  // Wait for products from Flask API
  await loadProductsFromAPI();

  const catMount = document.getElementById("homeCategories");

  if (catMount) {
    catMount.innerHTML = getCategories().map(c => `
      <div class="col-6 col-md-3 col-lg-2">
        <a href="category.html?cat=${c.id}" class="cat-tile d-block text-decoration-none">
          <i class="bi ${c.icon}"></i>
          <div class="fw-semibold small">${c.name}</div>
        </a>
      </div>
    `).join("");
  }


  const featured = document.getElementById("featuredProducts");

  if (featured) {
    featured.innerHTML = getProducts({ sort: "rating-desc" })
      .slice(0, 8)
      .map(renderProductCard)
      .join("");
  }


  const bestSelling = document.getElementById("bestSellingProducts");

  if (bestSelling) {

    const list = [...getProducts()]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 8);

    bestSelling.innerHTML = list
      .map(renderProductCard)
      .join("");
  }


  const deals = document.getElementById("todaysDeals");

  if (deals) {

    const list = [...getProducts()]
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 8);

    deals.innerHTML = list
      .map(renderProductCard)
      .join("");
  }


  const recentMount = document.getElementById("recentlyViewedProducts");

  if (recentMount) {

    const list = getRecentlyViewed();
    const section = document.getElementById("recentlyViewedSection");

    if (list.length === 0) {

      section?.classList.add("d-none");

    } else {

      section?.classList.remove("d-none");

      recentMount.innerHTML = list
        .map(renderProductCard)
        .join("");
    }
  }
}


/* ---------------- Shared Filter State ---------------- */

function readFiltersFromUI(container) {

  const filters = {};

  const min = container
    .querySelector("#filterMinPrice")?.value;

  const max = container
    .querySelector("#filterMaxPrice")?.value;

  if (min) {
    filters.minPrice = Number(min);
  }

  if (max) {
    filters.maxPrice = Number(max);
  }


  const rating = container
    .querySelector('input[name="filterRating"]:checked')?.value;

  if (rating) {
    filters.minRating = Number(rating);
  }


  const brands = [
    ...container.querySelectorAll(
      'input[name="filterBrand"]:checked'
    )
  ].map(el => el.value);

  if (brands.length) {
    filters.brands = brands;
  }


  const inStock = container
    .querySelector("#filterInStock")?.checked;

  if (inStock) {
    filters.inStockOnly = true;
  }


  const sort = container
    .querySelector("#sortSelect")?.value;

  if (sort) {
    filters.sort = sort;
  }


  return filters;
}


/* ---------------- Brand Filter ---------------- */

function buildBrandFilterHTML() {

  return getBrands()
    .map(b => `
      <div class="form-check">
        <input
          class="form-check-input"
          type="checkbox"
          name="filterBrand"
          value="${b}"
          id="brand-${b}"
        >

        <label
          class="form-check-label"
          for="brand-${b}"
        >
          ${b}
        </label>
      </div>
    `)
    .join("");
}


/* ---------------- Filter Sidebar ---------------- */

function renderFilterSidebar(mountId) {

  const mount = document.getElementById(mountId);

  if (!mount) {
    return;
  }


  mount.innerHTML = `
    <div class="filter-box">

      <div class="d-flex justify-content-between align-items-center">

        <h6 class="mb-0">
          Filters
        </h6>

        <button
          class="btn btn-sm btn-link text-decoration-none"
          id="clearFiltersBtn"
        >
          Clear all
        </button>

      </div>


      <h6>Price Range</h6>

      <div class="d-flex gap-2">

        <input
          type="number"
          class="form-control form-control-sm"
          id="filterMinPrice"
          placeholder="Min"
        >

        <input
          type="number"
          class="form-control form-control-sm"
          id="filterMaxPrice"
          placeholder="Max"
        >

      </div>


      <h6>Customer Rating</h6>

      ${[4, 3, 2].map(r => `
        <div class="form-check">

          <input
            class="form-check-input"
            type="radio"
            name="filterRating"
            value="${r}"
            id="rating-${r}"
          >

          <label
            class="form-check-label"
            for="rating-${r}"
          >
            ${r}★ & above
          </label>

        </div>
      `).join("")}


      <h6>Brand</h6>

      ${buildBrandFilterHTML()}


      <h6>Availability</h6>

      <div class="form-check">

        <input
          class="form-check-input"
          type="checkbox"
          id="filterInStock"
        >

        <label
          class="form-check-label"
          for="filterInStock"
        >
          In Stock Only
        </label>

      </div>


      <button
        class="btn btn-brand w-100 mt-3"
        id="applyFiltersBtn"
      >
        Apply Filters
      </button>

    </div>
  `;
}


/* ---------------- Products Listing Page ---------------- */

async function initProductsPage() {

  const grid = document.getElementById("productGrid");

  if (!grid) {
    return;
  }


  // IMPORTANT:
  // Wait until Flask API finishes loading products
  await loadProductsFromAPI();


  renderFilterSidebar("filterSidebar");


  let baseFilters = {};

  const catParam = qs("cat");

  if (catParam) {
    baseFilters.category = catParam;
  }


  function render() {

    const uiFilters = readFiltersFromUI(document);

    const filters = {
      ...baseFilters,
      ...uiFilters
    };


    const results = getProducts(filters);


    const resultCount =
      document.getElementById("resultCount");

    if (resultCount) {
      resultCount.textContent = results.length;
    }


    grid.innerHTML = results.length

      ? results
          .map(renderProductCard)
          .join("")

      : `
        <div class="empty-state col-12">

          <i class="bi bi-emoji-frown"></i>

          <h5>
            No products found
          </h5>

          <p>
            Try adjusting your filters.
          </p>

        </div>
      `;
  }


  document
    .getElementById("applyFiltersBtn")
    ?.addEventListener("click", render);


  document
    .getElementById("sortSelect")
    ?.addEventListener("change", render);


  document
    .getElementById("clearFiltersBtn")
    ?.addEventListener("click", () => {

      document
        .querySelectorAll("#filterSidebar input")
        .forEach(el => {

          if (
            el.type === "checkbox" ||
            el.type === "radio"
          ) {
            el.checked = false;
          } else {
            el.value = "";
          }

        });

      render();
    });


  document
    .querySelectorAll(".view-toggle")
    .forEach(btn => {

      btn.addEventListener("click", () => {

        document
          .querySelectorAll(".view-toggle")
          .forEach(b =>
            b.classList.remove("active")
          );

        btn.classList.add("active");

        grid.classList.toggle(
          "list-view",
          btn.dataset.view === "list"
        );

      });

    });


  // Initial render AFTER API data is loaded
  render();
}


/* ---------------- Category Page ---------------- */

async function initCategoryPage() {

  const catId = qs("cat");

  const category = getCategoryById(catId);

  const banner =
    document.getElementById("categoryBanner");


  if (!category) {

    if (banner) {

      banner.innerHTML = `
        <div class="empty-state">

          <i class="bi bi-search"></i>

          <h5>
            Category not found
          </h5>

        </div>
      `;
    }

    return;
  }


  if (banner) {

    banner.innerHTML = `
      <h1 class="section-title mb-1">

        <i class="bi ${category.icon} text-green"></i>

        ${category.name}

      </h1>

      <p class="muted">
        ${category.desc}
      </p>
    `;
  }


  document.title =
    category.name + " - AgriKart";


  // Load products from Flask API
  await initProductsPage();
}


/* ---------------- Search Page ---------------- */

async function initSearchPage() {

  const query = qs("q") || "";


  const heading =
    document.getElementById("searchHeading");

  const input =
    document.getElementById("searchPageInput");


  if (input) {
    input.value = query;
  }


  if (heading) {

    heading.textContent = query
      ? `Search results for "${query}"`
      : "Search Products";
  }


  const grid =
    document.getElementById("productGrid");


  if (!grid) {
    return;
  }


  // IMPORTANT:
  // Wait for Flask API data
  await loadProductsFromAPI();


  renderFilterSidebar("filterSidebar");


  function render() {

    const uiFilters =
      readFiltersFromUI(document);


    const q =
      input ? input.value : query;


    const results =
      getProducts({
        ...uiFilters,
        query: q
      });


    const resultCount =
      document.getElementById("resultCount");


    if (resultCount) {
      resultCount.textContent =
        results.length;
    }


    grid.innerHTML = results.length

      ? results
          .map(renderProductCard)
          .join("")

      : `
        <div class="empty-state col-12">

          <i class="bi bi-search"></i>

          <h5>
            No results for "${q}"
          </h5>

          <p>
            Try searching with different keywords.
          </p>

        </div>
      `;
  }


document
  .getElementById("searchPageForm")
  ?.addEventListener("submit", e => {

    e.preventDefault();

    const searchValue =
      input ? input.value.trim().toLowerCase() : "";

    // All Products search
    if (searchValue === "all products") {
      window.location.href = "products.html";
      return;
    }

    render();
  });


  document
    .getElementById("applyFiltersBtn")
    ?.addEventListener("click", render);


  document
    .getElementById("sortSelect")
    ?.addEventListener("change", render);


  render();
}


/* ---------------- Product Details Page ---------------- */

async function initProductDetailsPage() {

  const mount =
    document.getElementById("productDetailsMount");


  if (!mount) {
    return;
  }


  // IMPORTANT:
  // Wait for Flask API before getting product
  await loadProductsFromAPI();


  const productId =
    Number(qs("id"));


  // Get product from API-loaded data
  const product =
    API_PRODUCTS.find(
      p => p.id === productId
    );


  if (!product) {

    mount.innerHTML = `
      <div class="empty-state">

        <i class="bi bi-box-seam"></i>

        <h5>
          Product not found
        </h5>

        <a
          href="products.html"
          class="btn btn-brand mt-2"
        >
          Browse Products
        </a>

      </div>
    `;

    return;
  }


  addRecentlyViewed(product.id);


  document.title =
    product.name + " - AgriKart";


  mount.innerHTML = `

    <nav aria-label="breadcrumb">

      <ol class="breadcrumb">

        <li class="breadcrumb-item">
          <a href="index.html">
            Home
          </a>
        </li>

        <li class="breadcrumb-item">

          <a href="category.html?cat=${product.category}">
            ${product.category.replace("-", " ")}
          </a>

        </li>

        <li class="breadcrumb-item active">
          ${product.name}
        </li>

      </ol>

    </nav>


    <div class="row g-4">

      <div class="col-lg-5">

        <div
          class="pc-img-wrap rounded-ak border p-4"
          style="aspect-ratio:1/1;"
        >

          <img
            src="${product.image}"
            alt="${product.name}"
            class="img-fluid"
            style="max-height:100%;"
          >

        </div>

      </div>


      <div class="col-lg-7">

        <div class="muted text-uppercase small">
          ${product.brand}
        </div>


        <h2 class="fw-bold">
          ${product.name}
        </h2>


        <div class="d-flex align-items-center gap-2 mb-2">

          <span class="rating-pill">

            ${product.rating}

            <i
              class="bi bi-star-fill"
              style="font-size:.65rem"
            ></i>

          </span>


          <span class="muted small">

            ${product.reviewCount}
            reviews

          </span>

        </div>


        <div class="d-flex align-items-center gap-2 mb-1">

          <span class="fs-4 fw-bold text-green">

            ${formatPrice(product.price)}

          </span>


          <span class="price-strike fs-6">

            ${formatPrice(product.originalPrice)}

          </span>


          <span class="discount-badge">

            ${product.discount}% off

          </span>

        </div>


        <span
          class="stock-badge ${
            product.stock === 0
              ? "out"
              : product.stock <= 5
                ? "low"
                : "in"
          }"
        >

          ${product.stockStatus}

        </span>


        <p class="mt-3">
          ${product.description}
        </p>


        <div class="d-flex align-items-center gap-3 my-3">

          <label class="fw-semibold mb-0">
            Qty:
          </label>


          <div class="qty-control">

            <button
              type="button"
              onclick="pdChangeQty(-1)"
            >
              <i class="bi bi-dash"></i>
            </button>


            <span id="pdQty">
              1
            </span>


            <button
              type="button"
              onclick="pdChangeQty(1)"
            >
              <i class="bi bi-plus"></i>
            </button>

          </div>

        </div>


        <div class="d-flex flex-wrap gap-2">

          <button
            class="btn btn-brand px-4"
            ${product.stock === 0 ? "disabled" : ""}
            onclick="addToCart(${product.id}, pdGetQty())"
          >

            <i class="bi bi-cart-plus"></i>
            Add to Cart

          </button>


          <button
            class="btn btn-accent px-4"
            ${product.stock === 0 ? "disabled" : ""}
            onclick="addToCart(${product.id}, pdGetQty()); location.href='checkout.html'"
          >

            Buy Now

          </button>


          <button
            class="btn btn-outline-brand"
            onclick="toggleWishlist(${product.id}); this.classList.toggle('active')"
          >

            <i class="bi ${
              isWishlisted(product.id)
                ? "bi-heart-fill"
                : "bi-heart"
            }"></i>

            Wishlist

          </button>

        </div>


        <hr>


        <div class="row small">

          <div class="col-6">
            <strong>Manufactured:</strong>
            ${product.manufacturingDate}
          </div>

          <div class="col-6">
            <strong>Expiry:</strong>
            ${product.expiryDate}
          </div>

          <div class="col-6">
            <strong>Seller:</strong>
            ${product.seller}
          </div>

          <div class="col-6">
            <strong>Category:</strong>
            ${product.subcategory}
          </div>

        </div>

      </div>

    </div>


    <ul
      class="nav nav-tabs mt-5"
      id="pdTabs"
    >

      <li class="nav-item">

        <button
          class="nav-link active"
          data-bs-toggle="tab"
          data-bs-target="#pdFeatures"
        >
          Key Features
        </button>

      </li>


      <li class="nav-item">

        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#pdSpecs"
        >
          Specifications
        </button>

      </li>


      <li class="nav-item">

        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#pdReviews"
        >
          Reviews (${product.reviewCount})
        </button>

      </li>

    </ul>


    <div
      class="tab-content border border-top-0 p-4 rounded-bottom-ak"
    >

      <div
        class="tab-pane fade show active"
        id="pdFeatures"
      >

        <ul>

          ${product.features
            .map(f => `<li>${f}</li>`)
            .join("")}

        </ul>

      </div>


      <div
        class="tab-pane fade"
        id="pdSpecs"
      >

        <table class="table table-sm w-auto">

          ${
            Object.entries(product.specifications)
              .map(
                ([k, v]) =>
                  `<tr>
                    <th>${k}</th>
                    <td>${v}</td>
                  </tr>`
              )
              .join("")
          }

        </table>

      </div>


      <div
        class="tab-pane fade"
        id="pdReviews"
      >

        ${
          [
            {
              n: "Ramesh K.",
              r: 5,
              c: "Great quality, delivered on time!"
            },
            {
              n: "Sunita P.",
              r: 4,
              c: "Works well, value for money."
            }
          ]
            .map(
              rv => `
                <div class="mb-3 pb-3 border-bottom">

                  <div class="d-flex justify-content-between">

                    <strong>
                      ${rv.n}
                    </strong>

                    ${renderStars(rv.r)}

                  </div>

                  <p class="mb-0 small muted">
                    ${rv.c}
                  </p>

                </div>
              `
            )
            .join("")
        }

      </div>

    </div>


    <h4 class="section-title mt-5">
      Related Products
    </h4>


    <div
      class="row row-cols-2 row-cols-md-4 g-3"
      id="relatedProducts"
    ></div>

  `;


  // Related products from API data
  const relatedProducts =
    API_PRODUCTS
      .filter(
        p =>
          p.category === product.category &&
          p.id !== product.id
      )
      .slice(0, 4);


  const relatedMount =
    document.getElementById("relatedProducts");


  if (relatedMount) {

    relatedMount.innerHTML =
      relatedProducts
        .map(renderProductCard)
        .join("");
  }
}


/* ---------------- Product Detail Quantity ---------------- */

let _pdQty = 1;


function pdChangeQty(delta) {

  _pdQty =
    Math.max(1, _pdQty + delta);


  const qtyElement =
    document.getElementById("pdQty");


  if (qtyElement) {
    qtyElement.textContent = _pdQty;
  }
}


function pdGetQty() {
  return _pdQty;
}