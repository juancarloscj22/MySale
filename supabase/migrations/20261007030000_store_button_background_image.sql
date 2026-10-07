alter table public.site_settings
  add column button_background_image_url text
    check (
      button_background_image_url is null
      or length(button_background_image_url) <= 2048
    );
