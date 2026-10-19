import nodemailer from 'nodemailer';
import { config } from './config.js';
import {stagingSettings,stagingMailGuard} from './staging.js';
// Shared SMTP transport. Never enable transport logging or persist raw invitation/reset links.
export const mailTransport=stagingMailGuard(stagingSettings(),config.mailEnabled?nodemailer.createTransport(config.smtp):null);
