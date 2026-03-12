export const privacyPolicyKeys = Object.freeze({
  all: ['privacyPolicy'],
  admin: () => ['privacyPolicy', 'admin'],
  client: () => ['privacyPolicy', 'client'],
});