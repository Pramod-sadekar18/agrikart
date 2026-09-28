/* ==========================================================================
   AgriKart - Mock Data Layer
   All data here simulates what will later come from a backend API.
   Replace the body of each get*() function with a fetch() call when the
   backend is ready — the function signatures/return shapes should stay
   the same so the rest of the app keeps working.
   ========================================================================== */

const CATEGORIES = [
  { id: "seeds", name: "Seeds", icon: "bi-flower1", desc: "High-germination, disease-resistant seeds for every season." },
  { id: "fertilizers", name: "Fertilizers", icon: "bi-moisture", desc: "Balanced nutrition for stronger, healthier crops." },
  { id: "pesticides", name: "Pesticides", icon: "bi-bug", desc: "Effective control against pests that damage your yield." },
  { id: "crop-protection", name: "Crop Protection", icon: "bi-shield-check", desc: "Protect your crops from disease, weather and weeds." },
  { id: "farming-tools", name: "Farming Tools", icon: "bi-tools", desc: "Durable hand tools built for daily farm work." },
  { id: "agri-equipment", name: "Agricultural Equipment", icon: "bi-gear-wide-connected", desc: "Machinery and equipment to scale your operations." },
  { id: "irrigation", name: "Irrigation", icon: "bi-droplet", desc: "Smart water delivery systems for efficient farming." },
  { id: "plant-care", name: "Plant Care", icon: "bi-flower3", desc: "Growth boosters and care essentials for healthy plants." },
  { id: "organic", name: "Organic Products", icon: "bi-leaf", desc: "100% organic and chemical-free farming inputs." },
  { id: "gardening", name: "Gardening Supplies", icon: "bi-basket3", desc: "Everything you need for home and kitchen gardens." }
];

