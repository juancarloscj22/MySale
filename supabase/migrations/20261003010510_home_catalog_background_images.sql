alter table public.site_settings
  add column product_card_background_image_url text
    check (
      product_card_background_image_url is null
      or length(product_card_background_image_url) <= 2048
    ),
  add column navbar_background_image_url text
    check (
      navbar_background_image_url is null
      or length(navbar_background_image_url) <= 2048
    );
