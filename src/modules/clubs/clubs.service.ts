import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export const SEED_CLUBS = [
  {
    id: 'c_phog',
    name: 'Punjab Harley Owners',
    handle: 'phog',
    description: 'The original NH-44 Sunday pack. Cruisers, touring rigs and the best post-ride parathas in Punjab.',
    city: 'Ludhiana',
    region: 'India',
    riding_style: 'Cruisers & Touring',
    badge_emoji: '🦅',
    privacy: 'public',
    verified: true,
    member_count: 412,
    riding_now: 34,
    accent: '#F43F5E',
    created_by: 'u_arjun',
    founded: '2019',
  },
  {
    id: 'c_bangalore_dawn',
    name: 'Bangalore Dawn Patrol',
    handle: 'dawnbangalore',
    description: 'Early morning mountain and trail runs up Nandi Hills and Kanakapura. ADVs and dual-sports preferred.',
    city: 'Bengaluru',
    region: 'India',
    riding_style: 'Adventure & Dual-Sport',
    badge_emoji: '⚡',
    privacy: 'public',
    verified: true,
    member_count: 298,
    riding_now: 18,
    accent: '#22D3EE',
    created_by: 'u_ananya',
    founded: '2021',
  },
  {
    id: 'c_delhi_caferacers',
    name: 'Delhi Cafe Racers',
    handle: 'dcr_delhi',
    description: 'Classic thumpers, retro roadsters, and sunrise breakfast sprints across Gurgaon-Faridabad expressway.',
    city: 'New Delhi',
    region: 'India',
    riding_style: 'Cafe Racers & Classics',
    badge_emoji: '☕',
    privacy: 'public',
    verified: false,
    member_count: 514,
    riding_now: 42,
    accent: '#FBBF24',
    created_by: 'u_dev',
    founded: '2020',
  },
  {
    id: 'c_mumbai_coastal',
    name: 'Mumbai Coastal Cruisers',
    handle: 'mumbaicoastal',
    description: 'Night rides along Marine Drive and spirited Sunday runs through the Western Ghats to Lonavala.',
    city: 'Mumbai',
    region: 'India',
    riding_style: 'Coastal & Highway Cruising',
    badge_emoji: '🌊',
    privacy: 'invite_only',
    verified: true,
    member_count: 380,
    riding_now: 12,
    accent: '#10B981',
    created_by: 'u_simran',
    founded: '2022',
  },
];

@Injectable()
export class ClubsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('clubs')
        .select('*')
        .order('member_count', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      /* return seed clubs */
    }
    return SEED_CLUBS;
  }

  async findOne(id: string) {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch {
      /* fallback */
    }
    return SEED_CLUBS.find((c) => c.id === id) || null;
  }

  async create(clubData: any) {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('clubs')
        .insert({
          name: clubData.name,
          handle: clubData.handle || clubData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          description: clubData.description || '',
          city: clubData.city || 'India',
          region: clubData.region || 'India',
          riding_style: clubData.ridingStyle || clubData.riding_style || 'Cruisers & Touring',
          badge_emoji: clubData.badgeEmoji || clubData.badge_emoji || '🏍️',
          privacy: clubData.privacy || 'public',
          verified: Boolean(clubData.verified),
          accent: clubData.accent || '#F43F5E',
          created_by: clubData.createdBy || clubData.created_by,
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {
      console.error('Club creation error:', e);
    }
    return {
      id: `c_${Date.now()}`,
      ...clubData,
      member_count: 1,
      riding_now: 0,
      created_at: new Date().toISOString(),
    };
  }

  async update(id: string, updates: any) {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('clubs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch {
      /* fallback */
    }
    const existing = SEED_CLUBS.find((c) => c.id === id);
    return { ...existing, ...updates };
  }
}
