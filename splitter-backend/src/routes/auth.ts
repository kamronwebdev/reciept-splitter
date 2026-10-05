import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "../utils/validation.js";
import { sendError } from "../utils/errors.js";
import { serializeUser } from "../utils/avatar.js";
import { signAuthToken, EMAIL_REGEX } from "../utils/authToken.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

function generateUniqueId() {
  // Format: #1234 (4-digit code). Removed 'USER' prefix per requirement.
  return "#" + Math.floor(1000 + Math.random() * 9000);
}

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Авторизация и регистрация пользователей
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Aa1!secure
 *                 description: Must be at least 8 characters and include uppercase, lowercase, number, and special character
 *               username:
 *                 type: string
 *                 example: John
 *           example:
 *             email: "user@example.com"
 *             password: "Aa1!secure"
 *             username: "John"
 *     responses:
 *       200:
 *         description: Успешная регистрация
 *       400:
 *         description: Неверные данные запроса
 *       409:
 *         description: Email уже используется
 *       415:
 *         description: Неверный Content-Type (нужен application/json)
 */
router.post("/register", authLimiter, async (req, res) => {
  const ct = String(req.headers["content-type"] || "");
  console.log("/auth/register content-type:", ct);
  try {
    if (!ct.includes("application/json")) {
      return res
        .status(415)
        .json({ error: "Content-Type must be application/json" });
    }

    const { email, password, username } = req.body ?? {};
    console.log("/auth/register types:", {
      email: typeof email,
      password: typeof password,
      username: typeof username,
    });

    // Soft type coercion: numbers → strings, arrays/objects are not allowed
    const emailVal =
      typeof email === "string"
        ? email
        : typeof email === "number"
        ? String(email)
        : email;
    const passwordVal =
      typeof password === "string"
        ? password
        : typeof password === "number"
        ? String(password)
        : password;
    const usernameVal =
      typeof username === "string"
        ? username
        : typeof username === "number"
        ? String(username)
        : username;

    if (
      typeof emailVal !== "string" ||
      typeof passwordVal !== "string" ||
      typeof usernameVal !== "string"
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid field types: expected strings for email, password, username"
      );
    }

    const cleanEmail = emailVal.trim().toLowerCase();
    const cleanUsername = usernameVal.trim();
    const cleanPassword = passwordVal;

    if (!cleanEmail || !cleanPassword || !cleanUsername) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Please provide email, password, and username"
      );
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return sendError(res, 400, "INVALID_EMAIL", "Invalid email format");
    }
    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      return sendError(res, 400, "INVALID_USERNAME", "Username must be 2-30 characters");
    }
    if (!isStrongPassword(cleanPassword)) {
      return sendError(res, 400, "WEAK_PASSWORD", PASSWORD_POLICY_MESSAGE);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      return sendError(res, 409, "EMAIL_IN_USE", "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    // Generate uniqueId with multiple attempts to avoid collisions
    let uniqueId = "";
    for (let i = 0; i < 5; i++) {
      uniqueId = generateUniqueId();
      const exists = await prisma.user.findUnique({ where: { uniqueId } });
      if (!exists) break;
      if (i === 4) {
        return res.status(500).json({ error: "Failed to generate unique ID" });
      }
    }
    console.log("/auth/register generated uniqueId:", uniqueId);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          password: hashedPassword,
          username: cleanUsername,
          uniqueId,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        // unique constraint conflict
        return sendError(res, 409, "EMAIL_IN_USE", "Email already in use");
      }
      throw e;
    }

    const token = signAuthToken(user);

    console.log("/auth/register success:", { id: user.id });
    res.json({
      token,
      user: serializeUser(user, req),
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Авторизация пользователя
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: 123456
 *           example:
 *             email: "user@example.com"
 *             password: "123456"
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     uniqueId:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                       nullable: true
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               user:
 *                 id: 1
 *                 email: user@example.com
 *                 username: John
 *                 uniqueId: "#1234"
 *                 avatarUrl: https://static.splitter.qzz.io/avatars/1/v1696070000/avatar.webp
 *       400:
 *         description: Неверные учетные данные
 *       415:
 *         description: Неверный Content-Type (нужен application/json)
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const ct = String(req.headers["content-type"] || "");
    if (!ct.includes("application/json")) {
      return res
        .status(415)
        .json({ error: "Content-Type must be application/json" });
    }

    const { email, password } = req.body ?? {};

    const emailVal =
      typeof email === "string"
        ? email
        : typeof email === "number"
        ? String(email)
        : email;
    const passwordVal =
      typeof password === "string"
        ? password
        : typeof password === "number"
        ? String(password)
        : password;

    if (typeof emailVal !== "string" || typeof passwordVal !== "string") {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid field types");
    }

    const cleanEmail = emailVal.trim().toLowerCase();
    const cleanPassword = passwordVal;
    if (!cleanEmail || !cleanPassword) {
      return sendError(res, 400, "VALIDATION_ERROR", "Please fill all fields");
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return sendError(res, 400, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isValid = await bcrypt.compare(cleanPassword, user.password);
    if (!isValid) {
      return sendError(res, 400, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = signAuthToken(user);

    console.log("/auth/login success:", { id: user.id });
    res.json({
      token,
      user: serializeUser(user, req),
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Получение информации о текущем пользователе
 *     description: Возвращает профиль пользователя по ID из JWT токена.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *                 username:
 *                   type: string
 *                   example: John
 *                 uniqueId:
 *                   type: string
 *                   example: #1234
 *                 avatarUrl:
 *                   type: string
 *                   example: https://cdn.example.com/avatars/u1.png
 *       401:
 *         description: Требуется авторизация или неверный токен
 *       404:
 *         description: Пользователь не найден
 */
router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        uniqueId: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    return res.json(serializeUser(user, req));
  } catch (err) {
    console.error("/auth/me error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;
