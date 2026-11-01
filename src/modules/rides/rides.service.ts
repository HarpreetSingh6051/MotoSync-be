import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export const SEED_RIDES = [
  {
    id: 'r_sunrise',
    club_id: 'c_phog',
    captain_id: 'u_arjun',
    title: 'Sunrise Run to Haveli Murthal',
    route_summary: 'NH-44 Expressway · Flat, open cruising tarmac with morning paratha stop.',
    description: 'The classic Sunday sunrise pack. Roll out before first light, form the staggered formation at Karnal toll, and stop for hot parathas and chai.',
    region_scope: 'Near Me',
    distance_label: '160 km Roundtrip',
    distance_km: 160,
    start_time: new Date(Date.now() + 3600000 * 24).toISOString(),
    meetup_label: 'Karnal Toll Plaza, NH-44',
    meetup_coords: { coordinates: [76.9897, 29.6857] },
    destination_coords: { coordinates: [77.0863, 29.0252] },
    visibility: 'public',
    status: 'upcoming',
    max_riders: 25,
    split_enabled: true,
    likes_count: 84,
    comment_count: 19,
    difficulty: 'Spirited',
    hashtags: ['NH44', 'HarleyDavidson', 'SundayMorningPack', 'ParathaRun'],
    waypoints: [
      { id: 'w1', label: 'Toll Plaza Meetup', lat: 29.6857, lng: 76.9897, kind: 'fuel' },
      { id: 'w2', label: 'Ambala Highway Junction', lat: 30.3782, lng: 76.7767, kind: 'viewpoint' },
      { id: 'w3', label: 'Haveli Murthal (Breakfast)', lat: 29.0252, lng: 77.0863, kind: 'food' },
    ],
    participant_ids: ['u_arjun', 'u_simran', 'u_kabir'],
  },
  {
    id: 'r_nandi',
    club_id: 'c_bangalore_dawn',
    captain_id: 'u_ananya',
    title: 'Nandi Hills Dawn Sprint',
    route_summary: 'Bellary Road to Nandi Foothills · 38 Hairpin curves & crisp mountain air.',
    description: 'Early morning mountain curves up Nandi Hills. Meet at Hebbal flyover at 5:00 AM sharp before traffic builds.',
    region_scope: 'Near Me',
    distance_label: '120 km Roundtrip',
    distance_km: 120,
    start_time: new Date(Date.now() + 3600000 * 48).toISOString(),
    meetup_label: 'Hebbal Flyover, Bengaluru',
    meetup_coords: { coordinates: [77.5913, 13.0358] },
    destination_coords: { coordinates: [77.6835, 13.3702] },
    visibility: 'public',
    status: 'upcoming',
    max_riders: 20,
    split_enabled: true,
    likes_count: 112,
    comment_count: 32,
    difficulty: 'Spirited',
    hashtags: ['NandiHills', 'DawnPatrol', 'KTM390', 'Twisties'],
    waypoints: [
      { id: 'w1', label: 'Hebbal Assembly Point', lat: 13.0358, lng: 77.5913, kind: 'meetup' },
      { id: 'w2', label: 'Nandi Foothills Chai', lat: 13.3612, lng: 77.6741, kind: 'food' },
    ],
    participant_ids: ['u_ananya', 'u_simran'],
  },
];

@Injectable()
export class RidesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('rides')
        .select('*, participants:ride_participants(user_id, formation_role, rsvp_status)')
        .order('start_time', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      /* return seed rides */
    }
    return SEED_RIDES;
  }

  async findOne(id: string) {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('rides')
        .select('*, participants:ride_participants(user_id, formation_role, rsvp_status)')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch {
      /* fallback */
    }
    return SEED_RIDES.find((r) => r.id === id) || null;
  }

  async create(rideData: any) {
    try {
      const distanceKm = Number(rideData.distanceKm || rideData.distance_km || 120);
      const startTime = rideData.startTime || rideData.start_time || new Date(Date.now() + 86400000).toISOString();
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('rides')
        .insert({
          title: rideData.title || 'Sunday Pack Ride',
          route_summary: rideData.routeSummary || rideData.route_summary || 'Scenic highway run',
          description: rideData.description || '',
          captain_id: rideData.captainId || rideData.captain_id || 'u_arjun',
          club_id: rideData.clubId || rideData.club_id || null,
          region_scope: rideData.regionScope || rideData.region_scope || 'Near Me',
          distance_label: rideData.distanceLabel || `${distanceKm} km Roundtrip`,
          distance_km: distanceKm,
          start_time: startTime,
          meetup_label: rideData.meetupLabel || rideData.meetup_label || 'Highway Meetup Point',
          visibility: rideData.visibility || 'public',
          status: 'upcoming',
          max_riders: Number(rideData.maxRiders || 25),
          split_enabled: Boolean(rideData.splitEnabled ?? true),
          difficulty: rideData.difficulty || 'Spirited',
          hashtags: Array.isArray(rideData.hashtags) ? rideData.hashtags : ['MotoSync', 'PackRide'],
          waypoints: rideData.waypoints || [],
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {
      console.error('Ride creation error:', e);
    }

    return {
      id: `r_${Date.now()}`,
      ...rideData,
      likes_count: 1,
      comment_count: 0,
      status: 'upcoming',
      created_at: new Date().toISOString(),
    };
  }

  async join(rideId: string, userId: string, formationRole: string = 'Pack Member') {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('ride_participants')
        .upsert({
          ride_id: rideId,
          user_id: userId,
          formation_role: formationRole,
          rsvp_status: 'going',
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch {}

    return { ride_id: rideId, user_id: userId, formation_role: formationRole, rsvp_status: 'going' };
  }
}
