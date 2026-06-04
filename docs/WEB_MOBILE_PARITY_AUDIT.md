# eseller.mn Web/Mobile Parity Audit

Last checked: 2026-05-24 (Asia/Ulaanbaatar)

## Live web surface checked

Source: https://eseller.mn

- Mobile bottom navigation: `Нүүр`, `Дэлгүүр`, `Зар`, `Дэлгүүрүүд`, `Профайл`
- Main desktop navigation: `Дэлгүүр`, `Зарын булан`, `Яагаад бид?`, `Дэлгүүр нээх`, `Gold`, `Нэвтрэх`
- Home hero: `Зуны мега хямдрал эхэллээ`
- Home categories: `Эмэгтэй`, `Эрэгтэй`, `Гоо сайхан`, `Гэр декор`, `Үл хөдлөх`, `Шинэ төсөл`, `Машин`, `Гоёл`, `Хүүхдийн`, `18+`, `Эрүүл мэнд`, `Утас`, `Технологи`, `Бэлэг`, `Тавилга`, `Цахилгаан`, `Авто сэлбэг`, `Ном`, `Барилга`, `Аялал`, `Спорт`, `Хүнс`, `E-Спорт`, `Амьтан ургамал`, `Дижитал`, `Сургалт`, `Гоо үйлчилгээ`, `IT үйлчилгээ`, `Зөвлөх`, `Авто үйлчилгээ`, `Засвар`, `Хэвлэл`, `Захиалгат`, `Зураг авалт`, `Дизайн`
- Home sections: `Онцлох дэлгүүрүүд`, `Хямдралтай бараа`, `Gold`, `Борлуулагч болох`, `Сүүлийн зарууд`

## Mobile parity fixes applied

