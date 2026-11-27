# Dropshipping Mobile Guardrails

Last updated: 2026-06-03

## Scope

This mobile repository cannot fix the dropshipping source-of-truth bugs by itself.
The confirmed production blockers are backend/web data-quality issues:

- Supplier prices such as `1₮`, `24₮`, or `0₮` reaching public product surfaces.
- Products without a usable image reaching public product surfaces.
- Placeholder/spam names such as `Hhh` reaching public product surfaces.

Mobile now applies a defensive quarantine before rendering buyer-facing product
lists and before allowing product detail checkout.

## Mobile Guard Rules

Public product surfaces hide a product when any of these are true:

- Effective buyer price is below `1000₮`.
- Product has no usable image URL.
- Product name is missing or clearly placeholder-like (`Hhh`, `test`, `demo`, etc.).

Product detail still opens for direct links, but checkout/cart actions are disabled
when the product fails the same rules.

## Files Touched

- `src/shared/productQuality.ts`
- `src/components/home/FlashSaleRow.tsx`
- `app/(customer)/flash-sale.tsx`
- `app/(customer)/dropship.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/store.tsx`
- `app/(tabs)/search.tsx`
- `app/product/[id].tsx`
- `app/cart.tsx`
- `app/checkout.tsx`
- `app/storefront/[slug].tsx`
- `src/components/home/HerderRow.tsx`
- `app/(customer)/herder.tsx`
- `app/(customer)/herder-product/[id].tsx`

## Backend/Web Work Still Required

Backend must still fix the real source of truth:

1. Audit dropshipping product sync and identify where supplier price/currency is mapped.
2. Store supplier cost/currency separately from final MNT buyer price.
3. Recompute final MNT price with exchange rate, margin, and shipping cost.
4. Quarantine existing active dropshipping products where `price < 1000`.
5. Re-fetch or archive existing active products with missing images.
6. Add pre-publish moderation for placeholder names and weak content.
7. Ensure public APIs do not return active products that fail these rules.

Web must verify the same public surfaces:

- Home flash sale.
- Storefront pages such as `/muugii`.
- Product detail and related products.
- Search/store/category lists.

## Verification

Mobile compile check:

```powershell
npx.cmd tsc --noEmit --pretty false
npm.cmd run smoke:product-quality
npm.cmd run smoke:product-surfaces
```

Feed/detail guard check:

- `app/(tabs)/index.tsx` filters home featured/new products and feed-preview listing cards before rendering them.
- `app/(tabs)/feed.tsx` hides feed items that fail public product quality rules.
- `app/feed/[id].tsx` still opens direct links, but disables affiliate/order actions when a product fails the same rules.
- `app/(tabs)/social.tsx` hides social product attachments that fail public product quality rules.
- `src/components/QuickBuyBottomSheet.tsx` refuses to create a quick order when a direct product payload fails the same rules.
- `src/components/GroupBuyCard.tsx` hides/join-blocks group-buy cards whose discounted buyer price or product media fails the same rules.
- `app/(customer)/live/[id].tsx` filters live-sale products before rendering purchase actions.
- `app/(customer)/wishlist.tsx` keeps saved products visible but blocks cart-add when saved payload fails the same rules.
- `app/cart.tsx` marks stale/invalid saved cart items and disables checkout until they are removed.
- `app/checkout.tsx` refuses invoice creation if a stale cart still contains invalid product payloads.
- `src/components/home/HerderRow.tsx` hides invalid Malchnaas/home herder products before rendering the carousel.
- `app/(customer)/herder.tsx` filters herder products and blocks direct order actions when a product fails the same rules.
- `app/(customer)/herder-product/[id].tsx` keeps direct links readable but disables cart/order actions for invalid herder products.

Production smoke targets:

- `https://eseller.mn/muugii`
- `https://eseller.mn/product/69d3db045dc8f0a20ceee50e`
- `https://eseller.mn/store`
- `https://eseller.mn/search?q=tripod`