const PRODUCTS = [
  p(1,"Hybrid Tomato Seeds (50g)","seeds","Vegetable Seeds","AgriGrow",149,199,25,4.3,128,"assets/images/tomato-seeds.jpg","High-yield hybrid tomato seeds suited for tropical and sub-tropical climates.",["Germination rate 90%+","Disease resistant","Suitable for all seasons"],{"Weight":"50g","Type":"Hybrid","Shelf Life":"12 months"}),
  p(2,"Premium Onion Seeds (100g)","seeds","Vegetable Seeds","FarmFresh",199,249,20,4.1,94,"assets/images/onion.jpg","Long-storage onion variety with uniform bulb size.",["High yield","Long storage life","Uniform size"],{"Weight":"100g","Type":"Open Pollinated"}),
  p(3,"Wheat Seeds HD-2967 (5kg)","seeds","Grain Seeds","KisanBeej",549,649,15,4.5,210,"assets/images/wheat.jpg","Certified wheat seeds with high disease resistance and good grain quality.",["Rust resistant","High tillering","Good grain quality"],{"Weight":"5kg","Variety":"HD-2967"}),
  p(4,"Bt Cotton Seeds (475g)","seeds","Cash Crop Seeds","CottonKing",799,899,11,4.2,76,"assets/images/cotton.jpg","Bollworm resistant Bt cotton seed with strong boll retention.",["Bollworm resistant","High fiber quality"],{"Pack Size":"475g"}),
  p(5,"Okra (Bhindi) Seeds (250g)","seeds","Vegetable Seeds","AgriGrow",99,129,23,4.0,52,"assets/images/okra.jpg","Fast growing okra seeds ideal for home and commercial farming.",["Fast germination","High yield"],{"Weight":"250g"}),
  p(6,"NPK 19:19:19 Fertilizer (25kg)","fertilizers","Chemical Fertilizer","GrowMax",1299,1499,13,4.4,167,"assets/images/fertilizer.jpg","Balanced water-soluble NPK fertilizer for all crop stages.",["Water soluble","Balanced nutrition","Boosts flowering & fruiting"],{"Weight":"25kg","Type":"Water Soluble"}),
  p(7,"Urea Fertilizer (45kg Bag)","fertilizers","Chemical Fertilizer","IndiaAgri",266,299,11,4.2,301,"assets/images/urea_fertilizer.jpg","High nitrogen content urea for vigorous vegetative growth.",["46% Nitrogen","Prilled form"],{"Weight":"45kg"}),
  p(8,"DAP Fertilizer (50kg)","fertilizers","Chemical Fertilizer","IndiaAgri",1350,1450,7,4.3,143,"assets/images/DAP_fertilizer.jpg","Di-ammonium Phosphate for strong root development.",["High phosphorus","Root development"],{"Weight":"50kg"}),
  p(9,"Organic Compost (10kg)","fertilizers","Organic Fertilizer","EcoFarm",349,399,13,4.6,220,"assets/images/compost.jpg","Fully decomposed organic compost enriched with micronutrients.",["100% Organic","Improves soil health"],{"Weight":"10kg"}),
  p(10,"Vermicompost (5kg)","organic","Organic Fertilizer","EcoFarm",249,299,17,4.5,188,"assets/images/Vermicompost.jpg","Nutrient-rich vermicompost made from earthworm castings.",["Rich in micronutrients","Improves soil texture"],{"Weight":"5kg"}),
  p(11,"Neem Oil Concentrate (1L)","organic","Bio Pesticide","NeemPure",349,449,22,4.4,159,"assets/images/neem.jpg","Cold-pressed neem oil, a natural pesticide and fungicide.",["Cold pressed","Multi-purpose"],{"Volume":"1L"}),
  p(12,"Bio Pesticide Spray (500ml)","pesticides","Bio Pesticide","EcoFarm",299,349,14,4.1,88,"assets/images/pesticide.jpg","Plant-based bio pesticide safe for beneficial insects.",["Eco-friendly","Safe for pollinators"],{"Volume":"500ml"}),
  p(13,"Chlorpyrifos 20% EC (1L)","pesticides","Insecticide","AgroChem",449,529,15,4.0,63,"assets/images/Agriculture.jpg","Broad spectrum insecticide for effective pest control.",["Broad spectrum","Fast acting"],{"Volume":"1L"}),
  p(14,"Mancozeb Fungicide (1kg)","crop-protection","Fungicide","AgroChem",389,449,13,4.2,74,"assets/images/fungicide.jpg","Protective fungicide against a wide range of fungal diseases.",["Broad spectrum","Protective action"],{"Weight":"1kg"}),
  p(15,"Glyphosate Weedicide (1L)","crop-protection","Herbicide","WeedOut",329,389,15,4.0,55,"assets/images/weedicide.jpg","Systemic herbicide for effective weed control.",["Systemic action","Non-selective"],{"Volume":"1L"}),
  p(16,"Hand Cultivator (3 Prong)","farming-tools","Hand Tools","FarmPro",199,249,20,4.3,142,"assets/images/Farming_tool.jpg","Sturdy steel hand cultivator for loosening soil and weeding.",["Rust-resistant steel","Ergonomic handle"],{"Material":"Carbon Steel"}),
  p(17,"Pruning Shears","farming-tools","Hand Tools","FarmPro",249,299,17,4.5,201,"assets/images/purning.jpg","Sharp bypass pruning shears for clean cuts on branches and stems.",["Sharp SK5 blade","Non-slip grip"],{"Material":"SK5 Steel"}),
  p(18,"Garden Spade","farming-tools","Hand Tools","FarmPro",349,399,13,4.2,98,"assets/images/spade.jpg","Heavy-duty digging spade with a comfortable D-grip handle.",["Heavy duty","D-grip handle"],{"Material":"Carbon Steel"}),
  p(19,"Manual Seed Sower","farming-tools","Hand Tools","AgriGrow",449,549,18,4.1,47,"assets/images/seeds.jpg","Adjustable manual seed sower for uniform seed spacing.",["Adjustable spacing","Lightweight"],{"Type":"Manual"}),
  p(20,"Knapsack Agricultural Sprayer (16L)","agri-equipment","Sprayers","AgroTech",1899,2299,17,4.4,176,"assets/images/sprayer.jpg","Manual knapsack sprayer with adjustable nozzle for pesticide application.",["16L capacity","Adjustable nozzle"],{"Capacity":"16L"}),
  p(21,"Battery Operated Sprayer (12L)","agri-equipment","Sprayers","AgroTech",2999,3499,14,4.3,112,"assets/images/fertilizer.jpg","Rechargeable battery sprayer for effortless, uniform spraying.",["Rechargeable battery","Uniform coverage"],{"Capacity":"12L"}),
  p(22,"Brush Cutter (2 Stroke)","agri-equipment","Power Tools","AgroTech",6499,7499,13,4.2,84,"assets/images/cutter.jpg","Powerful 2-stroke brush cutter for clearing grass and weeds.",["High power engine","Multiple blade options"],{"Engine":"2-Stroke"}),
  p(23,"Mini Power Tiller","agri-equipment","Machinery","AgroTech",34999,38999,10,4.5,39,"assets/images/equipment.jpg","Compact power tiller ideal for small and medium farms.",["Compact design","Fuel efficient"],{"Type":"Diesel"}),
  p(24,"Drip Irrigation Kit (1 Acre)","irrigation","Irrigation Kits","AquaFarm",4499,5499,18,4.6,133,"assets/images/drip.jpg","Complete drip irrigation kit for efficient water usage.",["Covers 1 acre","Water efficient"],{"Coverage":"1 Acre"}),
  p(25,"Sprinkler Irrigation Set","irrigation","Irrigation Kits","AquaFarm",2299,2699,15,4.3,97,"assets/images/sprinkler.jpg","Rotating sprinkler set for even water distribution.",["360° rotation","Easy installation"],{"Coverage":"0.5 Acre"}),
  p(26,"Submersible Water Pump (1HP)","irrigation","Water Pumps","AquaFarm",5499,6299,13,4.4,71,"assets/images/pump.jpg","Reliable submersible pump for borewell irrigation.",["1HP motor","Corrosion resistant"],{"Power":"1HP"}),
  p(27,"Garden Hose Pipe (30m)","irrigation","Accessories","AquaFarm",699,849,18,4.1,64,"assets/images/hose.jpg","Flexible, kink-resistant hose pipe for garden watering.",["Kink resistant","UV protected"],{"Length":"30m"}),
  p(28,"Plant Growth Booster (500ml)","plant-care","Growth Promoters","GrowMax",299,349,14,4.3,119,"assets/images/plant.jpg","Concentrated growth booster for faster, healthier plant growth.",["Boosts root & shoot growth","Suitable for all plants"],{"Volume":"500ml"}),
  p(29,"Micronutrient Mixture (1kg)","plant-care","Nutrients","GrowMax",399,459,13,4.2,88,"assets/images/mixture.jpg","Balanced micronutrient mix to correct plant deficiencies.",["Corrects deficiencies","Improves yield"],{"Weight":"1kg"}),
  p(30,"Grafting Wax (200g)","plant-care","Plant Care","FarmPro",149,179,17,4.0,34,"assets/images/wax.jpg","Protective wax for grafting and pruning wounds.",["Waterproof seal","Promotes healing"],{"Weight":"200g"}),
  p(31,"Ceramic Planter Pots (Set of 3)","gardening","Pots & Planters","HomeGrown",599,799,25,4.5,152,"assets/images/pots.jpg","Stylish ceramic planters ideal for home and balcony gardens.",["Drainage holes","Weather resistant"],{"Set":"3 pieces"}),
  p(32,"Coco Peat Growing Medium (5kg)","gardening","Growing Media","HomeGrown",249,299,17,4.4,101,"assets/images/peat.jpg","Lightweight, water-retentive coco peat block for potting.",["High water retention","Eco-friendly"],{"Weight":"5kg (compressed)"}),
  p(33,"Garden Gloves (Pack of 2)","gardening","Accessories","HomeGrown",199,249,20,4.2,77,"assets/images/gloves.jpg","Durable, breathable gloves to protect hands while gardening.",["Breathable fabric","Reinforced fingertips"],{"Pack":"2 pairs"}),
  p(34,"Organic Neem Cake Fertilizer (5kg)","organic","Organic Fertilizer","EcoFarm",329,379,13,4.5,90,"assets/images/cake.jpg","Natural soil conditioner and organic pest deterrent.",["Improves soil fertility","Repels soil pests"],{"Weight":"5kg"})
];

