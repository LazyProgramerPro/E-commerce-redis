import type { Bid, CreateBidAttrs } from '$services/types'

export const createBid = async (attrs: CreateBidAttrs) => {}

export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
  return []
}
