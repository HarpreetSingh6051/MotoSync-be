import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { RidesModule } from './modules/rides/rides.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { PlansModule } from './modules/plans/plans.module';
import { FlagsModule } from './modules/flags/flags.module';
import { SoundsModule } from './modules/sounds/sounds.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    HealthModule,
    UsersModule,
    RidesModule,
    ClubsModule,
    PlansModule,
    FlagsModule,
    SoundsModule,
    CampaignsModule,
    AdminModule,
  ],
})
export class AppModule {}
