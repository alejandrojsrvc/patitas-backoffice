import type { Offer, Variant } from "../../types";

export const getWinningOffer = (variant: Variant, offers: Offer[]) =>
  offers
    .filter(
      (offer) =>
        offer.variantId === variant.id &&
        offer.active !== false &&
        Number.isFinite(Number(offer.unitCost)),
    )
    .sort((a, b) => Number(a.unitCost) - Number(b.unitCost))[0];