function p(id,name,category,subcategory,brand,price,originalPrice,discount,rating,reviewCount,image,description,features,specifications){
  const stock = (id % 7 === 0) ? 0 : (id % 5 === 0 ? 4 : 25);
  return {
    id, name, category, subcategory, brand, price, originalPrice, discount, rating, reviewCount,
    stock, stockStatus: stock === 0 ? "Out of Stock" : (stock <= 5 ? "Only " + stock + " left" : "In Stock"),
    image, description, features, specifications,
    manufacturingDate: "2026-01-15", expiryDate: "2028-01-15", seller: "AgriKart Fulfilled"
  };
}
// ============================================================
// Flask Backend API
// ============================================================

const API_BASE_URL = "/api";

let API_PRODUCTS = [];
let productsLoaded = false;

async function loadProductsFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    // Convert MySQL/API format to existing frontend format
    API_PRODUCTS = (data.products || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category_id,
      subcategory: p.subcategory,
      brand: p.brand,
      price: Number(p.price),
      originalPrice: Number(p.original_price),
      discount: Number(p.discount),
      rating: Number(p.rating),
      reviewCount: Number(p.review_count),
      stock: Number(p.stock),
      stockStatus: p.stock_status,
      image: p.image,
      description: p.description,

      features: typeof p.features === "string"
        ? JSON.parse(p.features)
        : (p.features || []),

      specifications: typeof p.specifications === "string"
        ? JSON.parse(p.specifications)
        : (p.specifications || {}),

      manufacturingDate: p.manufacturing_date,
      expiryDate: p.expiry_date,
      seller: p.seller
    }));

    productsLoaded = true;

    console.log("Products loaded from Flask API:", API_PRODUCTS.length);

    return API_PRODUCTS;

  } catch (error) {
    console.error("Failed to load products from Flask API:", error);
    return [];
  }
}
/* ---------- Data access functions (mock now, API later) ---------- */

