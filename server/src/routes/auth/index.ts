import { Router } from 'express';

import { loginRouter } from './login.js';
import { logoutRouter } from './logout.js';
import { passwordResetRouter } from './password-reset.js';
import { sessionInfoRouter } from './session.js';
import { signupRouter } from './signup.js';
import { verifyEmailRouter } from './verify-email.js';

export const authRouter = Router();

authRouter.use(signupRouter);
authRouter.use(verifyEmailRouter);
authRouter.use(loginRouter);
authRouter.use(logoutRouter);
authRouter.use(sessionInfoRouter);
authRouter.use(passwordResetRouter);
