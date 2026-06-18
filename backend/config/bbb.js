import dotenv from 'dotenv';
dotenv.config();

export const bbbConfig = {
  url: process.env.BBB_URL || 'https://demo.bigbluebutton.org/bigbluebutton/api',
  secret: process.env.BBB_SECRET || '8cd8ef52e85e0007384c3130864d309b'
};
export default bbbConfig;
