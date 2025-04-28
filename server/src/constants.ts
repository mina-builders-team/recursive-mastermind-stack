import dotenv from 'dotenv';
dotenv.config();
const minaNetwork = process.env.MINA_NETWORK || 3000;

export const MAX_ATTEMPTS = 7;
export const VERIFIED_REFREES =
  minaNetwork === 'LIGHTNET'
    ? ['B62qiaUDjv6eeRrwVCy68WVb6W2cYe1Bev8vjcoKzr3QNkXFoxFutf5']
    : minaNetwork === 'DEVNET'
      ? ['B62qihpfJjEcwDYkLhHoTAST1uFChgStMSM2mLVdPB5ybSRqKkocXao']
      : [];
