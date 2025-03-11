// User related types
export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  isAdmin: boolean;
  hasOffice: boolean;
}

// Office related types
export interface Office {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  ownerId: string;
  owner: User;
  members: OfficeMember[];
  memberCount: number;
  status: OfficeStatus;
}

export interface OfficeMember {
  userId: string;
  user: User;
  officeId: number;
  isOwner: boolean;
}

export enum OfficeStatus {
  ACTIVE = "active",
  AWAY = "away",
  OFFLINE = "offline"
}

export interface OfficeInput {
  name: string;
  description?: string;
  isPrivate: boolean;
  ownerId: string;
}

export interface OfficeUpdateInput {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

// Discord API types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string;
  accent_color?: number;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string;
  avatar?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: {
    bot_id?: string;
    integration_id?: string;
    premium_subscriber?: null;
  };
}
