import { User, InsertUser, Office, InsertOffice, OfficeMember, InsertOfficeMember } from "@shared/schema";

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
            isAdmin: false
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
    
    return {
      ...office,
      owner: owner || { 
        id: office.ownerId, 
        username: "Unknown", 
        discriminator: "0000",
        isAdmin: false
      },
      members,
      memberCount: members.length,
    };
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
    
    // Create office in local storage
    const newOffice: Office = {
      ...office,
      id,
      status: "active",
      createdAt: new Date(),
      owner: { id: "", username: "", discriminator: "", isAdmin: false },
      members: [],
      memberCount: 0,
      voiceChannelId: null, // Will be filled after creation
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
    
    // Get enriched office
    return this.getOfficeById(id) as Promise<Office>;
  }

  async updateOffice(id: number, updates: Partial<Office>): Promise<Office> {
    const office = this.offices.get(id);
    if (!office) {
      throw new Error(`Office with ID ${id} not found`);
    }

    const updatedOffice: Office = {
      ...office,
      ...updates,
      owner: office.owner || { id: "", username: "", discriminator: "", isAdmin: false },
      members: [],
      memberCount: 0,
    };
    
    this.offices.set(id, updatedOffice);
    
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
          members.push({
            ...member,
            user,
          });
        }
      }
    }
    
    return members;
  }

  async isOfficeMember(officeId: number, userId: string): Promise<boolean> {
    return this.officeMembers.has(`${officeId}:${userId}`);
  }

  async addOfficeMember(member: InsertOfficeMember): Promise<OfficeMember> {
    const newMember: OfficeMember = {
      ...member,
      id: 0,
      joinedAt: new Date(),
      user: { id: "", username: "", discriminator: "", isAdmin: false },
    };
    
    this.officeMembers.set(`${member.officeId}:${member.userId}`, newMember);
    
    // Get the user
    const user = this.users.get(member.userId);
    if (user) {
      newMember.user = user;
    }
    
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
    
    return newMember;
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

export const storage = new MemStorage();
