import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { getDiscordUser, getGuildMember, getMemberRoles, fetchGuildMembers } from "./discord";
import { insertOfficeSchema, updateOfficeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // ----- API Routes -----

  // Current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has admin role
    let isAdmin = user.isAdmin;
    if (!isAdmin && user.id) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
          
          // Update user admin status in storage
          if (isAdmin !== user.isAdmin) {
            await storage.updateUser(user.id, { isAdmin });
          }
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    // Check if user has an office
    const hasOffice = await storage.userHasOffice(user.id);

    res.json({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      isAdmin,
      hasOffice
    });
  });

  // ----- Office Routes -----

  // Get all offices (admin only)
  app.get("/api/offices", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has admin role
    let isAdmin = user.isAdmin;
    if (!isAdmin) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const offices = await storage.getAllOffices();
    res.json(offices);
  });

  // Get my office
  app.get("/api/offices/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const office = await storage.getUserOffice(req.session.userId);
    if (!office) {
      return res.status(404).json({ message: "No office found" });
    }

    res.json(office);
  });

  // Get available offices
  app.get("/api/offices/available", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const offices = await storage.getAvailableOffices(req.session.userId);
    res.json(offices);
  });

  // Create a new office (admin only)
  app.post("/api/offices", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has admin role
    let isAdmin = user.isAdmin;
    if (!isAdmin) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    try {
      const officeData = insertOfficeSchema.parse(req.body);
      
      // Verify owner exists (either by Discord ID or username#discriminator)
      let ownerId = officeData.ownerId;
      
      // Check if it's a username#discriminator format
      if (ownerId.includes('#')) {
        const [username, discriminator] = ownerId.split('#');
        const guildMembers = await fetchGuildMembers();
        
        const targetUser = guildMembers.find(
          (member) => member.user?.username === username && member.user?.discriminator === discriminator
        );
        
        if (!targetUser || !targetUser.user) {
          return res.status(404).json({ message: "Owner not found on Discord server" });
        }
        
        ownerId = targetUser.user.id;
        
        // Make sure owner is in our database
        let ownerUser = await storage.getUserById(ownerId);
        if (!ownerUser) {
          // Create the user in our database
          ownerUser = await storage.createUser({
            id: ownerId,
            username: targetUser.user.username,
            discriminator: targetUser.user.discriminator,
            avatar: targetUser.user.avatar,
            isAdmin: false,
          });
        }
      }
      
      // Create the office
      const office = await storage.createOffice({
        ...officeData,
        ownerId,
      });
      
      // Add owner as a member with isOwner = true
      await storage.addOfficeMember({
        officeId: office.id,
        userId: ownerId,
        isOwner: true,
      });
      
      res.status(201).json(office);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid office data", errors: error.errors });
      }
      throw error;
    }
  });

  // Update an office
  app.patch("/api/offices/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }

    const office = await storage.getOfficeById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    // Check if user is admin or owner
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let isAdmin = user.isAdmin;
    if (!isAdmin) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    const isOwner = office.ownerId === user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    try {
      const updateData = updateOfficeSchema.parse(req.body);
      const updatedOffice = await storage.updateOffice(officeId, updateData);
      res.json(updatedOffice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid office data", errors: error.errors });
      }
      throw error;
    }
  });

  // Delete an office
  app.delete("/api/offices/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }

    const office = await storage.getOfficeById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    // Check if user is admin or owner
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let isAdmin = user.isAdmin;
    if (!isAdmin) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    const isOwner = office.ownerId === user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    await storage.deleteOffice(officeId);
    res.status(204).end();
  });

  // Join an office
  app.post("/api/offices/:id/join", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }

    const office = await storage.getOfficeById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    // Check if office is private
    if (office.isPrivate) {
      return res.status(403).json({ message: "Cannot join a private office without an invitation" });
    }

    // Check if user is already a member
    const isMember = await storage.isOfficeMember(officeId, req.session.userId);
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this office" });
    }

    await storage.addOfficeMember({
      officeId,
      userId: req.session.userId,
      isOwner: false,
    });

    res.status(200).json({ message: "Successfully joined the office" });
  });

  // Invite a user to an office
  app.post("/api/offices/:id/invite", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }

    const office = await storage.getOfficeById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    // Check if user is owner or admin
    const isOwner = office.ownerId === req.session.userId;
    const user = await storage.getUserById(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let isAdmin = user.isAdmin;
    if (!isAdmin && !isOwner) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    // Get the target user ID from request body
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if target user exists
    const targetUser = await storage.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Check if user is already a member
    const isMember = await storage.isOfficeMember(officeId, userId);
    if (isMember) {
      return res.status(400).json({ message: "User is already a member of this office" });
    }

    // Add user to office
    await storage.addOfficeMember({
      officeId,
      userId,
      isOwner: false,
    });

    res.status(200).json({ message: "User invited to the office" });
  });

  // Remove a user from an office
  app.delete("/api/offices/:id/members/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }

    const office = await storage.getOfficeById(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    // Check if user is owner or admin
    const isOwner = office.ownerId === req.session.userId;
    const user = await storage.getUserById(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let isAdmin = user.isAdmin;
    if (!isAdmin && !isOwner) {
      try {
        const member = await getGuildMember(user.id);
        const adminRoleId = process.env.ADMIN_ROLE;
        if (member && adminRoleId) {
          const roles = await getMemberRoles(member);
          isAdmin = roles.includes(adminRoleId);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Don't allow removing the owner
    if (userId === office.ownerId) {
      return res.status(400).json({ message: "Cannot remove the office owner" });
    }

    // Check if the user is a member
    const isMember = await storage.isOfficeMember(officeId, userId);
    if (!isMember) {
      return res.status(404).json({ message: "User is not a member of this office" });
    }

    await storage.removeOfficeMember(officeId, userId);
    res.status(204).end();
  });

  // Search for users
  app.get("/api/users/search", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    try {
      // Get guild members from Discord API
      const guildMembers = await fetchGuildMembers();
      
      // Filter members that match the query
      const filteredMembers = guildMembers
        .filter(member => member.user && 
          (member.user.username.toLowerCase().includes(query.toLowerCase()) ||
           (member.nick && member.nick.toLowerCase().includes(query.toLowerCase()))))
        .map(member => member.user)
        .filter(user => user);
      
      // Format and return results
      const results = filteredMembers.map(user => ({
        id: user!.id,
        username: user!.username,
        discriminator: user!.discriminator,
        avatar: user!.avatar
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error searching for users:", error);
      res.status(500).json({ message: "Failed to search for users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
