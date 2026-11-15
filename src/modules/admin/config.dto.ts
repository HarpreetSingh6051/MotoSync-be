import { IsObject } from "class-validator";
export class ConfigWriteDto {
  @IsObject() values: Record<string, unknown>;
}
