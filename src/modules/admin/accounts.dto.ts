import {
  IsArray,
  ArrayContains,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
export class AdminAccountDto {
  @IsString() @MinLength(1) @MaxLength(100) full_name: string;
  @IsString() @Matches(/^[a-z0-9_]{3,40}$/) role_id: string;
  @IsIn(["active", "suspended"]) status: string;
}
export class AdminCreateDto extends AdminAccountDto {
  @IsEmail() email: string;
  @IsString() @MinLength(12) @MaxLength(128) password: string;
}
export class AdminRoleDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
  @IsArray()
  @ArrayContains(["read"])
  @IsIn(["read", "write"], { each: true })
  permissions: string[];
}
