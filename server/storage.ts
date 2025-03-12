import { 
  User, InsertUser, Office, InsertOffice, OfficeMember, InsertOfficeMember,
  users, offices, officeMembers
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  userHasOffice(userId: string): Promise<boolean>;

  // Office methods
  getAllOffices(): Promise<Office[]>;
  getOfficeById(id: number): Promise<Office | undefined>;
  getUserOffice(userId: string): Promise<Office | undefined>;
  getAvailableOffices(userId: string): Promise<Office[]>;
  createOffice(office: InsertOffice): Promise<Office>;
  updateOffice(id: number, updates: Partial<Office>): Promise<Office>;
  deleteOffice(id: number): Promise<void>;

  // Office member methods
  getOfficeMembers(officeId: number): Promise<OfficeMember[]>;
  isOfficeMember(officeId: number, userId: string): Promise<boolean>;
  addOfficeMember(member: InsertOfficeMember): Promise<OfficeMember>;
  removeOfficeMember(officeId: number, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private offices: Map<number, Office>;
  private officeMembers: Map<string, OfficeMember>; // key: `${officeId}:${userId}`
  private currentOfficeId: number;

  constructor() {
    this.users = new Map();
    this.offices = new Map();
    this.officeMembers = new Map();
    this.currentOfficeId = 1;
  }

  // User methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      avatar: user.avatar || null,
      isAdmin: user.isAdmin || false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      ...updates,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async userHasOffice(userId: string): Promise<boolean> {
    // Check if user is an owner of any office
    for (const office of this.offices.values()) {
      if (office.ownerId === userId) {
        return true;
      }
    }
    return false;
  }

  // Office methods
  async getAllOffices(): Promise<Office[]> {
    const offices = Array.from(this.offices.values());
    
    // Enrich offices with owner and member count
    return Promise.all(
      offices.map(async (office) => {
        const owner = this.users.get(office.ownerId);
        const members = await this.getOfficeMembers(office.id);
        
        return {
          ...office,
          owner: owner || { 
            id: office.ownerId, 
            username: "Unknown", 
            discriminator: "0000",
            isAdmin: false,
            avatar: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null
          },
          members,
          memberCount: members.length,
        };
      })
    );
  }

  async getOfficeById(id: number): Promise<Office | undefined> {
    const office = this.offices.get(id);
    if (!office) return undefined;
    
    const owner = this.users.get(office.ownerId);
    const members = await this.getOfficeMembers(id);
    
    const enrichedOffice = {
      ...office,
      owner: owner || { 
        id: office.ownerId, 
        username: "Unknown", 
        discriminator: "0000",
        isAdmin: false,
        avatar: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      },
      members,
      memberCount: members.length,
    };
    
    return enrichedOffice;
  }

  async getUserOffice(userId: string): Promise<Office | undefined> {
    // Find office where user is an owner or member
    const offices = await this.getAllOffices();
    
    return offices.find(
      (office) => 
        office.ownerId === userId || 
        office.members.some(member => member.userId === userId)
    );
  }

  async getAvailableOffices(userId: string): Promise<Office[]> {
    const allOffices = await this.getAllOffices();
    
    // Get offices that are either public or where the user is already a member
    return allOffices.filter(
      (office) => 
        !office.isPrivate || 
        office.members.some(member => member.userId === userId)
    );
  }

  async createOffice(office: InsertOffice): Promise<Office> {
    const id = this.currentOfficeId++;
    
    const newOffice = {
      ...office,
      id,
      status: "active",
      createdAt: new Date(),
      voiceChannelId: null as string | null, // Will be filled after creation
      description: office.description || null,
    };
    
    this.offices.set(id, newOffice);
    
    // Create the voice channel on Discord
    try {
      // Import discord functions dynamically to avoid circular dependency
      const discordModule = await import('./discord');
      
      // Use VC_CATEGORY_ID from environment if available
      const categoryId = process.env.VC_CATEGORY_ID;
      
      // Create a voice channel with the office name
      const channelId = await discordModule.createVoiceChannel(`Office-${newOffice.name}`, categoryId);
      
      // Update the office with the channel ID
      newOffice.voiceChannelId = channelId;
      this.offices.set(id, newOffice);
      
      console.log(`Created voice channel for office ${newOffice.name} with ID ${channelId}`);
    } catch (error) {
      console.error(`Failed to create voice channel for office ${newOffice.name}:`, error);
      // Continue even if voice channel creation fails
    }
    
    // Add the owner as an office member
    await this.addOfficeMember({
      officeId: id,
      userId: office.ownerId,
      isOwner: true
    });
    
    // Get enriched office
    return this.getOfficeById(id) as Promise<Office>;
  }

  async updateOffice(id: number, updates: Partial<Office>): Promise<Office> {
    const office = this.offices.get(id);
    if (!office) {
      throw new Error(`Office with ID ${id} not found`);
    }

    const updatedOffice = {
      ...office,
      ...updates,
    };
    
    this.offices.set(id, updatedOffice);
    
    // If the name was changed and we have a voice channel, update the channel name
    if (updates.name && office.voiceChannelId) {
      try {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Update the voice channel name
        await discordModule.updateVoiceChannelName(
          office.voiceChannelId, 
          `Office-${updates.name}`
        );
        
        console.log(`Updated voice channel name for office ${updates.name} with ID ${office.voiceChannelId}`);
      } catch (error) {
        console.error(`Failed to update voice channel name for office ${updates.name}:`, error);
        // Continue even if voice channel update fails
      }
    }
    
    // Get enriched office
    return this.getOfficeById(id) as Promise<Office>;
  }

  async deleteOffice(id: number): Promise<void> {
    // Get the office to access the voice channel ID
    const office = this.offices.get(id);
    
    // Delete all members first
    const officeMembers = await this.getOfficeMembers(id);
    for (const member of officeMembers) {
      await this.removeOfficeMember(id, member.userId);
    }
    
    // Delete the Discord voice channel if it exists
    if (office && office.voiceChannelId) {
      try {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Delete the voice channel
        await discordModule.deleteVoiceChannel(office.voiceChannelId);
        console.log(`Deleted voice channel for office ${office.name} with ID ${office.voiceChannelId}`);
      } catch (error) {
        console.error(`Failed to delete voice channel for office ${office?.name}:`, error);
        // Continue even if voice channel deletion fails
      }
    }
    
    // Delete the office
    this.offices.delete(id);
  }

  // Office member methods
  async getOfficeMembers(officeId: number): Promise<OfficeMember[]> {
    const members: OfficeMember[] = [];
    
    for (const [key, member] of this.officeMembers.entries()) {
      if (member.officeId === officeId) {
        const user = this.users.get(member.userId);
        if (user) {
          const enrichedMember = {
            ...member,
            user,
          };
          members.push(enrichedMember);
        }
      }
    }
    
    return members;
  }

  async isOfficeMember(officeId: number, userId: string): Promise<boolean> {
    return this.officeMembers.has(`${officeId}:${userId}`);
  }

  async addOfficeMember(member: InsertOfficeMember): Promise<OfficeMember> {
    const newMember = {
      ...member,
      id: 0,
      joinedAt: new Date(),
    };
    
    this.officeMembers.set(`${member.officeId}:${member.userId}`, newMember as OfficeMember);
    
    // Get the user
    const user = this.users.get(member.userId);
    
    // Create enriched member
    const enrichedMember = {
      ...newMember,
      user: user || { 
        id: member.userId, 
        username: "Unknown", 
        discriminator: "0000",
        isAdmin: false,
        avatar: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      }
    };
    
    // Grant permission to the voice channel if it exists
    try {
      const office = await this.getOfficeById(member.officeId);
      if (office && office.voiceChannelId) {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Allow the user to connect and speak in the voice channel
        await discordModule.updateChannelPermissions(office.voiceChannelId, member.userId);
        console.log(`Granted voice permissions to user ${member.userId} for office ${office.name}`);
      }
    } catch (error) {
      console.error(`Failed to update voice channel permissions for user ${member.userId}:`, error);
      // Continue even if permission update fails
    }
    
    return enrichedMember;
  }

  async removeOfficeMember(officeId: number, userId: string): Promise<void> {
    // Revoke permissions from the voice channel if it exists
    try {
      const office = await this.getOfficeById(officeId);
      if (office && office.voiceChannelId) {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Explicitly deny connect and speak permissions for the removed user
        // For deny, we want to deny CONNECT (1 << 20 = 1048576) and SPEAK (1 << 21 = 2097152)
        // 1048576 + 2097152 = 3145728
        await discordModule.updateChannelPermissions(
          office.voiceChannelId, 
          userId,
          0, // No allows
          3145728 // Deny connect and speak
        );
        console.log(`Revoked voice permissions from user ${userId} for office ${office.name}`);
      }
    } catch (error) {
      console.error(`Failed to update voice channel permissions for user ${userId}:`, error);
      // Continue even if permission update fails
    }
    
    // Remove the member from the office
    this.officeMembers.delete(`${officeId}:${userId}`);
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Ensure required fields have values
    const userToInsert = {
      ...user,
      avatar: user.avatar || null,
      isAdmin: user.isAdmin || false,
      accessToken: user.accessToken || null,
      refreshToken: user.refreshToken || null,
      tokenExpiry: user.tokenExpiry || null
    };
    
    const [createdUser] = await db.insert(users).values(userToInsert).returning();
    return createdUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async userHasOffice(userId: string): Promise<boolean> {
    const [office] = await db
      .select({ id: offices.id })
      .from(offices)
      .where(eq(offices.ownerId, userId));
    
    return Boolean(office);
  }

  // Office methods
  async getAllOffices(): Promise<Office[]> {
    const allOffices = await db.select().from(offices);
    
    // Enrich with owner, members, and memberCount
    const enrichedOffices = await Promise.all(
      allOffices.map(async (office) => {
        const owner = await this.getUserById(office.ownerId);
        const members = await this.getOfficeMembers(office.id);
        
        return {
          ...office,
          owner: owner || { 
            id: office.ownerId, 
            username: 'Unknown', 
            discriminator: '0000',
            isAdmin: false,
            avatar: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null
          },
          members,
          memberCount: members.length
        };
      })
    );
    
    return enrichedOffices;
  }

  async getOfficeById(id: number): Promise<Office | undefined> {
    const [office] = await db.select().from(offices).where(eq(offices.id, id));
    
    if (!office) {
      return undefined;
    }
    
    // Get owner
    const owner = await this.getUserById(office.ownerId);
    
    // Get members
    const members = await this.getOfficeMembers(id);
    
    return {
      ...office,
      owner: owner || { 
        id: office.ownerId, 
        username: 'Unknown', 
        discriminator: '0000',
        isAdmin: false,
        avatar: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      },
      members,
      memberCount: members.length
    };
  }

  async getUserOffice(userId: string): Promise<Office | undefined> {
    // Check if user is an owner of any office
    const [userOffice] = await db
      .select()
      .from(offices)
      .where(eq(offices.ownerId, userId));
    
    if (userOffice) {
      return this.getOfficeById(userOffice.id);
    }
    
    // If not an owner, check if they're a member of any office
    const [officeMember] = await db
      .select()
      .from(officeMembers)
      .where(eq(officeMembers.userId, userId));
    
    if (officeMember) {
      return this.getOfficeById(officeMember.officeId);
    }
    
    return undefined;
  }

  async getAvailableOffices(userId: string): Promise<Office[]> {
    // Get the user's office first (if any)
    const userOffice = await this.getUserOffice(userId);
    
    // Get all public offices or private offices where the user is a member
    const availableOffices = await db
      .select()
      .from(offices)
      .where(
        (userOffice?.id !== undefined) 
          ? and(ne(offices.id, userOffice.id), eq(offices.isPrivate, false))
          : eq(offices.isPrivate, false)
      );
    
    // Enrich with owner, members, and memberCount
    const enrichedOffices = await Promise.all(
      availableOffices.map(async (office) => {
        const owner = await this.getUserById(office.ownerId);
        const members = await this.getOfficeMembers(office.id);
        
        return {
          ...office,
          owner: owner || { 
            id: office.ownerId, 
            username: 'Unknown', 
            discriminator: '0000',
            isAdmin: false,
            avatar: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null
          },
          members,
          memberCount: members.length
        };
      })
    );
    
    return enrichedOffices;
  }

  async createOffice(office: InsertOffice): Promise<Office> {
    // Create the office in the database
    const [createdOffice] = await db
      .insert(offices)
      .values({
        ...office,
        description: office.description || null
      })
      .returning();
    
    // Create the voice channel on Discord
    try {
      // Import discord functions dynamically to avoid circular dependency
      const discordModule = await import('./discord');
      
      // Use VC_CATEGORY_ID from environment if available
      const categoryId = process.env.VC_CATEGORY_ID;
      
      // Create a voice channel with the office name
      const channelId = await discordModule.createVoiceChannel(`Office-${createdOffice.name}`, categoryId);
      
      // Update the office with the channel ID
      const [updatedOffice] = await db
        .update(offices)
        .set({ voiceChannelId: channelId })
        .where(eq(offices.id, createdOffice.id))
        .returning();
      
      console.log(`Created voice channel for office ${updatedOffice.name} with ID ${channelId}`);
      
      // Add the owner as an office member with isOwner=true
      await this.addOfficeMember({
        officeId: updatedOffice.id,
        userId: updatedOffice.ownerId,
        isOwner: true
      });
      
      // Return the enriched office
      return this.getOfficeById(updatedOffice.id) as Promise<Office>;
    } catch (error) {
      console.error(`Failed to create voice channel for office ${createdOffice.name}:`, error);
      
      // Add the owner as an office member even if voice channel creation fails
      await this.addOfficeMember({
        officeId: createdOffice.id,
        userId: createdOffice.ownerId,
        isOwner: true
      });
      
      // Return the enriched office
      return this.getOfficeById(createdOffice.id) as Promise<Office>;
    }
  }

  async updateOffice(id: number, updates: Partial<Office>): Promise<Office> {
    // Get the current office data
    const [office] = await db
      .select()
      .from(offices)
      .where(eq(offices.id, id));
    
    if (!office) {
      throw new Error(`Office with ID ${id} not found`);
    }
    
    // Update the office in the database
    const [updatedOffice] = await db
      .update(offices)
      .set(updates)
      .where(eq(offices.id, id))
      .returning();
    
    // If the name was changed and we have a voice channel, update the channel name
    if (updates.name && office.voiceChannelId) {
      try {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Update the voice channel name
        await discordModule.updateVoiceChannelName(
          office.voiceChannelId, 
          `Office-${updates.name}`
        );
        
        console.log(`Updated voice channel name for office ${updates.name} with ID ${office.voiceChannelId}`);
      } catch (error) {
        console.error(`Failed to update voice channel name for office ${updates.name}:`, error);
        // Continue even if voice channel update fails
      }
    }
    
    // Return the enriched office
    return this.getOfficeById(id) as Promise<Office>;
  }

  async deleteOffice(id: number): Promise<void> {
    // Get the office to access the voice channel ID
    const [office] = await db
      .select()
      .from(offices)
      .where(eq(offices.id, id));
    
    if (!office) {
      throw new Error(`Office with ID ${id} not found`);
    }
    
    // Delete all members first
    await db
      .delete(officeMembers)
      .where(eq(officeMembers.officeId, id));
    
    // Delete the Discord voice channel if it exists
    if (office.voiceChannelId) {
      try {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Delete the voice channel
        await discordModule.deleteVoiceChannel(office.voiceChannelId);
        console.log(`Deleted voice channel for office ${office.name} with ID ${office.voiceChannelId}`);
      } catch (error) {
        console.error(`Failed to delete voice channel for office ${office.name}:`, error);
        // Continue even if voice channel deletion fails
      }
    }
    
    // Delete the office
    await db
      .delete(offices)
      .where(eq(offices.id, id));
  }

  // Office member methods
  async getOfficeMembers(officeId: number): Promise<OfficeMember[]> {
    const members = await db
      .select()
      .from(officeMembers)
      .where(eq(officeMembers.officeId, officeId));
    
    // Enrich with user data
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const user = await this.getUserById(member.userId);
        
        return {
          ...member,
          user: user || { 
            id: member.userId, 
            username: 'Unknown', 
            discriminator: '0000',
            isAdmin: false,
            avatar: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null
          }
        };
      })
    );
    
    return enrichedMembers;
  }

  async isOfficeMember(officeId: number, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(officeMembers)
      .where(
        and(
          eq(officeMembers.officeId, officeId),
          eq(officeMembers.userId, userId)
        )
      );
    
    return Boolean(member);
  }

  async addOfficeMember(member: InsertOfficeMember): Promise<OfficeMember> {
    // Add the member to the database
    const [newMember] = await db
      .insert(officeMembers)
      .values(member)
      .returning();
    
    // Grant permission to the voice channel if it exists
    try {
      const [office] = await db
        .select()
        .from(offices)
        .where(eq(offices.id, member.officeId));
      
      if (office && office.voiceChannelId) {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Allow the user to connect and speak in the voice channel
        await discordModule.updateChannelPermissions(office.voiceChannelId, member.userId);
        console.log(`Granted voice permissions to user ${member.userId} for office ${office.name}`);
      }
    } catch (error) {
      console.error(`Failed to update voice channel permissions for user ${member.userId}:`, error);
      // Continue even if permission update fails
    }
    
    // Get user data
    const user = await this.getUserById(member.userId);
    
    // Return enriched member
    return {
      ...newMember,
      user: user || { 
        id: member.userId, 
        username: 'Unknown', 
        discriminator: '0000',
        isAdmin: false,
        avatar: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      }
    };
  }

  async removeOfficeMember(officeId: number, userId: string): Promise<void> {
    // Revoke permissions from the voice channel if it exists
    try {
      const [office] = await db
        .select()
        .from(offices)
        .where(eq(offices.id, officeId));
      
      if (office && office.voiceChannelId) {
        // Import discord functions dynamically to avoid circular dependency
        const discordModule = await import('./discord');
        
        // Explicitly deny connect and speak permissions for the removed user
        // For deny, we want to deny CONNECT (1 << 20 = 1048576) and SPEAK (1 << 21 = 2097152)
        // 1048576 + 2097152 = 3145728
        await discordModule.updateChannelPermissions(
          office.voiceChannelId, 
          userId,
          0, // No allows
          3145728 // Deny connect and speak
        );
        console.log(`Revoked voice permissions from user ${userId} for office ${office.name}`);
      }
    } catch (error) {
      console.error(`Failed to update voice channel permissions for user ${userId}:`, error);
      // Continue even if permission update fails
    }
    
    // Remove the member from the database
    await db
      .delete(officeMembers)
      .where(
        and(
          eq(officeMembers.officeId, officeId),
          eq(officeMembers.userId, userId)
        )
      );
  }
}

// Change from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();