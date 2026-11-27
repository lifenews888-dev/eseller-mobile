// Вэбийн src/lib/order-pricing-constants.ts-тэй ижил байх ёстой (сервер эцсийн дүнг тооцно).
export const FREE_DELIVERY_THRESHOLD = 50000;
export const DELIVERY_FEE = 3000;

export function deliveryFeeFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}
