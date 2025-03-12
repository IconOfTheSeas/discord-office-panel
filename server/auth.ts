import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { getDiscordUser, getGuildMember, getMemberRoles } from "./discord";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://f9c965f8-8b43-4148-8db8-a8814238be9a-00-2fxa2sqwglwi5.picard.replit.dev/api/auth/callback";
const GUILD_ID = process.env.GUILD_ID;

if (!CLIENT_ID || !CLIENT_SECRET || !GUILD_ID) {
  throw new Error("Missing required environment variables: CLIENT_ID, CLIENT_SECRET, or GUILD_ID");
}

export function setupAuth(app: Express) {
  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "discord-office-panel-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        secure: true,
        httpOnly: true,
        sameSite: "none"
      },
    })
  );

  // Discord OAuth login route
  app.get("/api/auth/login", (req, res) => {
    const scope = "identify guilds";
    res.redirect(
      `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&response_type=code&scope=${encodeURIComponent(scope)}`
    );
  });

  // Discord OAuth callback
  app.get("/api/auth/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.redirect("/?error=no_code");
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code: code.toString(),
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("Token exchange error:", errorData);
        return res.redirect("/?error=token_exchange");
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      // Get user info
      const discordUser = await getDiscordUser(access_token);

      if (!discordUser || !discordUser.id) {
        return res.redirect("/?error=user_info");
      }

      // Check if user is a member of the guild
      let guildMember;
      try {
        guildMember = await getGuildMember(discordUser.id);
      } catch (error) {
        console.error("Error fetching guild member:", error);
        return res.redirect("/?error=not_guild_member");
      }

      if (!guildMember) {
        return res.redirect("/?error=not_guild_member");
      }

      // Check if user has admin role
      let isAdmin = false;
      if (process.env.ADMIN_ROLE) {
        const roles = await getMemberRoles(guildMember);
        isAdmin = roles.includes(process.env.ADMIN_ROLE);
      }

      // Calculate token expiry
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);

      // Store user in database
      let user = await storage.getUserById(discordUser.id);
      
      if (user) {
        // Update existing user
        user = await storage.updateUser(discordUser.id, {
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          isAdmin,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: expiryDate,
        });
      } else {
        // Create new user
        user = await storage.createUser({
          id: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          isAdmin,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: expiryDate,
        });
      }

      // Set user ID in session
      req.session.userId = user.id;
      
      // Redirect to home page
      res.redirect("/");
    } catch (error) {
      console.error("Auth callback error:", error);
      res.redirect("/?error=callback_error");
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
}
