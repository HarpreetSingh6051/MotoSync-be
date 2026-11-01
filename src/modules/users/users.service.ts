import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export const SEED_USERS = [
  {
    id: 'u_arjun',
    handle: 'rajasingh',
    full_name: 'Arjun Singh',
    city: 'Ludhiana, IN',
    country: 'IN',
    primary_bike: 'Harley-Davidson Fat Bob 114',
    bio: 'Road Captain. Sunday sunrise runs on NH-44. 48,000 km of dhaba chai and V-twin noise.',
    is_pro: true,
    total_km: 48120,
    role: 'super_admin',
    status: 'active',
    subscription_plan_id: 'plan_pro',
    created_at: '2026-02-14T08:00:00Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'u_simran',
    handle: 'simranrides',
    full_name: 'Simran Kaur',
    city: 'Ludhiana, IN',
    country: 'IN',
    primary_bike: 'Royal Enfield Himalayan 450',
    bio: 'Reel creator. Himalayan passes, cold mornings, warm chai.',
    is_pro: true,
    total_km: 31480,
    role: 'road_captain',
    status: 'active',
    subscription_plan_id: 'plan_pro',
    created_at: '2026-03-22T10:30:00Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'u_kabir',
    handle: 'kabironwheels',
    full_name: 'Kabir Mehta',
    city: 'Chandigarh, IN',
    country: 'IN',
    primary_bike: 'Triumph Scrambler 900',
    bio: 'Sweep rider and toolkit guy. If it rattles, I have a spanner for it.',
    is_pro: false,
    total_km: 18620,
    role: 'rider',
    status: 'active',
    subscription_plan_id: 'plan_free',
    created_at: '2026-05-10T14:15:00Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'u_ananya',
    handle: 'ananyarevs',
    full_name: 'Ananya Rao',
    city: 'Bengaluru, IN',
    country: 'IN',
    primary_bike: 'KTM 390 Adventure',
    bio: 'Dawn patrol advocate. Mountain twisties, high revs, no excuses.',
    is_pro: true,
    total_km: 27940,
    role: 'road_captain',
    status: 'active',
    subscription_plan_id: 'plan_pro_annual',
    created_at: '2026-04-05T07:45:00Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'u_dev',
    handle: 'devonfire',
    full_name: 'Dev Sharma',
    city: 'New Delhi, IN',
    country: 'IN',
    primary_bike: 'Ducati Scrambler Icon',
    bio: 'Cafe racer enthusiast and weekend track day rider.',
    is_pro: false,
    total_km: 14200,
    role: 'rider',
    status: 'active',
    subscription_plan_id: 'plan_free',
    created_at: '2026-06-18T16:20:00Z',
    last_active_at: new Date().toISOString(),
  },
];

let memoryUsers = [...SEED_USERS];

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      /* return memory users */
    }
    return memoryUsers;
  }

  async findOne(id: string) {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch {
      /* fallback */
    }
    return memoryUsers.find((u) => u.id === id) || null;
  }

  async createOrUpdate(userData: any) {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('profiles')
        .upsert(userData)
        .select()
        .single();

      if (!error && data) {
        const idx = memoryUsers.findIndex((u) => u.id === data.id);
        if (idx >= 0) memoryUsers[idx] = data;
        else memoryUsers.unshift(data);
        return data;
      }
    } catch (e) {
      console.error('User upsert error:', e);
    }

    const fallbackUser = {
      id: userData.id || `u_${Date.now()}`,
      ...userData,
      updated_at: new Date().toISOString(),
      created_at: userData.created_at || new Date().toISOString(),
    };
    const idx = memoryUsers.findIndex(
      (u) => u.id === fallbackUser.id || (userData.handle && u.handle === userData.handle),
    );
    if (idx >= 0) {
      memoryUsers[idx] = { ...memoryUsers[idx], ...fallbackUser };
    } else {
      memoryUsers.unshift(fallbackUser);
    }
    return fallbackUser;
  }
}
