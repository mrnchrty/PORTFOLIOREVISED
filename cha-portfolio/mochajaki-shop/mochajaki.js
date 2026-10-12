(() => {
  const paymentPreviewChoices = [
    {
      id: 'gcash',
      label: 'GCash',
      instructions: 'GCash details are shared with your order confirmation.',
      type: 'manual',
    },
    {
      id: 'maya',
      label: 'Maya',
      instructions: 'Maya details are shared with your order confirmation.',
      type: 'manual',
    },
    {
      id: 'other',
      label: 'Other',
      instructions: 'Other payment arrangements are confirmed with the shop.',
      type: 'manual',
    },
  ];

  const image = '../assets/images/food-placeholder.svg';
  const sampleDescription = 'Prepared to order. Size, flavor, and portion are confirmed with Mochajaki.';
  const comboDescription = 'A bundle of the listed items at one price.';
  const categories = [
    { id: 'pasta', name: 'Pasta', slug: 'pasta', sort_order: 1 },
    { id: 'beverages', name: 'Beverages', slug: 'beverages', sort_order: 2 },
    { id: 'snacks', name: 'Snacks', slug: 'snacks', sort_order: 3 },
    { id: 'chicken-rice', name: 'Chicken & Rice', slug: 'chicken-rice', sort_order: 4 },
    { id: 'combo-deals', name: 'Combo Deals', slug: 'combo-deals', sort_order: 5 },
  ];

  const choiceGroup = (id, label, choices) => ({
    id,
    label,
    type: 'single',
    required: true,
    min_selected: 1,
    max_selected: 1,
    values: choices.map(([valueId, valueLabel, priceDelta]) => ({
      id: valueId,
      label: valueLabel,
      price_delta: priceDelta,
    })),
  });

  const sizeOptions = (smallPrice, bigPrice) => [{
    id: 'size',
    label: 'Size',
    type: 'single',
    required: true,
    min_selected: 1,
    max_selected: 1,
    values: [
      { id: 'small', label: 'Small', price_delta: 0, display_price: smallPrice },
      { id: 'big', label: 'Big', price_delta: bigPrice - smallPrice, display_price: bigPrice },
    ],
  }];

  const products = [
    {
      id: 'mochajaki-lasagna', category_id: 'pasta', category_name: 'Pasta',
      name: 'Lasagna', description: 'Choose Small or Big.',
      price: 50, available: true, is_sample: false, is_featured: false,
      options: sizeOptions(50, 70),
    },
    {
      id: 'mochajaki-palabok', category_id: 'pasta', category_name: 'Pasta',
      name: 'Palabok', description: 'Choose Small or Big.',
      price: 40, available: true, is_sample: false, is_featured: false,
      options: sizeOptions(40, 60),
    },
    {
      id: 'mochajaki-bake-mac', category_id: 'pasta', category_name: 'Pasta',
      name: 'Bake Mac', description: 'Choose Small or Big.',
      price: 50, available: true, is_sample: false, is_featured: false,
      options: sizeOptions(50, 70),
    },
    {
      id: 'mochajaki-mac-and-cheese', category_id: 'pasta', category_name: 'Pasta',
      name: 'Mac & Cheese', description: 'Choose Small or Big.',
      price: 50, available: true, is_sample: false, is_featured: false,
      options: sizeOptions(50, 70),
    },
    {
      id: 'mochajaki-iced-coffee', category_id: 'beverages', category_name: 'Beverages',
      name: 'Iced Coffee', price: 60, featured: true,
      options: [
        choiceGroup('flavor', 'Flavor', [['classic', 'Classic', 0], ['caramel', 'Caramel', 10], ['mocha', 'Mocha', 10]]),
        choiceGroup('size', 'Size', [['regular', 'Regular', 0], ['large', 'Large', 20]]),
      ],
    },
    {
      id: 'mochajaki-milk-tea', category_id: 'beverages', category_name: 'Beverages',
      name: 'Classic Milk Tea', price: 75,
      options: [
        choiceGroup('flavor', 'Flavor', [['classic', 'Classic', 0], ['wintermelon', 'Wintermelon', 0], ['taro', 'Taro', 0], ['brown-sugar', 'Brown sugar', 10]]),
        choiceGroup('size', 'Size', [['regular', 'Regular', 0], ['large', 'Large', 20]]),
      ],
    },
    {
      id: 'mochajaki-milkshake', category_id: 'beverages', category_name: 'Beverages',
      name: 'Milkshake', price: 85,
      options: [
        choiceGroup('flavor', 'Flavor', [['chocolate', 'Chocolate', 0], ['strawberry', 'Strawberry', 0], ['mango', 'Mango', 0]]),
        choiceGroup('size', 'Size', [['regular', 'Regular', 0], ['large', 'Large', 25]]),
      ],
    },
    {
      id: 'mochajaki-homemade-burger', category_id: 'snacks', category_name: 'Snacks',
      name: 'Homemade Burger', price: 85, featured: true,
      options: [choiceGroup('size', 'Patty size', [['single', 'Single patty', 0], ['double', 'Double patty', 35]])],
    },
    {
      id: 'mochajaki-hotdog', category_id: 'snacks', category_name: 'Snacks',
      name: 'Classic Hotdog', price: 45,
      options: [choiceGroup('size', 'Hotdog size', [['regular', 'Regular', 0], ['jumbo', 'Jumbo', 20]])],
    },
    {
      id: 'mochajaki-fries', category_id: 'snacks', category_name: 'Snacks',
      name: 'French Fries', price: 50,
      options: [
        choiceGroup('size', 'Size', [['regular', 'Regular', 0], ['large', 'Large', 20]]),
        choiceGroup('seasoning', 'Seasoning', [['original', 'Original', 0], ['cheese', 'Cheese', 10], ['barbecue', 'Barbecue', 10]]),
      ],
    },
    {
      id: 'mochajaki-chicken-rice-classic', category_id: 'chicken-rice', category_name: 'Chicken & Rice',
      name: 'Classic Chicken with Rice', price: 100, featured: true,
      options: [choiceGroup('size', 'Meal size', [['regular', 'Regular', 0], ['large', 'Large', 30]])],
    },
    {
      id: 'mochajaki-chicken-rice-garlic', category_id: 'chicken-rice', category_name: 'Chicken & Rice',
      name: 'Garlic Chicken with Rice', price: 110,
      options: [choiceGroup('size', 'Meal size', [['regular', 'Regular', 0], ['large', 'Large', 30]])],
    },
    {
      id: 'mochajaki-chicken-rice-spicy', category_id: 'chicken-rice', category_name: 'Chicken & Rice',
      name: 'Spicy Chicken with Rice', price: 110,
      options: [choiceGroup('size', 'Meal size', [['regular', 'Regular', 0], ['large', 'Large', 30]])],
    },
    {
      id: 'mochajaki-combo-pasta-coffee', category_id: 'combo-deals', category_name: 'Combo Deals',
      name: 'Palabok & Iced Coffee Combo', price: 95,
      description: 'Small Palabok paired with one regular Iced Coffee.',
    },
    {
      id: 'mochajaki-combo-burger-fries', category_id: 'combo-deals', category_name: 'Combo Deals',
      name: 'Homemade Burger & Fries Combo', price: 125,
      description: 'Single-patty Homemade Burger with regular fries.',
    },
    {
      id: 'mochajaki-combo-chicken-milk-tea', category_id: 'combo-deals', category_name: 'Combo Deals',
      name: 'Chicken Rice & Milk Tea Combo', price: 160,
      description: 'Regular Classic Chicken with Rice and one regular Classic Milk Tea.',
    },
  ].map((product, index) => ({
    ...product,
    description: product.description || (product.category_id === 'combo-deals' ? comboDescription : sampleDescription),
    available: product.available ?? true,
    image_url: image,
    is_sample: product.is_sample ?? product.category_id !== 'pasta',
    is_featured: Boolean(product.featured ?? product.is_featured),
    display_order: index + 1,
    options: Array.isArray(product.options) ? product.options : [],
  }));

  window.STOREFRONT_CONFIG = {
    shopName: 'Mochajaki Snack Corner Gasang',
    currency: 'PHP',
    fallbackImage: image,
    fallbackPaymentMethods: paymentPreviewChoices,
    fallbackCatalog: { categories, products },
  };

  window.initializeStorefront?.();

  const filter = document.getElementById('category-filter');
  const pendingCategory = new WeakMap();
  const buttons = document.querySelectorAll('[data-shop-category]');
  const applyCategory = (button) => {
    if (!filter) return;
    const requested = String(button.dataset.shopCategory || '').trim().toLocaleLowerCase();
    const option = [...filter.options].find((item) => item.textContent.trim().toLocaleLowerCase() === requested);
    if (!option) {
      pendingCategory.set(button, requested);
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    filter.value = option.value;
    filter.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  buttons.forEach((button) => button.addEventListener('click', () => applyCategory(button)));

  if (filter) {
    new MutationObserver(() => {
      buttons.forEach((button) => {
        if (pendingCategory.has(button)) applyCategory(button);
      });
    }).observe(filter, { childList: true });
  }
})();
