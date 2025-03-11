import { DiscordUser, DiscordGuildMember, DiscordRole } from "../client/src/lib/types";

const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!BOT_TOKEN || !GUILD_ID) {
  throw new Error("Missing required environment variables: BOT_TOKEN or GUILD_ID");
}

// Get user info using user's access token
export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

// Get guild member info using bot token
export async function getGuildMember(userId: string): Promise<DiscordGuildMember | null> {
  try {
    const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
      },
    });

    if (response.status === 404) {
      return null; // User is not a member of the guild
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch guild member: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching guild member:", error);
    throw error;
  }
}

// Get guild roles
export async function getGuildRoles(): Promise<DiscordRole[]> {
  const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/roles`, {
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guild roles: ${response.statusText}`);
  }

  return response.json();
}

// Get member roles
export async function getMemberRoles(member: DiscordGuildMember): Promise<string[]> {
  return member.roles || [];
}

// Fetch all guild members
export async function fetchGuildMembers(): Promise<DiscordGuildMember[]> {
  try {
    const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members?limit=1000`, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch guild members: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching guild members:", error);
    throw error;
  }
}

// Create a voice channel for an office
export async function createVoiceChannel(name: string, categoryId: string | undefined): Promise<string> {
  const payload: any = {
    name,
    type: 2, // Voice channel
    permission_overwrites: [], // Default permissions
  };

  if (categoryId) {
    payload.parent_id = categoryId;
  }

  const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create voice channel: ${response.statusText}`);
  }

  const channel = await response.json();
  return channel.id;
}

// Delete a voice channel
export async function deleteVoiceChannel(channelId: string): Promise<void> {
  const response = await fetch(`https://discord.com/api/channels/${channelId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete voice channel: ${response.statusText}`);
  }
}

// Update channel permissions for a user
export async function updateChannelPermissions(
  channelId: string,
  userId: string,
  allow: number,
  deny: number
): Promise<void> {
  const response = await fetch(
    `https://discord.com/api/channels/${channelId}/permissions/${userId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allow: allow.toString(),
        deny: deny.toString(),
        type: 1, // 1 for member, 0 for role
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update channel permissions: ${response.statusText}`);
  }
}
