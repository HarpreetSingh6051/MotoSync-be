import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayMaxSize,
  Matches,
} from "class-validator";
export class PlanDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,80}$/) id: string;
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(240) tagline: string;
  @IsIn(["rider", "club"]) audience: string;
  @IsIn(["monthly", "annual", "lifetime"]) billing_interval: string;
  @IsInt() @Min(0) price_inr: number;
  @IsNumber() @Min(0) price_usd: number;
  @IsBoolean() is_active: boolean;
  @IsBoolean() is_popular: boolean;
  @IsInt() @Min(0) sort_order: number;
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  features: string[];
}
export class UserPatchDto {
  @IsOptional() @IsIn(["active", "suspended", "banned"]) status?: string;
  @IsOptional() @IsString() @MaxLength(80) subscription_plan_id?: string;
}
export class ClubPatchDto {
  @IsBoolean() verified: boolean;
}
