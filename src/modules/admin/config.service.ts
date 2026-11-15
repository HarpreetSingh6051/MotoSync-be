import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
const resources = {
  flags: {
    table: "app_feature_flags",
    key: "key",
    fields: [
      "name",
      "description",
      "category",
      "is_enabled",
      "access_level",
      "rollout_percentage",
      "service_status",
      "maintenance_message",
    ],
  },
  sounds: {
    table: "exhaust_sounds",
    key: "id",
    fields: [
      "name",
      "brand",
      "engine_configuration",
      "decibels",
      "audio_url",
      "synth_preset",
      "is_pro_only",
      "is_active",
      "sort_order",
    ],
  },
  campaigns: {
    table: "sponsored_campaigns",
    key: "id",
    fields: [
      "sponsor_name",
      "title",
      "perk_offer",
      "region",
      "cta_url",
      "cpm_rate_usd",
      "is_active",
    ],
  },
};
@Injectable()
export class ConfigAdminService {
  constructor(private readonly db: SupabaseService) {}
  private resource(name: string) {
    const item = Object.prototype.hasOwnProperty.call(resources, name)
      ? resources[name]
      : undefined;
    if (!item) throw new BadRequestException("Unknown configuration module");
    return item;
  }
  async list(name: string) {
    const resource = this.resource(name);
    const { data, error } = await this.db
      .getAdminClient()
      .from(resource.table)
      .select("*")
      .order(resource.key)
      .limit(1000);
    if (error) throw error;
    return data;
  }
  async archive(name: string, id: string, actor: string) {
    const resource = this.resource(name);
    const { data, error } = await this.db
      .getAdminClient()
      .from(resource.table)
      .select("*")
      .eq(resource.key, id)
      .single();
    if (error) throw error;
    const values = Object.fromEntries(
      Object.entries(data).filter(([key]) => resource.fields.includes(key)),
    );
    for (const field of ["audio_url", "cta_url"])
      if (values[field] === null) values[field] = "";
    if (name === "flags") {
      values.service_status = "disabled";
      values.is_enabled = false;
    } else values.is_active = false;
    return this.write(name, id, values, actor);
  }
  async write(
    name: string,
    id: string,
    values: Record<string, unknown>,
    actor: string,
  ) {
    const resource = this.resource(name);
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new BadRequestException("Invalid identifier");
    if (!values || typeof values !== "object" || Array.isArray(values))
      throw new BadRequestException("Configuration values are required");
    const numeric = [
      "rollout_percentage",
      "decibels",
      "sort_order",
      "cpm_rate_usd",
    ];
    for (const [key, value] of Object.entries(values)) {
      if (
        !key.startsWith("is_") &&
        !numeric.includes(key) &&
        typeof value !== "string"
      )
        throw new BadRequestException("Text field expected: " + key);
      if (
        ["rollout_percentage", "decibels", "sort_order"].includes(key) &&
        !Number.isInteger(value)
      )
        throw new BadRequestException("Integer expected: " + key);
    }
    if (Number(values.rollout_percentage) > 100)
      throw new BadRequestException("Rollout cannot exceed 100");
    for (const [key, value] of Object.entries(values)) {
      if (!resource.fields.includes(key))
        throw new BadRequestException(`Unsupported field: ${key}`);
      if (key.startsWith("is_") && typeof value !== "boolean")
        throw new BadRequestException(`Expected boolean: ${key}`);
      if (
        [
          "rollout_percentage",
          "decibels",
          "sort_order",
          "cpm_rate_usd",
        ].includes(key) &&
        (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      )
        throw new BadRequestException(`Invalid number: ${key}`);
      if (typeof value === "string" && value.length > 2000)
        throw new BadRequestException("Text too long");
      if (
        ["audio_url", "cta_url"].includes(key) &&
        value &&
        (typeof value !== "string" || !/^https:\/\//.test(value))
      )
        throw new BadRequestException("Media and action URLs must use HTTPS");
    }
    if (
      name === "flags" &&
      !["enabled", "disabled", "maintenance"].includes(
        String(values.service_status),
      )
    )
      throw new BadRequestException("Choose a valid service status");
    if (name === "flags")
      values.is_enabled = values.service_status === "enabled";
    const { data, error } = await this.db
      .getAdminClient()
      .rpc("admin_save_config", {
        resource_name: name,
        resource_id: id,
        changes: values,
        actor_id: actor,
      });
    if (error) throw error;
    return data;
  }
}
