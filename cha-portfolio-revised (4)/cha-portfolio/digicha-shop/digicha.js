(() => {
  const paymentPreviewChoices = [
    {
      id: 'cash_pickup',
      label: 'Cash on Pickup',
      instructions: 'Pay in cash when you pick up your order.',
      type: 'manual',
    },
    {
      id: 'cod',
      label: 'Cash on Delivery',
      instructions: 'Pay the rider in cash when your order arrives. Available within the delivery area.',
      type: 'manual',
    },
    {
      id: 'gcash',
      label: 'GCash (manual)',
      instructions: 'Preview only. The shop must add its verified GCash number before accepting payment. Orders stay Pending Payment until the shop verifies the proof.',
      type: 'manual',
    },
  ];

  const image = '../assets/images/product-placeholder.svg';
  const productImage = (file) => `../assets/images/products/${file}`;
  const categories = [
    { id: 'mugs', name: 'Mugs', slug: 'mugs' },
    { id: 'notebooks', name: 'Notebooks', slug: 'notebooks' },
    { id: 'stickers', name: 'Stickers', slug: 'stickers' },
    { id: 'invitation-cards', name: 'Invitation Cards', slug: 'invitation-cards' },
  ];

  const optionGroup = (id, label, values) => [{
    id,
    label,
    type: 'single',
    required: true,
    min_selected: 1,
    max_selected: 1,
    values: values.map(([valueId, valueLabel, priceDelta, displayPrice]) => ({
      id: valueId,
      label: valueLabel,
      price_delta: priceDelta,
      display_price: displayPrice,
    })),
  }];

  const products = [
    // ============================================================ Mugs
    {
      id: 'digicha-mug-blush-blooms', category_id: 'mugs', category_name: 'Mugs',
      name: 'Blush Blooms Ceramic Mug', price: 249, sale_price: 199, stock: 25, featured: true,
      description: 'Ready-made 11oz glossy ceramic mug with a watercolor peony and lavender wrap. Dishwasher and microwave safe.',
      image: 'mug-blush-blooms.jpg',
    },
    {
      id: 'digicha-mug-name-script', category_id: 'mugs', category_name: 'Mugs',
      name: 'Personalized Name Mug', price: 299,
      description: 'White 11oz ceramic mug printed with the name of your choice in rose-gold script. Tell us the name and pick a lettering style.',
      image: 'mug-name-script.jpg',
      options: optionGroup('lettering', 'Lettering style', [['script', 'Elegant script', 0, 299], ['serif', 'Classic serif', 0, 299]]),
      customization: {
        text_fields: [{ id: 'name', label: 'Name to print', max_length: 20, required: true, fee: 0 }],
        allow_instructions: true,
      },
    },
    {
      id: 'digicha-mug-photo-print', category_id: 'mugs', category_name: 'Mugs',
      name: 'Custom Photo Mug', price: 349,
      description: 'Your photo, printed to keep. Upload a clear PNG or JPG and we will fit it to an 11oz cream mug.',
      image: 'mug-photo-print.jpg',
      customization: {
        allow_image_upload: true, image_fee: 0, allow_instructions: true,
        text_fields: [{ id: 'caption', label: 'Optional caption', max_length: 40, required: false, fee: 25 }],
      },
    },

    // ======================================================== Notebooks
    {
      id: 'digicha-notebook-lavender-fields', category_id: 'notebooks', category_name: 'Notebooks',
      name: 'Lavender Fields Hardbound Notebook', price: 289, stock: 18,
      description: 'Ready-made A5 hardcover journal with a lavender-field watercolor cover, gold foil spine, and 120gsm cream pages.',
      image: 'notebook-lavender-fields.jpg',
    },
    {
      id: 'digicha-notebook-name-cover', category_id: 'notebooks', category_name: 'Notebooks',
      name: 'Personalized Linen Notebook', price: 349,
      description: 'Blush linen hardcover embossed with a name in gold. A keepsake for journaling, notes, or gifting.',
      image: 'notebook-name-cover.jpg',
      options: optionGroup('pages', 'Page style', [['lined', 'Lined', 0, 349], ['dotted', 'Dotted', 0, 349], ['blank', 'Blank', 0, 349]]),
      customization: {
        text_fields: [{ id: 'name', label: 'Name to emboss', max_length: 18, required: true, fee: 25 }],
        allow_instructions: true,
      },
    },
    {
      id: 'digicha-notebook-spiral-custom', category_id: 'notebooks', category_name: 'Notebooks',
      name: 'Custom Cover Spiral Notebook', price: 229,
      description: 'Rose-gold spiral notebook with a cover designed from your artwork or photo. Upload a reference and describe your idea.',
      image: 'notebook-spiral-custom.jpg',
      customization: { allow_image_upload: true, image_fee: 50, allow_instructions: true },
    },

    // ========================================================= Stickers
    {
      id: 'digicha-sticker-planner-pack', category_id: 'stickers', category_name: 'Stickers',
      name: 'Pastel Planner Sticker Pack', price: 129, sale_price: 99, stock: 40, featured: true,
      description: 'Three ready-made sheets of pastel planner icons - hearts, tabs, labels, and washi strips. Matte, repositionable.',
      image: 'sticker-planner-pack.jpg',
    },
    {
      id: 'digicha-sticker-deco-pack', category_id: 'stickers', category_name: 'Stickers',
      name: 'Deco Sticker Mix', price: 149, stock: 32,
      description: 'Glossy die-cut butterflies, bows, rainbows, and blooms for laptops, bottles, and journals. Waterproof vinyl.',
      image: 'sticker-deco-pack.jpg',
    },
    {
      id: 'digicha-sticker-name-sheet', category_id: 'stickers', category_name: 'Stickers',
      name: 'Custom Name Sticker Sheet', price: 120,
      description: 'A sheet of name labels in cute script with daisy accents - perfect for school supplies and gifts. Tell us the name.',
      image: 'sticker-name-sheet.jpg',
      options: optionGroup('size', 'Sheet size', [['mini', 'Mini sheet', 0, 120], ['standard', 'Standard sheet', 40, 160]]),
      customization: {
        text_fields: [{ id: 'name', label: 'Name on the stickers', max_length: 15, required: true, fee: 0 }],
        allow_instructions: true,
      },
    },

    // Invitation Cards samples (birthday, wedding, graduation) arrive with
    // their local product photos in the next catalog update.
  ].map((product, index) => ({
    ...product,
    description: product.description || 'Product details will be added by the shop owner.',
    available: true,
    image_url: product.image ? productImage(product.image) : image,
    is_sample: true,
    is_featured: Boolean(product.featured),
    display_order: index + 1,
  }));

  window.STOREFRONT_CONFIG = {
    shopName: 'DigiCha',
    currency: 'PHP',
    fallbackImage: image,
    fallbackPaymentMethods: paymentPreviewChoices,
    fallbackCatalog: { categories, products },
  };

  window.initializeStorefront?.();

  const filter = document.getElementById('category-filter');
  const pendingCategory = new WeakMap();
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

  document.querySelectorAll('.digi-category-card[data-shop-category]').forEach((button) => {
    button.addEventListener('click', () => applyCategory(button));
  });

  if (filter) {
    new MutationObserver(() => {
      document.querySelectorAll('.digi-category-card[data-shop-category]').forEach((button) => {
        if (pendingCategory.has(button)) applyCategory(button);
      });
    }).observe(filter, { childList: true });
  }
})();
