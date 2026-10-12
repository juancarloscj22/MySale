with single_active_flavor as (
  select
    product_flavors.product_id,
    (array_agg(product_flavors.id order by product_flavors.id))[1] as flavor_id
  from public.product_flavors
  where product_flavors.active
  group by product_flavors.product_id
  having count(*) = 1
)
update public.reward_product_redemptions as redemptions
set flavor_id = product_flavors.id,
    flavor_name = product_flavors.flavor,
    image_url = coalesce(product_flavors.image_url, products.image_url, ''),
    requires_order = true
from single_active_flavor
join public.product_flavors
  on product_flavors.id = single_active_flavor.flavor_id
join public.products
  on products.id = single_active_flavor.product_id
where redemptions.product_id = single_active_flavor.product_id
  and redemptions.order_id is null
  and redemptions.flavor_id is null
  and not redemptions.cancelled
  and products.active;