- Buyer bottom tabs now match the live site's mobile nav: `Нүүр`, `Дэлгүүр`, `Зар`, `Дэлгүүрүүд`, `Профайл`.
- `Дэлгүүрүүд` is now a first-class tab route through `app/(tabs)/shops.tsx`.
- Orders, add/create, search, chat, notifications, gold and social screens remain available as internal app routes and home/profile shortcuts instead of disappearing.
- Home quick actions now start with the same core product surfaces as the site: `Дэлгүүр`, `Зар`, `Дэлгүүрүүд`, `Gold`.
- Home hero now exposes the live site's first-screen CTAs, `Бараа үзэх` and `Дэлгүүр нээх`, directly inside the sale banner.
- App-only features (`Live`, `Chat`, `Dropship`, `BNPL`, `Малчны`) are grouped under the service grid so the first screen no longer reads like several unrelated apps.
- Home categories now mirror the live site's expanded 35-category grid.
- Category labels now come from one shared live-web category contract across Home, Store, Feed, Create listing, and Search keyword surfaces.
- Category cards now use the live site's `/store?category=...` slugs and route into `Дэлгүүр`; legacy mobile category slugs remain accepted as aliases.
- Home category cards now appear near the top as a 12-item grid, matching the live mobile site's first-scroll structure.
- Home now brings `Онцлох дэлгүүрүүд` and the public stats strip directly after the category grid, reducing the first-scroll order gap with the live home page.
- Home `Хямдралтай бараа` and Gold offer sections now follow the featured-shop stats before app-only service shortcuts, matching the live home page's public shopping sequence more closely.
- Home business CTA now follows the Gold offer before app-only service shortcuts, matching the live public sequence `Gold` → `Борлуулагч болж орлого олоорой`.
- App-only quick/service shortcut groups now move below the public product and listing sections, so the live home sequence stays dominant before app utility surfaces appear.
- Home bottom now exposes the live footer navigation groups (`Платформ`, `Дэмжлэг`, `Бизнес`) with the `Санал хүсэлт илгээх` CTA instead of hiding them only inside `/services`.
- Home footer contact summary now matches the live copy: `7XXX-XXXX info@eseller.mn`.
- Home footer now includes the live social links for `Facebook` and `Instagram` beside the public contact summary.
- Home footer now includes the live copyright line before the `Санал хүсэлт илгээх` CTA: `© 2026 eseller.mn — Бүх эрх хуулиар хамгаалагдсан`.
- Home marketplace search block now follows the seller CTA, matching the live sequence `Борлуулагч болж орлого олоорой` → `Монголын нэгдсэн цахим зах` → benefit chips.
- Home marketplace search block now includes the live category filter row (`Бүгд`, expanded categories, `Хайх`) between the marketplace stats and search input.
- Home `Сүүлийн зарууд` now follows the marketplace benefit chips, matching the live sequence before additional mobile product rails.
- Home public CTAs, category chips, service shortcuts, and footer links now use the same live-web URL paths (`/store`, `/feed`, `/shops`, `/gold`, `/help`, `/contact`, `/become-seller`, `/become-driver`) instead of Expo group-scoped paths.
- Reusable home CTAs, guest profile shortcuts, `/services`, `/store`, `/feed`, `/compare`, `/help`, `/cart`, `/open-shop`, and storefront empty-state CTAs now use public URL paths instead of `/(tabs)` or `/(customer)` group paths.
- Login/register now preserve a safe `returnTo` public URL for protected flows such as `/chat`, `/orders`, `/feed/create`, `/product/[id]`, and `/profile`; root/auth auto-routing no longer overrides an intentional deep link after authentication.
- Auth cross-links now normalize `returnTo`, and the guest continue action returns to the public `/` home URL instead of the Expo group path.
- Search trust chips, action shortcuts, notification deep-links, feedback redirect, checkout continue action, Live/Malchnaas deep-links, and shared profile settings now use public URL paths instead of route-group paths.
- `/register-shop` and `/register-herder` now guard unauthenticated users with login/register CTAs that preserve the public `returnTo` URL instead of letting protected seller onboarding POSTs lose context on 401.
- Login/register cross-links now preserve the selected auth role (`seller`, `affiliate`, `delivery`) alongside `returnTo`, including seller/herder onboarding and Google sign-in role context.
- Seller/affiliate dashboard routes now have public `/seller/...` aliases (`/seller/dashboard`, `/seller/products`, `/seller/catalog`, `/seller/earnings`, `/seller/leaderboard`, `/seller/profile`), and affiliate referral CTAs use the existing public `/referral` path instead of Expo route-group paths.
- Seller/affiliate protected routes now redirect unauthenticated users to `/login` with the original public `returnTo` path instead of falling through to an API 401 that loses context.
- Auth screens now infer the right signup role from protected public `returnTo` paths, so `/login?returnTo=/referral` and `/login?returnTo=/seller/...` continue to affiliate registration instead of defaulting to buyer.
- Home search keyword chips now mirror the live site's `iPhone`, `Nike`, `Samsung`, `Хувцас`, and `Зурагт` shortcuts.
- Home platform benefit chips now mirror the live site's `Gold гишүүнчлэл`, `Борлуулагч комисс`, `Өөрийн жолооч`, `Дундын данс`, `50,000₮+ үнэгүй хүргэлт`, `48 цагийн буцаалт`, `QPay аюулгүй төлбөр`, and `Баталгаат бараа` copy.
- Home now includes the live public stats strip after featured shops: `10,000+ бараа`, `500+ дэлгүүр`, and `50,000+ хэрэглэгч`.
- Home Gold CTA now mirrors the live public offer copy and action order: `Gold гишүүн болж 200,000₮+ хэмнэнэ`, the free-delivery/discount/points/VIP benefit list, and `30 хоног үнэгүй турших →`.
- Home business CTA now uses the live seller pitch and explicit live actions: `Борлуулагч болох →` and `Дэлгүүр нээх →`.
- Section labels were aligned with web copy: `Хямдралтай бараа`, `Онцлох дэлгүүрүүд`, `Сүүлийн зарууд`.
- `/compare` now maps to the live site's `Яагаад бид?` product/story instead of an unrelated product-comparison placeholder.
- App-only social preview was removed from the home first-scroll area; the underlying social route remains available internally.
- App-only services (`Live`, `Dropship`, `BNPL`, `AI`, `Малчны`, wallet/chat utilities) now live under `Бүх үйлчилгээ` instead of competing with the live site's home surface.
- `/services` now mirrors the live footer navigation groups with `Платформ`, `Дэмжлэг`, and `Бизнес` sections, including store/feed/shops/Gold, terms/privacy/contact/help, and open-shop/seller/driver/partner links.
- `/feedback` now exists as a public alias for the live footer's `Санал хүсэлт илгээх` entry, opens the contact form with the `Санал` type selected, and submits feedback mail to `feedback@eseller.mn` with the live footer subject.

