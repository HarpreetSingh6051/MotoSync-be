import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
export class CreateClubDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @Matches(/^[a-z0-9_]{3,40}$/) handle: string;
  @IsString() @MaxLength(2000) description: string;
  @IsString() @MinLength(1) @MaxLength(100) city: string;
  @IsIn(["India", "Global"]) region: string;
  @IsIn(["public", "invite_only"]) privacy: string;
  @IsUUID() created_by: string;
}
export class ScheduleRideDto {
  @IsString() @MinLength(1) @MaxLength(140) title: string;
  @IsString() @MinLength(1) @MaxLength(240) route_summary: string;
  @IsString() @MaxLength(2000) description: string;
  @IsUUID() captain_id: string;
  @IsOptional() @IsUUID() club_id?: string;
  @IsISO8601() start_time: string;
  @IsString() @MinLength(1) @MaxLength(200) meetup_label: string;
  @IsNumber() @Min(0) @Max(20000) distance_km: number;
  @IsInt() @Min(2) @Max(200) max_riders: number;
  @IsIn(["public", "group_only"]) visibility: string;
}
export class AnnouncementDto {
  @IsString() @MinLength(1) @MaxLength(140) title: string;
  @IsString() @MinLength(1) @MaxLength(5000) body: string;
  @IsIn(["all_riders", "all_groups", "club"]) audience: string;
  @IsOptional() @IsUUID() club_id?: string;
  @IsIn(["draft", "published"]) status: string;
  @IsISO8601() publish_at: string;
  @IsOptional() @IsISO8601() expires_at?: string;
}
