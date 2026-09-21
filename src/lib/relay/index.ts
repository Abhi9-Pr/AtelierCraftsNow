import type { OrderPayload, SubmitResult } from '@/types'
import { submitViaApi } from './orders'
import { submitOrder as sendEmail } from './web3forms'

/**
 * Where an order goes. It is sent to the site's own order API first, which stores it. Only if there
 * is no order API (see ./orders) does the email relay named here take over. To use another email
 * relay, point the import at './formspree' or './netlify'. Each exports the same submitOrder(payload)
 * function. Setup for all of them is in docs/SETUP.md.
 */
export const submitOrder = (payload: OrderPayload): Promise<SubmitResult> => submitViaApi(payload, sendEmail)
