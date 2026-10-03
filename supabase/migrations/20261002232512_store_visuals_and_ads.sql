alter table public.site_settings
  add column banner_url text
    check (banner_url is null or length(banner_url) <= 2048),
  add column background_image_url text
    check (background_image_url is null or length(background_image_url) <= 2048),
  add column adsense_publisher_id text
    check (adsense_publisher_id is null or adsense_publisher_id ~ '^ca-pub-[0-9]+$'),
  add column adsense_left_slot text
    check (adsense_left_slot is null or adsense_left_slot ~ '^[0-9]+$'),
  add column adsense_right_slot text
    check (adsense_right_slot is null or adsense_right_slot ~ '^[0-9]+$');