function getCategories() { return CATEGORIES; }

function getCategoryById(id) { return CATEGORIES.find(c => c.id === id); }

function getProducts(filters = {}) {

  let list = [...API_PRODUCTS];

  if (filters.category) {
    list = list.filter(
      p => p.category === filters.category
    );
  }

  // SEARCH
  if (
  filters.query &&
  filters.query.trim().toLowerCase() !== "all products"
) {

  const q = filters.query
    .toLowerCase()
    .trim();

  // Split search into individual words
  const words = q
    .split(/\s+/)
    .filter(Boolean);

  list = list.filter(p => {

    const searchableText = [
      p.name,
      p.category,
      p.brand,
      p.description,
      p.subcategory
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return words.every(word =>
      searchableText.includes(word)
    );
  });
}

  if (filters.minPrice != null) {
    list = list.filter(
      p => p.price >= filters.minPrice
    );
  }

  if (filters.maxPrice != null) {
    list = list.filter(
      p => p.price <= filters.maxPrice
    );
  }

  if (filters.minRating) {
    list = list.filter(
      p => p.rating >= filters.minRating
    );
  }

  if (
    filters.brands &&
    filters.brands.length
  ) {
    list = list.filter(
      p => filters.brands.includes(p.brand)
    );
  }

  if (filters.inStockOnly) {
    list = list.filter(
      p => p.stock > 0
    );
  }

  switch (filters.sort) {

    case "price-asc":
      list.sort(
        (a, b) => a.price - b.price
      );
      break;

    case "price-desc":
      list.sort(
        (a, b) => b.price - a.price
      );
      break;

    case "rating-desc":
      list.sort(
        (a, b) => b.rating - a.rating
      );
      break;

    case "newest":
      list.sort(
        (a, b) => b.id - a.id
      );
      break;

    default:
      break;
  }

  return list;
}

function getProductById(id) { return PRODUCTS.find(p => p.id === Number(id)); }

function getBrands() { return [...new Set(PRODUCTS.map(p => p.brand))].sort(); }

function getRelatedProducts(product, limit = 4) {
  return PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, limit);
}


loadProductsFromAPI();