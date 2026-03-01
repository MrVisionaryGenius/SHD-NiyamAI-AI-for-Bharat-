import { SecurityQuestion } from '../../types';

/**
 * Security Questionnaire Structure
 * Defines questions for assessing cybersecurity practices across four categories:
 * - Passwords: Password management and authentication practices
 * - Devices: Device security and software updates
 * - Data: Data backup and sharing practices
 * - Access: Access control and network security
 * 
 * Each question has weighted scoring to calculate overall security posture.
 */
export const SECURITY_QUESTIONNAIRE: SecurityQuestion[] = [
  {
    id: 'pwd_policy',
    category: 'passwords',
    text: 'How do you manage passwords for business accounts?',
    options: [
      { 
        value: 'written', 
        label: 'Written down or same password everywhere', 
        score: 0 
      },
      { 
        value: 'memory', 
        label: 'Different passwords, memorized', 
        score: 40 
      },
      { 
        value: 'manager', 
        label: 'Password manager', 
        score: 100 
      }
    ],
    weight: 1.5
  },
  {
    id: 'mfa_usage',
    category: 'passwords',
    text: 'Do you use two-factor authentication (2FA/MFA)?',
    options: [
      { 
        value: 'no', 
        label: 'No', 
        score: 0 
      },
      { 
        value: 'some', 
        label: 'On some important accounts', 
        score: 60 
      },
      { 
        value: 'all', 
        label: 'On all business accounts', 
        score: 100 
      }
    ],
    weight: 2.0
  },
  {
    id: 'device_security',
    category: 'devices',
    text: 'Are your work devices password/PIN protected?',
    options: [
      { 
        value: 'no', 
        label: 'No protection', 
        score: 0 
      },
      { 
        value: 'some', 
        label: 'Some devices protected', 
        score: 50 
      },
      { 
        value: 'all', 
        label: 'All devices protected', 
        score: 100 
      }
    ],
    weight: 1.5
  },
  {
    id: 'software_updates',
    category: 'devices',
    text: 'How often do you update software and operating systems?',
    options: [
      { 
        value: 'rarely', 
        label: 'Rarely or never', 
        score: 0 
      },
      { 
        value: 'sometimes', 
        label: 'When reminded', 
        score: 50 
      },
      { 
        value: 'auto', 
        label: 'Automatic updates enabled', 
        score: 100 
      }
    ],
    weight: 1.2
  },
  {
    id: 'data_backup',
    category: 'data',
    text: 'How do you backup important business data?',
    options: [
      { 
        value: 'no_backup', 
        label: 'No regular backups', 
        score: 0 
      },
      { 
        value: 'manual', 
        label: 'Manual backups occasionally', 
        score: 40 
      },
      { 
        value: 'auto_cloud', 
        label: 'Automatic cloud backups', 
        score: 100 
      }
    ],
    weight: 1.8
  },
  {
    id: 'data_sharing',
    category: 'data',
    text: 'How do you share sensitive business files?',
    options: [
      { 
        value: 'email', 
        label: 'Email attachments', 
        score: 30 
      },
      { 
        value: 'messaging', 
        label: 'WhatsApp or messaging apps', 
        score: 20 
      },
      { 
        value: 'secure', 
        label: 'Secure cloud storage with access controls', 
        score: 100 
      }
    ],
    weight: 1.3
  },
  {
    id: 'access_control',
    category: 'access',
    text: 'How do you manage access to business systems?',
    options: [
      { 
        value: 'shared', 
        label: 'Shared accounts/passwords', 
        score: 0 
      },
      { 
        value: 'individual', 
        label: 'Individual accounts, no review', 
        score: 60 
      },
      { 
        value: 'managed', 
        label: 'Individual accounts with regular access review', 
        score: 100 
      }
    ],
    weight: 1.4
  },
  {
    id: 'wifi_security',
    category: 'access',
    text: 'What type of WiFi do you use for business work?',
    options: [
      { 
        value: 'public', 
        label: 'Public WiFi regularly', 
        score: 0 
      },
      { 
        value: 'home', 
        label: 'Home WiFi with default password', 
        score: 40 
      },
      { 
        value: 'secure', 
        label: 'Secured WiFi with strong password', 
        score: 100 
      }
    ],
    weight: 1.1
  }
];
