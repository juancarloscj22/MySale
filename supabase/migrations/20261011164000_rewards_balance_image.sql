alter table public.site_settings
  add column if not exists rewards_balance_image_url text
    check (
      rewards_balance_image_url is null
      or length(rewards_balance_image_url) <= 2048
    );
