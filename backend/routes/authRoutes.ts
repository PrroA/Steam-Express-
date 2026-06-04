import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';
import { persistState } from '../persistence';
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  TypedAuthenticatedRequest,
  UpdateProfileBody,
} from '../../types/backend';

type TypedRequest<TBody> = Request & { body: TBody };
type TypedAuthRequest<TBody = unknown> = TypedAuthenticatedRequest<TBody>;

export function registerAuthRoutes({ app, state, secretKey, authenticate }: RouteDeps) {
  const { users, resetTokens } = state;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const frontendBaseUrl =
    process.env.FRONTEND_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const hasSmtpConfig = Boolean(smtpHost && smtpUser && smtpPass && smtpFrom);
  const shouldExposeResetToken =
    process.env.NODE_ENV !== 'production' || process.env.EXPOSE_RESET_TOKEN === 'true';
  const mailTransporter = hasSmtpConfig
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

  const ensureDemoUser = async () => {
    const demoUsername = 'demo_user';
    const existingUser = users.find((u) => u.username === demoUsername);
    if (existingUser) {
      existingUser.role = 'user';
      existingUser.email = existingUser.email || 'demo@example.com';
      existingUser.registeredAt = existingUser.registeredAt || new Date().toISOString();
      existingUser.defaultFullName = existingUser.defaultFullName || 'Demo User';
      existingUser.defaultPhone = existingUser.defaultPhone || '0912-345-678';
      existingUser.defaultAddress = existingUser.defaultAddress || 'Demo checkout address';
      existingUser.defaultPaymentMethod = existingUser.defaultPaymentMethod || 'credit-card';
      persistState(state);
      return existingUser;
    }

    const demoUser = {
      id: users.reduce((maxId, user) => Math.max(maxId, Number(user.id) || 0), 0) + 1,
      username: demoUsername,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      role: 'user' as const,
      email: 'demo@example.com',
      registeredAt: new Date().toISOString(),
      defaultFullName: 'Demo User',
      defaultPhone: '0912-345-678',
      defaultAddress: 'Demo checkout address',
      defaultPaymentMethod: 'credit-card' as const,
    };

    users.push(demoUser);
    persistState(state);
    return demoUser;
  };

  const sendResetEmail = async ({
    username,
    toEmail,
    resetUrl,
  }: {
    username: string;
    toEmail: string;
    resetUrl: string;
  }) => {
    if (!mailTransporter || !smtpFrom) {
      return { emailSent: false, reason: 'SMTP 尚未設定完成' };
    }

    try {
      await mailTransporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject: 'Steam Practice｜重設密碼通知',
        text: [
          `Hi ${username},`,
          '',
          '你收到這封信是因為你要求重設密碼。',
          `請點擊以下連結完成重設（15 分鐘內有效）：`,
          resetUrl,
          '',
          '如果不是你本人操作，請忽略本信。',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <p>Hi ${username},</p>
            <p>你收到這封信是因為你要求重設密碼。</p>
            <p>請點擊以下連結完成重設（<strong>15 分鐘內有效</strong>）：</p>
            <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a></p>
            <p>如果不是你本人操作，請忽略本信。</p>
          </div>
        `,
      });
      return { emailSent: true as const };
    } catch (error) {
      console.error('發送重設密碼信失敗:', error);
      return { emailSent: false, reason: '寄信服務暫時不可用' };
    }
  };

  const resetPasswordHandler = async (req: TypedRequest<ResetPasswordBody>, res: Response) => {
    const token = req.body.token || req.body.resetToken;
    const { newPassword } = req.body;
    const resetTokenData = resetTokens[token];
    if (!resetTokenData || Date.now() > resetTokenData.expires) {
      return res.status(400).json({ message: '驗證碼無效或已過期。' });
    }

    const user = users.find((u) => u.username === resetTokenData.username);
    if (!user) {
      return res.status(404).json({ message: '用戶不存在' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    delete resetTokens[token];
    persistState(state);
    return res.json({ message: '密碼更新成功！' });
  };

  app.post('/register', async (req: TypedRequest<RegisterBody>, res: Response) => {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '請輸入帳號和密碼' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Email 格式不正確' });
    }
    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: '帳號已存在' });
    }
    if (email) {
      const existingEmail = users.find(
        (u) => (u.email || '').toLowerCase() === String(email).toLowerCase()
      );
      if (existingEmail) {
        return res.status(400).json({ message: '此 Email 已被使用' });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      email: email || undefined,
      registeredAt: new Date().toISOString(),
    };
    users.push(newUser);
    persistState(state);
    return res
      .status(201)
      .json({
        message: '註冊成功！',
        user: { id: newUser.id, username: newUser.username, email: newUser.email },
      })
      .end();
  });

  app.post('/login', async (req: TypedRequest<LoginBody>, res: Response) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '無效的帳號或密碼' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secretKey, {
      expiresIn: '1d',
    });
    return res.json({ token });
  });

  app.post('/demo-login', async (_req: Request, res: Response) => {
    const user = await ensureDemoUser();
    state.carts[user.id] = [];
    state.orders[user.id] = [];
    state.wishlists[user.id] = [];
    persistState(state);

    const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, secretKey, {
      expiresIn: '1d',
    });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: 'user',
      },
    });
  });

  app.post('/forgot-password', async (req: TypedRequest<ForgotPasswordBody>, res: Response) => {
    const rawInput = String(req.body?.account || req.body?.email || req.body?.username || '').trim();
    if (!rawInput) {
      return res.status(400).json({ message: '請輸入帳號或 Email' });
    }

    const normalizedInput = rawInput.toLowerCase();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === normalizedInput ||
        (u.email || '').toLowerCase() === normalizedInput
    );
    if (!user) {
      if (process.env.NODE_ENV === 'production') {
        return res.json({
          message: '如果帳號存在，重設密碼信將會寄出。',
          emailSent: false,
        });
      }
      return res.status(404).json({ message: '找不到符合的帳號或 Email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    resetTokens[resetToken] = {
      username: user.username,
      expires: Date.now() + 15 * 60 * 1000,
    };
    persistState(state);

    const baseUrl = frontendBaseUrl.replace(/\/$/, '');
    const resetUrl = `${baseUrl}/ConfirmResetPassword?token=${encodeURIComponent(resetToken)}`;
    const email = (user.email || '').trim();
    const withOptionalToken = (payload: Record<string, unknown>) => {
      if (shouldExposeResetToken) {
        payload.resetToken = resetToken;
        payload.resetUrl = resetUrl;
      }
      return payload;
    };

    if (!email) {
      return res.json(
        withOptionalToken({
          message: '帳號尚未設定 Email，請先到個人資料頁補上 Email。',
          emailSent: false,
        })
      );
    }

    const sendResult = await sendResetEmail({ username: user.username, toEmail: email, resetUrl });
    if (sendResult.emailSent) {
      return res.json(
        withOptionalToken({
          message: `重設密碼信已寄到 ${email}`,
          emailSent: true,
        })
      );
    }

    return res.json(
      withOptionalToken({
        message: sendResult.reason || '重設密碼信寄送失敗',
        emailSent: false,
      })
    );
  });

  app.post('/forgot-password-legacy-disabled', async (req: TypedRequest<ForgotPasswordBody>, res: Response) => {
    const rawInput = String(req.body?.account || req.body?.email || req.body?.username || '').trim();
    if (!rawInput) {
      return res.status(400).json({ message: '請輸入帳號或 Email' });
    }

    const normalizedInput = rawInput.toLowerCase();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === normalizedInput ||
        (u.email || '').toLowerCase() === normalizedInput
    );
    if (!user) {
      return res.status(404).json({ message: '找不到對應帳號或 Email' });
    }
    const resetToken = crypto.randomBytes(10).toString('hex');
    resetTokens[resetToken] = {
      username: user.username,
      expires: Date.now() + 15 * 60 * 1000,
    };
    persistState(state);

    const baseUrl = frontendBaseUrl.replace(/\/$/, '');
    const resetUrl = `${baseUrl}/ConfirmResetPassword?token=${encodeURIComponent(resetToken)}`;
    const email = (user.email || '').trim();

    if (!email) {
      return res.json({
        message: '此帳號尚未設定 Email，請使用下方重設憑證或先到個人資料補上 Email。',
        resetToken,
        resetUrl,
        emailSent: false,
      });
    }

    const sendResult = await sendResetEmail({ username: user.username, toEmail: email, resetUrl });
    if (sendResult.emailSent) {
      return res.json({
        message: `重設密碼信已寄到 ${email}`,
        emailSent: true,
        resetUrl,
        resetToken,
      });
    }

    return res.json({
      message: `${sendResult.reason || '寄信失敗'}，已提供重設連結供手動使用。`,
      emailSent: false,
      resetUrl,
      resetToken,
    });
  });

  app.post('/reset-password', resetPasswordHandler);
  app.post('/confirm-reset-password', resetPasswordHandler);

  app.get('/profile', authenticate, (req: TypedAuthRequest, res: Response) => {
    const userId = req.user.id;
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: '用戶未找到' });
    }
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email || '未提供',
      registeredAt: user.registeredAt || '未知',
      defaultFullName: user.defaultFullName || '',
      defaultPhone: user.defaultPhone || '',
      defaultAddress: user.defaultAddress || '',
      defaultPaymentMethod: user.defaultPaymentMethod || 'credit-card',
    });
  });

  app.put('/profile', authenticate, (req: TypedAuthRequest<UpdateProfileBody>, res: Response) => {
    const userId = req.user.id;
    const { username, email, defaultFullName, defaultPhone, defaultAddress, defaultPaymentMethod } = req.body;
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: '資料更新失敗' });
    }
    user.username = username || user.username;
    user.email = email || user.email;
    user.defaultFullName = defaultFullName ?? user.defaultFullName;
    user.defaultPhone = defaultPhone ?? user.defaultPhone;
    user.defaultAddress = defaultAddress ?? user.defaultAddress;
    user.defaultPaymentMethod = defaultPaymentMethod ?? user.defaultPaymentMethod;
    persistState(state);
    return res.json({ message: '個人資料更新成功', user });
  });
}
