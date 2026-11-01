import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export const SEED_PURCHASES = [
  {
    id: 'tx_9921',
    transactionId: 'PAY-MS-2026-9021',
    riderId: 'u_arjun',
    riderName: 'Arjun Singh',
    riderHandle: 'rajasingh',
    planId: 'plan_pro',
    planName: 'Road Captain PRO',
    amountInr: 199,
    amountUsd: 4.99,
    billingInterval: 'monthly',
    purchasedAt: '2026-10-28 09:14 AM',
    paymentMethod: 'UPI / Razorpay',
    status: 'paid',
  },
  {
    id: 'tx_9922',
    transactionId: 'PAY-MS-2026-8874',
    riderId: 'u_simran',
    riderName: 'Simran Kaur',
    riderHandle: 'simranrides',
    planId: 'plan_pro',
    planName: 'Road Captain PRO',
    amountInr: 199,
    amountUsd: 4.99,
    billingInterval: 'monthly',
    purchasedAt: '2026-10-29 11:32 AM',
    paymentMethod: 'UPI / Razorpay',
    status: 'paid',
  },
  {
    id: 'tx_9923',
    transactionId: 'PAY-MS-2026-7643',
    riderId: 'u_ananya',
    riderName: 'Ananya Rao',
    riderHandle: 'ananyarevs',
    planId: 'plan_pro_annual',
    planName: 'Road Captain PRO Annual',
    amountInr: 1499,
    amountUsd: 39.99,
    billingInterval: 'annual',
    purchasedAt: '2026-10-30 02:45 PM',
    paymentMethod: 'Credit Card / Stripe',
    status: 'paid',
  },
  {
    id: 'tx_9924',
    transactionId: 'PAY-MS-2026-6512',
    riderId: 'u_kabir',
    riderName: 'Kabir Mehta',
    riderHandle: 'kabironwheels',
    planId: 'plan_silver',
    planName: 'Silver Visor',
    amountInr: 99,
    amountUsd: 1.99,
    billingInterval: 'monthly',
    purchasedAt: '2026-10-31 08:20 AM',
    paymentMethod: 'Apple Pay',
    status: 'paid',
  },
  {
    id: 'tx_9925',
    transactionId: 'PAY-MS-2026-5198',
    riderId: 'u_dev',
    riderName: 'Dev Sharma',
    riderHandle: 'devonfire',
    planId: 'plan_club',
    planName: 'Club Shield',
    amountInr: 4999,
    amountUsd: 59.0,
    billingInterval: 'monthly',
    purchasedAt: '2026-11-01 10:05 AM',
    paymentMethod: 'UPI / Razorpay',
    status: 'paid',
  },
];

@Injectable()
export class ReportsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAllPurchases() {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      /* return seed purchases */
    }
    return SEED_PURCHASES;
  }
}