- `/open-shop` now mirrors the live store-opening landing page with the 5-minute setup hero, 0% commission offer, six benefit cards, FAQ, and CTA into the seller registration funnel.
- `/login` and `/register` now mirror the live auth story with `Борлуулалт хамтдаа л байна`, the store-owner/affiliate/buyer/driver value cards, and the same commission/delivery metrics.
- `/login` now mirrors the live auth provider choices with both `Google-ээр нэвтрэх` and `ДАН-аар нэвтрэх`, including the `E-Mongolia иргэний нэвтрэлт` helper copy.
- The guest `Профайл` tab now mirrors the live bottom-nav profile/login experience with `Сайн уу!`, `Данс руугаа нэвтрэх`, the shared auth value cards, login/register CTAs, and guest shortcuts to the main platform surfaces.
- `/store?sale=true` is now supported by the mobile store tab and maps to the same flash-sale search filter used by the home sale row.
- `/store` now mirrors the live store landing surface with the `Зуны Мега Хямдрал` hero, `Хямдралтай бараа` CTA, free-delivery/QPay/fast-delivery/new-arrivals benefit cards, promo ticker, trust chips, Gold ad card, `Нэгдсэн ангиллын зарууд` heading, and the live site's expanded category labels.
- `/store?q=...`, `/feed?q=...`, `/shops?q=...`, and `/search?q=...` now hydrate their visible search state from the URL and pass query params through structured API calls.
- `/search` now mirrors the live global search block with `Монголын нэгдсэн цахим зах`, `Бүгд`/`Бараа`/`Дэлгүүр`/`Зар` scope controls, `Хайх`, the live keyword shortcuts, trust chips, combined product/shop/feed result counts, and unified result cards.
- `/feed` now mirrors the live classifieds surface with the `Бараа, үйлчилгээ, орон сууц, авто — бүгдийг нэг дор` subtitle, `Зар оруулах` CTA, location row, featured businesses, district/sort chips, expanded live category labels, `зар олдлоо · ВИП` count copy, card badges, view/date metadata, and `Дэлгэрэнгүй →` CTA.
- `/shops` now mirrors the live shops surface with `Бүх дэлгүүр & үйлчилгээ`, `Дэлгүүр нээх`, all/store/service count tabs, `Үнэлгээгээр`, `Сэтгэгдлээр`, `Шинээр` sort chips, loading copy, richer shop/service cards, and direct storefront CTAs.
- `/feed/[id]` now mirrors the live listing detail action stack with image count, category chip, primary order CTA, share/save actions, and `Борлуулж эхлэх (8%)`.
- `/feed`, `/feed/create`, and `/feed/[id]` now use consistent mobile action placement: feed filters and listing cards have accessible labels, create listing keeps publish in a fixed bottom action, and listing detail keeps share/save/order in one fixed bottom bar.
- Public customer routes such as `/live` now keep the shared bottom navbar visible instead of being hidden by the `(customer)` route group, and `/social` routes post creation to the existing listing composer instead of a missing `/create-post` page.
- `/social`, `/live`, and `/live/[id]` now have labeled tabs/cards/actions, standard-height social header, live empty retry CTA, and clearer live product/chat controls.
- App-only service routes `/dropship`, `/bnpl`, `/ai-shopper`, and `/services` now follow the same app shell conventions with visible shared navigation, labeled search/chat/filter/service actions, standard topbars, and clearer empty-state CTAs.
- Account utility routes `/wallet`, `/coupons`, `/wishlist`, `/returns`, `/notification-settings`, and `/security` now use consistent selected states, labeled switches/chips, and empty-state CTAs back into store, search, orders, help, or Gold.
- Order utility routes `/cart`, `/checkout`, `/track/search`, `/track/[code]`, `/receipt/[id]`, and `/review/[orderId]` now share the same button/navigation accessibility baseline, labeled checkout/tracking inputs, selected payment/rating states, QPay QR label, and safer cart quantity controls.
- Daily workflow routes `/orders`, `/order/[id]`, `/notifications`, `/chat`, `/chat/[id]`, and `/chat/ai-support` now use the shared loading/empty/action pattern more consistently, with accessible notification/chat rows, labeled chat inputs, disabled send states, order image labels, timeline status labels, and receipt/review action hints.
- Core utility tabs `/search`, `/shops`, `/action`, and `/gold` now have labeled and selected filter/scope/sort controls, safer result-card disabled states, labeled search inputs and clear actions, accessible Gold plan/FAQ/stepper controls, and the Gold plan CTA routes into a request/contact flow instead of the cart-only checkout.
- Public support/footer routes `/contact`, `/feedback`, `/help`, `/partner`, and `/open-shop` now preserve Gold plan request intent, expose the Gold request as a real contact type, use clearer form text input semantics, shared submit button disabled states, and accessible FAQ/feature/action labels.
- Role-based driver, seller, herder, owner, and coordinator list/profile/detail routes now share safe-area-aware top and bottom spacing through `useAppLayoutMetrics`, so headers, bottom actions, floating role controls, and tab bars stay consistent across notched and gesture-navigation phones.
- Buyer core tabs `/store`, `/search`, `/shops`, `/orders`, `/chat`, `/notifications`, `/feed`, and `/social` now use the same safe-area-aware layout metrics for list padding, standard headers, and floating create actions instead of hard-coded top/bottom spacing.
- Commerce/detail flows `/product/[id]`, `/cart`, `/checkout`, `/order/[id]`, `/receipt/[id]`, `/review/[orderId]`, `/track/search`, `/track/[code]`, `/feed/[id]`, and `/feed/create` now share safe-area-aware content spacing and fixed bottom action padding, so checkout, tracking, listing, and product actions do not collide with tab bars or home indicators.
- Customer utility/service routes `/addresses`, `/contact`, `/help`, `/wishlist`, `/live`, `/bnpl`, `/dropship`, and `/ai-shopper` now use the same safe-area-aware top/list/bottom/input spacing so navbar, fixed CTAs, and chat/search inputs stay consistent across notched and gesture-navigation phones.
- Public onboarding/business and herder detail routes `/open-shop`, `/partner`, `/become-seller`, `/become-driver`, `/register-herder`, `/tenders`, `/storefront/[slug]`, `/herder-product/[id]`, and `/herder-profile/[id]` now use safe-area-aware top and bottom spacing, including herder product fixed purchase actions.
- Auth/chat/live/profile routes `/login`, `/chat/[id]`, `/chat/ai-support`, `/live/[id]`, `/herder`, and `/achievements` now use safe-area-aware top/list/input/bottom spacing so login forms, chat composers, live controls, and profile grids align with the same app shell standard.
- Remaining direct screen top/bottom constants were removed from route screens and shared onboarding: the legacy store dashboard on `/`, onboarding landing pages, and compact owner POS header now use `useAppLayoutMetrics`; only shared metric definitions and tab-bar-specific padding keep the base constants.
- Public business/action routes `/become-seller`, `/become-driver`, `/corporate-order`, and `/tenders` now start with the shared `AppTopBar` before their hero/forms, giving them the same back affordance and standard header rhythm as store, support, and service screens.
- Shared onboarding/herder funnel screens now use the app-standard `AppTopBar`: `OnboardingLanding` disables native Stack headers and `/register-herder` starts both guest and authenticated flows with the same header rhythm.
- Driver role routes now have public aliases (`/driver/deliveries`, `/driver/earnings`, `/driver/profile`, `/driver/delivery-detail`) matching seller aliases, and auth/role/action navigation now targets those public paths instead of route-group URLs.
- Store-owner routes now have public aliases (`/owner/dashboard`, `/owner/products`, `/owner/orders`, `/owner/analytics`, `/owner/profile`, `/owner/settings`, `/owner/pos`, `/owner/pos-history`, `/owner/create-coupon`), and auth, role switching, notifications, dashboard/profile shortcuts, POS filters, coupon filters, and store CTAs now target public URLs instead of `/(owner)` route-group paths.
- Herder admin and coordinator routes now have public aliases (`/herder-admin/...` and `/coordinator/...`), and role/auth/dashboard/list/filter/detail navigation now targets public URLs instead of `/(herder)` or `/(coordinator)` route-group paths.
- Public role alias groups (`/owner`, `/driver`, `/herder-admin`, and `/coordinator`) are now explicitly registered in the root stack with native headers disabled, matching the `/seller` alias and keeping role tab layouts visually independent from buyer shell chrome.
- Shared shell bottom navigation now hides on public role aliases (`/owner`, `/seller`, `/driver`, `/herder-admin`, `/coordinator`) as well as route groups, preventing buyer bottom navigation from stacking on top of role-specific tab bars.
- Buyer shell bottom navigation now highlights the correct section on public utility routes: cart/checkout/flash-sale stay under Store, while wallet/coupons/wishlist/returns/addresses/edit-profile/notification/security/achievements/tier-details stay under Profile.
- `/orders` now follows the same account-utility header pattern with a shared `AppTopBar`, and buyer shell active-state treats order history as part of the Profile section.
- `/chat` and `/notifications` now match the same account-utility header pattern with shared `AppTopBar` headers and Profile-section buyer shell active-state.
- Hidden utility tabs `/action` and `/gold` now start with shared `AppTopBar` headers before their feature content, matching the same app-shell rhythm used by account and support utilities.
- `/search` now uses the shared `AppTopBar` for its top toolbar instead of a local ad-hoc cancel row, keeping global search aligned with the app-shell header standard.
- `/social` loading, error, and main states now share one `AppTopBar`-based header instead of three duplicated ad-hoc header blocks, keeping the social tab aligned with the standard shell header rhythm.
- Role profile headers for `/owner/profile`, `/seller/profile`, and `/driver/profile` now start with the shared `AppTopBar` rhythm while keeping tab-root profiles free of an unnecessary back action.
- Buyer `/profile` guest and authenticated states now start with the same shared `AppTopBar` rhythm as account utility and role profile screens, without adding an unnecessary back action on the tab root.
- Buyer `/shops` now starts with the shared `AppTopBar` before its marketplace hero, keeping storefront discovery aligned with the store/search/social/profile tab header rhythm.
- Buyer `/store` now starts with the shared `AppTopBar` before its marketplace hero, keeping the primary commerce tab aligned with shops, search, social, and profile root headers.
- Buyer `/feed` now starts with the shared `AppTopBar` before its classifieds header/search controls, keeping the listings tab aligned with the store, shops, search, social, and profile root headers.
- Buyer home `/` now uses the shared `AppTopBar` with safe-area-aware top spacing instead of a hard-coded top offset, while preserving cart and search actions in the first viewport.
- Buyer `/live` now starts with the shared `AppTopBar` before its live-shopping hero and tab controls, keeping live commerce aligned with the store/search/social/profile shell header rhythm.
- Buyer `/dropship` now keeps its shared `AppTopBar` as a root commerce surface without an unnecessary back action, matching `/live` and the primary commerce shell header behavior.
- Buyer `/wallet` now keeps the shared `AppTopBar` as a profile root utility without an unnecessary back action, and its loading state uses the same app-shell chrome instead of a bare centered spinner.
- Buyer `/coupons` and `/wishlist` now keep their shared `AppTopBar` headers as profile root utilities without unnecessary back actions, matching wallet/profile utility behavior.
- Buyer profile settings utilities `/addresses`, `/security`, and `/notification-settings` now keep their shared `AppTopBar` headers as root utility surfaces without unnecessary back actions, aligning them with wallet/coupons/wishlist.
- Buyer profile rewards utilities `/achievements` and `/tier-details` now keep their shared `AppTopBar` headers as root utility surfaces without unnecessary back actions, and loading states use app-shell chrome instead of bare centered spinners.
- Buyer utility forms `/edit-profile` and `/returns` now keep their shared `AppTopBar` headers as root utility surfaces without unnecessary back actions, aligning profile editing and return requests with the profile/support utility header standard.
- Buyer support roots `/help` and `/contact` now keep their shared `AppTopBar` headers without unnecessary back actions, matching footer/support navigation as first-class app surfaces.
- Buyer public roots `/about`, `/services`, and `/compare` now keep their shared `AppTopBar` headers without unnecessary back actions, matching footer/public navigation as first-class app surfaces.
- Buyer business funnel roots `/corporate-order`, `/become-seller`, and `/become-driver` now keep their shared `AppTopBar` headers without unnecessary back actions, matching public/business navigation as first-class app surfaces.
- Buyer shop funnel `/register-shop` now keeps its shared `AppTopBar` header without unnecessary back actions in both auth-required and wizard states, matching the public/business funnel standard.
- Buyer commerce/business utility roots `/bnpl`, `/ai-shopper`, `/flash-sale`, and `/tenders` now keep their shared `AppTopBar` headers without unnecessary back actions; `/bnpl` loading also uses app-shell chrome instead of a bare centered spinner.
- Buyer tab/profile utilities `/gold`, `/orders`, `/chat`, and `/notifications` now keep their shared `AppTopBar` headers without unnecessary back actions across auth, loading, error, and list states, matching the rest of the profile utility shell.
- Role dashboard roots `/owner/dashboard`, `/seller/dashboard`, and `/herder-admin/dashboard` now start with shared `AppTopBar` headers before their metric dashboards, matching role profile and buyer root header rhythm.
- Driver root `/driver/deliveries` now uses the shared `AppTopBar` with logout in the right action slot before its delivery dashboard card, aligning the driver dashboard with the other role roots.
- Driver workflows `/driver/earnings` and `/driver/delivery-detail` now use shared `AppTopBar` headers before their revenue and delivery detail content, keeping driver root/detail chrome aligned with the delivery dashboard.
- Store-owner workflow `/owner/orders` now starts with the shared `AppTopBar` before the order management card and status tabs, matching the owner dashboard/profile header rhythm.
- Store-owner workflows `/owner/products` and `/owner/analytics` now keep their shared `AppTopBar` headers as tab-root surfaces without an unnecessary back action, matching owner dashboard/order/profile behavior.
- Store-owner workflows `/owner/pos` and `/owner/settings` now follow the shared `AppTopBar` root-surface standard: POS keeps history/logout actions in the right slot, and settings no longer shows an unnecessary back action.
- Seller workflow `/seller/products` now starts with the shared `AppTopBar` before its product sharing list header, matching seller dashboard/profile header rhythm.
- Seller workflow `/seller/catalog` now starts with the shared `AppTopBar` before its referral catalog controls, keeping catalog/product/dashboard seller screens on one header standard.
- Seller workflow `/seller/earnings` now starts with the shared `AppTopBar` before its commission summary, keeping earnings/catalog/product/dashboard seller screens on one header standard.
- Seller workflow `/seller/leaderboard` now starts with the shared `AppTopBar` before its trophy card and period controls, keeping seller performance screens on the same header standard.
- Seller utility workflow `/seller/referral` now keeps its shared `AppTopBar` as a root surface without an unnecessary back action, matching the seller dashboard/catalog/products/earnings/leaderboard header behavior.
- Herder root workflows `/herder-admin/listings` and `/herder-admin/orders` now start with the shared `AppTopBar` before their management filters, matching the herder dashboard header rhythm while preserving back actions on detail/form screens.
- Herder root workflow `/herder-admin/earnings` now starts with the shared `AppTopBar` before its payout summary, completing the herder dashboard/listings/orders/earnings header rhythm.
- Coordinator root workflows `/coordinator/dashboard`, `/coordinator/applications`, and `/coordinator/herders` now start with shared `AppTopBar` headers before their review/management content, matching the role-root header standard used by owner, seller, driver, and herder screens.
- Coordinator detail workflow `/coordinator/application/[id]` now uses the shared `AppTopBar` for loading, not-found, and review states instead of a local back/title row, keeping application review detail chrome aligned with the coordinator root screens.
- Auth `returnTo` and session-expiry redirects now normalize legacy route-group URLs into public URLs, so old deep links such as `/(owner)/orders`, `/(driver)/deliveries`, `/(herder)/dashboard`, `/(coordinator)/applications`, `/(tabs)/store`, or `/(customer)/legal/terms` resolve to `/owner/orders`, `/driver/deliveries`, `/herder-admin/dashboard`, `/coordinator/applications`, `/store`, or `/terms`.
- `/feed/[id]` now relies only on the shared `AppTopBar` instead of enabling the native Stack header, preventing mixed or duplicated header chrome on listing detail pages.
- Legacy `/create-post` deep links now show the shared `AppScreen`/`AppTopBar` redirect state before forwarding to `/feed/create`, avoiding a blank transition surface in the app shell.
- `/feedback` deep links now use the same shared redirect surface with `AppScreen` and `AppTopBar` before opening `/contact?type=idea`, so footer feedback navigation never flashes a blank route.
- `/product/[id]` now mirrors the live product action stack with image count, share/save actions, affiliate CTA, and review write CTA while keeping the mobile cart/checkout controls.
- Root store slug links such as `/mstore` now resolve through the same storefront screen as `/storefront/[slug]`.
- `/[slug]` and `/storefront/[slug]` storefront pages now mirror live store pages with online-store/verified badges, contact/share actions, product hero, marketplace empty-state CTAs, contact/info/service-policy cards, and `Powered by eseller.mn` footer.
- Footer/support public routes `/terms`, `/privacy`, and `/partner` now exist in the mobile app; `/terms` and `/privacy` mirror the live legal copy, and `/partner` mirrors the live partnership cards, request form labels, partner-type options, and submit CTA.
- `/login#register` now lands on registration with the `Борлуулагч` role preselected, matching the live site's seller sign-up CTA.
- `/contact` and `/help` now mirror the live site's support surface more closely: contact method cards with live-matched phone/social/map targets, feedback form labels and type selection, FAQ categories, and live-matched `Мессеж илгээх`/`Утас залгах` CTAs.
- `/become-driver` now mirrors the live site's public driver request funnel with stats, requirements, vehicle selection, and request submission instead of creating a driver account directly from a public page.
- `/gold` now mirrors the live Gold page with trial copy, eight benefit cards, monthly/quarterly/annual plans, a savings calculator, and FAQ.
- `/become-seller` now mirrors the live seller registration funnel with a 5-step flow, seven seller/store types, business/contact/payment capture, and final confirmation.

## Remaining cross-repo work

This repository is the mobile app only. Full two-way parity also requires the web/frontend repository and backend route ownership:

- Web should expose mobile-only routes that are product-approved (`track/search`, wallet, wishlist, BNPL, live, herder flows) or intentionally hide them behind feature flags.
- Mobile should keep consuming shared backend-driven config for campaigns/banners once the web campaign source is exposed by API.
- Both projects should share one product navigation contract instead of duplicating labels in two repos.
